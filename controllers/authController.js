import User from "../models/User.js";
import sendEmail from "../utils/sendEmail.js";
import jwt from "jsonwebtoken";
import {
  buildOtpEmail,
  buildVerificationEmail,
  generateOtpCode,
  generateVerificationToken,
  getOtpExpiryDate,
  getVerificationExpiryDate,
} from "../utils/verificationHelpers.js";

// ======================
// FORGOT USERNAME
// ======================
export const forgotUsername = async (req, res) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email });
    if (!user)
      return res.status(404).json({ message: "No user found with this email" });

    await sendEmail(
      email,
      "Your Username",
      `Your username is: ${user.username}`
    );

    res.json({ message: "Username sent to your email" });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

// ======================
// FORGOT PASSWORD
// ======================
export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email });
    if (!user)
      return res.status(404).json({ message: "No user found with this email" });

    // Generate Reset Token
    const token = jwt.sign({ id: user._id }, "SECRET_KEY", { expiresIn: "15m" });

    const resetLink = `http://localhost:5000/reset-password/${token}`;

    await sendEmail(email, "Reset Password", `Reset Link → ${resetLink}`);

    res.json({ message: "Password reset link has been sent to your email" });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

// ======================
// RESET PASSWORD
// ======================
export const resetPassword = async (req, res) => {
  try {
    const { token } = req.params;
    const { newPassword } = req.body;

    const decoded = jwt.verify(token, "SECRET_KEY");

    const user = await User.findById(decoded.id);
    if (!user)
      return res.status(404).json({ message: "Invalid token or user not found" });

    user.password = newPassword;
    await user.save();

    res.json({ message: "Password reset successfully!" });
  } catch (err) {
    res.status(400).json({ message: "Invalid or expired token" });
  }
};

// ======================
// OTP VERIFICATION
// ======================
const resolveUserQuery = ({ userId, email }) => {
  if (userId) return { _id: userId };
  if (email) return { email };
  return null;
};

const getBaseUrl = (req) =>
  process.env.SERVER_PUBLIC_URL || `${req.protocol}://${req.get("host")}`;

