import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    phone: { type: String },
    address: { type: String },
    profilePhoto: { type: String }, // URL or path to profile photo
    password: { type: String },
    // OAuth fields
    provider: { type: String, enum: ['local', 'google', 'facebook'], default: 'local' },
    providerId: { type: String },
    // Verification fields
    otpCode: { type: String },
    otpExpiresAt: { type: Date },
    phoneVerifiedAt: { type: Date },
    verificationToken: { type: String },
    verificationTokenExpiresAt: { type: Date },
    emailVerifiedAt: { type: Date },
          // Profile completion
          profileComplete: { type: Boolean, default: false },
          roles: { 
            type: [String], 
            enum: ['traveler', 'sender', 'admin'], 
            default: [] 
          },
          activeRole: { 
            type: String, 
            enum: ['traveler', 'sender', 'admin'], 
            default: null 
          },
          profileCompletedAt: { type: Date },
          // Admin fields
          isAdmin: { type: Boolean, default: false },
          isSuperAdmin: { type: Boolean, default: false },
          adminPermissions: {
            type: [String],
            enum: ['users', 'packages', 'trips', 'bookings', 'analytics', 'settings', 'reports', 'kyc', 'transactions'],
            default: []
          },
          isActive: { type: Boolean, default: true },
          deactivationReason: { type: String },
          // KYC fields
          kycStatus: {
            type: String,
            enum: ['not_submitted', 'pending', 'approved', 'rejected'],
            default: 'not_submitted'
          },
          kycDocuments: [{
            type: { type: String }, // 'national_id', 'passport', 'driver_license', 'selfie'
            url: { type: String },
            uploadedAt: { type: Date, default: Date.now }
          }],
          kycSubmittedAt: { type: Date },
          kycReviewedAt: { type: Date },
          kycReviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
          kycRejectionReason: { type: String },
          // Language preference
          language: { 
            type: String, 
            enum: ['en', 'ur', 'ar', 'es', 'fr', 'de', 'zh', 'hi'], 
            default: 'en' 
          },
  },
  { timestamps: true }
);

// Index for OAuth lookups
userSchema.index({ provider: 1, providerId: 1 });

const User = mongoose.model("User", userSchema);
export default User;
