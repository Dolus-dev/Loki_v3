import express from "express";
import { requireAuth } from "../../../../../lib/Middlewares/requireAuth";
import { LoggingSettings } from "../../../../../models/Moderation/Logging/ServerLoggingSettings";
import { AppDataSource } from "../../../../..";
import z, { treeifyError } from "zod";
import { discordSnowflake } from "../../../../../lib/validation";
import { requireGuildSettingsAccess } from "../../../../../lib/Middlewares/requireGuildSettingsAccess";
import { requireRegisteredGuild } from "../../../../../lib/Middlewares/requireRegisteredGuild";
export const router = express.Router({ mergeParams: true });

// Retrieve logging settings for a guild (a default row is created on first read)
router.get(
	"/",
	requireAuth,
	requireGuildSettingsAccess("view"),
	requireRegisteredGuild,
	async (req: express.Request<{ guildId: string }>, res) => {
		const { guildId } = req.params;
		try {

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
		} catch (error) {
			console.error("Failed to retrieve logging settings:", error);
			return res.status(500).send({ error: "Failed to retrieve logging settings" });
		}
	},
);

// Update logging settings for a guild. `enabled` is optional and left unchanged
// when omitted; every other field must be sent on each update. A channel ID of null
// clears it (the default channel is used, or that log is disabled; see the model).
const patchItems = z.object({
	enabled: z.boolean().optional(),
	defaultLoggingChannelId: discordSnowflake.nullable(),
	logModerationActions: z.boolean(),
	moderationLogChannelId: discordSnowflake.nullable(),
	logMessageEditsAndDeletions: z.boolean(),
	messageLogChannelId: discordSnowflake.nullable(),
	logMemberLeaves: z.boolean(),
	logMemberJoins: z.boolean(),
	logMemberJoinChannelId: discordSnowflake.nullable(),
	logMemberLeaveChannelId: discordSnowflake.nullable(),
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
				.json({ error: "Invalid request body", details: treeifyError(parseResult.error) });
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
			console.error("Failed to update logging settings:", error);
			return res.status(500).json({ error: "Failed to update logging settings" });
		}
	},
);
