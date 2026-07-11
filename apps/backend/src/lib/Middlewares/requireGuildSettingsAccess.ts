import { PermissionsBitField } from "discord.js";
import { NextFunction, Request, Response } from "express";
import { AppDataSource } from "../../index";
import { Guild } from "../../models/Guild";
import {
	fetchCurrentGuildMember,
	fetchCurrentUserGuilds,
} from "../discordInteractions";

type GuildSettingsAccessMode = "view" | "edit";

export function requireGuildSettingsAccess(mode: GuildSettingsAccessMode) {
	return async function guildSettingsAccessMiddleware(
		req: Request<{ guildId: string }>,
		res: Response,
		next: NextFunction,
	): Promise<void> {
		const { guildId } = req.params;
		const accessToken = req.session.accessToken;

		if (!accessToken) {
			void res.status(401).send({ error: "Unauthorized" });
			return;
		}

		try {
			const userGuilds = await fetchCurrentUserGuilds(accessToken);
			const userGuild = userGuilds.find((guild) => guild.id === guildId);

			if (!userGuild) {
				void res.status(403).send({ error: "Forbidden" });
				return;
			}

			const permissions = new PermissionsBitField(BigInt(userGuild.permissions));
			if (permissions.has(PermissionsBitField.Flags.ManageGuild)) {
				return next();
			}

			const guildRepository = AppDataSource.getRepository(Guild);
			const guild = await guildRepository.findOne({
				where: { id: guildId },
				relations: ["dashboardSettings"],
			});

			if (!guild?.dashboardSettings) {
				void res.status(403).send({ error: "Forbidden" });
				return;
			}

			const member = await fetchCurrentGuildMember(accessToken, guildId).catch(
				() => null,
			);

			if (!member) {
				void res.status(403).send({ error: "Forbidden" });
				return;
			}

			const allowedRoles =
				mode === "edit"
					? guild.dashboardSettings.rolesWithDashboardEditAccess
					: [
						...guild.dashboardSettings.rolesWithDashboardViewAccess,
						...guild.dashboardSettings.rolesWithDashboardEditAccess,
					];

			const hasAccess = member.roles.some((roleId) => allowedRoles.includes(roleId));

			if (!hasAccess) {
				void res.status(403).send({ error: "Forbidden" });
				return;
			}

			return next();
		} catch (error) {
			void res.status(500).send({ error: "Failed to verify guild settings access" });
			return;
		}
	};
}

