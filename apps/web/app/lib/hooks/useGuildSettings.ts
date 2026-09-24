"use client";

import { useParams } from "next/navigation";
import { useCallback } from "react";
import useSWR from "swr";
import { API_URL, apiPatch, fetcher, SaveResult } from "../api";
import type {
	SettingsPatch,
	SettingsResponse,
	SettingsSection,
} from "../types/settings";

/**
 * Loads and saves one section of the current guild's settings
 * (`/guilds/:guildId/settings/<section>`); the guild comes from the route's `guildId` param.
 *
 * `data` is undefined until the first load finishes. `save` PATCHes the whole section,
 * refetches on success, and resolves to a `SaveResult` instead of throwing, so a page can
 * show why a save failed (e.g. 403 = view-only access, 400 = invalid input).
 */
export function useGuildSettings<S extends SettingsSection>(section: S) {
	const { guildId } = useParams<{ guildId: string }>();
	const path = `/guilds/${guildId}/settings/${section}`;

	const { data, error, isLoading, mutate } = useSWR<SettingsResponse[S]>(
		guildId ? `${API_URL}${path}` : null,
		fetcher,
	);

	const save = useCallback(
		async (body: SettingsPatch[S]): Promise<SaveResult> => {
			const result = await apiPatch(path, body);

			if (result.ok) {
				await mutate();
			}

			return result;
		},
		[path, mutate],
	);

	return { data, error, isLoading, save };
}
