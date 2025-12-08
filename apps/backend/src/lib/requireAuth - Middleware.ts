import { Request, Response, NextFunction } from "express";

/**
 *  Middleware to require session authentication for a route
 */
export function requireAuth(req: Request, res: Response, next: NextFunction) {
	if (!req.session.userId) {
		return res.status(401).send({ error: "Unauthorized" });
	}
	return next();
}
