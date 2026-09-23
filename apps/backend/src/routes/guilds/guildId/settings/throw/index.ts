import express from "express";
import { z, treeifyError } from "zod";
import { requireAuth } from "../../../../../lib/Middlewares/requireAuth";
import { requireGuildSettingsAccess } from "../../../../../lib/Middlewares/requireGuildSettingsAccess";
import { requireRegisteredGuild } from "../../../../../lib/Middlewares/requireRegisteredGuild";
import { AppDataSource } from "../../../../..";
import { ThrowSettings } from "../../../../../models/Fun/Throw";
import { durationSeconds, snowflakeList } from "../../../../../lib/validation";

export const router = express.Router({ mergeParams: true });

// Retrieve throw settings for a guild (a default row is created on first read)
router.get(
	"/",
	requireAuth,
	requireGuildSettingsAccess("view"),
	requireRegisteredGuild,
	async (req: express.Request<{ guildId: string }>, res) => {
		const { guildId } = req.params;
		try {
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
		} catch (error) {
			console.error("Failed to retrieve throw settings:", error);
			return res.status(500).send({ error: "Failed to retrieve throw settings" });
		}
	},
);

// Update throw settings for a guild; all fields must be sent on each update
const patchItems = z.object({
	customItemsEnabled: z.boolean(),
	customItemsOnly: z.boolean(),
	customItems: z
		.array(z.string().trim().min(1).max(200))
		.max(100)
		.transform((items) => [...new Set(items)]),
	cooldownSeconds: durationSeconds,
	redirectEnabled: z.boolean(),
	redirectOptInRoleIds: snowflakeList(250),
	whitelistedChannels: snowflakeList(500),
	blacklistedChannels: snowflakeList(500),
}).refine(
	(data) =>
		!data.whitelistedChannels.some((id) => data.blacklistedChannels.includes(id)),
	{
		message: "A channel cannot be both whitelisted and blacklisted",
		path: ["blacklistedChannels"],
	},
);

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
			console.error("Failed to update throw settings:", error);
			return res.status(500).json({ error: "Failed to update throw settings" });
		}
	},
);
