import {
	APIGuild,
	APIGuildChannel,
	APIGuildMember,
	APIRole,
	APIUser,
	ChannelType,
	RESTPostOAuth2AccessTokenResult,
} from "discord.js";
import { env } from "../config/env";
import { DiscordError } from "./Errors/APIErrorResponse";

const CLIENT_ID = env.DISCORD_CLIENT_ID;
const CLIENT_SECRET = env.DISCORD_CLIENT_SECRET;
const REDIRECT_URI = env.DISCORD_REDIRECT_URI;

function extractDiscordErrorDetails(body: unknown, fallback: string) {
	if (typeof body === "object" && body && "error_description" in body) {
		return String(
			(body as { error_description?: string }).error_description ?? fallback,
		);
	}

	if (typeof body === "object" && body && "message" in body) {
		return String((body as { message?: string }).message ?? fallback);
	}
	return fallback;
}

async function throwDiscordError(
	res: Response,
	fallback: string,
): Promise<never> {
	const body = await res.json().catch(() => null);
	const details = extractDiscordErrorDetails(body, fallback);
	throw new DiscordError(res.status, details);
}

async function fetchWithDiscordRetry(
	request: () => Promise<Response>,
	fallback: string,
): Promise<Response> {
	const res = await request();

	if (res.ok) {
		return res;
	}

	const retryAfter = res.headers.get("retry-after");
	if (retryAfter) {
		const delaySeconds = Number.parseFloat(retryAfter);
		if (!Number.isFinite(delaySeconds) || delaySeconds <= 0) {
			return await throwDiscordError(res, fallback);
		}

		console.warn(
			`Rate limited by Discord. Retrying after ${retryAfter} seconds.`,
		);
		await new Promise((resolve) => setTimeout(resolve, delaySeconds * 1000));
		return fetchWithDiscordRetry(request, fallback);
	}

	return await throwDiscordError(res, fallback);
}

type DiscordUserGuild = {
	id: string;
	name: string;
	icon: string | null;
	permissions: string;
};

type DiscordGuildMember = Pick<APIGuildMember, "roles">;

/**
 *  Exchanges an authorization code for an access token
 * @param code The temporary authorization code received from Discord after user authorization
 * @returns The access token result from Discord
 */
export async function exchangeCodeForToken(
	code: string,
): Promise<RESTPostOAuth2AccessTokenResult> {
	const res = await fetchWithDiscordRetry(
		() =>
			fetch("https://discord.com/api/v10/oauth2/token", {
				method: "POST",
				headers: {
					"Content-Type": "application/x-www-form-urlencoded",
				},
				body: new URLSearchParams({
					client_id: CLIENT_ID,
					client_secret: CLIENT_SECRET,
					grant_type: "authorization_code",
					code: code,
					redirect_uri: REDIRECT_URI,
				}).toString(),
			}),
		"Failed to exchange Discord code for token",
	);

	return (await res.json()) as RESTPostOAuth2AccessTokenResult;
}

/**
 * Uses a previously obtained refresh token to get a new access token
 * @param refreshToken The refresh token issued by Discord during the initial token exchange or a previous refresh
 * @returns The new access token result from Discord
 */
export async function refreshToken(
	refreshToken: string,
): Promise<RESTPostOAuth2AccessTokenResult> {
	const res = await fetchWithDiscordRetry(
		() =>
			fetch("https://discord.com/api/v10/oauth2/token", {
				method: "POST",
				headers: {
					"Content-Type": "application/x-www-form-urlencoded",
				},
				body: new URLSearchParams({
					client_id: CLIENT_ID,
					client_secret: CLIENT_SECRET,
					grant_type: "refresh_token",
					refresh_token: refreshToken,
				}).toString(),
			}),
		"Failed to refresh Discord token",
	);
	return (await res.json()) as RESTPostOAuth2AccessTokenResult;
}

/**
 * Fetches Discord User data using an access token
 * @param accessToken The access token received from Discord
 * @returns The Discord user data
 */
export async function fetchDiscordUser(accessToken: string): Promise<APIUser> {
	const res = await fetchWithDiscordRetry(
		() =>
			fetch("https://discord.com/api/v10/users/@me", {
				method: "GET",
				headers: {
					Authorization: `Bearer ${accessToken}`,
				},
			}),
		"Failed to fetch Discord user",
	);
	return (await res.json()) as APIUser;
}

export async function fetchDiscordGuild(guildId: string): Promise<APIGuild> {
	const res = await fetchWithDiscordRetry(
		() =>
			fetch(`https://discord.com/api/v10/guilds/${guildId}`, {
				method: "GET",
				headers: {
					Authorization: `Bot ${env.BOT_TOKEN}`,
				},
			}),
		"Failed to fetch Discord guild",
	);
	return (await res.json()) as APIGuild;
}

export async function fetchCurrentUserGuilds(
	accessToken: string,
): Promise<DiscordUserGuild[]> {
	const res = await fetchWithDiscordRetry(
		() =>
			fetch(`https://discord.com/api/v10/users/@me/guilds`, {
				method: "GET",
				headers: {
					Authorization: `Bearer ${accessToken}`,
				},
			}),
		"Failed to fetch user guilds",
	);
	return (await res.json()) as DiscordUserGuild[];
}

export async function fetchCurrentGuildMember(
	accessToken: string,
	guildId: string,
): Promise<DiscordGuildMember> {
	const res = await fetchWithDiscordRetry(
		() =>
			fetch(`https://discord.com/api/v10/users/@me/guilds/${guildId}/member`, {
				method: "GET",
				headers: {
					Authorization: `Bearer ${accessToken}`,
				},
			}),
		`Failed to fetch current guild member: ${guildId}`,
	);
	return (await res.json()) as DiscordGuildMember;
}

export async function fetchGuildRoles(guildId: string): Promise<APIRole[]> {
	const res = await fetchWithDiscordRetry(
		() =>
			fetch(`https://discord.com/api/v10/guilds/${guildId}/roles`, {
				method: "GET",
				headers: {
					Authorization: `Bot ${env.BOT_TOKEN}`,
				},
			}),
		`Failed to fetch guild roles: ${guildId}`,
	);
	return (await res.json()) as APIRole[];
}

export async function fetchGuildChannels(
	guildId: string,
	channelType?: ChannelType[],
): Promise<APIGuildChannel[]> {
	const res = await fetchWithDiscordRetry(
		() =>
			fetch(`https://discord.com/api/v10/guilds/${guildId}/channels`, {
				method: "GET",
				headers: {
					Authorization: `Bot ${env.BOT_TOKEN}`,
				},
			}),
		`Failed to fetch guild channels: ${guildId}`,
	);

	const data: APIGuildChannel[] = await res.json();
	return channelType?.length
		? data.filter((channel) => channelType.includes(channel.type))
		: data;
}
