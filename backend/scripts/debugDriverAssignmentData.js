require('dotenv').config();
const mongoose = require('mongoose');
const DriverAssignment = require('../models/DriverAssignment');
const Order = require('../models/Order');
const Customer = require('../models/Customer');

/**
 * Debug script to check what data is available in driver assignments
 */
async function debugDriverAssignmentData() {
  try {
    console.log('🔍 Debugging driver assignment data...\n');
    
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');
    
    // Get a recent driver assignment with subscription info
    const assignment = await DriverAssignment.findOne({
      'subscriptionInfo.subscriptionId': { $exists: true },
      status: { $in: ['assigned', 'picked_up'] }
    }).sort({ createdAt: -1 });
    
    if (!assignment) {
      console.log('❌ No driver assignment found');
      return;
    }
    
    console.log(`📋 Driver Assignment: ${assignment._id}`);
    console.log(`   Status: ${assignment.status}`);
    console.log(`   Driver: ${assignment.driverId}`);
    console.log(`   Order: ${assignment.orderId}`);
    
    console.log('\n📍 Pickup Location:');
    console.log(`   Address: ${assignment.pickupLocation.address}`);
    console.log(`   Coordinates: ${assignment.pickupLocation.coordinates}`);
    console.log(`   Chef Name: ${assignment.pickupLocation.chefName}`);
    console.log(`   Chef Phone: ${assignment.pickupLocation.chefPhone}`);
    console.log(`   Instructions: ${assignment.pickupLocation.instructions || 'None'}`);
    
    console.log('\n🏠 Delivery Location:');
    console.log(`   Address: ${assignment.deliveryLocation.address}`);
    console.log(`   Coordinates: ${assignment.deliveryLocation.coordinates}`);
    console.log(`   Area: ${assignment.deliveryLocation.area}`);
    console.log(`   Instructions: ${assignment.deliveryLocation.instructions || 'None'}`);
    
    // Get the actual customer data from the order
    const order = await Order.findById(assignment.orderId).populate('customer');
    
    if (order && order.customer) {
      console.log('\n👤 Customer Information (from Order):');
      console.log(`   Name: ${order.customer.fullName}`);
      console.log(`   Phone: ${order.customer.phone}`);
      console.log(`   Email: ${order.customer.email}`);
      
      if (order.customer.addresses && order.customer.addresses.length > 0) {
        console.log('   Addresses:');
        order.customer.addresses.forEach((addr, i) => {
          console.log(`     ${i+1}. ${addr.street}, ${addr.city} ${addr.zipCode}`);
          console.log(`        Label: ${addr.label || 'Default'}`);
          console.log(`        Is Default: ${addr.isDefault || false}`);
        });
      } else {
        console.log('   Addresses: None found in customer.addresses');
      }
      
      // Check order delivery address
      if (order.deliveryAddress) {
        console.log(`   Order Delivery Address: ${order.deliveryAddress}`);
      }
      
      // Compare with what's in the assignment
      console.log('\n🔍 Comparison:');
      console.log(`   Assignment delivery address: ${assignment.deliveryLocation.address}`);
      console.log(`   Order delivery address: ${order.deliveryAddress || 'Not set'}`);
      console.log(`   Customer has ${order.customer.addresses?.length || 0} stored addresses`);
      
    } else {
      console.log('\n❌ Could not find customer information');
    }
    
    // Check subscription info
    if (assignment.subscriptionInfo) {
      console.log('\n📋 Subscription Info:');
      console.log(`   Subscription ID: ${assignment.subscriptionInfo.subscriptionId}`);
      console.log(`   Meal Plan ID: ${assignment.subscriptionInfo.mealPlanId}`);
      console.log(`   Delivery Day: ${assignment.subscriptionInfo.deliveryDay}`);
    }
    
    await mongoose.connection.close();
    console.log('\n✅ Debug complete!');
    
  } catch (error) {
    console.error('❌ Debug failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  debugDriverAssignmentData();
}

module.exports = debugDriverAssignmentData;