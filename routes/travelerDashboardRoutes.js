import express from "express";
import {
  getTravelerDashboardStats,
  getUpcomingTrips,
  getTravelerEarnings,
} from "../controllers/travelerDashboardController.js";

const router = express.Router();

// Get traveler dashboard statistics
router.get("/:userId/stats", getTravelerDashboardStats);

// Get upcoming trips
router.get("/:userId/upcoming-trips", getUpcomingTrips);

// Get earnings breakdown
router.get("/:userId/earnings", getTravelerEarnings);

export default router;
