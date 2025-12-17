import express from "express";
import { router as GuildsRouter } from "./guildId/index";
import z from "zod";
import { requireAuth } from "../../lib/requireAuth - Middleware";
export const router = express.Router();

router.use("/:guildId", GuildsRouter);

const newGuildSchema = z.object({
	id: z.string().min(1),
	name: z.string().min(1),
	iconHash: z.string().nullable().optional(),
});
router.post("/", requireAuth, async (req, res) => {
	console.log(`Bot request received.`);
	return res.status(201).send({ success: true });
});
