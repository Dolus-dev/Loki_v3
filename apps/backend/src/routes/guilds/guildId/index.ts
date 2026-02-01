import express from "express";
import { AppDataSource, redisClient } from "../../..";
import { Guild } from "../../../models/Guild";
import { requireAuth } from "../../../lib/requireAuth - Middleware";
import { APIGuild } from "discord.js";
import { fetchDiscordGuild } from "../../../lib/discordInteractions";
import { ModerationEvents } from "../../../models/Moderation/ModerationEvents";
import { MoreThan } from "typeorm";
import { router as settingsRouter } from "./settings/index";
import { router as moderationRouter } from "./moderation/index";
import { DashboardSettings } from "../../../models/DashboardSettings";
import { router as rolesRouter } from "./roles/index";
import { router as channelsRouter } from "./channels/index";

export const router = express.Router({ mergeParams: true });

router.use("/settings", settingsRouter);
router.use("/moderation", moderationRouter);
router.use("/roles", rolesRouter);
router.use("/channels", channelsRouter);

router.get(
	"/",
	requireAuth,
	async (req: express.Request<{ guildId: string }>, res) => {
		const { guildId } = req.params;

		let guild: APIGuild | GuildObject | null = null;

		const key = "guild:base:" + guildId;

		const value = await redisClient.get(key);

		if (value) {
			guild = JSON.parse(value) as GuildObject;
			console.log("Cache hit for guild:", guildId);

			return res.status(200).send({
				...guild,
			});
		}
		try {
			guild = await fetchDiscordGuild(guildId);
		} catch (error) {
			return res.status(404).send("Guild not found");
		}

		const guildRepo = AppDataSource.getRepository(Guild);

		let dbGuild = await guildRepo.findOne({
			where: { id: guildId },
			relations: ["dashboardSettings"],
		});

		if (!dbGuild) {
			dbGuild = guildRepo.create({
				id: guild.id,
				name: guild.name,
				iconHash: guild.icon_hash || null,
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

		const guildObject = {
			guild: {
				id: guild.id,
				name: guild.name,
				icon: guild.icon_hash
					? `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon_hash}.png`
					: null,
				ownerId: guild.owner_id,
				memberCount: guild.approximate_member_count || null,
			},
			settings: {
				dashboard: dbGuild.dashboardSettings || null,
			},
			statistics: {
				totalModerationEvents: totalEvents,
				recentModerationEvents: recentEvents,
			},
		};

		await redisClient.set(key, JSON.stringify(guildObject), {
			EX: 300, // Cache for 5 minutes
		});

		return res.status(200).send(guildObject);
	}
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
