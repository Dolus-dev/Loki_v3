"use client";

import Link from "next/link";
import useSWR from "swr";
import Image from "next/image";
import { useUser } from "../lib/hooks/useUser";
import { redirect } from "next/navigation";
import { useEffect } from "react";

const fetcher = async (url: string) => {
	const res = await fetch(url, {
		method: "GET",
		credentials: "include",
	});

	if (!res.ok) {
		throw new Error("Failed to fetch");
	}
	return res.json();
};

const backendUrl = process.env.BASE_API_URL ?? "http://localhost:4000";

export default function ServerSelectorDashboardPage() {
	const { user, isLoading: userLoading } = useUser();

	if (!userLoading && !user) {
		redirect("/login");
	}

	const { data, error, isLoading } = useSWR<
		{ id: string; name: string; icon: string | null; setUp: boolean }[]
	>(`${backendUrl}/users/@me/guilds`, fetcher);

	return (
		<>
			{data && (
				<section className="grid  grid-cols-2 xl:grid-cols-3 content-evenly justify-items-center place-self-center gap-x-14 relative mt-10">
					{data
						.sort((a, b) => a.name.localeCompare(b.name))
						.map((guild) => {
							return (
								<div
									key={guild.id}
									className="mb-10 relative bg-neutral-700/60 rounded-xl p-4   ">
									<div className="relative flex flex-col w-70 h-40 items-center justify-center p-4 rounded-lg mb-2 ">
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
											<div className="relative z-10 flex size-21 items-center  justify-center rounded-full border-2  border-neutral-400 bg-neutral-800 text-3xl font-semibold text-neutral-200 leading-none ">
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
									<div className="flex justify-between w-70 relative gap-4 flex-row mt-6 wrap-normal">
										<div className="flex flex-col mt-2 w-[50%]">
											<span className="truncate">{guild.name}</span>
										</div>

										<Link
											className="bg-neutral-700 p-2 rounded-md hover:bg-neutral-600 transition h-10 "
											href={
												//TODO: Change href to bot invite link if guild is not set up
												guild.setUp
													? `/dashboard/${guild.id}/home`
													: `/dashboard/${guild.id}/home`
											}>
											{guild.setUp ? "Manage" : "Add to Server"}
										</Link>
									</div>
								</div>
							);
						})}
				</section>
			)}
		</>
	);
}
