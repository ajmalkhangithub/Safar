import express from "express";
import {
  switchRole,
  addRole,
  getUserRoles,
} from "../controllers/roleController.js";

const router = express.Router();

// Switch active role
router.patch("/:userId/switch", switchRole);

// Add role to user
router.post("/:userId/add", addRole);

// Get user roles
router.get("/:userId", getUserRoles);

export default router;
