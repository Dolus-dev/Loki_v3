import { timingSafeEqual } from "crypto";
import { Request, Response, NextFunction } from "express";

/**
 *  Middleware to require session authentication for a route
 */
export function requireAuth(req: Request, res: Response, next: NextFunction) {
	const token = req.headers.authorization?.replace("Bot ", "");

	if (!token && !req.session.userId) {
		console.log("Unauthorized access attempt to protected route");
		return res.status(401).send({ error: "Unauthorized" });
	}
	if (req.session.userId) {
		return next();
	}

	const tokenValid = timingSafeEqual(
		Buffer.from(token as string),
		Buffer.from(process.env.BOT_API_SECRET as string)
	);

	if (!tokenValid) {
		console.log(
			"Unauthorized access attempt to protected route with invalid token"
		);
		return res.status(401).send({ error: "Unauthorized" });
	}
	return next();
}
