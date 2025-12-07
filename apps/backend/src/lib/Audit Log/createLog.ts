import { AppDataSource } from "../..";

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
		},
		DELETE: "MODERATION_EVENT_DELETE",
	},
} as const;

export type AuditAction =
	(typeof AuditAction)[keyof typeof AuditAction][keyof (typeof AuditAction)[keyof typeof AuditAction]];

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
