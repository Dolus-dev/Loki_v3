"use client";
import {
	createContext,
	ReactNode,
	useContext,
	useEffect,
	useState,
} from "react";
import useSWR from "swr";

type User = {
	id: string;
	username: string;
	avatarHash: string | null;
};

type UserContextType = {
	user: User | null;
	isLoading: boolean;
	error: boolean;
};

const API_URL = process.env.BASE_API_URL || "http://localhost:4000";

const userContext = createContext<UserContextType | null>(null);

const fetcher = async (url: string) => {
	const res = await fetch(url, {
		method: "GET",
		credentials: "include",
	});
	if (res.status === 204 || res.status === 401 || res.status === 403) {
		return null;
	}

	if (!res.ok) {
		const text = await res.text().catch(() => "");
		console.error("fetch /users/@me failed:", res.status, text);
		throw new Error("Failed to fetch user");
	}
	return res.json();
};

export function UserProvider({ children }: { children: ReactNode }) {
	const { data, error, isLoading } = useSWR<User>(
		`${API_URL}/users/@me`,
		fetcher,
		{
			revalidateOnFocus: false,
			errorRetryCount: 1,
		}
	);

	const user = data ?? null;
	useEffect(() => {
		if (!isLoading) {
			console.log("UserProvider updated:", { user, error });
		}
	}, [user, error, isLoading]);

	console.log("UserProvider state:", { user, isLoading, error });

	return (
		<userContext.Provider value={{ user, isLoading, error }}>
			{children}
		</userContext.Provider>
	);
}

export function useUser() {
	const context = useContext(userContext);
	if (!context) {
		throw new Error("useUser must be used within a UserProvider");
	}
	return context;
}
