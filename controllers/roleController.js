import User from "../models/User.js";

// Switch user's active role
export const switchRole = async (req, res) => {
  try {
    const { userId } = req.params;
    const { role } = req.body;

    if (!role || !["traveler", "sender"].includes(role)) {
      return res.status(400).json({
        message: "Valid role (traveler or sender) is required",
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Check if user has this role
    if (!user.roles || !user.roles.includes(role)) {
      return res.status(400).json({
        message: "You don't have access to this role. Please complete profile setup for this role first.",
      });
    }

    // Update active role
    user.activeRole = role;
    await user.save();

    res.status(200).json({
      message: "Role switched successfully",
      data: {
        userId: user._id,
        activeRole: user.activeRole,
        roles: user.roles,
      },
    });
  } catch (error) {
    console.error("Switch role error:", error);
    res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
};

// Add role to user (when completing profile for second role)
export const addRole = async (req, res) => {
  try {
    const { userId } = req.params;
    const { role } = req.body;

    if (!role || !["traveler", "sender"].includes(role)) {
      return res.status(400).json({
        message: "Valid role (traveler or sender) is required",
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

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

    await user.save();

    res.status(200).json({
      message: "Role added successfully",
      data: {
        userId: user._id,
        activeRole: user.activeRole,
        roles: user.roles,
      },
    });
  } catch (error) {
    console.error("Add role error:", error);
    res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
};

// Get user roles
export const getUserRoles = async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId).select("roles activeRole profileComplete");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json({
      message: "User roles retrieved successfully",
      data: {
        roles: user.roles || [],
        activeRole: user.activeRole,
        profileComplete: user.profileComplete,
        isDualRole: (user.roles || []).length > 1,
      },
    });
  } catch (error) {
    console.error("Get user roles error:", error);
    res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
};
