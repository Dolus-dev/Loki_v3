import express from "express";
import { router as guildsRouter } from "./guilds/index";

export const router = express.Router();
router.use("/guilds", guildsRouter);

router.get("/", (req, res) => {
	res.json({ message: "User info endpoint" });
});
