import express from "express";
export const router = express.Router({ mergeParams: true });

// Retrieve logging settings for a guild
router.get("/", (req: express.Request<{ guildId: string }>, res) => {});

// Update logging settings for a guild
router.patch("/", (req: express.Request<{ guildId: string }>, res) => {});
