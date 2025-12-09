import express from "express";
import { router as meRouter } from "./@me/index";

export const router = express.Router();

router.use("/@me", meRouter);
