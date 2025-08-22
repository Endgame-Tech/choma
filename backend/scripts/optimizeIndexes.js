#!/usr/bin/env node
/**
 * Database Performance Optimization Script
 * Adds indexes to frequently queried fields to improve query performance
 */

// Load environment from parent directory
require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const mongoose = require('mongoose')

// Database URIs with fallbacks
const DEV_URI = process.env.MONGODB_URI || "mongodb+srv://legendetestimony:PnIzbbCUUa3B2zqi@chomacluster0.lat5jo1.mongodb.net/choma?retryWrites=true&w=majority&appName=chomaCluster0";
const PROD_URI = process.env.PROD_MONGODB_URI || "mongodb+srv://getchoma:VQB2HRyxTTCis2RN@choma.tlmjami.mongodb.net/choma?retryWrites=true&w=majority&appName=Choma";

console.log('🔍 Environment check:');
console.log('DEV_URI defined:', !!DEV_URI);
console.log('PROD_URI defined:', !!PROD_URI);

// Connect to database
async function connectDB(uri) {
  try {
    await mongoose.connect(uri, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 10000,
    })
    console.log('📦 Connected to MongoDB')
    console.log('🗄️ Database:', mongoose.connection.db.databaseName)
  } catch (error) {
    console.error('❌ Database connection error:', error)
    process.exit(1)
  }
}

