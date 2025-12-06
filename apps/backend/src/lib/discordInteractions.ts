import { APIUser, RESTPostOAuth2AccessTokenResult } from "discord.js";

export async function exchangeCodeForToken(
	code: string
): Promise<RESTPostOAuth2AccessTokenResult> {
	const CLIENT_ID = process.env.DISCORD_CLIENT_ID!;
	const CLIENT_SECRET = process.env.DISCORD_CLIENT_SECRET!;
	const REDIRECT_URI =
		process.env.DISCORD_REDIRECT_URI ?? "http://localhost:4000/auth/callback";

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
		throw new Error(`Failed to exchange code for token: ${res.statusText}`);
	}

	const data: RESTPostOAuth2AccessTokenResult = await res.json();
	return data;
}

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
