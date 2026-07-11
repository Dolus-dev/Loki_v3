import express from "express";
import { APIUser, RESTPostOAuth2AccessTokenResult } from "discord.js";
import { env } from "../../../config/env";
import {
	exchangeCodeForToken,
	fetchDiscordUser,
} from "../../../lib/discordInteractions";
import { AppDataSource } from "../../..";
import { User } from "../../../models/User";

export const router = express.Router();

const FRONTEND_URL = env.FRONTEND_ORIGIN;

router.get("/", async (req, res) => {
	const { code, state } = req.query;
	const storedState = await req.cookies["auth_state"];

	if (!state || state !== storedState) {
		void res.status(401).send({ error: "State mismatch or missing" });
		return;
	}

	if (!code) {
		void res.status(400).send({ error: "Authorization code missing" });
		return;
	}

	// Exchange code for tokens logic goes here
	let tokenResponse: RESTPostOAuth2AccessTokenResult;
	try {
		tokenResponse = await exchangeCodeForToken(code.toString());
	} catch (error) {
		void res.status(500).send({ error: "Failed to exchange code for token" });
		return;
	}

	let discordUser: APIUser;
	try {
		discordUser = await fetchDiscordUser(tokenResponse.access_token);
	} catch (error) {
		void res.status(500).send({ error: "Failed to fetch Discord user" });
		return;
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
		},
	);
	req.session.userId = discordUser.id;
	req.session.accessToken = tokenResponse.access_token;
	req.session.refreshToken = tokenResponse.refresh_token;

	void res.redirect(`${FRONTEND_URL}/`);
	return;
});
