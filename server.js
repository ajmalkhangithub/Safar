import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import dotenv from "dotenv";
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
dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
console.log(process.env.EMAIL_USER);
console.log(process.env.EMAIL_PASS);
// Routes
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
app.get("/test", (req, res) => {
  res.send("Backend Working!");
});

// MongoDB Connection
connectDB();

// Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(` Server running on port ${PORT}`));
