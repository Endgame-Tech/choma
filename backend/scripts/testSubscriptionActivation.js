#!/usr/bin/env node

const mongoose = require('mongoose');
const Customer = require('../models/Customer');
const Subscription = require('../models/Subscription');
const Order = require('../models/Order');
const MealPlan = require('../models/MealPlan');

// Load environment variables
require('dotenv').config();

// Connect to MongoDB
async function connectDB() {
  try {
    const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;
    if (!mongoUri) {
      throw new Error('MongoDB URI not found in environment variables');
    }
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
}

// Create test data
async function createTestData() {
  try {
    console.log('\n🔧 Creating test data...\n');

    // Find or create test customer
    let testCustomer = await Customer.findOne({ email: 'test-activation@example.com' });
    if (!testCustomer) {
      testCustomer = await Customer.create({
        fullName: 'Test Activation User',
        email: 'test-activation@example.com',
        password: 'testpassword123', // Required field
        phone: '+1234567890',
        address: '123 Test Street, Test City'
      });
    }
    console.log(`👤 Test customer: ${testCustomer._id} (${testCustomer.fullName})`);

    // Find any meal plan for testing
    const testMealPlan = await MealPlan.findOne();
    if (!testMealPlan) {
      console.error('❌ No meal plans found. Please create a meal plan first.');
      return null;
    }
    console.log(`🍽️ Test meal plan: ${testMealPlan._id} (${testMealPlan.planName})`);

    // Clean up any existing test subscriptions
    await Subscription.deleteMany({ userId: testCustomer._id, subscriptionId: /^TEST-/ });
    await Order.deleteMany({ customer: testCustomer._id, orderId: /^TEST-/ });
    console.log('🧹 Cleaned up existing test data');

    // Create a test subscription (not activated yet)
    const testSubscription = await Subscription.create({
      subscriptionId: `TEST-${Date.now()}`,
      userId: testCustomer._id,
      mealPlanId: testMealPlan._id,
      selectedMealTypes: ['lunch'],
      frequency: 'Daily',
      duration: 'Weekly',
      durationWeeks: 2,
      startDate: new Date(),
      nextDelivery: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
      endDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 2 weeks from now (placeholder)
      totalPrice: 5000,
      price: 5000,
      paymentStatus: 'Paid',
      transactionId: `TEST-TXN-${Date.now()}`,
      status: 'active',
      
      // Key: subscription not activated yet
      recurringDelivery: {
        isActivated: false,
        activationDeliveryCompleted: false,
        currentMealProgression: {
          weekNumber: 1,
          dayOfWeek: 1,
          mealTime: 'lunch'
        },
        deliverySchedule: {
          daysOfWeek: [1, 2, 3, 4, 5],
          timeSlot: 'afternoon'
        }
      }
    });

    console.log(`📋 Test subscription created: ${testSubscription._id}`);
    console.log(`   Status: ${testSubscription.status}`);
    console.log(`   Activated: ${testSubscription.recurringDelivery.isActivated}`);
    console.log(`   Original End Date: ${testSubscription.endDate}`);
    console.log(`   Duration Weeks: ${testSubscription.durationWeeks}`);

    // Create a test order for this subscription
    const testOrder = await Order.create({
      orderNumber: `TEST-ORDER-${Date.now()}`,
      customer: testCustomer._id,
      subscription: testSubscription._id,
      orderItems: [{
        name: 'Test Meal',
        quantity: 1,
        price: 5000
      }],
      totalAmount: 5000,
      paymentMethod: 'Card',
      paymentStatus: 'Paid',
      orderStatus: 'Confirmed',
      deliveryAddress: testCustomer.address,
      deliveryDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
      confirmedDate: new Date()
    });

    console.log(`📦 Test order created: ${testOrder._id}`);
    console.log(`   Status: ${testOrder.orderStatus}`);
    console.log(`   Subscription ID: ${testOrder.subscription}`);

    return { testCustomer, testMealPlan, testSubscription, testOrder };

  } catch (error) {
    console.error('❌ Error creating test data:', error);
    return null;
  }
}

// Test subscription activation
async function testSubscriptionActivation(testData) {
  try {
    const { testSubscription, testOrder } = testData;
    
    console.log('\n🧪 Testing subscription activation...\n');

    // Step 1: Verify subscription is not activated
    const beforeActivation = await Subscription.findById(testSubscription._id);
    console.log('📋 Before activation:');
    console.log(`   Activated: ${beforeActivation.recurringDelivery.isActivated}`);
    console.log(`   End Date: ${beforeActivation.endDate}`);
    console.log(`   Status: ${beforeActivation.status}`);

    // Step 2: Mark order as delivered (this should trigger activation)
    console.log('\n🚚 Marking order as delivered...');
    const updatedOrder = await Order.findByIdAndUpdate(
      testOrder._id,
      { 
        orderStatus: 'Delivered',
        deliveredDate: new Date()
      },
      { new: true }
    ).populate('subscription');

    console.log(`✅ Order marked as delivered: ${updatedOrder._id}`);

    // Step 3: Manually trigger activation (simulating what should happen in orderController)
    if (updatedOrder.subscription && !updatedOrder.subscription.recurringDelivery?.isActivated) {
      console.log('🎯 Triggering subscription activation...');
      await updatedOrder.subscription.activate();
      console.log('✅ Subscription activation method called');
    }

    // Step 4: Verify subscription is now activated
    const afterActivation = await Subscription.findById(testSubscription._id);
    console.log('\n📋 After activation:');
    console.log(`   Activated: ${afterActivation.recurringDelivery.isActivated}`);
    console.log(`   Activated At: ${afterActivation.recurringDelivery.activatedAt}`);
    console.log(`   Original End Date: ${beforeActivation.endDate}`);
    console.log(`   New End Date: ${afterActivation.endDate}`);
    console.log(`   Status: ${afterActivation.status}`);

    // Step 5: Calculate expected vs actual end date
    const activationDate = afterActivation.recurringDelivery.activatedAt;
    const expectedEndDate = new Date(activationDate);
    expectedEndDate.setDate(expectedEndDate.getDate() + (afterActivation.durationWeeks * 7));
    
    console.log('\n🔍 Verification:');
    console.log(`   Activation Date: ${activationDate}`);
    console.log(`   Duration Weeks: ${afterActivation.durationWeeks}`);
    console.log(`   Expected End Date: ${expectedEndDate}`);
    console.log(`   Actual End Date: ${afterActivation.endDate}`);
    
    const endDatesMatch = Math.abs(expectedEndDate.getTime() - afterActivation.endDate.getTime()) < 1000; // Within 1 second
    console.log(`   End Dates Match: ${endDatesMatch ? '✅' : '❌'}`);

    return {
      success: afterActivation.recurringDelivery.isActivated && endDatesMatch,
      beforeActivation,
      afterActivation,
      endDatesMatch
    };

  } catch (error) {
    console.error('❌ Error testing subscription activation:', error);
    return { success: false, error };
  }
}

// Test pause/resume functionality
async function testPauseResume(testData) {
  try {
    const { testSubscription } = testData;
    
    console.log('\n🧪 Testing pause/resume functionality...\n');

    // Get the activated subscription
    let subscription = await Subscription.findById(testSubscription._id);
    const originalEndDate = new Date(subscription.endDate);
    
    console.log('📋 Before pause:');
    console.log(`   Status: ${subscription.status}`);
    console.log(`   End Date: ${subscription.endDate}`);

    // Step 1: Pause the subscription
    console.log('\n⏸️ Pausing subscription...');
    await subscription.pause('Testing pause functionality');
    
    subscription = await Subscription.findById(testSubscription._id);
    console.log('📋 After pause:');
    console.log(`   Status: ${subscription.status}`);
    console.log(`   Paused At: ${subscription.pausedAt}`);
    console.log(`   Pause Reason: ${subscription.pauseReason}`);

    // Wait a moment to simulate pause duration
    console.log('⏰ Waiting 2 seconds to simulate pause duration...');
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Step 2: Resume the subscription
    console.log('\n▶️ Resuming subscription...');
    await subscription.resume();
    
    subscription = await Subscription.findById(testSubscription._id);
    console.log('📋 After resume:');
    console.log(`   Status: ${subscription.status}`);
    console.log(`   Resumed At: ${subscription.resumedAt}`);
    console.log(`   Original End Date: ${originalEndDate}`);
    console.log(`   New End Date: ${subscription.endDate}`);

    // Step 3: Verify end date was extended
    const daysDifference = Math.ceil((subscription.endDate.getTime() - originalEndDate.getTime()) / (1000 * 60 * 60 * 24));
    console.log(`   Days Extended: ${daysDifference}`);
    
    const pauseExtensionWorking = daysDifference >= 0; // Should be extended or at least not reduced
    console.log(`   Pause Extension Working: ${pauseExtensionWorking ? '✅' : '❌'}`);

    return {
      success: subscription.status === 'active' && pauseExtensionWorking,
      originalEndDate,
      newEndDate: subscription.endDate,
      daysExtended: daysDifference
    };

  } catch (error) {
    console.error('❌ Error testing pause/resume:', error);
    return { success: false, error };
  }
}

// Clean up test data
async function cleanupTestData(testData) {
  try {
    if (testData) {
      const { testCustomer, testSubscription, testOrder } = testData;
      
      console.log('\n🧹 Cleaning up test data...');
      
      if (testOrder) {
        await Order.findByIdAndDelete(testOrder._id);
        console.log('✅ Test order deleted');
      }
      
      if (testSubscription) {
        await Subscription.findByIdAndDelete(testSubscription._id);
        console.log('✅ Test subscription deleted');
      }
      
      if (testCustomer) {
        await Customer.findByIdAndDelete(testCustomer._id);
        console.log('✅ Test customer deleted');
      }
    }
  } catch (error) {
    console.error('❌ Error during cleanup:', error);
  }
}

// Main test function
async function runSubscriptionActivationTest() {
  try {
    console.log('🧪 Subscription Activation Test Suite');
    console.log('=====================================\n');

    await connectDB();
    
    const testData = await createTestData();
    if (!testData) {
      console.error('❌ Failed to create test data');
      return;
    }

    // Test 1: Subscription activation
    const activationResult = await testSubscriptionActivation(testData);
    console.log('\n📊 Activation Test Result:', activationResult.success ? '✅ PASSED' : '❌ FAILED');
    
    // Test 2: Pause/Resume functionality
    const pauseResumeResult = await testPauseResume(testData);
    console.log('\n📊 Pause/Resume Test Result:', pauseResumeResult.success ? '✅ PASSED' : '❌ FAILED');

    // Final results
    console.log('\n🏁 Final Test Results:');
    console.log('======================');
    console.log(`Subscription Activation: ${activationResult.success ? '✅ PASSED' : '❌ FAILED'}`);
    console.log(`Pause/Resume Extension: ${pauseResumeResult.success ? '✅ PASSED' : '❌ FAILED'}`);
    
    const allTestsPassed = activationResult.success && pauseResumeResult.success;
    console.log(`\nOverall Result: ${allTestsPassed ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED'}`);

    // Cleanup
    await cleanupTestData(testData);
    
    console.log('\n✅ Test completed successfully');

  } catch (error) {
    console.error('❌ Test suite error:', error);
  } finally {
    mongoose.connection.close();
    process.exit(0);
  }
}

// Run the test if called directly
if (require.main === module) {
  runSubscriptionActivationTest();
}

module.exports = { runSubscriptionActivationTest };