require('dotenv').config();
const mongoose = require('mongoose');
const subscriptionDeliverySchedulerService = require('../services/subscriptionDeliverySchedulerService');

/**
 * Script to create upcoming delivery records for active subscriptions
 * This will populate the admin dashboard with next deliveries showing assigned drivers
 */

async function createUpcomingDeliveries() {
  try {
    console.log('🚀 Creating upcoming delivery records...');
    
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');
    
    // Create deliveries for the next 7 days
    const result = await subscriptionDeliverySchedulerService.createUpcomingDeliveries(7);
    
    if (result.success) {
      console.log('\n✅ Successfully created upcoming deliveries!');
      console.log(`📦 Deliveries created: ${result.deliveriesCreated}`);
      console.log(`🚚 Drivers assigned: ${result.driversAssigned}`);
      
      // Now test the unified subscription service to see if drivers show as assigned
      console.log('\n🧪 Testing unified subscription service...');
      const unifiedSubscriptionService = require('../services/unifiedSubscriptionService');
      
      const overviewResult = await unifiedSubscriptionService.getNextDeliveryOverview();
      
      if (overviewResult.success) {
        console.log('\n📊 Admin Dashboard Preview:');
        console.log(`   Total deliveries: ${overviewResult.data.summary.total}`);
        console.log(`   Unassigned chefs: ${overviewResult.data.summary.unassignedChef}`);
        console.log(`   Unassigned drivers: ${overviewResult.data.summary.unassignedDriver}`);
        
        if (overviewResult.data.deliveries.length > 0) {
          console.log('\n📝 Sample deliveries:');
          overviewResult.data.deliveries.slice(0, 3).forEach((delivery, index) => {
            console.log(`   ${index + 1}. Customer: ${delivery.userId?.fullName}`);
            console.log(`      Chef: ${delivery.chefAssignment ? delivery.chefAssignment.chefId?.fullName : 'UNASSIGNED'}`);
            console.log(`      Driver: ${delivery.nextDelivery?.driverAssignment?.driverId ? 'ASSIGNED' : 'UNASSIGNED'}`);
            console.log(`      Risk Level: ${delivery.riskLevel}`);
            console.log('');
          });
        }
        
      } else {
        console.log('❌ Error testing unified service:', overviewResult.message);
      }
      
    } else {
      console.log('❌ Failed to create upcoming deliveries:', result.message);
    }
    
    await mongoose.connection.close();
    console.log('✅ Process completed');
    
  } catch (error) {
    console.error('❌ Script failed:', error);
    process.exit(1);
  }
}

// Run the script if called directly
if (require.main === module) {
  createUpcomingDeliveries();
}

module.exports = createUpcomingDeliveries;