import { PermissionsBitField } from "discord.js";
import { Request, Response } from "express";
import { z } from "zod";
import { AppDataSource } from "..";
import { DashboardSettings } from "../models/DashboardSettings";
import { cacheGet, cacheSet } from "./cache";
import {
	fetchCurrentGuildMember,
	fetchCurrentUserGuilds,
} from "./discordInteractions";
import { DiscordError } from "./Errors/APIErrorResponse";
import { withUserAccessToken } from "./userTokens";

/**
 * Everything needed to decide whether a logged-in user may use a guild's dashboard.
 * The Discord lookups (the user's permissions and roles) are cached briefly, because
 * they would otherwise run on every request and hit Discord's rate limits. The trade-off
 * is that a permission or role change in Discord can take this long to be noticed.
 */
const DISCORD_ACCESS_CACHE_TTL_SECONDS = 60;

/**
 * How long a guild's dashboard role settings stay cached. The settings route wipes them as
 * soon as they change; this only bounds the rare case where a read that started before the
 * change re-caches the old value.
 */
export const DASHBOARD_ACCESS_CACHE_TTL_SECONDS = 60;

type SessionRequest = { session: Request["session"] };

/** Redis key of a guild's dashboard access settings (which roles can view/edit) */
export const dashboardSettingsCacheKey = (guildId: string) =>
	"guild:dashboardSettings:" + guildId;

/** Shape of the cached dashboard access settings, also returned by the settings route */
export const DashboardAccessSchema = z.object({
	readAccess: z.array(z.string()),
	editAccess: z.array(z.string()),
});
export type DashboardAccess = z.infer<typeof DashboardAccessSchema>;

const UserGuildsSchema = z.array(
	z.object({
		id: z.string(),
		name: z.string(),
		icon: z.string().nullable(),
		permissions: z.string(),
	}),
);
export type UserGuild = z.infer<typeof UserGuildsSchema>[number];

const MemberRolesSchema = z.object({ roles: z.array(z.string()) });

/**
 * Gets every guild the user is in, with their permissions there, from Discord.
 * @param options.fresh Skip the cache and ask Discord, for actions where a stale answer
 * isn't acceptable (e.g. managing who has dashboard access)
 */
export async function getUserGuilds(
	req: SessionRequest,
	options: { fresh?: boolean } = {},
): Promise<UserGuild[]> {
	const key = `user:discord-guilds:${req.session.userId}`;

	if (!options.fresh) {
		const cached = await cacheGet(key);
		if (cached) {
			// Entries cached before `name`/`icon` were stored fail to parse and are refetched
			const parsed = UserGuildsSchema.safeParse(JSON.parse(cached));
			if (parsed.success) {
				return parsed.data;
			}
		}
	}

	const fetched = await withUserAccessToken(req, fetchCurrentUserGuilds);
	const guilds: UserGuild[] = fetched.map(({ id, name, icon, permissions }) => ({
		id,
		name,
		icon: icon ?? null,
		permissions,
	}));
	await cacheSet(key, JSON.stringify(guilds), DISCORD_ACCESS_CACHE_TTL_SECONDS);
	return guilds;
}

/**
 * Gets the user's permissions in a guild from Discord.
 * @param options.fresh See `getUserGuilds`
 * @returns The permissions, or null if the user isn't in the guild
 */
export async function getUserGuildPermissions(
	req: SessionRequest,
	guildId: string,
	options: { fresh?: boolean } = {},
): Promise<PermissionsBitField | null> {
	const guilds = await getUserGuilds(req, options);
	const guild = guilds.find((candidate) => candidate.id === guildId);
	return guild ? new PermissionsBitField(BigInt(guild.permissions)) : null;
}

/**
 * Gets the IDs of the roles the user has in a guild.
 * @returns The role IDs, or null if the user isn't a member of the guild
 */
