import express from "express";
import { router as moderationRouter } from "./moderation/index";

export const router = express.Router();

router.use("/moderation", moderationRouter);
