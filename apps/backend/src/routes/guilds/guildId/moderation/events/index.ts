import express from "express";
import * as z from "zod";
import { AppDataSource } from "../../../../../";
import { User } from "../../../../../models/User";
import { ModerationEvents } from "../../../../../models/Moderation/ModerationEvents";
import {
	Between,
	FindOptionsWhere,
	LessThan,
	LessThanOrEqual,
	MoreThan,
	MoreThanOrEqual,
} from "typeorm";
import { Guild } from "../../../../../models/Guild";
import {
	AuditAction,
	createAuditLogEntry,
} from "../../../../../lib/Audit Log/createLog";
import { requireAuth } from "../../../../../lib/Middlewares/requireAuth";
export const router = express.Router({ mergeParams: true });

const discordSnowflake = z
	.string()
	.regex(/^\d{17,20}$/, "Invalid Discord snowflake ID");

const fetchModerationEventsFilters = z.object({
	eventType: z
		.enum(["ban", "mute", "warn", "timeout", "kick", "note", "all"])
		.default("all"),
	issuedBefore: z.coerce
		.number()
		.int()
		.positive()
		.optional()
		.transform((val) => (val ? new Date(val * 1000) : undefined))
		.refine((date) => !date || !isNaN(date.getTime()), {
			message: "Invalid date format for issuedBefore",
		}),
	guildName: z.string(),
	issuedAfter: z.coerce
		.number()
		.int()
		.optional()
		.transform((val) => (val ? new Date(val * 1000) : undefined))
		.refine((date) => !date || !isNaN(date.getTime()), {
			message: "Invalid date format for issuedAfter",
		}),
	fetchType: z
		.enum(["issuedTo", "issuedBy", "lastEditedBy", "all"])
		.default("issuedTo"),
});

const GetGuildModerationEventsQuery = z.object({
	pageSize: z.coerce
		.number()
		.int()
		.positive()
		.min(10, "Page size must be at least 10")
		.max(100, "Page size cannot exceed 100")
		.default(25),
	cursor: z.string().optional(),
	sort: z.enum(["mostRecent", "oldest"]).default("mostRecent"),
});

const GetUserModerationEventsQuery = GetGuildModerationEventsQuery;

router.get(
	"/",
	async (req: express.Request<{ guildId: string }>, res) => {
		const { guildId } = req.params;
		const filters = await GetGuildModerationEventsQuery.safeParseAsync(
			req.query,
		);

		if (!filters.success) {
			return res.status(400).send({
				error: "Invalid query parameters",
				details: z.treeifyError(filters.error),
			});
		}

		const { pageSize, cursor, sort } = filters.data;
		const eventRepository = AppDataSource.getRepository(ModerationEvents);

		let cursorId: number | undefined;

		if (cursor) {
			try {
				cursorId = Number.parseInt(Buffer.from(cursor, "base64").toString("utf-8"), 10);
				if (!Number.isInteger(cursorId)) {
					return res.status(400).send({ error: "Invalid cursor format" });
				}
			} catch (error) {
				return res.status(400).send({ error: "Invalid cursor format" });
			}
		}

		const queryBuilder = eventRepository
			.createQueryBuilder("event")
			.leftJoinAndSelect("event.issuedTo", "issuedTo")
			.leftJoinAndSelect("event.issuedBy", "issuedBy")
			.leftJoinAndSelect("event.lastUpdatedBy", "lastUpdatedBy")
			.leftJoinAndSelect("event.guild", "guild")
			.where("guild.id = :guildId", { guildId });

		if (cursorId !== undefined) {
			if (sort === "mostRecent") {
				queryBuilder.andWhere("event.id < :cursorId", { cursorId });
			} else {
				queryBuilder.andWhere("event.id > :cursorId", { cursorId });
			}
		}

		queryBuilder.orderBy("event.id", sort === "mostRecent" ? "DESC" : "ASC");
		queryBuilder.take(pageSize + 1);

		const events = await queryBuilder.getMany();
		const hasMore = events.length > pageSize;
		const items = events.slice(0, pageSize);
		const nextCursor = hasMore
			? Buffer.from(String(items[items.length - 1].id)).toString("base64")
			: null;

		return res.status(200).send({
			data: items,
			pagination: {
				pageSize,
				sort,
				nextCursor,
				hasMore,
			},
		});
	},
);

