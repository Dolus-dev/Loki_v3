import express from "express";
import { DashboardSettings } from "../../../../../models/DashboardSettings";
import { AppDataSource } from "../../../../..";
import z, { treeifyError } from "zod";
import { requireAuth } from "../../../../../lib/requireAuth - Middleware";

export const router = express.Router({ mergeParams: true });

// Retrieve dashboard settings for a guild
router.get(
	"/",
	requireAuth,
	async (req: express.Request<{ guildId: string }>, res) => {
		const { guildId } = req.params;

		const dashRepo = AppDataSource.getRepository(DashboardSettings);

		await dashRepo.upsert(
			{
				guildId: guildId,
			},
			{ conflictPaths: ["guildId"], skipUpdateIfNoValuesChanged: true }
		);

		const settings = await dashRepo.findOneBy({ guildId });

		if (!settings) {
			return res.status(500).send("Failed to retrieve dashboard settings");
		}

		return res.status(200).json(settings);
	}
);

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

		try {
			await dashRepo.upsert(
				{
					guildId: guildId,
					rolesWithDashboardViewAccess,
					rolesWithDashboardEditAccess,
				},
				{ conflictPaths: ["guildId"], skipUpdateIfNoValuesChanged: true }
			);
			return res.status(204).send();
		} catch (error) {
			return res
				.status(500)
				.json({ error: "Failed to update dashboard settings" });
		}
	}
);
