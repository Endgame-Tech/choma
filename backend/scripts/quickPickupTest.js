require('dotenv').config();
const mongoose = require('mongoose');

/**
 * Quick test of pickup notification
 */
async function quickPickupTest() {
  try {
    console.log('🧪 Quick pickup test...\n');
    
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');
    
    const DriverAssignment = require('../models/DriverAssignment');
    const Order = require('../models/Order');
    const Customer = require('../models/Customer');
    
    // Find any assignment in picked_up status that we can test with
    const assignment = await DriverAssignment.findOne({
      'subscriptionInfo.subscriptionId': { $exists: true },
      status: 'picked_up'
    });
    
    if (!assignment) {
      console.log('❌ No assignment found');
      return;
    }
    
    console.log('📋 Using assignment:', assignment._id.toString().slice(-8));
    console.log('   Current status:', assignment.status);
    console.log('   Is First:', assignment.isFirstDelivery);
    console.log('   Code:', assignment.confirmationCode);
    console.log('   Subscription Info:', !!assignment.subscriptionInfo);
    
    // Reset and test
    assignment.status = 'assigned';
    assignment.pickedUpAt = null;
    assignment.pickupConfirmation = null;
    assignment.isFirstDelivery = false; // Make it recurring
    
    await assignment.save();
    console.log('🔄 Reset assignment for testing');
    
    // Trigger pickup
    console.log('\n🚚 Confirming pickup...');
    await assignment.confirmPickup({
      notes: 'Quick test'
    });
    
    console.log('✅ Pickup completed');
    
    await mongoose.connection.close();
    
  } catch (error) {
    console.error('❌ Error:', error);
    await mongoose.connection.close();
  }
}

quickPickupTest();