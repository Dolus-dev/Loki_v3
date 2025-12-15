"use client";

import useSWR from "swr";

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
	const { data, error, isLoading } = useSWR(
		`${backendUrl}/users/@me/guilds`,
		fetcher
	);

	return <div>Server Selector Dashboard Page</div>;
}
