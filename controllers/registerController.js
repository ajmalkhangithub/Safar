import bcrypt from "bcryptjs";
import User from "../models/User.js";
import sendEmail from "../utils/sendEmail.js";
import {
  OTP_EXPIRY_MINUTES,
  buildOtpEmail,
  generateOtpCode,
  generateVerificationToken,
  getOtpExpiryDate,
  getVerificationExpiryDate,
} from "../utils/verificationHelpers.js";

export const registerUser = async (req, res) => {
  try {
    const { name, email, phone, password } = req.body;

    if (!name || !email || !phone || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "Email already registered" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const otpCode = generateOtpCode();
    const verificationToken = generateVerificationToken();

    const otpExpiresAt = getOtpExpiryDate();
    const verificationTokenExpiresAt = getVerificationExpiryDate();

    const newUser = new User({
      name,
      email,
      phone,
      password: hashedPassword,
      otpCode,
      otpExpiresAt,
      verificationToken,
      verificationTokenExpiresAt,
    });

    await newUser.save();

    await sendEmail(email, "Your SafarX OTP Code", buildOtpEmail(name, otpCode));

    res.status(201).json({
      message: "User registered successfully. OTP sent.",
      data: {
        userId: newUser._id,
        email: newUser.email,
        phone: newUser.phone,
        otpExpiresAt,
        verificationToken,
      },
    });
  } catch (error) {
    console.error("Register error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
