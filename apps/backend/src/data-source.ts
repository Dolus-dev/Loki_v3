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

// URL parameters that control TLS in the pg driver. When we supply the TLS settings ourselves
// they have to go: the driver lets the connection string override the `ssl` option, so any
// of these (even `sslmode=require`) would silently discard our CA certificate.
const URL_TLS_PARAMS = [
	"sslmode",
	"sslrootcert",
	"sslcert",
	"sslkey",
	"uselibpqcompat",
];

/**
 * The connection URL and TLS settings to use.
 *
 * - With DATABASE_CA_CERT set: TLS is always on and the server's certificate is verified
 *   against that CA (chain and hostname). The URL's own TLS parameters are removed so they
 *   can't override this. This is how to connect to Supabase securely: its certificates are
 *   signed by Supabase's own CA, which Node doesn't trust by default, so plain
 *   `sslmode=require` fails with "self-signed certificate in certificate chain".
 * - Without it: the URL is used exactly as given (local databases, or hosts like Neon whose
 *   certificates Node already trusts, with `?sslmode=require` in the URL).
 */
export function databaseConnection(url: string, caCert?: string) {
	if (!caCert) {
		return { url, ssl: undefined };
	}

	const parsed = new URL(url);
	for (const param of URL_TLS_PARAMS) {
		parsed.searchParams.delete(param);
	}
	return {
		url: parsed.toString(),
		// Env var values often hold the PEM's line breaks as literal "\n"; restore them
		ssl: { ca: caCert.replace(/\\n/g, "\n"), rejectUnauthorized: true },
	};
}

const connection = databaseConnection(env.DATABASE_URL, env.DATABASE_CA_CERT);

/**
 * The database connection, shared by the server (src/index.ts, which re-exports it) and the
 * one-off schema script (src/scripts/syncSchema.ts). Kept in its own module so the script
 * can use it without starting the server.
 *
 * Hosted PostgreSQL usually requires TLS; see `databaseConnection` for how it's configured.
 */
export const AppDataSource = new DataSource({
	type: "postgres",
	url: connection.url,
	ssl: true,
	extra: {
		ssl: {
			rejectUnauthorized: true,
		},
	},
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
