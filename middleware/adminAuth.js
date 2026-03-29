import User from "../models/User.js";

// Middleware to verify if user is an admin
export const verifyAdmin = async (req, res, next) => {
  try {
    // Check all possible locations for userId
    const userId = req.body?.userId || req.params?.userId || req.query?.userId;

    if (!userId) {
      console.log("Admin auth failed - no userId found in:", {
        body: req.body,
        params: req.params,
        query: req.query,
      });
      return res.status(401).json({
        message: "Unauthorized: User ID is required",
      });
    }

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    if (!user.isAdmin && !user.isSuperAdmin) {
      return res.status(403).json({
        message: "Forbidden: Admin access required",
      });
    }

    // Attach user to request for use in controllers
    req.adminUser = user;
    next();
  } catch (error) {
    console.error("Admin verification error:", error);
    res.status(500).json({
      message: "Server error during authentication",
      error: error.message,
    });
  }
};

// Middleware to verify super admin
export const verifySuperAdmin = async (req, res, next) => {
  try {
    // Check all possible locations for userId
    const userId = req.body?.userId || req.params?.userId || req.query?.userId;

    if (!userId) {
      return res.status(401).json({
        message: "Unauthorized: User ID is required",
      });
    }

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    if (!user.isSuperAdmin) {
      return res.status(403).json({
        message: "Forbidden: Super Admin access required",
      });
    }

    req.adminUser = user;
    next();
  } catch (error) {
    console.error("Super admin verification error:", error);
    res.status(500).json({
      message: "Server error during authentication",
      error: error.message,
    });
  }
};

// Middleware to check specific permission
export const checkPermission = (permission) => {
  return (req, res, next) => {
    const user = req.adminUser;

    if (user.isSuperAdmin) {
      // Super admins have all permissions
      return next();
    }

    if (!user.adminPermissions.includes(permission)) {
      return res.status(403).json({
        message: `Forbidden: ${permission} permission required`,
      });
    }

    next();
  };
};
