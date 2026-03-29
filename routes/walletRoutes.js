import express from "express";
import {
  getWallet,
  createStripeAccountLink,
  getStripeAccountStatus,
  getTransactionHistory,
  getPayoutHistory,
  requestPayout,
} from "../controllers/walletController.js";

const router = express.Router();

// Get wallet information
router.get("/:userId", getWallet);

// Create Stripe account link (onboarding)
router.post("/:userId/stripe/connect", createStripeAccountLink);

// Get Stripe account status
router.get("/:userId/stripe/status", getStripeAccountStatus);

// Get transaction history
router.get("/:userId/transactions", getTransactionHistory);

// Get payout history
router.get("/:userId/payouts", getPayoutHistory);

// Request payout
router.post("/:userId/payout", requestPayout);

export default router;
