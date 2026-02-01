import { APIGuild } from "discord.js";
import express from "express";
import { redisClient } from "../../../..";
import { fetchGuildRoles } from "../../../../lib/discordInteractions";
import { requireAuth } from "../../../../lib/requireAuth - Middleware";
import z from "zod";

export const router = express.Router({ mergeParams: true });

const query = z.object({
	forceRefresh: z.coerce.boolean().optional().default(false),
});

router.get(
	"/",
	requireAuth,
	async (req: express.Request<{ guildId: string }>, res) => {
		const { guildId } = req.params;

		const key = "guild:roles:" + guildId;

		const queryParams = query.safeParse(req.query);
		if (!queryParams.success) {
			return res.status(400).json({ error: "Invalid query parameters" });
		}

		const { forceRefresh } = queryParams.data;

		let roles: APIGuild["roles"] | APIRoleSimplified[] | null = null;

		if (forceRefresh === false) {
			const value = await redisClient.get(key);

			if (value) {
				roles = JSON.parse(value) as APIGuild["roles"];
				console.log("Cache hit for guild roles:", guildId);
				return res.status(200).send(roles);
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

		await redisClient.set(key, JSON.stringify(simplifiedRoles), {
			EX: 300, // Cache for 5 minutes
		});
		return res.status(200).send(simplifiedRoles);
	}
);

interface APIRoleSimplified {
	name: string;
	id: string;
	color: number;
	position: number;
}
