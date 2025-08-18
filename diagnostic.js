// diagnostic.js - MongoDB Database Diagnostic Script
const mongoose = require('mongoose');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://legendetestimony:PnIzbbCUUa3B2zqi@chomacluster0.lat5jo1.mongodb.net/choma?retryWrites=true&w=majority&appName=chomaCluster0';

async function diagnoseDatabase() {
  try {
    console.log('🔍 Starting MongoDB Diagnostic...');
    console.log('📍 Connecting to:', MONGODB_URI.replace(/\/\/.*:.*@/, '//***:***@'));
    
    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 10000,
    });
    
    console.log('✅ Connected to MongoDB');
    console.log('🗄️ Database:', mongoose.connection.db.databaseName);
    
    // Get database statistics
    const db = mongoose.connection.db;
    
    // 1. List all collections
    console.log('\n📋 COLLECTIONS IN DATABASE:');
    const collections = await db.listCollections().toArray();
    
    if (collections.length === 0) {
      console.log('❌ NO COLLECTIONS FOUND! This is likely the problem.');
      console.log('💡 Your database exists but is empty.');
    } else {
      collections.forEach((collection, index) => {
        console.log(`${index + 1}. ${collection.name} (type: ${collection.type})`);
      });
    }
    
    // 2. Check specific collections we expect
    console.log('\n🔍 CHECKING EXPECTED COLLECTIONS:');
    const expectedCollections = ['customers', 'orders', 'mealplans', 'subscriptions'];
    
    for (const collectionName of expectedCollections) {
      try {
        const count = await db.collection(collectionName).countDocuments();
        console.log(`✅ ${collectionName}: ${count} documents`);
      } catch (error) {
        console.log(`❌ ${collectionName}: Error - ${error.message}`);
      }
    }
    
    // 3. Test model imports
    console.log('\n📦 TESTING MODEL IMPORTS:');
    try {
      const Customer = require('./backend/models/Customer');
      console.log('✅ Customer model imported successfully');
      console.log('   Model collection name:', Customer.collection.name);
    } catch (error) {
      console.log('❌ Customer model import failed:', error.message);
    }
    
    try {
      const Order = require('./backend/models/Order');
      console.log('✅ Order model imported successfully');
      console.log('   Model collection name:', Order.collection.name);
    } catch (error) {
      console.log('❌ Order model import failed:', error.message);
    }
    
    try {
      const MealPlan = require('./backend/models/MealPlan');
      console.log('✅ MealPlan model imported successfully');
      console.log('   Model collection name:', MealPlan.collection.name);
    } catch (error) {
      console.log('❌ MealPlan model import failed:', error.message);
    }
    
    // 4. Test a simple query
    console.log('\n🧪 TESTING SIMPLE QUERY:');
    try {
      const Customer = require('./backend/models/Customer');
      const customerCount = await Customer.countDocuments().maxTimeMS(5000);
      console.log(`✅ Customer count query successful: ${customerCount} customers`);
    } catch (error) {
      console.log('❌ Customer count query failed:', error.message);
    }
    
    // 5. Database connection info
    console.log('\n📊 CONNECTION INFO:');
    console.log('   Host:', mongoose.connection.host);
    console.log('   Port:', mongoose.connection.port);
    console.log('   Database:', mongoose.connection.name);
    console.log('   Ready State:', mongoose.connection.readyState); // 1 = connected
    
  } catch (error) {
    console.error('❌ Diagnostic failed:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔚 Diagnostic complete. Disconnected from MongoDB.');
  }
}

// Run diagnostic
diagnoseDatabase();