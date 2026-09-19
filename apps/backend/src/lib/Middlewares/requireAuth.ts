import { timingSafeEqual } from "crypto";
import { Request, Response, NextFunction } from "express";
import { env } from "../../config/env";

/**
 * Middleware to require authentication for a route.
 *
 * Accepts either a logged-in dashboard session (`req.session.userId`) or the
 * bot's shared secret in the `Authorization: Bot <secret>` header. Bot requests
 * are not tied to a user, so handlers cannot rely on `req.session.userId`.
 *
 * On success, `res.locals.authType` is set to "session" or "bot" so later
 * middleware and handlers can tell the two callers apart.
 */

const BOT_AUTH_PREFIX = "Bot ";

export type AuthType = "session" | "bot";

export function requireAuth(
	req: Request,
	res: Response,
	next: NextFunction,
): void {
	// Only a header of the form "Bot <secret>" counts as a bot token
	const authorization = req.headers.authorization;
	const token = authorization?.startsWith(BOT_AUTH_PREFIX)
		? authorization.slice(BOT_AUTH_PREFIX.length)
		: undefined;

	if (!token && !req.session.userId) {
		console.log("Unauthorized access attempt to protected route");
		void res.status(401).send({ error: "Unauthorized" });
		return;
	}
	// A session takes priority over a bot token
	if (req.session.userId) {
		res.locals.authType = "session" satisfies AuthType;
		next();
		return;
	}

	if (!token) {
		console.log("Unauthorized access attempt to protected route without token");
		void res.status(401).send({ error: "Unauthorized" });
		return;
	}

	// Compare byte lengths, not string lengths: timingSafeEqual throws if the buffers
	// differ in size, and multibyte characters make the two disagree
	const tokenBuffer = Buffer.from(token);
	const secretBuffer = Buffer.from(env.BOT_API_SECRET);

	if (tokenBuffer.length !== secretBuffer.length) {
		console.log(
			"Unauthorized access attempt to protected route with invalid token length",
		);
		void res.status(401).send({ error: "Unauthorized" });
		return;
	}

	const tokenValid = timingSafeEqual(tokenBuffer, secretBuffer);

	if (!tokenValid) {
		console.log(
			"Unauthorized access attempt to protected route with invalid token",
		);
		void res.status(401).send({ error: "Unauthorized" });
		return;
	}
	res.locals.authType = "bot" satisfies AuthType;
	next();
}
