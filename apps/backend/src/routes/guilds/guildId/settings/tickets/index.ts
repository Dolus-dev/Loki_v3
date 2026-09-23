import express from "express";
import { requireAuth } from "../../../../../lib/Middlewares/requireAuth";
import { requireGuildSettingsAccess } from "../../../../../lib/Middlewares/requireGuildSettingsAccess";
import { requireRegisteredGuild } from "../../../../../lib/Middlewares/requireRegisteredGuild";
import { AppDataSource } from "../../../../..";
import { TicketSettings } from "../../../../../models/Tickets/TicketSettings";
import z from "zod";
import { discordSnowflake } from "../../../../../lib/validation";

export const router = express.Router({ mergeParams: true });

// Retrieve ticket settings for a guild (a default row is created on first read)
router.get(
	"/",
	requireAuth,
	requireGuildSettingsAccess("view"),
	requireRegisteredGuild,
	async (req: express.Request<{ guildId: string }>, res) => {
		const { guildId } = req.params;
		const ticketSettingsRepo = AppDataSource.getRepository(TicketSettings);

		await ticketSettingsRepo.upsert(
			{
				guildId: guildId,
			},
			{ conflictPaths: ["guildId"], skipUpdateIfNoValuesChanged: true },
		);

		const settings = await ticketSettingsRepo.findOneBy({ guildId });

		if (!settings) {
			return res
				.status(500)
				.send({ error: "Failed to retrieve ticket settings" });
		}

		return res.status(200).json(settings);
	},
);

// Update ticket settings for a guild; all fields must be sent on each update
const patchItems = z.object({
	enabled: z.boolean(),
	notificationChannelId: discordSnowflake.nullable(),
	categoryId: discordSnowflake.nullable(),
	archiveCategoryId: discordSnowflake.nullable(),
	ticketOpenMessage: z.string(),
});

router.patch(
	"/",
	requireAuth,
	requireGuildSettingsAccess("edit"),
	requireRegisteredGuild,
	async (req: express.Request<{ guildId: string }>, res) => {
		const { guildId } = req.params;
		const parseResult = patchItems.safeParse(req.body);
		if (!parseResult.success) {
			return res
				.status(400)
				.json({ error: "Invalid request body", details: parseResult.error });
		}
		const {
			enabled,
			notificationChannelId,
			categoryId,
			archiveCategoryId,
			ticketOpenMessage,
		} = parseResult.data;

		const ticketSettingsRepo = AppDataSource.getRepository(TicketSettings);

		try {
			await ticketSettingsRepo.upsert(
				{
					guildId: guildId,
					enabled: enabled,
					notificationChannelId: notificationChannelId,
					categoryId: categoryId,
					archiveCategoryId: archiveCategoryId,
					ticketOpenMessage: ticketOpenMessage,
				},
				{ conflictPaths: ["guildId"], skipUpdateIfNoValuesChanged: true },
			);
			return res.status(204).send();
		} catch (error) {
			return res
				.status(500)
				.json({ error: "Failed to update ticket settings" });
		}
	},
);