router.get(
	"/:userId",
	async (req: express.Request<{ guildId: string; userId: string }>, res) => {
		const { userId, guildId } = req.params;

		const guildIdResult = discordSnowflake.safeParse(guildId);
		if (!guildIdResult.success) {
			return res.status(400).send({ error: "Invalid guildId format" });
		}

		const userIdResult = discordSnowflake.safeParse(userId);
		if (!userIdResult.success) {
			return res.status(400).send({ error: "Invalid userId format" });
		}

		const filters = await fetchModerationEventsFilters.safeParseAsync(req.query);

		if (!filters.success) {
			return res.status(400).send(z.treeifyError(filters.error));
		}

		const { eventType, issuedBefore, issuedAfter, fetchType, guildName } =
			filters.data;

		// Placeholder for actual data fetching logic
		// You would typically query your database here using the filters

		const eventRepository = AppDataSource.getRepository(ModerationEvents);
		const guildRepository = AppDataSource.getRepository(Guild);

		await guildRepository.upsert(
			{
				id: guildId,
				name: guildName,
			},
			{ conflictPaths: ["id"], skipUpdateIfNoValuesChanged: true },
		);

		const guild = await guildRepository.findOneBy({ id: guildId });

		if (!guild) {
			return res.status(500).send({ error: "Failed to create/fetch guild" });
		}

		const pagination = await GetUserModerationEventsQuery.safeParseAsync(req.query);

		if (!pagination.success) {
			return res.status(400).send({
				error: "Invalid query parameters",
				details: z.treeifyError(pagination.error),
			});
		}

		const { pageSize, cursor, sort } = pagination.data;

		let cursorId: number | undefined;

		if (cursor) {
			try {
				cursorId = Number.parseInt(Buffer.from(cursor, "base64").toString("utf-8"), 10);
				if (!Number.isInteger(cursorId)) {
					return res.status(400).send({ error: "Invalid cursor format" });
				}
			} catch (error) {
				return res.status(400).send({ error: "Invalid cursor format" });
			}
		}

		const queryBuilder = eventRepository
			.createQueryBuilder("event")
			.leftJoinAndSelect("event.issuedTo", "issuedTo")
			.leftJoinAndSelect("event.issuedBy", "issuedBy")
			.leftJoinAndSelect("event.lastUpdatedBy", "lastUpdatedBy")
			.leftJoinAndSelect("event.guild", "guild")
			.where("guild.id = :guildId", { guildId });

		switch (fetchType) {
			case "issuedTo":
				queryBuilder.andWhere("issuedTo.id = :userId", { userId });
				break;
			case "issuedBy":
				queryBuilder.andWhere("issuedBy.id = :userId", { userId });
				break;
			case "lastEditedBy":
				queryBuilder.andWhere("lastUpdatedBy.id = :userId", { userId });
				break;
			case "all":
				queryBuilder.andWhere(
					"(issuedTo.id = :userId OR issuedBy.id = :userId OR lastUpdatedBy.id = :userId)",
					{ userId },
				);
				break;
		}

		if (eventType !== "all") {
			queryBuilder.andWhere("event.eventType = :eventType", { eventType });
		}

		if (issuedBefore && issuedAfter) {
			queryBuilder.andWhere("event.createdAt BETWEEN :after AND :before", {
				after: issuedAfter,
				before: issuedBefore,
			});
		} else if (issuedBefore) {
			queryBuilder.andWhere("event.createdAt <= :before", {
				before: issuedBefore,
			});
		} else if (issuedAfter) {
			queryBuilder.andWhere("event.createdAt >= :after", {
				after: issuedAfter,
		});
		}

		if (cursorId !== undefined) {
			if (sort === "mostRecent") {
				queryBuilder.andWhere("event.id < :cursorId", { cursorId });
			} else {
				queryBuilder.andWhere("event.id > :cursorId", { cursorId });
			}
		}

		queryBuilder.orderBy("event.id", sort === "mostRecent" ? "DESC" : "ASC");
		queryBuilder.take(pageSize + 1);

		const events = await queryBuilder.getMany();
		const hasMore = events.length > pageSize;
		const items = events.slice(0, pageSize);
		const nextCursor = hasMore
			? Buffer.from(String(items[items.length - 1].id)).toString("base64")
			: null;

		return res.status(200).send({
			data: items,
			pagination: {
				pageSize,
				sort,
				nextCursor,
				hasMore,
			},
		});
	},
);

