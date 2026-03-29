import mongoose from "mongoose";

const walletSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    // Stripe Account Information
    stripeAccountId: {
      type: String, // Stripe Connect account ID
    },
    stripeAccountStatus: {
      type: String,
      enum: ["pending", "active", "restricted", "rejected"],
      default: "pending",
    },
    stripeOnboardingLink: {
      type: String, // URL for Stripe onboarding
    },
    stripeOnboardingCompleted: {
      type: Boolean,
      default: false,
    },
    // Balance Information
    availableBalance: {
      type: Number,
      default: 0, // Available for payout
    },
    pendingBalance: {
      type: Number,
      default: 0, // Pending payout
    },
    totalEarnings: {
      type: Number,
      default: 0, // Total earnings ever
    },
    totalPayouts: {
      type: Number,
      default: 0, // Total paid out
    },
    totalCommissions: {
      type: Number,
      default: 0, // Total platform commissions
    },
    // Commission Rate
    commissionRate: {
      type: Number,
      default: 0.1, // 10% platform commission
    },
  },
  { timestamps: true }
);

// Indexes
walletSchema.index({ userId: 1 });
walletSchema.index({ stripeAccountId: 1 });

const Wallet = mongoose.model("Wallet", walletSchema);
export default Wallet;
