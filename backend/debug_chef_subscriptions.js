const mongoose = require("mongoose");
require("dotenv").config();

const Subscription = require("./models/Subscription");
const SubscriptionChefAssignment = require("./models/SubscriptionChefAssignment");

async function debugChefSubscriptions() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✅ Connected to MongoDB\n");

    const chefId = "68c0c952d31fbb0fb313f0a8";

    // Step 1: Check chef assignments
    console.log("=== STEP 1: Chef Assignments ===");
    const chefAssignments = await SubscriptionChefAssignment.find({
      chefId,
      assignmentStatus: "active",
      endDate: { $gte: new Date() },
    })
      .select("subscriptionId assignedAt assignmentStatus")
      .lean();

    console.log(`Found ${chefAssignments.length} chef assignments:`);
    chefAssignments.forEach((a) => {
      console.log(
        `  - Subscription: ${a.subscriptionId}, Status: ${a.assignmentStatus}`
      );
    });

    if (chefAssignments.length === 0) {
      console.log("\n❌ No chef assignments found!");
      process.exit(0);
    }

    const subscriptionIds = chefAssignments.map((a) => a.subscriptionId);

    // Step 2: Check subscriptions with different status combinations
    console.log("\n=== STEP 2: Subscription Query Tests ===");

    // Test 1: All subscriptions
    const allSubs = await Subscription.find({
      _id: { $in: subscriptionIds },
    }).select("_id status");
    console.log(
      `\nTest 1 - All subscriptions with these IDs: ${allSubs.length}`
    );
    allSubs.forEach((s) => console.log(`  ${s._id}: ${s.status}`));

    // Test 2: Active/Pending
    const activePending = await Subscription.find({
      _id: { $in: subscriptionIds },
      status: { $in: ["active", "pending"] },
    }).select("_id status");
    console.log(`\nTest 2 - Active/Pending only: ${activePending.length}`);

    // Test 3: Include pending_first_delivery
    const withFirstDelivery = await Subscription.find({
      _id: { $in: subscriptionIds },
      status: { $in: ["active", "pending", "pending_first_delivery"] },
    }).select("_id status");
    console.log(
      `\nTest 3 - Including pending_first_delivery: ${withFirstDelivery.length}`
    );

    // Step 3: Get full subscription details
    if (withFirstDelivery.length > 0) {
      console.log("\n=== STEP 3: Full Subscription Details ===");
      const fullSub = await Subscription.findById(subscriptionIds[0])
        .populate("customerId", "fullName")
        .populate("userId", "fullName")
        .populate("mealPlanId", "planName")
        .lean();

      console.log("\nSubscription Details:");
      console.log("  ID:", fullSub._id);
      console.log("  Status:", fullSub.status);
      console.log("  Customer (customerId):", fullSub.customerId?.fullName);
      console.log("  Customer (userId):", fullSub.userId?.fullName);
      console.log("  Meal Plan:", fullSub.mealPlanId?.planName);
      console.log("  Has mealPlanSnapshot:", !!fullSub.mealPlanSnapshot);
      console.log(
        "  Meal schedule length:",
        fullSub.mealPlanSnapshot?.mealSchedule?.length || 0
      );

      if (fullSub.mealPlanSnapshot?.mealSchedule?.length > 0) {
        console.log("\n  First 3 meals in schedule:");
        fullSub.mealPlanSnapshot.mealSchedule.slice(0, 3).forEach((meal, i) => {
          console.log(`    ${i + 1}. ${meal.mealTitle || "No title"}`);
          console.log(`       Type: ${meal.mealType}`);
          console.log(`       Date: ${meal.scheduledDate}`);
          console.log(`       Status: ${meal.deliveryStatus || "No status"}`);
        });
      }
    }

    await mongoose.disconnect();
    console.log("\n✅ Disconnected from MongoDB");
    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

debugChefSubscriptions();
