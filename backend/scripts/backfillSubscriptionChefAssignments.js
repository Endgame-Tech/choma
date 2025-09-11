require('dotenv').config();
const mongoose = require('mongoose');
const Order = require('../models/Order');
const Subscription = require('../models/Subscription');
const SubscriptionChefAssignment = require('../models/SubscriptionChefAssignment');
const Chef = require('../models/Chef');

/**
 * Script to backfill subscription chef assignments for existing subscriptions
 * that have delivered orders but no chef assignments
 */

async function backfillSubscriptionChefAssignments() {
  try {
    console.log('🔄 Starting backfill of subscription chef assignments...');
    
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');
    
    // Find all active subscriptions
    const activeSubscriptions = await Subscription.find({
      status: 'Active',
      paymentStatus: 'Paid'
    }).lean();
    
    console.log(`📊 Found ${activeSubscriptions.length} active subscriptions`);
    
    let assignmentsCreated = 0;
    let assignmentsSkipped = 0;
    
    for (const subscription of activeSubscriptions) {
      try {
        // Check if this subscription already has a chef assignment
        const existingAssignment = await SubscriptionChefAssignment.findOne({
          subscriptionId: subscription._id,
          assignmentStatus: 'active'
        });
        
        if (existingAssignment) {
          assignmentsSkipped++;
          continue;
        }
        
        // Find the most recent delivered order for this subscription
        const lastDeliveredOrder = await Order.findOne({
          subscription: subscription._id,
          delegationStatus: { $in: ['Completed', 'In Progress', 'Accepted'] },
          assignedChef: { $exists: true }
        })
        .populate('assignedChef')
        .sort({ chefAcceptedDate: -1 });
        
        if (!lastDeliveredOrder || !lastDeliveredOrder.assignedChef) {
          console.log(`⚠️ No delivered orders with assigned chef found for subscription ${subscription._id}`);
          continue;
        }
        
        const chefId = lastDeliveredOrder.assignedChef._id;
        
        console.log(`🍳 Creating assignment for subscription ${subscription._id} with chef ${chefId}`);
        
        // Get a system admin ID (we'll use the chef ID as a fallback)
        const systemAdminId = chefId; // Using chef ID as fallback for required admin field
        
        // Create chef assignment for this subscription
        const chefAssignment = new SubscriptionChefAssignment({
          subscriptionId: subscription._id,
          chefId: chefId,
          customerId: subscription.userId,
          mealPlanId: subscription.mealPlanId,
          assignmentStatus: 'active',
          assignedAt: lastDeliveredOrder.chefAcceptedDate || new Date(),
          acceptedAt: lastDeliveredOrder.chefAcceptedDate || new Date(),
          startDate: lastDeliveredOrder.chefAcceptedDate || new Date(),
          endDate: subscription.endDate || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
          assignmentDetails: {
            assignedBy: systemAdminId,
            assignmentReason: 'new_subscription',
            priority: 'normal',
            adminNotes: 'Backfilled from existing delivered orders'
          },
          performance: {
            totalDeliveries: 1,
            averageRating: lastDeliveredOrder.chefRating || 4.0,
            consistencyScore: 85,
            lastDeliveryDate: lastDeliveredOrder.chefCompletedDate || new Date()
          }
        });
        
        await chefAssignment.save();
        assignmentsCreated++;
        
        console.log(`✅ Created assignment ${chefAssignment._id} for subscription ${subscription._id}`);
        
      } catch (error) {
        console.error(`❌ Error processing subscription ${subscription._id}:`, error.message);
      }
    }
    
    console.log(`\n📈 Backfill Summary:`);
    console.log(`   Total subscriptions processed: ${activeSubscriptions.length}`);
    console.log(`   New assignments created: ${assignmentsCreated}`);
    console.log(`   Assignments skipped (already exist): ${assignmentsSkipped}`);
    
    await mongoose.connection.close();
    console.log('✅ Backfill completed successfully');
    
  } catch (error) {
    console.error('❌ Backfill failed:', error);
    process.exit(1);
  }
}

// Run the script if called directly
if (require.main === module) {
  backfillSubscriptionChefAssignments();
}

module.exports = backfillSubscriptionChefAssignments;