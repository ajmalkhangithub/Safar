import express from "express";
import {
  sendMessage,
  getMessages,
  markAsRead,
} from "../controllers/messageController.js";

const router = express.Router();

// Send a message
router.post("/:userId/send", sendMessage);

// Get messages for a booking
router.get("/booking/:bookingId", getMessages);

// Mark message as read
router.patch("/:messageId/read", markAsRead);

export default router;
