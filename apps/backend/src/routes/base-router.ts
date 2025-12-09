import express from "express";
import { router as guildsRouter } from "./guilds/index";
import { router as authRouter } from "./auth/index";
import { router as usersRouter } from "./users/index";

export const router = express.Router();

router.use("/guilds", guildsRouter);
router.use("/auth", authRouter);
router.use("/users", usersRouter);
