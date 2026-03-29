import User from "../models/User.js";
import Package from "../models/Package.js";
import Trip from "../models/Trip.js";
import BookingRequest from "../models/BookingRequest.js";
import DisputeReport from "../models/DisputeReport.js";
import Wallet from "../models/Wallet.js";
import bcryptjs from "bcryptjs";

// Admin login
export const adminLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        message: "Email and password are required",
      });
    }

    // Find user by email
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(401).json({
        message: "Invalid credentials",
      });
    }

    // Check if user is admin
    if (!user.isAdmin && !user.isSuperAdmin) {
      return res.status(403).json({
        message: "Access denied: Admin privileges required",
      });
    }

    // Verify password
    const isPasswordValid = await bcryptjs.compare(password, user.password);

    if (!isPasswordValid) {
      return res.status(401).json({
        message: "Invalid credentials",
      });
    }

    // Return user data (excluding password)
    const { password: _, ...adminData } = user.toObject();

    res.status(200).json({
      message: "Admin login successful",
      data: {
        user: adminData,
        isAdmin: user.isAdmin,
        isSuperAdmin: user.isSuperAdmin,
        permissions: user.adminPermissions,
      },
    });
  } catch (error) {
    console.error("Admin login error:", error);
    res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
};

// Get admin dashboard statistics
export const getDashboardStats = async (req, res) => {
  try {
    // Total counts
    const totalUsers = await User.countDocuments();
    const totalPackages = await Package.countDocuments();
    const totalTrips = await Trip.countDocuments();
    const totalBookings = await BookingRequest.countDocuments();

    // Active counts (recent activity)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const activeUsers = await User.countDocuments({
      createdAt: { $gte: thirtyDaysAgo },
    });

    const activePackages = await Package.countDocuments({
      status: { $in: ["pending", "confirmed", "in_transit"] },
    });

    const activeTrips = await Trip.countDocuments({
      status: { $in: ["upcoming", "in_progress"] },
    });

    const pendingBookings = await BookingRequest.countDocuments({
      status: "pending",
    });

    // User role distribution
    const travelers = await User.countDocuments({
      roles: { $in: ["traveler"] },
    });

    const senders = await User.countDocuments({
      roles: { $in: ["sender"] },
    });

    const admins = await User.countDocuments({
      isAdmin: true,
    });

    // Recent activity (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const recentUsers = await User.countDocuments({
      createdAt: { $gte: sevenDaysAgo },
    });

    const recentPackages = await Package.countDocuments({
      createdAt: { $gte: sevenDaysAgo },
    });

    const recentTrips = await Trip.countDocuments({
      createdAt: { $gte: sevenDaysAgo },
    });

    // Package status distribution
    const packagesByStatus = await Package.aggregate([
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
        },
      },
    ]);

    // Trip status distribution
    const tripsByStatus = await Trip.aggregate([
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
        },
      },
    ]);

    // Alerts data
    const pendingKYC = await User.countDocuments({ kycStatus: "pending" });
    const disputedParcels = await DisputeReport.countDocuments({ 
      status: { $in: ["pending", "reviewing"] } 
    });
    const failedPayments = 0; // TODO: Implement when payment tracking is added

    // Recent activity details (last 10 activities)
    const recentUserActivities = await User.find()
      .select("name email createdAt")
      .sort({ createdAt: -1 })
      .limit(5);

    const recentPackageActivities = await Package.find()
      .populate("userId", "name")
      .select("packageName trackingNumber createdAt userId")
      .sort({ createdAt: -1 })
      .limit(5);

    const recentBookingActivities = await BookingRequest.find()
      .populate("senderId", "name")
      .populate("packageId", "packageName")
      .select("status createdAt senderId packageId")
      .sort({ createdAt: -1 })
      .limit(5);

    const recentKYCActivities = await User.find({ kycStatus: "approved", kycReviewedAt: { $exists: true } })
      .select("name email kycReviewedAt")
      .sort({ kycReviewedAt: -1 })
      .limit(3);

    // Combine and sort recent activities
    const activities = [];
    
    recentUserActivities.forEach(user => {
      activities.push({
        type: "user_registered",
        title: "New User Registered",
        description: user.name,
        timestamp: user.createdAt,
        icon: "person-add"
      });
    });

    recentPackageActivities.forEach(pkg => {
      activities.push({
        type: "package_created",
        title: "Package Created",
        description: `${pkg.packageName} - #${pkg.trackingNumber}`,
        timestamp: pkg.createdAt,
        icon: "cube"
      });
    });

    recentBookingActivities.forEach(booking => {
      if (booking.status === "confirmed" || booking.status === "completed") {
        activities.push({
          type: "booking_completed",
          title: "Booking Completed",
          description: booking.packageId?.packageName || "Package",
          timestamp: booking.createdAt,
          icon: "checkmark-circle"
        });
      }
    });

    recentKYCActivities.forEach(user => {
      activities.push({
        type: "kyc_approved",
        title: "KYC Approved",
        description: user.name,
        timestamp: user.kycReviewedAt,
        icon: "shield-checkmark"
      });
    });

    // Sort activities by timestamp and take top 10
    const recentActivities = activities
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, 10);

    // Monthly users growth (last 6 months)
    const monthlyUsersGrowth = [];
    for (let i = 5; i >= 0; i--) {
      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - i);
      startDate.setDate(1);
      startDate.setHours(0, 0, 0, 0);

      const endDate = new Date(startDate);
      endDate.setMonth(endDate.getMonth() + 1);

      const count = await User.countDocuments({
        createdAt: { $gte: startDate, $lt: endDate }
      });

      monthlyUsersGrowth.push({
        month: startDate.toLocaleString('en-US', { month: 'short' }),
        count: count
      });
    }

    res.status(200).json({
      message: "Dashboard statistics retrieved successfully",
      data: {
        overview: {
          totalUsers,
          totalPackages,
          totalTrips,
          totalBookings,
        },
        active: {
          activeUsers,
          activePackages,
          activeTrips,
          pendingBookings,
        },
        userDistribution: {
          travelers,
          senders,
          admins,
        },
        recentActivity: {
          newUsers: recentUsers,
          newPackages: recentPackages,
          newTrips: recentTrips,
        },
        alerts: {
          pendingKYC,
          disputedParcels,
          failedPayments,
        },
        recentActivities,
        monthlyUsersGrowth,
        packagesByStatus,
        tripsByStatus,
      },
    });
  } catch (error) {
    console.error("Get dashboard stats error:", error);
    res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
};

