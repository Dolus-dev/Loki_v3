import express from "express";
import { router as guildsRouter } from "./guilds/index";
import { router as authRouter } from "./auth/index";
import { router as usersRouter } from "./users/index";
import { router as moderationRouter } from "./moderation/index";

export const router = express.Router();

router.use("/guilds", guildsRouter);
router.use("/auth", authRouter);
router.use("/users", usersRouter);
// Bot-only: expiry processing for temporary moderation events across all guilds
router.use("/moderation", moderationRouter);
