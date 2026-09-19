import { APIGuildChannel, ChannelType } from "discord.js";

export interface ReturnedChannel {
	id: string;
	name: string;
	type?: ChannelType;
}

export interface ReturnedChannelGroup {
	category: string;
	children: ReturnedChannel[];
}

// Not every guild channel type has a position (e.g. threads), so read it defensively
const positionOf = (channel: APIGuildChannel) =>
	(channel as { position?: number }).position ?? 0;

// Same order as Discord shows them; ID breaks ties so the result is stable
const byPosition = (a: APIGuildChannel, b: APIGuildChannel) =>
	positionOf(a) - positionOf(b) || a.id.localeCompare(b.id);

const simplify = (channel: APIGuildChannel): ReturnedChannel => ({
	id: channel.id,
	name: channel.name,
	type: channel.type,
});

/**
 * Groups a guild's channels under their categories, in Discord's order.
 *
 * Groups are keyed by category ID, so categories that share a name stay separate.
 * Channels with no category (or whose category no longer exists) go in a final
 * "Uncategorized" group, which is left out when it would be empty.
 */
export function groupChannelsByCategory(
	channels: APIGuildChannel[],
): ReturnedChannelGroup[] {
	const categories = channels
		.filter((channel) => channel.type === ChannelType.GuildCategory)
		.sort(byPosition);
	const otherChannels = channels.filter(
		(channel) => channel.type !== ChannelType.GuildCategory,
	);

	const groups: ReturnedChannelGroup[] = categories.map((category) => ({
		category: category.name,
		children: otherChannels
			.filter((channel) => channel.parent_id === category.id)
			.sort(byPosition)
			.map(simplify),
	}));

	const categoryIds = new Set(categories.map((category) => category.id));
	const uncategorized = otherChannels
		.filter((channel) => !channel.parent_id || !categoryIds.has(channel.parent_id))
		.sort(byPosition)
		.map(simplify);

	if (uncategorized.length > 0) {
		groups.push({ category: "Uncategorized", children: uncategorized });
	}

	return groups;
}
