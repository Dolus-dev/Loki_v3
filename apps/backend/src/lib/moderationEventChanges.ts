import { AuditAction } from "./Audit Log/auditActions";

/** The parts of a moderation event that a moderator can edit after it was created */
export interface EditableEventFields {
	reason: string;
	evidenceUrl: string | null;
	evidenceMessageId: string | null;
}

/**
 * The event as it is now, plus what is needed to describe it. `eventType` picks the audit action
 * for a reason change (e.g. MODERATION_EVENT_UPDATE_BAN).
 */
export interface EventBeforeEdit extends EditableEventFields {
	id: number;
	eventType: "ban" | "mute" | "warn" | "timeout" | "kick" | "note";
}

/**
 * What the moderator asked for. A field left `undefined` is not touched; for the evidence
 * fields `null` means "remove it".
 */
export interface EventEditRequest {
	reason?: string | undefined;
	evidenceUrl?: string | null | undefined;
	evidenceMessageId?: string | null | undefined;
	/** Why the moderator is making this change; recorded with every change */
	changeReason: string;
}

/** One change, ready to be written to the audit log */
export interface EventChange {
	action: AuditAction;
	details: string;
}

const show = (value: string | null) => (value === null ? "none" : value);

/**
 * Works out what an edit actually changes and describes each change for the audit log.
 *
 * Each kind of change gets its own entry: the reason being edited, and the evidence being
 * added, changed or removed (its URL and message ID are one change). Values that end up
 * identical to what is stored produce no entry, so repeating a request records nothing new.
 * Every entry carries the moderator's reason for the change.
 * @returns The event's fields after the edit, and the changes to record (empty if nothing changed)
 */
export function describeEventChanges(
	before: EventBeforeEdit,
	edit: EventEditRequest,
): { after: EditableEventFields; changes: EventChange[] } {
	const after: EditableEventFields = {
		reason: edit.reason ?? before.reason,
		evidenceUrl:
			edit.evidenceUrl === undefined ? before.evidenceUrl : edit.evidenceUrl,
		evidenceMessageId:
			edit.evidenceMessageId === undefined
				? before.evidenceMessageId
				: edit.evidenceMessageId,
	};

	const label = `${before.eventType} event #${before.id}`;
	const why = `Reason for change: ${edit.changeReason}`;
	const changes: EventChange[] = [];

	if (after.reason !== before.reason) {
		changes.push({
			action:
				AuditAction.MODERATION_EVENT.UPDATE[
					before.eventType.toUpperCase() as keyof typeof AuditAction.MODERATION_EVENT.UPDATE
				],
			details: `Changed the reason of ${label}. Old reason: "${before.reason}". New reason: "${after.reason}". ${why}`,
		});
	}

	const evidenceChanged =
		after.evidenceUrl !== before.evidenceUrl ||
		after.evidenceMessageId !== before.evidenceMessageId;

	if (evidenceChanged) {
		const hadEvidence = before.evidenceUrl !== null || before.evidenceMessageId !== null;
		const hasEvidence = after.evidenceUrl !== null || after.evidenceMessageId !== null;

		if (!hadEvidence) {
			changes.push({
				action: AuditAction.MODERATION_EVENT.EVIDENCE.ADD,
				details: `Added evidence to ${label}. URL: ${show(after.evidenceUrl)}. Message ID: ${show(after.evidenceMessageId)}. ${why}`,
			});
		} else if (!hasEvidence) {
			changes.push({
				action: AuditAction.MODERATION_EVENT.EVIDENCE.REMOVE,
				details: `Removed the evidence from ${label}. Previous URL: ${show(before.evidenceUrl)}. Previous message ID: ${show(before.evidenceMessageId)}. ${why}`,
			});
		} else {
			changes.push({
				action: AuditAction.MODERATION_EVENT.EVIDENCE.UPDATE,
				details: `Changed the evidence of ${label}. URL: ${show(before.evidenceUrl)} -> ${show(after.evidenceUrl)}. Message ID: ${show(before.evidenceMessageId)} -> ${show(after.evidenceMessageId)}. ${why}`,
			});
		}
	}

	return { after, changes };
}
