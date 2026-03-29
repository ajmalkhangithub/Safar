import Address from "../models/Address.js";
import User from "../models/User.js";

// Create a new address
export const createAddress = async (req, res) => {
  try {
    const { userId } = req.params;
    const { label, name, phone, street, city, country, isDefault } = req.body;

    if (!userId) {
      return res.status(400).json({ message: "User ID is required" });
    }

    if (!label || !name || !phone || !street || !city || !country) {
      return res.status(400).json({
        message: "All fields are required: label, name, phone, street, city, country",
      });
    }

    // Verify user exists
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // If this is set as default, unset other default addresses
    if (isDefault) {
      await Address.updateMany(
        { userId, isDefault: true },
        { isDefault: false }
      );
    }

    // Create new address
    const newAddress = new Address({
      userId,
      label,
      name,
      phone,
      street,
      city,
      country,
      isDefault: isDefault || false,
    });

    await newAddress.save();

    res.status(201).json({
      message: "Address created successfully",
      data: newAddress,
    });
  } catch (error) {
    console.error("Create address error:", error);
    res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
};

// Get all addresses for a user
export const getUserAddresses = async (req, res) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({ message: "User ID is required" });
    }

    const addresses = await Address.find({ userId }).sort({ isDefault: -1, createdAt: -1 });

    res.status(200).json({
      message: "Addresses retrieved successfully",
      data: addresses,
    });
  } catch (error) {
    console.error("Get addresses error:", error);
    res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
};

// Update an address
export const updateAddress = async (req, res) => {
  try {
    const { addressId } = req.params;
    const { label, name, phone, street, city, country, isDefault } = req.body;

    const address = await Address.findById(addressId);

    if (!address) {
      return res.status(404).json({ message: "Address not found" });
    }

    // Update fields
    if (label) address.label = label;
    if (name) address.name = name;
    if (phone) address.phone = phone;
    if (street) address.street = street;
    if (city) address.city = city;
    if (country) address.country = country;

    // Handle default address
    if (isDefault !== undefined) {
      if (isDefault) {
        // Unset other default addresses for this user
        await Address.updateMany(
          { userId: address.userId, _id: { $ne: addressId }, isDefault: true },
          { isDefault: false }
        );
      }
      address.isDefault = isDefault;
    }

    await address.save();

    res.status(200).json({
      message: "Address updated successfully",
      data: address,
    });
  } catch (error) {
    console.error("Update address error:", error);
    res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
};

// Delete an address
export const deleteAddress = async (req, res) => {
  try {
    const { addressId } = req.params;

    const address = await Address.findById(addressId);

    if (!address) {
      return res.status(404).json({ message: "Address not found" });
    }

    await Address.findByIdAndDelete(addressId);

    res.status(200).json({
      message: "Address deleted successfully",
    });
  } catch (error) {
    console.error("Delete address error:", error);
    res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
};

// Set address as default
export const setDefaultAddress = async (req, res) => {
  try {
    const { addressId } = req.params;

    const address = await Address.findById(addressId);

    if (!address) {
      return res.status(404).json({ message: "Address not found" });
    }

    // Unset other default addresses for this user
    await Address.updateMany(
      { userId: address.userId, _id: { $ne: addressId }, isDefault: true },
      { isDefault: false }
    );

    // Set this address as default
    address.isDefault = true;
    await address.save();

    res.status(200).json({
      message: "Address set as default successfully",
      data: address,
    });
  } catch (error) {
    console.error("Set default address error:", error);
    res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
};
