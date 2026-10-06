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

// Everything (host, port, user, password) comes from REDIS_URL; a rediss:// URL also turns on
// TLS, which hosted Redis such as Upstash requires
export const redisClient = createClient({
	RESP: 3,
	url: env.REDIS_URL,
});

redisClient.on("error", (err) => console.error("Redis Client Error", err));
redisClient.on("connect", () => console.log("Connecting to Redis server"));
redisClient.on("ready", () => console.log("Connected to Redis server"));

const CONNECT_TIMEOUT_MS = 10_000;

function withTimeout<T>(promise: Promise<T>, what: string): Promise<T> {
	return Promise.race([
		promise,
		new Promise<never>((_, reject) =>
			setTimeout(
				() => reject(new Error(`Timed out ${what}`)),
				CONNECT_TIMEOUT_MS,
			).unref(),
		),
	]);
}

let connecting: Promise<void> | null = null;

/**
 * Connects to Redis and the database, once. Every caller shares the same attempt, so concurrent
 * requests on a cold start don't open duplicate connections. If it fails, the next call tries
 * again (on Vercel, the next request), rather than leaving the instance broken for good.
 *
 * node-redis retries a refused connection forever, so each step gives up after a timeout.
 */
function connectServices(): Promise<void> {
	connecting ??= (async () => {
		if (!redisClient.isOpen) {
			await withTimeout(redisClient.connect(), "connecting to Redis");
		}
		await withTimeout(redisClient.ping(), "waiting for Redis");

		if (!AppDataSource.isInitialized) {
			await AppDataSource.initialize();
			console.log("Data Source has been initialized!");
		}
	})().catch((error) => {
		connecting = null;
		throw error;
	});
	return connecting;
}

const app = express();
app.disable("x-powered-by"); // Don't advertise the framework

// Behind a reverse proxy that handles HTTPS, requests reach this server as plain HTTP.
// Trusting the proxy's X-Forwarded-* headers lets Express see the real protocol (needed to
// set `secure` session cookies) and the real client IP (needed for rate limiting).
// Only enable this when a proxy really is in front: otherwise clients could forge the headers.
if (env.TRUST_PROXY > 0) {
	app.set("trust proxy", env.TRUST_PROXY);
}

// First, so every response carries CORS headers, including errors (e.g. if the database is
// unreachable). Otherwise the browser reports a misleading CORS block instead of the real error.
app.use(
	cors({
		credentials: true,
		origin: env.FRONTEND_ORIGIN,
	}),
);

// Nothing below may run before Redis (sessions, cache) and the database are connected. On a
// cold start this waits for the connection; afterwards it passes straight through. A failed
// connection goes to the error handler as a 500.
app.use((_req, _res, next) => {
	connectServices().then(() => next(), next);
});

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

app.use(baseRouter);

// Must come after all routes so it catches errors thrown by them
app.use(errorHandler);

if (process.env.VERCEL) {
	// On Vercel, the platform runs the exported app itself (see
	// https://vercel.com/docs/frameworks/backend/express); there is no server to start. Begin
	// connecting right away so the first request waits less. A failure here is retried on
	// the next request, which also reports it.
	connectServices().catch((error) => {
		console.error("Initial connection failed; will retry on the next request:", error);
	});
} else {
	// Locally (pnpm dev / node): connect first, so the server never accepts requests without
	// its cache and database, then listen. Can't connect = can't run, so exit.
	connectServices()
		.then(() => {
			app.listen(env.PORT, () => {
				console.log(`Server is running on ${env.BACKEND_ORIGIN}`);
			});
		})
		.catch((error) => {
			console.error("Error starting server:", error);
			process.exit(1);
		});
}

// Vercel's Express support needs the app as the module's default export
export default app;
