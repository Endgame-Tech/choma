require('dotenv').config();
const mongoose = require('mongoose');
const SubscriptionChefAssignment = require('../models/SubscriptionChefAssignment');
const DriverAssignment = require('../models/DriverAssignment');

/**
 * Verify package labeling functionality
 */
async function verifyPackageLabeling() {
  try {
    console.log('🔍 Verifying package labeling functionality...\n');
    
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');
    
    // Find chef assignments with package labels
    const chefAssignmentsWithLabels = await SubscriptionChefAssignment.find({
      packageLabelId: { $exists: true, $ne: null }
    }).populate('driverAssignmentId');
    
    console.log(`\n📦 Found ${chefAssignmentsWithLabels.length} chef assignments with package labels:`);
    
    for (const assignment of chefAssignmentsWithLabels) {
      console.log(`\n  Chef Assignment: ${assignment._id}`);
      console.log(`  Package Label: ${assignment.packageLabelId}`);
      console.log(`  Driver Assignment: ${assignment.driverAssignmentId?._id || 'Not found'}`);
      console.log(`  Customer: ${assignment.customerId}`);
      console.log(`  Status: ${assignment.assignmentStatus}`);
      
      // Verify the link is correct
      if (assignment.driverAssignmentId) {
        const expectedLabel = assignment.driverAssignmentId._id.toString().slice(-8);
        const actualLabel = assignment.packageLabelId;
        
        if (expectedLabel === actualLabel) {
          console.log(`  ✅ Package label matches driver assignment ID`);
        } else {
          console.log(`  ❌ Package label mismatch: expected ${expectedLabel}, got ${actualLabel}`);
        }
      }
    }
    
    // Find recent driver assignments
    const recentDriverAssignments = await DriverAssignment.find({
      'subscriptionInfo.subscriptionId': { $exists: true },
      createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
    }).sort({ createdAt: -1 });
    
    console.log(`\n🚚 Found ${recentDriverAssignments.length} recent driver assignments:`);
    
    for (const driverAssignment of recentDriverAssignments) {
      const shortId = driverAssignment._id.toString().slice(-8);
      console.log(`\n  Driver Assignment: ${driverAssignment._id}`);
      console.log(`  Short ID (for labeling): ${shortId}`);
      console.log(`  Subscription: ${driverAssignment.subscriptionInfo.subscriptionId}`);
      console.log(`  Status: ${driverAssignment.status}`);
      console.log(`  Created: ${driverAssignment.createdAt}`);
      
      // Check if there's a corresponding chef assignment
      const correspondingChefAssignment = await SubscriptionChefAssignment.findOne({
        packageLabelId: shortId
      });
      
      if (correspondingChefAssignment) {
        console.log(`  ✅ Linked to chef assignment: ${correspondingChefAssignment._id}`);
      } else {
        console.log(`  ⚠️ No chef assignment found with this package label`);
      }
    }
    
    await mongoose.connection.close();
    console.log('\n✅ Package labeling verification complete!');
    
  } catch (error) {
    console.error('❌ Verification failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  verifyPackageLabeling();
}

module.exports = verifyPackageLabeling;