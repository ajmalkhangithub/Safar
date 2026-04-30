import Package from "../models/Package.js";
import BookingRequest from "../models/BookingRequest.js";
import Trip from "../models/Trip.js";

// Get sender dashboard statistics
export const getSenderDashboardStats = async (req, res) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({ message: "User ID is required" });
    }

    // Get active trips (packages in transit or out for delivery)
    const activeTrips = await Package.countDocuments({
      userId,
      status: { $in: ["in_transit", "out_for_delivery", "confirmed"] },
    });

    // Calculate earnings (from delivered packages)
    const deliveredPackages = await Package.find({
      userId,
      status: "delivered",
    }).select("value");

    const earnings = deliveredPackages.reduce((total, pkg) => {
      // Assuming value represents payment amount (you may need to adjust this logic)
      return total + (pkg.value || 0);
    }, 0);

    // Get pending deliveries (packages pending or confirmed)
    const pendingDeliveries = await Package.countDocuments({
      userId,
      status: { $in: ["pending", "confirmed"] },
    });

    // Get total packages posted
    const totalPackages = await Package.countDocuments({ userId });

    // Get recent package requests (last 5) with booking status
    const recentRequests = await Package.find({ userId })
      .sort({ createdAt: -1 })
      .limit(5)
      .select(
        "packageName description packageType compensation status trackingNumber createdAt destinationAddress originAddress sender _id"
      );

    // Get booking requests for these packages to show status
    const packageIds = recentRequests.map(pkg => pkg._id);
    const bookingRequests = await BookingRequest.find({
      packageId: { $in: packageIds },
    })
      .populate("travelerId", "name email")
      .select("packageId status travelerId respondedAt");

    // Map booking status to packages
    const recentRequestsWithStatus = recentRequests.map(pkg => {
      const booking = bookingRequests.find(
        br => br.packageId.toString() === pkg._id.toString()
      );
      return {
        ...pkg.toObject(),
        bookingStatus: booking ? booking.status : null,
        traveler: booking?.travelerId || null,
        respondedAt: booking?.respondedAt || null,
      };
    });

    // Get current bookings (active packages) with booking info
    const currentBookings = await Package.find({
      userId,
      status: { $in: ["confirmed", "in_transit", "out_for_delivery"] },
    })
      .sort({ createdAt: -1 })
      .select(
        "packageName status trackingNumber createdAt destinationAddress estimatedDeliveryDate _id"
      );

    // Get booking info for current bookings
    const currentBookingIds = currentBookings.map(pkg => pkg._id);
    const currentBookingRequests = await BookingRequest.find({
      packageId: { $in: currentBookingIds },
      status: "accepted",
    })
      .populate("travelerId", "name email")
      .select("packageId travelerId");

    const currentBookingsWithStatus = currentBookings.map(pkg => {
      const booking = currentBookingRequests.find(
        br => br.packageId.toString() === pkg._id.toString()
      );
      return {
        ...pkg.toObject(),
        traveler: booking?.travelerId || null,
      };
    });

    // Get available trips from all travelers (for senders to view)
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const availableTrips = await Trip.find({
      status: { $in: ["planned", "in_progress"] },
      departureDate: { $gte: startOfToday },
    })
      .populate("userId", "name email phone")
      .sort({ departureDate: 1 })
      .limit(10)
      .select("tripName originAddress destinationAddress departureDate transportMode acceptedItemTypes userId status");

    res.status(200).json({
      message: "Dashboard stats retrieved successfully",
      data: {
        summary: {
          activeTrips,
          earnings: earnings.toFixed(2),
          pendingDeliveries,
          totalPackages,
        },
        recentRequests: recentRequestsWithStatus,
        currentBookings: currentBookingsWithStatus,
        availableTrips, // All trips from all travelers
      },
    });
  } catch (error) {
    console.error("Get sender dashboard stats error:", error);
    res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
};

// Get posted package requests for sender
export const getPostedPackageRequests = async (req, res) => {
  try {
    const { userId } = req.params;
    const { status, limit = 10, page = 1 } = req.query;

    if (!userId) {
      return res.status(400).json({ message: "User ID is required" });
    }

    const query = { userId };
    if (status) {
      query.status = status;
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const packages = await Package.find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(skip)
      .select(
        "packageName status trackingNumber createdAt destinationAddress estimatedDeliveryDate value"
      );

    const total = await Package.countDocuments(query);

    res.status(200).json({
      message: "Package requests retrieved successfully",
      data: {
        packages,
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(total / parseInt(limit)),
        },
      },
    });
  } catch (error) {
    console.error("Get posted package requests error:", error);
    res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
};
