import mongoose from "mongoose";
import bcryptjs from "bcryptjs";
import dotenv from "dotenv";
import User from "./models/User.js";

dotenv.config();

// Connect to MongoDB
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI);
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
};

// Create Super Admin
const createSuperAdmin = async () => {
  try {
    await connectDB();

    // Check if super admin already exists
    const existingAdmin = await User.findOne({ isSuperAdmin: true });

    if (existingAdmin) {
      // Update permissions if they don't have the reports permission
      const requiredPermissions = ["reports", "kyc", "transactions"];
      let updated = false;
      
      requiredPermissions.forEach(perm => {
        if (!existingAdmin.adminPermissions.includes(perm)) {
          existingAdmin.adminPermissions.push(perm);
          updated = true;
        }
      });
      
      if (updated) {
        await existingAdmin.save();
        console.log("✅ Super admin permissions updated");
      }
      
      console.log("Super admin already exists:");
      console.log("Email:", existingAdmin.email);
      console.log("Permissions:", existingAdmin.adminPermissions);
      console.log("You can use this account to login to the admin panel");
      process.exit(0);
    }

    // Create super admin user
    const email = "admin@safarx.com";
    const password = "Admin@123"; // Change this password after first login!
    const hashedPassword = await bcryptjs.hash(password, 10);

    const superAdmin = new User({
      name: "Super Admin",
      email: email,
      password: hashedPassword,
      isAdmin: true,
      isSuperAdmin: true,
      adminPermissions: ["users", "packages", "trips", "bookings", "analytics", "settings", "reports", "kyc", "transactions"],
      roles: ["admin"],
      activeRole: "admin",
      profileComplete: true,
      emailVerifiedAt: new Date(),
    });

    await superAdmin.save();

    console.log("✅ Super Admin created successfully!");
    console.log("-----------------------------------");
    console.log("Email:", email);
    console.log("Password:", password);
    console.log("-----------------------------------");
    console.log("⚠️  IMPORTANT: Change this password after first login!");
    console.log("You can now login to the admin panel using these credentials.");

    process.exit(0);
  } catch (error) {
    console.error("Error creating super admin:", error);
    process.exit(1);
  }
};

// Run the script
createSuperAdmin();
