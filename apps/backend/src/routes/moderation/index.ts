import express from "express";
import { router as eventsRouter } from "./events/index";
export const router = express.Router();

router.use("/events", eventsRouter);
