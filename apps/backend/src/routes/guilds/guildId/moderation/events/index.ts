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
import { describeEventChanges } from "../../../../../lib/moderationEventChanges";
import {
	describeSupersede,
	isLastingEventType,
	linkSuperseded,
	supersedeActiveEvents,
} from "../../../../../lib/moderationLifecycle";
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

	// Evidence the moderator attached when using the command: a link to it, and/or the ID
	// of the Discord message that contains it. Only http(s) links are accepted, so the
	// dashboard can safely show the URL as a link.
	evidenceUrl: z.httpUrl().max(2048, "Evidence URL cannot exceed 2048 characters").optional(),
	evidenceMessageId: discordSnowflake.optional(),

	// When a temporary action (ban, mute, timeout, ...) ends. Omit it for a permanent one.
	// An ISO 8601 date-time with a timezone, e.g. "2030-01-01T12:00:00Z", in the future.
	expiresAt: z.iso
		.datetime({ offset: true, message: "expiresAt must be an ISO 8601 date-time with a timezone" })
		.transform((value) => new Date(value))
		.refine((date) => date.getTime() > Date.now(), {
			message: "expiresAt must be in the future",
		})
		.optional(),
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

		const { reason, eventType, evidenceUrl, evidenceMessageId, expiresAt } =
			parseResult.data;

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
			evidenceUrl: evidenceUrl ?? null,
			evidenceMessageId: evidenceMessageId ?? null,
			expiresAt: expiresAt ?? null,
			// Bans, mutes and timeouts are in effect from now; warns, kicks and notes have no status
			status: isLastingEventType(eventType) ? "active" : null,
		});

		try {
			// The event, the replacement of an older active event, and the audit entries are
			// saved together: if any step fails, none of them are kept
			const superseded = await AppDataSource.transaction(async (manager) => {
				// A newer event of the same action type replaces the one still in effect, whatever
				// its expiry (a new permanent ban replaces an earlier temporary one)
				const supersededEvents = isLastingEventType(eventType)
					? await supersedeActiveEvents(manager, {
							guildId: guild.id,
							userId: targetUser.id,
							eventType,
						})
					: [];

				await manager.getRepository(ModerationEvents).save(newEvent);
				await linkSuperseded(
					manager,
					supersededEvents.map((old) => old.id),
					newEvent.id,
				);

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

				for (const old of supersededEvents) {
					await createAuditLogEntry(
						{
							action: AuditAction.MODERATION_EVENT.SUPERSEDE,
							userId: issuingUser.id,
							targetUserId: targetUser.id,
							guildId: guild.id,
							details: describeSupersede(eventType, old, {
								id: newEvent.id,
								expiresAt: newEvent.expiresAt,
							}),
						},
						manager,
					);
				}

				return supersededEvents;
			});

			console.log(
				`Moderation event created: ${newEvent.id} against user ${userId}`,
			);

			return res.status(201).send({
				message: "Moderation event created",
				eventId: newEvent.id,
				// Older events of the same action type that this one replaced
				supersededEventIds: superseded.map((old) => old.id),
			});
		} catch (error) {
			console.error("Error saving moderation event:", error);
			return res
				.status(500)
				.send({ error: "Failed to create moderation event" });
		}
	},
);

// Send only what should change. For the evidence fields, null removes the evidence.
const editModerationEvent = z
	.object({
		reason: z
			.string()
			.trim()
			.min(1, "Reason cannot be empty")
			.max(512, "Reason cannot exceed 512 characters")
			.optional(),
		evidenceUrl: z
			.httpUrl()
			.max(2048, "Evidence URL cannot exceed 2048 characters")
			.nullable()
			.optional(),
		evidenceMessageId: discordSnowflake.nullable().optional(),

		// Why the moderator is making this change. It is recorded in the audit log with
		// every change, so it is always required.
		changeReason: z
			.string()
			.trim()
			.min(1, "A reason for the change is required")
			.max(512, "Reason for the change cannot exceed 512 characters"),

		// Required for the bot; ignored for dashboard users (see resolveActorId)
		editedBy: discordSnowflake.optional(),
	})
	.refine(
		(body) =>
			body.reason !== undefined ||
			body.evidenceUrl !== undefined ||
			body.evidenceMessageId !== undefined,
		{
			message:
				"Provide at least one of reason, evidenceUrl or evidenceMessageId to change",
		},
	);

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

		const { reason, evidenceUrl, evidenceMessageId, changeReason } =
			parseResult.data;

		const editedBy = resolveActorId(
			res,
			req.session.userId,
			parseResult.data.editedBy,
		);
		if (!editedBy) {
			return res.status(400).send({ error: "editedBy is required" });
		}

		const userRepository = AppDataSource.getRepository(User);

		const editingUser = await userRepository
			.upsert(
				{ id: editedBy },
				{ conflictPaths: ["id"], skipUpdateIfNoValuesChanged: true },
			)
			.then(() => userRepository.findOneBy({ id: editedBy }));

		if (!editingUser) {
			return res
				.status(500)
				.send({ error: "Failed to create/fetch editing user" });
		}

		try {
			// Everything happens in one transaction: the event's new values and one audit entry
			// per change are saved together, or not at all.
			const outcome = await AppDataSource.transaction(async (manager) => {
				// Lock the event first, so two moderators editing at the same moment can't both
				// record the same "old" values in the audit log.
				const locked = await manager
					.createQueryBuilder(ModerationEvents, "event")
					.setLock("pessimistic_write")
					.where("event.id = :id", { id: eventRowId })
					.getOne();
				if (!locked) {
					return null;
				}

				// Scoped to the URL's guild so one guild can't edit another's events
				const event = await manager.getRepository(ModerationEvents).findOne({
					where: { id: eventRowId, guild: { id: guildId } },
					relations: ["guild", "issuedTo"],
				});
				if (!event) {
					return null;
				}

				const { after, changes } = describeEventChanges(event, {
					reason,
					evidenceUrl,
					evidenceMessageId,
					changeReason,
				});

				if (changes.length === 0) {
					return { eventId: event.id, changes };
				}

				event.reason = after.reason;
				event.evidenceUrl = after.evidenceUrl;
				event.evidenceMessageId = after.evidenceMessageId;
				event.lastUpdatedBy = editingUser;
				await manager.getRepository(ModerationEvents).save(event);

				for (const change of changes) {
					await createAuditLogEntry(
						{
							action: change.action,
							userId: editingUser.id,
							targetUserId: event.issuedTo.id,
							guildId: event.guild.id,
							details: change.details,
						},
						manager,
					);
				}

				return { eventId: event.id, changes };
			});

			if (!outcome) {
				return res.status(404).send({ error: "Moderation event not found" });
			}

			console.log(
				`Moderation event edited: ${outcome.eventId} by user ${editedBy} (${outcome.changes.length} change(s))`,
			);
			return res.status(200).send({
				message:
					outcome.changes.length > 0
						? "Moderation event edited successfully"
						: "No changes were made",
				eventId: outcome.eventId,
				// The audit actions recorded, one per kind of change
				changes: outcome.changes.map((change) => change.action),
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