// Get all users with pagination and filters
export const getAllUsers = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      search = "",
      role = "",
      isAdmin = "",
      sortBy = "createdAt",
      sortOrder = "desc",
    } = req.query;

    // Build query
    const query = {};

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { phone: { $regex: search, $options: "i" } },
      ];
    }

    if (role) {
      query.roles = { $in: [role] };
    }

    if (isAdmin !== "") {
      query.isAdmin = isAdmin === "true";
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const sortOptions = { [sortBy]: sortOrder === "asc" ? 1 : -1 };

    // Get users
    const users = await User.find(query)
      .select("-password -otpCode -verificationToken")
      .sort(sortOptions)
      .limit(parseInt(limit))
      .skip(skip);

    // Get total count
    const total = await User.countDocuments(query);

    res.status(200).json({
      message: "Users retrieved successfully",
      data: {
        users,
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(total / parseInt(limit)),
        },
      },
    });
  } catch (error) {
    console.error("Get all users error:", error);
    res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
};

// Get single user details
export const getUserDetails = async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId).select(
      "-password -otpCode -verificationToken"
    );

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    // Get user's packages
    const packages = await Package.find({ userId }).limit(10);

    // Get user's trips (if traveler)
    const trips = await Trip.find({ travelerId: userId }).limit(10);

    // Get user's bookings
    const bookings = await BookingRequest.find({
      $or: [{ senderId: userId }, { travelerId: userId }],
    }).limit(10);

    res.status(200).json({
      message: "User details retrieved successfully",
      data: {
        user,
        packages,
        trips,
        bookings,
      },
    });
  } catch (error) {
    console.error("Get user details error:", error);
    res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
};

