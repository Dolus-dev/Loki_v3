import express from "express";
import { requireAuth } from "../../../../../lib/Middlewares/requireAuth";
import { AppDataSource } from "../../../../..";
import { BanSettings } from "../../../../../models/Moderation/Action Settings/BanSettings";
import z, { treeifyError } from "zod";
import { durationSeconds } from "../../../../../lib/validation";
import { requireGuildSettingsAccess } from "../../../../../lib/Middlewares/requireGuildSettingsAccess";
import { requireRegisteredGuild } from "../../../../../lib/Middlewares/requireRegisteredGuild";

export const router = express.Router({ mergeParams: true });

// Retrieve ban settings for a guild (a default row is created on first read)
router.get(
	"/",
	requireAuth,
	requireGuildSettingsAccess("view"),
	requireRegisteredGuild,
	async (req: express.Request<{ guildId: string }>, res) => {
		const { guildId } = req.params;
		try {
			const banSettingsRepo = AppDataSource.getRepository(BanSettings);

			await banSettingsRepo.upsert(
				{
					guildId: guildId,
				},
				{ conflictPaths: ["guildId"], skipUpdateIfNoValuesChanged: true },
			);

			const settings = await banSettingsRepo.findOneBy({ guildId });

			if (!settings) {
				return res.status(500).send({ error: "Failed to retrieve ban settings" });
			}

			return res.status(200).json(settings);
		} catch (error) {
			console.error("Failed to retrieve ban settings:", error);
			return res.status(500).send({ error: "Failed to retrieve ban settings" });
		}
	},
);

// Update ban settings for a guild; all fields must be sent on each update
const patchItems = z.object({
	reasonRequired: z.boolean(),
	evidenceRequired: z.boolean(),
	defaultBanDurationSeconds: durationSeconds,
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
				.json({ error: "Invalid request body", details: treeifyError(parseResult.error) });
		}
		const {
			reasonRequired,
			evidenceRequired,
			defaultBanDurationSeconds,
			enabled,
		} = parseResult.data;

		const banSettingsRepo = AppDataSource.getRepository(BanSettings);

		try {
			await banSettingsRepo.upsert(
				{
					guildId: guildId,
					reasonRequired,
					evidenceRequired,
					defaultBanDurationSeconds,
					enabled,
				},
				{ conflictPaths: ["guildId"], skipUpdateIfNoValuesChanged: true },
			);
			return res.status(204).send();
		} catch (error) {
			console.error("Failed to update ban settings:", error);
			return res.status(500).json({ error: "Failed to update ban settings" });
		}
	},
);