// Performance optimizing indexes
async function createPerformanceIndexes() {
  const db = mongoose.connection.db
  
  console.log('🚀 Creating performance indexes...')
  
  try {
    // Orders collection - most frequently queried
    await db.collection('orders').createIndex({ 'customer.email': 1 })
    await db.collection('orders').createIndex({ 'customer._id': 1 })
    await db.collection('orders').createIndex({ orderStatus: 1 })
    await db.collection('orders').createIndex({ paymentStatus: 1 })
    await db.collection('orders').createIndex({ createdDate: -1 })
    await db.collection('orders').createIndex({ deliveryDate: 1 })
    await db.collection('orders').createIndex({ orderNumber: 1 }, { unique: true })
    await db.collection('orders').createIndex({ 'subscription._id': 1 })
    await db.collection('orders').createIndex({ 'assignedChef._id': 1 })
    
    // Compound indexes for common queries
    await db.collection('orders').createIndex({ orderStatus: 1, createdDate: -1 })
    await db.collection('orders').createIndex({ paymentStatus: 1, createdDate: -1 })
    await db.collection('orders').createIndex({ 'customer._id': 1, createdDate: -1 })
    
    console.log('✅ Orders indexes created')

    // Customers collection
    await db.collection('customers').createIndex({ email: 1 }, { unique: true })
    await db.collection('customers').createIndex({ phoneNumber: 1 })
    await db.collection('customers').createIndex({ isActive: 1 })
    await db.collection('customers').createIndex({ createdDate: -1 })
    await db.collection('customers').createIndex({ fullName: 1 })
    await db.collection('customers').createIndex({ 'deliveryAddress.location.coordinates': '2dsphere' })
    
    // Text index for search functionality
    await db.collection('customers').createIndex({ 
      fullName: 'text', 
      email: 'text',
      phoneNumber: 'text'
    })
    
    console.log('✅ Customers indexes created')

    // Chefs collection
    await db.collection('chefs').createIndex({ email: 1 }, { unique: true })
    await db.collection('chefs').createIndex({ phoneNumber: 1 })
    await db.collection('chefs').createIndex({ status: 1 })
    await db.collection('chefs').createIndex({ isActive: 1 })
    await db.collection('chefs').createIndex({ createdDate: -1 })
    await db.collection('chefs').createIndex({ fullName: 1 })
    await db.collection('chefs').createIndex({ 'location.coordinates': '2dsphere' })
    await db.collection('chefs').createIndex({ currentCapacity: 1 })
    await db.collection('chefs').createIndex({ maxCapacity: 1 })
    
    // Text search for chefs
    await db.collection('chefs').createIndex({
      fullName: 'text',
      email: 'text',
      phoneNumber: 'text'
    })
    
    console.log('✅ Chefs indexes created')

    // Meals collection
    await db.collection('meals').createIndex({ name: 1 })
    await db.collection('meals').createIndex({ category: 1 })
    await db.collection('meals').createIndex({ isAvailable: 1 })
    await db.collection('meals').createIndex({ price: 1 })
    await db.collection('meals').createIndex({ createdDate: -1 })
    await db.collection('meals').createIndex({ updatedAt: -1 })
    
    // Compound indexes for meals
    await db.collection('meals').createIndex({ category: 1, isAvailable: 1 })
    await db.collection('meals').createIndex({ isAvailable: 1, price: 1 })
    
    // Text search for meals
    await db.collection('meals').createIndex({
      name: 'text',
      description: 'text',
      category: 'text'
    })
    
    console.log('✅ Meals indexes created')

    // MealPlans collection - Critical for mobile app performance
    await db.collection('mealplans').createIndex({ planName: 1 })
    await db.collection('mealplans').createIndex({ targetAudience: 1 })
    await db.collection('mealplans').createIndex({ isActive: 1 })
    await db.collection('mealplans').createIndex({ isPublished: 1 })
    await db.collection('mealplans').createIndex({ totalPrice: 1 })
    await db.collection('mealplans').createIndex({ sortOrder: 1 })
    await db.collection('mealplans').createIndex({ createdDate: -1 })
    
    // Compound indexes for most common queries
    await db.collection('mealplans').createIndex({ isActive: 1, isPublished: 1 })
    await db.collection('mealplans').createIndex({ isActive: 1, isPublished: 1, sortOrder: 1 })
    await db.collection('mealplans').createIndex({ isActive: 1, isPublished: 1, createdDate: -1 })
    
    // Text search for meal plans
    await db.collection('mealplans').createIndex({
      planName: 'text',
      description: 'text',
      targetAudience: 'text'
    })
    
    console.log('✅ MealPlans indexes created')

    // MealPlan Assignments collection - Critical for meal plan details
    await db.collection('mealplanassignments').createIndex({ mealPlanId: 1 })
    await db.collection('mealplanassignments').createIndex({ 'mealIds': 1 })
    await db.collection('mealplanassignments').createIndex({ dayOfWeek: 1 })
    await db.collection('mealplanassignments').createIndex({ mealType: 1 })
    
    // Compound index for the most common assignment query
    await db.collection('mealplanassignments').createIndex({ mealPlanId: 1, dayOfWeek: 1 })
    
    console.log('✅ MealPlan Assignments indexes created')

    // DailyMeals collection
    await db.collection('dailymeals').createIndex({ mealName: 1 })
    await db.collection('dailymeals').createIndex({ mealType: 1 })
    await db.collection('dailymeals').createIndex({ isActive: 1 })
    await db.collection('dailymeals').createIndex({ createdAt: -1 })
    
    // Compound index for active meal queries
    await db.collection('dailymeals').createIndex({ isActive: 1, mealType: 1 })
    
    console.log('✅ DailyMeals indexes created')

    // Subscriptions collection
    await db.collection('subscriptions').createIndex({ 'customer._id': 1 })
    await db.collection('subscriptions').createIndex({ 'mealPlanId._id': 1 })
    await db.collection('subscriptions').createIndex({ status: 1 })
    await db.collection('subscriptions').createIndex({ startDate: 1 })
    await db.collection('subscriptions').createIndex({ endDate: 1 })
    await db.collection('subscriptions').createIndex({ createdDate: -1 })
    await db.collection('subscriptions').createIndex({ nextDeliveryDate: 1 })
    
    // Compound indexes for subscriptions
    await db.collection('subscriptions').createIndex({ status: 1, nextDeliveryDate: 1 })
    await db.collection('subscriptions').createIndex({ 'customer._id': 1, status: 1 })
    
    console.log('✅ Subscriptions indexes created')

    // Admins collection
    await db.collection('admins').createIndex({ email: 1 }, { unique: true })
    await db.collection('admins').createIndex({ username: 1 }, { unique: true })
    await db.collection('admins').createIndex({ role: 1 })
    await db.collection('admins').createIndex({ isActive: 1 })
    await db.collection('admins').createIndex({ createdDate: -1 })
    
    console.log('✅ Admins indexes created')

    // Notifications collection (for real-time performance)
    await db.collection('notifications').createIndex({ recipient: 1, createdAt: -1 })
    await db.collection('notifications').createIndex({ recipient: 1, isRead: 1 })
    await db.collection('notifications').createIndex({ type: 1 })
    await db.collection('notifications').createIndex({ createdAt: -1 })
    await db.collection('notifications').createIndex({ isRead: 1 })
    
    console.log('✅ Notifications indexes created')

    // Sessions collection (for auth performance)
    await db.collection('sessions').createIndex({ "session.cookie.expires": 1 }, { expireAfterSeconds: 0 })
    await db.collection('sessions').createIndex({ _id: 1 })
    
    console.log('✅ Sessions indexes created')

    console.log('🎉 All performance indexes created successfully!')
    
    // Show index statistics
    const collections = ['orders', 'customers', 'chefs', 'meals', 'mealplans', 'subscriptions', 'admins', 'notifications']
    
    console.log('\n📊 Index Statistics:')
    for (const collectionName of collections) {
      try {
        const indexes = await db.collection(collectionName).listIndexes().toArray()
        console.log(`${collectionName}: ${indexes.length} indexes`)
        
        // Show index sizes if available
        const stats = await db.collection(collectionName).stats()
        if (stats.totalIndexSize) {
          console.log(`  - Total Index Size: ${(stats.totalIndexSize / 1024 / 1024).toFixed(2)} MB`)
        }
      } catch (error) {
        console.log(`${collectionName}: Collection not found or error getting stats`)
      }
    }

  } catch (error) {
    console.error('❌ Error creating indexes:', error)
    throw error
  }
}

