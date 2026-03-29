import BookingRequest from "../models/BookingRequest.js";
import Package from "../models/Package.js";
import Trip from "../models/Trip.js";
import User from "../models/User.js";

// Get combined dashboard data for dual role users
export const getCombinedDashboard = async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const isDualRole = (user.roles || []).length > 1;

    // Sender stats
    const senderBookings = await BookingRequest.find({
      senderId: userId,
    });
    const senderPackages = await Package.find({ userId });
    const senderStats = {
      totalPackages: senderPackages.length,
      activeBookings: senderBookings.filter((b) => b.status === "accepted").length,
      pendingBookings: senderBookings.filter((b) => b.status === "pending").length,
      totalEarnings: senderBookings
        .filter((b) => b.status === "accepted" && b.paymentStatus === "paid")
        .reduce((sum, b) => sum + (b.paymentAmount || 0), 0),
    };

    // Traveler stats
    const travelerBookings = await BookingRequest.find({
      travelerId: userId,
    });
    const travelerTrips = await Trip.find({ userId });
    const travelerStats = {
      totalTrips: travelerTrips.length,
      activeBookings: travelerBookings.filter((b) => b.status === "accepted").length,
      pendingBookings: travelerBookings.filter((b) => b.status === "pending").length,
      totalEarnings: travelerBookings
        .filter((b) => b.status === "accepted" && b.paymentStatus === "paid")
        .reduce((sum, b) => sum + (b.paymentAmount || 0), 0),
    };

    // Recent activity (combined)
    const recentPackages = user.roles && user.roles.includes("sender")
      ? await Package.find({ userId })
          .sort({ createdAt: -1 })
          .limit(5)
          .select("packageName status compensation createdAt")
          .catch(() => [])
      : [];

    const recentTrips = user.roles && user.roles.includes("traveler")
      ? await Trip.find({ userId })
          .sort({ createdAt: -1 })
          .limit(5)
          .select("tripName status departureDate createdAt")
          .catch(() => [])
      : [];

    const recentBookings = await BookingRequest.find({
      $or: [{ senderId: userId }, { travelerId: userId }],
    })
      .populate("packageId", "packageName")
      .populate("tripId", "tripName")
      .sort({ createdAt: -1 })
      .limit(10)
      .catch(() => []);

    res.status(200).json({
      message: "Combined dashboard data retrieved successfully",
      data: {
        isDualRole,
        activeRole: user.activeRole,
        roles: user.roles || [],
        sender: {
          stats: senderStats,
          recentPackages,
        },
        traveler: {
          stats: travelerStats,
          recentTrips,
        },
        recentActivity: recentBookings,
      },
    });
  } catch (error) {
    console.error("Get combined dashboard error:", error);
    res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
};
