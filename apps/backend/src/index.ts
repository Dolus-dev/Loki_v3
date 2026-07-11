import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { DataSource } from "typeorm";
import "reflect-metadata";
import { router as baseRouter } from "./routes/base-router";
import { env } from "./config/env";

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

(async () => {
	redisClient.on("error", (err) => console.error("Redis Client Error", err));
	redisClient.on("connect", () => console.log("Connecting to Redis server"));
	redisClient.on("ready", () => console.log("Connected to Redis server"));
	await redisClient.connect();

	await redisClient.ping();
})();

const app = express();
app.use(cookieParser());
app.use(express.json());

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
	synchronize: env.NODE_ENV !== "production" ? true : false,
	dropSchema: env.NODE_ENV !== "production" ? true : false,
	logging: false,
});

async function startServer(): Promise<void> {
	try {
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
