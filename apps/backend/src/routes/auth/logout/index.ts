import express from "express";
import { env } from "../../../config/env";

export const router = express.Router();

/**
 * Logs the current browser out: destroys its session and clears the session cookie.
 *
 * POST rather than GET, since it changes state. It deliberately doesn't require a login,
 * so logging out is always safe to call: with no (or an already expired) session it just
 * clears the cookie and succeeds.
 *
 * Only this session ends. The user's stored Discord tokens stay in the database because
 * their other sessions (other browsers/devices) still use them.
 */
router.post("/", async (req, res) => {
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

		return res.status(204).send();
	} catch (err) {
		console.error("Error during logout:", err);
		return res.status(500).send({ error: "Failed to log out" });
	}
});
