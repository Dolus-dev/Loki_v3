import express from "express";
import { router as moderationRouter } from "./moderation/index";
import { router as authRouter } from "./auth/index";

export const router = express.Router();

router.use("/moderation", moderationRouter);
router.use("/auth", authRouter);
