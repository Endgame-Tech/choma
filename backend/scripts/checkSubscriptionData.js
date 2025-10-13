const mongoose = require("mongoose");
require("dotenv").config();

const Subscription = require("../models/Subscription");
const MealPlan = require("../models/MealPlan");
const MealAssignment = require("../models/MealAssignment");

async function checkSubscriptionData() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✅ Connected to database");

    // Find the subscription from logs
    const subscriptionId = "68ec1ca816769342f05e24ad";

    const subscription = await Subscription.findById(subscriptionId)
      .populate("mealPlanId")
      .lean();

    if (!subscription) {
      console.log("❌ Subscription not found");
      return;
    }

    console.log("\n📋 Subscription Data:");
    console.log("  ID:", subscription._id);
    console.log("  Status:", subscription.status);
    console.log("  Start Date:", subscription.startDate);
    console.log(
      "  Actual Start Date:",
      subscription.actualStartDate || "NOT SET"
    );
    console.log(
      "  First Delivery Completed:",
      subscription.firstDeliveryCompleted
    );
    console.log("  Payment Status:", subscription.paymentStatus);

    console.log("\n🍽️ Meal Plan Data:");
    if (subscription.mealPlanId) {
      console.log("  ID:", subscription.mealPlanId._id);
      console.log("  Name:", subscription.mealPlanId.planName);
      console.log(
        "  Duration:",
        subscription.mealPlanId.duration || "NOT SET ❌"
      );
      console.log("  Total Price:", subscription.mealPlanId.totalPrice);
    } else {
      console.log("  ❌ No meal plan attached");
    }

    // Check for meal assignments
    const assignments = await MealAssignment.find({
      subscriptionId: subscription._id,
    })
      .select("dayNumber deliveryDate status")
      .sort({ dayNumber: 1 })
      .lean();

    console.log(`\n📅 Meal Assignments: ${assignments.length} found`);
    if (assignments.length > 0) {
      console.log("  First 5 assignments:");
      assignments.slice(0, 5).forEach((a) => {
        console.log(
          `    - Day ${a.dayNumber}: ${
            a.deliveryDate?.toISOString().split("T")[0] || "NO DATE"
          } (${a.status})`
        );
      });
    } else {
      console.log("  ❌ NO MEAL ASSIGNMENTS CREATED - This is the problem!");
      console.log(
        "  🔧 Meal assignments should be created when subscription is created/activated"
      );
    }

    // Calculate expected day number
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const effectiveStartDate = subscription.actualStartDate
      ? new Date(subscription.actualStartDate)
      : new Date(subscription.startDate);
    effectiveStartDate.setHours(0, 0, 0, 0);

    const daysSinceStart = Math.floor(
      (today - effectiveStartDate) / (24 * 60 * 60 * 1000)
    );
    const currentDayNumber = daysSinceStart + 1;

    console.log("\n📊 Day Calculation:");
    console.log(
      "  Effective Start:",
      effectiveStartDate.toISOString().split("T")[0]
    );
    console.log("  Today:", today.toISOString().split("T")[0]);
    console.log("  Days Since Start:", daysSinceStart);
    console.log("  Current Day Number:", currentDayNumber);
    console.log(
      "  Assignment for Day",
      currentDayNumber + ":",
      assignments.find((a) => a.dayNumber === currentDayNumber)
        ? "EXISTS ✅"
        : "MISSING ❌"
    );
  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    await mongoose.connection.close();
    console.log("\n👋 Database connection closed");
  }
}

checkSubscriptionData();
