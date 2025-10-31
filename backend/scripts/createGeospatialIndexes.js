const mongoose = require("mongoose");
require("dotenv").config();

const createGeospatialIndexes = async () => {
  try {
    console.log("🔌 Connecting to MongoDB...");
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✅ Connected to MongoDB");

    const db = mongoose.connection.db;
    const driverAssignmentsCollection = db.collection("driverassignments");

    console.log("\n📍 Creating geospatial indexes...");

    // Drop existing indexes if they exist (to recreate them)
    try {
      await driverAssignmentsCollection.dropIndex(
        "pickupLocation.coordinates_2dsphere"
      );
      console.log("   🗑️ Dropped existing pickupLocation index");
    } catch (e) {
      console.log("   ℹ️ No existing pickupLocation index to drop");
    }

    try {
      await driverAssignmentsCollection.dropIndex(
        "deliveryLocation.coordinates_2dsphere"
      );
      console.log("   🗑️ Dropped existing deliveryLocation index");
    } catch (e) {
      console.log("   ℹ️ No existing deliveryLocation index to drop");
    }

    // Create pickupLocation geospatial index
    await driverAssignmentsCollection.createIndex(
      { "pickupLocation.coordinates": "2dsphere" },
      { name: "pickupLocation.coordinates_2dsphere" }
    );
    console.log("   ✅ Created pickupLocation.coordinates 2dsphere index");

    // Create deliveryLocation geospatial index
    await driverAssignmentsCollection.createIndex(
      { "deliveryLocation.coordinates": "2dsphere" },
      { name: "deliveryLocation.coordinates_2dsphere" }
    );
    console.log("   ✅ Created deliveryLocation.coordinates 2dsphere index");

    // List all indexes to verify
    console.log("\n📋 Current indexes on driverassignments collection:");
    const indexes = await driverAssignmentsCollection.indexes();
    indexes.forEach((index) => {
      console.log(`   - ${index.name}:`, JSON.stringify(index.key));
    });

    console.log("\n✅ Geospatial indexes created successfully!");
  } catch (error) {
    console.error("❌ Error creating indexes:", error);
  } finally {
    await mongoose.disconnect();
    console.log("\n🔌 Disconnected from MongoDB");
    process.exit(0);
  }
};

createGeospatialIndexes();
