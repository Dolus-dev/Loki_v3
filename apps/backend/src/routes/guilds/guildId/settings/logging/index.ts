import express from "express";
import { requireAuth } from "../../../../../lib/Middlewares/requireAuth";
import { LoggingSettings } from "../../../../../models/Moderation/Logging/ServerLoggingSettings";
import { AppDataSource } from "../../../../..";
import z from "zod";
import { requireGuildSettingsAccess } from "../../../../../lib/Middlewares/requireGuildSettingsAccess";
export const router = express.Router({ mergeParams: true });

// Retrieve logging settings for a guild
router.get(
	"/",
	requireAuth,
	requireGuildSettingsAccess("view"),
	async (req: express.Request<{ guildId: string }>, res) => {
		const { guildId } = req.params;

		const logSettingsRepo = AppDataSource.getRepository(LoggingSettings);

		await logSettingsRepo.upsert(
			{
				guildId: guildId,
			},
			{ conflictPaths: ["guildId"], skipUpdateIfNoValuesChanged: true },
		);

		const settings = await logSettingsRepo.findOneBy({ guildId });

		if (!settings) {
			return res
				.status(500)
				.send({ error: "Failed to retrieve logging settings" });
		}

		return res.status(200).json(settings);
	},
);
// Update logging settings for a guild

const patchItems = z.object({
	enabled: z.boolean().optional(),
	defaultLoggingChannelId: z.string(),
	logModerationActions: z.boolean(),
	moderationLogChannelId: z.string(),
	logMessageEditsAndDeletions: z.boolean(),
	messageLogChannelId: z.string(),
	logMemberLeaves: z.boolean(),
	logMemberJoins: z.boolean(),
	logMemberJoinChannelId: z.string(),
	logMemberLeaveChannelId: z.string(),
});
router.patch(
	"/",
	requireAuth,
	requireGuildSettingsAccess("edit"),
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
			defaultLoggingChannelId,
			logModerationActions,
			moderationLogChannelId,
			logMessageEditsAndDeletions,
			messageLogChannelId,
			logMemberJoins,
			logMemberLeaves,
			logMemberJoinChannelId,
			logMemberLeaveChannelId,
		} = parseResult.data;

		const logSettingsRepo = AppDataSource.getRepository(LoggingSettings);

		try {
			await logSettingsRepo.upsert(
				{
					guildId: guildId,
					...(enabled !== undefined && { enabled }),
					defaultLoggingChannelId,
					logModerationActions,
					moderationLogChannelId,
					logMessageEditsAndDeletions,
					messageLogChannelId,
					logMemberJoins,
					logMemberLeaves,
					logMemberJoinChannelId,
					logMemberLeaveChannelId,
				},
				{ conflictPaths: ["guildId"], skipUpdateIfNoValuesChanged: true },
			);
			return res.status(204).send();
		} catch (error) {
			return res
				.status(500)
				.json({ error: "Failed to update logging settings" });
		}
	},
);
