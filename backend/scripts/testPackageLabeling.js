require('dotenv').config();
const mongoose = require('mongoose');
const SubscriptionChefAssignment = require('../models/SubscriptionChefAssignment');
const MealAssignment = require('../models/MealAssignment');
const Chef = require('../models/Chef');
const Driver = require('../models/Driver');
const Subscription = require('../models/Subscription');
const Customer = require('../models/Customer');
const DriverAssignment = require('../models/DriverAssignment');

/**
 * Test package labeling functionality by creating a fresh workflow
 */
async function testPackageLabeling() {
  try {
    console.log('🧪 Testing package labeling functionality...\n');
    
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');
    
    // Clean up old driver assignments for today to force a fresh test
    const today = new Date();
    const todayStart = new Date(today.setHours(0, 0, 0, 0));
    const todayEnd = new Date(today.setHours(23, 59, 59, 999));
    
    const subscription = await Subscription.findOne({}).populate('userId', 'fullName');
    if (!subscription) {
      console.log('❌ No subscription found');
      return;
    }
    
    console.log(`📋 Using subscription: ${subscription._id} for ${subscription.userId.fullName}`);
    
    // Remove existing driver assignments for today to test fresh creation
    const deleteResult = await DriverAssignment.deleteMany({
      'subscriptionInfo.subscriptionId': subscription._id,
      createdAt: { $gte: todayStart, $lte: todayEnd }
    });
    
    console.log(`🗑️ Cleaned up ${deleteResult.deletedCount} existing driver assignments for today`);
    
    // Find the chef assignment for this subscription
    const chefAssignment = await SubscriptionChefAssignment.findOne({
      subscriptionId: subscription._id,
      assignmentStatus: 'active'
    }).populate('chefId', 'fullName');
    
    if (!chefAssignment) {
      console.log('❌ No active chef assignment found');
      return;
    }
    
    console.log(`👨‍🍳 Chef: ${chefAssignment.chefId.fullName}`);
    
    // Clear any existing package label to test fresh assignment
    await SubscriptionChefAssignment.findByIdAndUpdate(chefAssignment._id, {
      $unset: { driverAssignmentId: 1, packageLabelId: 1 }
    });
    
    console.log('🧹 Cleared existing package labels for fresh test');
    
    // Create meal assignments for today if they don't exist
    const mealTypes = ['breakfast', 'lunch', 'dinner'];
    for (const mealType of mealTypes) {
      const existingMeal = await MealAssignment.findOne({
        subscriptionId: subscription._id,
        assignedChef: chefAssignment.chefId._id,
        scheduledDate: { $gte: todayStart, $lte: todayEnd },
        mealTitle: { $regex: new RegExp(mealType, 'i') }
      });
      
      if (!existingMeal) {
        const newMeal = new MealAssignment({
          subscriptionId: subscription._id,
          assignedChef: chefAssignment.chefId._id,
          scheduledDate: todayStart,
          status: 'chef_assigned',
          mealTitle: `Package Test ${mealType.charAt(0).toUpperCase() + mealType.slice(1)}`,
          mealDescription: `Test ${mealType} meal for package labeling`,
          scheduledTimeSlot: {
            start: mealType === 'breakfast' ? '08:00' : mealType === 'lunch' ? '12:00' : '18:00',
            end: mealType === 'breakfast' ? '10:00' : mealType === 'lunch' ? '14:00' : '20:00'
          }
        });
        await newMeal.save();
        console.log(`   Created ${mealType} meal assignment`);
      } else {
        console.log(`   ${mealType} meal assignment already exists`);
      }
    }
    
    // Now trigger the completion workflow by completing all meals
    console.log('\n🔄 Triggering meal completion workflow...');
    
    const chefSubscriptionController = require('../controllers/chefSubscriptionController');
    
    // Complete all three meals to trigger the pickup workflow
    const meals = ['breakfast', 'lunch', 'dinner'];
    for (const mealType of meals) {
      console.log(`\n   Completing ${mealType}...`);
      
      const mockReq = {
        chef: { chefId: chefAssignment.chefId._id },
        body: {
          subscriptionAssignmentId: chefAssignment._id,
          mealType,
          status: 'completed',
          notes: `Package labeling test - ${mealType} completion`
        }
      };
      
      let responseData = null;
      const mockRes = {
        json: (data) => {
          responseData = data;
          console.log(`   ✅ ${mealType} completed successfully`);
          if (data.data && data.data.dailyWorkloadCompleted) {
            console.log(`   🎉 Daily workload completed - pickup workflow should trigger`);
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
    }
    
    // Wait a moment for async operations
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Check if package labeling was applied
    console.log('\n📦 Checking package labeling results...');
    
    const updatedChefAssignment = await SubscriptionChefAssignment.findById(chefAssignment._id);
    
    if (updatedChefAssignment.packageLabelId) {
      console.log(`✅ Package Label ID: ${updatedChefAssignment.packageLabelId}`);
      console.log(`✅ Driver Assignment ID: ${updatedChefAssignment.driverAssignmentId}`);
      
      // Verify the driver assignment exists
      const driverAssignment = await DriverAssignment.findById(updatedChefAssignment.driverAssignmentId);
      if (driverAssignment) {
        console.log(`✅ Driver assignment found: ${driverAssignment._id}`);
        console.log(`✅ Driver assignment status: ${driverAssignment.status}`);
        console.log(`✅ Package labeling test PASSED! 🎉`);
      } else {
        console.log(`❌ Driver assignment not found`);
      }
    } else {
      console.log(`❌ No package label ID found - linking may not have worked`);
    }
    
    await mongoose.connection.close();
    console.log('\n✅ Package labeling test complete!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    await mongoose.connection.close();
    process.exit(1);
  }
}

if (require.main === module) {
  testPackageLabeling();
}

module.exports = testPackageLabeling;