import express from "express";
import { router as GuildsRouter } from "./guildId/index";
import z from "zod";
import { requireAuth } from "../../lib/requireAuth - Middleware";
import { AppDataSource } from "../..";
import { Guild } from "../../models/Guild";
export const router = express.Router();

router.use("/:guildId", GuildsRouter);

const newGuildSchema = z.object({
	id: z.string().min(1),
	name: z.string().min(1),
	iconHash: z.string().nullable().optional(),
});
router.post("/", requireAuth, async (req, res) => {
	console.log(`Bot request received.`);
	const parseResult = newGuildSchema.safeParse(req.body);
	if (!parseResult.success) {
		return res
			.status(400)
			.send({ error: "Invalid guild data", details: parseResult.error });
	}

	const { id, name, iconHash } = parseResult.data;
	const guildRepository = AppDataSource.getRepository(Guild);

	await guildRepository.upsert(
		{
			id,
			name,
			iconHash: iconHash ?? null,
		},
		{
			conflictPaths: ["id"],
			skipUpdateIfNoValuesChanged: true,
		}
	);

	return res.status(201).send({ success: true });
});
