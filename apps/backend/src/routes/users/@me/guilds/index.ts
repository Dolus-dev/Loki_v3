import express from "express";
import { requireAuth } from "../../../../lib/requireAuth - Middleware";
import { fetchCurrentUserGuilds } from "../../../../lib/discordInteractions";
import { PermissionsBitField } from "discord.js";
import { AppDataSource } from "../../../..";
import { In } from "typeorm";

export const router = express.Router();

router.get("/", requireAuth, async (req, res) => {
	// Logic to get guilds for the authenticated user

	const user = req.session.accessToken;
	if (!user) {
		return res.status(401).send({ error: "Unauthorized" });
	}

	const guilds = await fetchCurrentUserGuilds(user);
	const userGuildIds = guilds.map((g) => g.id);
	const guildRepository = AppDataSource.getRepository("Guild");
	const botGuilds = await guildRepository.find({
		where: { id: In(userGuildIds) },
	});

	console.log("Bot guilds:", botGuilds);

	console.log("Fetched guilds for user:", guilds);

	const accessibleGuilds = guilds.filter((guild) => {
		const permissions = new PermissionsBitField(
			BigInt(guild.permissions as string)
		);
		return permissions.has(PermissionsBitField.Flags.ManageGuild);
	});

	// console.log("Filtered guilds (Manage Guild access):", accessibleGuilds);

	return res.status(200).send(accessibleGuilds);
});
