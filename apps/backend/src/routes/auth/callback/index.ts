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

router.get("/", async (req, res) => {
	const { code, state } = req.query;
	const storedState = req.cookies["auth_state"];

	const requestBody = req.body;
	console.log("Request Body:", requestBody);

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

	res.cookie("session_id", req.session.userId, {
		httpOnly: true,
		secure: process.env.NODE_ENV === "production",
		sameSite: "strict",
		maxAge: 7 * 24 * 60 * 60 * 1000, // 1 week
	});

	return res.status(200).send({ message: "Callback handled successfully" });
});
