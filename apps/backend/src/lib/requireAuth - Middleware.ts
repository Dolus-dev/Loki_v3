import { Request, Response, NextFunction } from "express";

/**
 *  Middleware to require session authentication for a route
 */
export function requireAuth(req: Request, res: Response, next: NextFunction) {
	if (!req.session.userId) {
		console.log("Unauthorized access attempt to protected route");
		return res.status(401).send({ error: "Unauthorized" });
	}
	return next();
}
