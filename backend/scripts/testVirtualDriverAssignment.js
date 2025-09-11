require('dotenv').config();
const mongoose = require('mongoose');
const unifiedSubscriptionService = require('../services/unifiedSubscriptionService');

/**
 * Test script for virtual driver assignment
 */

async function testVirtualDriverAssignment() {
  try {
    console.log('🧪 Testing virtual driver assignment...');
    
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');
    
    // Test the unified subscription service to see if virtual drivers are assigned
    console.log('\n📊 Testing unified subscription service with virtual assignments...');
    const overviewResult = await unifiedSubscriptionService.getNextDeliveryOverview();
    
    if (overviewResult.success) {
      console.log('\n📊 Admin Dashboard Preview:');
      console.log(`   Total deliveries: ${overviewResult.data.summary.total}`);
      console.log(`   Unassigned chefs: ${overviewResult.data.summary.unassignedChef}`);
      console.log(`   Unassigned drivers: ${overviewResult.data.summary.unassignedDriver}`);
      
      if (overviewResult.data.deliveries.length > 0) {
        console.log('\n📝 Sample deliveries:');
        overviewResult.data.deliveries.slice(0, 3).forEach((delivery, index) => {
          const driverInfo = delivery.nextDelivery?.driverAssignment?.driverId;
          const driverName = driverInfo?.fullName || (driverInfo ? 'ASSIGNED' : 'UNASSIGNED');
          
          console.log(`   ${index + 1}. Customer: ${delivery.userId?.fullName || 'Unknown'}`);
          console.log(`      Chef: ${delivery.chefAssignment ? delivery.chefAssignment.chefId?.fullName || 'ASSIGNED' : 'UNASSIGNED'}`);
          console.log(`      Driver: ${driverName}`);
          if (delivery.nextDelivery?.isVirtual) {
            console.log(`      Virtual Assignment: YES (Code: ${delivery.nextDelivery.driverAssignment?.confirmationCode})`);
          }
          console.log(`      Risk Level: ${delivery.riskLevel}`);
          console.log('');
        });
        
        // Show driver assignment summary
        const totalWithDrivers = overviewResult.data.deliveries.filter(d => 
          d.nextDelivery?.driverAssignment?.driverId
        ).length;
        
        console.log(`\n📈 Summary:`);
        console.log(`   Deliveries with drivers assigned: ${totalWithDrivers}/${overviewResult.data.deliveries.length}`);
        console.log(`   Assignment rate: ${Math.round((totalWithDrivers / overviewResult.data.deliveries.length) * 100)}%`);
        
      } else {
        console.log('ℹ️ No deliveries found');
      }
      
    } else {
      console.log('❌ Error testing unified service:', overviewResult.message);
    }
    
    await mongoose.connection.close();
    console.log('\n✅ Test completed');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

// Run the test if called directly
if (require.main === module) {
  testVirtualDriverAssignment();
}

module.exports = testVirtualDriverAssignment;