import { z } from "zod";

/**
 * A Discord snowflake ID (guild, channel, role, user, ...): 17-20 digits.
 */
export const discordSnowflake = z
	.string()
	.regex(/^\d{17,20}$/, "Invalid Discord snowflake ID");

/** Largest value a Postgres `integer` column can hold. */
export const MAX_INT32 = 2_147_483_647;

/** A non-negative whole number of seconds that fits in a Postgres `integer` column. */
export const durationSeconds = z.number().int().min(0).max(MAX_INT32);

/**
 * An array of unique Discord snowflake IDs, capped at `max` entries.
 * Duplicates are dropped rather than rejected.
 */
export const snowflakeList = (max: number) =>
	z
		.array(discordSnowflake)
		.max(max)
		.transform((ids) => [...new Set(ids)]);
