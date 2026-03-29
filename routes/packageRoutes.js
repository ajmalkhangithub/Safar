import express from "express";
import {
  createPackage,
  trackPackage,
  getRecentDeliveries,
  getRecentPackages,
  getUserPackages,
  updatePackageStatus,
  getPackageById,
  getAvailablePackagesForTravelers,
} from "../controllers/packageController.js";
import {
  getSenderDashboardStats,
  getPostedPackageRequests,
} from "../controllers/senderDashboardController.js";
import {
  getPackageRequests,
  getMatchingTrips,
  sendBookingRequest,
} from "../controllers/packageRequestsController.js";
import upload from "../middleware/upload.js";

const router = express.Router();

// Create a new package (with file upload support)
router.post("/create", upload.array("photos", 10), createPackage);

// Track package by tracking number (public)
router.get("/track/:trackingNumber", trackPackage);

// Get recent deliveries for a user
router.get("/deliveries/:userId", getRecentDeliveries);

// Get recent packages for a user
router.get("/packages/:userId", getRecentPackages);

// Get all packages for a user (with optional status filter)
router.get("/user/:userId", getUserPackages);

// Get sender dashboard statistics
router.get("/sender/:userId/dashboard", getSenderDashboardStats);

// Get available packages for travelers (all pending packages)
// This route must come after /sender/:userId/dashboard to avoid route conflicts
router.get("/traveler/:userId/available", getAvailablePackagesForTravelers);

// Get posted package requests
router.get("/sender/:userId/requests", getPostedPackageRequests);

// Get all package requests with filters (for Screen 8)
router.get("/requests", getPackageRequests);

// Get matching trips for a package
router.get("/:packageId/matching-trips", getMatchingTrips);

// Send booking request to traveler
router.post("/:userId/booking-request", sendBookingRequest);

// Get package by ID
router.get("/:packageId", getPackageById);

// Update package status
router.patch("/:trackingNumber/status", updatePackageStatus);

export default router;

