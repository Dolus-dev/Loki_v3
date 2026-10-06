import "reflect-metadata";
import { DataSource } from "typeorm";
import { env } from "./config/env";

import { User } from "./models/User";
import { ModerationEvents } from "./models/Moderation/ModerationEvents";
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
import { ThrowSettings } from "./models/Fun/Throw";

/**
 * The database connection, shared by the server (src/index.ts, which re-exports it) and the
 * one-off schema script (src/scripts/syncSchema.ts). Kept in its own module so the script
 * can use it without starting the server.
 *
 * Hosted PostgreSQL (e.g. on Vercel) usually requires TLS: add `?sslmode=require` to
 * DATABASE_URL, which the pg driver reads from the connection string.
 */
export const AppDataSource = new DataSource({
	type: "postgres",
	url: env.DATABASE_URL,
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
		ThrowSettings,
	],
	// Outside production the schema is auto-synced to match the entities on every start. Data
	// is kept unless DB_RESET=true, which drops everything on every start. In production
	// (including Vercel) nothing changes the schema on startup: create or update it once
	// with `pnpm --filter backend db:sync` (see src/scripts/syncSchema.ts).
	synchronize: env.NODE_ENV !== "production",
	dropSchema: env.DB_RESET,
	logging: false,
});
