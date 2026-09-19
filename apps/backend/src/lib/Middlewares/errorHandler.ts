import { NextFunction, Request, Response } from "express";
import { DiscordError } from "../Errors/APIErrorResponse";

/**
 * Global error handler; register it after all routes.
 *
 * Turns errors that escape a route (Express 5 forwards rejected async handlers here)
 * into JSON responses. Discord API failures are mapped to a matching status, and
 * details are logged rather than sent so clients never see stack traces.
 */
export function errorHandler(
	err: unknown,
	_req: Request,
	res: Response,
	next: NextFunction,
): void {
	// If the response has already started we can only let Express close the connection
	if (res.headersSent) {
		return next(err);
	}

	if (err instanceof DiscordError) {
		console.error(`Discord API error (${err.statusCode}):`, err.details);

		if (err.statusCode === 401) {
			void res.status(401).send({ error: "Discord authorization expired" });
			return;
		}
		if (err.statusCode === 403 || err.statusCode === 404) {
			void res
				.status(err.statusCode)
				.send({ error: err.statusCode === 403 ? "Forbidden" : "Not found" });
			return;
		}
		// Rate limiting (429) and Discord outages (5xx): our upstream is the problem
		void res.status(502).send({ error: "Discord is unavailable" });
		return;
	}

	console.error("Unhandled error:", err);
	void res.status(500).send({ error: "Internal server error" });
}
