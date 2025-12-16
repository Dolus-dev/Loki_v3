import { APIGuild, APIUser, RESTPostOAuth2AccessTokenResult } from "discord.js";

/**
 *  Exchanges an authorization code for an access token
 * @param code The authorization code received from Discord
 * @returns The access token result from Discord
 */
export async function exchangeCodeForToken(
	code: string
): Promise<RESTPostOAuth2AccessTokenResult> {
	const CLIENT_ID = process.env.DISCORD_CLIENT_ID!;
	const CLIENT_SECRET = process.env.DISCORD_CLIENT_SECRET!;
	const REDIRECT_URI =
		process.env.DISCORD_REDIRECT_URI || "http://localhost:4000/auth/callback";

	const res = await fetch("https://discord.com/api/v10/oauth2/token", {
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
	});

	if (!res.ok) {
		console.log(await res.text());
		throw new Error(`Failed to exchange code for token: ${res.statusText}`);
	}

	const data: RESTPostOAuth2AccessTokenResult = await res.json();
	return data;
}

/**
 * Refreshes an access token using a refresh token
 * @param refreshToken The refresh token previously received from Discord
 * @returns The new access token result from Discord
 */
export async function refreshToken(
	refreshToken: string
): Promise<RESTPostOAuth2AccessTokenResult> {
	const CLIENT_ID = process.env.DISCORD_CLIENT_ID!;
	const CLIENT_SECRET = process.env.DISCORD_CLIENT_SECRET!;

	const res = await fetch("https://discord.com/api/v10/oauth2/token", {
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
	});
	if (!res.ok) {
		throw new Error(`Failed to refresh token: ${res.statusText}`);
	}
	const data: RESTPostOAuth2AccessTokenResult = await res.json();
	return data;
}

/**
 * Fetches Discord User data using an access token
 * @param accessToken The access token received from Discord
 * @returns The Discord user data
 */
export async function fetchDiscordUser(accessToken: string): Promise<APIUser> {
	const res = await fetch("https://discord.com/api/v10/users/@me", {
		method: "GET",
		headers: {
			Authorization: `Bearer ${accessToken}`,
		},
	});

	if (!res.ok) {
		throw new Error(`Failed to fetch Discord user: ${res.statusText}`);
	}
	const data = await res.json();
	return data;
}

export async function fetchDiscordGuild(guildId: string): Promise<APIGuild> {
	const res = await fetch(`https://discord.com/api/v10/guilds/${guildId}`, {
		method: "GET",
		headers: {
			Authorization: `Bot ${process.env.BOT_TOKEN!}`,
		},
	});

	if (!res.ok) {
		throw new Error(`Failed to fetch Discord guild: ${res.statusText}`);
	}
	const data = await res.json();
	return data;
}

export async function fetchCurrentUserGuilds(
	accessToken: string
): Promise<APIGuild[]> {
	const res = await fetch(`https://discord.com/api/v10/users/@me/guilds`, {
		method: "GET",
		headers: {
			Authorization: `Bearer ${accessToken}`,
		},
	});

	if (!res.ok) {
		throw new Error(`Failed to fetch user guilds: ${res.statusText}`);
	}
	const data = await res.json();
	return data;
}
