import { APIGuild } from "discord.js";
import express from "express";
import { cacheGet, cacheSet } from "../../../../lib/cache";
import { fetchGuildRoles } from "../../../../lib/discordInteractions";
import { requireAuth } from "../../../../lib/Middlewares/requireAuth";
import { requireGuildSettingsAccess } from "../../../../lib/Middlewares/requireGuildSettingsAccess";
import z from "zod";

export const router = express.Router({ mergeParams: true });

const CachedRolesSchema = z.array(
	z.object({
		name: z.string(),
		id: z.string(),
		color: z.number(),
		position: z.number(),
	}),
);

const query = z.object({
	// stringbool parses "true"/"false"; z.coerce.boolean() would turn "false" into true
	forceRefresh: z.stringbool().optional().default(false),
});

/**
 * Returns a guild's roles (highest position first, without @everyone), for role
 * pickers in the dashboard. Cached in Redis for 5 minutes; `?forceRefresh=true`
 * skips the cache read and refetches from Discord.
 */
router.get(
	"/",
	requireAuth,
	requireGuildSettingsAccess("view"),
	async (
		req: express.Request<{ guildId: string }>,
		res: express.Response,
	): Promise<express.Response | void> => {
		const { guildId } = req.params;

		const key = "guild:roles:" + guildId;

		const queryParams = query.safeParse(req.query);
		if (!queryParams.success) {
			return res.status(400).json({ error: "Invalid query parameters" });
		}

		const { forceRefresh } = queryParams.data;

		let roles: APIGuild["roles"] | APIRoleSimplified[] | null = null;

		if (forceRefresh === false) {
			const value = await cacheGet(key);

			if (value) {
				const cachedRoles = CachedRolesSchema.safeParse(JSON.parse(value));
				if (cachedRoles.success) {
					console.log("Cache hit for guild roles:", guildId);
					return res.status(200).send(cachedRoles.data);
				}
			}
		}

		roles = await fetchGuildRoles(guildId);

		const simplifiedRoles = roles
			.map((role) => {
				return {
					name: role.name,
					id: role.id,
					color: role.color,
					position: role.position,
				};
			})
			.sort((a, b) => b.position - a.position)
			.filter((role) => role.name !== "@everyone") as APIRoleSimplified[];

		await cacheSet(key, JSON.stringify(simplifiedRoles), 300); // Cache for 5 minutes
		return res.status(200).send(simplifiedRoles);
	},
);

interface APIRoleSimplified {
	name: string;
	id: string;
	color: number;
	position: number;
}
