import express from "express";
import { DashboardSettings } from "../../../../../models/DashboardSettings";
import { AppDataSource, redisClient } from "../../../../..";
import z, { treeifyError } from "zod";
import { requireAuth } from "../../../../../lib/requireAuth - Middleware";
import { Guild } from "../../../../../models/Guild";

export const router = express.Router({ mergeParams: true });

// Retrieve dashboard settings for a guild
router.get(
	"/",
	requireAuth,
	async (req: express.Request<{ guildId: string }>, res) => {
		const { guildId } = req.params;

		const key = "guild:dashboardSettings:" + guildId;
		const value = await redisClient.get(key);

		let settings: DashboardSettings | FetchedDashboardSettings | null = null;

		if (value) {
			settings = JSON.parse(value) as FetchedDashboardSettings;
			console.log("Cache hit for dashboard settings:", guildId);

			return res.status(200).json(settings);
		}

		const guildRepo = AppDataSource.getRepository(Guild);
		const guildExists = await guildRepo.existsBy({ id: guildId });

		if (!guildExists) {
			return res.status(404).json({ error: "Guild not found" });
		}

		const dashRepo = AppDataSource.getRepository(DashboardSettings);

		await dashRepo.upsert(
			{ id: guildId },
			{ conflictPaths: ["id"], skipUpdateIfNoValuesChanged: true }
		);

		settings = await dashRepo.findOneBy({ id: guildId });

		if (!settings) {
			return res.status(500).send("Failed to retrieve dashboard settings");
		}

		console.log(settings);

		const returnedSettings = {
			readAccess: settings.rolesWithDashboardViewAccess,
			editAccess: settings.rolesWithDashboardEditAccess,
		} as FetchedDashboardSettings;

		await redisClient.set(key, JSON.stringify(returnedSettings), {
			EX: 300, // Cache for 5 minutes
		});

		return res.status(200).json(returnedSettings);
	}
);

interface FetchedDashboardSettings {
	readAccess: string[];
	editAccess: string[];
}

// Update dashboard settings for a
const patchItems = z.object({
	rolesWithDashboardViewAccess: z.array(z.string()),
	rolesWithDashboardEditAccess: z.array(z.string()),
});
router.patch(
	"/",
	requireAuth,
	async (req: express.Request<{ guildId: string }>, res) => {
		const { guildId } = req.params;
		const parseResult = patchItems.safeParse(req.body);

		if (!parseResult.success) {
			return res.status(400).json({
				error: "Invalid request body",
				details: treeifyError(parseResult.error),
			});
		}

		const { rolesWithDashboardViewAccess, rolesWithDashboardEditAccess } =
			parseResult.data;

		const dashRepo = AppDataSource.getRepository(DashboardSettings);

		const key = "guild:dashboardSettings:" + guildId;
		try {
			const saves = await Promise.allSettled([
				redisClient.set(
					key,
					JSON.stringify({
						id: guildId,
						rolesWithDashboardViewAccess,
						rolesWithDashboardEditAccess,
					}),
					{
						EX: 300, // Cache for 5 minutes
					}
				),
				await dashRepo.upsert(
					{
						id: guildId,
						rolesWithDashboardViewAccess,
						rolesWithDashboardEditAccess,
					},
					{ conflictPaths: ["id"], skipUpdateIfNoValuesChanged: true }
				),
			]);

			if (saves.every((e) => e.status === "fulfilled")) {
				return res.status(204).send();
			} else {
				if (saves[0].status === "rejected") {
					console.error(
						"Failed to update cache for dashboard settings:",
						saves[0].reason
					);
				}
				if (saves[1].status === "rejected") {
					console.error(
						"Failed to update database for dashboard settings:",
						saves[1].reason
					);
				}
				throw new Error("Failed to update dashboard settings");
			}
		} catch (error) {
			return res
				.status(500)
				.json({ error: "Failed to update dashboard settings" });
		}
	}
);