// Update user status (activate/deactivate)
export const updateUserStatus = async (req, res) => {
  try {
    const { userId } = req.params;
    const { isActive, reason } = req.body;

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    // Prevent deactivating super admins
    if (user.isSuperAdmin && !req.adminUser.isSuperAdmin) {
      return res.status(403).json({
        message: "Cannot modify super admin accounts",
      });
    }

    user.isActive = isActive;
    if (reason) {
      user.deactivationReason = reason;
    }

    await user.save();

    res.status(200).json({
      message: `User ${isActive ? "activated" : "deactivated"} successfully`,
      data: user,
    });
  } catch (error) {
    console.error("Update user status error:", error);
    res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
};

// Update user roles
export const updateUserRoles = async (req, res) => {
  try {
    const { userId } = req.params;
    const { roles, isAdmin, adminPermissions } = req.body;

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    // Only super admin can modify admin status
    if (isAdmin !== undefined && !req.adminUser.isSuperAdmin) {
      return res.status(403).json({
        message: "Only super admins can modify admin status",
      });
    }

    if (roles) {
      user.roles = roles;
    }

    if (isAdmin !== undefined) {
      user.isAdmin = isAdmin;
    }

    if (adminPermissions) {
      user.adminPermissions = adminPermissions;
    }

    await user.save();

    res.status(200).json({
      message: "User roles updated successfully",
      data: user,
    });
  } catch (error) {
    console.error("Update user roles error:", error);
    res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
};

// Delete user
export const deleteUser = async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    // Prevent deleting super admins
    if (user.isSuperAdmin) {
      return res.status(403).json({
        message: "Cannot delete super admin accounts",
      });
    }

    await User.findByIdAndDelete(userId);

    res.status(200).json({
      message: "User deleted successfully",
    });
  } catch (error) {
    console.error("Delete user error:", error);
    res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
};

// Create admin user
export const createAdmin = async (req, res) => {
  try {
    const { name, email, password, isSuperAdmin, adminPermissions } = req.body;

    // Only super admin can create admins
    if (!req.adminUser.isSuperAdmin) {
      return res.status(403).json({
        message: "Only super admins can create admin accounts",
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });

    if (existingUser) {
      return res.status(400).json({
        message: "User with this email already exists",
      });
    }

    // Hash password
    const hashedPassword = await bcryptjs.hash(password, 10);

    // Create admin user
    const adminUser = new User({
      name,
      email,
      password: hashedPassword,
      isAdmin: true,
      isSuperAdmin: isSuperAdmin || false,
      adminPermissions: adminPermissions || [
        "users",
        "packages",
        "trips",
        "bookings",
        "analytics",
      ],
      roles: ["admin"],
      activeRole: "admin",
      profileComplete: true,
      emailVerifiedAt: new Date(),
    });

    await adminUser.save();

    const { password: _, ...adminData } = adminUser.toObject();

    res.status(201).json({
      message: "Admin user created successfully",
      data: adminData,
    });
  } catch (error) {
    console.error("Create admin error:", error);
    res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
};

// Get all packages with pagination and filters
export const getAllPackages = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      search = "",
      status = "",
      sortBy = "createdAt",
      sortOrder = "desc",
    } = req.query;

    // Build query
    const query = {};

    if (search) {
      query.$or = [
        { trackingNumber: { $regex: search, $options: "i" } },
        { packageName: { $regex: search, $options: "i" } },
      ];
    }

    if (status) {
      query.status = status;
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const sortOptions = { [sortBy]: sortOrder === "asc" ? 1 : -1 };

    // Get packages with user info
    const packages = await Package.find(query)
      .populate("userId", "name email phone")
      .sort(sortOptions)
      .limit(parseInt(limit))
      .skip(skip);

    // Get total count
    const total = await Package.countDocuments(query);

    // Get booking info for each package (traveler and payment status)
    const packagesWithBooking = await Promise.all(
      packages.map(async (pkg) => {
        const booking = await BookingRequest.findOne({
          packageId: pkg._id,
          status: { $in: ["accepted", "pending"] },
        })
          .populate("travelerId", "name email phone")
          .sort({ createdAt: -1 });

        return {
          ...pkg.toObject(),
          booking: booking ? {
            travelerId: booking.travelerId,
            paymentStatus: booking.paymentStatus,
            paymentAmount: booking.paymentAmount,
            bookingId: booking._id,
          } : null,
        };
      })
    );

    res.status(200).json({
      message: "Packages retrieved successfully",
      data: {
        packages: packagesWithBooking,
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(total / parseInt(limit)),
        },
      },
    });
  } catch (error) {
    console.error("Get all packages error:", error);
    res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
};

// Get all trips with pagination and filters
export const getAllTrips = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      search = "",
      status = "",
      sortBy = "createdAt",
      sortOrder = "desc",
    } = req.query;

    // Build query
    const query = {};

    if (search) {
      query.$or = [
        { tripName: { $regex: search, $options: "i" } },
      ];
    }

    if (status) {
      query.status = status;
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const sortOptions = { [sortBy]: sortOrder === "asc" ? 1 : -1 };

    // Get trips with user info
    const trips = await Trip.find(query)
      .populate("userId", "name email phone")
      .sort(sortOptions)
      .limit(parseInt(limit))
      .skip(skip);

    // Get total count
    const total = await Trip.countDocuments(query);

    res.status(200).json({
      message: "Trips retrieved successfully",
      data: {
        trips,
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(total / parseInt(limit)),
        },
      },
    });
  } catch (error) {
    console.error("Get all trips error:", error);
    res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
};

