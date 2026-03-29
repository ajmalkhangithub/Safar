import BookingRequest from "../models/BookingRequest.js";
import Package from "../models/Package.js";
import Trip from "../models/Trip.js";
import User from "../models/User.js";

// Create a booking request
export const createBookingRequest = async (req, res) => {
  try {
    const { packageId, tripId, message } = req.body;
    const { userId } = req.params; // Sender's userId

    if (!packageId || !tripId) {
      return res.status(400).json({
        message: "Package ID and Trip ID are required",
      });
    }

    // Verify package belongs to sender
    const packageData = await Package.findById(packageId);
    if (!packageData) {
      return res.status(404).json({ message: "Package not found" });
    }
    if (packageData.userId.toString() !== userId) {
      return res.status(403).json({
        message: "You can only send booking requests for your own packages",
      });
    }

    // Verify trip exists and get traveler info
    const trip = await Trip.findById(tripId).populate("userId");
    if (!trip) {
      return res.status(404).json({ message: "Trip not found" });
    }

    const travelerId = trip.userId._id || trip.userId;

    // Check if booking request already exists
    const existingRequest = await BookingRequest.findOne({
      packageId,
      tripId,
      senderId: userId,
    });

    if (existingRequest) {
      return res.status(400).json({
        message: "Booking request already sent for this package and trip",
        data: existingRequest,
      });
    }

    // Create booking request
    const bookingRequest = new BookingRequest({
      packageId,
      tripId,
      senderId: userId,
      travelerId,
      message: message || "I would like to book your trip for my package delivery.",
      paymentAmount: packageData.compensation || 0,
    });

    await bookingRequest.save();

    // Populate references for response
    await bookingRequest.populate([
      { path: "packageId", select: "packageName compensation originAddress destinationAddress" },
      { path: "tripId", select: "tripName originAddress destinationAddress departureDate" },
      { path: "travelerId", select: "name email phone" },
    ]);

    res.status(201).json({
      message: "Booking request sent successfully",
      data: bookingRequest,
    });
  } catch (error) {
    console.error("Create booking request error:", error);
    res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
};

// Get booking requests for sender
export const getSenderBookingRequests = async (req, res) => {
  try {
    const { userId } = req.params;
    const { status } = req.query;

    const query = { senderId: userId };
    if (status && status !== "all") {
      query.status = status;
    }

    const bookingRequests = await BookingRequest.find(query)
      .populate("packageId", "packageName compensation originAddress destinationAddress status")
      .populate("tripId", "tripName originAddress destinationAddress departureDate travelerRating")
      .populate("travelerId", "name email phone")
      .sort({ createdAt: -1 });

    res.status(200).json({
      message: "Booking requests retrieved successfully",
      data: bookingRequests,
    });
  } catch (error) {
    console.error("Get sender booking requests error:", error);
    res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
};

// Get booking requests for traveler
export const getTravelerBookingRequests = async (req, res) => {
  try {
    const { userId } = req.params;
    const { status } = req.query;

    const query = { travelerId: userId };
    if (status && status !== "all") {
      query.status = status;
    }

    const bookingRequests = await BookingRequest.find(query)
      .populate("packageId", "packageName compensation originAddress destinationAddress weight")
      .populate("senderId", "name email phone")
      .sort({ createdAt: -1 });

    res.status(200).json({
      message: "Booking requests retrieved successfully",
      data: bookingRequests,
    });
  } catch (error) {
    console.error("Get traveler booking requests error:", error);
    res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
};

// Get single booking request details
export const getBookingRequestById = async (req, res) => {
  try {
    const { bookingId } = req.params;

    const bookingRequest = await BookingRequest.findById(bookingId)
      .populate("packageId")
      .populate("tripId")
      .populate("senderId", "name email phone address")
      .populate("travelerId", "name email phone address");

    if (!bookingRequest) {
      return res.status(404).json({ message: "Booking request not found" });
    }

    res.status(200).json({
      message: "Booking request retrieved successfully",
      data: bookingRequest,
    });
  } catch (error) {
    console.error("Get booking request error:", error);
    res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
};

// Accept booking request (by traveler)
export const acceptBookingRequest = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const { userId } = req.body; // Traveler's userId

    const bookingRequest = await BookingRequest.findById(bookingId);
    if (!bookingRequest) {
      return res.status(404).json({ message: "Booking request not found" });
    }

    // Verify traveler owns the trip
    if (bookingRequest.travelerId.toString() !== userId) {
      return res.status(403).json({
        message: "You can only accept booking requests for your own trips",
      });
    }

    if (bookingRequest.status !== "pending") {
      return res.status(400).json({
        message: `Booking request is already ${bookingRequest.status}`,
      });
    }

    // Update booking status
    bookingRequest.status = "accepted";
    bookingRequest.respondedAt = new Date();
    await bookingRequest.save();

    // Update package status to confirmed
    await Package.findByIdAndUpdate(bookingRequest.packageId, {
      status: "confirmed",
    });

    res.status(200).json({
      message: "Booking request accepted successfully",
      data: bookingRequest,
    });
  } catch (error) {
    console.error("Accept booking request error:", error);
    res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
};

// Reject booking request (by traveler)
export const rejectBookingRequest = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const { userId } = req.body; // Traveler's userId

    const bookingRequest = await BookingRequest.findById(bookingId);
    if (!bookingRequest) {
      return res.status(404).json({ message: "Booking request not found" });
    }

    // Verify traveler owns the trip
    if (bookingRequest.travelerId.toString() !== userId) {
      return res.status(403).json({
        message: "You can only reject booking requests for your own trips",
      });
    }

    if (bookingRequest.status !== "pending") {
      return res.status(400).json({
        message: `Booking request is already ${bookingRequest.status}`,
      });
    }

    // Update booking status
    bookingRequest.status = "rejected";
    bookingRequest.respondedAt = new Date();
    await bookingRequest.save();

    res.status(200).json({
      message: "Booking request rejected",
      data: bookingRequest,
    });
  } catch (error) {
    console.error("Reject booking request error:", error);
    res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
};

// Accept package directly (creates booking request automatically)
export const acceptPackageDirectly = async (req, res) => {
  try {
    const { packageId } = req.params;
    const { userId, tripId, message } = req.body; // Traveler's userId

    if (!packageId || !userId) {
      return res.status(400).json({
        message: "Package ID and User ID are required",
      });
    }

    // Verify package exists and is available
    const packageData = await Package.findById(packageId).populate("userId");
    if (!packageData) {
      return res.status(404).json({ message: "Package not found" });
    }

    if (!packageData.userId) {
      return res.status(400).json({ message: "Package has no associated sender" });
    }

    if (packageData.status !== "pending") {
      return res.status(400).json({
        message: `Package is already ${packageData.status}`,
      });
    }

    // Don't allow accepting own packages
    const senderId = packageData.userId._id 
      ? packageData.userId._id.toString() 
      : packageData.userId.toString();
    
    if (senderId === userId) {
      return res.status(403).json({
        message: "You cannot accept your own packages",
      });
    }

    // If tripId is provided, verify it belongs to the traveler
    let trip = null;
    if (tripId) {
      trip = await Trip.findById(tripId);
      if (!trip) {
        return res.status(404).json({ message: "Trip not found" });
      }
      if (trip.userId.toString() !== userId) {
        return res.status(403).json({
          message: "Trip does not belong to you",
        });
      }
    }

    // Check if booking request already exists
    const existingRequest = await BookingRequest.findOne({
      packageId,
      travelerId: userId,
      status: { $in: ["pending", "accepted"] },
    });

    if (existingRequest) {
      if (existingRequest.status === "accepted") {
        return res.status(400).json({
          message: "Package has already been accepted",
          data: existingRequest,
        });
      }
      // If pending, accept it
      existingRequest.status = "accepted";
      existingRequest.respondedAt = new Date();
      if (tripId) existingRequest.tripId = tripId;
      await existingRequest.save();

      // Update package status
      await Package.findByIdAndUpdate(packageId, {
        status: "confirmed",
      });

      return res.status(200).json({
        message: "Package accepted successfully",
        data: existingRequest,
      });
    }

    // Create new booking request and accept it immediately
    const senderIdValue = packageData.userId._id || packageData.userId;
    const bookingRequestData = {
      packageId,
      senderId: senderIdValue,
      travelerId: userId,
      message: message || "I accept this package for delivery.",
      paymentAmount: packageData.compensation || 0,
      status: "accepted", // Directly accepted
      respondedAt: new Date(),
    };
    
    // Only include tripId if provided
    if (tripId) {
      bookingRequestData.tripId = tripId;
    }
    
    const bookingRequest = new BookingRequest(bookingRequestData);

    await bookingRequest.save();

    // Update package status to confirmed
    await Package.findByIdAndUpdate(packageId, {
      status: "confirmed",
    });

    // Populate references for response
    await bookingRequest.populate([
      { path: "packageId", select: "packageName compensation originAddress destinationAddress" },
      { path: "senderId", select: "name email phone" },
    ]);

    res.status(201).json({
      message: "Package accepted successfully",
      data: bookingRequest,
    });
  } catch (error) {
    console.error("Accept package directly error:", error);
    res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
};

// Reject package directly (creates booking request with rejected status)
export const rejectPackageDirectly = async (req, res) => {
  try {
    const { packageId } = req.params;
    const { userId, reason } = req.body; // Traveler's userId

    if (!packageId || !userId) {
      return res.status(400).json({
        message: "Package ID and User ID are required",
      });
    }

    // Verify package exists
    const packageData = await Package.findById(packageId).populate("userId");
    if (!packageData) {
      return res.status(404).json({ message: "Package not found" });
    }

    if (!packageData.userId) {
      return res.status(400).json({ message: "Package has no associated sender" });
    }

    // Don't allow rejecting own packages
    const senderId = packageData.userId._id 
      ? packageData.userId._id.toString() 
      : packageData.userId.toString();
    
    if (senderId === userId) {
      return res.status(403).json({
        message: "You cannot reject your own packages",
      });
    }

    // Check if booking request already exists
    const existingRequest = await BookingRequest.findOne({
      packageId,
      travelerId: userId,
    });

    if (existingRequest) {
      if (existingRequest.status === "accepted") {
        return res.status(400).json({
          message: "Cannot reject an already accepted package",
        });
      }
      // Update existing request
      existingRequest.status = "rejected";
      existingRequest.respondedAt = new Date();
      if (reason) existingRequest.message = reason;
      await existingRequest.save();

      return res.status(200).json({
        message: "Package rejected",
        data: existingRequest,
      });
    }

    // Create new booking request with rejected status
    const senderIdValue = packageData.userId._id || packageData.userId;
    const bookingRequest = new BookingRequest({
      packageId,
      senderId: senderIdValue,
      travelerId: userId,
      message: reason || "Package rejected",
      paymentAmount: packageData.compensation || 0,
      status: "rejected",
      respondedAt: new Date(),
      // tripId is optional - not required for rejected packages
    });

    await bookingRequest.save();

    // Populate references for response
    await bookingRequest.populate([
      { path: "packageId", select: "packageName compensation originAddress destinationAddress" },
      { path: "senderId", select: "name email phone" },
    ]);

    res.status(201).json({
      message: "Package rejected",
      data: bookingRequest,
    });
  } catch (error) {
    console.error("Reject package directly error:", error);
    res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
};

// Cancel booking request (by sender)
export const cancelBookingRequest = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const { userId } = req.body; // Sender's userId

    const bookingRequest = await BookingRequest.findById(bookingId);
    if (!bookingRequest) {
      return res.status(404).json({ message: "Booking request not found" });
    }

    // Verify sender owns the request
    if (bookingRequest.senderId.toString() !== userId) {
      return res.status(403).json({
        message: "You can only cancel your own booking requests",
      });
    }

    if (bookingRequest.status === "accepted") {
      return res.status(400).json({
        message: "Cannot cancel an accepted booking request",
      });
    }

    // Update booking status
    bookingRequest.status = "cancelled";
    await bookingRequest.save();

    res.status(200).json({
      message: "Booking request cancelled",
      data: bookingRequest,
    });
  } catch (error) {
    console.error("Cancel booking request error:", error);
    res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
};

// Update payment status
export const updatePaymentStatus = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const { paymentStatus, stripePaymentIntentId } = req.body;

    const bookingRequest = await BookingRequest.findById(bookingId);
    if (!bookingRequest) {
      return res.status(404).json({ message: "Booking request not found" });
    }

    if (bookingRequest.status !== "accepted") {
      return res.status(400).json({
        message: "Payment can only be processed for accepted bookings",
      });
    }

    bookingRequest.paymentStatus = paymentStatus || bookingRequest.paymentStatus;
    if (stripePaymentIntentId) {
      bookingRequest.stripePaymentIntentId = stripePaymentIntentId;
    }
    if (paymentStatus === "paid") {
      bookingRequest.paidAt = new Date();
    }

    await bookingRequest.save();

    res.status(200).json({
      message: "Payment status updated successfully",
      data: bookingRequest,
    });
  } catch (error) {
    console.error("Update payment status error:", error);
    res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
};
