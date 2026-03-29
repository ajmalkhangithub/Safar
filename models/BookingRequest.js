import mongoose from "mongoose";

const bookingRequestSchema = new mongoose.Schema(
  {
    packageId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Package",
      required: true,
    },
    tripId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Trip",
      required: false, // Optional - traveler can accept package without specific trip
    },
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    travelerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    message: {
      type: String,
      default: "",
    },
    status: {
      type: String,
      enum: ["pending", "accepted", "rejected", "cancelled"],
      default: "pending",
    },
    // Payment details
    paymentStatus: {
      type: String,
      enum: ["pending", "paid", "refunded", "released"],
      default: "pending",
    },
    paymentAmount: {
      type: Number,
    },
    stripePaymentIntentId: {
      type: String,
    },
    // Timestamps
    requestedAt: {
      type: Date,
      default: Date.now,
    },
    respondedAt: {
      type: Date,
    },
    paidAt: {
      type: Date,
    },
  },
  { timestamps: true }
);

// Indexes
bookingRequestSchema.index({ senderId: 1, status: 1 });
bookingRequestSchema.index({ travelerId: 1, status: 1 });
bookingRequestSchema.index({ packageId: 1 });
bookingRequestSchema.index({ tripId: 1 });

const BookingRequest = mongoose.model("BookingRequest", bookingRequestSchema);
export default BookingRequest;
