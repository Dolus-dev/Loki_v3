import express from "express";

export const router = express.Router();

router.get("/", (req, res) => {
	return res.status(200).send({ message: "Event received" });
});
