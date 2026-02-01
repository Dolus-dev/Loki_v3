import express from "express";
import { requireAuth } from "../../../../lib/requireAuth - Middleware";
import {
	fetchCurrentGuildMember,
	fetchCurrentUserGuilds,
} from "../../../../lib/discordInteractions";
import { APIGuild, PermissionsBitField } from "discord.js";
import { AppDataSource, redisClient } from "../../../..";
import { In } from "typeorm";
import { Guild } from "../../../../models/Guild";
import { APIGuildMember } from "discord.js";

export const router = express.Router();

router.get("/", requireAuth, async (req, res) => {
	// Logic to get guilds for the authenticated user

	const user = req.session.accessToken!;

	const key = "user:guilds:" + req.session.userId;
	const value = await redisClient.get(key);
	let guilds: APIGuild[] | UserGuilds[] | null = null;

	if (value) {
		guilds = JSON.parse(value) as UserGuilds[];
		console.log("Cache hit for user guilds:", req.session.userId);

		return res.status(200).send(guilds);
	}

	guilds = await fetchCurrentUserGuilds(user);
	const userGuildIds = guilds.map((g) => g.id);
	const guildRepository = AppDataSource.getRepository(Guild);
	const botGuilds = await guildRepository.find({
		where: { id: In(userGuildIds) },
		relations: ["dashboardSettings"],
	});

	const botGuildMap = new Map(botGuilds.map((g) => [g.id, g]));

	const memberObjects = await Promise.allSettled(
		botGuilds.map((guild) => fetchCurrentGuildMember(user, guild.id))
	);

	const guildMemberMap = new Map<string, APIGuildMember | null>(
		botGuilds.map((g, index) =>
			memberObjects[index].status === "fulfilled"
				? [g.id, memberObjects[index].value]
				: [g.id, null]
		)
	);

	const accessibleGuilds = guilds.filter((guild) => {
		const permissions = new PermissionsBitField(
			BigInt(guild.permissions as string)
		);

		if (permissions.has(PermissionsBitField.Flags.ManageGuild)) return true;

		const member = guildMemberMap.get(guild.id);
		const guildFromBot = botGuildMap.get(guild.id);
		if (!member || !guildFromBot?.dashboardSettings) return false;

		const viewRoles =
			guildFromBot?.dashboardSettings?.rolesWithDashboardViewAccess ?? [];
		const editRoles =
			guildFromBot?.dashboardSettings?.rolesWithDashboardEditAccess ?? [];

		const allowedRoles = new Set([...viewRoles, ...editRoles]);
		const hasAccess = member.roles.some((roleId) => allowedRoles.has(roleId));
		return hasAccess;
	});

	const simplifiedGuilds = accessibleGuilds.map((guild) => ({
		id: guild.id,
		name: guild.name,
		icon: guild.icon ?? null,
		setUp: botGuildMap.has(guild.id),
	}));

	await redisClient.set(key, JSON.stringify(simplifiedGuilds), {
		EX: 300, // Cache for 5 minutes
	});

	return res.status(200).send(simplifiedGuilds);
});

interface UserGuilds {
	id: string;
	name: string;
	icon: string | null;
	setUp: boolean;
}