// Get all dispute reports with pagination and filters
export const getAllReports = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      status = "",
      disputeType = "",
      sortBy = "createdAt",
      sortOrder = "desc",
    } = req.query;

    // Build query
    const query = {};

    if (status) {
      query.status = status;
    }

    if (disputeType) {
      query.disputeType = disputeType;
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const sortOptions = { [sortBy]: sortOrder === "asc" ? 1 : -1 };

    // Get reports with full user and package info
    const reports = await DisputeReport.find(query)
      .populate("reportedBy", "name email phone")
      .populate("reportedAgainst", "name email phone")
      .populate("packageId", "trackingNumber packageName")
      .populate("bookingId")
      .sort(sortOptions)
      .limit(parseInt(limit))
      .skip(skip);

    // Get total count
    const total = await DisputeReport.countDocuments(query);

    res.status(200).json({
      message: "Reports retrieved successfully",
      data: {
        reports,
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(total / parseInt(limit)),
        },
      },
    });
  } catch (error) {
    console.error("Get all reports error:", error);
    res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
};

// Get all KYC requests with pagination and filters
export const getAllKYCRequests = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      status = "",
      sortBy = "kycSubmittedAt",
      sortOrder = "desc",
    } = req.query;

    // Build query - only users who have submitted KYC
    const query = {
      kycStatus: status || { $ne: "not_submitted" },
    };

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const sortOptions = { [sortBy]: sortOrder === "asc" ? 1 : -1 };

    // Get KYC requests
    const kycRequests = await User.find(query)
      .select("name email phone kycStatus kycDocuments kycSubmittedAt kycReviewedAt kycReviewedBy kycRejectionReason roles")
      .populate("kycReviewedBy", "name email")
      .sort(sortOptions)
      .limit(parseInt(limit))
      .skip(skip);

    // Get total count
    const total = await User.countDocuments(query);

    // Get status counts
    const statusCounts = await User.aggregate([
      { $match: { kycStatus: { $ne: "not_submitted" } } },
      { $group: { _id: "$kycStatus", count: { $sum: 1 } } },
    ]);

    res.status(200).json({
      message: "KYC requests retrieved successfully",
      data: {
        requests: kycRequests,
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(total / parseInt(limit)),
        },
        statusCounts: statusCounts.reduce((acc, item) => {
          acc[item._id] = item.count;
          return acc;
        }, {}),
      },
    });
  } catch (error) {
    console.error("Get KYC requests error:", error);
    res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
};

