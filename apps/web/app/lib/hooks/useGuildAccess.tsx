"use client";

import Link from "next/link";
import { redirect, useParams } from "next/navigation";
import { createContext, ReactNode, useContext } from "react";
import useSWR from "swr";
import { API_URL, ApiError, fetcher } from "../api";

/**
 * What the logged-in user may do in the current guild (GET /guilds/:guildId/access):
 * - "manage": Manage Server. Everything, including changing who has dashboard access.
 * - "edit": a dashboard edit role. View and change settings.
 * - "view": a dashboard view role. View settings only.
 */
export type GuildAccess = {
	level: "manage" | "edit" | "view";
	canEdit: boolean;
	canManageAccess: boolean;
};

type GuildAccessContextType = GuildAccess & {
	/** Re-asks the backend, e.g. after a save was refused because access changed. */
	revalidate: () => void;
};

const guildAccessContext = createContext<GuildAccessContextType | null>(null);

/**
 * Gate for everything under /dashboard/[guildId]. Loads the user's access level for the
 * guild and only renders `children` (the nav and the page) when they have at least view
 * access. Without it they get a "no access" panel instead, so a guild they can't see
 * isn't revealed by opening its URL directly.
 *
 * This only shapes the UI: the backend checks access on every request regardless.
 */
export function GuildAccessProvider({ children }: { children: ReactNode }) {
	const { guildId } = useParams<{ guildId: string }>();

	const { data, error, isLoading, mutate } = useSWR<GuildAccess>(
		guildId ? `${API_URL}/guilds/${guildId}/access` : null,
		fetcher,
		// A 403 is an answer, not a glitch; don't hammer the backend retrying it
		{ shouldRetryOnError: false },
	);

	if (error instanceof ApiError && error.status === 401) {
		redirect("/login");
	}

	if (isLoading) {
		return (
			<div className="w-full py-20 text-center text-neutral-400">
				Checking your access...
			</div>
		);
	}

	if (error || !data) {
		const noAccess =
			error instanceof ApiError && (error.status === 403 || error.status === 404);

		return (
			<div className="w-full py-20 flex flex-col items-center gap-4 text-center">
				<h1 className="text-2xl font-semibold text-neutral-100">
					{noAccess
						? "You don't have access to this server"
						: "Couldn't load this server"}
				</h1>
				<p className="text-neutral-300 max-w-130">
					{noAccess
						? "Ask a server admin to give you a role with dashboard access."
						: "Something went wrong while checking your access. Try again in a moment."}
				</p>
				<Link
					href="/dashboard"
					className="p-2 rounded-md font-semibold bg-neutral-600/50 text-neutral-200 hover:bg-neutral-600/70 transition duration-300">
					Back to your servers
				</Link>
			</div>
		);
	}

	return (
		<guildAccessContext.Provider
			value={{ ...data, revalidate: () => void mutate() }}>
			{children}
		</guildAccessContext.Provider>
	);
}

/** The current user's access to the current guild. Only usable under `GuildAccessProvider`. */
export function useGuildAccess(): GuildAccessContextType {
	const context = useContext(guildAccessContext);
	if (!context) {
		throw new Error("useGuildAccess must be used within a GuildAccessProvider");
	}
	return context;
}
