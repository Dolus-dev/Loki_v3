import express from "express";
import { requireAuth } from "../../../../../lib/requireAuth - Middleware";
import { AppDataSource } from "../../../../..";
import { BanSettings } from "../../../../../models/Moderation/Action Settings/BanSettings";
import z from "zod";

export const router = express.Router({ mergeParams: true });

//Retrieve ban settings for a guild

router.get(
	"/",
	requireAuth,
	async (req: express.Request<{ guildId: string }>, res) => {
		const { guildId } = req.params;
		const banSettingsRepo = AppDataSource.getRepository(BanSettings);

		await banSettingsRepo.upsert(
			{
				guildId: guildId,
			},
			{ conflictPaths: ["guildId"], skipUpdateIfNoValuesChanged: true }
		);

		const settings = await banSettingsRepo.findOneBy({ guildId });

		if (!settings) {
			return res.status(500).send("Failed to retrieve ban settings");
		}

		return res.status(200).json(settings);
	}
);

const patchItems = z.object({
	reasonRequired: z.boolean(),
	evidenceRequired: z.boolean(),
	defaultBanDurationSeconds: z.number().min(0),
});

router.patch(
	"/",
	requireAuth,
	async (req: express.Request<{ guildId: string }>, res) => {
		const { guildId } = req.params;
		const parseResult = patchItems.safeParse(req.body);
		if (!parseResult.success) {
			return res
				.status(400)
				.json({ error: "Invalid request body", details: parseResult.error });
		}
		const { reasonRequired, evidenceRequired, defaultBanDurationSeconds } =
			parseResult.data;

		const banSettingsRepo = AppDataSource.getRepository(BanSettings);

		try {
			await banSettingsRepo.upsert(
				{
					guildId: guildId,
					reasonRequired,
					evidenceRequired,
					defaultBanDurationSeconds,
				},
				{ conflictPaths: ["guildId"], skipUpdateIfNoValuesChanged: true }
			);
			return res.status(204).send();
		} catch (error) {
			return res.status(500).json({ error: "Failed to update ban settings" });
		}
	}
);
