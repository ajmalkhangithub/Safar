import express from "express";
import { getCombinedDashboard } from "../controllers/combinedDashboardController.js";

const router = express.Router();

// Get combined dashboard
router.get("/:userId", getCombinedDashboard);

export default router;
