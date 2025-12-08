import express from "express";
import * as z from "zod";
import { requireAuth } from "../../../lib/requireAuth - Middleware";
import { AuditLog } from "../../../models/Moderation/Logging/AuditLog";
import { AppDataSource } from "../../../";
import { FindOptionsWhere, LessThan } from "typeorm";

export const router = express.Router();

const GetAuditLogsQuery = z.object({
	guildId: z.coerce
		.number()
		.int()
		.positive()
		.transform((val) => String(val)),
	pageSize: z.coerce
		.number()
		.int()
		.positive()
		.min(10, "Page size must be at least 10")
		.max(100, "Page size cannot exceed 100")
		.default(25),
	cursor: z.string().optional(), // Base64 encoded ID
});

router.get("/", requireAuth, async (req, res) => {
	const filters = await GetAuditLogsQuery.safeParseAsync(req.query);

	if (!filters.success) {
		return res.status(400).send({
			error: "Invalid query parameters",
			details: z.treeifyError(filters.error),
		});
	}

	const { guildId, pageSize, cursor } = filters.data;

	const auditLogRepository = AppDataSource.getRepository(AuditLog);

	try {
		let cursorId: number | undefined = undefined;

		if (cursor) {
			try {
				cursorId = parseInt(Buffer.from(cursor, "base64").toString("utf-8"));
			} catch (error) {
				return res.status(400).send({
					error: "Invalid cursor format",
				});
			}
		}

		// Build Query

		const whereClause: FindOptionsWhere<AuditLog> = {
			guild: { id: guildId },
		};

		if (cursorId) {
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
			? Buffer.from(String(items[items.length - 1].id)).toString("base64")
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
});
