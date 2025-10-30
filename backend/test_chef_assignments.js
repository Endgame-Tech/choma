require("dotenv").config();
const mongoose = require("mongoose");
const SubscriptionChefAssignment = require("./models/SubscriptionChefAssignment");
const Subscription = require("./models/Subscription");
const Customer = require("./models/Customer");
const MealPlan = require("./models/MealPlan");

mongoose.connect(process.env.MONGODB_URI);

mongoose.connection.once("open", async () => {
  try {
    const chefId = "68c0c952d31fbb0fb313f0a8";

    console.log("🔍 Checking chef assignments...");
    const assignments = await SubscriptionChefAssignment.find({
      chefId,
      assignmentStatus: "active",
      endDate: { $gte: new Date() },
    })
      .populate(
        "subscriptionId",
        "status frequency nextDeliveryDate dietaryPreferences allergens"
      )
      .populate("customerId", "fullName phone email")
      .populate("mealPlanId", "planName durationWeeks planDescription")
      .lean();

    console.log("✅ Found", assignments.length, "active assignments");
    assignments.forEach((assignment) => {
      console.log("- Assignment:", assignment._id);
      console.log("  Subscription:", assignment.subscriptionId?._id);
      console.log("  Customer:", assignment.customerId?.fullName);
      console.log("  Meal Plan:", assignment.mealPlanId?.planName);
      console.log("");
    });

    if (assignments.length > 0) {
      console.log(
        "🎉 SUCCESS! Chef should now see subscriptions in their dashboard!"
      );
    } else {
      console.log("❌ No assignments found - something went wrong");
    }

    process.exit(0);
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
});
