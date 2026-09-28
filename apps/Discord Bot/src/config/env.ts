import 'dotenv/config';
import { z } from 'zod';

/**
 * Environment configuration for the bot.
 *
 * `dotenv/config` loads `.env` from the current working directory (the bot's folder when run
 * through pnpm/turbo), then the schema below validates it. If anything is missing or malformed
 * the bot refuses to start and lists every problem at once, instead of failing later at the
 * first place that happens to read the bad value.
 *
 * Import `env` from here rather than reading `process.env` directly, so every value is typed and
 * already validated.
 */

// Discord IDs ("snowflakes") are 17-20 digit numeric strings
const snowflake = z.string().regex(/^\d{17,20}$/, 'must be a Discord ID (17-20 digits)');

// Treat `KEY=""` in .env the same as leaving the key out, so optional IDs can be blanked
const optionalSnowflake = z.preprocess((value) => (value === '' ? undefined : value), snowflake.optional());

const envSchema = z.object({
  // Bot token from the Discord developer portal (Bot tab)
  BOT_TOKEN: z.string().min(1, 'BOT_TOKEN is required'),
  // Base URL of the Loki backend API
  BACKEND_URL: z.url().default('http://localhost:4000'),
  // Sent to the backend as `Authorization: Bot <secret>`; must match the backend's BOT_API_SECRET
  BOT_API_SECRET: z.string().min(1, 'BOT_API_SECRET is required'),
  // When set, slash commands are registered to this one guild instead of globally. Guild commands
  // update instantly, which is what you want while developing. Leave unset in production.
  DEV_GUILD_ID: optionalSnowflake,
  // Channel that receives "joined a new guild" notices. Unset = don't post them.
  LOG_CHANNEL_ID: optionalSnowflake,
  // Channel that receives critical error reports. Unset = errors are only written to the console.
  CRITICAL_ERROR_CHANNEL_ID: optionalSnowflake,
  // Lowest level the logger prints; "debug" shows everything
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
});

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  const issues = parsedEnv.error.issues
    .map((issue) => {
      const name = issue.path.join('.') || 'unknown';
      return `${name}: ${issue.message}`;
    })
    .join('\n');

  throw new Error(`Invalid bot environment configuration:\n${issues}`);
}

export const env = Object.freeze(parsedEnv.data);
