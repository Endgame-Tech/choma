require("dotenv").config();
const mongoose = require("mongoose");
const Order = require("./models/Order");
const OrderDelegation = require("./models/OrderDelegation");
const Chef = require("./models/Chef");
const Subscription = require("./models/Subscription");
const SubscriptionChefAssignment = require("./models/SubscriptionChefAssignment");

mongoose.connect(process.env.MONGODB_URI);

mongoose.connection.once("open", async () => {
  try {
    const orderId = "69015101d76f5275ce92cfd7";
    const chefId = "68c0c952d31fbb0fb313f0a8";

    console.log("🔍 Checking order:", orderId);
    const order = await Order.findById(orderId).populate("subscription");
    if (!order) {
      console.log("❌ Order not found");
    } else {
      console.log("✅ Order found:", {
        id: order._id,
        status: order.orderStatus,
        delegationStatus: order.delegationStatus,
        assignedChef: order.assignedChef,
        totalAmount: order.totalAmount,
        hasSubscription: !!order.subscription,
        subscriptionId: order.subscription?._id,
      });
    }

    console.log("🔍 Checking chef:", chefId);
    const chef = await Chef.findById(chefId);
    if (!chef) {
      console.log("❌ Chef not found");
    } else {
      console.log("✅ Chef found:", {
        id: chef._id,
        name: chef.fullName,
        status: chef.status,
        currentCapacity: chef.currentCapacity,
      });
    }

    console.log("🔍 Checking existing delegation for order:", orderId);
    const existingDelegation = await OrderDelegation.findOne({
      order: orderId,
    });
    if (existingDelegation) {
      console.log("⚠️ Order already has delegation:", {
        delegationId: existingDelegation.delegationId,
        chef: existingDelegation.chef,
        status: existingDelegation.status,
      });
    } else {
      console.log("✅ No existing delegation found");
    }

    // Check for subscription chef assignment
    if (order && order.subscription) {
      console.log("🔍 Checking for SubscriptionChefAssignment...");
      const chefAssignment = await SubscriptionChefAssignment.findOne({
        subscriptionId: order.subscription._id,
        chefId: order.assignedChef,
      });

      if (chefAssignment) {
        console.log("✅ SubscriptionChefAssignment found:", {
          id: chefAssignment._id,
          assignmentStatus: chefAssignment.assignmentStatus,
          assignedAt: chefAssignment.assignedAt,
        });
      } else {
        console.log(
          "❌ No SubscriptionChefAssignment found - THIS IS THE MISSING LINK!"
        );
        console.log(
          "This explains why the chef dashboard shows no subscriptions."
        );
      }
    }

    process.exit(0);
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
});
