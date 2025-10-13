const mongoose = require("mongoose");
require("dotenv").config();

// Import models
const Subscription = require("../models/Subscription");
const Order = require("../models/Order");

async function fixFirstDelivery() {
  try {
    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✅ Connected to database");

    // Find all subscriptions with firstDeliveryCompleted = false (regardless of status)
    const subscriptions = await Subscription.find({
      firstDeliveryCompleted: { $ne: true }, // Not true (includes false, null, undefined)
    });

    console.log(`📋 Found ${subscriptions.length} subscriptions to check`);

    // Show what statuses we found
    const statuses = subscriptions.map((s) => s.status);
    console.log(
      `📊 Subscription statuses found: ${[...new Set(statuses)].join(", ")}`
    );

    for (const subscription of subscriptions) {
      // Check if this subscription has any delivered orders
      const deliveredOrder = await Order.findOne({
        subscription: subscription._id,
        orderStatus: "Delivered",
      }).sort({ actualDelivery: -1 });

      if (deliveredOrder) {
        console.log(
          `\n🔧 Fixing subscription ${subscription._id} (${subscription.planName})`
        );
        console.log(`   - Found delivered order: ${deliveredOrder._id}`);
        console.log(
          `   - Delivered at: ${deliveredOrder.actualDelivery || "unknown"}`
        );

        // Update subscription to mark first delivery as completed
        subscription.firstDeliveryCompleted = true;
        subscription.firstDeliveryCompletedAt =
          deliveredOrder.actualDelivery || new Date();
        subscription.firstDeliveryOrderId = deliveredOrder._id;
        subscription.actualStartDate =
          deliveredOrder.actualDelivery || new Date();
        subscription.status = "active";

        await subscription.save();

        console.log(`   ✅ Subscription updated to active`);
        console.log(`   ✅ First delivery marked as completed`);
        console.log(`   ✅ User can now access TodayMeal screen`);
      } else {
        console.log(
          `\n⏭️  Skipping subscription ${subscription._id} - no delivered orders yet`
        );
      }
    }

    console.log("\n✅ All subscriptions checked and fixed!");
  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    await mongoose.connection.close();
    console.log("\n👋 Database connection closed");
  }
}

// Run the script
fixFirstDelivery();
