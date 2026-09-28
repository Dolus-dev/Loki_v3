import type { Client, ClientEvents } from 'discord.js';
import path from 'node:path';
import { loadModules } from './loadModules.js';
import { Logger } from './logger.js';

/**
 * Event handling: imports every file in `src/app/events` and attaches it to the client.
 *
 * Convention: put each handler in a folder named after its event, e.g.
 * `events/guildCreate/addToDatabase.ts`. The folder is only for organisation; the `name` inside
 * the file decides which event it listens to. A warning is logged if the two disagree, since
 * that's almost always a mistake.
 *
 * Each file becomes its own independent listener. Several handlers for the same event run side
 * by side, and one failing or being slow doesn't affect the others.
 *
 * Errors thrown by a handler are caught and logged. They are deliberately NOT re-emitted as a
 * client `error` event: if the `error` handler itself threw, that would loop forever. To route a
 * failure to the `error` handlers on purpose, call `client.emit('error', yourError)` yourself.
 */

// The loaded modules' event types aren't known until runtime, so the loader works with this
// loose shape. Type safety for each file comes from `defineEvent` at the file itself.
interface AnyEvent {
  name: keyof ClientEvents;
  once?: boolean;
  execute(...args: unknown[]): Promise<unknown> | void;
}

export async function loadEvents(client: Client, dir: string): Promise<void> {
  const modules = await loadModules(dir);

  for (const { file, value } of modules) {
    const relative = path.relative(dir, file);

    if (!isEvent(value)) {
      throw new Error(`Event file ${relative} must "export default defineEvent({ name, execute })".`);
    }

    const folder = path.basename(path.dirname(file));
    if (path.dirname(file) !== dir && folder !== value.name) {
      Logger.warn(`Event file ${relative} is in folder "${folder}" but listens to "${value.name}".`);
    }

    const event = value;
    const listener = async (...args: unknown[]) => {
      try {
        await event.execute(...args, client);
      } catch (error) {
        Logger.error(`Handler ${relative} for "${event.name}" failed:`, error);
      }
    };

    if (event.once) client.once(event.name, listener);
    else client.on(event.name, listener);

    Logger.debug(`Loaded event handler ${relative} -> ${event.name}${event.once ? ' (once)' : ''}`);
  }

  Logger.info(`Loaded ${modules.length} event handler(s).`);
}

function isEvent(value: unknown): value is AnyEvent {
  const candidate = value as Partial<AnyEvent> | undefined;
  return typeof candidate?.name === 'string' && typeof candidate.execute === 'function';
}
