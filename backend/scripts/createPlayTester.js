#!/usr/bin/env node
// Ensure we load the backend .env even when the script is run from backend/scripts/
const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "..", ".env") });
const connectDB = require("../config/db");
const Customer = require("../models/Customer");
const bcrypt = require("bcryptjs");
const mongoose = require("mongoose");

/**
 * Usage:
 *   node backend/scripts/createPlayTester.js [email] [password]
 *
 * Defaults:
 *   email: test+gpplay@choma.ng
 *   password: ChomaTest123!
 *
 * The script uses the project's connectDB helper and Customer model.
 */

async function createPlayTester() {
  const email = process.argv[2] || "test+gpplay@choma.ng";
  const password = process.argv[3] || "ChomaTest123!";

  try {
    // Quick validation so we fail fast with a helpful message
    if (!process.env.MONGODB_URI) {
      console.error(
        "FATAL: MONGODB_URI not set. Make sure backend/.env exists and contains MONGODB_URI."
      );
      process.exit(1);
    }

    console.log("🔌 Connecting to DB...");
    await connectDB();

    const existing = await Customer.findOne({ email }).select("+password");
    if (existing) {
      console.log("⚠️  Test user already exists:");
      console.log(`   id: ${existing._id}`);
      console.log(`   email: ${existing.email}`);
      console.log("🛑 Exiting without creating a duplicate");
      return process.exit(0);
    }

    // Hash password using same approach as other scripts
    const hashed = await bcrypt.hash(password, 12);

    const customer = new Customer({
      fullName: "Google Play Reviewer",
      firstName: "GooglePlay",
      lastName: "Reviewer",
      email,
      password: hashed,
      phone: "+2340000000000",
      notes: "test-account:google-play-reviewer",
      status: "Active",
    });

    await customer.save();

    console.log("✅ Test user created successfully");
    console.log(`   id: ${customer._id}`);
    console.log(`   email: ${customer.email}`);
    console.log(`   password: ${password}`);
  } catch (err) {
    console.error("❌ Failed to create test user:", err);
    process.exitCode = 1;
  } finally {
    try {
      if (mongoose.connection && mongoose.connection.readyState === 1) {
        await mongoose.connection.close();
        console.log("🔌 Disconnected from DB");
      }
    } catch (e) {
      // ignore close errors
    }
  }
}

// Run
if (require.main === module) {
  createPlayTester()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