// Approve KYC request
export const approveKYC = async (req, res) => {
  try {
    const { userId } = req.params;
    const adminUserId = req.body.userId; // Admin who is approving

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    if (user.kycStatus !== "pending") {
      return res.status(400).json({
        message: "KYC request is not in pending state",
      });
    }

    user.kycStatus = "approved";
    user.kycReviewedAt = new Date();
    user.kycReviewedBy = adminUserId;
    user.kycRejectionReason = undefined;

    await user.save();

    res.status(200).json({
      message: "KYC approved successfully",
      data: user,
    });
  } catch (error) {
    console.error("Approve KYC error:", error);
    res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
};

// Reject KYC request
export const rejectKYC = async (req, res) => {
  try {
    const { userId } = req.params;
    const { reason } = req.body;
    const adminUserId = req.body.userId; // Admin who is rejecting

    if (!reason) {
      return res.status(400).json({
        message: "Rejection reason is required",
      });
    }

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    if (user.kycStatus !== "pending") {
      return res.status(400).json({
        message: "KYC request is not in pending state",
      });
    }

    user.kycStatus = "rejected";
    user.kycReviewedAt = new Date();
    user.kycReviewedBy = adminUserId;
    user.kycRejectionReason = reason;

    await user.save();

    res.status(200).json({
      message: "KYC rejected successfully",
      data: user,
    });
  } catch (error) {
    console.error("Reject KYC error:", error);
    res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
};

// Get all transactions with pagination and filters
export const getAllTransactions = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      userId = "",
      sortBy = "createdAt",
      sortOrder = "desc",
    } = req.query;

    // Build query
    const query = {};
    if (userId) {
      query.userId = userId;
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const sortOptions = { [sortBy]: sortOrder === "asc" ? 1 : -1 };

    // Get wallets with user info
    const wallets = await Wallet.find(query)
      .populate("userId", "name email phone")
      .sort(sortOptions)
      .limit(parseInt(limit))
      .skip(skip);

    // Get total count
    const total = await Wallet.countDocuments(query);

    // Get summary statistics
    const summary = await Wallet.aggregate([
      {
        $group: {
          _id: null,
          totalAvailableBalance: { $sum: "$availableBalance" },
          totalPendingBalance: { $sum: "$pendingBalance" },
          totalEarnings: { $sum: "$totalEarnings" },
          totalPayouts: { $sum: "$totalPayouts" },
          totalCommissions: { $sum: "$totalCommissions" },
        },
      },
    ]);

    res.status(200).json({
      message: "Transactions retrieved successfully",
      data: {
        wallets,
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(total / parseInt(limit)),
        },
        summary: summary.length > 0 ? summary[0] : {
          totalAvailableBalance: 0,
          totalPendingBalance: 0,
          totalEarnings: 0,
          totalPayouts: 0,
          totalCommissions: 0,
        },
      },
    });
  } catch (error) {
    console.error("Get transactions error:", error);
    res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
};

// Get all booking transactions
export const getBookingTransactions = async (req, res) => {
  try {
    const { userId, page = 1, limit = 20, status, paymentStatus } = req.query;

    // Verify admin
    const admin = await User.findById(userId);
    if (!admin || (!admin.isAdmin && !admin.isSuperAdmin)) {
      return res.status(403).json({ message: "Access denied" });
    }

    // Build filter
    const filter = {};
    if (status) filter.status = status;
    if (paymentStatus) filter.paymentStatus = paymentStatus;

    const total = await BookingRequest.countDocuments(filter);
    const bookings = await BookingRequest.find(filter)
      .populate("packageId", "packageName trackingNumber")
      .populate("senderId", "name email")
      .populate("travelerId", "name email")
      .populate("tripId", "tripName origin destination")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    // Calculate commission (assuming 10% platform fee)
    const transactionsWithCommission = bookings.map(booking => {
      const commission = booking.paymentAmount ? (booking.paymentAmount * 0.1).toFixed(2) : 0;
      return {
        ...booking.toObject(),
        commission,
      };
    });

    res.status(200).json({
      message: "Booking transactions retrieved successfully",
      data: {
        transactions: transactionsWithCommission,
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(total / parseInt(limit)),
        },
      },
    });
  } catch (error) {
    console.error("Get booking transactions error:", error);
    res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
};

