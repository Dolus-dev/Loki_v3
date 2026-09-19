import express from "express";
import { router as guildsRouter } from "./guilds/index";
import { requireAuth } from "../../../lib/Middlewares/requireAuth";
import { fetchDiscordUser } from "../../../lib/discordInteractions";
import { cacheGet, cacheSet } from "../../../lib/cache";
import { withUserAccessToken } from "../../../lib/userTokens";
import { DiscordError } from "../../../lib/Errors/APIErrorResponse";
import { z } from "zod";

export const router = express.Router();

const CachedUserSchema = z.object({
	id: z.string(),
	username: z.string(),
	global_name: z.string().nullable().optional(),
	avatar: z.string().nullable().optional(),
});

router.use("/guilds", guildsRouter);

// Returns the logged-in user's basic Discord profile, cached in Redis for 5 minutes
router.get(
	"/",
	requireAuth,
	async (
		req: express.Request,
		res: express.Response,
	): Promise<express.Response | void> => {
		try {
			const accessToken = req.session.accessToken;
			if (!accessToken) {
				return res.status(401).json({ error: "Unauthorized" });
			}

			const key = "user:" + req.session.userId;
			const value = await cacheGet(key);

			if (value) {
				const cachedUser = CachedUserSchema.safeParse(JSON.parse(value));
				if (cachedUser.success) {
					console.log("Cache hit for user:", req.session.userId);
					return res.status(200).send({
						id: cachedUser.data.id,
						username: cachedUser.data.global_name || cachedUser.data.username,
						avatarHash: cachedUser.data.avatar,
					});
				}
			}

			// Refreshes the user's Discord token automatically if it has expired
			const user = await withUserAccessToken(req, fetchDiscordUser);
			await cacheSet(key, JSON.stringify(user), 300); // Cache for 5 minutes

			console.log("Cache miss for user:", req.session.userId);

			return res.status(200).send({
				id: user.id,
				username: user.global_name || user.username,
				avatarHash: user.avatar,
			});
		} catch (error) {
			// Only an unusable Discord login means "not logged in"; a Discord outage or
			// database error must not look like a logout to the frontend
			if (error instanceof DiscordError && error.statusCode === 401) {
				return res.status(401).json({ error: "Unauthorized" });
			}
			throw error;
		}
	},
);
