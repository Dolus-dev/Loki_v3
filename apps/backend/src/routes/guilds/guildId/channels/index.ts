import {
	APIChannel,
	APIGuild,
	APIGuildChannel,
	ChannelType,
	Snowflake,
} from "discord.js";
import express from "express";
import { redisClient } from "../../../..";
import { fetchGuildChannels } from "../../../../lib/discordInteractions";
import { requireAuth } from "../../../../lib/requireAuth - Middleware";
import z from "zod";

export const router = express.Router({ mergeParams: true });

const query = z.object({
	forceRefresh: z.coerce.boolean().optional().default(false),
});

router.get(
	"/",
	// requireAuth,
	async (req: express.Request<{ guildId: string }>, res) => {
		const { guildId } = req.params;

		const key = "guild:channels:" + guildId;

		const queryParams = query.safeParse(req.query);
		if (!queryParams.success) {
			return res.status(400).json({ error: "Invalid query parameters" });
		}

		const { forceRefresh } = queryParams.data;

		let channels: APIGuildChannel[] | null = null;

		if (forceRefresh === false) {
			const value = await redisClient.get(key);

			if (value) {
				channels = JSON.parse(value) as APIGuildChannel[];
				console.log("Cache hit for guild channels:", guildId);
				return res.status(200).send(channels);
			}
		}

		channels = (await fetchGuildChannels(guildId)) as APIGuildChannel[];

		const categories = new Map<Snowflake, string>();
		const categorizedChannels = new Map<string, ReturnedChannel[]>();

		channels.forEach((channel) => {
			if (channel.type === ChannelType.GuildCategory) {
				categories.set(channel.id, channel.name);
			} else categories.set("Uncategorized", "Uncategorized");
		});

		Array.from(categories.keys()).forEach((categoryId) => {
			if (categoryId !== "Uncategorized") {
				const channelsInCategory = channels.filter(
					(channel) =>
						channel.parent_id === categoryId &&
						channel.type !== ChannelType.GuildCategory
				);

				const simplifiedChannelsInCategory: ReturnedChannel[] =
					channelsInCategory.map((channel) => {
						return {
							id: channel.id,
							name: channel.name,
							type: channel.type,
						};
					});

				categorizedChannels.set(
					categories.get(categoryId)!,
					simplifiedChannelsInCategory
				);
			} else {
				const uncategorizedChannels = channels.filter(
					(channel) =>
						!channel.parent_id && channel.type !== ChannelType.GuildCategory
				);
				const simplifiedUncategorizedChannels: ReturnedChannel[] =
					uncategorizedChannels.map((channel) => {
						return {
							id: channel.id,
							name: channel.name,
							type: channel.type,
						};
					});

				categorizedChannels.set(
					categories.get(categoryId)!,
					simplifiedUncategorizedChannels
				);
			}
		});

		const returnedChannels: ReturnedChannelGroup[] = Array.from(
			categorizedChannels.entries()
		)
			.map(([category, children]) => ({
				category,
				children,
			}))
			.sort((a, b) => {
				if (a.category === "Uncategorized") return 1;
				if (b.category === "Uncategorized") return -1;
				return a.category.localeCompare(b.category);
			});

		await redisClient.set(key, JSON.stringify(returnedChannels), {
			EX: 300, // Cache for 5 minutes
		});
		return res.status(200).send(returnedChannels);
	}
);

interface ReturnedChannel {
	id: string;
	name: string;
	type?: ChannelType;
}

interface ReturnedChannelGroup {
	category: string;
	children: ReturnedChannel[];
}
