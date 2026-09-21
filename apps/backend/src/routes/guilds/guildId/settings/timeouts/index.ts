import express from "express";
import { z } from "zod";
import { requireAuth } from "../../../../../lib/Middlewares/requireAuth";
import { requireGuildSettingsAccess } from "../../../../../lib/Middlewares/requireGuildSettingsAccess";
import { requireRegisteredGuild } from "../../../../../lib/Middlewares/requireRegisteredGuild";
import { AppDataSource } from "../../../../..";
import { TimeoutSettings } from "../../../../../models/Moderation/Action Settings/TimeoutSettings";
import { time } from "console";

export const router = express.Router({ mergeParams: true });

// Retrieve timeout settings for a guild (A default row is created on first read)
router.get(
	"/",
	requireAuth,
	requireGuildSettingsAccess("view"),
	requireRegisteredGuild,
	async (req: express.Request<{ guildId: string }>, res) => {
		const { guildId } = req.params;
		const timeoutSettingsRepo = AppDataSource.getRepository(TimeoutSettings);

		await timeoutSettingsRepo.upsert(
			{
				guildId: guildId,
			},
			{ conflictPaths: ["guildId"], skipUpdateIfNoValuesChanged: true },
		);
		const settings = await timeoutSettingsRepo.findOneBy({ guildId });

		if (!settings) {
			return res
				.status(500)
				.send({ error: "Failed to retrieve timeout settings" });
		}

		return res.status(200).json(settings);
	},
);

// Update timeout settings for a guild; all fields must be sent on each update
const patchItems = z.object({
	reasonRequired: z.boolean(),
	evidenceRequired: z.boolean(),
	defaultTimeoutDurationSeconds: z.number().int().min(0),
	enabled: z.boolean(),
});

router.patch(
	"/",
	requireAuth,
	requireGuildSettingsAccess("edit"),
	requireRegisteredGuild,
	async (req: express.Request<{ guildId: string }>, res) => {
		const { guildId } = req.params;
		const parseResult = patchItems.safeParse(req.body);
		if (!parseResult.success) {
			return res
				.status(400)
				.json({ error: "Invalid request body", details: parseResult.error });
		}

		const {
			reasonRequired,
			evidenceRequired,
			defaultTimeoutDurationSeconds,
			enabled,
		} = parseResult.data;

		const timeoutSettingsRepo = AppDataSource.getRepository(TimeoutSettings);

		try {
			await timeoutSettingsRepo.upsert(
				{
					guildId: guildId,
					reasonRequired,
					evidenceRequired,
					defaultTimeoutDurationSeconds,
					enabled,
				},
				{ conflictPaths: ["guildId"], skipUpdateIfNoValuesChanged: true },
			);
			return res.status(204).send();
		} catch (error) {
			return res
				.status(500)
				.json({ error: "Failed to update timeout settings", details: error });
		}
	},
);
