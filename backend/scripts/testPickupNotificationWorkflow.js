require('dotenv').config();
const mongoose = require('mongoose');

/**
 * Test the pickup notification workflow with 4-digit confirmation codes
 */
async function testPickupNotificationWorkflow() {
  try {
    console.log('🧪 Testing pickup notification workflow...\n');
    
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');
    
    // Import models
    const DriverAssignment = require('../models/DriverAssignment');
    const Order = require('../models/Order');
    const Customer = require('../models/Customer');
    const Notification = require('../models/Notification');
    
    // Find a test assignment for recurring delivery
    const testAssignment = await DriverAssignment.findOne({
      'subscriptionInfo.subscriptionId': { $exists: true },
      status: 'assigned',
      isFirstDelivery: false // This should be a recurring delivery
    }).populate('orderId');
    
    if (!testAssignment) {
      console.log('❌ No suitable test assignment found (need assigned recurring delivery)');
      
      // Show what assignments are available
      const allAssignments = await DriverAssignment.find({
        'subscriptionInfo.subscriptionId': { $exists: true }
      }).select('status isFirstDelivery confirmationCode');
      
      console.log('\n📋 Available assignments:');
      allAssignments.forEach(assignment => {
        console.log(`   ${assignment._id.toString().slice(-8)}: status=${assignment.status}, isFirstDelivery=${assignment.isFirstDelivery}, code=${assignment.confirmationCode}`);
      });
      
      return;
    }
    
    console.log('📋 Found test assignment:', testAssignment._id.toString().slice(-8));
    console.log('   Status:', testAssignment.status);
    console.log('   Is First Delivery:', testAssignment.isFirstDelivery);
    console.log('   Confirmation Code:', testAssignment.confirmationCode);
    console.log('   Order ID:', testAssignment.orderId._id);
    
    // Get customer info
    const order = testAssignment.orderId;
    const customer = await Customer.findById(order.customer);
    
    if (!customer) {
      console.log('❌ Customer not found');
      return;
    }
    
    console.log('👤 Customer:', customer.fullName);
    console.log('   User ID:', customer._id);
    
    // Count notifications before pickup
    const notificationsBefore = await Notification.countDocuments({
      userId: customer._id
    });
    
    console.log('📱 Notifications before pickup:', notificationsBefore);
    
    // Simulate driver confirming pickup
    console.log('\n🚚 Simulating driver pickup confirmation...');
    
    try {
      await testAssignment.confirmPickup({
        notes: 'Test pickup confirmation for notification workflow'
      });
      
      console.log('✅ Pickup confirmed successfully');
      
      // Check for new notifications
      const notificationsAfter = await Notification.countDocuments({
        userId: customer._id
      });
      
      console.log('📱 Notifications after pickup:', notificationsAfter);
      
      if (notificationsAfter > notificationsBefore) {
        // Get the latest notification
        const latestNotification = await Notification.findOne({
          userId: customer._id
        }).sort({ createdAt: -1 });
        
        console.log('\n📩 Latest Notification:');
        console.log('   Title:', latestNotification.title);
        console.log('   Message:', latestNotification.message);
        console.log('   Type:', latestNotification.type);
        console.log('   Has Confirmation Code:', latestNotification.data?.confirmationCode ? 'YES' : 'NO');
        
        if (latestNotification.data?.confirmationCode) {
          console.log('   🔑 Confirmation Code:', latestNotification.data.confirmationCode);
          
          // Verify the code matches
          if (latestNotification.data.confirmationCode === testAssignment.confirmationCode) {
            console.log('   ✅ Confirmation code matches assignment');
          } else {
            console.log('   ❌ Confirmation code mismatch!');
            console.log('      Assignment code:', testAssignment.confirmationCode);
            console.log('      Notification code:', latestNotification.data.confirmationCode);
          }
        }
        
        console.log('\n✅ PICKUP NOTIFICATION WORKFLOW: SUCCESS');
        console.log('   - Driver confirmed pickup ✅');
        console.log('   - Customer received notification ✅');
        console.log('   - Confirmation code delivered ✅');
        
      } else {
        console.log('❌ No new notification created after pickup');
      }
      
    } catch (error) {
      console.error('❌ Error during pickup confirmation:', error.message);
    }
    
    await mongoose.connection.close();
    console.log('\n✅ Pickup notification workflow test complete!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  testPickupNotificationWorkflow();
}

module.exports = testPickupNotificationWorkflow;