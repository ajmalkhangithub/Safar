import express from "express";
import {
  updateDeliveryStatusWithProof,
  getDeliveryStatusForManagement,
} from "../controllers/deliveryStatusController.js";
import upload from "../middleware/upload.js";

const router = express.Router();

// Get delivery status for management
router.get("/package/:packageId/status", getDeliveryStatusForManagement);

// Update delivery status with proof of delivery
router.patch(
  "/package/:packageId/status",
  upload.fields([
    { name: "proofPhoto", maxCount: 1 },
    { name: "proofSignature", maxCount: 1 },
  ]),
  updateDeliveryStatusWithProof
);

export default router;
