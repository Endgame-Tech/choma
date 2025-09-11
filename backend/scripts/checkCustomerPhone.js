require('dotenv').config();
const mongoose = require('mongoose');
const Customer = require('../models/Customer');
const Order = require('../models/Order');
const DriverAssignment = require('../models/DriverAssignment');

/**
 * Check specific customer phone data
 */
async function checkCustomerPhone() {
  try {
    console.log('📞 Checking customer phone data...\n');
    
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');
    
    // Get recent driver assignment
    const assignment = await DriverAssignment.findOne({
      'subscriptionInfo.subscriptionId': { $exists: true },
      status: { $in: ['assigned', 'picked_up'] }
    }).sort({ createdAt: -1 });
    
    console.log(`📋 Assignment: ${assignment._id}`);
    console.log(`📝 Order: ${assignment.orderId}`);
    
    // Get order and customer
    const order = await Order.findById(assignment.orderId);
    console.log(`👤 Customer ID from order: ${order.customer}`);
    
    // Get customer directly
    const customer = await Customer.findById(order.customer);
    
    console.log('\n👤 Customer Details:');
    console.log(`   ID: ${customer._id}`);
    console.log(`   Full Name: ${customer.fullName}`);
    console.log(`   Email: ${customer.email}`);
    console.log(`   Phone: ${customer.phone || 'NOT SET'}`);
    console.log(`   Address: ${customer.address || 'NOT SET'}`);
    console.log(`   City: ${customer.city || 'NOT SET'}`);
    
    // Check all customers for phone numbers
    console.log('\n📞 All customers phone status:');
    const allCustomers = await Customer.find({}).select('fullName phone email');
    
    allCustomers.forEach(cust => {
      console.log(`   ${cust.fullName}: Phone = ${cust.phone || 'NOT SET'}`);
    });
    
    await mongoose.connection.close();
    console.log('\n✅ Phone check complete!');
    
  } catch (error) {
    console.error('❌ Check failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  checkCustomerPhone();
}

module.exports = checkCustomerPhone;