import express from "express";
import { router as callbackRouter } from "./callback";
import { router as loginRouter } from "./login";

export const router = express.Router();

router.use("/callback", callbackRouter);
router.use("/login", loginRouter);
