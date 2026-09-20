import { EntityManager } from "typeorm";
import { AppDataSource } from "../..";
import type { AuditAction } from "./auditActions";

// The action names live in their own file so they can be used without the database
export { AuditAction } from "./auditActions";

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
