import express from "express";
import crypto from "crypto";
import { env } from "../../../config/env";

export const router = express.Router();

const CLIENT_ID = env.DISCORD_CLIENT_ID;
const REDIRECT_URI = env.DISCORD_REDIRECT_URI;
const SCOPES = ["identify", "guilds", "guilds.members.read"];

router.get("/", async (req, res) => {
	// Random state stored in a cookie and echoed back by Discord; the callback
	// route compares the two to protect against CSRF. "lax" is required (not
	// "strict") so the cookie is still sent on Discord's redirect back to us.
	const state = crypto.randomBytes(16).toString("hex");
	res.cookie("auth_state", state, {
		httpOnly: true,
		secure: env.NODE_ENV === "production",
		sameSite: "lax",
	});

	const authUrl = new URL("https://discord.com/api/v10/oauth2/authorize");
	authUrl.searchParams.set("client_id", CLIENT_ID);
	authUrl.searchParams.set("redirect_uri", REDIRECT_URI);
	authUrl.searchParams.set("response_type", "code");
	authUrl.searchParams.set("scope", SCOPES.join(" "));
	authUrl.searchParams.set("state", state);

	console.log("Redirecting to Discord OAuth2 login");

	void res.redirect(authUrl.toString());
	return;
});
