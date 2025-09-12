const mongoose = require('mongoose');
require('dotenv').config();
const Subscription = require('../models/Subscription');
const MealProgressionService = require('../services/mealProgressionService');

async function debugMealProgression() {
  try {
    const mongoUri = process.env.MONGODB_URI || process.env.DATABASE_URL;
    console.log('🔗 Connecting to MongoDB...', mongoUri ? 'URI found' : 'No URI found');
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');
    
    const subscriptionId = '68c1b4727bd30b57a54fcaa5'; // Your subscription ID from logs
    
    const subscription = await Subscription.findById(subscriptionId)
      .populate('mealPlanId');
      
    if (!subscription) {
      console.log('❌ Subscription not found');
      return;
    }
    
    console.log('📊 Subscription Debug Info:');
    console.log('- ID:', subscription._id);
    console.log('- Plan:', subscription.mealPlanId?.planName);
    console.log('- Selected Meal Types:', subscription.selectedMealTypes);
    console.log('- Status:', subscription.status);
    
    if (subscription.recurringDelivery) {
      console.log('📈 Current Progression:', subscription.recurringDelivery.currentMealProgression);
      console.log('📅 Last Delivered Meal:', subscription.recurringDelivery.lastDeliveredMeal);
      console.log('🔄 Is Activated:', subscription.recurringDelivery.isActivated);
    } else {
      console.log('⚠️ No recurringDelivery data found');
    }
    
    // Test manual advancement
    console.log('\n🧪 Testing manual advancement...');
    const mealProgressionService = require('../services/mealProgressionService');
    
    try {
      const nextMeal = await mealProgressionService.advanceToNextMeal(subscriptionId);
      console.log('✅ Manual advancement successful');
      console.log('📈 Next meal:', nextMeal);
      
      // Check progression after advancement
      const updatedSubscription = await Subscription.findById(subscriptionId);
      console.log('📈 Updated Progression:', updatedSubscription.recurringDelivery.currentMealProgression);
      
    } catch (error) {
      console.error('❌ Manual advancement failed:', error.message);
    }
    
  } catch (error) {
    console.error('❌ Debug error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

debugMealProgression();