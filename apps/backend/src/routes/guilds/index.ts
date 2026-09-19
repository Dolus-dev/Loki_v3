import express from "express";
import { router as GuildsRouter } from "./guildId/index";
import z from "zod";
import { requireAuth } from "../../lib/Middlewares/requireAuth";
import { requireBot } from "../../lib/Middlewares/requireBot";
import { AppDataSource } from "../..";
import { Guild } from "../../models/Guild";
import { discordSnowflake } from "../../lib/validation";
export const router = express.Router();

// Reject malformed guild IDs up front, for every route under /:guildId
router.param("guildId", (_req, res, next, guildId: string) => {
	if (!discordSnowflake.safeParse(guildId).success) {
		void res.status(400).send({ error: "Invalid guildId format" });
		return;
	}
	next();
});

router.use("/:guildId", GuildsRouter);

const newGuildSchema = z.object({
	id: discordSnowflake,
	name: z.string().min(1).max(100), // Discord's guild name limit
	iconHash: z.string().max(64).nullable().optional(),
});
// Registers a guild (or updates its name/icon). Called by the bot when it joins a guild.
// Bot-only: dashboard users must not be able to rename guild records.
router.post("/", requireAuth, requireBot, async (req, res) => {
	console.log(`Bot request received.`);
	const parseResult = newGuildSchema.safeParse(req.body);
	if (!parseResult.success) {
		return res
			.status(400)
			.send({ error: "Invalid guild data", details: parseResult.error });
	}

	const { id, name, iconHash } = parseResult.data;
	const guildRepository = AppDataSource.getRepository(Guild);

	await guildRepository.upsert(
		{
			id,
			name,
			iconHash: iconHash ?? null,
		},
		{
			conflictPaths: ["id"],
			skipUpdateIfNoValuesChanged: true,
		},
	);

	return res.status(201).send({ success: true });
});
