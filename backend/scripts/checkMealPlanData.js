const mongoose = require('mongoose');
require('dotenv').config();

async function checkMealPlanData() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/choma-app');
    console.log('📱 Connected to MongoDB');
    
    // Get the meal plan that's being used
    const mealPlanId = '68beb881a9f07474b8a482c9';
    
    // Raw query to see what's actually in the database
    const mealPlan = await mongoose.connection.db.collection('mealplans').findOne({
      _id: new mongoose.Types.ObjectId(mealPlanId)
    });
    
    console.log('🔍 Raw meal plan data:');
    console.log('- _id:', mealPlan?._id);
    console.log('- planName:', mealPlan?.planName);
    console.log('- weeklyMeals exists:', !!mealPlan?.weeklyMeals);
    
    if (mealPlan?.weeklyMeals) {
      console.log('- weeklyMeals keys:', Object.keys(mealPlan.weeklyMeals));
      console.log('- weeklyMeals structure:');
      console.log(JSON.stringify(mealPlan.weeklyMeals, null, 2));
    } else {
      console.log('❌ weeklyMeals field is missing or empty');
      
      // Check if there are any fields that might contain meal data
      console.log('📋 Available fields in meal plan:');
      Object.keys(mealPlan || {}).forEach(key => {
        const value = mealPlan[key];
        if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
          console.log(`- ${key}: [object with ${Object.keys(value).length} properties]`);
        } else {
          console.log(`- ${key}: ${typeof value} (${Array.isArray(value) ? 'array' : value})`);
        }
      });
    }
    
    // Also check the subscription
    const subscriptionId = '68c1b4727bd30b57a54fcaa5';
    const subscription = await mongoose.connection.db.collection('subscriptions').findOne({
      _id: new mongoose.Types.ObjectId(subscriptionId)
    });
    
    console.log('\n🔍 Subscription data:');
    console.log('- _id:', subscription?._id);
    console.log('- mealPlanId:', subscription?.mealPlanId);
    console.log('- selectedMealTypes:', subscription?.selectedMealTypes);
    console.log('- recurringDelivery exists:', !!subscription?.recurringDelivery);
    
    if (subscription?.recurringDelivery) {
      console.log('- currentMealProgression:', subscription.recurringDelivery.currentMealProgression);
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('📱 Disconnected from MongoDB');
  }
}

runCheck().catch(console.error);

async function runCheck() {
  await checkMealPlanData();
}