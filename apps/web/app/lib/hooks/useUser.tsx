"use client";
import { redirect } from "next/navigation";
import { createContext, ReactNode, useState } from "react";

type User = {
	id: string;
	username: string;
	avatarHash: string | null;
};

type UserContextType = {
	user: User | null;
	isLoading: boolean;
	fetchUser: () => Promise<void>;
	login: () => void;
	logout: () => void;
	error: boolean;
};

const API_URL = process.env.BASE_API_URL ?? "http://localhost:4000";

const userContext = createContext<UserContextType | null>(null);

export function UserProvider({ children }: { children: ReactNode }) {
	const [user, setUser] = useState<User | null>(null);
	const [isLoading, setIsLoading] = useState<boolean>(false);
	const [error, setError] = useState<boolean>(false);

	const login = async () => {
		return redirect(`${API_URL}/auth/login`);
	};

	const logout = () => {
		return redirect(`${API_URL}/auth/logout`);
	};

	const fetchUser = async () => {
		setIsLoading(true);

		try {
			const res = await fetch(`${API_URL}/auth/@me`, {
				method: "GET",
				credentials: "include",
			});
			if (!res.ok) {
				throw new Error("Failed to fetch user");
			}
			const data: User = await res.json();
			setUser(data);
		} catch (err) {
			console.error(err);
			setError(true);
			setUser(null);
		}
	};

	return (
		<userContext.Provider
			value={{ user, isLoading, login, logout, error, fetchUser }}>
			{children}
		</userContext.Provider>
	);
}
