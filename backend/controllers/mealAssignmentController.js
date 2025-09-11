const MealAssignment = require("../models/MealAssignment");
const RecurringSubscription = require("../models/RecurringSubscription");

/**
 * Get meal assignments for a specific subscription
 */
exports.getMealAssignmentsBySubscription = async (req, res) => {
  try {
    const { subscriptionId } = req.params;
    const userId = req.user.id;

    // Verify the subscription belongs to the user
    const subscription = await RecurringSubscription.findOne({
      _id: subscriptionId,
      userId: userId,
    });

    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: "Subscription not found or access denied",
      });
    }

    // Get meal assignments for this subscription
    const mealAssignments = await MealAssignment.find({
      subscriptionId: subscriptionId,
    })
      .populate("assignedChef", "fullName email phone")
      .populate("assignedDriver", "fullName email phone")
      .sort({ scheduledDate: -1 })
      .limit(10); // Get latest 10 assignments

    res.json({
      success: true,
      data: mealAssignments,
    });
  } catch (error) {
    console.error("❌ Get meal assignments by subscription error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch meal assignments",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

/**
 * Get meal assignments for current user
 */
exports.getMyMealAssignments = async (req, res) => {
  try {
    const userId = req.user.id;

    // Get user's subscriptions first
    const userSubscriptions = await RecurringSubscription.find({
      userId: userId,
    }).select("_id");

    const subscriptionIds = userSubscriptions.map((sub) => sub._id);

    // Get meal assignments for user's subscriptions
    const mealAssignments = await MealAssignment.find({
      subscriptionId: { $in: subscriptionIds },
    })
      .populate("subscriptionId", "status frequency")
      .populate("assignedChef", "fullName email phone")
      .populate("assignedDriver", "fullName email phone")
      .sort({ scheduledDate: -1 });

    res.json({
      success: true,
      data: mealAssignments,
      count: mealAssignments.length,
    });
  } catch (error) {
    console.error("❌ Get my meal assignments error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch meal assignments",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

/**
 * Update meal assignment status
 */
exports.updateMealAssignmentStatus = async (req, res) => {
  try {
    const { assignmentId } = req.params;
    const { status, notes } = req.body;
    const userId = req.user.id;

    // Find the meal assignment
    const mealAssignment = await MealAssignment.findById(assignmentId).populate(
      "subscriptionId",
      "userId"
    );

    if (!mealAssignment) {
      return res.status(404).json({
        success: false,
        message: "Meal assignment not found",
      });
    }

    // Verify the assignment belongs to the user's subscription
    if (mealAssignment.subscriptionId.userId.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: "Access denied",
      });
    }

    // Validate status
    const validStatuses = [
      "scheduled",
      "chef_assigned",
      "preparing",
      "ready",
      "out_for_delivery",
      "delivered",
      "failed",
      "cancelled",
      "skipped",
    ];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid status value",
      });
    }

    // Update status
    await mealAssignment.updateStatus(
      status,
      userId,
      notes || "Status updated by customer"
    );

    res.json({
      success: true,
      message: "Meal assignment status updated successfully",
      data: {
        id: mealAssignment._id,
        status: mealAssignment.status,
        updatedAt: new Date(),
      },
    });
  } catch (error) {
    console.error("❌ Update meal assignment status error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update meal assignment status",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};
