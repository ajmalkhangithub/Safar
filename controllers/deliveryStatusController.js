import Package from "../models/Package.js";
import BookingRequest from "../models/BookingRequest.js";
import upload from "../middleware/upload.js";

// Update delivery status with proof of delivery
export const updateDeliveryStatusWithProof = async (req, res) => {
  try {
    const { packageId } = req.params;
    const { status, userId } = req.body;

    if (!status || !["received", "en_route", "delivered"].includes(status)) {
      return res.status(400).json({
        message: "Valid status (received, en_route, delivered) is required",
      });
    }

    const packageData = await Package.findById(packageId);
    if (!packageData) {
      return res.status(404).json({ message: "Package not found" });
    }

    // Verify user is authorized (traveler from accepted booking)
    const booking = await BookingRequest.findOne({
      packageId,
      status: "accepted",
    });

    if (!booking) {
      return res.status(400).json({
        message: "No accepted booking found for this package",
      });
    }

    const isTraveler = booking.travelerId.toString() === userId;

    if (!isTraveler) {
      return res.status(403).json({
        message: "Only the assigned traveler can update delivery status",
      });
    }

    // Handle proof of delivery files
    let proofPhoto = null;
    let proofSignature = null;

    if (req.files && req.files.length > 0) {
      req.files.forEach((file) => {
        if (file.fieldname === "proofPhoto") {
          proofPhoto = `data:${file.mimetype};base64,${file.buffer.toString(
            "base64"
          )}`;
        } else if (file.fieldname === "proofSignature") {
          proofSignature = `data:${file.mimetype};base64,${file.buffer.toString(
            "base64"
          )}`;
        }
      });
    }

    // Map delivery status to package status
    const statusMap = {
      received: "confirmed",
      en_route: "in_transit",
      delivered: "delivered",
    };

    const packageStatus = statusMap[status];

    // Update status
    packageData.status = packageStatus;

    // Store proof of delivery
    if (proofPhoto || proofSignature) {
      if (!packageData.proofOfDelivery) {
        packageData.proofOfDelivery = {};
      }
      if (proofPhoto) {
        packageData.proofOfDelivery.photo = proofPhoto;
      }
      if (proofSignature) {
        packageData.proofOfDelivery.signature = proofSignature;
      }
      packageData.proofOfDelivery.uploadedAt = new Date();
    }

    // Add to tracking history
    packageData.trackingHistory.push({
      status: packageStatus,
      location: packageData.currentLocation || "Unknown",
      description: `Package marked as ${status.replace("_", " ")}${proofPhoto || proofSignature ? " with proof of delivery" : ""}`,
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
    console.error("Update delivery status with proof error:", error);
    res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
};

// Get delivery status for management
export const getDeliveryStatusForManagement = async (req, res) => {
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

    // Verify user is the traveler
    if (booking.travelerId._id.toString() !== userId) {
      return res.status(403).json({
        message: "You are not authorized to manage this delivery",
      });
    }

    // Map package status to delivery status
    const deliveryStatusMap = {
      pending: "received",
      confirmed: "received",
      in_transit: "en_route",
      out_for_delivery: "en_route",
      delivered: "delivered",
      cancelled: "received",
    };

    const currentDeliveryStatus =
      deliveryStatusMap[packageData.status] || "received";

    res.status(200).json({
      message: "Delivery status retrieved successfully",
      data: {
        package: packageData,
        booking: booking,
        currentStatus: currentDeliveryStatus,
        proofOfDelivery: packageData.proofOfDelivery || null,
        trackingHistory: packageData.trackingHistory || [],
      },
    });
  } catch (error) {
    console.error("Get delivery status for management error:", error);
    res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
};
