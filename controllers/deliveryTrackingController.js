import Package from "../models/Package.js";
import BookingRequest from "../models/BookingRequest.js";
import DisputeReport from "../models/DisputeReport.js";
import upload from "../middleware/upload.js";

// Update package delivery status
export const updateDeliveryStatus = async (req, res) => {
  try {
    const { packageId } = req.params;
    const { status, userId } = req.body;

    // Map delivery status to package status
    const statusMap = {
      received: "confirmed",
      en_route: "in_transit",
      delivered: "delivered",
    };

    if (!status || !["received", "en_route", "delivered"].includes(status)) {
      return res.status(400).json({
        message: "Valid status (received, en_route, delivered) is required",
      });
    }

    const packageData = await Package.findById(packageId);
    if (!packageData) {
      return res.status(404).json({ message: "Package not found" });
    }

    // Verify user is authorized (either sender or traveler from accepted booking)
    const booking = await BookingRequest.findOne({
      packageId,
      status: "accepted",
    });

    if (!booking) {
      return res.status(400).json({
        message: "No accepted booking found for this package",
      });
    }

    const isSender = booking.senderId.toString() === userId;
    const isTraveler = booking.travelerId.toString() === userId;

    if (!isSender && !isTraveler) {
      return res.status(403).json({
        message: "You are not authorized to update this package status",
      });
    }

    // Update status
    const packageStatus = statusMap[status];
    packageData.status = packageStatus;
    
    // Add to tracking history
    packageData.trackingHistory.push({
      status: packageStatus,
      location: packageData.currentLocation || "Unknown",
      description: `Package marked as ${status.replace("_", " ")}`,
      timestamp: new Date(),
    });

    if (status === "delivered") {
      packageData.actualDeliveryDate = new Date();
    }
    
    await packageData.save();

    res.status(200).json({
      message: "Delivery status updated successfully",
      data: packageData,
    });
  } catch (error) {
    console.error("Update delivery status error:", error);
    res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
};

// Get delivery tracking info
export const getDeliveryTracking = async (req, res) => {
  try {
    const { packageId } = req.params;
    const { userId } = req.query;

    const packageData = await Package.findById(packageId).populate(
      "userId",
      "name email phone"
    );

    if (!packageData) {
      return res.status(404).json({ message: "Package not found" });
    }

    // Get booking info
    const booking = await BookingRequest.findOne({
      packageId,
      status: "accepted",
    })
      .populate("travelerId", "name email phone")
      .populate("senderId", "name email phone");

    if (!booking) {
      return res.status(404).json({
        message: "No accepted booking found for this package",
      });
    }

    // Verify user is part of this booking
    if (
      booking.senderId._id.toString() !== userId &&
      booking.travelerId._id.toString() !== userId
    ) {
      return res.status(403).json({
        message: "You are not authorized to view this delivery tracking",
      });
    }

    // Map package status to delivery status for display
    const deliveryStatusMap = {
      pending: "received",
      confirmed: "received",
      in_transit: "en_route",
      out_for_delivery: "en_route",
      delivered: "delivered",
      cancelled: "received",
    };

    const currentDeliveryStatus = deliveryStatusMap[packageData.status] || "received";

    // Build status history from tracking history
    const statusHistory = [];
    
    // Add initial received status
    statusHistory.push({
      status: "received",
      timestamp: packageData.createdAt,
      label: "Package Received",
    });

    // Add statuses from tracking history
    if (packageData.trackingHistory && packageData.trackingHistory.length > 0) {
      packageData.trackingHistory.forEach((historyItem) => {
        if (historyItem.status === "in_transit" && !statusHistory.find(s => s.status === "en_route")) {
          statusHistory.push({
            status: "en_route",
            timestamp: historyItem.timestamp,
            label: "En Route",
          });
        } else if (historyItem.status === "delivered" && !statusHistory.find(s => s.status === "delivered")) {
          statusHistory.push({
            status: "delivered",
            timestamp: historyItem.timestamp || packageData.actualDeliveryDate,
            label: "Delivered",
          });
        }
      });
    }

    res.status(200).json({
      message: "Delivery tracking retrieved successfully",
      data: {
        package: packageData,
        booking: booking,
        currentStatus: currentDeliveryStatus,
        statusHistory: statusHistory,
      },
    });
  } catch (error) {
    console.error("Get delivery tracking error:", error);
    res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
};

// Create dispute report
export const createDisputeReport = async (req, res) => {
  try {
    const { bookingId, disputeType, title, description } = req.body;
    const reportedBy = req.params.userId;

    if (!bookingId || !disputeType || !title || !description) {
      return res.status(400).json({
        message: "Booking ID, dispute type, title, and description are required",
      });
    }

    const booking = await BookingRequest.findById(bookingId).populate(
      "packageId"
    );
    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    // Verify user is part of this booking
    const isSender = booking.senderId.toString() === reportedBy;
    const isTraveler = booking.travelerId.toString() === reportedBy;

    if (!isSender && !isTraveler) {
      return res.status(403).json({
        message: "You are not authorized to create a dispute for this booking",
      });
    }

    const reportedAgainst = isSender
      ? booking.travelerId
      : booking.senderId;

    // Handle file uploads
    const evidence = [];
    if (req.files && req.files.length > 0) {
      req.files.forEach((file) => {
        // Convert to base64 or save to storage
        const base64 = `data:${file.mimetype};base64,${file.buffer.toString(
          "base64"
        )}`;
        evidence.push(base64);
      });
    }

    // Create dispute report
    const disputeReport = new DisputeReport({
      bookingId,
      packageId: booking.packageId._id || booking.packageId,
      reportedBy,
      reportedAgainst,
      disputeType,
      title,
      description,
      evidence,
    });

    await disputeReport.save();

    res.status(201).json({
      message: "Dispute report created successfully",
      data: disputeReport,
    });
  } catch (error) {
    console.error("Create dispute report error:", error);
    res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
};

// Get dispute reports for a booking
export const getDisputeReports = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const { userId } = req.query;

    const booking = await BookingRequest.findById(bookingId);
    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    // Verify user is part of this booking
    if (
      booking.senderId.toString() !== userId &&
      booking.travelerId.toString() !== userId
    ) {
      return res.status(403).json({
        message: "You are not authorized to view disputes for this booking",
      });
    }

    const disputes = await DisputeReport.find({ bookingId })
      .populate("reportedBy", "name email")
      .populate("reportedAgainst", "name email")
      .sort({ createdAt: -1 });

    res.status(200).json({
      message: "Dispute reports retrieved successfully",
      data: disputes,
    });
  } catch (error) {
    console.error("Get dispute reports error:", error);
    res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
};
