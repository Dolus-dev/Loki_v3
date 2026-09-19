import { Request, Response, NextFunction } from "express";

/**
 * Middleware that restricts a route to the Discord bot.
 *
 * Must run after `requireAuth`, which records whether the caller is a dashboard
 * session or the bot. Use it on routes that only the bot should ever call, so
 * that a logged-in dashboard user can't.
 */
export function requireBot(
	_req: Request,
	res: Response,
	next: NextFunction,
): void {
	if (res.locals.authType !== "bot") {
		void res.status(403).send({ error: "Forbidden" });
		return;
	}
	next();
}
