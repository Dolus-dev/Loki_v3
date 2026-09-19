import express from "express";
import { AppDataSource } from "../../..";
import { cacheGet, cacheSet } from "../../../lib/cache";
import { Guild } from "../../../models/Guild";
import { requireAuth } from "../../../lib/Middlewares/requireAuth";
import { requireGuildSettingsAccess } from "../../../lib/Middlewares/requireGuildSettingsAccess";
import { APIGuild } from "discord.js";
import { fetchDiscordGuild } from "../../../lib/discordInteractions";
import { DiscordError } from "../../../lib/Errors/APIErrorResponse";
import { ModerationEvents } from "../../../models/Moderation/ModerationEvents";
import { MoreThan } from "typeorm";
import { router as settingsRouter } from "./settings/index";
import { router as moderationRouter } from "./moderation/index";
import { DashboardSettings } from "../../../models/DashboardSettings";
import { router as rolesRouter } from "./roles/index";
import { router as channelsRouter } from "./channels/index";
import { z } from "zod";

export const router = express.Router({ mergeParams: true });

const CachedGuildObjectSchema = z.object({
	guild: z.object({
		id: z.string(),
		name: z.string(),
		icon: z.string().nullable(),
		ownerId: z.string(),
		memberCount: z.number().nullable(),
	}),
	settings: z.object({
		dashboard: z.any().nullable(),
	}),
	statistics: z.object({
		totalModerationEvents: z.number(),
		recentModerationEvents: z.number(),
	}),
});

// Sub-routers are mounted before the "/" handler below; `mergeParams` gives them `guildId`
router.use("/settings", settingsRouter);
router.use("/moderation", moderationRouter);
router.use("/roles", rolesRouter);
router.use("/channels", channelsRouter);

/**
 * Returns an overview of a guild: its Discord info, dashboard settings and
 * moderation event counts (total and last 7 days). The response is cached in
 * Redis for 5 minutes. Also creates the guild's database row if it is missing.
 */
router.get(
	"/",
	requireAuth,
	requireGuildSettingsAccess("view"),
	async (
		req: express.Request<{ guildId: string }>,
		res: express.Response,
	): Promise<express.Response | void> => {
		const { guildId } = req.params;

		const key = "guild:base:" + guildId;

		const value = await cacheGet(key);

		if (value) {
			const cachedGuild = CachedGuildObjectSchema.safeParse(JSON.parse(value));
			if (cachedGuild.success) {
				console.log("Cache hit for guild:", guildId);

				return res.status(200).send(cachedGuild.data);
			}
		}
		try {
			const discordGuild: APIGuild = await fetchDiscordGuild(guildId);
			const guildRepo = AppDataSource.getRepository(Guild);

			let dbGuild = await guildRepo.findOne({
				where: { id: guildId },
				relations: ["dashboardSettings"],
			});

			if (!dbGuild) {
				dbGuild = guildRepo.create({
					id: discordGuild.id,
					name: discordGuild.name,
					iconHash: discordGuild.icon ?? null,
				});
				await guildRepo.save(dbGuild);
			}

			const moderationRepo = AppDataSource.getRepository(ModerationEvents);

			const [totalEvents, recentEvents] = await Promise.all([
				moderationRepo.count({ where: { guild: { id: guildId } } }),
				moderationRepo.count({
					where: {
						guild: { id: guildId },
						createdAt: MoreThan(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)), // Last 7 days
					},
				}),
			]).catch(() => [0, 0]);

			const guildObject: GuildObject = {
				guild: {
					id: discordGuild.id,
					name: discordGuild.name,
					icon: discordGuild.icon
						? `https://cdn.discordapp.com/icons/${discordGuild.id}/${discordGuild.icon}.png`
						: null,
					ownerId: discordGuild.owner_id,
					memberCount: discordGuild.approximate_member_count || null,
				},
				settings: {
					dashboard: dbGuild.dashboardSettings || null,
				},
				statistics: {
					totalModerationEvents: totalEvents,
					recentModerationEvents: recentEvents,
				},
			};

			await cacheSet(key, JSON.stringify(guildObject), 300); // Cache for 5 minutes

			return res.status(200).send(guildObject);
		} catch (error) {
			// Only "Discord doesn't know this guild / the bot can't see it" means not found;
			// anything else (database, Discord outage) is a real error, left for the error handler
			if (
				error instanceof DiscordError &&
				(error.statusCode === 404 || error.statusCode === 403)
			) {
				return res.status(404).send({ error: "Guild not found" });
			}
			throw error;
		}
	},
);

interface GuildObject {
	guild: {
		id: string;
		name: string;
		icon: string | null;
		ownerId: string;
		memberCount: number | null;
	};
	settings: {
		dashboard: DashboardSettings | null;
	};
	statistics: {
		totalModerationEvents: number;
		recentModerationEvents: number;
	};
}
