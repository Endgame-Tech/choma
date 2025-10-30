require("dotenv").config();
const mongoose = require("mongoose");
const Order = require("./models/Order");
const SubscriptionChefAssignment = require("./models/SubscriptionChefAssignment");
const Subscription = require("./models/Subscription");
const Chef = require("./models/Chef");

mongoose.connect(process.env.MONGODB_URI);

mongoose.connection.once("open", async () => {
  try {
    const orderId = "69015101d76f5275ce92cfd7";
    const chefId = "68c0c952d31fbb0fb313f0a8";

    console.log("🔧 Creating missing SubscriptionChefAssignment...");

    // Get the order with subscription
    const order = await Order.findById(orderId).populate("subscription");
    const subscription = order.subscription;

    if (!subscription) {
      console.log("❌ No subscription found for order");
      process.exit(1);
    }

    console.log("📋 Subscription details:", {
      id: subscription._id,
      status: subscription.status,
      startDate: subscription.startDate,
      endDate: subscription.endDate,
    });

    // Check if assignment already exists
    const existingAssignment = await SubscriptionChefAssignment.findOne({
      subscriptionId: subscription._id,
      chefId: chefId,
    });

    if (existingAssignment) {
      console.log("⚠️ Assignment already exists:", existingAssignment._id);
      process.exit(0);
    }

    // Create the chef assignment
    const chefAssignment = new SubscriptionChefAssignment({
      subscriptionId: subscription._id,
      chefId: chefId,
      customerId: subscription.userId,
      mealPlanId: subscription.mealPlanId,
      assignmentStatus: "active",
      assignedAt: new Date(),
      acceptedAt: new Date(),
      startDate: new Date(),
      endDate:
        subscription.endDate ||
        new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year if no end date
      assignmentDetails: {
        assignedBy: chefId, // Using chef ID as fallback for required admin field
        assignmentReason: "admin_decision",
        priority: "normal",
        adminNotes:
          "Retroactively created - chef was assigned to order but subscription assignment was missing",
      },
    });

    await chefAssignment.save();

    console.log("✅ SubscriptionChefAssignment created successfully!");
    console.log("Assignment ID:", chefAssignment._id);
    console.log("🎉 Chef should now see the subscription in their dashboard");

    process.exit(0);
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
});
