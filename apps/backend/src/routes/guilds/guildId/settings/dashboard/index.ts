import express from "express";
import { DashboardSettings } from "../../../../../models/DashboardSettings";
import { AppDataSource } from "../../../../..";
import { cacheDel, cacheGet, cacheSet } from "../../../../../lib/cache";
import z, { treeifyError } from "zod";
import { requireAuth } from "../../../../../lib/Middlewares/requireAuth";
import { requireGuildSettingsAccess } from "../../../../../lib/Middlewares/requireGuildSettingsAccess";
import { requireManageGuild } from "../../../../../lib/Middlewares/requireManageGuild";
import { requireRegisteredGuild } from "../../../../../lib/Middlewares/requireRegisteredGuild";
import {
	DASHBOARD_ACCESS_CACHE_TTL_SECONDS,
	DashboardAccessSchema,
	dashboardSettingsCacheKey,
} from "../../../../../lib/guildAccess";
import { Guild } from "../../../../../models/Guild";
import { discordSnowflake } from "../../../../../lib/validation";

export const router = express.Router({ mergeParams: true });

// The Redis-cached settings (see lib/guildAccess.ts) have the same shape this GET route
// returns to the client
const CachedDashboardSettingsSchema = DashboardAccessSchema;

// Retrieve dashboard settings for a guild
router.get(
	"/",
	requireAuth,
	requireGuildSettingsAccess("view"),
	requireRegisteredGuild,
	async (
		req: express.Request<{ guildId: string }>,
		res: express.Response,
	): Promise<express.Response | void> => {
		const { guildId } = req.params;

		const key = dashboardSettingsCacheKey(guildId);
		const value = await cacheGet(key);

		let settings: DashboardSettings | FetchedDashboardSettings | null = null;

		if (value) {
			const cachedSettings = CachedDashboardSettingsSchema.safeParse(
				JSON.parse(value),
			);
			if (cachedSettings.success) {
				console.log("Cache hit for dashboard settings:", guildId);
				return res.status(200).json(cachedSettings.data);
			}
		}

		// The guild is known to exist (requireRegisteredGuild), so this can't create an orphan row
		const dashRepo = AppDataSource.getRepository(DashboardSettings);

		await dashRepo.upsert(
			{ id: guildId },
			{ conflictPaths: ["id"], skipUpdateIfNoValuesChanged: true },
		);

		settings = await dashRepo.findOneBy({ id: guildId });

		if (!settings) {
			return res
				.status(500)
				.send({ error: "Failed to retrieve dashboard settings" });
		}

		const returnedSettings = {
			readAccess: settings.rolesWithDashboardViewAccess,
			editAccess: settings.rolesWithDashboardEditAccess,
		} as FetchedDashboardSettings;

		await cacheSet(
			key,
			JSON.stringify(returnedSettings),
			DASHBOARD_ACCESS_CACHE_TTL_SECONDS,
		);

		return res.status(200).json(returnedSettings);
	},
);

interface FetchedDashboardSettings {
	readAccess: string[];
	editAccess: string[];
}

// Update dashboard settings for a guild (which roles can view/edit the dashboard)
const patchItems = z.object({
	rolesWithDashboardViewAccess: z.array(discordSnowflake),
	rolesWithDashboardEditAccess: z.array(discordSnowflake),
});
// Changing who has dashboard access needs the Manage Server permission in the guild itself;
// having a dashboard "edit" role isn't enough, or a role could grant itself (or anyone) more access
router.patch(
	"/",
	requireAuth,
	requireManageGuild,
	requireRegisteredGuild,
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
					id: guildId,
					rolesWithDashboardViewAccess,
					rolesWithDashboardEditAccess,
				},
				{ conflictPaths: ["id"], skipUpdateIfNoValuesChanged: true },
			);
		} catch (error) {
			console.error("Failed to update database for dashboard settings:", error);
			return res
				.status(500)
				.json({ error: "Failed to update dashboard settings" });
		}

		// Wipe the cached copies now that the database has the new roles; the next request
		// reloads them. Deleting (rather than writing the new value) means concurrent updates
		// can't leave an older value cached. A cache failure doesn't fail the request.
		await Promise.all([
			cacheDel(dashboardSettingsCacheKey(guildId)),
			// The guild overview embeds these settings, so drop its cached copy too
			cacheDel("guild:base:" + guildId),
		]);

		return res.status(204).send();
	},
);
