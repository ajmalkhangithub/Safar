import User from "../models/User.js";
import bcrypt from "bcryptjs";
import {
  generateOtpCode,
  generateVerificationToken,
  getOtpExpiryDate,
  getVerificationExpiryDate,
} from "../utils/verificationHelpers.js";

// Setup or update user profile
export const setupProfile = async (req, res) => {
  try {
    const { fullName, email, phone, address, role } = req.body;

    if (!fullName || !email || !phone) {
      return res.status(400).json({ 
        message: "Full name, email, and phone are required" 
      });
    }

    // Check if user exists
    let user = await User.findOne({ email });

    if (!user) {
      // Create new user if doesn't exist (without password - they'll set it later or use OAuth)
      // Generate OTP and verification token for new users
      const otpCode = generateOtpCode();
      const verificationToken = generateVerificationToken();
      const otpExpiresAt = getOtpExpiryDate();
      const verificationTokenExpiresAt = getVerificationExpiryDate();

      user = new User({
        name: fullName,
        email,
        phone,
        address: address || "",
        provider: "local",
        otpCode,
        otpExpiresAt,
        verificationToken,
        verificationTokenExpiresAt,
        roles: [role || "sender"],
        activeRole: role || "sender",
        profileComplete: true,
        profileCompletedAt: new Date(),
      });

      // Save user and verify it was saved
      try {
        await user.save();
        console.log("New user profile created successfully:", {
          userId: user._id,
          email: user.email,
          roles: user.roles,
          activeRole: user.activeRole,
          profileComplete: user.profileComplete,
        });
      } catch (saveError) {
        console.error("Error saving new user profile:", saveError);
        throw saveError;
      }

      // Reload user from database to ensure we have latest data
      const savedUser = await User.findById(user._id);
      if (!savedUser) {
        throw new Error("Failed to retrieve saved user profile");
      }

      return res.status(201).json({
        message: "Profile created successfully. Please verify your phone and email.",
        data: {
          userId: savedUser._id,
          email: savedUser.email,
          phone: savedUser.phone,
          name: savedUser.name,
          role: savedUser.activeRole || role || "sender",
          roles: savedUser.roles || [role || "sender"],
          activeRole: savedUser.activeRole || role || "sender",
          profileComplete: savedUser.profileComplete,
          kycStatus: savedUser.kycStatus || 'not_submitted',
        },
      });
    } else {
      // Update existing user
      user.name = fullName;
      if (phone && phone !== user.phone) {
        user.phone = phone;
        // Reset phone verification if phone changed
        user.phoneVerifiedAt = undefined;
      }
      if (address) {
        user.address = address;
      }
      if (role) {
        // Initialize roles array if it doesn't exist
        if (!user.roles) {
          user.roles = [];
        }
        
        // Add role if not already present
        if (!user.roles.includes(role)) {
          user.roles.push(role);
        }
        
        // Set as active role if no active role
        if (!user.activeRole) {
          user.activeRole = role;
        }
      }
      // Mark profile as complete if not already
      if (!user.profileComplete) {
        user.profileComplete = true;
        user.profileCompletedAt = new Date();
      }
      
      // Save user and verify it was saved
      try {
        await user.save();
        console.log("User profile saved successfully:", {
          userId: user._id,
          email: user.email,
          roles: user.roles,
          activeRole: user.activeRole,
          profileComplete: user.profileComplete,
        });
      } catch (saveError) {
        console.error("Error saving user profile:", saveError);
        throw saveError;
      }

      // Reload user from database to ensure we have latest data
      const savedUser = await User.findById(user._id);
      if (!savedUser) {
        throw new Error("Failed to retrieve saved user profile");
      }

      return res.status(200).json({
        message: "Profile updated successfully",
        data: {
          userId: savedUser._id,
          email: savedUser.email,
          phone: savedUser.phone,
          name: savedUser.name,
          role: savedUser.activeRole || role || "sender", // For backward compatibility
          roles: savedUser.roles || [],
          activeRole: savedUser.activeRole || role || "sender",
          profileComplete: savedUser.profileComplete,
          kycStatus: savedUser.kycStatus || 'not_submitted',
        },
      });
    }
  } catch (error) {
    console.error("Setup profile error:", error);
    
    // Handle duplicate email error
    if (error.code === 11000) {
      return res.status(400).json({ 
        message: "Email already exists. Please use a different email." 
      });
    }

    res.status(500).json({ 
      message: "Server error", 
      error: error.message 
    });
  }
};

// Get user profile
export const getProfile = async (req, res) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({ message: "User ID is required" });
    }

    const user = await User.findById(userId).select("-password -otpCode -verificationToken");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json({
      message: "Profile retrieved successfully",
      data: {
        userId: user._id,
        email: user.email,
        phone: user.phone,
        name: user.name,
        address: user.address,
        profilePhoto: user.profilePhoto,
        roles: user.roles || [],
        activeRole: user.activeRole || null,
        profileComplete: user.profileComplete || false,
        language: user.language || 'en',
        kycStatus: user.kycStatus || 'not_submitted',
      },
    });
  } catch (error) {
    console.error("Get profile error:", error);
    res.status(500).json({ 
      message: "Server error", 
      error: error.message 
    });
  }
};

