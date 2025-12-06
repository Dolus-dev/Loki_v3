import express from "express";
import { requireAuth } from "../../../lib/requireAuth - Middleware";

export const router = express.Router();

router.post("/", requireAuth, async (req, res) => {
	req.session.destroy((err) => {
		if (err) {
			return res.status(500).send({ error: "Failed to log out" });
		}
		res.clearCookie("connect.sid", {
			httpOnly: true,
			secure: process.env.NODE_ENV === "production",
			sameSite: "strict",
		});

		return res.status(200).send({ message: "Logged out successfully" });
	});
});
