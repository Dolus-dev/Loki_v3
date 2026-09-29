import {
  Collection,
  Events,
  MessageFlags,
  type AutocompleteInteraction,
  type ChatInputCommandInteraction,
  type Client,
} from 'discord.js';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { env } from '../config/env.js';
import { loadModules } from './loadModules.js';
import { Logger } from './logger.js';
import type { Command } from './types.js';

/**
 * Slash command handling. At startup (from src/index.ts):
 *
 * 1. `loadCommands` imports every file in `src/app/commands` into the `commands` collection.
 * 2. `registerCommandHandler` listens for interactions and routes each one to its command's
 *    `execute` (or `autocomplete`) function.
 * 3. `syncCommands` sends the command definitions to Discord once the bot is logged in, so the
 *    commands show up in the client's slash command menu.
 *
 * While running, `reloadCommands` (used by /reload-commands) repeats steps 1 and 3 with fresh
 * copies of the files, so command changes can go live without a restart.
 *
 * Where commands are registered:
 * - Normal commands are registered globally, in every server the bot is in.
 * - Commands with `devOnly: true` are registered only in DEV_GUILD_ID, and refuse to run anywhere
 *   else. If DEV_GUILD_ID isn't set, they aren't registered at all.
 */

// Relative to this file, so it's src/app/commands under tsx and dist/app/commands in production
const COMMANDS_DIR = fileURLToPath(new URL('../app/commands', import.meta.url));

/**
 * Every loaded command, keyed by name. This one collection lives for the whole process: reloads
 * swap its contents in place, so the interaction handler always sees the current set.
 */
export const commands = new Collection<string, Command>();

/** Initial load at startup. Throws on an invalid command file, so a broken build won't start. */
export async function loadCommands(): Promise<void> {
  replaceCommands(await readCommands({ fresh: false }));
  Logger.info(`Loaded ${commands.size} command(s).`);
}

/**
 * Re-reads every command file from disk and re-syncs with Discord, without restarting.
 *
 * New, changed and deleted command files are all picked up. See `loadModules` for what is NOT
 * reloaded (helpers imported by commands). The new files are fully loaded and validated before
 * anything is swapped, so if one of them is broken, the old commands keep working.
 */
export async function reloadCommands(client: Client<true>): Promise<SyncResult> {
  replaceCommands(await readCommands({ fresh: true }));
  Logger.info(`Reloaded ${commands.size} command(s).`);

  try {
    return await syncCommands(client);
  } catch (error) {
    throw new Error('Commands were reloaded in the bot, but syncing them with Discord failed.', { cause: error });
  }
}

/** Routes incoming slash command and autocomplete interactions to the matching command. */
export function registerCommandHandler(client: Client): void {
  client.on(Events.InteractionCreate, async (interaction) => {
    if (interaction.isChatInputCommand()) {
      await runCommand(interaction, commands.get(interaction.commandName));
    } else if (interaction.isAutocomplete()) {
      await runAutocomplete(interaction, commands.get(interaction.commandName));
    }
    // Buttons, select menus and modals aren't routed here. Handle them with an
    // `interactionCreate` event file, or a collector on the message that created them.
  });
}

export interface SyncResult {
  global: number;
  dev: number;
}

/**
 * Sends the loaded command definitions to Discord: normal commands globally, `devOnly` commands
 * to DEV_GUILD_ID.
 *
 * Each call is a bulk overwrite, so Discord ends up with exactly the commands in
 * `src/app/commands`, and deleted or renamed commands disappear. Definitions that haven't
 * changed don't count toward Discord's daily command-creation limit, so syncing on every
 * startup is safe.
 */
export async function syncCommands(client: Client<true>): Promise<SyncResult> {
  const globalBody = commands.filter((command) => !command.devOnly).map((command) => command.data.toJSON());
  const devBody = commands.filter((command) => command.devOnly).map((command) => command.data.toJSON());

  await client.application.commands.set(globalBody);

  if (env.DEV_GUILD_ID) {
    await client.application.commands.set(devBody, env.DEV_GUILD_ID);
  } else if (devBody.length > 0) {
    Logger.warn(`Skipped ${devBody.length} dev-only command(s) because DEV_GUILD_ID isn't set.`);
  }

  const result = { global: globalBody.length, dev: env.DEV_GUILD_ID ? devBody.length : 0 };
  Logger.info(`Synced ${result.global} global and ${result.dev} dev-only command(s) with Discord.`);
  return result;
}

/** Imports and validates every command file into a new collection (the live one is untouched). */
async function readCommands(options: { fresh: boolean }): Promise<Collection<string, Command>> {
  const loaded = new Collection<string, Command>();

  for (const { file, value } of await loadModules(COMMANDS_DIR, options)) {
    const relative = path.relative(COMMANDS_DIR, file);

    if (!isCommand(value)) {
      throw new Error(`Command file ${relative} must "export default defineCommand({ data, execute })".`);
    }
    if (loaded.has(value.data.name)) {
      throw new Error(`Command file ${relative} reuses the name "/${value.data.name}", which is already taken.`);
    }

    loaded.set(value.data.name, value);
    Logger.debug(`Loaded command /${value.data.name}${value.devOnly ? ' (dev only)' : ''} (${relative})`);
  }

  return loaded;
}

function replaceCommands(next: Collection<string, Command>): void {
  commands.clear();
  for (const [name, command] of next) commands.set(name, command);
}

async function runCommand(interaction: ChatInputCommandInteraction, command: Command | undefined): Promise<void> {
  // An unknown command happens when Discord still lists one this build no longer has (e.g.
  // before a sync). A dev-only command outside the dev guild shouldn't be possible, since it's
  // only registered there, but it's refused anyway in case it was registered somewhere else before.
  if (!command || (command.devOnly && interaction.guildId !== env.DEV_GUILD_ID)) {
    Logger.warn(`Refused /${interaction.commandName} in guild ${interaction.guildId}: unknown or dev-only command.`);
    await interaction
      .reply({ content: 'This command is not available.', flags: MessageFlags.Ephemeral })
      .catch(() => {});
    return;
  }

  try {
    await command.execute(interaction);
  } catch (error) {
    Logger.error(`Command /${interaction.commandName} failed:`, error);

    // Tell the user something went wrong instead of leaving "The application did not respond".
    // If the command already replied or deferred, a follow-up is the only reply still allowed.
    const reply = {
      content: 'Something went wrong while running this command.',
      flags: MessageFlags.Ephemeral,
    } as const;
    try {
      if (interaction.replied || interaction.deferred) await interaction.followUp(reply);
      else await interaction.reply(reply);
    } catch (replyError) {
      Logger.error('Could not send the error reply:', replyError);
    }
  }
}

async function runAutocomplete(interaction: AutocompleteInteraction, command: Command | undefined): Promise<void> {
  if (!command?.autocomplete) {
    Logger.warn(`Received autocomplete for /${interaction.commandName}, which has no autocomplete handler.`);
    return;
  }

  try {
    await command.autocomplete(interaction);
  } catch (error) {
    Logger.error(`Autocomplete for /${interaction.commandName} failed:`, error);
  }
}

function isCommand(value: unknown): value is Command {
  const candidate = value as Partial<Command> | undefined;
  return (
    typeof candidate?.data?.name === 'string' &&
    typeof candidate.data.toJSON === 'function' &&
    typeof candidate.execute === 'function'
  );
}
