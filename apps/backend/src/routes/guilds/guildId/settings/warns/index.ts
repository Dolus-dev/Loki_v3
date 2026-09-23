import express from "express";
import { z, treeifyError } from "zod";
import { requireAuth } from "../../../../../lib/Middlewares/requireAuth";
import { requireGuildSettingsAccess } from "../../../../../lib/Middlewares/requireGuildSettingsAccess";
import { requireRegisteredGuild } from "../../../../../lib/Middlewares/requireRegisteredGuild";
import { AppDataSource } from "../../../../..";
import { WarnSettings } from "../../../../../models/Moderation/Action Settings/WarnSettings";

export const router = express.Router({ mergeParams: true });

// Retrieve warn settings for a guild (a default row is created on first read)
router.get(
	"/",
	requireAuth,
	requireGuildSettingsAccess("view"),
	requireRegisteredGuild,
	async (req: express.Request<{ guildId: string }>, res) => {
		const { guildId } = req.params;
		try {
			const warnSettingsRepo = AppDataSource.getRepository(WarnSettings);

			await warnSettingsRepo.upsert(
				{
					guildId: guildId,
				},
				{ conflictPaths: ["guildId"], skipUpdateIfNoValuesChanged: true },
			);

			const settings = await warnSettingsRepo.findOneBy({ guildId });

			if (!settings) {
				return res
					.status(500)
					.send({ error: "Failed to retrieve warn settings" });
			}

			return res.status(200).json(settings);
		} catch (error) {
			console.error("Failed to retrieve warn settings:", error);
			return res.status(500).send({ error: "Failed to retrieve warn settings" });
		}
	},
);

// Update warn settings for a guild; all fields must be sent on each update
const patchItems = z.object({
	reasonRequired: z.boolean(),
	evidenceRequired: z.boolean(),
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
		const { reasonRequired, evidenceRequired, enabled } = parseResult.data;

		const warnSettingsRepo = AppDataSource.getRepository(WarnSettings);

		try {
			await warnSettingsRepo.upsert(
				{
					guildId: guildId,
					reasonRequired,
					evidenceRequired,
					enabled,
				},
				{ conflictPaths: ["guildId"], skipUpdateIfNoValuesChanged: true },
			);
			return res.status(204).send();
		} catch (error) {
			console.error("Failed to update warn settings:", error);
			return res.status(500).json({ error: "Failed to update warn settings" });
		}
	},
);
