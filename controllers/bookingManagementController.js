import BookingRequest from "../models/BookingRequest.js";
import Package from "../models/Package.js";
import Trip from "../models/Trip.js";
import User from "../models/User.js";

// Get traveler's booking requests with details
export const getTravelerBookings = async (req, res) => {
  try {
    const { userId } = req.params;
    const { status } = req.query;

    const query = { travelerId: userId };
    if (status && status !== "all") {
      query.status = status;
    }

    const bookings = await BookingRequest.find(query)
      .populate("packageId", "packageName compensation originAddress destinationAddress weight packageType photos status")
      .populate("senderId", "name email phone address")
      .populate("tripId", "tripName originAddress destinationAddress departureDate arrivalDate")
      .sort({ createdAt: -1 });

    res.status(200).json({
      message: "Booking requests retrieved successfully",
      data: bookings,
    });
  } catch (error) {
    console.error("Get traveler bookings error:", error);
    res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
};

// Get booking statistics for traveler
export const getTravelerBookingStats = async (req, res) => {
  try {
    const { userId } = req.params;

    const allBookings = await BookingRequest.find({ travelerId: userId });

    const stats = {
      total: allBookings.length,
      pending: allBookings.filter((b) => b.status === "pending").length,
      accepted: allBookings.filter((b) => b.status === "accepted").length,
      rejected: allBookings.filter((b) => b.status === "rejected").length,
      cancelled: allBookings.filter((b) => b.status === "cancelled").length,
    };

    // Calculate earnings
    const acceptedBookings = allBookings.filter((b) => b.status === "accepted");
    const totalEarnings = acceptedBookings.reduce(
      (sum, b) => sum + (b.paymentAmount || 0),
      0
    );
    const paidEarnings = acceptedBookings
      .filter((b) => b.paymentStatus === "paid")
      .reduce((sum, b) => sum + (b.paymentAmount || 0), 0);
    const pendingEarnings = totalEarnings - paidEarnings;

    res.status(200).json({
      message: "Booking statistics retrieved successfully",
      data: {
        ...stats,
        earnings: {
          total: totalEarnings.toFixed(2),
          paid: paidEarnings.toFixed(2),
          pending: pendingEarnings.toFixed(2),
        },
      },
    });
  } catch (error) {
    console.error("Get traveler booking stats error:", error);
    res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
};

// Get payout history
export const getPayoutHistory = async (req, res) => {
  try {
    const { userId } = req.params;

    const paidBookings = await BookingRequest.find({
      travelerId: userId,
      paymentStatus: "paid",
    })
      .populate("packageId", "packageName")
      .populate("senderId", "name")
      .sort({ paidAt: -1 });

    const payoutHistory = paidBookings.map((booking) => ({
      bookingId: booking._id,
      packageName: booking.packageId?.packageName || "Package",
      senderName: booking.senderId?.name || "Sender",
      amount: booking.paymentAmount || 0,
      paidAt: booking.paidAt || booking.updatedAt,
      status: "paid",
    }));

    res.status(200).json({
      message: "Payout history retrieved successfully",
      data: payoutHistory,
    });
  } catch (error) {
    console.error("Get payout history error:", error);
    res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
};
