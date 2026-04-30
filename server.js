import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import dotenv from "dotenv";
import { createServer } from "http";
import { Server } from "socket.io";

import authRoutes from "./routes/authRoutes.js";
import packageRoutes from "./routes/packageRoutes.js";
import profileRoutes from "./routes/profileRoutes.js";
import bookingRoutes from "./routes/bookingRoutes.js";
import messageRoutes from "./routes/messageRoutes.js";
import deliveryTrackingRoutes from "./routes/deliveryTrackingRoutes.js";
import deliveryStatusRoutes from "./routes/deliveryStatusRoutes.js";
import postDeliveryRoutes from "./routes/postDeliveryRoutes.js";
import travelerDashboardRoutes from "./routes/travelerDashboardRoutes.js";
import tripRoutes from "./routes/tripRoutes.js";
import walletRoutes from "./routes/walletRoutes.js";
import roleRoutes from "./routes/roleRoutes.js";
import combinedDashboardRoutes from "./routes/combinedDashboardRoutes.js";
import addressRoutes from "./routes/addressRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import connectDB from "./config/db.js";
import BookingRequest from "./models/BookingRequest.js";

dotenv.config();

const app = express();

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));
console.log(process.env.EMAIL_USER);
console.log(process.env.EMAIL_PASS);

// ─── REST Routes ──────────────────────────────────────────────────────────────
app.use("/api/auth", authRoutes);
app.use("/api/packages", packageRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/bookings", bookingRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/delivery", deliveryTrackingRoutes);
app.use("/api/delivery-status", deliveryStatusRoutes);
app.use("/api/post-delivery", postDeliveryRoutes);
app.use("/api/traveler", travelerDashboardRoutes);
app.use("/api/trips", tripRoutes);
app.use("/api/wallet", walletRoutes);
app.use("/api/role", roleRoutes);
app.use("/api/dashboard", combinedDashboardRoutes);
app.use("/api/addresses", addressRoutes);
app.use("/api/admin", adminRoutes);
app.get("/test", (req, res) => res.send("Backend Working!"));

// ─── HTTP + Socket.io server ──────────────────────────────────────────────────
const httpServer = createServer(app);

export const io = new Server(httpServer, {
  cors: {
    origin: "*",          // allow all origins (Expo Go, tunnels, etc.)
    methods: ["GET", "POST"],
  },
});

app.set("io", io);

// ─── Socket.io Live Tracking Logic ───────────────────────────────────────────
io.on("connection", (socket) => {
  console.log(`[Socket] Client connected: ${socket.id}`);

  // ── Join tracking room (both traveler and sender call this) ──────────────
  socket.on("join_tracking_room", ({ bookingId, role }) => {
    if (!bookingId) return;
    const room = `tracking_${bookingId}`;
    socket.join(room);
    console.log(`[Socket] ${role} joined room: ${room}`);
    socket.emit("joined_room", { room, bookingId });
  });

  // ── Traveler emits their GPS location ────────────────────────────────────
  socket.on("traveler_location_update", async ({ bookingId, lat, lng }) => {
    if (!bookingId || lat == null || lng == null) return;

    const room = `tracking_${bookingId}`;

    // Broadcast to other clients in the room (sender will receive this)
    socket.to(room).emit("location_updated", {
      bookingId,
      lat,
      lng,
      timestamp: new Date().toISOString(),
    });

    // Persist last-known location in MongoDB (non-blocking)
    BookingRequest.findByIdAndUpdate(bookingId, {
      travelerLocation: { lat, lng, updatedAt: new Date() },
    }).catch((err) =>
      console.error("[Socket] Failed to persist traveler location:", err.message)
    );
  });

  // ── Traveler signals delivery complete — stop tracking ───────────────────
  const emitTrackingEnded = ({ bookingId }) => {
    if (!bookingId) return;
    const room = `tracking_${bookingId}`;
    io.to(room).emit("tracking_ended", { bookingId });
    console.log(`[Socket] Tracking ended for booking: ${bookingId}`);
  };

  socket.on("end_tracking", emitTrackingEnded);
  socket.on("tracking_ended", emitTrackingEnded);

  socket.on("disconnect", () => {
    console.log(`[Socket] Client disconnected: ${socket.id}`);
  });
});

// ─── MongoDB + Start Server ───────────────────────────────────────────────────
connectDB();

const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, () =>
  console.log(` Server running on port ${PORT} (HTTP + Socket.io)`)
);

export default app;
