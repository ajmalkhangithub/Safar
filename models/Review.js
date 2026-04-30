import mongoose from "mongoose";

const reviewSchema = new mongoose.Schema(
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
    reviewerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true, // Sender who reviews the traveler
    },
    reviewedUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true, // Traveler being reviewed
    },
    reviewerRole: {
      type: String,
      enum: ["sender", "traveler"],
      required: true,
    },
    reviewedRole: {
      type: String,
      enum: ["sender", "traveler"],
      required: true,
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    reviewText: {
      type: String,
      default: "",
    },
    // Proof of delivery
    proofOfDelivery: {
      photo: {
        type: String, // URL or base64
      },
      signature: {
        type: String, // URL or base64
      },
      uploadedAt: {
        type: Date,
        default: Date.now,
      },
    },
  },
  { timestamps: true }
);

// Indexes
reviewSchema.index({ bookingId: 1 });
reviewSchema.index({ reviewedUserId: 1 });
reviewSchema.index({ reviewerId: 1 });

// Prevent duplicate reviews for the same booking
reviewSchema.index({ bookingId: 1, reviewerId: 1 }, { unique: true });

const Review = mongoose.model("Review", reviewSchema);
export default Review;
