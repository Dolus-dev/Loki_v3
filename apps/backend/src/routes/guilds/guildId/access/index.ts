import express from "express";
import { requireAuth } from "../../../../lib/Middlewares/requireAuth";
import {
	resolveGuildAccess,
	respondToAccessError,
} from "../../../../lib/guildAccess";

export const router = express.Router({ mergeParams: true });

/**
 * Tells the dashboard what the logged-in user may do in a guild, so it can hide guilds
 * they can't see and show settings read-only when they can't change them.
 *
 * Responds `{ level, canEdit, canManageAccess }` (see `GuildAccessLevel`), or 403 when the
 * user has no access at all. This is only a UI hint: every settings route still checks
 * access itself, and changing dashboard access re-checks Manage Server with Discord live.
 */
router.get(
	"/",
	requireAuth,
	async (req: express.Request<{ guildId: string }>, res) => {
		// Only meaningful for a logged-in dashboard user, not the bot
		if (!req.session.accessToken) {
			return res.status(401).send({ error: "Unauthorized" });
		}

		try {
			const level = await resolveGuildAccess(req, req.params.guildId);

			if (!level) {
				return res.status(403).send({ error: "Forbidden" });
			}

			return res.status(200).json({
				level,
				canEdit: level === "edit" || level === "manage",
				canManageAccess: level === "manage",
			});
		} catch (error) {
			respondToAccessError(res, error);
			return;
		}
	},
);
