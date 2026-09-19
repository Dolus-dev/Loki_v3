import express from "express";
import { router as eventsRouter } from "./events/index";
import { router as auditLogRouter } from "./audit-logs/index";
import { requireAuth } from "../../../../lib/Middlewares/requireAuth";
export const router = express.Router({ mergeParams: true });

// Everything under moderation requires authentication. Each route additionally
// applies requireGuildSettingsAccess with the level it needs (view/edit).
router.use(requireAuth);

router.use("/events", eventsRouter);
router.use("/audit-logs", auditLogRouter);
