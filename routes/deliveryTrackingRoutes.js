import express from "express";
import {
  updateDeliveryStatus,
  getDeliveryTracking,
  createDisputeReport,
  getDisputeReports,
} from "../controllers/deliveryTrackingController.js";
import upload from "../middleware/upload.js";

const router = express.Router();

// Get delivery tracking info
router.get("/package/:packageId", getDeliveryTracking);

// Update delivery status
router.patch("/package/:packageId/status", updateDeliveryStatus);

// Create dispute report (with file upload)
router.post(
  "/:userId/dispute",
  upload.array("evidence", 5),
  createDisputeReport
);

// Get dispute reports for a booking
router.get("/booking/:bookingId/disputes", getDisputeReports);

export default router;
