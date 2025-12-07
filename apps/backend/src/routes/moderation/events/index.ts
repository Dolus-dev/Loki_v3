import express from "express";
import * as z from "zod";
import { AppDataSource } from "../../..";
import { User } from "../../../models/User";
import { ModerationEvents } from "../../../models/Moderation";
import {
	Between,
	FindOptionsWhere,
	LessThanOrEqual,
	MoreThanOrEqual,
} from "typeorm";
import { Guild } from "../../../models/Guild";
export const router = express.Router();

router.get("/", (req, res) => {
	return res.status(200).send({ message: "Event received" });
});

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
	guildId: z.string(),
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

router.get("/:userId", async (req, res) => {
	const { userId } = req.params;

	const filters = await fetchModerationEventsFilters.safeParseAsync(req.query);

	if (!filters.success) {
		return res.status(400).send(z.treeifyError(filters.error));
	}

	const {
		eventType,
		issuedBefore,
		issuedAfter,
		fetchType,
		guildId,
		guildName,
	} = filters.data;

	// Placeholder for actual data fetching logic
	// You would typically query your database here using the filters

	const eventRepository = AppDataSource.getRepository(ModerationEvents);
	const guildRepository = AppDataSource.getRepository(Guild);

	await guildRepository.upsert(
		{
			id: guildId,
			name: guildName,
		},
		{ conflictPaths: ["id"], skipUpdateIfNoValuesChanged: true }
	);

	const guild = await guildRepository.findOneBy({ id: guildId });

	if (!guild) {
		return res.status(500).send({ error: "Failed to create/fetch guild" });
	}

	const whereClause: FindOptionsWhere<ModerationEvents> = {};

	switch (fetchType) {
		case "issuedTo":
			whereClause.issuedTo = { id: userId };
			break;
		case "issuedBy":
			whereClause.issuedBy = { id: userId };
			break;
		case "lastEditedBy":
			whereClause.lastUpdatedBy = { id: userId };
			break;
		case "all": {
			const queryBuilder = eventRepository
				.createQueryBuilder("event")
				.leftJoinAndSelect("event.issuedTo", "issuedTo")
				.leftJoinAndSelect("event.issuedBy", "issuedBy")
				.leftJoinAndSelect("event.lastUpdatedBy", "lastUpdatedBy")
				.leftJoinAndSelect("event.guild", "guild")
				.where("guild.id = :guildId", { guildId })
				.andWhere(
					"(issuedTo.id = :userId OR issuedBy.id = :userId OR lastUpdatedBy.id = :userId)",
					{ userId }
				);

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

			const fetchedEvents = await queryBuilder
				.orderBy("event.createdAt", "DESC")
				.getMany();

			return res.status(200).send({ events: fetchedEvents });
		}
	}

	whereClause.guild = guild;

	if (eventType !== "all") {
		whereClause.eventType = eventType;
	}

	if (issuedBefore && issuedAfter) {
		whereClause.createdAt = Between(issuedAfter, issuedBefore);
	} else if (issuedBefore) {
		whereClause.createdAt = LessThanOrEqual(issuedBefore);
	} else if (issuedAfter) {
		whereClause.createdAt = MoreThanOrEqual(issuedAfter);
	}

	const fetchedEvents = await eventRepository.find({
		where: whereClause,
		relations: ["issuedTo", "issuedBy", "lastUpdatedBy", "guild"],
		order: { createdAt: "DESC" },
	});

	return res.status(200).send({
		events: fetchedEvents,
	});
});

const createModerationEvent = z.object({
	issuedBy: z.coerce
		.number()
		.int()
		.positive()
		.transform((num) => String(num)),
	guildId: z.string(),
	guildName: z.string(),
	reason: z
		.string()
		.trim()
		.max(512, "Reason cannot exceed 512 characters")
		.optional()
		.transform((str) => str || "No reason provided"),
	eventType: z.enum(["ban", "mute", "warn", "timeout", "kick", "note"]),
});

router.post("/:userId", async (req, res) => {
	const { userId } = req.params;

	const parseResult = createModerationEvent.safeParse(req.body);
	if (!parseResult.success) {
		return res.status(400).send(z.treeifyError(parseResult.error));
	}
	if (!/^\d+$/.test(userId)) {
		return res.status(400).send({ error: "Invalid userId format" });
	}

	const { issuedBy, reason, eventType, guildId, guildName } = parseResult.data;

	const userRepository = AppDataSource.getRepository(User);
	const moderationRepository = AppDataSource.getRepository(ModerationEvents);
	const guildRepository = AppDataSource.getRepository(Guild);

	const [guild, targetUser, issuingUser] = await Promise.all([
		guildRepository
			.upsert(
				{ id: guildId, name: guildName },
				{ conflictPaths: ["id"], skipUpdateIfNoValuesChanged: true }
			)
			.then(() => guildRepository.findOneBy({ id: guildId })),

		userRepository
			.upsert(
				{ id: userId },
				{ conflictPaths: ["id"], skipUpdateIfNoValuesChanged: true }
			)
			.then(() => userRepository.findOneBy({ id: userId })),

		userRepository
			.upsert(
				{ id: issuedBy },
				{ conflictPaths: ["id"], skipUpdateIfNoValuesChanged: true }
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
			`Moderation event created: ${newEvent.id} against user ${userId}`
		);

		return res
			.status(201)
			.send({ message: "Moderation event created", eventId: newEvent.id });
	} catch (error) {
		console.error("Error saving moderation event:", error);
		return res.status(500).send({ error: "Failed to create moderation event" });
	}
});

const editModerationEvent = z.object({
	reason: z
		.string()
		.trim()
		.max(512, "Reason cannot exceed 512 characters")
		.transform((str) => str || "No reason provided")
		.optional(),
	editedBy: z.coerce.number().int().positive(),
});

router.patch("/:eventId", async (req, res) => {
	const { eventId } = req.params;

	const parseResult = editModerationEvent.safeParse(req.body);
	if (!parseResult.success) {
		return res.status(400).send(z.treeifyError(parseResult.error));
	}

	const { reason, editedBy } = parseResult.data;

	// Placeholder for actual event editing logic
	// You would typically update the record in your database here

	return res.status(200).send({ eventId, ...parseResult.data });
});

router.delete("/:eventId", async (req, res) => {
	const { eventId } = req.params;

	// Placeholder for actual event deletion logic
	// You would typically delete the record from your database here

	return res
		.status(200)
		.send({ eventId, message: "Event deleted successfully" });
});
