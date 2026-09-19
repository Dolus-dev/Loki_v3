import express from "express";
import * as z from "zod";
import { requireAuth } from "../../../../../lib/Middlewares/requireAuth";
import { requireGuildSettingsAccess } from "../../../../../lib/Middlewares/requireGuildSettingsAccess";
import { AuditLog } from "../../../../../models/Moderation/Logging/AuditLog";
import { AppDataSource } from "../../../../../";
import { FindOptionsWhere, LessThan } from "typeorm";
import { decodeCursor, encodeCursor } from "../../../../../lib/pagination";

export const router = express.Router({ mergeParams: true });

const GetAuditLogsQuery = z.object({
	pageSize: z.coerce
		.number()
		.int()
		.positive()
		.min(10, "Page size must be at least 10")
		.max(100, "Page size cannot exceed 100")
		.default(25),
	cursor: z.string().optional(), // Base64 encoded ID
});

router.get(
	"/",
	requireAuth,
	requireGuildSettingsAccess("view"),
	async (req: express.Request<{ guildId: string }>, res) => {
		const filters = await GetAuditLogsQuery.safeParseAsync(req.query);

		const { guildId } = req.params;

		if (!filters.success) {
			return res.status(400).send({
				error: "Invalid query parameters",
				details: z.treeifyError(filters.error),
			});
		}

		const { pageSize, cursor } = filters.data;

		const auditLogRepository = AppDataSource.getRepository(AuditLog);

		try {
			let cursorId: number | undefined = undefined;

			// Cursor is the base64 of the last returned log ID; results continue below it
			if (cursor) {
				const decoded = decodeCursor(cursor);
				if (decoded === null) {
					return res.status(400).send({
						error: "Invalid cursor format",
					});
				}
				cursorId = decoded;
			}

			// Build Query

			const whereClause: FindOptionsWhere<AuditLog> = {
				guild: { id: guildId },
			};

			if (cursorId !== undefined) {
				whereClause.id = LessThan(cursorId);
			}

			// Fetch pageSize + 1 to determine if there's a next page

			const logs = await auditLogRepository.find({
				where: whereClause,
				relations: ["user", "targetUser", "guild"],
				order: { id: "DESC" },
				take: pageSize + 1,
			});

			const hasMore = logs.length > pageSize;

			const items = logs.slice(0, pageSize);

			// Generate next cursor from the last item's ID

			const nextCursor = hasMore
				? encodeCursor(items[items.length - 1].id)
				: null;

			return res.status(200).send({
				data: items,
				pagination: {
					pageSize,
					nextCursor, // Pass to frontend for next request
					hasMore,
				},
			});
		} catch (error) {
			console.error("Error fetching audit logs:", error);
			return res.status(500).send({ error: "Failed to fetch audit logs" });
		}
	},
);
