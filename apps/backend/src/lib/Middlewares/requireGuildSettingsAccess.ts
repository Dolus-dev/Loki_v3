import { PermissionsBitField } from "discord.js";
import { NextFunction, Request, Response } from "express";
import {
	getDashboardAccess,
	getMemberRoles,
	getUserGuildPermissions,
	respondToAccessError,
} from "../guildAccess";

type GuildSettingsAccessMode = "view" | "edit";

/**
 * Creates a middleware that checks the session user may access a guild's dashboard settings.
 *
 * Access is granted to users with Manage Server, or to members holding a role
 * configured in the guild's dashboard settings ("edit" roles also satisfy "view").
 * Requires a `guildId` route param and must run after `requireAuth`. Bot-secret
 * requests are trusted and skip the check, since the bot already acts on every guild;
 * all other requests need a session access token.
 *
 * The user's Discord permissions and roles are cached for a minute, and the guild's role
 * settings are cached until they change (see lib/guildAccess.ts). Routes that manage who
 * has access must use `requireManageGuild` instead, which always asks Discord.
 * @param mode Whether the route only reads ("view") or modifies ("edit") settings
 */
export function requireGuildSettingsAccess(mode: GuildSettingsAccessMode) {
	return async function guildSettingsAccessMiddleware(
		req: Request<{ guildId: string }>,
		res: Response,
		next: NextFunction,
	): Promise<void> {
		if (res.locals.authType === "bot") {
			return next();
		}

		const { guildId } = req.params;

		if (!req.session.accessToken) {
			void res.status(401).send({ error: "Unauthorized" });
			return;
		}

		try {
			const permissions = await getUserGuildPermissions(req, guildId);

			if (!permissions) {
				void res.status(403).send({ error: "Forbidden" });
				return;
			}

			if (permissions.has(PermissionsBitField.Flags.ManageGuild)) {
				return next();
			}

			const dashboardAccess = await getDashboardAccess(guildId);

			if (!dashboardAccess) {
				void res.status(403).send({ error: "Forbidden" });
				return;
			}

			const memberRoles = await getMemberRoles(req, guildId);

			if (!memberRoles) {
				void res.status(403).send({ error: "Forbidden" });
				return;
			}

			const allowedRoles =
				mode === "edit"
					? dashboardAccess.editAccess
					: [...dashboardAccess.readAccess, ...dashboardAccess.editAccess];

			const hasAccess = memberRoles.some((roleId) => allowedRoles.includes(roleId));

			if (!hasAccess) {
				void res.status(403).send({ error: "Forbidden" });
				return;
			}

			return next();
		} catch (error) {
			respondToAccessError(res, error);
			return;
		}
	};
}
