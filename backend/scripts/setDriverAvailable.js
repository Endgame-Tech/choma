const mongoose = require("mongoose");
require("dotenv").config();

const Driver = require("../models/Driver");

async function setDriverAvailable() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✅ Connected to database\n");

    // Find the driver
    const driver = await Driver.findOne({ email: "legendetestimony@gmail.com" });
    
    if (!driver) {
      console.log("❌ Driver not found");
      return;
    }

    console.log("📋 Current driver status:");
    console.log(`   Name: ${driver.fullName}`);
    console.log(`   Status: ${driver.status}`);
    console.log(`   Account Status: ${driver.accountStatus}`);
    console.log(`   Is Available: ${driver.isAvailable}`);

    // Set isAvailable to true
    driver.isAvailable = true;
    await driver.save();

    console.log("\n✅ Driver availability updated!");
    console.log(`   Is Available: ${driver.isAvailable}`);
    console.log("\n🚚 Driver can now be assigned to orders");

  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    await mongoose.connection.close();
    console.log("\n👋 Database connection closed");
  }
}

setDriverAvailable();
