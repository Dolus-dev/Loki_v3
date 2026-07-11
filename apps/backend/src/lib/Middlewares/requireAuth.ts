import { timingSafeEqual } from "crypto";
import { Request, Response, NextFunction } from "express";
import { env } from "../../config/env";

/**
 *  Middleware to require session authentication for a route
 */

export function requireAuth(
	req: Request,
	res: Response,
	next: NextFunction,
): void {
	const token = req.headers.authorization?.replace("Bot ", "");

	if (!token && !req.session.userId) {
		console.log("Unauthorized access attempt to protected route");
		void res.status(401).send({ error: "Unauthorized" });
		return;
	}
	if (req.session.userId) {
		next();
		return;
	}

	if (!token) {
		console.log("Unauthorized access attempt to protected route without token");
		void res.status(401).send({ error: "Unauthorized" });
		return;
	}

	if (token.length !== env.BOT_API_SECRET.length) {
		console.log(
			"Unauthorized access attempt to protected route with invalid token length",
		);
		void res.status(401).send({ error: "Unauthorized" });
		return;
	}

	const tokenValid = timingSafeEqual(
		Buffer.from(token),
		Buffer.from(env.BOT_API_SECRET),
	);

	if (!tokenValid) {
		console.log(
			"Unauthorized access attempt to protected route with invalid token",
		);
		void res.status(401).send({ error: "Unauthorized" });
		return;
	}
	next();
}
