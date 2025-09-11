require('dotenv').config();
const mongoose = require('mongoose');

/**
 * Manually trigger a pickup notification to test the workflow
 */
async function triggerTestPickupNotification() {
  try {
    console.log('🧪 Triggering test pickup notification...\n');
    
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');
    
    // Import models
    const DriverAssignment = require('../models/DriverAssignment');
    const Order = require('../models/Order');
    const Customer = require('../models/Customer');
    const Notification = require('../models/Notification');
    
    // Look for the user from logs: 68c1b4277bd30b57a54fca8a
    const testUserId = '68c1b4277bd30b57a54fca8a';
    
    console.log('👤 Testing notifications for user:', testUserId);
    
    // Count current notifications
    const currentNotifications = await Notification.countDocuments({
      userId: testUserId
    });
    
    console.log('📱 Current notifications for user:', currentNotifications);
    
    // Create a test notification directly (to verify notification system works)
    console.log('\n📩 Creating test notification...');
    
    const testNotification = await Notification.create({
      userId: testUserId,
      title: "Test Pickup Notification! 🚚",
      message: "Your meal is on the way! Your delivery confirmation code is: TEST123. Please have this code ready for the driver.",
      type: "order_out_for_delivery",
      data: {
        confirmationCode: "TEST123",
        isRecurringDelivery: true,
        testNotification: true
      },
    });
    
    console.log('✅ Test notification created:', testNotification._id);
    
    // Check if notification was created
    const newCount = await Notification.countDocuments({
      userId: testUserId
    });
    
    console.log('📱 Notifications after test:', newCount);
    
    if (newCount > currentNotifications) {
      console.log('✅ Test notification successfully created!');
      
      // Get the latest notification
      const latest = await Notification.findOne({
        userId: testUserId
      }).sort({ createdAt: -1 });
      
      console.log('\n📩 Latest notification:');
      console.log('   Title:', latest.title);
      console.log('   Message:', latest.message);
      console.log('   Type:', latest.type);
      console.log('   Has Code:', latest.data?.confirmationCode ? 'YES' : 'NO');
      
    } else {
      console.log('❌ Test notification failed to create');
    }
    
    // Now try to find an actual assignment to test with
    console.log('\n🔍 Looking for actual driver assignments...');
    
    const userOrders = await Order.find({ customer: testUserId }).select('_id');
    const orderIds = userOrders.map(o => o._id);
    
    console.log('📦 User orders found:', orderIds.length);
    
    if (orderIds.length > 0) {
      const assignment = await DriverAssignment.findOne({
        orderId: { $in: orderIds },
        'subscriptionInfo.subscriptionId': { $exists: true }
      }).sort({ createdAt: -1 });
      
      if (assignment) {
        console.log('📋 Found assignment:', assignment._id.toString().slice(-8));
        console.log('   Status:', assignment.status);
        console.log('   Code:', assignment.confirmationCode);
        console.log('   Is First:', assignment.isFirstDelivery);
        
        // If it's in picked_up status, we can simulate the pickup again
        if (assignment.status === 'picked_up') {
          console.log('\n🔄 Resetting assignment to test pickup...');
          assignment.status = 'assigned';
          assignment.pickedUpAt = null;
          assignment.pickupConfirmation = null;
          assignment.isFirstDelivery = false; // Make it recurring
          await assignment.save();
          
          console.log('🚚 Triggering pickup confirmation...');
          await assignment.confirmPickup({
            notes: 'Test pickup to trigger notification'
          });
          
          console.log('✅ Pickup confirmed!');
          
          // Wait and check for new notifications
          setTimeout(async () => {
            const finalCount = await Notification.countDocuments({
              userId: testUserId
            });
            
            console.log('📱 Final notification count:', finalCount);
            
            if (finalCount > newCount) {
              console.log('🎉 PICKUP NOTIFICATION SENT!');
              
              const latestPickup = await Notification.findOne({
                userId: testUserId,
                type: 'order_out_for_delivery'
              }).sort({ createdAt: -1 });
              
              if (latestPickup) {
                console.log('\n📩 Pickup Notification:');
                console.log('   Title:', latestPickup.title);
                console.log('   Message:', latestPickup.message);
                console.log('   Code:', latestPickup.data?.confirmationCode);
              }
            } else {
              console.log('❌ No pickup notification created');
            }
            
            await mongoose.connection.close();
          }, 2000);
          
        } else {
          console.log('⚠️ Assignment not in correct status for pickup test');
        }
        
      } else {
        console.log('❌ No driver assignment found for user orders');
      }
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    await mongoose.connection.close();
  }
}

if (require.main === module) {
  triggerTestPickupNotification();
}

module.exports = triggerTestPickupNotification;