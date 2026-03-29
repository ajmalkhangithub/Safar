import mongoose from "mongoose";

const disputeReportSchema = new mongoose.Schema(
  {
    bookingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "BookingRequest",
      required: true,
    },
    packageId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Package",
      required: true,
    },
    reportedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    reportedAgainst: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    disputeType: {
      type: String,
      enum: [
        "damage",
        "delay",
        "lost",
        "wrong_delivery",
        "payment_issue",
        "other",
      ],
      required: true,
    },
    title: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    evidence: [
      {
        type: String, // URLs or file paths
      },
    ],
    status: {
      type: String,
      enum: ["pending", "under_review", "resolved", "rejected"],
      default: "pending",
    },
    resolution: {
      type: String,
    },
    resolvedAt: {
      type: Date,
    },
    resolvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true }
);

// Indexes
disputeReportSchema.index({ bookingId: 1 });
disputeReportSchema.index({ reportedBy: 1, status: 1 });
disputeReportSchema.index({ status: 1 });

const DisputeReport = mongoose.model("DisputeReport", disputeReportSchema);
export default DisputeReport;
