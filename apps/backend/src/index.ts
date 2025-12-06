import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import "dotenv/config";
import { DataSource } from "typeorm";
import "reflect-metadata";
import { router as baseRouter } from "./routes/base-router";

import { User } from "./models/User";
import { ModerationEvents } from "./models/Moderation";
import session from "express-session";

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
	host: process.env.DB_HOST || "localhost",
	port: parseInt(process.env.DB_PORT || "5432"),
	username: process.env.DB_USER || "postgres",
	password: process.env.DB_PASSWORD || "cupiddev",
	database: process.env.DB_NAME || "Loki",
	entities: [User, ModerationEvents],
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
