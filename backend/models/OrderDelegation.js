const mongoose = require("mongoose");

/**
 * OrderDelegation - Simplified tracking schema
 * Links subscription, order, chef, and driver assignments
 * Tracks daily delivery timeline status
 */
const orderDelegationSchema = new mongoose.Schema({
  // Core References
  subscriptionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Subscription",
    required: true,
    index: true,
  },
  orderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Order",
    required: true,
    index: true,
  },

  // Assignment References
  chefId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Chef",
    default: null,
  },
  driverId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Driver",
    default: null,
  },

  // Daily Timeline - One entry per unique delivery date
  dailyTimeline: [
    {
      date: {
        type: Date,
        required: true,
      },
      timelineId: {
        type: String,
        required: true,
        unique: true,
      },
      status: {
        type: String,
        enum: ["pending", "ready", "delivered"],
        default: "pending",
      },
      chefCompletedAt: Date,
      deliveryCompletedAt: Date,
      confirmationCode: String,
    },
  ],

  // Metadata
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// Compound index for efficient queries
orderDelegationSchema.index({ subscriptionId: 1, orderId: 1 });
orderDelegationSchema.index({ "dailyTimeline.timelineId": 1 });
orderDelegationSchema.index({ "dailyTimeline.date": 1 });

// Update timestamp before saving
orderDelegationSchema.pre("save", function (next) {
  this.updatedAt = new Date();
  next();
});

// Method to update daily status by date
orderDelegationSchema.methods.updateDailyStatus = function (
  date,
  status,
  completionField = null
) {
  const dateStr = new Date(date).toISOString().split("T")[0];
  const dayEntry = this.dailyTimeline.find((entry) => {
    const entryDateStr = new Date(entry.date).toISOString().split("T")[0];
    return entryDateStr === dateStr;
  });

  if (dayEntry) {
    dayEntry.status = status;
    if (completionField === "chef") {
      dayEntry.chefCompletedAt = new Date();
    } else if (completionField === "delivery") {
      dayEntry.deliveryCompletedAt = new Date();
    }
    return true;
  }
  return false;
};

// Method to get status for a specific date
orderDelegationSchema.methods.getStatusForDate = function (date) {
  const dateStr = new Date(date).toISOString().split("T")[0];
  const dayEntry = this.dailyTimeline.find((entry) => {
    const entryDateStr = new Date(entry.date).toISOString().split("T")[0];
    return entryDateStr === dateStr;
  });
  return dayEntry ? dayEntry.status : null;
};

// Static method to find by timelineId
orderDelegationSchema.statics.findByTimelineId = function (timelineId) {
  return this.findOne({ "dailyTimeline.timelineId": timelineId });
};

module.exports = mongoose.model("OrderDelegation", orderDelegationSchema);