// Update user profile
export const updateProfile = async (req, res) => {
  try {
    const { userId } = req.params;
    const { name, phone, address, profilePhoto, language } = req.body;

    if (!userId) {
      return res.status(400).json({ message: "User ID is required" });
    }

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Update fields if provided
    if (name) user.name = name;
    if (language && ['en', 'ur', 'ar', 'es', 'fr', 'de', 'zh', 'hi'].includes(language)) {
      user.language = language;
    }
    if (phone) {
      // Reset phone verification if phone changed
      if (phone !== user.phone) {
        user.phone = phone;
        user.phoneVerifiedAt = undefined;
      }
    }
    if (address !== undefined) user.address = address;
    
    // Handle profile photo upload
    console.log("Profile update - req.file:", req.file ? "exists" : "null", "profilePhoto in body:", profilePhoto ? "exists" : "null");
    
    if (req.file) {
      // Photo uploaded via multer - convert to base64
      console.log("Processing file upload via multer:", req.file.mimetype, req.file.size, "bytes");
      const photoBase64 = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
      user.profilePhoto = photoBase64;
    } else if (profilePhoto) {
      // Photo sent as base64 string in body (from FormData or JSON)
      console.log("Processing profilePhoto from body, type:", typeof profilePhoto, "starts with data:", profilePhoto.startsWith?.('data:'));
      // Check if it's already in base64 format
      if (typeof profilePhoto === 'string' && profilePhoto.startsWith('data:')) {
        user.profilePhoto = profilePhoto;
      } else if (typeof profilePhoto === 'string') {
        // If it's a string but not base64, assume it's a URL or path
        user.profilePhoto = profilePhoto;
      }
    }

    await user.save();

    res.status(200).json({
      message: "Profile updated successfully",
      data: {
        userId: user._id,
        email: user.email,
        phone: user.phone,
        name: user.name,
        address: user.address,
        profilePhoto: user.profilePhoto,
        language: user.language || 'en',
      },
    });
  } catch (error) {
    console.error("Update profile error:", error);
    res.status(500).json({ 
      message: "Server error", 
      error: error.message 
    });
  }
};

// Submit KYC documents
export const submitKYC = async (req, res) => {
  try {
    const { userId } = req.params;
    const { cnicFront, cnicBack, selfie } = req.body;

    console.log("KYC Submission Request:");
    console.log("- User ID:", userId);
    console.log("- Has cnicFront:", !!cnicFront);
    console.log("- Has cnicBack:", !!cnicBack);
    console.log("- Has selfie:", !!selfie);
    console.log("- cnicFront length:", cnicFront?.length);
    console.log("- cnicBack length:", cnicBack?.length);
    console.log("- selfie length:", selfie?.length);

    if (!userId) {
      return res.status(400).json({ message: "User ID is required" });
    }

    if (!cnicFront || !cnicBack || !selfie) {
      return res.status(400).json({ 
        message: "All documents are required (CNIC front, CNIC back, and selfie)",
        received: {
          cnicFront: !!cnicFront,
          cnicBack: !!cnicBack,
          selfie: !!selfie
        }
      });
    }

    // Check total payload size (MongoDB has 16MB document limit)
    const totalSize = (cnicFront?.length || 0) + (cnicBack?.length || 0) + (selfie?.length || 0);
    const totalSizeMB = totalSize / (1024 * 1024);
    console.log(`Total payload size: ${totalSizeMB.toFixed(2)} MB`);
    
    if (totalSizeMB > 10) { // Leave some buffer for other document fields
      return res.status(400).json({ 
        message: "Total image size is too large. Please compress your images or use lower quality photos.",
        detail: `Total size: ${totalSizeMB.toFixed(2)} MB (Maximum: 10 MB)`
      });
    }

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    console.log(`Submit KYC - User ID: ${userId}, Current Status: ${user.kycStatus}`);

    if (user.kycStatus === 'approved') {
      return res.status(400).json({ 
        message: "KYC already approved" 
      });
    }

    // Allow resubmission if rejected
    if (user.kycStatus === 'pending') {
      return res.status(400).json({ 
        message: "KYC submission is already pending review. Please wait for admin approval." 
      });
    }

    // Update KYC documents
    user.kycDocuments = [
      {
        type: 'cnic_front',
        url: cnicFront,
        uploadedAt: new Date(),
      },
      {
        type: 'cnic_back',
        url: cnicBack,
        uploadedAt: new Date(),
      },
      {
        type: 'selfie',
        url: selfie,
        uploadedAt: new Date(),
      }
    ];

    user.kycStatus = 'pending';
    user.kycSubmittedAt = new Date();

    await user.save();

    res.status(200).json({
      message: "KYC documents submitted successfully. Your documents are under review.",
      data: {
        userId: user._id,
        kycStatus: user.kycStatus,
        kycSubmittedAt: user.kycSubmittedAt,
      },
    });
  } catch (error) {
    console.error("Submit KYC error:", error);
    
    // Check for MongoDB document size limit error
    if (error.message && error.message.includes('too large')) {
      return res.status(400).json({ 
        message: "Images are too large. Please use smaller or compressed images.",
        error: "Document size exceeds MongoDB limit (16MB)"
      });
    }
    
    // Check for validation errors
    if (error.name === 'ValidationError') {
      return res.status(400).json({ 
        message: "Validation error",
        error: error.message
      });
    }
    
    res.status(500).json({ 
      message: "Server error", 
      error: error.message 
    });
  }
};

// Get KYC status
export const getKYCStatus = async (req, res) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({ message: "User ID is required" });
    }

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    console.log(`Get KYC Status - User ID: ${userId}, Status: ${user.kycStatus}`);

    res.status(200).json({
      message: "KYC status retrieved successfully",
      kycStatus: user.kycStatus || 'not_submitted',
      kycSubmittedAt: user.kycSubmittedAt,
      kycReviewedAt: user.kycReviewedAt,
      kycRejectionReason: user.kycRejectionReason,
    });
  } catch (error) {
    console.error("Get KYC status error:", error);
    res.status(500).json({ 
      message: "Server error", 
      error: error.message 
    });
  }
};
