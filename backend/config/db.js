const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    // Set mongoose connection options - SIMPLE and WORKING
    const options = {
      serverSelectionTimeoutMS: 10000, // 10 seconds
      socketTimeoutMS: 0, // No timeout on socket
      bufferCommands: false // Disable buffering to fail fast
    };

    const conn = await mongoose.connect(process.env.MONGODB_URI, options);
    console.log('✅ Connected to MongoDB Atlas');
    console.log(`🗄️ Database: ${conn.connection.db.databaseName}`);
    
    // Handle connection events
    mongoose.connection.on('error', (err) => {
      console.error('❌ MongoDB connection error:', err);
    });
    
    mongoose.connection.on('disconnected', () => {
      console.log('⚠️ MongoDB disconnected');
    });
    
    mongoose.connection.on('reconnected', () => {
      console.log('🔄 MongoDB reconnected');
    });
    
    mongoose.connection.on('timeout', () => {
      console.log('⏱️ MongoDB connection timeout');
    });
    
    return conn;
    
  } catch (err) {
    console.error('❌ MongoDB connection error:', err.message);
    // Always throw error so the server startup can handle it properly
    throw err;
  }
};

module.exports = connectDB;
