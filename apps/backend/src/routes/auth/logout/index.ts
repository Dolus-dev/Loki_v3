import express from "express";
import { requireAuth } from "../../../lib/Middlewares/requireAuth";
import { env } from "../../../config/env";

export const router = express.Router();

router.get("/", requireAuth, async (req, res) => {
	try {
		await new Promise<void>((resolve, reject) => {
			req.session.destroy((err) => {
				if (err) return reject(err);
				resolve();
			});
		});

		// "connect.sid" is express-session's default cookie name; the options must
		// match those set in index.ts or the browser won't clear it
		res.clearCookie("connect.sid", {
			httpOnly: true,
			secure: env.NODE_ENV === "production",
			sameSite: "strict",
		});

		return res.status(200).send({ message: "Logged out successfully" });
	} catch (err) {
		console.error("Error during logout:", err);
		return res.status(500).send({ error: "Failed to log out" });
	}
});
