import mongoose from "mongoose";

const tripSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    // Trip Details
    tripName: {
      type: String,
      required: true,
    },
    description: {
      type: String,
    },
    // Origin and Destination
    originAddress: {
      street: String,
      city: String,
      state: String,
      country: String,
      zipCode: String,
      location: {
        name: String,
        lat:  Number,
        lng:  Number,
      },
    },
    destinationAddress: {
      street: String,
      city: String,
      state: String,
      country: String,
      zipCode: String,
      location: {
        name: String,
        lat:  Number,
        lng:  Number,
      },
    },
    // Trip Dates
    departureDate: {
      type: Date,
      required: true,
    },
    arrivalDate: {
      type: Date,
      required: true,
    },
    // Capacity
    availableSpace: {
      type: Number, // in liters (volume)
      default: 0,
    },
    maxWeight: {
      type: Number, // in kg
    },
    // Transport Mode
    transportMode: {
      type: String,
      enum: ["plane", "train", "car", "bus", "ship", "other"],
      default: "other",
    },
    // Accepted Item Types
    acceptedItemTypes: [{
      type: String,
      enum: ["document", "parcel", "fragile", "electronics", "clothing", "food", "other"],
    }],
    // Suggested Reward
    suggestedReward: {
      type: Number, // in dollars
    },
    // Status
    status: {
      type: String,
      enum: ["planned", "in_progress", "completed", "cancelled"],
      default: "planned",
    },
    // Ratings (for matching)
    travelerRating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },
  },
  { timestamps: true }
);

// Indexes for faster queries
tripSchema.index({ userId: 1 });
tripSchema.index({ status: 1 });
tripSchema.index({ departureDate: 1 });
tripSchema.index({ "originAddress.city": 1, "destinationAddress.city": 1 });

const Trip = mongoose.model("Trip", tripSchema);
export default Trip;
