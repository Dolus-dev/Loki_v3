import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import "dotenv/config";
import { DataSource } from "typeorm";
import "reflect-metadata";
import { router as baseRouter } from "./routes/base-router";

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

const app = express();
app.use(cookieParser());
app.use(express.json());

app.use(
	session({
		secret: process.env.SESSION_SECRET || "DevelopmentSecret",
		resave: false,
		saveUninitialized: false,
		cookie: {
			httpOnly: true,
			secure: process.env.NODE_ENV === "production",
			sameSite: "strict",
			maxAge: 7 * 24 * 60 * 60 * 1000, // 1 week
		},
	})
);

app.use(
	cors({
		credentials: true,
		origin: process.env.FRONTEND_ORIGIN || "http://localhost:3000",
	})
);

app.use(baseRouter);

const PORT = process.env.PORT || 4000;

export const AppDataSource = new DataSource({
	type: "postgres",
	url:
		// process.env.DATABASE_URL ??
		"postgresql://postgres:cupiddev@localhost:5432/Loki",
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
	synchronize: process.env.NODE_ENV !== "production" ? true : false,
	dropSchema: process.env.NODE_ENV !== "production" ? true : false,
	logging: false,
});

async function startServer() {
	try {
		await AppDataSource.initialize();
		console.log("Data Source has been initialized!");

		app.listen(PORT, () => {
			console.log(
				`Server is running on ${process.env.BACKEND_ORIGIN || `http://localhost:${PORT}`}`
			);
		});
	} catch (error) {
		console.error("Error starting server:", error);
		process.exit(1);
	}
}

startServer();
