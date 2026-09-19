import { EntityManager } from "typeorm";
import { AppDataSource } from "../..";

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
		UPDATE: {
			BAN: "MODERATION_EVENT_UPDATE_BAN",
			MUTE: "MODERATION_EVENT_UPDATE_MUTE",
			TIMEOUT: "MODERATION_EVENT_UPDATE_TIMEOUT",
			WARN: "MODERATION_EVENT_UPDATE_WARN",
			KICK: "MODERATION_EVENT_UPDATE_KICK",
			NOTE: "MODERATION_EVENT_UPDATE_NOTE",
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

/**
 * Creates an audit log entry in the database
 * @param data Information for the audit log entry. The guild and user(s) must already exist, otherwise this throws.
 * @param manager Entity manager to write with. Pass the one from a transaction so the entry
 * commits or rolls back together with the change it records.
 */
export async function createAuditLogEntry(
	data: {
		action: AuditAction;
		userId: string;
		targetUserId?: string | null;
		guildId: string;
		details?: string | null;
	},
	manager: EntityManager = AppDataSource.manager,
): Promise<void> {
	const { action, userId, targetUserId, guildId, details } = data;
	const auditLogRepository = manager.getRepository("AuditLog");
	const guildRepository = manager.getRepository("Guild");
	const userRepository = manager.getRepository("User");

	const [guild, user, targetUser] = await Promise.all([
		guildRepository.findOneBy({ id: guildId }),

		userRepository.findOneBy({ id: userId }),
		targetUserId
			? userRepository.findOneBy({ id: targetUserId })
			: Promise.resolve(null),
	]);

	if (!guild) {
		throw new Error("Guild not found");
	}

	if (!user) {
		throw new Error("User not found");
	}

	const auditLog = auditLogRepository.create({
		action,
		guild,
		user,
		targetUser,
		details,
	});

	await auditLogRepository.save(auditLog);
	// Temporary console log for audit log creation, can be removed later
	console.log(`Audit log entry created: ${new Date().toUTCString()}`);
	return;
}
