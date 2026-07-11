import { APIGuildChannel, ChannelType, Snowflake } from "discord.js";
import express from "express";
import { redisClient } from "../../../..";
import { fetchGuildChannels } from "../../../../lib/discordInteractions";
import { requireAuth } from "../../../../lib/Middlewares/requireAuth";
import z from "zod";

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
	forceRefresh: z.coerce.boolean().optional().default(false),
});

router.get(
	"/",
	requireAuth,
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
			const value = await redisClient.get(key);

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

		const categories = new Map<string, string>();
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
						channel.type !== ChannelType.GuildCategory,
				);

				const simplifiedChannelsInCategory: ReturnedChannel[] =
					channelsInCategory.map((channel) => {
						return {
							id: channel.id,
							name: channel.name,
							type: channel.type,
						};
					});

				const categoryName = categories.get(categoryId);
				if (categoryName) {
					categorizedChannels.set(categoryName, simplifiedChannelsInCategory);
				}
			} else {
				const uncategorizedChannels = channels.filter(
					(channel) =>
						!channel.parent_id && channel.type !== ChannelType.GuildCategory,
				);
				const simplifiedUncategorizedChannels: ReturnedChannel[] =
					uncategorizedChannels.map((channel) => {
						return {
							id: channel.id,
							name: channel.name,
							type: channel.type,
						};
					});

				const categoryName = categories.get(categoryId) ?? "Uncategorized";
				categorizedChannels.set(categoryName, simplifiedUncategorizedChannels);
			}
		});

		const returnedChannels: ReturnedChannelGroup[] = Array.from(
			categorizedChannels.entries(),
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
	},
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
