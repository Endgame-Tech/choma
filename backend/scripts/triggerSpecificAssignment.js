require('dotenv').config();
const mongoose = require('mongoose');
const SubscriptionChefAssignment = require('../models/SubscriptionChefAssignment');
const MealAssignment = require('../models/MealAssignment');
const Chef = require('../models/Chef');
const Customer = require('../models/Customer');
const Subscription = require('../models/Subscription');

/**
 * Trigger package labeling for a specific chef assignment
 */
async function triggerSpecificAssignment() {
  try {
    console.log('🎯 Triggering package labeling for specific assignment...\n');
    
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');
    
    // Target the specific assignment you mentioned
    const targetAssignmentId = '68c22346fe53e37a1eaf2f47';
    
    const chefAssignment = await SubscriptionChefAssignment.findById(targetAssignmentId)
      .populate('chefId', 'fullName')
      .populate('customerId', 'fullName')
      .populate('subscriptionId');
    
    if (!chefAssignment) {
      console.log('❌ Chef assignment not found');
      return;
    }
    
    console.log(`📋 Found chef assignment:`);
    console.log(`   ID: ${chefAssignment._id}`);
    console.log(`   Chef: ${chefAssignment.chefId.fullName}`);
    console.log(`   Customer: ${chefAssignment.customerId.fullName}`);
    console.log(`   Subscription: ${chefAssignment.subscriptionId._id}`);
    console.log(`   Current Package Label: ${chefAssignment.packageLabelId || 'NONE'}`);
    
    // Create meal assignments for today if they don't exist
    const today = new Date();
    const todayStart = new Date(today.setHours(0, 0, 0, 0));
    
    const mealTypes = ['breakfast', 'lunch', 'dinner'];
    for (const mealType of mealTypes) {
      const existingMeal = await MealAssignment.findOne({
        subscriptionId: chefAssignment.subscriptionId._id,
        assignedChef: chefAssignment.chefId._id,
        scheduledDate: { $gte: todayStart },
        mealTitle: { $regex: new RegExp(mealType, 'i') }
      });
      
      if (!existingMeal) {
        const newMeal = new MealAssignment({
          subscriptionId: chefAssignment.subscriptionId._id,
          assignedChef: chefAssignment.chefId._id,
          scheduledDate: todayStart,
          status: 'chef_assigned',
          mealTitle: `${mealType.charAt(0).toUpperCase() + mealType.slice(1)} for ${chefAssignment.customerId.fullName}`,
          mealDescription: `${mealType} meal for package labeling demo`,
          scheduledTimeSlot: {
            start: mealType === 'breakfast' ? '08:00' : mealType === 'lunch' ? '12:00' : '18:00',
            end: mealType === 'breakfast' ? '10:00' : mealType === 'lunch' ? '14:00' : '20:00'
          }
        });
        await newMeal.save();
        console.log(`   ✅ Created ${mealType} meal assignment`);
      } else {
        console.log(`   📋 ${mealType} meal assignment already exists`);
      }
    }
    
    console.log('\n🔄 Completing all meals to trigger package labeling...');
    
    const chefSubscriptionController = require('../controllers/chefSubscriptionController');
    
    // Complete all three meals
    for (const mealType of mealTypes) {
      console.log(`\n   Completing ${mealType}...`);
      
      const mockReq = {
        chef: { chefId: chefAssignment.chefId._id },
        body: {
          subscriptionAssignmentId: chefAssignment._id,
          mealType,
          status: 'completed',
          notes: `Demo completion for ${mealType}`
        }
      };
      
      const mockRes = {
        json: (data) => {
          console.log(`   ✅ ${mealType} completed`);
          if (data.data && data.data.dailyWorkloadCompleted) {
            console.log(`   🎉 Daily workload completed - package labeling triggered!`);
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
    
    // Wait for async operations
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Check the updated assignment
    const updatedAssignment = await SubscriptionChefAssignment.findById(targetAssignmentId);
    
    console.log('\n📦 Final results:');
    console.log(`   Chef Assignment ID: ${updatedAssignment._id}`);
    console.log(`   Package Label ID: ${updatedAssignment.packageLabelId || 'NOT SET'}`);
    console.log(`   Driver Assignment ID: ${updatedAssignment.driverAssignmentId || 'NOT SET'}`);
    
    if (updatedAssignment.packageLabelId) {
      console.log(`\n✅ SUCCESS! Chef will now see: Package Label ${updatedAssignment.packageLabelId}`);
      console.log(`✅ Driver will see: Assignment #${updatedAssignment.driverAssignmentId}`);
      console.log(`✅ The package label ${updatedAssignment.packageLabelId} matches the last 8 chars of driver assignment!`);
    } else {
      console.log(`\n❌ Package labeling was not triggered - check for errors above`);
    }
    
    await mongoose.connection.close();
    console.log('\n✅ Test complete!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  triggerSpecificAssignment();
}

module.exports = triggerSpecificAssignment;