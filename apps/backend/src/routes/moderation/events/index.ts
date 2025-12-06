import express from "express";
import * as z from "zod";

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

	const { eventType, issuedBefore, issuedAfter, fetchType } = filters.data;

	// Placeholder for actual data fetching logic
	// You would typically query your database here using the filters

	return res.status(200).send({
		message: `Details for user ID: ${userId}`,
		filters: { eventType, issuedBefore, issuedAfter, fetchType },
	});
});

const createModerationEvent = z.object({
	issuedBy: z.coerce.number().int().positive(),
	reason: z
		.string()
		.trim()
		.min(1, "Reason cannot be empty")
		.max(512, "Reason cannot exceed 512 characters")
		.default("No reason provided"),
	eventType: z.enum(["ban", "mute", "warn", "timeout", "kick", "note"]),
});

router.post("/:userId", async (req, res) => {
	const { userId } = req.params;

	const parseResult = createModerationEvent.safeParse(req.body);
	if (!parseResult.success) {
		return res.status(400).send(z.treeifyError(parseResult.error));
	}

	// Placeholder for actual event creation logic
	// You would typically insert a new record into your database here

	return res.status(201).send(parseResult.data);
});

const editModerationEvent = z.object({
	reason: z
		.string()
		.trim()
		.min(1, "Reason cannot be empty")
		.max(512, "Reason cannot exceed 512 characters")
		.default("No reason provided"),
	editedBy: z.coerce.number().int().positive(),
});

router.patch("/:eventId", async (req, res) => {
	const { eventId } = req.params;

	const parseResult = editModerationEvent.safeParse(req.body);
	if (!parseResult.success) {
		return res.status(400).send(z.treeifyError(parseResult.error));
	}

	// Placeholder for actual event editing logic
	// You would typically update the record in your database here

	return res.status(200).send({ eventId, ...parseResult.data });
});
