import type {
  AutocompleteInteraction,
  ChatInputCommandInteraction,
  Client,
  ClientEvents,
  RESTPostAPIChatInputApplicationCommandsJSONBody,
} from 'discord.js';

/**
 * The shapes that command and event files export.
 *
 * Every file under `src/app/commands` must `export default defineCommand({...})`, and every file
 * under `src/app/events` must `export default defineEvent({...})`. The `define*` helpers do
 * nothing at runtime; they exist so TypeScript can check the object and infer the handler
 * argument types for you.
 *
 * Handlers receive plain discord.js objects, with no wrapper in between, so anything in the
 * discord.js docs applies directly.
 */

/** A slash command. */
export interface Command {
  /**
   * The command's definition as registered with Discord: name, description, options, permissions.
   * Build it with discord.js's `SlashCommandBuilder`.
   */
  data: {
    name: string;
    toJSON(): RESTPostAPIChatInputApplicationCommandsJSONBody;
  };
  /**
   * Register this command only in DEV_GUILD_ID instead of globally, and refuse to run it anywhere
   * else. Use it for bot-maintenance tools like /reload-commands.
   */
  devOnly?: boolean;
  /** Runs when someone uses the command. */
  execute(interaction: ChatInputCommandInteraction): Promise<unknown> | void;
  /**
   * Optional. Runs while someone is typing into an option that was declared with
   * `.setAutocomplete(true)`, and should answer with `interaction.respond([...choices])`.
   */
  autocomplete?(interaction: AutocompleteInteraction): Promise<unknown> | void;
}

/**
 * A listener for one discord.js client event.
 *
 * `E` is the event name (use the `Events` enum from discord.js, e.g. `Events.GuildCreate`). The
 * handler receives that event's usual discord.js arguments, followed by the client as the last
 * argument. The client is passed because some events (like `error`) have no other way to reach it.
 */
export interface BotEvent<E extends keyof ClientEvents> {
  name: E;
  /** When true, the handler runs only the first time the event fires (e.g. `clientReady`). */
  once?: boolean;
  execute(...args: [...ClientEvents[E], Client]): Promise<unknown> | void;
}

export function defineCommand(command: Command): Command {
  return command;
}

export function defineEvent<E extends keyof ClientEvents>(event: BotEvent<E>): BotEvent<E> {
  return event;
}