const createModerationEvent = z.object({
	issuedBy: discordSnowflake,

	reason: z
		.string()
		.trim()
		.max(512, "Reason cannot exceed 512 characters")
		.optional()
		.transform((str) => str || "No reason provided"),
	eventType: z.enum(["ban", "mute", "warn", "timeout", "kick", "note"]),
});

router.post(
	"/:userId",
	requireAuth,
	async (req: express.Request<{ userId: string; guildId: string }>, res) => {
		const { userId, guildId } = req.params;

		const parseResult = createModerationEvent.safeParse(req.body);
		if (!parseResult.success) {
			return res.status(400).send(z.treeifyError(parseResult.error));
		}
		if (!discordSnowflake.safeParse(userId).success) {
			return res.status(400).send({ error: "Invalid userId format" });
		}

		const { issuedBy, reason, eventType } = parseResult.data;

		const userRepository = AppDataSource.getRepository(User);
		const moderationRepository = AppDataSource.getRepository(ModerationEvents);
		const guildRepository = AppDataSource.getRepository(Guild);

		const [guild, targetUser, issuingUser] = await Promise.all([
			guildRepository
				.upsert(
					{ id: guildId },
					{ conflictPaths: ["id"], skipUpdateIfNoValuesChanged: true },
				)
				.then(() => guildRepository.findOneBy({ id: guildId })),

			userRepository
				.upsert(
					{ id: userId },
					{ conflictPaths: ["id"], skipUpdateIfNoValuesChanged: true },
				)
				.then(() => userRepository.findOneBy({ id: userId })),

			userRepository
				.upsert(
					{ id: issuedBy },
					{ conflictPaths: ["id"], skipUpdateIfNoValuesChanged: true },
				)
				.then(() => userRepository.findOneBy({ id: issuedBy })),
		]);

		if (!targetUser || !issuingUser || !guild) {
			return res
				.status(500)
				.send({ error: "Failed to create/fetch users or guild" });
		}

		const newEvent = moderationRepository.create({
			issuedTo: targetUser,
			issuedBy: issuingUser,
			lastUpdatedBy: issuingUser,
			guild: guild,
			reason,
			eventType,
		});

		try {
			await moderationRepository.save(newEvent);

			console.log(
				`Moderation event created: ${newEvent.id} against user ${userId}`,
			);

			await createAuditLogEntry({
				action:
					AuditAction.MODERATION_EVENT.CREATE[
						eventType.toUpperCase() as keyof typeof AuditAction.MODERATION_EVENT.CREATE
					],
				userId: issuingUser.id,
				targetUserId: targetUser.id,
				guildId: guild.id,
				details: `Created ${eventType} moderation event for user ID ${targetUser.id}`,
			});

			console.log(`Audit log created for moderation event: ${newEvent.id}`);

			return res
				.status(201)
				.send({ message: "Moderation event created", eventId: newEvent.id });
		} catch (error) {
			console.error("Error saving moderation event:", error);
			return res
				.status(500)
				.send({ error: "Failed to create moderation event" });
		}
	},
);

const editModerationEvent = z.object({
	reason: z.string().trim().max(512, "Reason cannot exceed 512 characters"),

	editedBy: discordSnowflake,
});

