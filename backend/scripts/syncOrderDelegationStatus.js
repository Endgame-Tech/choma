/**
 * Script to sync OrderDelegation status with DriverAssignment status
 * Run this to fix orders where driver picked up but OrderDelegation wasn't updated
 */

const mongoose = require("mongoose");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });

const DriverAssignment = require("../models/DriverAssignment");
const OrderDelegation = require("../models/OrderDelegation");
const Order = require("../models/Order");

async function syncOrderDelegationStatus() {
  try {
    console.log("🔄 Connecting to database...");
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✅ Connected to database");

    // Find all driver assignments with status "picked_up"
    const pickedUpAssignments = await DriverAssignment.find({
      status: "picked_up",
    }).populate("orderId");

    console.log(`📦 Found ${pickedUpAssignments.length} picked up assignments`);

    for (const assignment of pickedUpAssignments) {
      if (!assignment.orderId) {
        console.log(
          `⚠️ Skipping assignment ${assignment._id} - no order found`
        );
        continue;
      }

      const order = assignment.orderId;

      // Check if this is a subscription order
      if (!order.subscription) {
        console.log(
          `ℹ️ Skipping order ${order.orderNumber} - not a subscription order`
        );
        continue;
      }

      // Find the OrderDelegation
      const orderDelegation = await OrderDelegation.findOne({
        orderId: order._id,
      });

      if (!orderDelegation) {
        console.log(
          `⚠️ No OrderDelegation found for order ${order.orderNumber}`
        );
        continue;
      }

      // Update all "ready" entries to "out_for_delivery"
      let updatedCount = 0;
      orderDelegation.dailyTimeline.forEach((entry) => {
        if (entry.status === "ready") {
          console.log(
            `  📍 Updating ${entry.subDayId} from "ready" to "out_for_delivery"`
          );
          entry.status = "out_for_delivery";
          updatedCount++;
        }
      });

      if (updatedCount > 0) {
        await orderDelegation.save();
        console.log(
          `✅ Updated ${updatedCount} entries for order ${order.orderNumber}`
        );
      } else {
        console.log(`ℹ️ No updates needed for order ${order.orderNumber}`);
      }
    }

    console.log("✅ Sync completed successfully!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Error syncing status:", error);
    process.exit(1);
  }
}

syncOrderDelegationStatus();
