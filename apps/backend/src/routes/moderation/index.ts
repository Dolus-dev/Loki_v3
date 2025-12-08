import express from "express";
import { router as eventsRouter } from "./events/index";
import { router as auditLogRouter } from "./audit-logs/index";
export const router = express.Router();

router.use("/events", eventsRouter);
router.use("/audit-logs", auditLogRouter);
