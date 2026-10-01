import express from "express";
import { requireAuth } from "../../../../lib/Middlewares/requireAuth";
import { PermissionsBitField } from "discord.js";
import { AppDataSource } from "../../../..";
import { In } from "typeorm";
import { Guild } from "../../../../models/Guild";
import {
	getUserGuilds,
	resolveGuildAccess,
	type UserGuild,
} from "../../../../lib/guildAccess";

export const router = express.Router();

/**
 * Lists the guilds the current user can open in the dashboard.
 *
 * - Guilds where the user has Manage Server are always listed. `setUp` says whether the
 *   bot is in them yet (if not, the dashboard offers to add it).
 * - Other guilds are listed only if the bot is in them and `resolveGuildAccess` grants at
 *   least view access, the same rule every settings route enforces. A guild the user
 *   can't view is never revealed.
 *
 * The filtered list itself is not cached, so a change to a guild's dashboard roles shows up
 * on the next request. The Discord lookups underneath are cached for a minute (see
 * lib/guildAccess.ts), so a role change made in Discord can take that long.
 */
router.get("/", requireAuth, async (req, res) => {
	if (!req.session.accessToken) {
		return res.status(401).send({ error: "Unauthorized" });
	}

	// Refreshes the user's Discord token automatically if it has expired
	const userGuilds = await getUserGuilds(req);

	const botGuilds = await AppDataSource.getRepository(Guild).find({
		select: { id: true },
		where: { id: In(userGuilds.map((guild) => guild.id)) },
	});
	const botGuildIds = new Set(botGuilds.map((guild) => guild.id));

	const isAccessible = async (guild: UserGuild): Promise<boolean> => {
		const permissions = new PermissionsBitField(BigInt(guild.permissions));
		if (permissions.has(PermissionsBitField.Flags.ManageGuild)) {
			return true;
		}
		// Role-based access only exists once the bot is in the guild
		if (!botGuildIds.has(guild.id)) {
			return false;
		}
		return (await resolveGuildAccess(req, guild.id)) !== null;
	};

	// A failed access lookup hides that guild instead of failing the whole list
	const checks = await Promise.allSettled(userGuilds.map(isAccessible));

	const accessibleGuilds: UserGuilds[] = userGuilds
		.filter((_, index) => {
			const check = checks[index];
			return check?.status === "fulfilled" && check.value;
		})
		.map((guild) => ({
			id: guild.id,
			name: guild.name,
			icon: guild.icon,
			setUp: botGuildIds.has(guild.id), // Whether the bot has been added to the guild
		}));

	return res.status(200).send(accessibleGuilds);
});

interface UserGuilds {
	id: string;
	name: string;
	icon: string | null;
	setUp: boolean;
}
