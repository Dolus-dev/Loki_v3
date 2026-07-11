import express from "express";
import { router as guildsRouter } from "./guilds/index";
import { requireAuth } from "../../../lib/Middlewares/requireAuth";
import { fetchDiscordUser } from "../../../lib/discordInteractions";
import { redisClient } from "../../../index";
import { z } from "zod";

export const router = express.Router();

const CachedUserSchema = z.object({
	id: z.string(),
	username: z.string(),
	global_name: z.string().nullable().optional(),
	avatar: z.string().nullable().optional(),
});

router.use("/guilds", guildsRouter);

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
			const value = await redisClient.get(key);

			if (value) {
				const cachedUser = CachedUserSchema.safeParse(JSON.parse(value));
				if (cachedUser.success) {
					return res.status(200).send({
						id: cachedUser.data.id,
						username: cachedUser.data.global_name || cachedUser.data.username,
						avatarHash: cachedUser.data.avatar,
					});
				}
				console.log("Cache hit for user:", req.session.userId);
			}

			const user = await fetchDiscordUser(accessToken);
			await redisClient.set(key, JSON.stringify(user), {
				EX: 300, // Cache for 5 minutes
			});

			console.log("Cache miss for user:", req.session.userId);

			return res.status(200).send({
				id: user.id,
				username: user.global_name || user.username,
				avatarHash: user.avatar,
			});
		} catch (error) {
			console.error("Error fetching Discord user in /auth/@me:", error);
			return res.status(401).json({ error: "Unauthorized" });
		}
	},
);
