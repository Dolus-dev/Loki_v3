import {
  Collection,
  Events,
  MessageFlags,
  type AutocompleteInteraction,
  type ChatInputCommandInteraction,
  type Client,
} from 'discord.js';
import path from 'node:path';
import { env } from '../config/env.js';
import { loadModules } from './loadModules.js';
import { Logger } from './logger.js';
import type { Command } from './types.js';

/**
 * Slash command handling, in three steps (all called from src/index.ts):
 *
 * 1. `loadCommands` imports every file in `src/app/commands` and indexes them by command name.
 * 2. `registerCommandHandler` listens for interactions and routes each one to its command's
 *    `execute` (or `autocomplete`) function.
 * 3. `syncCommands` sends the command definitions to Discord once the bot is logged in, so the
 *    commands show up in the client's slash command menu.
 */

/** Loads and validates every command file, keyed by command name. */
export async function loadCommands(dir: string): Promise<Collection<string, Command>> {
  const commands = new Collection<string, Command>();

  for (const { file, value } of await loadModules(dir)) {
    const relative = path.relative(dir, file);

    if (!isCommand(value)) {
      throw new Error(`Command file ${relative} must "export default defineCommand({ data, execute })".`);
    }
    if (commands.has(value.data.name)) {
      throw new Error(`Command file ${relative} reuses the name "/${value.data.name}", which is already taken.`);
    }

    commands.set(value.data.name, value);
    Logger.debug(`Loaded command /${value.data.name} (${relative})`);
  }

  Logger.info(`Loaded ${commands.size} command(s).`);
  return commands;
}

/** Routes incoming slash command and autocomplete interactions to the matching command. */
export function registerCommandHandler(client: Client, commands: Collection<string, Command>): void {
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

/**
 * Sends every loaded command definition to Discord in a single request.
 *
 * This is a bulk overwrite: Discord ends up with exactly the commands in `src/app/commands`.
 * Deleted or renamed commands disappear, and definitions that haven't changed don't count
 * toward Discord's daily command-creation limit, so running this on every startup is safe.
 *
 * With `DEV_GUILD_ID` set, the commands go to that one guild and update instantly. Otherwise
 * they're registered globally. Global and guild commands are separate lists, so a guild can see
 * both copies of a command if it was registered both ways at some point.
 */
export async function syncCommands(client: Client<true>, commands: Collection<string, Command>): Promise<void> {
  const body = commands.map((command) => command.data.toJSON());

  try {
    if (env.DEV_GUILD_ID) {
      await client.application.commands.set(body, env.DEV_GUILD_ID);
      Logger.info(`Synced ${body.length} command(s) to dev guild ${env.DEV_GUILD_ID}.`);
    } else {
      await client.application.commands.set(body);
      Logger.info(`Synced ${body.length} command(s) globally.`);
    }
  } catch (error) {
    // The bot still works with whatever Discord already has registered, so don't crash
    Logger.error('Failed to sync slash commands with Discord:', error);
  }
}

async function runCommand(interaction: ChatInputCommandInteraction, command: Command | undefined): Promise<void> {
  if (!command) {
    // Happens when Discord still lists a command this build no longer has (e.g. before a sync)
    Logger.warn(`Received unknown command /${interaction.commandName}`);
    await interaction
      .reply({ content: 'This command is no longer available.', flags: MessageFlags.Ephemeral })
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
