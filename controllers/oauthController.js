import User from "../models/User.js";
import jwt from "jsonwebtoken";

// Generate JWT token for authenticated user
const generateToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET || "SECRET_KEY", {
    expiresIn: "30d",
  });
};

// ======================
// GOOGLE OAUTH
// ======================
export const googleLogin = async (req, res) => {
  try {
    const { idToken, email, name, picture, googleId } = req.body;

    if (!email || !googleId) {
      return res.status(400).json({ message: "Google authentication data is required" });
    }

    // Check if user exists with this Google ID
    let user = await User.findOne({ provider: "google", providerId: googleId });

    if (!user) {
      // Check if user exists with this email (might have registered with email/password)
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        // Link Google account to existing user
        existingUser.provider = "google";
        existingUser.providerId = googleId;
        if (picture) existingUser.picture = picture;
        await existingUser.save();
        user = existingUser;
      } else {
        // Create new user
        user = new User({
          name: name || email.split("@")[0],
          email,
          provider: "google",
          providerId: googleId,
          emailVerifiedAt: new Date(), // Google emails are pre-verified
          phone: "", // OAuth users don't need phone initially
        });
        await user.save();
      }
    } else {
      // Update user info if needed
      if (name && user.name !== name) user.name = name;
      if (picture) user.picture = picture;
      await user.save();
    }

    const token = generateToken(user._id);

    res.status(200).json({
      message: "Google login successful",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        provider: user.provider,
      },
    });
  } catch (error) {
    console.error("Google login error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// ======================
// FACEBOOK OAUTH
// ======================
export const facebookLogin = async (req, res) => {
  try {
    const { accessToken, email, name, picture, facebookId } = req.body;

    if (!email || !facebookId) {
      return res.status(400).json({ message: "Facebook authentication data is required" });
    }

    // Check if user exists with this Facebook ID
    let user = await User.findOne({ provider: "facebook", providerId: facebookId });

    if (!user) {
      // Check if user exists with this email (might have registered with email/password)
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        // Link Facebook account to existing user
        existingUser.provider = "facebook";
        existingUser.providerId = facebookId;
        if (picture) existingUser.picture = picture;
        await existingUser.save();
        user = existingUser;
      } else {
        // Create new user
        user = new User({
          name: name || email.split("@")[0],
          email,
          provider: "facebook",
          providerId: facebookId,
          emailVerifiedAt: new Date(), // Facebook emails are pre-verified
          phone: "", // OAuth users don't need phone initially
        });
        await user.save();
      }
    } else {
      // Update user info if needed
      if (name && user.name !== name) user.name = name;
      if (picture) user.picture = picture;
      await user.save();
    }

    const token = generateToken(user._id);

    res.status(200).json({
      message: "Facebook login successful",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        provider: user.provider,
      },
    });
  } catch (error) {
    console.error("Facebook login error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

