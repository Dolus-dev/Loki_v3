import express from "express";
import { requireAuth } from "../../../../lib/Middlewares/requireAuth";
import {
	fetchCurrentGuildMember,
	fetchCurrentUserGuilds,
} from "../../../../lib/discordInteractions";
import { PermissionsBitField } from "discord.js";
import { AppDataSource } from "../../../..";
import { cacheGet, cacheSet } from "../../../../lib/cache";
import { In } from "typeorm";
import { Guild } from "../../../../models/Guild";
import { withUserAccessToken } from "../../../../lib/userTokens";

export const router = express.Router();

type CurrentUserGuild = Awaited<ReturnType<typeof fetchCurrentUserGuilds>>[number];
type CurrentGuildMember = Awaited<ReturnType<typeof fetchCurrentGuildMember>>;

const USER_GUILD_CACHE_TTL_SECONDS = 300;
const GUILD_MEMBER_CACHE_TTL_SECONDS = 300;

/**
 * Lists the guilds the current user can open in the dashboard.
 *
 * A guild is accessible if the user has Manage Server there, or holds a role that
 * the guild's dashboard settings grant view/edit access to. Results (and the
 * per-guild member lookups) are cached in Redis for 5 minutes, so role or
 * permission changes can take that long to show up.
 */
router.get("/", requireAuth, async (req, res) => {
	const accessToken = req.session.accessToken;
	if (!accessToken) {
		return res.status(401).send({ error: "Unauthorized" });
	}

	const userGuildCacheKey = "user:guilds:" + req.session.userId;
	const cachedGuilds = await cacheGet(userGuildCacheKey);

	if (cachedGuilds) {
		console.log("Cache hit for user guilds:", req.session.userId);
		return res.status(200).send(JSON.parse(cachedGuilds) as UserGuilds[]);
	}

	// Refreshes the user's Discord token automatically if it has expired
	const userGuilds = await withUserAccessToken(req, fetchCurrentUserGuilds);
	const userGuildIds = userGuilds.map((guild) => guild.id);
	const guildRepository = AppDataSource.getRepository(Guild);
	const botGuilds = await guildRepository.find({
		where: { id: In(userGuildIds) },
		relations: ["dashboardSettings"],
	});

	const botGuildMap = new Map(botGuilds.map((guild) => [guild.id, guild]));

	// Users without Manage Server need their roles checked, but only in guilds the bot is in
	const guildsNeedingMemberCheck =userGuilds.filter((guild) => {
		const permissions = new PermissionsBitField(BigInt(guild.permissions));
		return !permissions.has(PermissionsBitField.Flags.ManageGuild) && botGuildMap.has(guild.id);
	});

	const memberCacheEntries = await Promise.allSettled(
		guildsNeedingMemberCheck.map(async (guild) => {
			const memberCacheKey = `user:guild-member:${req.session.userId}:${guild.id}`;
			const cachedMember = await cacheGet(memberCacheKey);

			if (cachedMember) {
				return [guild.id, JSON.parse(cachedMember) as CurrentGuildMember] as const;
			}

			const member = await withUserAccessToken(req, (accessToken) =>
				fetchCurrentGuildMember(accessToken, guild.id),
			);
			await cacheSet(
				memberCacheKey,
				JSON.stringify(member),
				GUILD_MEMBER_CACHE_TTL_SECONDS,
			);

			return [guild.id, member] as const;
		}),
	);

	// A guild stays null when its member lookup failed, which hides it from the user
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
		setUp: botGuildMap.has(guild.id), // Whether the bot has been added to the guild
	}));

	await cacheSet(
		userGuildCacheKey,
		JSON.stringify(simplifiedGuilds),
		USER_GUILD_CACHE_TTL_SECONDS,
	);

	return res.status(200).send(simplifiedGuilds);
});

interface UserGuilds {
	id: string;
	name: string;
	icon: string | null;
	setUp: boolean;
}
