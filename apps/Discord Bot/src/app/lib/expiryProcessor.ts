import { DiscordAPIError, RESTJSONErrorCodes, type Client } from 'discord.js';
import { Logger } from '../../framework/logger.js';
import {
  BackendError,
  getExpiredModerationEvents,
  resolveExpiredModerationEvent,
  type ExpiredModerationEvent,
  type ExpiringEventType,
} from './backend.js';

/**
 * Lifts temporary moderation actions when their time is up.
 *
 * Every `POLL_INTERVAL_MS` the bot asks the backend which active bans/timeouts have expired
 * (across all servers), lifts each one in Discord, and reports back "ended" or "failed".
 * So an expired ban is lifted within about a minute of its expiry, and also after downtime:
 * anything that expired while the bot was offline is picked up on the first poll.
 *
 * Each event type has a handler that decides the outcome:
 * - "ended": lifted, or nothing left to lift (e.g. someone already unbanned the user).
 * - "failed": can't ever be lifted by the bot (e.g. it lost the Ban Members permission or
 *   left the server). Recorded so it doesn't come back every minute; the audit log says why.
 * - null: a temporary problem (Discord down, rate limited). Left active and retried next poll.
 *
 * This assumes each bot instance has its own backend (dev and production don't share one):
 * a guild the bot isn't in is treated as "the bot left", not "another bot's guild".
 */

const POLL_INTERVAL_MS = 60_000;
// How many expired events to handle per poll; anything beyond waits for the next one
const BATCH_SIZE = 50;

type Outcome = { outcome: 'ended' | 'failed'; detail?: string } | null;
type ExpiryHandler = (client: Client<true>, event: ExpiredModerationEvent) => Promise<Outcome>;

/** Errors from Discord that will never go away by retrying: give up and record "failed". */
const PERMANENT_ERRORS = new Set<number>([RESTJSONErrorCodes.MissingPermissions, RESTJSONErrorCodes.MissingAccess]);

const handlers: Partial<Record<ExpiringEventType, ExpiryHandler>> = {
  async ban(client, event) {
    const guild = client.guilds.cache.get(event.guildId);
    if (!guild) {
      return { outcome: 'failed', detail: "Loki isn't in this server anymore" };
    }

    try {
      await guild.bans.remove(event.userId, `Temporary ban expired (moderation event #${event.id})`);
      return { outcome: 'ended' };
    } catch (error) {
      if (error instanceof DiscordAPIError) {
        // Already unbanned by hand: the ban is over either way
        if (error.code === RESTJSONErrorCodes.UnknownBan) {
          return { outcome: 'ended', detail: 'the user had already been unbanned' };
        }
        if (typeof error.code === 'number' && PERMANENT_ERRORS.has(error.code)) {
          return { outcome: 'failed', detail: 'Loki lacks the Ban Members permission' };
        }
      }
      Logger.warn(`Couldn't lift expired ban #${event.id}; will retry:`, error);
      return null;
    }
  },

  // Discord lifts timeouts by itself when they run out; only the record needs updating
  async timeout() {
    return { outcome: 'ended' };
  },

  // mute: added together with /mute (removing the mute role)
};

const HANDLED_TYPES = Object.keys(handlers) as ExpiringEventType[];

async function processExpiredEvents(client: Client<true>): Promise<void> {
  const events = await getExpiredModerationEvents(HANDLED_TYPES, BATCH_SIZE);

  for (const event of events) {
    const handler = handlers[event.eventType];
    if (!handler) {
      continue;
    }

    const result = await handler(client, event);
    if (!result) {
      continue; // temporary problem, retried next poll
    }

    try {
      await resolveExpiredModerationEvent(event.id, { ...result, resolvedBy: client.user.id });
      Logger.info(
        `Expired ${event.eventType} #${event.id} in guild ${event.guildId}: ${result.outcome}` +
          (result.detail ? ` (${result.detail})` : ''),
      );
    } catch (error) {
      // 409: it stopped being active meanwhile (e.g. replaced by a newer ban), nothing to do
      if (error instanceof BackendError && error.status === 409) {
        continue;
      }
      // The action was lifted but not recorded; the next poll lifts (no-op) and records it again
      Logger.error(`Couldn't record the outcome of expired ${event.eventType} #${event.id}:`, error);
    }
  }
}

let started = false;

/**
 * Starts polling for expired events: once right away (to catch up on anything that expired
 * while the bot was offline), then every minute. Safe to call more than once; only the first
 * call starts it. Polls never overlap: a slow one delays the next instead of running alongside.
 */
export function startExpiryProcessor(client: Client<true>): void {
  if (started) {
    return;
  }
  started = true;

  const poll = async () => {
    try {
      await processExpiredEvents(client);
    } catch (error) {
      // Usually the backend being unreachable; just try again next time
      Logger.warn('Checking for expired moderation actions failed:', error);
    }
    setTimeout(poll, POLL_INTERVAL_MS).unref();
  };

  void poll();
  Logger.info(`Expiry processor started (handles: ${HANDLED_TYPES.join(', ')}).`);
}
