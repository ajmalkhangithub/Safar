import mongoose from "mongoose";

const packageSchema = new mongoose.Schema(
  {
    trackingNumber: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    // Package Details
    packageName: {
      type: String,
      required: true,
    },
    description: {
      type: String,
    },
    weight: {
      type: Number, // in kg
    },
    dimensions: {
      length: Number,
      width: Number,
      height: Number,
    },
    value: {
      type: Number, // in dollars
    },
    compensation: {
      type: Number, // compensation offer for delivery
    },
    insurance: {
      type: Boolean,
      default: false,
    },
    packageType: {
      type: String,
      enum: ["document", "parcel", "fragile", "electronics", "clothing", "food", "other"],
    },
    photos: [{
      type: String, // URLs or file paths
    }],
    // Sender Information
    sender: {
      name: { type: String, required: true },
      email: { type: String, required: true },
      phone: { type: String, required: true },
      address: {
        street: String,
        city: String,
        state: String,
        country: String,
        zipCode: String,
      },
    },
    // Receiver Information
    receiver: {
      name: { type: String, required: true },
      email: { type: String, required: true },
      phone: { type: String, required: true },
      address: {
        street: String,
        city: String,
        state: String,
        country: String,
        zipCode: String,
      },
    },
    // Shipping Details
    originAddress: {
      street: String,
      city: String,
      state: String,
      country: String,
      zipCode: String,
    },
    destinationAddress: {
      street: String,
      city: String,
      state: String,
      country: String,
      zipCode: String,
    },
    currentLocation: {
      type: String,
      default: "Origin",
    },
    // Status Management
    status: {
      type: String,
      enum: [
        "pending",
        "confirmed",
        "in_transit",
        "out_for_delivery",
        "delivered",
        "cancelled",
      ],
      default: "pending",
    },
    estimatedDeliveryDate: {
      type: Date,
    },
    actualDeliveryDate: {
      type: Date,
    },
    // Tracking History
    trackingHistory: [
      {
        status: String,
        location: String,
        description: String,
        timestamp: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    // Proof of Delivery
    proofOfDelivery: {
      photo: {
        type: String, // URL or base64
      },
      signature: {
        type: String, // URL or base64
      },
      uploadedAt: {
        type: Date,
      },
    },
  },
  { timestamps: true }
);

// Index for faster tracking lookups
packageSchema.index({ trackingNumber: 1 });
packageSchema.index({ userId: 1 });
packageSchema.index({ status: 1 });

const Package = mongoose.model("Package", packageSchema);
export default Package;

