import "dotenv/config";
import { z } from "zod";

// An optional value where an empty string (KEY="" in a .env file) counts as not set
const optionalString = z.preprocess(
	(value) => (value === "" ? undefined : value),
	z.string().optional(),
);

const envSchema = z
	.object({
		NODE_ENV: z
			.enum(["development", "test", "production"])
			.default("development"),
		PORT: z.coerce.number().int().positive().default(4000),
		// Redis connection URL, holding the host, port, user and password in one value:
		//   redis://default:<password>@localhost:6379   (local, plain)
		//   rediss://default:<password>@<host>:6379     (hosted, e.g. Upstash: rediss = TLS)
		REDIS_URL: z
			.string()
			.min(1, "REDIS_URL is required")
			.refine(
				(value) => /^rediss?:\/\/[^/]/.test(value),
				"REDIS_URL must be a redis:// or rediss:// URL",
			),
		SESSION_SECRET: z.string().min(1, "SESSION_SECRET is required"),
		FRONTEND_ORIGIN: z.string().min(1, "FRONTEND_ORIGIN is required"),
		BACKEND_ORIGIN: z.string().min(1, "BACKEND_ORIGIN is required"),
		DISCORD_CLIENT_ID: z.string().min(1, "DISCORD_CLIENT_ID is required"),
		DISCORD_CLIENT_SECRET: z
			.string()
			.min(1, "DISCORD_CLIENT_SECRET is required"),
		DISCORD_REDIRECT_URI: z
			.string()
			.min(1, "DISCORD_REDIRECT_URI is required")
			.default("http://localhost:4000/auth/callback"),
		BOT_TOKEN: z.string().min(1, "BOT_TOKEN is required"),
		BOT_API_SECRET: z.string().min(1, "BOT_API_SECRET is required"),
		// The PostgreSQL connection string. Either name works: DATABASE_URL (local, Neon, most
		// hosts) or DATABASE_POSTGRES_URL (what Vercel's Supabase integration adds when connected
		// with the "DATABASE" prefix; it's Supabase's pooled connection). If both are set,
		// DATABASE_URL wins. The integration's other variables (Supabase keys, Prisma URL, ...)
		// aren't used by the backend.
		DATABASE_URL: optionalString,
		DATABASE_POSTGRES_URL: optionalString,
		// The CA certificate (PEM text) to verify the database's TLS certificate against, for
		// hosts whose certificates aren't signed by a public CA, e.g. Supabase (download it from
		// Supabase: Project Settings > Database > SSL Configuration). Optional; when set, the
		// connection is always TLS and fully verified (see src/data-source.ts).
		DATABASE_CA_CERT: optionalString,
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
	})
	.refine((config) => !(config.DB_RESET && config.NODE_ENV === "production"), {
		message: "DB_RESET cannot be enabled when NODE_ENV is production",
		path: ["DB_RESET"],
	})
	.refine((config) => config.DATABASE_URL || config.DATABASE_POSTGRES_URL, {
		message: "DATABASE_URL (or DATABASE_POSTGRES_URL) is required",
		path: ["DATABASE_URL"],
	})
	// The rest of the backend only reads env.DATABASE_URL: resolve it to whichever was given
	.transform(({ DATABASE_POSTGRES_URL, ...config }) => ({
		...config,
		DATABASE_URL: (config.DATABASE_URL ?? DATABASE_POSTGRES_URL) as string,
	}));

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
