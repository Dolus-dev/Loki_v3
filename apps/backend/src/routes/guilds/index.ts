import express from "express";
import { router as GuildsRouter } from "./[guildId]/index";
export const router = express.Router();

router.use("/:guildId", GuildsRouter);

router.post("/", async (req, res) => {});
