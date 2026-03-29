import express from "express";
import {
  createAddress,
  getUserAddresses,
  updateAddress,
  deleteAddress,
  setDefaultAddress,
} from "../controllers/addressController.js";

const router = express.Router();

// Create a new address
router.post("/:userId", createAddress);

// Get all addresses for a user
router.get("/:userId", getUserAddresses);

// Update an address
router.put("/:addressId", updateAddress);

// Delete an address
router.delete("/:addressId", deleteAddress);

// Set address as default
router.patch("/:addressId/default", setDefaultAddress);

export default router;