// Cleanup function for testing/development
async function dropAllIndexes() {
  const db = mongoose.connection.db
  console.log('🗑️  Dropping all custom indexes...')
  
  const collections = ['orders', 'customers', 'chefs', 'meals', 'mealplans', 'subscriptions', 'admins', 'notifications']
  
  for (const collectionName of collections) {
    try {
      // Get all indexes except _id
      const indexes = await db.collection(collectionName).listIndexes().toArray()
      for (const index of indexes) {
        if (index.name !== '_id_') {
          await db.collection(collectionName).dropIndex(index.name)
          console.log(`  Dropped ${index.name} from ${collectionName}`)
        }
      }
    } catch (error) {
      console.log(`  ${collectionName}: ${error.message}`)
    }
  }
  
  console.log('✅ Custom indexes dropped')
}

// Main function
async function main() {
  const args = process.argv.slice(2)
  
  // Determine which database to use
  let uri = DEV_URI;
  let dbName = 'Development';
  
  if (args.includes('--prod')) {
    uri = PROD_URI;
    dbName = 'Production';
  } else if (args.includes('--both')) {
    // Run on both databases
    console.log('🚀 Optimizing both Development and Production databases...\n');
    
    // Development first (if available)
    if (DEV_URI) {
      console.log('📊 === DEVELOPMENT DATABASE ===');
      await connectDB(DEV_URI);
      if (args.includes('--drop')) {
        await dropAllIndexes();
      } else {
        await createPerformanceIndexes();
      }
      await mongoose.connection.close();
    } else {
      console.log('⚠️ Development database URI not found, skipping...');
    }
    
    console.log('\n📊 === PRODUCTION DATABASE ===');
    await connectDB(PROD_URI);
    if (args.includes('--drop')) {
      await dropAllIndexes();
    } else {
      await createPerformanceIndexes();
    }
    await mongoose.connection.close();
    
    console.log('\n🎉 Database optimization completed!');
    process.exit(0);
  }
  
  console.log(`🚀 Optimizing ${dbName} database...`);
  await connectDB(uri);
  
  if (args.includes('--drop')) {
    await dropAllIndexes();
  } else {
    await createPerformanceIndexes();
  }
  
  await mongoose.connection.close();
  console.log('👋 Database connection closed');
  process.exit(0);
}

// Handle errors
process.on('unhandledRejection', (error) => {
  console.error('Unhandled Promise Rejection:', error)
  process.exit(1)
})

// Run if called directly
if (require.main === module) {
  main().catch(console.error)
}

module.exports = { createPerformanceIndexes, dropAllIndexes }