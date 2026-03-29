import Trip from "../models/Trip.js";
import Package from "../models/Package.js";
import BookingRequest from "../models/BookingRequest.js";
import User from "../models/User.js";

// Get all trips with filters
export const getTripsWithFilters = async (req, res) => {
  try {
    const {
      date,
      originCity,
      destinationCity,
      itemType,
      transportMode,
      status,
      userId,
    } = req.query;

    const query = {};

    // Filter by date range
    if (date) {
      const dateObj = new Date(date);
      // Validate that the date is valid
      if (!isNaN(dateObj.getTime())) {
        // Create new Date objects to avoid mutating the original
        const startOfDay = new Date(dateObj);
        startOfDay.setHours(0, 0, 0, 0);
        
        const endOfDay = new Date(dateObj);
        endOfDay.setHours(23, 59, 59, 999);
        
        query.departureDate = {
          $gte: startOfDay,
          $lte: endOfDay,
        };
      } else {
        // If date is invalid, log warning but don't add date filter
        console.warn(`Invalid date provided: ${date}`);
      }
    }

    // Filter by location
    if (originCity) {
      query["originAddress.city"] = new RegExp(originCity, "i");
    }
    if (destinationCity) {
      query["destinationAddress.city"] = new RegExp(destinationCity, "i");
    }

    // Filter by transport mode
    if (transportMode) {
      query.transportMode = transportMode;
    }

    // Filter by status
    if (status) {
      query.status = status;
    } else {
      // Default to planned and in_progress trips
      query.status = { $in: ["planned", "in_progress"] };
    }

    // Exclude user's own trips if userId is provided
    if (userId) {
      query.userId = { $ne: userId };
    }

    const trips = await Trip.find(query)
      .populate("userId", "name email phone")
      .sort({ departureDate: 1 });

    // Filter by item type if provided (client-side filtering for acceptedItemTypes)
    let filteredTrips = trips;
    if (itemType) {
      filteredTrips = trips.filter((trip) =>
        trip.acceptedItemTypes.includes(itemType)
      );
    }

    res.status(200).json({
      message: "Trips retrieved successfully",
      data: filteredTrips,
    });
  } catch (error) {
    console.error("Get trips with filters error:", error);
    res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
};

// Get matching package requests for a trip
export const getMatchingPackagesForTrip = async (req, res) => {
  try {
    const { tripId } = req.params;

    const trip = await Trip.findById(tripId);
    if (!trip) {
      return res.status(404).json({ message: "Trip not found" });
    }

    // Find packages that match trip route and date
    const query = {
      status: { $in: ["pending", "confirmed"] },
      // Match origin and destination cities
      $or: [
        {
          "originAddress.city": new RegExp(trip.originAddress?.city || "", "i"),
          "destinationAddress.city": new RegExp(
            trip.destinationAddress?.city || "",
            "i"
          ),
        },
      ],
    };

    // Match by date (package delivery date should be around trip dates)
    if (trip.departureDate && trip.arrivalDate) {
      query.estimatedDeliveryDate = {
        $gte: trip.departureDate,
        $lte: trip.arrivalDate,
      };
    }

    const packages = await Package.find(query)
      .populate("userId", "name email")
      .sort({ createdAt: -1 });

    // Filter by accepted item types if trip has them
    let matchingPackages = packages;
    if (trip.acceptedItemTypes && trip.acceptedItemTypes.length > 0) {
      matchingPackages = packages.filter((pkg) => {
        if (!pkg.packageType) return true;
        return trip.acceptedItemTypes.includes(pkg.packageType);
      });
    }

    // Check if booking requests already exist
    const bookingRequests = await BookingRequest.find({
      tripId,
      status: { $in: ["pending", "accepted"] },
    });

    const bookedPackageIds = bookingRequests.map((br) => br.packageId.toString());

    // Remove already booked packages
    matchingPackages = matchingPackages.filter(
      (pkg) => !bookedPackageIds.includes(pkg._id.toString())
    );

    // Calculate match score for each package
    const packagesWithScore = matchingPackages.map((pkg) => {
      let score = 0;

      // Location match
      if (
        pkg.originAddress?.city?.toLowerCase() ===
        trip.originAddress?.city?.toLowerCase()
      ) {
        score += 30;
      }
      if (
        pkg.destinationAddress?.city?.toLowerCase() ===
        trip.destinationAddress?.city?.toLowerCase()
      ) {
        score += 30;
      }

      // Date match
      if (pkg.estimatedDeliveryDate) {
        const pkgDate = new Date(pkg.estimatedDeliveryDate);
        const tripStart = new Date(trip.departureDate);
        const tripEnd = new Date(trip.arrivalDate);
        if (pkgDate >= tripStart && pkgDate <= tripEnd) {
          score += 20;
        }
      }

      // Item type match
      if (
        trip.acceptedItemTypes &&
        trip.acceptedItemTypes.includes(pkg.packageType)
      ) {
        score += 20;
      }

      return {
        ...pkg.toObject(),
        matchScore: score,
      };
    });

    // Sort by match score
    packagesWithScore.sort((a, b) => b.matchScore - a.matchScore);

    res.status(200).json({
      message: "Matching packages retrieved successfully",
      data: {
        trip,
        packages: packagesWithScore,
      },
    });
  } catch (error) {
    console.error("Get matching packages for trip error:", error);
    res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
};

// Get matching packages for a traveler (based on all their trips)
export const getMatchingPackagesForTraveler = async (req, res) => {
  try {
    const { userId } = req.params;

    // Get all active trips for the traveler
    const trips = await Trip.find({
      userId,
      status: { $in: ["planned", "in_progress"] },
      departureDate: { $gte: new Date() },
    });

    if (trips.length === 0) {
      return res.status(200).json({
        message: "No active trips found",
        data: {
          trips: [],
          matchingPackages: [],
        },
      });
    }

    // Get all matching packages for all trips
    const allMatchingPackages = [];
    const packageMap = new Map();

    for (const trip of trips) {
      const query = {
        status: { $in: ["pending", "confirmed"] },
        $or: [
          {
            "originAddress.city": new RegExp(trip.originAddress?.city || "", "i"),
            "destinationAddress.city": new RegExp(
              trip.destinationAddress?.city || "",
              "i"
            ),
          },
        ],
      };

      if (trip.departureDate && trip.arrivalDate) {
        query.estimatedDeliveryDate = {
          $gte: trip.departureDate,
          $lte: trip.arrivalDate,
        };
      }

      const packages = await Package.find(query)
        .populate("userId", "name email")
        .sort({ createdAt: -1 });

      // Filter by accepted item types
      let matchingPackages = packages;
      if (trip.acceptedItemTypes && trip.acceptedItemTypes.length > 0) {
        matchingPackages = packages.filter((pkg) => {
          if (!pkg.packageType) return true;
          return trip.acceptedItemTypes.includes(pkg.packageType);
        });
      }

      // Add trip reference and calculate match score
      matchingPackages.forEach((pkg) => {
        const pkgId = pkg._id.toString();
        if (!packageMap.has(pkgId)) {
          let score = 0;

          // Location match
          if (
            pkg.originAddress?.city?.toLowerCase() ===
            trip.originAddress?.city?.toLowerCase()
          ) {
            score += 30;
          }
          if (
            pkg.destinationAddress?.city?.toLowerCase() ===
            trip.destinationAddress?.city?.toLowerCase()
          ) {
            score += 30;
          }

          // Date match
          if (pkg.estimatedDeliveryDate) {
            const pkgDate = new Date(pkg.estimatedDeliveryDate);
            const tripStart = new Date(trip.departureDate);
            const tripEnd = new Date(trip.arrivalDate);
            if (pkgDate >= tripStart && pkgDate <= tripEnd) {
              score += 20;
            }
          }

          // Item type match
          if (
            trip.acceptedItemTypes &&
            trip.acceptedItemTypes.includes(pkg.packageType)
          ) {
            score += 20;
          }

          packageMap.set(pkgId, {
            ...pkg.toObject(),
            matchScore: score,
            matchingTrip: {
              _id: trip._id,
              tripName: trip.tripName,
              departureDate: trip.departureDate,
            },
          });
        }
      });
    }

    const matchingPackages = Array.from(packageMap.values());
    matchingPackages.sort((a, b) => b.matchScore - a.matchScore);

    // Get existing booking requests
    const bookingRequests = await BookingRequest.find({
      travelerId: userId,
      status: { $in: ["pending", "accepted"] },
    });

    const bookedPackageIds = bookingRequests.map((br) =>
      br.packageId.toString()
    );

    // Filter out already booked packages
    const availablePackages = matchingPackages.filter(
      (pkg) => !bookedPackageIds.includes(pkg._id.toString())
    );

    res.status(200).json({
      message: "Matching packages retrieved successfully",
      data: {
        trips,
        matchingPackages: availablePackages,
      },
    });
  } catch (error) {
    console.error("Get matching packages for traveler error:", error);
    res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
};
