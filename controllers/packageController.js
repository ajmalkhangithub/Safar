import Package from "../models/Package.js";
import User from "../models/User.js";

// Generate unique tracking number
const generateTrackingNumber = () => {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let trackingNumber = "";
  for (let i = 0; i < 10; i++) {
    trackingNumber += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return trackingNumber;
};

// Create a new package/shipment
export const createPackage = async (req, res) => {
  try {
    // Handle FormData - extract data from req.body
    // FormData sends everything as strings, so we need to parse JSON strings
    let userId = req.body.userId;
    let packageName = req.body.packageName;
    let description = req.body.description;
    let weight = req.body.weight;
    let dimensions = req.body.dimensions;
    let value = req.body.value;
    let compensation = req.body.compensation;
    let insurance = req.body.insurance;
    let packageType = req.body.packageType;
    // Handle photos from multer (req.files) or from body
    let photos = [];
    if (req.files && req.files.length > 0) {
      // Photos uploaded via multer - convert to base64
      photos = req.files.map(file => {
        if (file.buffer) {
          return `data:${file.mimetype};base64,${file.buffer.toString('base64')}`;
        }
        return null;
      }).filter(photo => photo !== null);
    } else if (req.body.photos) {
      // Photos sent as array in body (fallback)
      photos = Array.isArray(req.body.photos) ? req.body.photos : [req.body.photos];
    }
    let sender = req.body.sender;
    let receiver = req.body.receiver;
    let originAddress = req.body.originAddress;
    let destinationAddress = req.body.destinationAddress;
    let estimatedDeliveryDate = req.body.estimatedDeliveryDate;

    // Validate required fields
    if (!userId || !packageName || !sender || !receiver) {
      return res.status(400).json({
        message: "Missing required fields: userId, packageName, sender, receiver",
      });
    }

    // Verify user exists and get user info for sender
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Generate unique tracking number
    let trackingNumber;
    let isUnique = false;
    while (!isUnique) {
      trackingNumber = generateTrackingNumber();
      const existingPackage = await Package.findOne({ trackingNumber });
      if (!existingPackage) {
        isUnique = true;
      }
    }

    // Parse addresses if they are strings (from FormData)
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

    // Parse sender and receiver if they are strings
    let parsedSender = sender;
    let parsedReceiver = receiver;
    
    if (typeof sender === "string") {
      try {
        parsedSender = JSON.parse(sender);
      } catch (e) {
        parsedSender = { name: "", email: "", phone: "", address: sender };
      }
    }
    
    if (typeof receiver === "string") {
      try {
        parsedReceiver = JSON.parse(receiver);
      } catch (e) {
        parsedReceiver = { name: "", email: "", phone: "", address: receiver };
      }
    }

    // Handle sender address - ensure it's an object, not a string
    let senderAddress = parsedOriginAddress;
    if (parsedSender?.address) {
      if (typeof parsedSender.address === "string") {
        senderAddress = { street: parsedSender.address };
      } else if (typeof parsedSender.address === "object") {
        senderAddress = parsedSender.address;
      }
    }
    
    if (!senderAddress || typeof senderAddress !== "object") {
      senderAddress = { street: user.address || "" };
    }

    // Populate sender information from user if not provided or empty
    if (!parsedSender || !parsedSender.name || parsedSender.name === "") {
      parsedSender = {
        name: user.name || "Unknown",
        email: user.email || "",
        phone: user.phone || "",
        address: senderAddress,
      };
    } else {
      // Ensure sender has all required fields, fill from user if missing
      parsedSender = {
        name: parsedSender.name || user.name || "Unknown",
        email: parsedSender.email || user.email || "",
        phone: parsedSender.phone || user.phone || "",
        address: senderAddress,
      };
    }

    // Ensure receiver has required fields (use defaults if not provided)
    // Handle receiver address - ensure it's an object, not a string
    let receiverAddress = parsedDestinationAddress;
    if (parsedReceiver?.address) {
      if (typeof parsedReceiver.address === "string") {
        receiverAddress = { street: parsedReceiver.address };
      } else if (typeof parsedReceiver.address === "object") {
        receiverAddress = parsedReceiver.address;
      }
    }
    
    if (!receiverAddress || typeof receiverAddress !== "object") {
      receiverAddress = { street: "" };
    }

    if (!parsedReceiver || !parsedReceiver.name || parsedReceiver.name === "") {
      parsedReceiver = {
        name: "To Be Determined",
        email: parsedReceiver?.email || "pending@example.com",
        phone: parsedReceiver?.phone || "000-000-0000",
        address: receiverAddress,
      };
    } else {
      parsedReceiver = {
        name: parsedReceiver.name || "To Be Determined",
        email: parsedReceiver.email || "pending@example.com",
        phone: parsedReceiver.phone || "000-000-0000",
        address: receiverAddress,
      };
    }

    // Create package
    const newPackage = new Package({
      trackingNumber,
      userId,
      packageName,
      description,
      weight: weight ? parseFloat(weight) : undefined,
      dimensions,
      value,
      compensation: compensation ? parseFloat(compensation) : undefined,
      insurance: insurance === true || insurance === "true",
      packageType,
      photos: photos || [],
      sender: parsedSender,
      receiver: parsedReceiver,
      originAddress: parsedOriginAddress || parsedSender.address,
      destinationAddress: parsedDestinationAddress || parsedReceiver.address,
      currentLocation: parsedOriginAddress?.city
        ? `${parsedOriginAddress.city}, ${parsedOriginAddress.state || ""}`
        : parsedOriginAddress?.street || "Origin",
      status: "pending",
      estimatedDeliveryDate: estimatedDeliveryDate
        ? new Date(estimatedDeliveryDate)
        : undefined,
      trackingHistory: [
        {
          status: "pending",
          location: parsedOriginAddress?.city
            ? `${parsedOriginAddress.city}, ${parsedOriginAddress.state || ""}`
            : "Origin",
          description: "Package created and awaiting pickup",
          timestamp: new Date(),
        },
      ],
    });

    await newPackage.save();

    res.status(201).json({
      message: "Package created successfully",
      data: newPackage,
    });
  } catch (error) {
    console.error("Create package error:", error);
    res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
};

// Track package by tracking number
export const trackPackage = async (req, res) => {
  try {
    const { trackingNumber } = req.params;

    if (!trackingNumber) {
      return res.status(400).json({ message: "Tracking number is required" });
    }

    const packageData = await Package.findOne({
      trackingNumber: trackingNumber.toUpperCase(),
    }).populate("userId", "name email");

    if (!packageData) {
      return res.status(404).json({ message: "Package not found" });
    }

    res.status(200).json({
      message: "Package found",
      data: packageData,
    });
  } catch (error) {
    console.error("Track package error:", error);
    res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
};

// Get recent deliveries for a user
export const getRecentDeliveries = async (req, res) => {
  try {
    const { userId } = req.params;
    const limit = parseInt(req.query.limit) || 5;

    if (!userId) {
      return res.status(400).json({ message: "User ID is required" });
    }

    const deliveries = await Package.find({
      userId,
      status: { $in: ["in_transit", "out_for_delivery", "delivered"] },
    })
      .sort({ createdAt: -1 })
      .limit(limit)
      .select(
        "trackingNumber packageName status currentLocation originAddress destinationAddress estimatedDeliveryDate createdAt"
      );

    res.status(200).json({
      message: "Recent deliveries retrieved successfully",
      data: deliveries,
    });
  } catch (error) {
    console.error("Get recent deliveries error:", error);
    res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
};

// Get recent packages for a user
export const getRecentPackages = async (req, res) => {
  try {
    const { userId } = req.params;
    const limit = parseInt(req.query.limit) || 10;

    if (!userId) {
      return res.status(400).json({ message: "User ID is required" });
    }

    const packages = await Package.find({ userId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .select(
        "trackingNumber packageName status value estimatedDeliveryDate createdAt"
      );

    res.status(200).json({
      message: "Recent packages retrieved successfully",
      data: packages,
    });
  } catch (error) {
    console.error("Get recent packages error:", error);
    res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
};

// Get all packages for a user
export const getUserPackages = async (req, res) => {
  try {
    const { userId } = req.params;
    const { status } = req.query;

    if (!userId) {
      return res.status(400).json({ message: "User ID is required" });
    }

    const query = { userId };
    if (status) {
      query.status = status;
    }

    const packages = await Package.find(query)
      .sort({ createdAt: -1 })
      .populate("userId", "name email");

    res.status(200).json({
      message: "Packages retrieved successfully",
      data: packages,
    });
  } catch (error) {
    console.error("Get user packages error:", error);
    res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
};

// Update package status
export const updatePackageStatus = async (req, res) => {
  try {
    const { trackingNumber } = req.params;
    const { status, location, description } = req.body;

    if (!trackingNumber) {
      return res.status(400).json({ message: "Tracking number is required" });
    }

    const packageData = await Package.findOne({
      trackingNumber: trackingNumber.toUpperCase(),
    });

    if (!packageData) {
      return res.status(404).json({ message: "Package not found" });
    }

    // Update status
    if (status) {
      packageData.status = status;
    }

    // Update location
    if (location) {
      packageData.currentLocation = location;
    }

    // Add to tracking history
    packageData.trackingHistory.push({
      status: status || packageData.status,
      location: location || packageData.currentLocation,
      description: description || `Status updated to ${status || packageData.status}`,
      timestamp: new Date(),
    });

    // Update delivery date if delivered
    if (status === "delivered") {
      packageData.actualDeliveryDate = new Date();
    }

    await packageData.save();

    res.status(200).json({
      message: "Package status updated successfully",
      data: packageData,
    });
  } catch (error) {
    console.error("Update package status error:", error);
    res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
};

// Get package details by ID
export const getPackageById = async (req, res) => {
  try {
    const { packageId } = req.params;

    const packageData = await Package.findById(packageId).populate(
      "userId",
      "name email phone"
    );

    if (!packageData) {
      return res.status(404).json({ message: "Package not found" });
    }

    res.status(200).json({
      message: "Package retrieved successfully",
      data: packageData,
    });
  } catch (error) {
    console.error("Get package by ID error:", error);
    res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
};

// Get all available packages for travelers (packages with pending status)
export const getAvailablePackagesForTravelers = async (req, res) => {
  try {
    const { userId } = req.params; // Traveler's userId
    const { limit = 20, page = 1 } = req.query;

    // Get all packages with pending status (available for booking)
    const query = {
      status: "pending",
    };

    // Exclude packages from the traveler themselves (if they're also a sender)
    if (userId) {
      query.userId = { $ne: userId };
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const packages = await Package.find(query)
      .populate("userId", "name email phone")
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(skip);

    const total = await Package.countDocuments(query);

    res.status(200).json({
      message: "Available packages retrieved successfully",
      data: packages,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error("Get available packages error:", error);
    res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
};
