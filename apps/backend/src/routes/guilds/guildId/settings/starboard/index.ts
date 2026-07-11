import express from "express";
import { requireAuth } from "../../../../../lib/Middlewares/requireAuth";
import { StarboardSettings } from "../../../../../models/Fun/Starboard";
import { AppDataSource } from "../../../../..";
import z from "zod";
import { requireGuildSettingsAccess } from "../../../../../lib/Middlewares/requireGuildSettingsAccess";

export const router = express.Router({ mergeParams: true });

// Retrieve starboard settings for a guild
router.get(
	"/",
	requireAuth,
	requireGuildSettingsAccess("view"),
	async (req: express.Request<{ guildId: string }>, res) => {
		const { guildId } = req.params;

		const starboardSettingsRepo =
			AppDataSource.getRepository(StarboardSettings);
		await starboardSettingsRepo.upsert(
			{
				guildId: guildId,
			},
			{ conflictPaths: ["guildId"], skipUpdateIfNoValuesChanged: true },
		);

		const settings = await starboardSettingsRepo.findOneBy({ guildId });

		if (!settings) {
			return res
				.status(500)
				.send({ error: "Failed to retrieve starboard settings" });
		}

		return res.status(200).json(settings);
	},
);

const patchItems = z.object({
	enabled: z.boolean(),
	starboardChannelId: z.string(),
	starThreshold: z.number().min(1),
	reactionEmoji: z.string(),
});

// Update starboard settings for a guild
router.patch(
	"/",
	requireAuth,
	requireGuildSettingsAccess("edit"),
	async (req: express.Request<{ guildId: string }>, res) => {
		const { guildId } = req.params;

		const parseResult = patchItems.safeParse(req.body);

		if (!parseResult.success) {
			return res
				.status(400)
				.json({ error: "Invalid request body", details: parseResult.error });
		}

		const { enabled, starboardChannelId, starThreshold, reactionEmoji } =
			parseResult.data;

		const starboardSettingsRepo =
			AppDataSource.getRepository(StarboardSettings);

		try {
			await starboardSettingsRepo.upsert(
				{
					guildId: guildId,
					enabled,
					starboardChannelId,
					reactionThreshold: starThreshold,
					reactionEmoji,
				},
				{ conflictPaths: ["guildId"], skipUpdateIfNoValuesChanged: true },
			);
			return res.status(204).send();
		} catch (error) {
			return res
				.status(500)
				.json({ error: "Failed to update starboard settings" });
		}
	},
);
