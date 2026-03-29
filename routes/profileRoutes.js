import express from "express";
import {
  setupProfile,
  getProfile,
  updateProfile,
  submitKYC,
  getKYCStatus,
} from "../controllers/profileController.js";
import upload from "../middleware/upload.js";

const router = express.Router();

// Profile setup (create or update)
router.post("/setup", setupProfile);

// Get user profile
router.get("/:userId", getProfile);

// Update user profile (with optional photo upload)
// Support both JSON (base64) and FormData (file upload)
router.put("/:userId", upload.single("profilePhoto"), updateProfile);

// KYC routes
router.post("/:userId/kyc", submitKYC);
router.get("/:userId/kyc-status", getKYCStatus);

// Test endpoint - Reset KYC status (for development only)
router.post("/:userId/kyc/reset", async (req, res) => {
  try {
    const { userId } = req.params;
    const User = (await import("../models/User.js")).default;
    
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Reset KYC status to not_submitted
    user.kycStatus = 'not_submitted';
    user.kycDocuments = [];
    user.kycSubmittedAt = undefined;
    user.kycReviewedAt = undefined;
    user.kycReviewedBy = undefined;
    user.kycRejectionReason = undefined;

    await user.save();
    
    console.log(`KYC status reset for user: ${userId}`);
    
    res.status(200).json({
      message: "KYC status reset successfully",
      kycStatus: user.kycStatus
    });
  } catch (error) {
    console.error("Reset KYC error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// Test endpoint to check request body parsing
router.post("/test-kyc/:userId", (req, res) => {
  console.log("Test KYC endpoint hit");
  console.log("User ID:", req.params.userId);
  console.log("Body keys:", Object.keys(req.body));
  console.log("Body size:", JSON.stringify(req.body).length);
  res.json({
    message: "Test successful",
    userId: req.params.userId,
    hasBody: !!req.body,
    bodyKeys: Object.keys(req.body),
    bodySize: JSON.stringify(req.body).length
  });
});

export default router;
