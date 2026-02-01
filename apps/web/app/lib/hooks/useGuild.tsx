"use client";

import {
	createContext,
	ReactNode,
	useContext,
	useEffect,
	useState,
} from "react";
import useSWR from "swr";

type GuildContextType = {
	roles: { id: string; name: string; color: string | null }[];

	isLoading: boolean;
	error: boolean;
	mutate: () => void;
};

const BACKEND_API_URL = process.env.BASE_API_URL || "http://localhost:4000";
const DISCORD_API_URL = "https://discord.com/api/v10";

const guildContext = createContext<GuildContextType | null>(null);
