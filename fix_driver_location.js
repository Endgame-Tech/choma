const mongoose = require('mongoose');
require('dotenv').config();

async function fixDriverLocation() {
  const DEV_MONGODB_URI = 'mongodb+srv://chomaDev:65dHyGGsQ2Zhshld@chomadev.gmea24c.mongodb.net/chomaDev?retryWrites=true&w=majority&appName=chomaDev';
  const PROD_MONGODB_URI = 'mongodb+srv://getchoma:VQB2HRyxTTCis2RN@choma.tlmjami.mongodb.net/choma?retryWrites=true&w=majority&appName=Choma';
  
  // Try production first, then dev
  const databases = [
    { name: 'PRODUCTION', uri: PROD_MONGODB_URI },
    { name: 'DEVELOPMENT', uri: DEV_MONGODB_URI }
  ];

  for (const db of databases) {
    try {
      console.log(`🔗 Attempting to connect to ${db.name} database...`);
      
      await mongoose.connect(db.uri, {
        serverSelectionTimeoutMS: 5000, // 5 second timeout
        socketTimeoutMS: 5000,
        maxPoolSize: 1
      });
      
      console.log(`✅ Connected to ${db.name} database`);

      const Driver = require('./backend/models/Driver');
      const driverId = '68c0ca6fd31fbb0fb313f125'; // Legend Testimony's ID from your logs

      // Find the driver
      console.log(`🔍 Looking for driver with ID: ${driverId}`);
      const driver = await Driver.findById(driverId);
      
      if (!driver) {
        console.log(`❌ Driver not found in ${db.name} database`);
        await mongoose.disconnect();
        continue; // Try next database
      }

      console.log(`✅ Found driver in ${db.name}: ${driver.fullName}`);
      console.log('📍 Current driver location data:', JSON.stringify(driver.currentLocation, null, 2));

      // Update driver location with proper coordinates
      driver.currentLocation = {
        type: 'Point',
        coordinates: [7.4914, 9.0579], // [longitude, latitude] - Abuja, Nigeria
        lastUpdated: new Date()
      };

      await driver.save();
      console.log(`✅ Driver location updated successfully in ${db.name}!`);
      
      // Verify the update
      const updatedDriver = await Driver.findById(driverId);
      console.log('📍 New driver location:', JSON.stringify(updatedDriver.currentLocation, null, 2));
      
      await mongoose.disconnect();
      return; // Success - exit the loop
      
    } catch (dbError) {
      console.log(`❌ Failed to connect to ${db.name}:`, dbError.message);
      try {
        await mongoose.disconnect();
      } catch (disconnectError) {
        // Ignore disconnect errors
      }
      continue; // Try next database
    }
  }
  
  console.log('❌ Could not connect to any database or driver not found');
}

fixDriverLocation();