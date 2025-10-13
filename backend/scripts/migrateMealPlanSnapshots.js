/**
 * Migration Script: Add Meal Plan Snapshots to Existing Subscriptions
 *
 * This script adds meal plan snapshots to existing subscriptions that don't have them.
 * It compiles complete snapshots of meal plan data to ensure data consistency.
 *
 * Usage:
 *   node scripts/migrateMealPlanSnapshots.js
 *
 * Options:
 *   --dry-run : Preview changes without saving to database
 *   --limit=N : Process only N subscriptions (for testing)
 *   --status=active : Process only subscriptions with specific status
 */

const mongoose = require("mongoose");
const Subscription = require("../models/Subscription");
const { compileMealPlanSnapshot } = require("../services/mealPlanSnapshotService");
require("dotenv").config();

// Parse command line arguments
const args = process.argv.slice(2);
const isDryRun = args.includes("--dry-run");
const limitArg = args.find(arg => arg.startsWith("--limit="));
const limit = limitArg ? parseInt(limitArg.split("=")[1]) : null;
const statusArg = args.find(arg => arg.startsWith("--status="));
const statusFilter = statusArg ? statusArg.split("=")[1] : null;

console.log("\n===========================================");
console.log("📸 Meal Plan Snapshot Migration Script");
console.log("===========================================\n");

if (isDryRun) {
  console.log("🔍 DRY RUN MODE: No changes will be saved to database\n");
}

if (limit) {
  console.log(`📊 Processing limit: ${limit} subscriptions\n`);
}

if (statusFilter) {
  console.log(`🎯 Status filter: ${statusFilter}\n`);
}

async function migrateSubscriptionSnapshots() {
  try {
    // Connect to MongoDB
    console.log("🔌 Connecting to MongoDB...");
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log("✅ Connected to MongoDB\n");

    // Build query filter
    const filter = {
      // Find subscriptions without snapshots or with incomplete snapshots
      $or: [
        { mealPlanSnapshot: { $exists: false } },
        { "mealPlanSnapshot.stats": { $exists: false } },
        { "mealPlanSnapshot.mealSchedule": { $size: 0 } },
      ],
    };

    // Add status filter if specified
    if (statusFilter) {
      filter.status = statusFilter;
    }

    // Count total subscriptions needing migration
    const totalCount = await Subscription.countDocuments(filter);
    console.log(`📊 Found ${totalCount} subscriptions needing snapshot migration\n`);

    if (totalCount === 0) {
      console.log("✅ No subscriptions need migration. All done!\n");
      await mongoose.connection.close();
      return;
    }

    // Fetch subscriptions
    const query = Subscription.find(filter)
      .populate("mealPlanId")
      .sort({ createdAt: -1 });

    if (limit) {
      query.limit(limit);
    }

    const subscriptions = await query.exec();
    console.log(`🔄 Processing ${subscriptions.length} subscriptions...\n`);

    // Migration statistics
    const stats = {
      total: subscriptions.length,
      successful: 0,
      failed: 0,
      skipped: 0,
      errors: [],
    };

    // Process each subscription
    for (let i = 0; i < subscriptions.length; i++) {
      const subscription = subscriptions[i];
      const progress = `[${i + 1}/${subscriptions.length}]`;

      try {
        console.log(`${progress} Processing subscription: ${subscription.subscriptionId || subscription._id}`);
        console.log(`          Status: ${subscription.status}`);
        console.log(`          Plan: ${subscription.mealPlanId?.planName || "Unknown"}`);
        console.log(`          User: ${subscription.userId}`);

        // Validate required data
        if (!subscription.mealPlanId) {
          console.log(`⚠️  Skipping: Meal plan not found or deleted`);
          stats.skipped++;
          continue;
        }

        if (!subscription.selectedMealTypes || subscription.selectedMealTypes.length === 0) {
          console.log(`⚠️  Skipping: No meal types selected`);
          stats.skipped++;
          continue;
        }

        // Compile the snapshot
        console.log(`          Compiling snapshot...`);
        const snapshot = await compileMealPlanSnapshot(
          subscription.mealPlanId._id,
          subscription.userId,
          subscription.startDate,
          subscription.endDate,
          subscription.selectedMealTypes,
          subscription.pricing?.discountApplied || null,
          {
            basePlanPrice: subscription.basePlanPrice,
            frequencyMultiplier: subscription.frequencyMultiplier || 1,
            durationMultiplier: subscription.durationMultiplier || 1,
          }
        );

        console.log(`          ✅ Snapshot compiled:`);
        console.log(`             - Total Meals: ${snapshot.stats.totalMeals}`);
        console.log(`             - Meal Slots: ${snapshot.stats.totalMealSlots}`);
        console.log(`             - Total Price: ₦${snapshot.pricing.totalPrice.toLocaleString()}`);

        // Save snapshot
        if (!isDryRun) {
          subscription.mealPlanSnapshot = snapshot;
          await subscription.save();
          console.log(`          💾 Saved to database`);
        } else {
          console.log(`          🔍 DRY RUN: Would save snapshot to database`);
        }

        stats.successful++;
        console.log("");

      } catch (error) {
        console.error(`${progress} ❌ ERROR processing subscription ${subscription.subscriptionId || subscription._id}:`);
        console.error(`          ${error.message}`);
        stats.failed++;
        stats.errors.push({
          subscriptionId: subscription.subscriptionId || subscription._id,
          error: error.message,
        });
        console.log("");
      }
    }

    // Print summary
    console.log("\n===========================================");
    console.log("📊 Migration Summary");
    console.log("===========================================");
    console.log(`Total processed:    ${stats.total}`);
    console.log(`✅ Successful:       ${stats.successful}`);
    console.log(`⚠️  Skipped:          ${stats.skipped}`);
    console.log(`❌ Failed:           ${stats.failed}`);
    console.log("===========================================\n");

    if (stats.errors.length > 0) {
      console.log("❌ Errors:");
      stats.errors.forEach(({ subscriptionId, error }) => {
        console.log(`   - ${subscriptionId}: ${error}`);
      });
      console.log("");
    }

    if (isDryRun) {
      console.log("🔍 DRY RUN COMPLETE: No changes were saved to database");
      console.log("   Run without --dry-run to apply changes\n");
    } else {
      console.log("✅ Migration complete!\n");
    }

  } catch (error) {
    console.error("\n❌ Migration failed:", error);
    throw error;
  } finally {
    // Close database connection
    console.log("🔌 Closing MongoDB connection...");
    await mongoose.connection.close();
    console.log("✅ Connection closed\n");
  }
}

// Run migration
migrateSubscriptionSnapshots()
  .then(() => {
    console.log("✅ Script completed successfully");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Script failed:", error);
    process.exit(1);
  });
