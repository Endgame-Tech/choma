require('dotenv').config();
const mongoose = require('mongoose');
const Customer = require('../models/Customer');
const DriverAssignment = require('../models/DriverAssignment');
const Order = require('../models/Order');

/**
 * Fix customer data and delivery area issues
 */
async function fixCustomerData() {
  try {
    console.log('🔧 Fixing customer data and delivery areas...\n');
    
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');
    
    // Fix customer phone numbers
    console.log('📞 Adding phone numbers to customers...');
    
    const customers = await Customer.find({});
    
    for (const customer of customers) {
      if (!customer.phone) {
        // Add a demo phone number
        const demoPhone = '+234813912' + Math.floor(Math.random() * 9000 + 1000);
        
        await Customer.findByIdAndUpdate(customer._id, {
          phone: demoPhone
        });
        
        console.log(`   ✅ Added phone ${demoPhone} to ${customer.fullName}`);
      } else {
        console.log(`   📞 ${customer.fullName} already has phone: ${customer.phone}`);
      }
    }
    
    // Fix delivery areas in driver assignments
    console.log('\n🗺️ Fixing delivery areas in driver assignments...');
    
    const assignments = await DriverAssignment.find({
      'subscriptionInfo.subscriptionId': { $exists: true }
    }).populate({
      path: 'orderId',
      populate: { path: 'customer', select: 'city fullName' }
    });
    
    for (const assignment of assignments) {
      if (assignment.orderId && assignment.orderId.customer) {
        const customerCity = assignment.orderId.customer.city;
        const currentArea = assignment.deliveryLocation.area;
        
        console.log(`\n   📋 Assignment ${assignment._id.toString().slice(-8)}:`);
        console.log(`      Customer: ${assignment.orderId.customer.fullName}`);
        console.log(`      Customer City: ${customerCity}`);
        console.log(`      Current Area: ${currentArea}`);
        
        if (customerCity && currentArea !== customerCity) {
          // Update the delivery area to match customer city
          await DriverAssignment.findByIdAndUpdate(assignment._id, {
            'deliveryLocation.area': customerCity
          });
          
          console.log(`      ✅ Updated area from "${currentArea}" to "${customerCity}"`);
        } else if (customerCity === currentArea) {
          console.log(`      ✓ Area already correct`);
        } else {
          console.log(`      ⚠️ Customer city not set, keeping "${currentArea}"`);
        }
      }
    }
    
    await mongoose.connection.close();
    console.log('\n✅ Customer data fix complete!');
    
  } catch (error) {
    console.error('❌ Fix failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  fixCustomerData();
}

module.exports = fixCustomerData;