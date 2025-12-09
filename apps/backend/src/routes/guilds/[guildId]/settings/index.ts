import express from "express";
import { router as dashboardRouter } from "./dashboard/index";
import { router as loggingRouter } from "./logging/index";
import { router as starboardRouter } from "./starboard/index";
export const router = express.Router({ mergeParams: true });

router.use("/dashboard", dashboardRouter);
router.use("/logging", loggingRouter);
router.use("/starboard", starboardRouter);
