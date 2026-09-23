import express from "express";
import { requireAuth } from "../../../../../lib/Middlewares/requireAuth";
import { AppDataSource } from "../../../../..";
import { MuteSettings } from "../../../../../models/Moderation/Action Settings/MuteSettings";
import z from "zod";
import { requireGuildSettingsAccess } from "../../../../../lib/Middlewares/requireGuildSettingsAccess";
import { requireRegisteredGuild } from "../../../../../lib/Middlewares/requireRegisteredGuild";
import { parse } from "path";
import { discordSnowflake } from "../../../../../lib/validation";

export const router = express.Router({ mergeParams: true });

// Retrieve mute settings for a guild (a default row is created on first read)
router.get(
	"/",
	requireAuth,
	requireGuildSettingsAccess("view"),
	requireRegisteredGuild,
	async (req: express.Request<{ guildId: string }>, res) => {
		const { guildId } = req.params;
		const muteSettingsRepo = AppDataSource.getRepository(MuteSettings);

		await muteSettingsRepo.upsert(
			{
				guildId: guildId,
			},
			{ conflictPaths: ["guildId"], skipUpdateIfNoValuesChanged: true },
		);

		const settings = await muteSettingsRepo.findOneBy({ guildId });

		if (!settings) {
			return res
				.status(500)
				.send({ error: "Failed to retrieve mute settings" });
		}

		return res.status(200).json(settings);
	},
);

// Update mute settings for a guild; all fields must be sent on each update
const patchItems = z.object({
	reasonRequired: z.boolean(),
	evidenceRequired: z.boolean(),
	defaultMuteDurationSeconds: z.number().int().min(0),
	muteRoleId: discordSnowflake.nullable(),
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
			defaultMuteDurationSeconds,
			muteRoleId,
			enabled,
		} = parseResult.data;

		const muteSettingsRepo = AppDataSource.getRepository(MuteSettings);

		try {
			await muteSettingsRepo.upsert(
				{
					guildId: guildId,
					reasonRequired,
					evidenceRequired,
					defaultMuteDurationSeconds,
					muteRoleId,
					enabled,
				},
				{ conflictPaths: ["guildId"], skipUpdateIfNoValuesChanged: true },
			);
			return res.status(204).send();
		} catch (error) {
			return res.status(500).json({ error: "Failed to update mute settings" });
		}
	},
);
