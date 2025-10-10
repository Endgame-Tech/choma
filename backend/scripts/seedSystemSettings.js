// backend/scripts/seedSystemSettings.js
// Script to initialize default system settings

const mongoose = require("mongoose");
const path = require("path");
const SystemSettings = require("../models/SystemSettings");

// Load environment variables from backend/.env
require("dotenv").config({ path: path.join(__dirname, "../.env") });

const seedSystemSettings = async () => {
  try {
    console.log("🌱 Starting system settings seeding...");

    // Check if MONGO_URI or MONGODB_URI exists
    const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;

    if (!mongoUri) {
      console.error("❌ MONGO_URI or MONGODB_URI not found in environment variables");
      console.log("💡 Make sure you have a .env file in the backend directory with MONGODB_URI defined");
      process.exit(1);
    }

    console.log("🔗 Connecting to MongoDB...");
    // Connect to MongoDB
    await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log("✓ Connected to MongoDB");

    // Initialize default settings
    await SystemSettings.initializeDefaults();

    console.log("✅ System settings seeded successfully!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Error seeding system settings:", error);
    process.exit(1);
  }
};

// Run the seeder
seedSystemSettings();
