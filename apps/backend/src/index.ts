import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { DataSource } from "typeorm";
import "reflect-metadata";
import { router as baseRouter } from "./routes/base-router";
import { env } from "./config/env";
import { errorHandler } from "./lib/Middlewares/errorHandler";

import { User } from "./models/User";
import { ModerationEvents } from "./models/Moderation/ModerationEvents";
import session from "express-session";
import { Guild } from "./models/Guild";
import { DashboardSettings } from "./models/DashboardSettings";
import { TicketSettings } from "./models/Tickets/TicketSettings";
import { Tickets } from "./models/Tickets/Tickets";
import { AuditLog } from "./models/Moderation/Logging/AuditLog";
import { LoggingSettings } from "./models/Moderation/Logging/ServerLoggingSettings";
import { BanSettings } from "./models/Moderation/Action Settings/BanSettings";
import { KickSettings } from "./models/Moderation/Action Settings/KickSettings";
import { MuteSettings } from "./models/Moderation/Action Settings/MuteSettings";
import { TimeoutSettings } from "./models/Moderation/Action Settings/TimeoutSettings";
import { WarnSettings } from "./models/Moderation/Action Settings/WarnSettings";
import { StarboardSettings } from "./models/Fun/Starboard";
import { ThrowCommand } from "./models/Fun/Throw";

import { createClient, createClientPool } from "redis";

export const redisClient = createClient(
	{
		RESP: 3,
		username: "default",
		password: env.REDIS_PASSWORD,
		socket: {
			host: env.REDIS_HOST,
			port: env.REDIS_PORT,
		},
	},
	// {
	// 	clientSideCache: {
	// 		ttl: 10000,
	// 		maxEntries: 1000,
	// 		evictPolicy: "LRU",
	// 	},
	// 	minimum: 5,
	// }
);

redisClient.on("error", (err) => console.error("Redis Client Error", err));
redisClient.on("connect", () => console.log("Connecting to Redis server"));
redisClient.on("ready", () => console.log("Connected to Redis server"));

const app = express();
app.disable("x-powered-by"); // Don't advertise the framework

// Behind a reverse proxy that handles HTTPS, requests reach this server as plain HTTP.
// Trusting the proxy's X-Forwarded-* headers lets Express see the real protocol (needed to
// set `secure` session cookies) and the real client IP (needed for rate limiting).
// Only enable this when a proxy really is in front: otherwise clients could forge the headers.
if (env.TRUST_PROXY > 0) {
	app.set("trust proxy", env.TRUST_PROXY);
}
app.use(cookieParser());
app.use(express.json());

// No `store` is configured, so sessions live in memory and are lost on restart
app.use(
	session({
		secret: env.SESSION_SECRET,
		resave: false,
		saveUninitialized: false,
		cookie: {
			httpOnly: true,
			secure: env.NODE_ENV === "production",
			sameSite: "strict",
			maxAge: 7 * 24 * 60 * 60 * 1000, // 1 week
		},
	}),
);

app.use(
	cors({
		credentials: true,
		origin: env.FRONTEND_ORIGIN,
	}),
);

app.use(baseRouter);

// Must come after all routes so it catches errors thrown by them
app.use(errorHandler);

const PORT = env.PORT;

export const AppDataSource = new DataSource({
	type: "postgres",
	url: env.DATABASE_URL,
	// ssl: true,
	entities: [
		User,
		ModerationEvents,
		Guild,
		DashboardSettings,
		TicketSettings,
		Tickets,
		AuditLog,
		LoggingSettings,
		BanSettings,
		KickSettings,
		MuteSettings,
		TimeoutSettings,
		WarnSettings,
		StarboardSettings,
		ThrowCommand,
	],
	// Outside production the schema is auto-synced to match the entities. Data is
	// kept unless DB_RESET=true, which drops everything on every start.
	synchronize: env.NODE_ENV !== "production" ? true : false,
	dropSchema: env.DB_RESET,
	logging: false,
});

const REDIS_CONNECT_TIMEOUT_MS = 10_000;

async function startServer(): Promise<void> {
	try {
		// Connect to Redis first so the server never accepts requests without its cache.
		// node-redis retries a refused connection forever, so give up after a timeout.
		await Promise.race([
			redisClient.connect(),
			new Promise<never>((_, reject) =>
				setTimeout(
					() => reject(new Error("Timed out connecting to Redis")),
					REDIS_CONNECT_TIMEOUT_MS,
				).unref(),
			),
		]);
		await redisClient.ping();

		await AppDataSource.initialize();
		console.log("Data Source has been initialized!");

		app.listen(PORT, () => {
			console.log(`Server is running on ${env.BACKEND_ORIGIN}`);
		});
	} catch (error) {
		console.error("Error starting server:", error);
		process.exit(1);
	}
}

startServer();
