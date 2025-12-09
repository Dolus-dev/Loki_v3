import express from "express";
import { AppDataSource } from "../../..";
import { Guild } from "../../../models/Guild";
import { requireAuth } from "../../../lib/requireAuth - Middleware";
import { APIGuild } from "discord.js";
import { fetchDiscordGuild } from "../../../lib/discordInteractions";
import { ModerationEvents } from "../../../models/Moderation/ModerationEvents";
import { MoreThan } from "typeorm";
import { router as settingsRouter } from "./settings/index";
import { router as moderationRouter } from "./moderation/index";

export const router = express.Router({ mergeParams: true });

router.use("/settings", settingsRouter);
router.use("/moderation", moderationRouter);

router.get(
	"/",
	requireAuth,
	async (req: express.Request<{ guildId: string }>, res) => {
		const { guildId } = req.params;

		let guild: APIGuild | null = null;

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

		return res.status(200).send({
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
		});
	}
);
