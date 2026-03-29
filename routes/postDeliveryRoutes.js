import express from "express";
import {
  submitPostDelivery,
  getPostDeliveryData,
  getTravelerReviews,
} from "../controllers/postDeliveryController.js";
import upload from "../middleware/upload.js";

const router = express.Router();

// Submit post-delivery review with proof of delivery
router.post(
  "/:userId/submit",
  upload.fields([
    { name: "proofPhoto", maxCount: 1 },
    { name: "proofSignature", maxCount: 1 },
  ]),
  submitPostDelivery
);

// Get post-delivery data for a booking
router.get("/booking/:bookingId", getPostDeliveryData);

// Get reviews for a traveler
router.get("/traveler/:userId/reviews", getTravelerReviews);

export default router;
