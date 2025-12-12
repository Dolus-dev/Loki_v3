import express from "express";
import "dotenv/config";
import { APIUser, RESTPostOAuth2AccessTokenResult } from "discord.js";
import {
	exchangeCodeForToken,
	fetchDiscordUser,
} from "../../../lib/discordInteractions";
import { AppDataSource } from "../../..";
import { User } from "../../../models/User";

export const router = express.Router();

const FRONTEND_URL = process.env.FRONTEND_URL ?? "http://localhost:3000";

router.get("/", async (req, res) => {
	const { code, state } = req.query;
	const storedState = await req.cookies["auth_state"];

	if (!state || state !== storedState) {
		return res.status(401).send({ error: "State mismatch or missing" });
	}

	if (!code) {
		return res.status(400).send({ error: "Authorization code missing" });
	}

	// Exchange code for tokens logic goes here
	let tokenResponse: RESTPostOAuth2AccessTokenResult;
	try {
		tokenResponse = await exchangeCodeForToken(code.toString());
	} catch (error) {
		return res.status(500).send({ error: "Failed to exchange code for token" });
	}

	let discordUser: APIUser;
	try {
		discordUser = await fetchDiscordUser(tokenResponse.access_token);
	} catch (error) {
		return res.status(500).send({ error: "Failed to fetch Discord user" });
	}

	const userRepository = AppDataSource.getRepository(User);

	await userRepository.upsert(
		{
			id: discordUser.id,
			username: discordUser.global_name || discordUser.username,
			avatarHash: discordUser.avatar || null,
			accessToken: tokenResponse.access_token,
			refreshToken: tokenResponse.refresh_token,
		},
		{
			conflictPaths: ["id"],
			skipUpdateIfNoValuesChanged: true,
		}
	);
	req.session.userId = discordUser.id;
	req.session.accessToken = tokenResponse.access_token;
	req.session.refreshToken = tokenResponse.refresh_token;

	return res.redirect(`${FRONTEND_URL}/`);
});
