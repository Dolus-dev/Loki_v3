"use client";

import Link from "next/link";
import { FaDiscord } from "react-icons/fa";
import { FaArrowDown, FaServer } from "react-icons/fa6";
import { botInviteUrl } from "../../lib/discordInvite";
import { useUser } from "../../lib/hooks/useUser";

/**
 * The landing page's buttons. A client component because "Manage Servers" only appears for
 * logged-in users, which is only known in the browser (see useUser).
 */
export default function HeroActions({ centered = false }: { centered?: boolean }) {
	const { user } = useUser();
	const inviteUrl = botInviteUrl();

	return (
		<div
			className={`flex flex-row flex-wrap gap-4 ${centered ? "justify-center" : ""}`}>
			{inviteUrl ? (
				<a
					href={inviteUrl}
					target="_blank"
					rel="noopener noreferrer"
					className="flex flex-row items-center gap-2 bg-brand-700 hover:bg-brand-600 transition-colors px-5 py-2.5 text-neutral-100 rounded-3xl text-lg font-bold">
					<FaDiscord className="size-5" />
					Add to Discord
				</a>
			) : (
				// Without a client ID there's no invite link to go to
				<span
					title="Set NEXT_PUBLIC_DISCORD_CLIENT_ID to enable the invite link"
					className="flex flex-row items-center gap-2 bg-brand-900 px-5 py-2.5 text-neutral-400 rounded-3xl text-lg font-bold cursor-not-allowed">
					<FaDiscord className="size-5" />
					Add to Discord
				</span>
			)}

			{user && (
				<Link
					href="/dashboard"
					className="flex flex-row items-center gap-2 bg-info-700 hover:bg-info-600 transition-colors px-5 py-2.5 text-neutral-100 rounded-3xl text-lg font-bold">
					<FaServer className="size-4" />
					Manage Servers
				</Link>
			)}

			<a
				href="#features"
				className="flex flex-row items-center gap-2 bg-neutral-800 hover:bg-neutral-700 transition-colors px-5 py-2.5 text-neutral-100 rounded-3xl text-lg font-bold">
				Explore Features
				<FaArrowDown className="size-4" />
			</a>
		</div>
	);
}
