const mongoose = require("mongoose");
require("dotenv").config();

const RecurringSubscription = require("./models/RecurringSubscription");

async function checkSnapshotStructure() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✅ Connected to MongoDB");

    // First, find all subscriptions
    const allSubs = await RecurringSubscription.find({})
      .select("_id customerId status")
      .populate("customerId", "fullName")
      .lean();

    console.log(`\n=== FOUND ${allSubs.length} SUBSCRIPTIONS ===`);
    allSubs.forEach((sub) => {
      console.log(
        `ID: ${sub._id}, Customer: ${
          sub.customerId?.fullName || "N/A"
        }, Status: ${sub.status}`
      );
    });

    if (allSubs.length === 0) {
      console.log("❌ No subscriptions found");
      process.exit(1);
    }

    // Use the first subscription
    const subId = allSubs[0]._id;
    console.log(`\n=== CHECKING SUBSCRIPTION: ${subId} ===`);

    const subscription = await RecurringSubscription.findById(subId)
      .select("mealPlanSnapshot customerId")
      .populate("customerId", "fullName")
      .lean();

    if (!subscription) {
      console.log("❌ Subscription not found");
      process.exit(1);
    }

    console.log("\n=== SUBSCRIPTION INFO ===");
    console.log("Customer:", subscription.customerId?.fullName);
    console.log("Has mealPlanSnapshot:", !!subscription.mealPlanSnapshot);

    if (subscription.mealPlanSnapshot) {
      console.log("\n=== MEAL PLAN SNAPSHOT KEYS ===");
      console.log(Object.keys(subscription.mealPlanSnapshot));

      console.log("\n=== MEAL SCHEDULE INFO ===");
      console.log(
        "Has mealSchedule:",
        !!subscription.mealPlanSnapshot.mealSchedule
      );
      console.log(
        "Meal schedule length:",
        subscription.mealPlanSnapshot.mealSchedule?.length || 0
      );

      if (subscription.mealPlanSnapshot.mealSchedule?.length > 0) {
        console.log("\n=== FIRST MEAL STRUCTURE ===");
        const firstMeal = subscription.mealPlanSnapshot.mealSchedule[0];
        console.log(JSON.stringify(firstMeal, null, 2));

        console.log("\n=== TODAY'S MEALS ===");
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayStr = today.toISOString().split("T")[0];

        const todaysMeals = subscription.mealPlanSnapshot.mealSchedule.filter(
          (meal) => {
            const mealDate = new Date(meal.scheduledDate);
            mealDate.setHours(0, 0, 0, 0);
            const mealDateStr = mealDate.toISOString().split("T")[0];
            return mealDateStr === todayStr;
          }
        );

        console.log(
          `Found ${todaysMeals.length} meals for today (${todayStr})`
        );
        todaysMeals.forEach((meal, idx) => {
          console.log(`\nMeal ${idx + 1}:`, {
            mealTitle: meal.mealTitle,
            mealType: meal.mealType,
            scheduledDate: meal.scheduledDate,
            deliveryStatus: meal.deliveryStatus,
            hasIngredients: !!meal.ingredients,
            ingredientsCount: meal.ingredients?.length || 0,
          });
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

checkSnapshotStructure();
