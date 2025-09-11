require('dotenv').config();
const mongoose = require('mongoose');
const SubscriptionChefAssignment = require('../models/SubscriptionChefAssignment');
const MealAssignment = require('../models/MealAssignment');
const Chef = require('../models/Chef');
const Driver = require('../models/Driver');
const Subscription = require('../models/Subscription');
const MealPlanAssignment = require('../models/MealPlanAssignment');
const Customer = require('../models/Customer');
const MealPlan = require('../models/MealPlan');
const axios = require('axios');

/**
 * Test script to verify chef meal status updates work correctly
 */

async function testChefMealStatusUpdate() {
  try {
    console.log('🧪 Testing chef meal status update...');
    
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');
    
    // Find an active chef assignment
    const chefAssignment = await SubscriptionChefAssignment.findOne({
      assignmentStatus: 'active'
    }).populate('chefId');
    
    if (!chefAssignment) {
      console.log('❌ No active chef assignments found');
      return;
    }
    
    console.log(`📋 Found chef assignment: ${chefAssignment._id}`);
    console.log(`👨‍🍳 Chef: ${chefAssignment.chefId?.fullName || 'Unknown'}`);
    
    // Check existing meal assignments for today
    const today = new Date();
    const todayStart = new Date(today.setHours(0, 0, 0, 0));
    const todayEnd = new Date(today.setHours(23, 59, 59, 999));
    
    const existingMeals = await MealAssignment.find({
      subscriptionId: chefAssignment.subscriptionId,
      scheduledDate: { $gte: todayStart, $lte: todayEnd }
    });
    
    console.log(`🍽️ Found ${existingMeals.length} existing meals for today`);
    
    if (existingMeals.length > 0) {
      existingMeals.forEach((meal, index) => {
        console.log(`   ${index + 1}. ${meal.mealTitle} - Status: ${meal.status}`);
      });
    }
    
    // Test the API endpoint directly
    console.log('\n🔄 Testing meal status update API...');
    
    const testData = {
      subscriptionAssignmentId: chefAssignment._id,
      mealType: 'breakfast',
      status: 'completed',
      notes: 'Test completion from script'
    };
    
    try {
      // Since we're testing from server side, we'll call the controller method directly
      const chefSubscriptionController = require('../controllers/chefSubscriptionController');
      
      // Mock req and res objects
      const mockReq = {
        chef: { chefId: chefAssignment.chefId._id },
        body: testData
      };
      
      const mockRes = {
        status: (code) => ({
          json: (data) => {
            console.log(`📡 API Response (${code}):`, data);
            return data;
          }
        }),
        json: (data) => {
          console.log('📡 API Response (200):', data);
          return data;
        }
      };
      
      await chefSubscriptionController.updateSubscriptionMealStatus(mockReq, mockRes);
      
      // Check if meal assignment was created/updated
      const updatedMeals = await MealAssignment.find({
        subscriptionId: chefAssignment.subscriptionId,
        scheduledDate: { $gte: todayStart, $lte: todayEnd }
      });
      
      console.log(`\n📊 After update: ${updatedMeals.length} meals found`);
      updatedMeals.forEach((meal, index) => {
        console.log(`   ${index + 1}. ${meal.mealTitle} - Status: ${meal.status}`);
      });
      
    } catch (apiError) {
      console.error('❌ API test failed:', apiError.message);
    }
    
    await mongoose.connection.close();
    console.log('\n✅ Test completed');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

// Run the test if called directly
if (require.main === module) {
  testChefMealStatusUpdate();
}

module.exports = testChefMealStatusUpdate;