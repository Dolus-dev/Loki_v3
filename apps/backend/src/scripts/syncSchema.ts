import { DataSource } from "typeorm";
import { AppDataSource } from "../data-source";

/**
 * Creates or updates the database schema to match the entities, then exits.
 *
 * Use it for databases where the server doesn't sync the schema itself, i.e. production
 * (NODE_ENV=production, as on Vercel). Running the sync on every serverless start would be
 * slow, and several instances starting at once would race each other changing the schema.
 *
 *   pnpm --filter backend db:sync
 *
 * It uses the backend's normal environment (apps/backend/.env). To target another database,
 * set DATABASE_URL for this one command; it takes priority over the .env file:
 *   PowerShell:  $env:DATABASE_URL="postgres://..."; pnpm --filter backend db:sync
 *   bash:        DATABASE_URL="postgres://..." pnpm --filter backend db:sync
 * For a hosted database, use its direct (non-pooled) connection string here: schema changes
 * are safer without a connection pooler in between. With Vercel's Supabase integration that's
 * DATABASE_POSTGRES_URL_NON_POOLING; with Neon it's DATABASE_URL_UNPOOLED.
 *
 * Caution: syncing makes the tables match the entities, so a column removed from an entity
 * is dropped along with its data. Check entity changes before syncing a database with real
 * data in it. (Proper migrations are on the roadmap.)
 */
async function syncSchema(): Promise<void> {
	// Same connection settings, but always syncing and never dropping the schema
	const dataSource = new DataSource({
		...AppDataSource.options,
		synchronize: true,
		dropSchema: false,
	});

	await dataSource.initialize();
	console.log("Schema is in sync with the entities.");
	await dataSource.destroy();
}

syncSchema().catch((error) => {
	console.error("Schema sync failed:", error);
	process.exit(1);
});
