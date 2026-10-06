import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import "reflect-metadata";
import { router as baseRouter } from "./routes/base-router";
import { env } from "./config/env";
import { errorHandler } from "./lib/Middlewares/errorHandler";
import session from "express-session";
import { RedisStore } from "connect-redis";
import { AppDataSource } from "./data-source";

import { createClient } from "redis";

// The database connection lives in its own module (so scripts can use it without starting the
// server); re-exported here because the rest of the backend imports it from this file
export { AppDataSource };

export const redisClient = createClient({
	RESP: 3,
	username: "default",
	password: env.REDIS_PASSWORD,
	// Hosted Redis (e.g. Upstash) usually only accepts TLS connections: set REDIS_TLS=true
	socket: env.REDIS_TLS
		? { host: env.REDIS_HOST, port: env.REDIS_PORT, tls: true }
		: { host: env.REDIS_HOST, port: env.REDIS_PORT },
});

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

// Sessions are stored in Redis, so every server instance sees the same logins. That's what
// keeps users logged in on Vercel, where any of several instances can handle a request, and
// it also means a restart no longer logs everyone out.
app.use(
	session({
		store: new RedisStore({ client: redisClient, prefix: "session:" }),
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

		// On Vercel, this port listener is how the platform finds the Express app (see
		// https://vercel.com/docs/frameworks/backend/express); locally it's a normal server
		app.listen(PORT, () => {
			console.log(`Server is running on ${env.BACKEND_ORIGIN}`);
		});
	} catch (error) {
		console.error("Error starting server:", error);
		process.exit(1);
	}
}

startServer();
