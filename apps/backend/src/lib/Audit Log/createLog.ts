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
} as const;

/**
 * Enum chaining type for Audit Actions
 */
export type AuditAction =
	(typeof AuditAction)[keyof typeof AuditAction][keyof (typeof AuditAction)[keyof typeof AuditAction]][keyof (typeof AuditAction)[keyof typeof AuditAction][keyof (typeof AuditAction)[keyof typeof AuditAction]]];

/**
 * Creats an audit log entry in the database
 * @param data Information for the audit log entry
 */
export async function createAuditLogEntry(data: {
	action: AuditAction;
	userId: string;
	targetUserId?: string | null;
	guildId: string;
	details?: string | null;
}) {
	const { action, userId, targetUserId, guildId, details } = data;
	const auditLogRepository = AppDataSource.getRepository("AuditLog");
	const guildRepository = AppDataSource.getRepository("Guild");
	const userRepository = AppDataSource.getRepository("User");

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
}
