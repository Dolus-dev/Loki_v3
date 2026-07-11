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
