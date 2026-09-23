import express from "express";
import { z } from "zod";
import { requireAuth } from "../../../../../lib/Middlewares/requireAuth";
import { requireGuildSettingsAccess } from "../../../../../lib/Middlewares/requireGuildSettingsAccess";
import { requireRegisteredGuild } from "../../../../../lib/Middlewares/requireRegisteredGuild";
import { AppDataSource } from "../../../../..";
import { ThrowSettings } from "../../../../../models/Fun/Throw";
import { discordSnowflake } from "../../../../../lib/validation";

export const router = express.Router({ mergeParams: true });

// Retrieve throw settings for a guild (a default row is created on first read)
router.get(
	"/",
	requireAuth,
	requireGuildSettingsAccess("view"),
	requireRegisteredGuild,
	async (req: express.Request<{ guildId: string }>, res) => {
		const { guildId } = req.params;
		const throwSettingsRepo = AppDataSource.getRepository(ThrowSettings);

		await throwSettingsRepo.upsert(
			{
				guildId: guildId,
			},
			{ conflictPaths: ["guildId"], skipUpdateIfNoValuesChanged: true },
		);

		const settings = await throwSettingsRepo.findOneBy({ guildId });

		if (!settings) {
			return res
				.status(500)
				.send({ error: "Failed to retrieve throw settings" });
		}

		return res.status(200).json(settings);
	},
);

// Update throw settings for a guild; all fields must be sent on each update
const patchItems = z.object({
	customItemsEnabled: z.boolean(),
	customItemsOnly: z.boolean(),
	customItems: z.array(z.string()),
	cooldownSeconds: z.number().int().min(0),
	redirectEnabled: z.boolean(),
	redirectOptInRoleIds: z.array(discordSnowflake),
	whitelistedChannels: z.array(discordSnowflake),
	blacklistedChannels: z.array(discordSnowflake),
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

		const { ...patchData } = parseResult.data;

		const throwSettingsRepo = AppDataSource.getRepository(ThrowSettings);

		try {
			await throwSettingsRepo.upsert(
				{
					guildId: guildId,
					...patchData,
				},
				{ conflictPaths: ["guildId"], skipUpdateIfNoValuesChanged: true },
			);
			return res.status(204).send();
		} catch (error) {
			return res
				.status(500)
				.json({ error: "Failed to update throw settings", details: error });
		}
	},
);
