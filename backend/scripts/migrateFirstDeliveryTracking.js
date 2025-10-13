/**
 * Migration Script: Add First Delivery Tracking to Existing Subscriptions
 *
 * This script updates all existing subscriptions to have the firstDeliveryCompleted field.
 * - Active subscriptions with status "Active" will be marked as firstDeliveryCompleted: false
 * - This puts them in "awaiting first delivery" state
 *
 * Run this script once after deploying the first delivery tracking feature.
 *
 * Usage: node scripts/migrateFirstDeliveryTracking.js
 */

require("dotenv").config();
const mongoose = require("mongoose");
const Subscription = require("../models/Subscription");

const migrateFirstDeliveryTracking = async () => {
  try {
    console.log("🔌 Connecting to MongoDB...");
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✅ Connected to MongoDB\n");

    console.log("📊 Analyzing existing subscriptions...");

    // Find all subscriptions without firstDeliveryCompleted field
    const subscriptionsToUpdate = await Subscription.find({
      firstDeliveryCompleted: { $exists: false },
    });

    console.log(
      `Found ${subscriptionsToUpdate.length} subscriptions without firstDeliveryCompleted field\n`
    );

    if (subscriptionsToUpdate.length === 0) {
      console.log("✅ No subscriptions need updating. Migration complete!");
      return;
    }

    // Categorize subscriptions
    const activeSubscriptions = [];
    const inactiveSubscriptions = [];

    for (const sub of subscriptionsToUpdate) {
      const status = sub.status?.toLowerCase();
      if (status === "active" && sub.paymentStatus === "Paid") {
        activeSubscriptions.push(sub);
      } else {
        inactiveSubscriptions.push(sub);
      }
    }

    console.log("📋 Subscription breakdown:");
    console.log(`  - Active paid subscriptions: ${activeSubscriptions.length}`);
    console.log(`  - Other subscriptions: ${inactiveSubscriptions.length}\n`);

    // Ask for confirmation
    console.log("⚠️  This will update all subscriptions as follows:");
    console.log(
      "  - Active paid subscriptions → firstDeliveryCompleted: false (awaiting first delivery)"
    );
    console.log("  - Other subscriptions → firstDeliveryCompleted: false");
    console.log(
      '\n⚠️  After this migration, users with active subscriptions will see the "Awaiting First Delivery" screen'
    );
    console.log(
      "⚠️  Admins will need to manually mark deliveries as complete in the system\n"
    );

    // Update all subscriptions
    console.log("🔄 Starting migration...\n");

    let updateCount = 0;
    const errors = [];

    for (const sub of subscriptionsToUpdate) {
      try {
        // Set firstDeliveryCompleted to false
        sub.firstDeliveryCompleted = false;

        // Normalize status to lowercase to match enum values
        if (sub.status) {
          const normalizedStatus = sub.status.toLowerCase();
          // Map old capitalized status values to new lowercase enum values
          if (normalizedStatus === "active") {
            sub.status = "active";
          } else if (normalizedStatus === "pending") {
            sub.status = "pending_first_delivery";
          } else if (normalizedStatus === "paused") {
            sub.status = "paused";
          } else if (normalizedStatus === "cancelled") {
            sub.status = "cancelled";
          } else if (normalizedStatus === "expired") {
            sub.status = "expired";
          }
        }

        await sub.save();
        updateCount++;

        if (updateCount % 10 === 0) {
          console.log(
            `  Updated ${updateCount}/${subscriptionsToUpdate.length} subscriptions...`
          );
        }
      } catch (error) {
        errors.push({
          subscriptionId: sub._id,
          error: error.message,
        });
        console.error(
          `  ❌ Error updating subscription ${sub._id}:`,
          error.message
        );
      }
    }

    console.log("\n✅ Migration complete!");
    console.log(`  - Successfully updated: ${updateCount} subscriptions`);
    if (errors.length > 0) {
      console.log(`  - Failed updates: ${errors.length} subscriptions`);
      console.log("\n❌ Errors:");
      errors.forEach((err) => {
        console.log(`    Subscription ${err.subscriptionId}: ${err.error}`);
      });
    }

    console.log("\n📝 Next steps:");
    console.log("  1. Review the subscriptions in the admin panel");
    console.log(
      '  2. When drivers mark deliveries as "Delivered", firstDeliveryCompleted will be set to true'
    );
    console.log(
      '  3. Users will then see the "Today\'s Meal" screen instead of "Awaiting First Delivery"'
    );
  } catch (error) {
    console.error("❌ Migration failed:", error);
    throw error;
  } finally {
    await mongoose.connection.close();
    console.log("\n🔌 Disconnected from MongoDB");
  }
};

// Run migration
if (require.main === module) {
  migrateFirstDeliveryTracking()
    .then(() => {
      console.log("\n✅ Migration script completed successfully");
      process.exit(0);
    })
    .catch((error) => {
      console.error("\n❌ Migration script failed:", error);
      process.exit(1);
    });
}

module.exports = migrateFirstDeliveryTracking;
