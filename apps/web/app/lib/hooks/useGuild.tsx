"use client";

import {
	createContext,
	ReactNode,
	useContext,
	useEffect,
	useState,
} from "react";
import useSWR from "swr";
import { API_URL } from "../api";

type GuildContextType = {
	roles: { id: string; name: string; color: string | null }[];

	isLoading: boolean;
	error: boolean;
	mutate: () => void;
};

const BACKEND_API_URL = API_URL;
const DISCORD_API_URL = "https://discord.com/api/v10";

const guildContext = createContext<GuildContextType | null>(null);
