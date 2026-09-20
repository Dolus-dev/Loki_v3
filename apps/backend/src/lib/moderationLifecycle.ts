import { EntityManager } from "typeorm";
import {
	ModerationEvents,
	ModerationEventType,
} from "../models/Moderation/ModerationEvents";

/**
 * Event types that have a lasting effect and therefore a lifecycle (see ModerationEventStatus).
 * Warns, kicks and notes happen once and have no status.
 */
export const LASTING_EVENT_TYPES: readonly ModerationEventType[] = [
	"ban",
	"mute",
	"timeout",
];

export function isLastingEventType(eventType: ModerationEventType): boolean {
	return LASTING_EVENT_TYPES.includes(eventType);
}

/** An older event that was replaced, with what is needed to describe the replacement */
export interface SupersededEvent {
	id: number;
	expiresAt: Date | null;
}

/**
 * Marks the user's currently active event of this action type (if any) as superseded.
 *
 * Call this inside the transaction that creates the newer event, before saving it. The
 * database allows only one active event per user, guild and action type, so the old one has
 * to stop being active first. Nobody else can create an event for the same user and action type
 * in the meantime: this takes a lock on that combination, held until the transaction ends.
 * Finish with `linkSuperseded` once the new event has an ID.
 * @returns The events that were superseded (normally zero or one)
 */
export async function supersedeActiveEvents(
	manager: EntityManager,
	target: { guildId: string; userId: string; eventType: ModerationEventType },
): Promise<SupersededEvent[]> {
	await manager.query("SELECT pg_advisory_xact_lock(hashtext($1))", [
		`moderation-event:${target.guildId}:${target.userId}:${target.eventType}`,
	]);

	const result = await manager
		.createQueryBuilder()
		.update(ModerationEvents)
		// The database's own clock, so the moment doesn't depend on this server's clock
		.set({ status: "superseded", endedAt: () => "now()" })
		.where(
			`"guildId" = :guildId AND "issuedToId" = :userId AND "eventType" = :eventType AND "status" = 'active'`,
			target,
		)
		.returning(["id", "expiresAt"])
		.execute();

	return (result.raw as SupersededEvent[]).map((row) => ({
		id: row.id,
		expiresAt: row.expiresAt,
	}));
}

/** Records which newer event replaced the superseded ones */
export async function linkSuperseded(
	manager: EntityManager,
	supersededIds: number[],
	newEventId: number,
): Promise<void> {
	if (supersededIds.length === 0) {
		return;
	}

	await manager
		.createQueryBuilder()
		.update(ModerationEvents)
		.set({ supersededBy: { id: newEventId } })
		.whereInIds(supersededIds)
		.execute();
}

const describeExpiry = (expiresAt: Date | null) =>
	expiresAt === null ? "permanent" : `expires ${expiresAt.toISOString()}`;

/**
 * Describes a replacement for the audit log. This is how a wrong expiry gets corrected, so
 * both the old and the new expiry are spelled out.
 */
export function describeSupersede(
	eventType: ModerationEventType,
	old: SupersededEvent,
	newEvent: { id: number; expiresAt: Date | null },
): string {
	return `The ${eventType} event #${old.id} (${describeExpiry(old.expiresAt)}) was replaced by the newer ${eventType} event #${newEvent.id} (${describeExpiry(newEvent.expiresAt)}). The new event's expiry now applies.`;
}
