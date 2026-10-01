"use client";

import { useParams } from "next/navigation";
import useSWR from "swr";
import { API_URL, fetcher } from "../api";
import type { ReturnedChannelGroup } from "../../ui/channel-multi-select-menu";
import type { ReturnedRole } from "../../ui/role-multi-select-menu";

/**
 * The current guild's roles and channels, for the pickers on settings pages. Both are
 * cached by the backend for 5 minutes, and SWR shares each response between every
 * component that asks for it.
 */

/** The guild's roles, highest first, without @everyone. `roles` is [] until loaded. */
export function useGuildRoles() {
	const { guildId } = useParams<{ guildId: string }>();
	const { data, error, isLoading } = useSWR<ReturnedRole[]>(
		guildId ? `${API_URL}/guilds/${guildId}/roles` : null,
		fetcher,
	);
	return { roles: data ?? [], error, isLoading };
}

/** The guild's channels grouped by category. `channels` is [] until loaded. */
export function useGuildChannels() {
	const { guildId } = useParams<{ guildId: string }>();
	const { data, error, isLoading } = useSWR<ReturnedChannelGroup[]>(
		guildId ? `${API_URL}/guilds/${guildId}/channels` : null,
		fetcher,
	);
	return { channels: data ?? [], error, isLoading };
}