// Release payment to traveler
export const releasePayment = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const { userId } = req.body;

    // Verify admin
    const admin = await User.findById(userId);
    if (!admin || (!admin.isAdmin && !admin.isSuperAdmin)) {
      return res.status(403).json({ message: "Access denied" });
    }

    const booking = await BookingRequest.findById(bookingId)
      .populate("travelerId", "name email");

    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    if (booking.paymentStatus !== "paid") {
      return res.status(400).json({ 
        message: "Can only release payments that are in 'paid' status" 
      });
    }

    // Update booking payment status
    booking.paymentStatus = "released";
    await booking.save();

    // Update traveler wallet
    const travelerWallet = await Wallet.findOne({ userId: booking.travelerId._id });
    if (travelerWallet && booking.paymentAmount) {
      const commission = booking.paymentAmount * 0.1; // 10% commission
      const amountToRelease = booking.paymentAmount - commission;
      
      travelerWallet.availableBalance += amountToRelease;
      travelerWallet.totalEarnings += amountToRelease;
      travelerWallet.totalCommissions += commission;
      await travelerWallet.save();
    }

    res.status(200).json({
      message: "Payment released successfully",
      data: { booking },
    });
  } catch (error) {
    console.error("Release payment error:", error);
    res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
};

// Refund payment to sender
export const refundPayment = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const { userId, reason } = req.body;

    // Verify admin
    const admin = await User.findById(userId);
    if (!admin || (!admin.isAdmin && !admin.isSuperAdmin)) {
      return res.status(403).json({ message: "Access denied" });
    }

    const booking = await BookingRequest.findById(bookingId)
      .populate("senderId", "name email");

    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    if (booking.paymentStatus !== "paid") {
      return res.status(400).json({ 
        message: "Can only refund payments that are in 'paid' status" 
      });
    }

    // Update booking payment status
    booking.paymentStatus = "refunded";
    await booking.save();

    // Update sender wallet if needed
    const senderWallet = await Wallet.findOne({ userId: booking.senderId._id });
    if (senderWallet && booking.paymentAmount) {
      senderWallet.availableBalance += booking.paymentAmount;
      await senderWallet.save();
    }

    res.status(200).json({
      message: "Payment refunded successfully",
      data: { booking, reason },
    });
  } catch (error) {
    console.error("Refund payment error:", error);
    res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
};

// Cancel package
export const cancelPackage = async (req, res) => {
  try {
    const { packageId } = req.params;
    const { userId, reason } = req.body;

    // Verify admin
    const admin = await User.findById(userId);
    if (!admin || (!admin.isAdmin && !admin.isSuperAdmin)) {
      return res.status(403).json({ message: "Access denied" });
    }

    const pkg = await Package.findById(packageId);

    if (!pkg) {
      return res.status(404).json({ message: "Package not found" });
    }

    if (pkg.status === "cancelled") {
      return res.status(400).json({ message: "Package is already cancelled" });
    }

    // Update package status
    pkg.status = "cancelled";
    await pkg.save();

    // Cancel associated bookings
    await BookingRequest.updateMany(
      { packageId: packageId, status: { $in: ["pending", "accepted"] } },
      { status: "cancelled" }
    );

    res.status(200).json({
      message: "Package cancelled successfully",
      data: { pkg, reason },
    });
  } catch (error) {
    console.error("Cancel package error:", error);
    res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
};

// Create dispute report
export const createDisputeReport = async (req, res) => {
  try {
    const { packageId } = req.params;
    const { userId, reason, description } = req.body;

    // Verify admin
    const admin = await User.findById(userId);
    if (!admin || (!admin.isAdmin && !admin.isSuperAdmin)) {
      return res.status(403).json({ message: "Access denied" });
    }

    const pkg = await Package.findById(packageId).populate("userId");

    if (!pkg) {
      return res.status(404).json({ message: "Package not found" });
    }

    // Find associated booking
    const booking = await BookingRequest.findOne({ 
      packageId: packageId,
      status: "accepted" 
    }).populate("travelerId");

    if (!booking) {
      return res.status(404).json({ message: "No accepted booking found for this package" });
    }

    // Create dispute report
    const dispute = new DisputeReport({
      reporterId: admin._id, // Admin is reporting
      reportedAgainst: booking.travelerId._id, // Report against traveler
      packageId: packageId,
      reason: reason || "admin_review",
      description: description || "Admin-initiated dispute review",
      status: "open",
      evidenceFiles: [],
    });

    await dispute.save();

    res.status(201).json({
      message: "Dispute report created successfully",
      data: { dispute },
    });
  } catch (error) {
    console.error("Create dispute error:", error);
    res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
};
