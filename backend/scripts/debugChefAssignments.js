require('dotenv').config();
const mongoose = require('mongoose');
const SubscriptionChefAssignment = require('../models/SubscriptionChefAssignment');

/**
 * Debug script to check chef assignments and their package labels
 */
async function debugChefAssignments() {
  try {
    console.log('🔍 Debugging chef assignments...\n');
    
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');
    
    // Find all chef assignments
    const assignments = await SubscriptionChefAssignment.find({
      assignmentStatus: 'active'
    }).sort({ updatedAt: -1 });
    
    console.log(`\n📋 Found ${assignments.length} active chef assignments:\n`);
    
    for (const assignment of assignments) {
      console.log(`Chef Assignment: ${assignment._id}`);
      console.log(`  Subscription: ${assignment.subscriptionId}`);
      console.log(`  Chef: ${assignment.chefId}`);
      console.log(`  Customer: ${assignment.customerId}`);
      console.log(`  Status: ${assignment.assignmentStatus}`);
      console.log(`  Driver Assignment ID: ${assignment.driverAssignmentId || 'NOT SET'}`);
      console.log(`  Package Label ID: ${assignment.packageLabelId || 'NOT SET'}`);
      console.log(`  Created: ${assignment.createdAt}`);
      console.log(`  Updated: ${assignment.updatedAt}`);
      console.log('---');
    }
    
    // Check for any assignments that DO have package labels
    const assignmentsWithLabels = await SubscriptionChefAssignment.find({
      packageLabelId: { $exists: true, $ne: null }
    });
    
    console.log(`\n📦 Assignments WITH package labels: ${assignmentsWithLabels.length}`);
    
    for (const assignment of assignmentsWithLabels) {
      console.log(`✅ ${assignment._id}: Label ${assignment.packageLabelId} -> Driver ${assignment.driverAssignmentId}`);
    }
    
    if (assignmentsWithLabels.length === 0) {
      console.log('❌ No chef assignments have package labels set!');
      console.log('💡 This means the linking function may not have been called or there was an error.');
    }
    
    await mongoose.connection.close();
    console.log('\n✅ Debug complete!');
    
  } catch (error) {
    console.error('❌ Debug failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  debugChefAssignments();
}

module.exports = debugChefAssignments;