export async function getMemberRoles(
	req: SessionRequest,
	guildId: string,
): Promise<string[] | null> {
	const key = `user:access-roles:${req.session.userId}:${guildId}`;

	const cached = await cacheGet(key);
	if (cached) {
		const parsed = MemberRolesSchema.safeParse(JSON.parse(cached));
		if (parsed.success) {
			return parsed.data.roles;
		}
	}

	let roles: string[];
	try {
		const member = await withUserAccessToken(req, (accessToken) =>
			fetchCurrentGuildMember(accessToken, guildId),
		);
		roles = member.roles;
	} catch (error) {
		// Discord says 403/404 when the user isn't a member; anything else is a real error.
		// A "not a member" answer isn't cached, so joining the guild takes effect at once.
		if (
			error instanceof DiscordError &&
			(error.statusCode === 403 || error.statusCode === 404)
		) {
			return null;
		}
		throw error;
	}

	await cacheSet(
		key,
		JSON.stringify({ roles }),
		DISCORD_ACCESS_CACHE_TTL_SECONDS,
	);
	return roles;
}

/**
 * Gets which roles may view/edit a guild's dashboard. Served from Redis when possible;
 * the dashboard settings route replaces the cached copy whenever it changes them.
 * @returns The access settings, or null if the guild has none yet (nobody but
 * Manage Server users has access)
 */
export async function getDashboardAccess(
	guildId: string,
): Promise<DashboardAccess | null> {
	const key = dashboardSettingsCacheKey(guildId);

	const cached = await cacheGet(key);
	if (cached) {
		const parsed = DashboardAccessSchema.safeParse(JSON.parse(cached));
		if (parsed.success) {
			return parsed.data;
		}
	}

	const settings = await AppDataSource.getRepository(DashboardSettings).findOneBy({
		id: guildId,
	});
	if (!settings) {
		return null;
	}

	const access: DashboardAccess = {
		readAccess: settings.rolesWithDashboardViewAccess,
		editAccess: settings.rolesWithDashboardEditAccess,
	};
	await cacheSet(
		key,
		JSON.stringify(access),
		DASHBOARD_ACCESS_CACHE_TTL_SECONDS,
	);
	return access;
}

/**
 * What a user may do in a guild's dashboard, from most to least:
 * - "manage": has Manage Server (or Administrator). Everything, including changing who has
 *   dashboard access.
 * - "edit": holds a role with dashboard edit access. View and change settings.
 * - "view": holds a role with dashboard view access. View settings only.
 */
export type GuildAccessLevel = "manage" | "edit" | "view";

/**
 * Works out the user's dashboard access level in a guild. This is the single definition of
 * the access rules: the settings middleware, the access route and the guild list all use it.
 * @returns The level, or null if the user may not see the guild's dashboard at all
 */
export async function resolveGuildAccess(
	req: SessionRequest,
	guildId: string,
): Promise<GuildAccessLevel | null> {
	const permissions = await getUserGuildPermissions(req, guildId);
	if (!permissions) {
		return null;
	}

	// has() also accepts Administrator, which Discord treats as every permission
	if (permissions.has(PermissionsBitField.Flags.ManageGuild)) {
		return "manage";
	}

	// Without any dashboard roles configured, only Manage Server users have access, so the
	// Discord lookup of the user's roles can be skipped
	const dashboardAccess = await getDashboardAccess(guildId);
	if (
		!dashboardAccess ||
		(dashboardAccess.editAccess.length === 0 &&
			dashboardAccess.readAccess.length === 0)
	) {
		return null;
	}

	const memberRoles = await getMemberRoles(req, guildId);
	if (!memberRoles) {
		return null;
	}

	if (memberRoles.some((roleId) => dashboardAccess.editAccess.includes(roleId))) {
		return "edit";
	}
	if (memberRoles.some((roleId) => dashboardAccess.readAccess.includes(roleId))) {
		return "view";
	}
	return null;
}

/** Whether an access level allows reading ("view") or changing ("edit") settings. */
export function accessAllows(
	level: GuildAccessLevel | null,
	mode: "view" | "edit",
): boolean {
	if (level === null) {
		return false;
	}
	return mode === "view" || level === "edit" || level === "manage";
}

/**
 * Sends the right response for an error thrown while checking a user's guild access:
 * 401 if their Discord login can no longer be used, 500 otherwise.
 */
export function respondToAccessError(res: Response, error: unknown): void {
	if (error instanceof DiscordError && error.statusCode === 401) {
		void res.status(401).send({ error: "Discord session expired" });
		return;
	}
	console.error("Failed to verify guild access:", error);
	void res.status(500).send({ error: "Failed to verify guild settings access" });
}
