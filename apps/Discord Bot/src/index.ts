import { Events } from 'discord.js';
import { fileURLToPath } from 'node:url';
import client from './app.js';
import { env } from './config/env.js';
import { loadCommands, registerCommandHandler, syncCommands } from './framework/commands.js';
import { loadEvents } from './framework/events.js';
import { Logger } from './framework/logger.js';

/**
 * Bot entry point.
 *
 * Startup order:
 *   1. The env is validated, as soon as anything imports `config/env` (throws if invalid).
 *   2. Commands and event handlers are loaded from `src/app` and attached to the client. This
 *      happens before login so no early event is missed.
 *   3. The client logs in. Once Discord reports ready, the slash command definitions are synced.
 *
 * `pnpm dev` runs this file through tsx and restarts on every save. `pnpm build && pnpm start`
 * runs the compiled copy in `dist/`. The paths below are relative to this file, so they point at
 * `src/app` in dev and `dist/app` in production.
 */

const appDir = (folder: string) => fileURLToPath(new URL(`./app/${folder}`, import.meta.url));

const commands = await loadCommands(appDir('commands'));
registerCommandHandler(client, commands);
await loadEvents(client, appDir('events'));

client.once(Events.ClientReady, (readyClient) => syncCommands(readyClient, commands));

// Last-resort safety net: a promise that fails without a .catch() anywhere gets logged here
// instead of crashing the bot
process.on('unhandledRejection', (reason) => {
  Logger.error('Unhandled promise rejection:', reason);
});

// Disconnect from Discord cleanly on Ctrl+C, when tsx restarts, or when the host stops the process
const shutdown = async (signal: string) => {
  Logger.info(`Received ${signal}, shutting down...`);
  await client.destroy();
  process.exit(0);
};
process.once('SIGINT', shutdown);
process.once('SIGTERM', shutdown);

try {
  await client.login(env.BOT_TOKEN);
} catch (error) {
  // Usually a wrong BOT_TOKEN, or a privileged intent that isn't enabled in the developer portal
  Logger.error('Failed to log in to Discord:', error);
  await client.destroy();
  process.exit(1);
}
