import express from "express";
import {
  createTrip,
  getUserTrips,
  getTripById,
  updateTrip,
  deleteTrip,
} from "../controllers/tripController.js";
import {
  getTripsWithFilters,
  getMatchingPackagesForTrip,
  getMatchingPackagesForTraveler,
} from "../controllers/tripListController.js";

const router = express.Router();

// Create a new trip
router.post("/create", createTrip);

// Get all trips with filters (for Screen 14)
router.get("/list", getTripsWithFilters);

// Get matching packages for a specific trip
router.get("/:tripId/matching-packages", getMatchingPackagesForTrip);

// Get matching packages for a traveler (all their trips)
router.get("/traveler/:userId/matching-packages", getMatchingPackagesForTraveler);

// Get trips for a user
router.get("/user/:userId", getUserTrips);

// Get trip by ID
router.get("/:tripId", getTripById);

// Update trip
router.patch("/:tripId", updateTrip);

// Delete trip
router.delete("/:tripId", deleteTrip);

export default router;
