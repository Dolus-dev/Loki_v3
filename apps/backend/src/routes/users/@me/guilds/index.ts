import express from "express";
import { requireAuth } from "../../../../lib/Middlewares/requireAuth";
import {
	fetchCurrentGuildMember,
	fetchCurrentUserGuilds,
} from "../../../../lib/discordInteractions";
import { PermissionsBitField } from "discord.js";
import { AppDataSource, redisClient } from "../../../..";
import { In } from "typeorm";
import { Guild } from "../../../../models/Guild";

export const router = express.Router();

type CurrentUserGuild = Awaited<ReturnType<typeof fetchCurrentUserGuilds>>[number];
type CurrentGuildMember = Awaited<ReturnType<typeof fetchCurrentGuildMember>>;

const USER_GUILD_CACHE_TTL_SECONDS = 300;
const GUILD_MEMBER_CACHE_TTL_SECONDS = 300;

router.get("/", requireAuth, async (req, res) => {
	const accessToken = req.session.accessToken;
	if (!accessToken) {
		return res.status(401).send({ error: "Unauthorized" });
	}

	const userGuildCacheKey = "user:guilds:" + req.session.userId;
	const cachedGuilds = await redisClient.get(userGuildCacheKey);

	if (cachedGuilds) {
		console.log("Cache hit for user guilds:", req.session.userId);
		return res.status(200).send(JSON.parse(cachedGuilds) as UserGuilds[]);
	}

	const userGuilds = await fetchCurrentUserGuilds(accessToken);
	const userGuildIds = userGuilds.map((guild) => guild.id);
	const guildRepository = AppDataSource.getRepository(Guild);
	const botGuilds = await guildRepository.find({
		where: { id: In(userGuildIds) },
		relations: ["dashboardSettings"],
	});

	const botGuildMap = new Map(botGuilds.map((guild) => [guild.id, guild]));

	const guildsNeedingMemberCheck = userGuilds.filter((guild) => {
		const permissions = new PermissionsBitField(BigInt(guild.permissions));
		return !permissions.has(PermissionsBitField.Flags.ManageGuild) && botGuildMap.has(guild.id);
	});

	const memberCacheEntries = await Promise.allSettled(
		guildsNeedingMemberCheck.map(async (guild) => {
			const memberCacheKey = `user:guild-member:${req.session.userId}:${guild.id}`;
			const cachedMember = await redisClient.get(memberCacheKey);

			if (cachedMember) {
				return [guild.id, JSON.parse(cachedMember) as CurrentGuildMember] as const;
			}

			const member = await fetchCurrentGuildMember(accessToken, guild.id);
			await redisClient.set(memberCacheKey, JSON.stringify(member), {
				EX: GUILD_MEMBER_CACHE_TTL_SECONDS,
			});

			return [guild.id, member] as const;
		}),
	);

	const guildMemberMap = new Map<string, CurrentGuildMember | null>();
	for (const guild of guildsNeedingMemberCheck) {
		guildMemberMap.set(guild.id, null);
	}
	for (const result of memberCacheEntries) {
		if (result.status === "fulfilled") {
			const [guildId, member] = result.value;
			guildMemberMap.set(guildId, member);
		}
	}

	const accessibleGuilds = userGuilds.filter((guild) => {
		const permissions = new PermissionsBitField(BigInt(guild.permissions));
		if (permissions.has(PermissionsBitField.Flags.ManageGuild)) {
			return true;
		}

		const guildFromBot = botGuildMap.get(guild.id);
		const member = guildMemberMap.get(guild.id);
		if (!guildFromBot?.dashboardSettings || !member) {
			return false;
		}

		const allowedRoles = new Set([
			...guildFromBot.dashboardSettings.rolesWithDashboardViewAccess,
			...guildFromBot.dashboardSettings.rolesWithDashboardEditAccess,
		]);

		return member.roles.some((roleId) => allowedRoles.has(roleId));
	});

	const simplifiedGuilds = accessibleGuilds.map((guild) => ({
		id: guild.id,
		name: guild.name,
		icon: guild.icon ?? null,
		setUp: botGuildMap.has(guild.id),
	}));

	await redisClient.set(userGuildCacheKey, JSON.stringify(simplifiedGuilds), {
		EX: USER_GUILD_CACHE_TTL_SECONDS,
	});

	return res.status(200).send(simplifiedGuilds);
});

interface UserGuilds {
	id: string;
	name: string;
	icon: string | null;
	setUp: boolean;
}
