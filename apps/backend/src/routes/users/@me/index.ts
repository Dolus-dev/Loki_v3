import express from "express";
import { router as guildsRouter } from "./guilds/index";
import { requireAuth } from "../../../lib/requireAuth - Middleware";
import { fetchDiscordUser } from "../../../lib/discordInteractions";
import { redisClient } from "../../../index";

export const router = express.Router();
router.use("/guilds", guildsRouter);

router.get(
	"/",
	// requireAuth,
	async (req, res) => {
		try {
			let user = null;

			const key = "user:" + req.session.userId;
			const value = await redisClient.get(key);

			if (value) {
				user = JSON.parse(value);
				console.log("Cache hit for user:", req.session.userId);
			} else {
				user = await fetchDiscordUser(req.session.accessToken!);
				await redisClient.set(key, JSON.stringify(user), {
					EX: 300, // Cache for 5 minutes
				});

				console.log("Cache miss for user:", req.session.userId);
			}

			return res.status(200).send({
				id: user.id,
				username: user.global_name || user.username,
				avatarHash: user.avatar,
			});
		} catch (error) {
			console.error("Error fetching Discord user in /auth/@me:", error);
			return res.status(401).json({ error: "Unauthorized" });
		}
	}
);
