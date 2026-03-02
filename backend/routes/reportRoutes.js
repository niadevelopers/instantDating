import express from "express";
import auth from "../middleware/authMiddleware.js";
import { createReport, getReports } from "../controllers/reportController.js";

const router = express.Router();

router.post("/create", auth, createReport);
router.get("/", auth, getReports);

export default router;