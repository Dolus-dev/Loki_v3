import express from "express";
import { router as guildsRouter } from "./guilds/index";
import { requireAuth } from "../../../lib/requireAuth - Middleware";
import { fetchDiscordUser } from "../../../lib/discordInteractions";

export const router = express.Router();
router.use("/guilds", guildsRouter);

router.get("/", requireAuth, async (req, res) => {
	try {
		const user = await fetchDiscordUser(req.session.accessToken!);

		return res.status(200).send({
			id: user.id,
			username: user.global_name || user.username,
			avatarHash: user.avatar,
		});
	} catch (error) {
		console.error("Error fetching Discord user in /auth/@me:", error);
		return res.status(401).json({ error: "Unauthorized" });
	}
});
