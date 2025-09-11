require('dotenv').config();
const mongoose = require('mongoose');

/**
 * Manual test of pickup notification workflow by changing assignment back to assigned state
 */
async function manualPickupTest() {
  try {
    console.log('🧪 Manual pickup notification test...\n');
    
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');
    
    // Import models
    const DriverAssignment = require('../models/DriverAssignment');
    const Order = require('../models/Order');
    const Customer = require('../models/Customer');
    const Notification = require('../models/Notification');
    
    // Find any picked_up assignment for testing
    const testAssignment = await DriverAssignment.findOne({
      'subscriptionInfo.subscriptionId': { $exists: true },
      status: 'picked_up'
    });
    
    if (!testAssignment) {
      console.log('❌ Assignment not found');
      return;
    }
    
    console.log('📋 Test assignment:', testAssignment._id.toString().slice(-8));
    console.log('   Current status:', testAssignment.status);
    console.log('   Is First Delivery:', testAssignment.isFirstDelivery);
    console.log('   Confirmation Code:', testAssignment.confirmationCode);
    
    // Get order and customer
    const order = await Order.findById(testAssignment.orderId);
    const customer = await Customer.findById(order.customer);
    
    console.log('👤 Customer:', customer.fullName);
    console.log('   User ID:', customer._id);
    
    // Count notifications before
    const notificationsBefore = await Notification.countDocuments({
      userId: customer._id,
      type: { $in: ['delivery_code', 'delivery_update'] }
    });
    console.log('📱 Relevant notifications before:', notificationsBefore);
    
    // Temporarily reset to assigned state for testing
    testAssignment.status = 'assigned';
    testAssignment.pickedUpAt = null;
    testAssignment.pickupConfirmation = null;
    
    // Make it a recurring delivery (not first)
    testAssignment.isFirstDelivery = false;
    
    await testAssignment.save();
    console.log('🔄 Reset assignment to assigned state for testing');
    
    // Now test the pickup confirmation
    console.log('\n🚚 Testing pickup confirmation workflow...');
    
    try {
      await testAssignment.confirmPickup({
        notes: 'Manual test of pickup notification with code delivery'
      });
      
      console.log('✅ Pickup confirmed successfully');
      console.log('   New status:', testAssignment.status);
      
      // Wait a moment for async operations
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Check for new notifications
      const notificationsAfter = await Notification.countDocuments({
        userId: customer._id,
        type: { $in: ['delivery_code', 'delivery_update'] }
      });
      
      console.log('📱 Relevant notifications after:', notificationsAfter);
      
      if (notificationsAfter > notificationsBefore) {
        // Get the latest notification
        const latestNotification = await Notification.findOne({
          userId: customer._id,
          type: { $in: ['delivery_code', 'delivery_update'] }
        }).sort({ createdAt: -1 });
        
        console.log('\n📩 Latest Notification:');
        console.log('   Title:', latestNotification.title);
        console.log('   Message:', latestNotification.message);
        console.log('   Type:', latestNotification.type);
        
        if (latestNotification.data) {
          console.log('   Data Keys:', Object.keys(latestNotification.data));
          if (latestNotification.data.confirmationCode) {
            console.log('   🔑 Confirmation Code:', latestNotification.data.confirmationCode);
            
            if (latestNotification.data.confirmationCode === testAssignment.confirmationCode) {
              console.log('   ✅ Confirmation code matches!');
            } else {
              console.log('   ❌ Code mismatch!');
            }
          }
        }
        
        // Check if message contains the code
        const codeInMessage = latestNotification.message.includes(testAssignment.confirmationCode);
        console.log('   Code in message:', codeInMessage ? 'YES ✅' : 'NO ❌');
        
        if (latestNotification.type === 'delivery_code' && codeInMessage) {
          console.log('\n🎉 SUCCESS: Pickup notification with confirmation code working correctly!');
        } else {
          console.log('\n⚠️ Notification sent but missing code details');
        }
        
      } else {
        console.log('❌ No new notification created');
      }
      
    } catch (error) {
      console.error('❌ Pickup confirmation failed:', error.message);
    }
    
    await mongoose.connection.close();
    console.log('\n✅ Manual pickup test complete!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  manualPickupTest();
}

module.exports = manualPickupTest;