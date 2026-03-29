import express from "express";
import {
  createBookingRequest,
  getSenderBookingRequests,
  getTravelerBookingRequests,
  getBookingRequestById,
  acceptBookingRequest,
  rejectBookingRequest,
  cancelBookingRequest,
  updatePaymentStatus,
  acceptPackageDirectly,
  rejectPackageDirectly,
} from "../controllers/bookingController.js";
import {
  getTravelerBookings,
  getTravelerBookingStats,
  getPayoutHistory,
} from "../controllers/bookingManagementController.js";

const router = express.Router();

// Create booking request
router.post("/:userId/request", createBookingRequest);

// Get booking requests for sender
router.get("/sender/:userId", getSenderBookingRequests);

// Get booking requests for traveler
router.get("/traveler/:userId", getTravelerBookingRequests);

// Get traveler bookings with details (for Screen 15)
router.get("/traveler/:userId/manage", getTravelerBookings);

// Get traveler booking statistics
router.get("/traveler/:userId/stats", getTravelerBookingStats);

// Get payout history
router.get("/traveler/:userId/payouts", getPayoutHistory);

// Get single booking request
router.get("/:bookingId", getBookingRequestById);

// Accept booking request
router.patch("/:bookingId/accept", acceptBookingRequest);

// Reject booking request
router.patch("/:bookingId/reject", rejectBookingRequest);

// Cancel booking request
router.patch("/:bookingId/cancel", cancelBookingRequest);

// Update payment status
router.patch("/:bookingId/payment-status", updatePaymentStatus);

// Accept package directly (creates booking request automatically)
router.post("/packages/:packageId/accept", acceptPackageDirectly);

// Reject package directly (creates booking request with rejected status)
router.post("/packages/:packageId/reject", rejectPackageDirectly);

export default router;
