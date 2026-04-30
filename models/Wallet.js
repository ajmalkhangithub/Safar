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
    pendingPayments: {
      type: Number,
      default: 0, // Pending outgoing payments (sender side)
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
    transactionHistory: [
      {
        amount: { type: Number, required: true },
        type: {
          type: String,
          enum: ["credit", "debit"],
          required: true,
        },
        category: {
          type: String,
          enum: ["earning", "payment", "withdrawal", "deposit", "refund", "adjustment"],
          default: "adjustment",
        },
        status: {
          type: String,
          enum: ["pending", "completed", "failed"],
          default: "completed",
        },
        description: { type: String, default: "" },
        bookingId: { type: mongoose.Schema.Types.ObjectId, ref: "BookingRequest" },
        createdAt: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

// Indexes
walletSchema.index({ userId: 1 });
walletSchema.index({ stripeAccountId: 1 });

const Wallet = mongoose.model("Wallet", walletSchema);
export default Wallet;
