/**
 * Subscription Access Middleware
 *
 * Determines what screen/state a user should see based on their subscription status
 * and first delivery completion.
 */

/**
 * Check if user can access "Today's Meal" screen
 * @param {Object} subscription - Subscription document
 * @returns {Boolean}
 */
const canAccessTodayMeals = (subscription) => {
  if (!subscription) return false;

  const status = subscription.status?.toLowerCase();

  // Treat undefined as false (for backwards compatibility with existing subscriptions)
  const firstDeliveryCompleted = subscription.firstDeliveryCompleted ?? false;

  return (
    firstDeliveryCompleted === true &&
    status === "active" &&
    !subscription.pausedAt // Not currently paused
  );
};

/**
 * Check if user is awaiting first delivery
 * @param {Object} subscription - Subscription document
 * @returns {Boolean}
 */
const isPendingFirstDelivery = (subscription) => {
  if (!subscription) return false;

  const status = subscription.status?.toLowerCase();
  const paymentStatus = subscription.paymentStatus;

  // Treat undefined as false (for backwards compatibility with existing subscriptions)
  const firstDeliveryCompleted = subscription.firstDeliveryCompleted ?? false;

  return (
    firstDeliveryCompleted === false &&
    (status === "pending_first_delivery" || status === "active") && // Allow "active" status too for backwards compatibility
    paymentStatus === "Paid"
  );
};

/**
 * Check if subscription is paused
 * @param {Object} subscription - Subscription document
 * @returns {Boolean}
 */
const isSubscriptionPaused = (subscription) => {
  if (!subscription) return false;

  const status = subscription.status?.toLowerCase();
  return (
    status === "paused" || (subscription.pausedAt && !subscription.resumedAt)
  );
};

/**
 * Get the appropriate screen/state for user based on subscription
 * @param {Object} subscription - Subscription document
 * @returns {Object} { screen, reason, data }
 */
const getSubscriptionState = (subscription) => {
  if (!subscription) {
    return {
      screen: "HomeScreen",
      reason: "no_subscription",
      message: "No active subscription found",
    };
  }

  const status = subscription.status?.toLowerCase();

  // Check if paused
  if (isSubscriptionPaused(subscription)) {
    return {
      screen: "SubscriptionPausedScreen",
      reason: "paused",
      message: "Your subscription is currently paused",
      data: {
        pausedAt: subscription.pausedAt,
        pauseReason: subscription.pauseReason,
      },
    };
  }

  // Check if pending first delivery
  if (isPendingFirstDelivery(subscription)) {
    return {
      screen: "AwaitingFirstDeliveryScreen",
      reason: "pending_first_delivery",
      message: "Awaiting your first meal delivery",
      data: {
        subscriptionId: subscription._id,
        planName:
          subscription.mealPlanId?.name || subscription.mealPlanId?.planName,
        estimatedDelivery: subscription.startDate,
      },
    };
  }

  // Check if can access today's meals
  if (canAccessTodayMeals(subscription)) {
    return {
      screen: "TodayMealScreen",
      reason: "active",
      message: "Active subscription with delivered meals",
      data: {
        subscriptionId: subscription._id,
        actualStartDate: subscription.actualStartDate,
      },
    };
  }

  // Check if expired
  if (status === "expired") {
    return {
      screen: "SubscriptionExpiredScreen",
      reason: "expired",
      message: "Your subscription has expired",
      data: {
        endDate: subscription.endDate,
      },
    };
  }

  // Check if cancelled
  if (status === "cancelled") {
    return {
      screen: "HomeScreen",
      reason: "cancelled",
      message: "Subscription was cancelled",
      data: {
        cancelledAt: subscription.cancelledAt,
        cancellationReason: subscription.cancellationReason,
      },
    };
  }

  // Default fallback
  return {
    screen: "HomeScreen",
    reason: "unknown",
    message: "Unable to determine subscription state",
    debugInfo: {
      status: subscription.status,
      firstDeliveryCompleted: subscription.firstDeliveryCompleted,
      paymentStatus: subscription.paymentStatus,
    },
  };
};

/**
 * Express middleware to check subscription access
 * Attaches subscriptionState to req object
 */
const checkSubscriptionAccess = async (req, res, next) => {
  try {
    const { subscription } = req;

    if (!subscription) {
      req.subscriptionState = {
        screen: "HomeScreen",
        reason: "no_subscription",
        hasAccess: false,
      };
      return next();
    }

    const state = getSubscriptionState(subscription);
    req.subscriptionState = {
      ...state,
      hasAccess: state.screen === "TodayMealScreen",
    };

    next();
  } catch (error) {
    console.error("Error in subscription access middleware:", error);
    req.subscriptionState = {
      screen: "HomeScreen",
      reason: "error",
      hasAccess: false,
      error: error.message,
    };
    next();
  }
};

module.exports = {
  canAccessTodayMeals,
  isPendingFirstDelivery,
  isSubscriptionPaused,
  getSubscriptionState,
  checkSubscriptionAccess,
};
