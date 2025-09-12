const mongoose = require('mongoose');
require('dotenv').config();
const Subscription = require('../models/Subscription');

async function fixMealProgression() {
  try {
    const mongoUri = process.env.MONGODB_URI || process.env.DATABASE_URL;
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');
    
    const subscriptionId = '68c1b4727bd30b57a54fcaa5';
    
    const subscription = await Subscription.findById(subscriptionId);
    
    if (!subscription) {
      console.log('❌ Subscription not found');
      return;
    }
    
    console.log('📊 Current progression:', subscription.recurringDelivery.currentMealProgression);
    console.log('🍽️ Selected meal types:', subscription.selectedMealTypes);
    
    // Reset progression to start from the first meal of the day
    const firstMealType = subscription.selectedMealTypes[0]; // should be 'breakfast'
    
    // Use updateOne to avoid validation issues
    await Subscription.updateOne(
      { _id: subscriptionId },
      { 
        $set: { 
          'recurringDelivery.currentMealProgression': {
            weekNumber: 1,
            dayOfWeek: 1, 
            mealTime: firstMealType // This should be 'breakfast', not 'lunch'
          }
        }
      }
    );
    
    console.log('✅ Fixed progression to: { weekNumber: 1, dayOfWeek: 1, mealTime:', firstMealType, '}');
    console.log('🎯 Timeline should now start from', firstMealType, 'on Monday Week 1');
    
  } catch (error) {
    console.error('❌ Fix error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

fixMealProgression();