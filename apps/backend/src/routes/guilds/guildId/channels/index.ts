import { APIGuildChannel, ChannelType, Snowflake } from "discord.js";
import express from "express";
import { cacheGet, cacheSet } from "../../../../lib/cache";
import { fetchGuildChannels } from "../../../../lib/discordInteractions";
import { requireAuth } from "../../../../lib/Middlewares/requireAuth";
import { requireGuildSettingsAccess } from "../../../../lib/Middlewares/requireGuildSettingsAccess";
import z from "zod";
import { groupChannelsByCategory } from "../../../../lib/groupChannels";

export const router = express.Router({ mergeParams: true });

const CachedChannelsSchema = z.array(
	z.object({
		category: z.string(),
		children: z.array(
			z.object({
				id: z.string(),
				name: z.string(),
				type: z.enum(ChannelType).optional(),
			}),
		),
	}),
);

const query = z.object({
	// stringbool parses "true"/"false"; z.coerce.boolean() would turn "false" into true
	forceRefresh: z.stringbool().optional().default(false),
});

/**
 * Returns a guild's channels grouped by category, for channel pickers in the dashboard.
 * Categories are sorted by name with "Uncategorized" last. Cached in Redis for 5
 * minutes; `?forceRefresh=true` skips the cache read and refetches from Discord.
 */
router.get(
	"/",
	requireAuth,
	requireGuildSettingsAccess("view"),
	async (
		req: express.Request<{ guildId: string }>,
		res: express.Response,
	): Promise<express.Response | void> => {
		const { guildId } = req.params;

		const key = "guild:channels:" + guildId;

		const queryParams = query.safeParse(req.query);
		if (!queryParams.success) {
			return res.status(400).json({ error: "Invalid query parameters" });
		}

		const { forceRefresh } = queryParams.data;

		let channels: APIGuildChannel[] | null = null;

		if (forceRefresh === false) {
			const value = await cacheGet(key);

			if (value) {
				const cachedChannels = CachedChannelsSchema.safeParse(
					JSON.parse(value),
				);
				if (cachedChannels.success) {
					console.log("Cache hit for guild channels:", guildId);
					return res.status(200).send(cachedChannels.data);
				}
			}
		}

		channels = await fetchGuildChannels(guildId);

		const returnedChannels = groupChannelsByCategory(channels);

		await cacheSet(key, JSON.stringify(returnedChannels), 300); // Cache for 5 minutes
		return res.status(200).send(returnedChannels);
	},
);
