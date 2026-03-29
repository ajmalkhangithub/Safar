import Review from "../models/Review.js";
import BookingRequest from "../models/BookingRequest.js";
import Package from "../models/Package.js";
import Trip from "../models/Trip.js";
import User from "../models/User.js";
import upload from "../middleware/upload.js";

// Submit proof of delivery and review
export const submitPostDelivery = async (req, res) => {
  try {
    const { bookingId, rating, reviewText } = req.body;
    const reviewerId = req.params.userId; // Sender's userId

    if (!bookingId || !rating) {
      return res.status(400).json({
        message: "Booking ID and rating are required",
      });
    }

    if (rating < 1 || rating > 5) {
      return res.status(400).json({
        message: "Rating must be between 1 and 5",
      });
    }

    // Verify booking exists and user is authorized
    const booking = await BookingRequest.findById(bookingId)
      .populate("packageId")
      .populate("travelerId")
      .populate("senderId");

    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    // Verify user is the sender
    if (booking.senderId._id.toString() !== reviewerId) {
      return res.status(403).json({
        message: "Only the sender can submit post-delivery review",
      });
    }

    // Verify booking is accepted and package is delivered
    if (booking.status !== "accepted") {
      return res.status(400).json({
        message: "Booking must be accepted before submitting review",
      });
    }

    const packageData = booking.packageId;
    if (packageData.status !== "delivered") {
      return res.status(400).json({
        message: "Package must be delivered before submitting review",
      });
    }

    // Check if review already exists
    const existingReview = await Review.findOne({
      bookingId,
      reviewerId,
    });

    if (existingReview) {
      return res.status(400).json({
        message: "Review already submitted for this booking",
        data: existingReview,
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

    // Create review
    const review = new Review({
      bookingId,
      packageId: packageData._id,
      reviewerId,
      reviewedUserId: booking.travelerId._id,
      rating: parseInt(rating),
      reviewText: reviewText || "",
      proofOfDelivery: {
        photo: proofPhoto,
        signature: proofSignature,
        uploadedAt: new Date(),
      },
    });

    await review.save();

    // Update traveler's average rating
    const travelerReviews = await Review.find({
      reviewedUserId: booking.travelerId._id,
    });
    const averageRating =
      travelerReviews.reduce((sum, r) => sum + r.rating, 0) /
      travelerReviews.length;

    // Update trip's traveler rating
    const trip = await Trip.findOne({ userId: booking.travelerId._id });
    if (trip) {
      trip.travelerRating = averageRating;
      await trip.save();
    }

    // Populate review data for response
    await review.populate([
      { path: "reviewerId", select: "name email" },
      { path: "reviewedUserId", select: "name email" },
    ]);

    res.status(201).json({
      message: "Post-delivery review submitted successfully",
      data: review,
    });
  } catch (error) {
    console.error("Submit post-delivery error:", error);
    res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
};

// Get post-delivery data for a booking
export const getPostDeliveryData = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const { userId } = req.query;

    const booking = await BookingRequest.findById(bookingId)
      .populate("packageId")
      .populate("travelerId", "name email phone")
      .populate("senderId", "name email phone");

    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    // Verify user is part of this booking
    if (
      booking.senderId._id.toString() !== userId &&
      booking.travelerId._id.toString() !== userId
    ) {
      return res.status(403).json({
        message: "You are not authorized to view this post-delivery data",
      });
    }

    // Check if review already exists
    const existingReview = await Review.findOne({
      bookingId,
      reviewerId: booking.senderId._id,
    });

    res.status(200).json({
      message: "Post-delivery data retrieved successfully",
      data: {
        booking,
        package: booking.packageId,
        traveler: booking.travelerId,
        hasReview: !!existingReview,
        review: existingReview,
      },
    });
  } catch (error) {
    console.error("Get post-delivery data error:", error);
    res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
};

// Get reviews for a traveler
export const getTravelerReviews = async (req, res) => {
  try {
    const { userId } = req.params;

    const reviews = await Review.find({ reviewedUserId: userId })
      .populate("reviewerId", "name email")
      .populate("packageId", "packageName")
      .sort({ createdAt: -1 });

    // Calculate average rating
    const averageRating =
      reviews.length > 0
        ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
        : 0;

    res.status(200).json({
      message: "Traveler reviews retrieved successfully",
      data: {
        reviews,
        averageRating: averageRating.toFixed(1),
        totalReviews: reviews.length,
      },
    });
  } catch (error) {
    console.error("Get traveler reviews error:", error);
    res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
};
