import BookingRequest from "../models/BookingRequest.js";
import Trip from "../models/Trip.js";
import Review from "../models/Review.js";
import DisputeReport from "../models/DisputeReport.js";
import Package from "../models/Package.js";

// Get traveler dashboard statistics
export const getTravelerDashboardStats = async (req, res) => {
  try {
    const { userId } = req.params;

    // Get active bookings (accepted bookings)
    const activeBookings = await BookingRequest.find({
      travelerId: userId,
      status: "accepted",
    })
      .populate("packageId", "packageName status")
      .populate("senderId", "name email")
      .sort({ createdAt: -1 });

    // Get total earnings (sum of paymentAmount from accepted bookings with paid status)
    const paidBookings = await BookingRequest.find({
      travelerId: userId,
      status: "accepted",
      paymentStatus: "paid",
    });

    const totalEarnings = paidBookings.reduce(
      (sum, booking) => sum + (booking.paymentAmount || 0),
      0
    );

    // Get pending earnings (accepted but not yet paid)
    const pendingBookings = await BookingRequest.find({
      travelerId: userId,
      status: "accepted",
      paymentStatus: { $in: ["pending", null] },
    });

    const pendingEarnings = pendingBookings.reduce(
      (sum, booking) => sum + (booking.paymentAmount || 0),
      0
    );

    // Get disputes count
    const disputesCount = await DisputeReport.countDocuments({
      reportedAgainst: userId,
      status: { $in: ["pending", "under_review"] },
    });

    // Get upcoming trips
    // Use start of today to include trips scheduled for today
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    
    const upcomingTrips = await Trip.find({
      userId,
      status: { $in: ["planned", "in_progress"] },
      departureDate: { $gte: startOfToday },
    })
      .sort({ departureDate: 1 })
      .limit(5);

    // Get recent bookings
    const recentBookings = await BookingRequest.find({
      travelerId: userId,
    })
      .populate("packageId", "packageName compensation")
      .populate("senderId", "name")
      .sort({ createdAt: -1 })
      .limit(5);

    res.status(200).json({
      message: "Traveler dashboard stats retrieved successfully",
      data: {
        activeBookings: activeBookings.length,
        totalEarnings: totalEarnings.toFixed(2),
        pendingEarnings: pendingEarnings.toFixed(2),
        disputesCount,
        upcomingTrips,
        recentBookings,
        activeBookingsList: activeBookings,
      },
    });
  } catch (error) {
    console.error("Get traveler dashboard stats error:", error);
    res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
};

// Get traveler's upcoming trips
export const getUpcomingTrips = async (req, res) => {
  try {
    const { userId } = req.params;
    const { limit = 10 } = req.query;

    // Use start of today to include trips scheduled for today
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const trips = await Trip.find({
      userId,
      status: { $in: ["planned", "in_progress"] },
      departureDate: { $gte: startOfToday },
    })
      .sort({ departureDate: 1 })
      .limit(parseInt(limit));

    res.status(200).json({
      message: "Upcoming trips retrieved successfully",
      data: trips,
    });
  } catch (error) {
    console.error("Get upcoming trips error:", error);
    res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
};

// Get traveler's earnings breakdown
export const getTravelerEarnings = async (req, res) => {
  try {
    const { userId } = req.params;

    const bookings = await BookingRequest.find({
      travelerId: userId,
      status: "accepted",
    }).sort({ createdAt: -1 });

    const earningsBreakdown = {
      total: 0,
      paid: 0,
      pending: 0,
      byMonth: {},
    };

    bookings.forEach((booking) => {
      const amount = booking.paymentAmount || 0;
      earningsBreakdown.total += amount;

      if (booking.paymentStatus === "paid") {
        earningsBreakdown.paid += amount;
      } else {
        earningsBreakdown.pending += amount;
      }

      // Group by month
      const month = new Date(booking.createdAt).toISOString().slice(0, 7); // YYYY-MM
      if (!earningsBreakdown.byMonth[month]) {
        earningsBreakdown.byMonth[month] = 0;
      }
      earningsBreakdown.byMonth[month] += amount;
    });

    res.status(200).json({
      message: "Traveler earnings retrieved successfully",
      data: {
        total: earningsBreakdown.total.toFixed(2),
        paid: earningsBreakdown.paid.toFixed(2),
        pending: earningsBreakdown.pending.toFixed(2),
        byMonth: earningsBreakdown.byMonth,
      },
    });
  } catch (error) {
    console.error("Get traveler earnings error:", error);
    res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
};
