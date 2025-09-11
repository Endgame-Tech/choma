require('dotenv').config();
const mongoose = require('mongoose');
const SubscriptionChefAssignment = require('../models/SubscriptionChefAssignment');
const MealAssignment = require('../models/MealAssignment');
const Chef = require('../models/Chef');
const Driver = require('../models/Driver');
const Subscription = require('../models/Subscription');
const Customer = require('../models/Customer');
const DriverAssignment = require('../models/DriverAssignment');
const MealPlan = require('../models/MealPlan');

/**
 * Test the complete pickup workflow:
 * 1. Chef completes all daily meals
 * 2. Driver gets notified for pickup
 * 3. Customer gets pickup code (if returning customer)
 * 4. Driver confirms pickup and delivery
 */

async function testCompletePickupWorkflow() {
  try {
    console.log('🧪 Testing complete pickup workflow...\n');
    
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');
    
    // Step 1: Find an active chef assignment
    const chefAssignment = await SubscriptionChefAssignment.findOne({
      assignmentStatus: 'active'
    }).populate('chefId').populate('subscriptionId').populate('customerId');
    
    if (!chefAssignment) {
      console.log('❌ No active chef assignments found');
      return;
    }
    
    console.log('📋 Found chef assignment:');
    console.log(`   Chef: ${chefAssignment.chefId?.fullName || 'Unknown'}`);
    console.log(`   Customer: ${chefAssignment.customerId?.fullName || 'Unknown'}`);
    console.log(`   Subscription: ${chefAssignment.subscriptionId?._id}`);
    
    // Step 2: Create multiple meal assignments to simulate daily workload
    console.log('\n🍽️ Creating daily meal assignments...');
    
    const mealTypes = ['breakfast', 'lunch', 'dinner'];
    const today = new Date();
    const todayStart = new Date(today.setHours(0, 0, 0, 0));
    
    for (const mealType of mealTypes) {
      // Check if meal already exists
      let mealAssignment = await MealAssignment.findOne({
        subscriptionId: chefAssignment.subscriptionId._id,
        scheduledDate: { $gte: todayStart },
        mealTitle: { $regex: new RegExp(mealType, 'i') }
      });
      
      if (!mealAssignment) {
        // Create new meal assignment
        mealAssignment = new MealAssignment({
          subscriptionId: chefAssignment.subscriptionId._id,
          assignedChef: chefAssignment.chefId._id,
          scheduledDate: todayStart,
          status: 'chef_assigned',
          mealTitle: `Test ${mealType.charAt(0).toUpperCase() + mealType.slice(1)}`,
          mealDescription: `Test ${mealType} meal for workflow testing`,
          scheduledTimeSlot: {
            start: mealType === 'breakfast' ? '08:00' : mealType === 'lunch' ? '12:00' : '18:00',
            end: mealType === 'breakfast' ? '10:00' : mealType === 'lunch' ? '14:00' : '20:00'
          }
        });
        await mealAssignment.save();
        console.log(`   Created ${mealType} meal assignment`);
      } else {
        console.log(`   ${mealType} meal assignment already exists`);
      }
    }
    
    // Step 3: Test completing each meal one by one
    console.log('\n🔄 Testing meal completion workflow...');
    
    const chefSubscriptionController = require('../controllers/chefSubscriptionController');
    
    for (let i = 0; i < mealTypes.length; i++) {
      const mealType = mealTypes[i];
      console.log(`\n   Completing ${mealType}...`);
      
      // Mock req and res objects
      const mockReq = {
        chef: { chefId: chefAssignment.chefId._id },
        body: {
          subscriptionAssignmentId: chefAssignment._id,
          mealType,
          status: 'completed',
          notes: `Test completion of ${mealType}`
        }
      };
      
      let responseData = null;
      const mockRes = {
        json: (data) => {
          responseData = data;
          return data;
        }
      };
      
      await chefSubscriptionController.updateSubscriptionMealStatus(mockReq, mockRes);
      
      if (responseData && responseData.success) {
        console.log(`   ✅ ${mealType} completed successfully`);
        
        if (responseData.data.dailyWorkloadCompleted) {
          console.log(`   🎉 ALL DAILY MEALS COMPLETED! Pickup workflow triggered.`);
          break; // Workflow is triggered, no need to complete more meals
        }
      } else {
        console.log(`   ❌ Failed to complete ${mealType}:`, responseData?.message);
      }
    }
    
    // Step 4: Check if pickup assignments were created
    console.log('\n📦 Checking pickup assignments...');
    
    const pickupAssignments = await DriverAssignment.find({
      'subscriptionInfo.subscriptionId': chefAssignment.subscriptionId._id,
      status: 'assigned'
    }).populate('driverId', 'fullName phone');
    
    console.log(`   Found ${pickupAssignments.length} pickup assignments`);
    
    if (pickupAssignments.length > 0) {
      const assignment = pickupAssignments[0];
      console.log(`   Driver: ${assignment.driverId?.fullName || 'Unknown'}`);
      
      // Get customer info through the order
      const Order = require('../models/Order');
      const Customer = require('../models/Customer');
      const order = await Order.findById(assignment.orderId).populate('customer');
      console.log(`   Customer: ${order?.customer?.fullName || 'Unknown'}`);
      console.log(`   Pickup Code: ${assignment.confirmationCode || 'Not needed (first-time customer)'}`);
      console.log(`   Estimated Pickup: ${assignment.estimatedPickupTime}`);
      console.log(`   Estimated Delivery: ${assignment.estimatedDeliveryTime}`);
      
      // Step 5: Test driver pickup confirmation
      console.log('\n🚚 Testing driver pickup confirmation...');
      
      const driverSubscriptionController = require('../controllers/driverSubscriptionController');
      
      const pickupReq = {
        driver: { id: assignment.driverId._id },
        body: {
          assignmentId: assignment._id,
          notes: 'Test pickup confirmation',
          location: { lat: 6.5244, lng: 3.3792 }
        }
      };
      
      let pickupResponse = null;
      const pickupRes = {
        json: (data) => {
          pickupResponse = data;
          return data;
        }
      };
      
      await driverSubscriptionController.confirmPickup(pickupReq, pickupRes);
      
      if (pickupResponse && pickupResponse.success) {
        console.log('   ✅ Pickup confirmed successfully');
        
        // Step 6: Test delivery confirmation with pickup code
        console.log('\n📍 Testing delivery confirmation...');
        
        const deliveryReq = {
          driver: { id: assignment.driverId._id },
          body: {
            assignmentId: assignment._id,
            pickupCode: assignment.confirmationCode, // Use the generated code
            notes: 'Test delivery confirmation',
            location: { lat: 6.5344, lng: 3.3892 }
          }
        };
        
        let deliveryResponse = null;
        const deliveryRes = {
          json: (data) => {
            deliveryResponse = data;
            return data;
          }
        };
        
        await driverSubscriptionController.confirmDelivery(deliveryReq, deliveryRes);
        
        if (deliveryResponse && deliveryResponse.success) {
          console.log('   ✅ Delivery confirmed successfully');
          console.log(`   💰 Driver earned: ₦${deliveryResponse.data.earnings.total}`);
        } else {
          console.log('   ❌ Delivery confirmation failed:', deliveryResponse?.message);
        }
      } else {
        console.log('   ❌ Pickup confirmation failed:', pickupResponse?.message);
      }
    }
    
    await mongoose.connection.close();
    console.log('\n✅ Complete workflow test finished!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

// Run the test if called directly
if (require.main === module) {
  testCompletePickupWorkflow();
}

module.exports = testCompletePickupWorkflow;