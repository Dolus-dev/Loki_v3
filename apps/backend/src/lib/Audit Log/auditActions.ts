/**
 * Enum Chaining object for Audit Actions
 */
export const AuditAction = {
	MODERATION_EVENT: {
		CREATE: {
			BAN: "MODERATION_EVENT_CREATE_BAN",
			MUTE: "MODERATION_EVENT_CREATE_MUTE",
			WARN: "MODERATION_EVENT_CREATE_WARN",
			TIMEOUT: "MODERATION_EVENT_CREATE_TIMEOUT",
			KICK: "MODERATION_EVENT_CREATE_KICK",
			NOTE: "MODERATION_EVENT_CREATE_NOTE",
		},
		// Changing the reason of an event
		UPDATE: {
			BAN: "MODERATION_EVENT_UPDATE_BAN",
			MUTE: "MODERATION_EVENT_UPDATE_MUTE",
			TIMEOUT: "MODERATION_EVENT_UPDATE_TIMEOUT",
			WARN: "MODERATION_EVENT_UPDATE_WARN",
			KICK: "MODERATION_EVENT_UPDATE_KICK",
			NOTE: "MODERATION_EVENT_UPDATE_NOTE",
		},
		// A newer event of the same action type replaced an event that was still active.
		// This is how a wrong expiry is corrected, so the old and new expiry are in the details.
		SUPERSEDE: "MODERATION_EVENT_SUPERSEDE",
		// Attaching, changing or removing the evidence of an event (any event type)
		EVIDENCE: {
			ADD: "MODERATION_EVENT_EVIDENCE_ADD",
			UPDATE: "MODERATION_EVENT_EVIDENCE_UPDATE",
			REMOVE: "MODERATION_EVENT_EVIDENCE_REMOVE",
		},
		DELETE: {
			BAN: "MODERATION_EVENT_DELETE_BAN",
			MUTE: "MODERATION_EVENT_DELETE_MUTE",
			TIMEOUT: "MODERATION_EVENT_DELETE_TIMEOUT",
			WARN: "MODERATION_EVENT_DELETE_WARN",
			KICK: "MODERATION_EVENT_DELETE_KICK",
			NOTE: "MODERATION_EVENT_DELETE_NOTE",
		},
	},
	GUILD: {
		UPDATE: {
			NAME: "GUILD_UPDATE_NAME",
			ICON: "GUILD_UPDATE_ICON",
		},
	},
	TICKET: {
		CREATE: "TICKET_CREATE",
		UPDATE: "TICKET_UPDATE",
		CLOSE: "TICKET_CLOSE",
	},
} as const;

type LeafValues<T> = T extends string
	? T
	: T[keyof T] extends infer U
		? LeafValues<U>
		: never;

/**
 * Enum chaining type for Audit Actions
 */
export type AuditAction = LeafValues<typeof AuditAction>;
