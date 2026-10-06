"use client";

import Link from "next/link";
import useSWR from "swr";
import Image from "next/image";
import { useUser } from "../lib/hooks/useUser";
import { API_URL, fetcher } from "../lib/api";
import { botInviteUrl } from "../lib/discordInvite";
import { redirect } from "next/navigation";
import { useEffect } from "react";

export default function ServerSelectorDashboardPage() {
	const { user, isLoading: userLoading } = useUser();

	if (!userLoading && !user) {
		redirect("/login");
	}

	const { data, error, isLoading } = useSWR<
		{ id: string; name: string; icon: string | null; setUp: boolean }[]
	>(`${API_URL}/users/@me/guilds`, fetcher);

	return (
		<>
			{data && (
				// 1 column on phones, 2 from sm, 3 from xl; the wide desktop gap starts at lg
				<section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 content-evenly justify-items-center place-self-center gap-x-6 lg:gap-x-14 px-4 lg:px-0 relative mt-10">
					{/* Servers the bot is in (manageable/viewable) first, then ones it can be
					    added to; alphabetical within each group. Sorts a copy, since `data`
					    is SWR's cached array. */}
					{[...data]
						.sort(
							(a, b) =>
								Number(b.setUp) - Number(a.setUp) ||
								a.name.localeCompare(b.name),
						)
						.map((guild) => {
							// Only servers without the bot need an invite link (null if no client ID is set)
							const inviteUrl = guild.setUp ? null : botInviteUrl(guild.id);
							return (
								<div
									key={guild.id}
									// 312px wide like before (280px of content + padding), but shrinks
									// on screens too narrow for that instead of overflowing
									className="mb-10 relative bg-neutral-700/60 rounded-xl p-4 w-full max-w-78">
									<div className="relative flex flex-col w-full h-40 items-center justify-center p-4 rounded-lg mb-2 ">
										<div
											style={{
												backgroundImage: guild.icon
													? `url('https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png?size=512')`
													: undefined,
												backgroundColor: guild.icon
													? undefined
													: "var(--color-neutral-800)",
												backgroundSize: "100%",
												backgroundPosition: "center",
												filter: "blur(12px)",
											}}
											className="absolute inset-0 "></div>
										{guild.icon ? (
											<Image
												src={`https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png?size=256`}
												alt={`${guild.name} icon`}
												width={256}
												height={256}
												className="relative z-1 size-22 rounded-full border-2 border-neutral-200 bg-neutral-800"
											/>
										) : (
											<div className="relative z-1 flex size-21 items-center  justify-center rounded-full border-2  border-neutral-400 bg-neutral-800 text-3xl font-semibold text-neutral-200 leading-none ">
												<span className="text-center mt-2 ">
													{guild.name
														.split(" ")
														.map((word) => word[0])
														.join("")
														.slice(0, 3)}
												</span>
											</div>
										)}
									</div>
									<div className="flex justify-between w-full relative gap-4 flex-row mt-6 wrap-normal">
										<div className="flex flex-col mt-2 w-[50%]">
											<span className="truncate">{guild.name}</span>
										</div>

										{guild.setUp ? (
											<Link
												className="bg-neutral-700 p-2 rounded-md hover:bg-neutral-600 transition h-10 "
												href={`/dashboard/${guild.id}/home`}>
												Manage
											</Link>
										) : (
											// The bot isn't in this server yet: open Discord's invite
											// screen with this server already selected
											<a
												className="bg-brand-700 p-2 rounded-md hover:bg-brand-600 transition h-10 "
												href={inviteUrl ?? undefined}
												title={
													inviteUrl
														? undefined
														: "Set NEXT_PUBLIC_DISCORD_CLIENT_ID to enable the invite link"
												}
												target="_blank"
												rel="noopener noreferrer">
												Add to Server
											</a>
										)}
									</div>
								</div>
							);
						})}
				</section>
			)}
		</>
	);
}
