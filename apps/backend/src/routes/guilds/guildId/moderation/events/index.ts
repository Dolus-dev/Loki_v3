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
import { requireGuildSettingsAccess } from "../../../../../lib/Middlewares/requireGuildSettingsAccess";
import {
	decodeCursor,
	encodeCursor,
	parseRowId,
} from "../../../../../lib/pagination";
import { discordSnowflake } from "../../../../../lib/validation";
export const router = express.Router({ mergeParams: true });

/**
 * Works out which user performed a moderation action.
 *
 * Dashboard (session) callers are always the logged-in user; any ID in the body is
 * ignored so they can't attribute an action to someone else. The bot has no
 * session, so it must state who acted in the body.
 * @returns The acting user's ID, or null if the caller didn't provide one
 */
function resolveActorId(
	res: express.Response,
	sessionUserId: string | undefined,
	bodyUserId: string | undefined,
): string | null {
	if (res.locals.authType === "session") {
		return sessionUserId ?? null;
	}
	return bodyUserId ?? null;
}

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
	requireGuildSettingsAccess("view"),
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
			const decoded = decodeCursor(cursor);
			if (decoded === null) {
				return res.status(400).send({ error: "Invalid cursor format" });
			}
			cursorId = decoded;
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
			? encodeCursor(items[items.length - 1].id)
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
	requireGuildSettingsAccess("view"),
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

		const { eventType, issuedBefore, issuedAfter, fetchType } = filters.data;

		const eventRepository = AppDataSource.getRepository(ModerationEvents);
		const guildRepository = AppDataSource.getRepository(Guild);

		// Reads must not write: the guild has to be registered already (via POST /guilds)
		const guildExists = await guildRepository.existsBy({ id: guildId });

		if (!guildExists) {
			return res.status(404).send({ error: "Guild not found" });
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
			const decoded = decodeCursor(cursor);
			if (decoded === null) {
				return res.status(400).send({ error: "Invalid cursor format" });
			}
			cursorId = decoded;
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
			? encodeCursor(items[items.length - 1].id)
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
	// Required for the bot; ignored for dashboard users (see resolveActorId)
	issuedBy: discordSnowflake.optional(),

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
	requireGuildSettingsAccess("edit"),
	async (req: express.Request<{ userId: string; guildId: string }>, res) => {
		const { userId, guildId } = req.params;

		const parseResult = createModerationEvent.safeParse(req.body);
		if (!parseResult.success) {
			return res.status(400).send(z.treeifyError(parseResult.error));
		}
		if (!discordSnowflake.safeParse(userId).success) {
			return res.status(400).send({ error: "Invalid userId format" });
		}

		const { reason, eventType } = parseResult.data;

		const issuedBy = resolveActorId(
			res,
			req.session.userId,
			parseResult.data.issuedBy,
		);
		if (!issuedBy) {
			return res.status(400).send({ error: "issuedBy is required" });
		}

		const userRepository = AppDataSource.getRepository(User);
		const moderationRepository = AppDataSource.getRepository(ModerationEvents);
		const guildRepository = AppDataSource.getRepository(Guild);

		const [guild, targetUser, issuingUser] = await Promise.all([
			// The guild must already be registered (the bot does this via POST /guilds).
			// It can't be upserted here because the `name` column is required.
			guildRepository.findOneBy({ id: guildId }),

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

		if (!guild) {
			return res.status(404).send({ error: "Guild not found" });
		}

		if (!targetUser || !issuingUser) {
			return res.status(500).send({ error: "Failed to create/fetch users" });
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
			// The event and its audit entry are saved together: if one fails, neither is kept
			await AppDataSource.transaction(async (manager) => {
				await manager.getRepository(ModerationEvents).save(newEvent);

				await createAuditLogEntry(
					{
						action:
							AuditAction.MODERATION_EVENT.CREATE[
								eventType.toUpperCase() as keyof typeof AuditAction.MODERATION_EVENT.CREATE
							],
						userId: issuingUser.id,
						targetUserId: targetUser.id,
						guildId: guild.id,
						details: `Created ${eventType} moderation event for user ID ${targetUser.id}`,
					},
					manager,
				);
			});

			console.log(
				`Moderation event created: ${newEvent.id} against user ${userId}`,
			);

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

	// Required for the bot; ignored for dashboard users (see resolveActorId)
	editedBy: discordSnowflake.optional(),
});

router.patch(
	"/:eventId",
	requireGuildSettingsAccess("edit"),
	async (req: express.Request<{ eventId: string; guildId: string }>, res) => {
		const { eventId, guildId } = req.params;

		if (!discordSnowflake.safeParse(guildId).success) {
			return res.status(400).send({ error: "Invalid guildId format" });
		}

		const eventRowId = parseRowId(eventId);
		if (eventRowId === null) {
			return res.status(400).send({ error: "Invalid eventId format" });
		}

		const parseResult = editModerationEvent.safeParse(req.body);
		if (!parseResult.success) {
			return res.status(400).send(z.treeifyError(parseResult.error));
		}

		const { reason } = parseResult.data;

		const editedBy = resolveActorId(
			res,
			req.session.userId,
			parseResult.data.editedBy,
		);
		if (!editedBy) {
			return res.status(400).send({ error: "editedBy is required" });
		}

		const eventRepository = AppDataSource.getRepository(ModerationEvents);
		const userRepository = AppDataSource.getRepository(User);

		const [editingUser, eventToEdit] = await Promise.all([
			userRepository
				.upsert(
					{ id: editedBy },
					{ conflictPaths: ["id"], skipUpdateIfNoValuesChanged: true },
				)
				.then(() => userRepository.findOneBy({ id: editedBy })),
			// Scoped to the URL's guild so one guild can't edit another's events
			eventRepository.findOne({
				where: { id: eventRowId, guild: { id: guildId } },
				relations: ["guild", "issuedTo"],
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
			// The edit and its audit entry are saved together: if one fails, neither is kept
			await AppDataSource.transaction(async (manager) => {
				await manager.getRepository(ModerationEvents).save(eventToEdit);

				await createAuditLogEntry(
					{
						action:
							AuditAction.MODERATION_EVENT.UPDATE[
								eventToEdit.eventType.toUpperCase() as keyof typeof AuditAction.MODERATION_EVENT.UPDATE
							],
						userId: editingUser.id,
						targetUserId: eventToEdit.issuedTo.id,
						guildId: eventToEdit.guild.id,
						details: `Edited ${eventToEdit.eventType} moderation event with ID ${eventToEdit.id}`,
					},
					manager,
				);
			});

			console.log(
				`Moderation event edited: ${eventToEdit.id} by user ${editedBy}`,
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
	// Required for the bot; ignored for dashboard users (see resolveActorId)
	userId: discordSnowflake.optional(),
});

router.delete(
	"/:eventId",
	requireGuildSettingsAccess("edit"),
	async (req: express.Request<{ eventId: string; guildId: string }>, res) => {
	const { eventId, guildId } = req.params;

	if (!discordSnowflake.safeParse(guildId).success) {
		return res.status(400).send({ error: "Invalid guildId format" });
	}

	const eventRowId = parseRowId(eventId);
	if (eventRowId === null) {
		return res.status(400).send({ error: "Invalid eventId format" });
	}

	const eventRepository = AppDataSource.getRepository(ModerationEvents);

	const userRepository = AppDataSource.getRepository(User);

	// DELETE requests may have no body, so default to an empty object
	const parseResult = deleteModerationEvent.safeParse(req.body ?? {});

	if (!parseResult.success) {
		return res.status(400).send(z.treeifyError(parseResult.error));
	}

	const userId = resolveActorId(
		res,
		req.session.userId,
		parseResult.data.userId,
	);
	if (!userId) {
		return res.status(400).send({ error: "userId is required" });
	}

	const [deletingUser, eventToDelete] = await Promise.all([
		userRepository
			.upsert(
				{ id: userId },
				{ conflictPaths: ["id"], skipUpdateIfNoValuesChanged: true },
			)
			.then(() => userRepository.findOneBy({ id: userId })),
		// Scoped to the URL's guild so one guild can't delete another's events.
		// Relations are needed for the audit log entry below.
		eventRepository.findOne({
			where: { id: eventRowId, guild: { id: guildId } },
			relations: ["guild", "issuedTo"],
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

	// Capture what the audit log needs first; TypeORM clears `id` on removed entities
	const { eventType, issuedTo, guild } = eventToDelete;

	try {
		// The deletion and its audit entry are saved together: if one fails, neither is kept
		await AppDataSource.transaction(async (manager) => {
			await manager.getRepository(ModerationEvents).remove(eventToDelete);

			await createAuditLogEntry(
				{
					action:
						AuditAction.MODERATION_EVENT.DELETE[
							eventType.toUpperCase() as keyof typeof AuditAction.MODERATION_EVENT.DELETE
						],
					userId: deletingUser.id,
					targetUserId: issuedTo.id,
					guildId: guild.id,
					details: `Deleted ${eventType} moderation event with ID ${eventId}`,
				},
				manager,
			);
		});

		console.log(`Moderation event deleted: ${eventId}`);

		return res
			.status(200)
			.send({ eventId, message: "Event deleted successfully" });
	} catch (error) {
		console.error("Error deleting moderation event:", error);
		return res.status(500).send({ error: "Failed to delete moderation event" });
	}
	},
);
