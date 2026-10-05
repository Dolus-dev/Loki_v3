import { env } from '../../config/env.js';

/**
 * Client for the Loki backend API, as used by the bot.
 *
 * Every request is authenticated with the shared bot secret (`Authorization: Bot <secret>`),
 * which the backend trusts for every guild, and gives up after `REQUEST_TIMEOUT_MS` so a
 * hung backend can't stall a command. A non-2xx answer throws a `BackendError`.
 */

const REQUEST_TIMEOUT_MS = 10_000;

// Tolerate a BACKEND_URL with a trailing slash ("http://host:4000/")
const BASE_URL = env.BACKEND_URL.replace(/\/+$/, '');

/** A request the backend answered with an error status. */
export class BackendError extends Error {
  constructor(
    /** The HTTP status code. */
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'BackendError';
  }
}

async function backendRequest<T>(path: string, init: { method?: string; body?: unknown } = {}): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: init.method ?? 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bot ${env.BOT_API_SECRET}`,
    },
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });

  if (!res.ok) {
    // Error bodies are usually `{ error: "..." }`, but not always (e.g. validation details)
    const body = (await res.json().catch(() => null)) as { error?: unknown } | null;
    const message = typeof body?.error === 'string' ? body.error : `Request failed with status ${res.status}`;
    throw new BackendError(res.status, `${init.method ?? 'GET'} ${path}: ${message}`);
  }

  if (res.status === 204) {
    return undefined as T;
  }
  return (await res.json()) as T;
}

/** The settings every moderation action has (see the dashboard's Moderation tabs). */
export interface ModerationActionSettings {
  /** When false, the action's command refuses to run. */
  enabled: boolean;
  reasonRequired: boolean;
  evidenceRequired: boolean;
}

export type ModerationSettingsSection = 'warns' | 'kicks' | 'bans' | 'mutes' | 'timeouts';

/**
 * Gets a guild's settings for one moderation action. The backend creates the default row
 * on first read, so this always returns settings for a registered guild.
 * @typeParam T The section's full settings, for sections with extra fields (e.g. bans'
 * default duration). Defaults to just the common fields.
 */
export function getModerationActionSettings<T extends ModerationActionSettings = ModerationActionSettings>(
  guildId: string,
  section: ModerationSettingsSection,
): Promise<T> {
  return backendRequest<T>(`/guilds/${guildId}/settings/${section}`);
}

export interface CreateModerationEventInput {
  /** The moderator who took the action. */
  issuedBy: string;
  eventType: 'ban' | 'mute' | 'warn' | 'timeout' | 'kick' | 'note';
  /** Up to 512 characters. Omit it and the backend stores "No reason provided". */
  reason?: string;
  /** An http(s) link to the evidence, e.g. the attachment the moderator added. */
  evidenceUrl?: string;
  /** The ID of a Discord message that contains the evidence. */
  evidenceMessageId?: string;
  /** When a temporary action ends, as an ISO 8601 date-time. Omit for permanent/instant actions. */
  expiresAt?: string;
}

/** Records a moderation action against a user in the guild's moderation history. */
export function createModerationEvent(
  guildId: string,
  userId: string,
  input: CreateModerationEventInput,
): Promise<{ eventId: number; supersededEventIds: number[] }> {
  return backendRequest(`/guilds/${guildId}/moderation/events/${userId}`, {
    method: 'POST',
    body: input,
  });
}

/** The temporary event types, i.e. the ones that expire. */
export type ExpiringEventType = 'ban' | 'mute' | 'timeout';

/** An active temporary event whose time is up, waiting to be lifted. */
export interface ExpiredModerationEvent {
  id: number;
  guildId: string;
  /** The user the action was taken against. */
  userId: string;
  eventType: ExpiringEventType;
  /** ISO 8601 date-time. */
  expiresAt: string;
}

/**
 * Lists expired events of the given types across every guild, oldest expiry first, at most
 * `limit` at a time. Only ask for types the bot knows how to lift.
 */
export function getExpiredModerationEvents(types: ExpiringEventType[], limit = 50): Promise<ExpiredModerationEvent[]> {
  const query = new URLSearchParams({ types: types.join(','), limit: String(limit) });
  return backendRequest(`/moderation/expired?${query}`);
}

/**
 * Reports how lifting an expired event went: "ended" if it was lifted (or already had been),
 * "failed" if it can't be. Throws a `BackendError` with status 409 if the event stopped being
 * active in the meantime (e.g. a newer ban replaced it), which callers can safely ignore.
 */
export function resolveExpiredModerationEvent(
  eventId: number,
  input: { outcome: 'ended' | 'failed'; resolvedBy: string; detail?: string },
): Promise<void> {
  return backendRequest(`/moderation/expired/${eventId}/resolve`, { method: 'POST', body: input });
}
