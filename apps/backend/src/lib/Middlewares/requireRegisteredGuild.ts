import { NextFunction, Request, Response } from "express";
import { AppDataSource } from "../..";
import { Guild } from "../../models/Guild";

/**
 * Middleware that responds 404 unless the guild in the URL is registered (the bot adds
 * guilds through `POST /guilds`). Use it on routes that create per-guild rows, so a
 * request can never create data for a guild the bot doesn't know. Requires a `guildId`
 * route param and should run after the access checks.
 */
export async function requireRegisteredGuild(
	req: Request<{ guildId: string }>,
	res: Response,
	next: NextFunction,
): Promise<void> {
	const exists = await AppDataSource.getRepository(Guild).existsBy({
		id: req.params.guildId,
	});

	if (!exists) {
		void res.status(404).send({ error: "Guild not found" });
		return;
	}
	next();
}
