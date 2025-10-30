const mongoose = require("mongoose");
require("dotenv").config();

const Subscription = require("./models/Subscription");

async function fixStatusCasing() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✅ Connected to MongoDB\n");

    // Find all subscriptions with capitalized status
    const subsToFix = await Subscription.find({
      status: {
        $regex:
          /^(Active|Pending|Paused|Cancelled|Expired|Pending_First_Delivery)$/i,
      },
    }).select("_id status");

    console.log(
      `Found ${subsToFix.length} subscriptions with capitalized status\n`
    );

    if (subsToFix.length === 0) {
      console.log("✅ No subscriptions need fixing!");
      await mongoose.disconnect();
      process.exit(0);
    }

    // Fix each subscription
    const statusMap = {
      Active: "active",
      Pending: "pending",
      Paused: "paused",
      Cancelled: "cancelled",
      Expired: "expired",
      Pending_First_Delivery: "pending_first_delivery",
      "Pending First Delivery": "pending_first_delivery",
    };

    let fixed = 0;
    for (const sub of subsToFix) {
      const oldStatus = sub.status;
      const newStatus =
        statusMap[oldStatus] || oldStatus.toLowerCase().replace(/ /g, "_");

      if (oldStatus !== newStatus) {
        console.log(`Fixing subscription ${sub._id}:`);
        console.log(`  ${oldStatus} → ${newStatus}`);

        await Subscription.updateOne(
          { _id: sub._id },
          { $set: { status: newStatus } }
        );
        fixed++;
      }
    }

    console.log(`\n✅ Fixed ${fixed} subscriptions!`);

    await mongoose.disconnect();
    console.log("✅ Disconnected from MongoDB");
    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

fixStatusCasing();
