import { z } from "zod";

/**
 * A Discord snowflake ID (guild, channel, role, user, ...): 17-20 digits.
 */
export const discordSnowflake = z
	.string()
	.regex(/^\d{17,20}$/, "Invalid Discord snowflake ID");
