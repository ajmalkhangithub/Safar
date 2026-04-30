import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User.js";

export const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: "User not found" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const token = jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET || "SECRET_KEY",
      { expiresIn: "7d" }
    );

    // Return user data with profile completion status
    // Use activeRole if available, otherwise fall back to role field for backward compatibility
    const userRole = user.activeRole || user.role || null;
    
    res.status(200).json({
      message: "Login successful",
      token,
      data: {
        userId: user._id,
        email: user.email,
        name: user.name,
        phone: user.phone,
        role: userRole,
        roles: user.roles || [],
        activeRole: user.activeRole || userRole,
        profileComplete: user.profileComplete || false,
        language: user.language || 'en',
        kycStatus: user.kycStatus || 'not_submitted',
      },
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
