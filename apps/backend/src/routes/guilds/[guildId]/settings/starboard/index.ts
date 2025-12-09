import express from "express";

export const router = express.Router({ mergeParams: true });

// Retrieve starboard settings for a guild
router.get("/", (req: express.Request<{ guildId: string }>, res) => {});

// Update starboard settings for a guild
router.patch("/", (req: express.Request<{ guildId: string }>, res) => {});
