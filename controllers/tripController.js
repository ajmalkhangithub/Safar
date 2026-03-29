import Trip from "../models/Trip.js";
import User from "../models/User.js";

// Create a new trip
export const createTrip = async (req, res) => {
  try {
    const {
      userId,
      tripName,
      description,
      originAddress,
      destinationAddress,
      departureDate,
      arrivalDate,
      availableSpace,
      maxWeight,
      transportMode,
      acceptedItemTypes,
      suggestedReward,
    } = req.body;

    // Validate required fields
    if (!userId || !tripName || !originAddress || !destinationAddress || !departureDate) {
      return res.status(400).json({
        message: "Missing required fields: userId, tripName, originAddress, destinationAddress, departureDate",
      });
    }

    // Verify user exists
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Parse addresses if they are strings
    let parsedOriginAddress = originAddress;
    let parsedDestinationAddress = destinationAddress;

    if (typeof originAddress === "string") {
      try {
        parsedOriginAddress = JSON.parse(originAddress);
      } catch (e) {
        parsedOriginAddress = { street: originAddress };
      }
    }

    if (typeof destinationAddress === "string") {
      try {
        parsedDestinationAddress = JSON.parse(destinationAddress);
      } catch (e) {
        parsedDestinationAddress = { street: destinationAddress };
      }
    }

    // Parse accepted item types if it's a string
    let parsedAcceptedItemTypes = acceptedItemTypes;
    if (typeof acceptedItemTypes === "string") {
      try {
        parsedAcceptedItemTypes = JSON.parse(acceptedItemTypes);
      } catch (e) {
        parsedAcceptedItemTypes = acceptedItemTypes.split(",").map((t) => t.trim());
      }
    }

    // Create trip
    const newTrip = new Trip({
      userId,
      tripName,
      description: description || "",
      originAddress: parsedOriginAddress,
      destinationAddress: parsedDestinationAddress,
      departureDate: new Date(departureDate),
      arrivalDate: arrivalDate ? new Date(arrivalDate) : undefined,
      availableSpace: availableSpace ? parseFloat(availableSpace) : 0,
      maxWeight: maxWeight ? parseFloat(maxWeight) : undefined,
      transportMode: transportMode || "other",
      acceptedItemTypes: parsedAcceptedItemTypes || [],
      suggestedReward: suggestedReward ? parseFloat(suggestedReward) : undefined,
      status: "planned",
    });

    await newTrip.save();

    // Populate user info for response
    await newTrip.populate("userId", "name email");

    res.status(201).json({
      message: "Trip created successfully",
      data: newTrip,
    });
  } catch (error) {
    console.error("Create trip error:", error);
    res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
};

// Get trips for a user
export const getUserTrips = async (req, res) => {
  try {
    const { userId } = req.params;
    const { status } = req.query;

    const query = { userId };
    if (status) {
      query.status = status;
    }

    const trips = await Trip.find(query)
      .sort({ departureDate: 1 })
      .populate("userId", "name email");

    res.status(200).json({
      message: "Trips retrieved successfully",
      data: trips,
    });
  } catch (error) {
    console.error("Get user trips error:", error);
    res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
};

// Get trip by ID
export const getTripById = async (req, res) => {
  try {
    const { tripId } = req.params;

    const trip = await Trip.findById(tripId).populate("userId", "name email phone");

    if (!trip) {
      return res.status(404).json({ message: "Trip not found" });
    }

    res.status(200).json({
      message: "Trip retrieved successfully",
      data: trip,
    });
  } catch (error) {
    console.error("Get trip by ID error:", error);
    res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
};

// Update trip
export const updateTrip = async (req, res) => {
  try {
    const { tripId } = req.params;
    const updateData = req.body;

    const trip = await Trip.findById(tripId);
    if (!trip) {
      return res.status(404).json({ message: "Trip not found" });
    }

    // Parse addresses if provided as strings
    if (updateData.originAddress && typeof updateData.originAddress === "string") {
      try {
        updateData.originAddress = JSON.parse(updateData.originAddress);
      } catch (e) {
        updateData.originAddress = { street: updateData.originAddress };
      }
    }

    if (updateData.destinationAddress && typeof updateData.destinationAddress === "string") {
      try {
        updateData.destinationAddress = JSON.parse(updateData.destinationAddress);
      } catch (e) {
        updateData.destinationAddress = { street: updateData.destinationAddress };
      }
    }

    // Parse dates if provided
    if (updateData.departureDate) {
      updateData.departureDate = new Date(updateData.departureDate);
    }
    if (updateData.arrivalDate) {
      updateData.arrivalDate = new Date(updateData.arrivalDate);
    }

    // Update trip
    Object.assign(trip, updateData);
    await trip.save();

    res.status(200).json({
      message: "Trip updated successfully",
      data: trip,
    });
  } catch (error) {
    console.error("Update trip error:", error);
    res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
};

// Delete trip
export const deleteTrip = async (req, res) => {
  try {
    const { tripId } = req.params;

    const trip = await Trip.findById(tripId);
    if (!trip) {
      return res.status(404).json({ message: "Trip not found" });
    }

    await Trip.findByIdAndDelete(tripId);

    res.status(200).json({
      message: "Trip deleted successfully",
    });
  } catch (error) {
    console.error("Delete trip error:", error);
    res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
};
