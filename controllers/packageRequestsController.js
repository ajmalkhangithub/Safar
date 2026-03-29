import Package from "../models/Package.js";
import Trip from "../models/Trip.js";
import User from "../models/User.js";

// Get all active package requests with filters
export const getPackageRequests = async (req, res) => {
  try {
    const {
      status,
      location,
      minCompensation,
      maxCompensation,
      dateFrom,
      dateTo,
      sortBy = "createdAt",
      sortOrder = "desc",
      page = 1,
      limit = 20,
    } = req.query;

    // Build query
    const query = {
      status: { $in: ["pending", "confirmed"] }, // Only active requests
    };

    // Filter by status
    if (status && status !== "all") {
      query.status = status;
    }

    // Filter by location (origin or destination city)
    if (location) {
      query.$or = [
        { "originAddress.city": { $regex: location, $options: "i" } },
        { "destinationAddress.city": { $regex: location, $options: "i" } },
        { "originAddress.street": { $regex: location, $options: "i" } },
        { "destinationAddress.street": { $regex: location, $options: "i" } },
      ];
    }

    // Filter by compensation range
    if (minCompensation || maxCompensation) {
      query.compensation = {};
      if (minCompensation) {
        query.compensation.$gte = parseFloat(minCompensation);
      }
      if (maxCompensation) {
        query.compensation.$lte = parseFloat(maxCompensation);
      }
    }

    // Filter by date range
    if (dateFrom || dateTo) {
      query.estimatedDeliveryDate = {};
      if (dateFrom) {
        query.estimatedDeliveryDate.$gte = new Date(dateFrom);
      }
      if (dateTo) {
        query.estimatedDeliveryDate.$lte = new Date(dateTo);
      }
    }

    // Sort options
    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === "asc" ? 1 : -1;

    // Pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Execute query
    const packages = await Package.find(query)
      .populate("userId", "name email phone")
      .sort(sortOptions)
      .limit(parseInt(limit))
      .skip(skip)
      .select(
        "packageName description weight compensation packageType photos originAddress destinationAddress estimatedDeliveryDate status createdAt trackingNumber"
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
    console.error("Get package requests error:", error);
    res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
};

// Get matching traveler trips for a package
export const getMatchingTrips = async (req, res) => {
  try {
    const { packageId } = req.params;
    const { maxDistance = 50 } = req.query; // Maximum distance in km for matching

    // Get the package
    const packageData = await Package.findById(packageId);
    if (!packageData) {
      return res.status(404).json({ message: "Package not found" });
    }

    // Build query for matching trips
    const query = {
      status: { $in: ["planned", "in_progress"] },
      departureDate: { $lte: packageData.estimatedDeliveryDate || new Date() },
      arrivalDate: { $gte: packageData.estimatedDeliveryDate || new Date() },
    };

    // Match by origin and destination cities (simplified matching)
    if (packageData.originAddress?.city) {
      query["originAddress.city"] = {
        $regex: packageData.originAddress.city,
        $options: "i",
      };
    }
    if (packageData.destinationAddress?.city) {
      query["destinationAddress.city"] = {
        $regex: packageData.destinationAddress.city,
        $options: "i",
      };
    }

    // Get matching trips
    const trips = await Trip.find(query)
      .populate("userId", "name email phone")
      .sort({ travelerRating: -1, departureDate: 1 })
      .limit(20)
      .select(
        "tripName description originAddress destinationAddress departureDate arrivalDate availableSpace maxWeight travelerRating status createdAt"
      );

    // Calculate match score for each trip
    const tripsWithScore = trips.map((trip) => {
      let score = 0;

      // City match (50 points)
      if (
        trip.originAddress?.city?.toLowerCase() ===
        packageData.originAddress?.city?.toLowerCase()
      ) {
        score += 50;
      }
      if (
        trip.destinationAddress?.city?.toLowerCase() ===
        packageData.destinationAddress?.city?.toLowerCase()
      ) {
        score += 50;
      }

      // Date match (30 points)
      const packageDate = packageData.estimatedDeliveryDate;
      const tripStart = trip.departureDate;
      const tripEnd = trip.arrivalDate;
      if (packageDate && tripStart && tripEnd) {
        if (packageDate >= tripStart && packageDate <= tripEnd) {
          score += 30;
        }
      }

      // Rating bonus (20 points max)
      score += (trip.travelerRating || 0) * 4;

      // Weight capacity check
      const canCarry = trip.maxWeight && packageData.weight
        ? trip.maxWeight >= packageData.weight
        : true;

      return {
        ...trip.toObject(),
        matchScore: score,
        canCarry,
      };
    });

    // Sort by match score
    tripsWithScore.sort((a, b) => b.matchScore - a.matchScore);

    res.status(200).json({
      message: "Matching trips retrieved successfully",
      data: {
        package: {
          id: packageData._id,
          packageName: packageData.packageName,
          origin: packageData.originAddress,
          destination: packageData.destinationAddress,
          estimatedDeliveryDate: packageData.estimatedDeliveryDate,
        },
        trips: tripsWithScore,
      },
    });
  } catch (error) {
    console.error("Get matching trips error:", error);
    res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
};

// Send booking request to traveler
export const sendBookingRequest = async (req, res) => {
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

    // Verify trip exists
    const trip = await Trip.findById(tripId);
    if (!trip) {
      return res.status(404).json({ message: "Trip not found" });
    }

    // TODO: Create a BookingRequest model to store booking requests
    // For now, return success (you can implement booking requests later)

    res.status(200).json({
      message: "Booking request sent successfully",
      data: {
        packageId,
        tripId,
        travelerId: trip.userId,
        message: message || "I would like to book your trip for my package delivery.",
      },
    });
  } catch (error) {
    console.error("Send booking request error:", error);
    res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
};
