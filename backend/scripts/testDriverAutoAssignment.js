require('dotenv').config();
const mongoose = require('mongoose');
const Order = require('../models/Order');
const Driver = require('../models/Driver');
const Chef = require('../models/Chef');
const DriverAssignment = require('../models/DriverAssignment');
const driverAssignmentService = require('../services/driverAssignmentService');

/**
 * Test script for driver auto-assignment workflow
 */

async function testDriverAutoAssignment() {
  try {
    console.log('🧪 Testing driver auto-assignment workflow...');
    
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');
    
    // Step 1: Find an active order with an assigned chef
    const order = await Order.findOne({
      assignedChef: { $exists: true },
      delegationStatus: { $in: ['Accepted', 'In Progress'] }
    }).populate('assignedChef');
    
    if (!order) {
      console.log('❌ No suitable orders found for testing');
      return;
    }
    
    console.log(`📦 Found test order: ${order.orderNumber}`);
    console.log(`👨‍🍳 Assigned chef: ${order.assignedChef.fullName}`);
    
    // Step 2: Check if we have any active drivers
    const activeDrivers = await Driver.find({
      isActive: true,
      verified: true
    }).limit(5);
    
    console.log(`🚚 Found ${activeDrivers.length} active drivers`);
    
    if (activeDrivers.length === 0) {
      console.log('❌ No active drivers found for testing');
      return;
    }
    
    // Step 3: Test the auto-assignment service
    console.log('\\n🔄 Testing driver auto-assignment...');
    
    const result = await driverAssignmentService.autoAssignDriverForCompletedOrder(
      order, 
      order.assignedChef._id
    );
    
    if (result.success) {
      console.log('✅ Driver auto-assignment successful!');
      console.log(`🚚 Assigned driver: ${result.driver.fullName}`);
      console.log(`📋 Assignment ID: ${result.assignment._id}`);
      console.log(`🔢 Confirmation code: ${result.assignment.confirmationCode}`);
      console.log(`⏰ Estimated pickup: ${result.assignment.estimatedPickupTime}`);
      console.log(`📍 Pickup location: ${result.assignment.pickupLocation.address}`);
      
      // Step 4: Test status updates
      console.log('\\n🔄 Testing status updates...');
      
      // Simulate driver picking up the order
      console.log('📦 Simulating pickup...');
      const pickupResult = await driverAssignmentService.updateAssignmentStatus(
        result.assignment._id,
        'picked_up',
        {
          notes: 'Food picked up from chef',
          location: { lat: 6.5244, lng: 3.3792 }
        }
      );
      
      if (pickupResult.success) {
        console.log('✅ Pickup status updated successfully');
        
        // Simulate driver out for delivery
        console.log('🚗 Simulating out for delivery...');
        const deliveryResult = await driverAssignmentService.updateAssignmentStatus(
          result.assignment._id,
          'out_for_delivery',
          {
            notes: 'On the way to customer',
            location: { lat: 6.5344, lng: 3.3892 }
          }
        );
        
        if (deliveryResult.success) {
          console.log('✅ Out for delivery status updated successfully');
          
          // Check the updated order status
          const updatedOrder = await Order.findById(order._id);
          console.log(`📦 Order status updated to: ${updatedOrder.orderStatus}`);
        }
      }
      
    } else {
      console.log('❌ Driver auto-assignment failed:', result.message);
    }
    
    // Step 5: Check driver assignments
    console.log('\\n📊 Current driver assignments:');
    const assignments = await DriverAssignment.find({
      status: { $in: ['assigned', 'picked_up', 'out_for_delivery'] }
    })
    .populate('driverId', 'fullName')
    .populate('orderId', 'orderNumber')
    .sort({ assignedAt: -1 })
    .limit(5);
    
    assignments.forEach((assignment, index) => {
      console.log(`   ${index + 1}. Driver: ${assignment.driverId.fullName}, Order: ${assignment.orderId.orderNumber}, Status: ${assignment.status}`);
    });
    
    await mongoose.connection.close();
    console.log('\\n✅ Test completed successfully');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

// Run the test if called directly
if (require.main === module) {
  testDriverAutoAssignment();
}

module.exports = testDriverAutoAssignment;