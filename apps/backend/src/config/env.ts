import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
	NODE_ENV: z
		.enum(["development", "test", "production"])
		.default("development"),
	PORT: z.coerce.number().int().positive().default(4000),
	REDIS_PASSWORD: z.string().min(1, "REDIS_PASSWORD is required"),
	SESSION_SECRET: z.string().min(1, "SESSION_SECRET is required"),
	FRONTEND_ORIGIN: z.string().min(1, "FRONTEND_ORIGIN is required"),
	BACKEND_ORIGIN: z.string().min(1, "BACKEND_ORIGIN is required"),
	DISCORD_CLIENT_ID: z.string().min(1, "DISCORD_CLIENT_ID is required"),
	DISCORD_CLIENT_SECRET: z.string().min(1, "DISCORD_CLIENT_SECRET is required"),
	DISCORD_REDIRECT_URI: z
		.string()
		.min(1, "DISCORD_REDIRECT_URI is required")
		.default("http://localhost:4000/auth/callback"),
	BOT_TOKEN: z.string().min(1, "BOT_TOKEN is required"),
	BOT_API_SECRET: z.string().min(1, "BOT_API_SECRET is required"),
	REDIS_HOST: z.string().min(1, "REDIS_HOST is required"),
	REDIS_PORT: z.coerce.number().int().positive(),
	DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
	// Key for encrypting stored Discord tokens: 32 random bytes, base64-encoded
	TOKEN_ENCRYPTION_KEY: z
		.string()
		.refine(
			(value) => Buffer.from(value, "base64").length === 32,
			"TOKEN_ENCRYPTION_KEY must be 32 bytes, base64-encoded",
		),
	// How many reverse proxies (Nginx, Caddy, a hosting platform, ...) sit between the
	// internet and this server. 0 means none, which is right for local development.
	TRUST_PROXY: z.coerce.number().int().min(0).default(0),
	// When true, the whole database schema (and all its data) is dropped on every start
	DB_RESET: z.stringbool().default(false),
}).refine((config) => !(config.DB_RESET && config.NODE_ENV === "production"), {
	message: "DB_RESET cannot be enabled when NODE_ENV is production",
	path: ["DB_RESET"],
});

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
	const issues = parsedEnv.error.issues
		.map((issue) => {
			const name = issue.path.join(".") || "unknown";
			return `${name}: ${issue.message}`;
		})
		.join("\n");

	throw new Error(`Invalid backend environment configuration:\n${issues}`);
}

export const env = Object.freeze(parsedEnv.data);
