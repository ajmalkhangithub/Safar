import express from "express";
import {
  adminLogin,
  getDashboardStats,
  getAllUsers,
  getUserDetails,
  updateUserStatus,
  updateUserRoles,
  deleteUser,
  createAdmin,
  getAllPackages,
  getAllTrips,
  getAllReports,
  getAllKYCRequests,
  approveKYC,
  rejectKYC,
  getAllTransactions,
  getBookingTransactions,
  releasePayment,
  refundPayment,
  cancelPackage,
  createDisputeReport,
} from "../controllers/adminController.js";
import {
  verifyAdmin,
  verifySuperAdmin,
  checkPermission,
} from "../middleware/adminAuth.js";

const router = express.Router();

// Public routes
router.post("/login", adminLogin);

// Protected admin routes (all require admin authentication)
// Dashboard
router.get("/dashboard/stats", verifyAdmin, getDashboardStats);

// User Management
router.get(
  "/users",
  verifyAdmin,
  checkPermission("users"),
  getAllUsers
);

router.get(
  "/users/:userId",
  verifyAdmin,
  checkPermission("users"),
  getUserDetails
);

router.patch(
  "/users/:userId/status",
  verifyAdmin,
  checkPermission("users"),
  updateUserStatus
);

router.patch(
  "/users/:userId/roles",
  verifyAdmin,
  checkPermission("users"),
  updateUserRoles
);

router.delete(
  "/users/:userId",
  verifySuperAdmin,
  deleteUser
);

// Create new admin (super admin only)
router.post("/create-admin", verifySuperAdmin, createAdmin);

// Package Management
router.get(
  "/packages",
  verifyAdmin,
  checkPermission("packages"),
  getAllPackages
);

// Trip Management
router.get(
  "/trips",
  verifyAdmin,
  checkPermission("trips"),
  getAllTrips
);

// Reports/Disputes Management
router.get(
  "/reports",
  verifyAdmin,
  checkPermission("reports"),
  getAllReports
);

// KYC Management
router.get(
  "/kyc",
  verifyAdmin,
  checkPermission("kyc"),
  getAllKYCRequests
);

router.patch(
  "/kyc/:userId/approve",
  verifyAdmin,
  checkPermission("kyc"),
  approveKYC
);

router.patch(
  "/kyc/:userId/reject",
  verifyAdmin,
  checkPermission("kyc"),
  rejectKYC
);

// Transactions Management
router.get(
  "/transactions",
  verifyAdmin,
  checkPermission("transactions"),
  getAllTransactions
);

// Booking Transactions (Escrow)
router.get(
  "/booking-transactions",
  verifyAdmin,
  checkPermission("transactions"),
  getBookingTransactions
);

router.patch(
  "/booking-transactions/:bookingId/release",
  verifyAdmin,
  checkPermission("transactions"),
  releasePayment
);

router.patch(
  "/booking-transactions/:bookingId/refund",
  verifyAdmin,
  checkPermission("transactions"),
  refundPayment
);

// Package Actions
router.patch(
  "/packages/:packageId/cancel",
  verifyAdmin,
  checkPermission("packages"),
  cancelPackage
);

router.post(
  "/packages/:packageId/dispute",
  verifyAdmin,
  checkPermission("packages"),
  createDisputeReport
);

export default router;
