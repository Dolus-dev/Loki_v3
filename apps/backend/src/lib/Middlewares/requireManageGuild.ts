import { PermissionsBitField } from "discord.js";
import { NextFunction, Request, Response } from "express";
import { getUserGuildPermissions, respondToAccessError } from "../guildAccess";

/**
 * Middleware that only lets through users who have the Manage Server permission
 * in the guild in the URL, as Discord itself reports it for that guild.
 *
 * Dashboard roles (view/edit access) are deliberately not enough: use this on actions
 * that control who else has access, so that a role granted access can't widen it.
 * Discord is asked every time instead of using cached permissions, so a user who just
 * lost Manage Server is refused immediately. Requires a `guildId` route param and must
 * run after `requireAuth`. Bot-secret requests are trusted and skip the check.
 */
export async function requireManageGuild(
	req: Request<{ guildId: string }>,
	res: Response,
	next: NextFunction,
): Promise<void> {
	if (res.locals.authType === "bot") {
		return next();
	}

	if (!req.session.accessToken) {
		void res.status(401).send({ error: "Unauthorized" });
		return;
	}

	try {
		const permissions = await getUserGuildPermissions(req, req.params.guildId, {
			fresh: true,
		});

		// has() also accepts Administrator, which Discord treats as every permission
		if (!permissions?.has(PermissionsBitField.Flags.ManageGuild)) {
			void res
				.status(403)
				.send({ error: "The Manage Server permission is required" });
			return;
		}

		return next();
	} catch (error) {
		respondToAccessError(res, error);
		return;
	}
}
