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
