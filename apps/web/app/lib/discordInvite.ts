// The bot's Discord application ID (developer portal → General Information → Application ID).
// It's public, not a secret, but has to be NEXT_PUBLIC_* to be readable in the browser.
const CLIENT_ID = process.env.NEXT_PUBLIC_DISCORD_CLIENT_ID;

/**
 * The permissions the invite asks for: exactly what the bot's features use, nothing broader.
 *   View Channels, Send Messages, Embed Links, Read Message History  (replies and notices)
 *   Kick Members, Ban Members                                        (/kick, /ban, /unban)
 *   Manage Roles                                                     (/mute, /unmute: the mute role)
 *   Timeout Members                                                  (/timeout, /remove-timeout)
 * Computed with discord.js's PermissionFlagsBits; recompute it when a feature needs more.
 */
const BOT_PERMISSIONS = "1099780148230";

/**
 * The "Add to Discord" link, or null when NEXT_PUBLIC_DISCORD_CLIENT_ID isn't set.
 * @param guildId Preselects that server in Discord's invite screen (e.g. from the dashboard)
 */
export function botInviteUrl(guildId?: string): string | null {
	if (!CLIENT_ID) {
		return null;
	}

	const params = new URLSearchParams({
		client_id: CLIENT_ID,
		// `bot` adds the bot user; `applications.commands` registers its slash commands
		scope: "bot applications.commands",
		permissions: BOT_PERMISSIONS,
	});
	if (guildId) {
		params.set("guild_id", guildId);
		params.set("disable_guild_select", "true");
	}
	return `https://discord.com/oauth2/authorize?${params}`;
}
