"use client";

import { useParams } from "next/navigation";
import TabNav from "../../../../ui/tab-nav";

/** The moderation actions, in tab order. Each slug is both its URL and its settings section. */
export const MODERATION_TABS = [
	{ slug: "warns", label: "Warns" },
	{ slug: "kicks", label: "Kicks" },
	{ slug: "bans", label: "Bans" },
	{ slug: "mutes", label: "Mutes" },
	{ slug: "timeouts", label: "Timeouts" },
] as const;

/** The tab bar at the top of every moderation settings page. */
export default function ModerationTabs() {
	const { guildId } = useParams<{ guildId: string }>();

	return (
		<TabNav
			label="Moderation settings"
			items={MODERATION_TABS.map((tab) => ({
				label: tab.label,
				href: `/dashboard/${guildId}/moderation/${tab.slug}`,
			}))}
		/>
	);
}
