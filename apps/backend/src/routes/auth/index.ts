import express from "express";
import { router as callbackRouter } from "./callback";
import { router as loginRouter } from "./login";
import { router as LogoutRouter } from "./logout";

export const router = express.Router();

router.use("/callback", callbackRouter);
router.use("/login", loginRouter);
router.use("/logout", LogoutRouter);