export const verifyOtp = async (req, res) => {
  try {
    const { userId, email, otp } = req.body;
    if (!otp) return res.status(400).json({ message: "OTP code is required" });

    const query = resolveUserQuery({ userId, email });
    if (!query) {
      return res.status(400).json({ message: "User identifier missing" });
    }

    const user = await User.findOne(query);
    if (!user) return res.status(404).json({ message: "User not found" });

    if (!user.otpCode || !user.otpExpiresAt) {
      return res.status(400).json({ message: "No OTP pending verification" });
    }

    if (user.otpExpiresAt < new Date()) {
      return res.status(400).json({ message: "OTP has expired" });
    }

    if (user.otpCode !== otp) {
      return res.status(400).json({ message: "Invalid OTP" });
    }

    user.phoneVerifiedAt = new Date();
    user.otpCode = undefined;
    user.otpExpiresAt = undefined;
    await user.save();

    const verificationLink = `${getBaseUrl(req)}/api/auth/verify-email/${user.verificationToken}`;

    await sendEmail(
      user.email,
      "Complete your SafarX registration",
      buildVerificationEmail(user.name, verificationLink)
    );

    res.json({
      message: "OTP verified successfully",
      data: {
        userId: user._id,
        email: user.email,
        phone: user.phone,
        verificationToken: user.verificationToken,
        verificationLink,
      },
    });
  } catch (error) {
    console.error("verifyOtp error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Send OTP for phone verification (for profile setup)
export const sendOtp = async (req, res) => {
  try {
    const { phone, email, userId } = req.body;
    
    // Find user by phone, email, or userId
    let user;
    if (userId) {
      user = await User.findById(userId);
    } else if (email) {
      user = await User.findOne({ email });
    } else if (phone) {
      user = await User.findOne({ phone });
    } else {
      return res.status(400).json({ message: "Phone, email, or userId is required" });
    }

    if (!user) {
      return res.status(404).json({ 
        message: "User not found. Please register first to verify your phone number.",
        code: "USER_NOT_FOUND"
      });
    }

    // If phone is already verified, return success
    if (user.phoneVerifiedAt) {
      return res.json({
        message: "Phone already verified",
        data: { phoneVerified: true },
      });
    }

    // Generate and save OTP
    user.otpCode = generateOtpCode();
    user.otpExpiresAt = getOtpExpiryDate();
    await user.save();

    // Send OTP via email (since we don't have SMS service)
    await sendEmail(
      user.email,
      "Your SafarX OTP Code",
      buildOtpEmail(user.name, user.otpCode)
    );

    res.json({
      message: "OTP sent successfully",
      data: {
        userId: user._id,
        email: user.email,
        phone: user.phone,
        otpExpiresAt: user.otpExpiresAt,
      },
    });
  } catch (error) {
    console.error("sendOtp error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

export const resendOtp = async (req, res) => {
  try {
    const { userId, email } = req.body;
    const query = resolveUserQuery({ userId, email });
    if (!query) {
      return res.status(400).json({ message: "User identifier missing" });
    }

    const user = await User.findOne(query);
    if (!user) return res.status(404).json({ message: "User not found" });

    if (user.phoneVerifiedAt) {
      return res.status(400).json({ message: "Phone already verified" });
    }

    user.otpCode = generateOtpCode();
    user.otpExpiresAt = getOtpExpiryDate();
    await user.save();

    await sendEmail(user.email, "Your new SafarX OTP", buildOtpEmail(user.name, user.otpCode));

    res.json({
      message: "OTP resent successfully",
      data: { otpExpiresAt: user.otpExpiresAt },
    });
  } catch (error) {
    console.error("resendOtp error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Send verification email (for profile setup)
export const sendVerificationEmail = async (req, res) => {
  try {
    const { email, userId } = req.body;
    
    // Find user by email or userId
    let user;
    if (userId) {
      user = await User.findById(userId);
    } else if (email) {
      user = await User.findOne({ email });
    } else {
      return res.status(400).json({ message: "Email or userId is required" });
    }

    if (!user) {
      return res.status(404).json({ 
        message: "User not found. Please register first to verify your email.",
        code: "USER_NOT_FOUND"
      });
    }

    // If email is already verified, return success
    if (user.emailVerifiedAt) {
      return res.json({
        message: "Email already verified",
        data: { emailVerified: true },
      });
    }

    // Generate verification token if not exists
    if (!user.verificationToken) {
      user.verificationToken = generateVerificationToken();
      user.verificationTokenExpiresAt = getVerificationExpiryDate();
      await user.save();
    }

    const verificationLink = `${getBaseUrl(req)}/api/auth/verify-email/${user.verificationToken}`;

    // Send verification email
    await sendEmail(
      user.email,
      "Verify your SafarX email",
      buildVerificationEmail(user.name, verificationLink)
    );

    res.json({
      message: "Verification email sent successfully",
      data: {
        userId: user._id,
        email: user.email,
        verificationLink,
      },
    });
  } catch (error) {
    console.error("sendVerificationEmail error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

export const getVerificationEmailPreview = async (req, res) => {
  try {
    const { userId } = req.params;
    if (!userId) return res.status(400).json({ message: "userId param is required" });

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    const verificationLink = `${getBaseUrl(req)}/api/auth/verify-email/${user.verificationToken}`;

    res.json({
      message: "Preview generated",
      data: {
        sender: "Coach Time",
        subject: "Finish setting up your Coach Time account",
        previewLines: [
          `Hi ${user.name || "there"}`,
          "Congrats! Your account has been created.",
          "Click the link below to go back to application.",
        ],
        verificationLink,
      },
    });
  } catch (error) {
    console.error("getVerificationEmailPreview error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

const completeEmailVerification = async (user) => {
  user.emailVerifiedAt = new Date();
  user.verificationToken = undefined;
  user.verificationTokenExpiresAt = undefined;
  await user.save();
};

const verifyTokenAndRespond = async (token, res) => {
  if (!token) {
    return res.status(400).json({ message: "Verification token is required" });
  }

  const user = await User.findOne({ verificationToken: token });
  if (!user) {
    return res.status(404).json({ message: "Invalid verification token" });
  }

  if (user.verificationTokenExpiresAt && user.verificationTokenExpiresAt < new Date()) {
    return res.status(400).json({ message: "Verification link has expired" });
  }

  await completeEmailVerification(user);

  return res.json({ message: "Email verified successfully" });
};

export const verifyEmailByBody = async (req, res) => {
  try {
    const { token } = req.body;
    await verifyTokenAndRespond(token, res);
  } catch (error) {
    console.error("verifyEmailByBody error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

export const verifyEmailByParam = async (req, res) => {
  try {
    const { token } = req.params;
    await verifyTokenAndRespond(token, res);
  } catch (error) {
    console.error("verifyEmailByParam error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
