import express from "express";
import crypto from "crypto";

import "dotenv/config";

export const router = express.Router();

const CLIENT_ID = process.env.DISCORD_CLIENT_ID!;
const REDIRECT_URI =
	process.env.DISCORD_REDIRECT_URI ?? "http://localhost:4000/auth/callback";
const SCOPES = ["identify", "guilds", "guilds.members.read"];

router.get("/", async (req, res) => {
	const state = crypto.randomBytes(16).toString("hex");
	res.cookie("auth_state", state, {
		httpOnly: true,
		secure: process.env.NODE_ENV === "production",
		sameSite: "lax",
	});

	const authUrl = new URL("https://discord.com/api/v10/oauth2/authorize");
	authUrl.searchParams.set("client_id", CLIENT_ID);
	authUrl.searchParams.set("redirect_uri", REDIRECT_URI);
	authUrl.searchParams.set("response_type", "code");
	authUrl.searchParams.set("scope", SCOPES.join(" "));
	authUrl.searchParams.set("state", state);

	console.log("Redirecting to Discord OAuth2 URL:", authUrl.toString());

	return res.redirect(authUrl.toString());
});
