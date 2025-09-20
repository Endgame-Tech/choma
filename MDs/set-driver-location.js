// Quick script to set driver location for testing
// Run with: node set-driver-location.js

const mongoose = require("mongoose");

// Connect to MongoDB
const mongoURI = process.env.MONGO_URI || "mongodb://localhost:27017/choma";

async function setDriverLocation() {
  try {
    await mongoose.connect(mongoURI);
    console.log("📦 Connected to MongoDB");

    // Define Driver schema (simplified)
    const DriverSchema = new mongoose.Schema({
      fullName: String,
      currentLocation: {
        type: {
          type: String,
          enum: ["Point"],
          default: "Point",
        },
        coordinates: {
          type: [Number], // [longitude, latitude]
          required: false,
        },
        lastUpdated: {
          type: Date,
          default: Date.now,
        },
      },
    });

    const Driver = mongoose.model("Driver", DriverSchema);

    // Update the specific driver (Legend Testimony - ID from logs)
    const driverId = "68c0ca6fd31fbb0fb313f125";

    const result = await Driver.findByIdAndUpdate(
      driverId,
      {
        currentLocation: {
          type: "Point",
          coordinates: [28.2871, -15.4094], // [longitude, latitude] for Lusaka, Zambia
          lastUpdated: new Date(),
        },
      },
      { new: true }
    );

    if (result) {
      console.log("✅ Driver location updated successfully:");
      console.log(`📍 Driver: ${result.fullName}`);
      console.log(`📍 Location: [${result.currentLocation.coordinates}]`);
      console.log(`📍 Updated: ${result.currentLocation.lastUpdated}`);
    } else {
      console.log("❌ Driver not found");
    }

    await mongoose.disconnect();
    console.log("📦 Disconnected from MongoDB");
  } catch (error) {
    console.error("❌ Error:", error);
  }
}

setDriverLocation();