router.patch(
	"/:eventId",
	async (req: express.Request<{ eventId: string; guildId: string }>, res) => {
		const { eventId, guildId } = req.params;

		if (!discordSnowflake.safeParse(guildId).success) {
			return res.status(400).send({ error: "Invalid guildId format" });
		}

		if (!/^\d+$/.test(eventId)) {
			return res.status(400).send({ error: "Invalid eventId format" });
		}

		const parseResult = editModerationEvent.safeParse(req.body);
		if (!parseResult.success) {
			return res.status(400).send(z.treeifyError(parseResult.error));
		}

		const { reason, editedBy } = parseResult.data;

		const eventRepository = AppDataSource.getRepository(ModerationEvents);
		const userRepository = AppDataSource.getRepository(User);

		const [editingUser, eventToEdit] = await Promise.all([
			userRepository
				.upsert(
					{ id: editedBy },
					{ conflictPaths: ["id"], skipUpdateIfNoValuesChanged: true },
				)
				.then(() => userRepository.findOneBy({ id: editedBy })),
			eventRepository.findOne({
				where: { id: Number(eventId) },
				relations: ["guild"],
			}),
		]);
		if (!editingUser) {
			return res
				.status(500)
				.send({ error: "Failed to create/fetch editing user" });
		}

		if (!eventToEdit) {
			return res.status(404).send({ error: "Moderation event not found" });
		}

		eventToEdit.reason = reason;
		eventToEdit.lastUpdatedBy = editingUser;

		try {
			await eventRepository.save(eventToEdit);

			console.log(
				`Moderation event edited: ${eventToEdit.id} by user ${editedBy}`,
			);

			await createAuditLogEntry({
				action:
					AuditAction.MODERATION_EVENT.UPDATE[
						eventToEdit.eventType.toUpperCase() as keyof typeof AuditAction.MODERATION_EVENT.UPDATE
					],
				userId: editingUser.id,
				targetUserId: eventToEdit.issuedTo.id,
				guildId: eventToEdit.guild.id,
				details: `Edited ${eventToEdit.eventType} moderation event with ID ${eventToEdit.id}`,
			});

			console.log(
				`Audit log created for moderation event update: ${eventToEdit.id}`,
			);
			return res.status(200).send({
				message: "Moderation event edited successfully",
				eventId: eventToEdit.id,
			});
		} catch (error) {
			console.error("Error saving edited moderation event:", error);
			return res.status(500).send({ error: "Failed to edit moderation event" });
		}
	},
);

const deleteModerationEvent = z.object({
	userId: discordSnowflake,
});

router.delete(
	"/:eventId",
	async (req: express.Request<{ eventId: string; guildId: string }>, res) => {
	const { eventId, guildId } = req.params;

	if (!discordSnowflake.safeParse(guildId).success) {
		return res.status(400).send({ error: "Invalid guildId format" });
	}

	if (!/^\d+$/.test(eventId)) {
		return res.status(400).send({ error: "Invalid eventId format" });
	}

	const eventRepository = AppDataSource.getRepository(ModerationEvents);

	const userRepository = AppDataSource.getRepository(User);

	const parseResult = deleteModerationEvent.safeParse(req.body);

	if (!parseResult.success) {
		return res.status(400).send(z.treeifyError(parseResult.error));
	}

	const { userId } = parseResult.data;

	const [deletingUser, eventToDelete] = await Promise.all([
		userRepository
			.upsert(
				{ id: userId },
				{ conflictPaths: ["id"], skipUpdateIfNoValuesChanged: true },
			)
			.then(() => userRepository.findOneBy({ id: userId })),
		eventRepository.findOne({
			where: { id: Number(eventId) },
		}),
	]);

	if (!eventToDelete) {
		return res.status(404).send({ error: "Moderation event not found" });
	}

	if (!deletingUser) {
		return res
			.status(500)
			.send({ error: "Failed to create/fetch deleting user" });
	}

	await eventRepository.remove(eventToDelete);

	await createAuditLogEntry({
		action:
			AuditAction.MODERATION_EVENT.DELETE[
				eventToDelete.eventType.toUpperCase() as keyof typeof AuditAction.MODERATION_EVENT.DELETE
			],
		userId: deletingUser.id,
		targetUserId: eventToDelete.issuedTo.id,
		guildId: eventToDelete.guild.id,
		details: `Deleted ${eventToDelete.eventType} moderation event with ID ${eventToDelete.id}`,
	});

	console.log(
		`Audit log created for moderation event deletion: ${eventToDelete.id}`,
	);

	return res
		.status(200)
		.send({ eventId, message: "Event deleted successfully" });
	},
);
