const mongoose = require('mongoose');
require('dotenv').config();

// Import models to ensure they're registered
const Order = require('../models/Order');
const Customer = require('../models/Customer');
const Subscription = require('../models/Subscription');
const MealPlan = require('../models/MealPlan');
const Chef = require('../models/Chef');

async function createOptimizedIndexes() {
  try {
    console.log('Creating optimized indexes for analytics performance...');

    // Order collection indexes (most critical for analytics)
    await Order.collection.createIndex(
      { createdDate: -1 },
      { name: 'createdDate_desc', background: true }
    );

    await Order.collection.createIndex(
      { createdDate: -1, paymentStatus: 1 },
      { name: 'createdDate_paymentStatus', background: true }
    );

    await Order.collection.createIndex(
      { createdDate: -1, orderStatus: 1 },
      { name: 'createdDate_orderStatus', background: true }
    );

    await Order.collection.createIndex(
      { createdDate: -1, paymentStatus: 1, orderStatus: 1 },
      { name: 'analytics_compound', background: true }
    );

    await Order.collection.createIndex(
      { customer: 1, createdDate: -1 },
      { name: 'customer_createdDate', background: true }
    );

    // Customer collection indexes
    await Customer.collection.createIndex(
      { status: 1, lastLogin: -1 },
      { name: 'status_lastLogin', background: true }
    );

    await Customer.collection.createIndex(
      { registrationDate: -1 },
      { name: 'registrationDate_desc', background: true }
    );

    await Customer.collection.createIndex(
      { status: 1, registrationDate: -1 },
      { name: 'status_registrationDate', background: true }
    );

    // Chef collection indexes
    await Chef.collection.createIndex(
      { status: 1, isOnline: 1 },
      { name: 'status_isOnline', background: true }
    );

    // Subscription collection indexes
    await Subscription.collection.createIndex(
      { startDate: -1 },
      { name: 'startDate_desc', background: true }
    );

    await Subscription.collection.createIndex(
      { customer: 1, startDate: -1 },
      { name: 'customer_startDate', background: true }
    );

    await Subscription.collection.createIndex(
      { mealPlanId: 1, startDate: -1 },
      { name: 'mealPlanId_startDate', background: true }
    );

    // MealPlan collection indexes
    await MealPlan.collection.createIndex(
      { isPublished: 1 },
      { name: 'isPublished', background: true }
    );

    await MealPlan.collection.createIndex(
      { planName: 'text', description: 'text' },
      { name: 'text_search', background: true }
    );

    console.log('✅ All analytics indexes created successfully!');
    
    // List all indexes for verification
    console.log('\n📊 Created indexes:');
    
    const collections = [
      { name: 'Orders', model: Order },
      { name: 'Customers', model: Customer },
      { name: 'Chefs', model: Chef },
      { name: 'Subscriptions', model: Subscription },
      { name: 'MealPlans', model: MealPlan }
    ];

    for (const collection of collections) {
      const indexes = await collection.model.collection.listIndexes().toArray();
      console.log(`\n${collection.name}:`);
      indexes.forEach(index => {
        console.log(`  - ${index.name}: ${JSON.stringify(index.key)}`);
      });
    }

  } catch (error) {
    console.error('❌ Error creating indexes:', error);
  }
}

async function connectAndCreateIndexes() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/choma-db', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log('✅ Connected to MongoDB');

    await createOptimizedIndexes();

  } catch (error) {
    console.error('❌ Connection error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('📴 Disconnected from MongoDB');
    process.exit(0);
  }
}

// Run if called directly
if (require.main === module) {
  connectAndCreateIndexes();
}

module.exports = { createOptimizedIndexes };