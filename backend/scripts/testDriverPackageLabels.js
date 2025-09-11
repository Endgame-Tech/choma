require('dotenv').config();
const mongoose = require('mongoose');
const DriverAssignment = require('../models/DriverAssignment');
const SubscriptionChefAssignment = require('../models/SubscriptionChefAssignment');
const Driver = require('../models/Driver');

/**
 * Test driver API returns package labels
 */
async function testDriverPackageLabels() {
  try {
    console.log('🧪 Testing driver package label API...\n');
    
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');
    
    // Find a driver with assignments
    const driver = await Driver.findOne({}).select('_id fullName');
    if (!driver) {
      console.log('❌ No driver found');
      return;
    }
    
    console.log(`👤 Testing with driver: ${driver.fullName} (${driver._id})`);
    
    // Get driver assignments
    const driverAssignments = await DriverAssignment.find({
      driverId: driver._id,
      status: { $in: ['assigned', 'picked_up'] },
      'subscriptionInfo.subscriptionId': { $exists: true }
    }).limit(5);
    
    console.log(`\n📋 Found ${driverAssignments.length} driver assignments:`);
    
    for (const assignment of driverAssignments) {
      console.log(`\n  Driver Assignment: ${assignment._id}`);
      console.log(`  Status: ${assignment.status}`);
      console.log(`  Subscription: ${assignment.subscriptionInfo.subscriptionId}`);
      
      // Check for linked chef assignment with package label
      const chefAssignment = await SubscriptionChefAssignment.findOne({
        driverAssignmentId: assignment._id
      }).select('packageLabelId _id');
      
      if (chefAssignment) {
        console.log(`  ✅ Linked Chef Assignment: ${chefAssignment._id}`);
        console.log(`  📦 Package Label: ${chefAssignment.packageLabelId || 'NOT SET'}`);
      } else {
        console.log(`  ❌ No linked chef assignment found`);
      }
    }
    
    // Test the API endpoint
    console.log('\n🔍 Testing driver API endpoint...');
    
    const driverController = require('../controllers/driverController');
    const driverSubscriptionController = require('../controllers/driverSubscriptionController');
    
    // Mock request and response
    const mockReq = {
      driver: { id: driver._id }
    };
    
    let apiResponse = null;
    const mockRes = {
      json: (data) => {
        apiResponse = data;
        return data;
      },
      status: (code) => ({
        json: (data) => {
          console.log(`API Error ${code}:`, data.message);
          return data;
        }
      })
    };
    
    // Test regular assignments endpoint
    console.log('\n📡 Testing getAvailableAssignments...');
    await driverController.getAvailableAssignments(mockReq, mockRes);
    
    if (apiResponse && apiResponse.data) {
      console.log(`✅ API returned ${apiResponse.data.length} assignments`);
      
      apiResponse.data.forEach((assignment, index) => {
        console.log(`\n  Assignment ${index + 1}:`);
        console.log(`    ID: ${assignment._id}`);
        console.log(`    Package Label: ${assignment.packageLabelId || 'NOT SET'}`);
        console.log(`    Has Subscription Info: ${!!assignment.subscriptionInfo}`);
      });
    } else {
      console.log('❌ No assignments returned from API');
    }
    
    // Test pickup assignments endpoint
    console.log('\n📡 Testing getMyPickupAssignments...');
    
    const driverSubscriptionService = require('../services/driverSubscriptionService');
    const pickupResult = await driverSubscriptionService.getPickupAssignments(driver._id);
    
    if (pickupResult.success) {
      console.log(`✅ Pickup API returned ${pickupResult.data.pickupAssignments.length} assignments`);
      
      pickupResult.data.pickupAssignments.forEach((assignment, index) => {
        console.log(`\n  Pickup Assignment ${index + 1}:`);
        console.log(`    ID: ${assignment._id}`);
        console.log(`    Package Label: ${assignment.packageLabelId || 'NOT SET'}`);
        console.log(`    Customer Type: ${assignment.customerType}`);
      });
    } else {
      console.log('❌ Pickup assignments API failed:', pickupResult.message);
    }
    
    await mongoose.connection.close();
    console.log('\n✅ Driver package label test complete!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  testDriverPackageLabels();
}

module.exports = testDriverPackageLabels;