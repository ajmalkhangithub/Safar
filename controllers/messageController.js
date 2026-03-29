import Message from "../models/Message.js";
import BookingRequest from "../models/BookingRequest.js";

// Send a message
export const sendMessage = async (req, res) => {
  try {
    const { bookingId, receiverId, message, attachments } = req.body;
    const senderId = req.params.userId;

    if (!bookingId || !receiverId || !message) {
      return res.status(400).json({
        message: "Booking ID, receiver ID, and message are required",
      });
    }

    // Verify booking exists and user is part of it
    const booking = await BookingRequest.findById(bookingId);
    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    if (
      booking.senderId.toString() !== senderId &&
      booking.travelerId.toString() !== senderId
    ) {
      return res.status(403).json({
        message: "You are not authorized to send messages for this booking",
      });
    }

    if (
      booking.senderId.toString() !== receiverId &&
      booking.travelerId.toString() !== receiverId
    ) {
      return res.status(403).json({
        message: "Invalid receiver for this booking",
      });
    }

    // Create message
    const newMessage = new Message({
      bookingId,
      senderId,
      receiverId,
      message,
      attachments: attachments || [],
    });

    await newMessage.save();

    // Populate sender info for response
    await newMessage.populate("senderId", "name email");

    res.status(201).json({
      message: "Message sent successfully",
      data: newMessage,
    });
  } catch (error) {
    console.error("Send message error:", error);
    res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
};

// Get messages for a booking
export const getMessages = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const { userId } = req.query;

    // Verify booking exists and user is part of it
    const booking = await BookingRequest.findById(bookingId);
    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    if (
      booking.senderId.toString() !== userId &&
      booking.travelerId.toString() !== userId
    ) {
      return res.status(403).json({
        message: "You are not authorized to view messages for this booking",
      });
    }

    // Get all messages for this booking
    const messages = await Message.find({ bookingId })
      .populate("senderId", "name email")
      .populate("receiverId", "name email")
      .sort({ createdAt: 1 });

    // Mark messages as read for the current user
    await Message.updateMany(
      {
        bookingId,
        receiverId: userId,
        read: false,
      },
      {
        read: true,
        readAt: new Date(),
      }
    );

    res.status(200).json({
      message: "Messages retrieved successfully",
      data: messages,
    });
  } catch (error) {
    console.error("Get messages error:", error);
    res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
};

// Mark messages as read
export const markAsRead = async (req, res) => {
  try {
    const { messageId } = req.params;
    const { userId } = req.body;

    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({ message: "Message not found" });
    }

    if (message.receiverId.toString() !== userId) {
      return res.status(403).json({
        message: "You can only mark your own received messages as read",
      });
    }

    message.read = true;
    message.readAt = new Date();
    await message.save();

    res.status(200).json({
      message: "Message marked as read",
      data: message,
    });
  } catch (error) {
    console.error("Mark as read error:", error);
    res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
};
