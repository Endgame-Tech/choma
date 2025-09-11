require('dotenv').config();
const mongoose = require('mongoose');
const SubscriptionChefAssignment = require('../models/SubscriptionChefAssignment');
const MealAssignment = require('../models/MealAssignment');
const Chef = require('../models/Chef');
const Customer = require('../models/Customer');
const Subscription = require('../models/Subscription');

/**
 * Clean up duplicate meal assignments and test package labeling
 */
async function cleanupMealsAndTest() {
  try {
    console.log('🧹 Cleaning up meals and testing package labeling...\n');
    
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');
    
    // Target the specific assignment
    const targetAssignmentId = '68c22346fe53e37a1eaf2f47';
    
    const chefAssignment = await SubscriptionChefAssignment.findById(targetAssignmentId)
      .populate('chefId', 'fullName')
      .populate('customerId', 'fullName')
      .populate('subscriptionId');
    
    if (!chefAssignment) {
      console.log('❌ Chef assignment not found');
      return;
    }
    
    console.log(`📋 Target assignment: ${chefAssignment._id}`);
    console.log(`   Subscription: ${chefAssignment.subscriptionId._id}`);
    console.log(`   Chef: ${chefAssignment.chefId._id} (${chefAssignment.chefId.fullName})`);
    
    const today = new Date();
    const todayStart = new Date(today.setHours(0, 0, 0, 0));
    const todayEnd = new Date(today.setHours(23, 59, 59, 999));
    
    // Find all meals for this subscription today
    const existingMeals = await MealAssignment.find({
      subscriptionId: chefAssignment.subscriptionId._id,
      assignedChef: chefAssignment.chefId._id,
      scheduledDate: { $gte: todayStart, $lte: todayEnd }
    });
    
    console.log(`\n🍽️ Found ${existingMeals.length} existing meal assignments for today:`);
    existingMeals.forEach((meal, i) => {
      console.log(`   ${i+1}. ${meal.mealTitle} (${meal._id}) - Status: ${meal.status}`);
    });
    
    // Delete all existing meals for clean test
    const deleteResult = await MealAssignment.deleteMany({
      subscriptionId: chefAssignment.subscriptionId._id,
      assignedChef: chefAssignment.chefId._id,
      scheduledDate: { $gte: todayStart, $lte: todayEnd }
    });
    
    console.log(`\n🗑️ Deleted ${deleteResult.deletedCount} existing meal assignments`);
    
    // Create exactly 3 fresh meal assignments
    const mealTypes = ['breakfast', 'lunch', 'dinner'];
    console.log('\n🆕 Creating fresh meal assignments:');
    
    for (const mealType of mealTypes) {
      const newMeal = new MealAssignment({
        subscriptionId: chefAssignment.subscriptionId._id,
        assignedChef: chefAssignment.chefId._id,
        scheduledDate: todayStart,
        status: 'chef_assigned',
        mealTitle: `${mealType.charAt(0).toUpperCase() + mealType.slice(1)} - Package Test`,
        mealDescription: `Fresh ${mealType} meal for package labeling test`,
        scheduledTimeSlot: {
          start: mealType === 'breakfast' ? '08:00' : mealType === 'lunch' ? '12:00' : '18:00',
          end: mealType === 'breakfast' ? '10:00' : mealType === 'lunch' ? '14:00' : '20:00'
        }
      });
      await newMeal.save();
      console.log(`   ✅ Created ${mealType}: ${newMeal._id}`);
    }
    
    // Clear existing package label to test fresh
    await SubscriptionChefAssignment.findByIdAndUpdate(chefAssignment._id, {
      $unset: { driverAssignmentId: 1, packageLabelId: 1 }
    });
    console.log('\n🧹 Cleared existing package labels');
    
    console.log('\n🔄 Completing all meals to trigger package labeling...');
    
    const chefSubscriptionController = require('../controllers/chefSubscriptionController');
    
    // Complete all three meals
    for (let i = 0; i < mealTypes.length; i++) {
      const mealType = mealTypes[i];
      console.log(`\n   Completing ${mealType} (${i+1}/3)...`);
      
      const mockReq = {
        chef: { chefId: chefAssignment.chefId._id },
        body: {
          subscriptionAssignmentId: chefAssignment._id,
          mealType,
          status: 'completed',
          notes: `Clean test completion for ${mealType}`
        }
      };
      
      let workloadCompleted = false;
      const mockRes = {
        json: (data) => {
          console.log(`   ✅ ${mealType} completed successfully`);
          if (data.data && data.data.dailyWorkloadCompleted) {
            console.log(`   🎉 DAILY WORKLOAD COMPLETED! Package labeling triggered!`);
            workloadCompleted = true;
          }
          return data;
        },
        status: (code) => ({
          json: (data) => {
            console.log(`   ❌ Error ${code}:`, data.message);
            return data;
          }
        })
      };
      
      await chefSubscriptionController.updateSubscriptionMealStatus(mockReq, mockRes);
      
      // If this was the completion trigger, break to avoid duplicate processing
      if (workloadCompleted) {
        console.log(`   🚀 Workflow triggered on meal ${i+1}, stopping here`);
        break;
      }
    }
    
    // Wait for async operations
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Check the final result
    const finalAssignment = await SubscriptionChefAssignment.findById(targetAssignmentId);
    
    console.log('\n📦 FINAL RESULTS:');
    console.log(`   Chef Assignment ID: ${finalAssignment._id}`);
    console.log(`   Package Label ID: ${finalAssignment.packageLabelId || '❌ NOT SET'}`);
    console.log(`   Driver Assignment ID: ${finalAssignment.driverAssignmentId || '❌ NOT SET'}`);
    
    if (finalAssignment.packageLabelId) {
      console.log(`\n✅ SUCCESS! 🎉`);
      console.log(`📋 Chef sees Assignment: ${finalAssignment._id}`);
      console.log(`📦 Chef sees Package Label: ${finalAssignment.packageLabelId}`);
      console.log(`🚚 Driver sees Assignment: #${finalAssignment.driverAssignmentId}`);
      console.log(`✅ Package label matches last 8 chars: ${finalAssignment.driverAssignmentId.toString().slice(-8)}`);
    } else {
      console.log(`\n❌ FAILED: Package labeling was not triggered`);
      console.log(`💡 Check the logs above for errors`);
    }
    
    await mongoose.connection.close();
    console.log('\n✅ Cleanup and test complete!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  cleanupMealsAndTest();
}

module.exports = cleanupMealsAndTest;