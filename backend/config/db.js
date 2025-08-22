const mongoose = require("mongoose");

const connectDB = async () => {
  try {
    // Optimized connection options for high-scale production
    const options = {
      // Connection pool settings
      maxPoolSize: 50, // Maximum number of connections in the pool
      minPoolSize: 5, // Minimum number of connections
      serverSelectionTimeoutMS: 10000, // 10 seconds
      socketTimeoutMS: 45000, // 45 seconds
      bufferCommands: false, // Disable buffering to fail fast
      // Heartbeat settings for connection health
      heartbeatFrequencyMS: 10000, // 10 seconds

      // Retry settings
      retryWrites: true,
      retryReads: true,

      // Additional production optimizations
      readPreference: "primaryPreferred", // Use secondary for reads when available
      writeConcern: {
        w: "majority",
        j: true, // Ensure writes are journaled
        wtimeout: 5000, // Write timeout
      },

      // Connection management
      connectTimeoutMS: 30000,
      family: 4, // Use IPv4, skip trying IPv6
    };

    const conn = await mongoose.connect(process.env.MONGODB_URI, options);
    console.log("✅ Connected to MongoDB Atlas");
    console.log(`🗄️ Database: ${conn.connection.db.databaseName}`);

    // Handle connection events
    mongoose.connection.on("error", (err) => {
      console.error("❌ MongoDB connection error:", err);
    });

    mongoose.connection.on("disconnected", () => {
      console.log("⚠️ MongoDB disconnected");
    });

    mongoose.connection.on("reconnected", () => {
      console.log("🔄 MongoDB reconnected");
    });

    mongoose.connection.on("timeout", () => {
      console.log("⏱️ MongoDB connection timeout");
    });

    return conn;
  } catch (err) {
    console.error("❌ MongoDB connection error:", err.message);
    // Always throw error so the server startup can handle it properly
    throw err;
  }
};

module.exports = connectDB;
