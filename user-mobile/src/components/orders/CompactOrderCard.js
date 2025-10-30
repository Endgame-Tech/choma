import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Dimensions,
  Modal,
  ScrollView,
  Animated,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../styles/theme";
import { createStylesWithDMSans } from "../../utils/fontUtils";

const { width } = Dimensions.get("window");

const CompactOrderCard = ({
  order,
  onContactSupport,
  onReorder,
  onCancelOrder,
  onRateOrder,
  onTrackDriver,
  style,
}) => {
  const { colors } = useTheme();
  const [detailsModalVisible, setDetailsModalVisible] = useState(false);
  const [confirmationModalVisible, setConfirmationModalVisible] =
    useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [actualConfirmationCode, setActualConfirmationCode] = useState(null);
  const [loadingCode, setLoadingCode] = useState(false);
  const progressAnimation = new Animated.Value(0);

  // Helper functions to detect subscription orders
  const isSubscriptionOrder = () => {
    return (
      order.isSubscriptionOrder === true ||
      order.orderNumber?.startsWith("SUB") ||
      order._id?.startsWith("sub_") ||
      order.id?.startsWith("sub_") ||
      order.orderType === "subscription" ||
      order.recurringOrder !== undefined
    );
  };

  const isFirstDelivery = () => {
    return (
      order.recurringOrder?.isActivationOrder === true ||
      order.recurringOrder?.orderType === "one-time" ||
      (order.deliveryDay && parseInt(order.deliveryDay) === 1) ||
      (order.dayNumber && parseInt(order.dayNumber) === 1)
    );
  };

  const getMealPlanName = () => {
    return (
      order?.orderItems?.planName ||
      order?.mealPlan?.name ||
      order?.subscription?.planName ||
      "Meal Plan"
    );
  };

  // Confirmation code functions (similar to RecurringDeliveryCard)
  const fetchConfirmationCode = async () => {
    if (actualConfirmationCode) {
      return actualConfirmationCode;
    }

    setLoadingCode(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const code = getConfirmationCode();
      if (code && code !== "PENDING") {
        setActualConfirmationCode(code);
        setLoadingCode(false);
        return code;
      }
    } catch (error) {
      console.log("Could not fetch driver assignment:", error);
    }

    setLoadingCode(false);
    return "PENDING";
  };

  const getConfirmationCode = () => {
    if (actualConfirmationCode) {
      return actualConfirmationCode;
    }

    if (order?.driverAssignment?.confirmationCode) {
      return order.driverAssignment.confirmationCode;
    }

    if (order?.confirmationCode) {
      return order.confirmationCode;
    }

    if (order?.deliveryCode) {
      return order.deliveryCode;
    }

    if (order?.pickupCode) {
      return order.pickupCode;
    }

    if (order?.orderNumber) {
      const orderNumber = order.orderNumber.toString();
      return orderNumber.slice(-6).toUpperCase();
    }

    return "PENDING";
  };

  const isOutForDelivery = () => {
    return (
      order?.orderStatus === "Out for Delivery" ||
      order?.status === "Out for Delivery" ||
      currentStep === 5
    );
  };

  // Order status steps - same as original
  const orderSteps = [
    {
      key: "pending",
      title: "Order Placed",
      subtitle: "We received your order",
      icon: "checkmark-circle",
      color: "#4CAF50",
      estimatedTime: "2-5 min",
    },
    {
      key: "confirmed",
      title: "Order Confirmed",
      subtitle: "Chef has been assigned to your order",
      icon: "restaurant",
      color: "#FF9800",
      estimatedTime: "5-10 min",
    },
    {
      key: "preparing",
      title: "Preparing Food",
      subtitle: "Chef has accepted and started cooking",
      icon: "flame",
      color: "#F44336",
      estimatedTime: "20-30 min",
    },
    {
      key: "ready",
      title: "Food Ready",
      subtitle: "Your meals are ready for pickup",
      icon: "restaurant-outline",
      color: "#FF5722",
      estimatedTime: "2-5 min",
    },
    {
      key: "quality_check",
      title: "Quality Check",
      subtitle: "Final quality inspection in progress",
      icon: "shield-checkmark",
      color: "#9C27B0",
      estimatedTime: "3-5 min",
    },
    {
      key: "out_for_delivery",
      title: "Out for Delivery",
      subtitle: "Driver has been assigned and is on the way",
      icon: "car",
      color: "#2196F3",
      estimatedTime: "15-25 min",
    },
    {
      key: "delivered",
      title: "Delivered",
      subtitle: "Order successfully delivered",
      icon: "gift",
      color: "#4CAF50",
      estimatedTime: "Completed",
    },
  ];

  // Determine current step based on the correct order status flow
  useEffect(() => {
    const statusMap = {
      // 1. Order Placed
      pending: 0,
      "not assigned": 0,
      "pending assignment": 0,

      // 2. Order Confirmed (Admin assigns chef + Chef accepts)
      confirmed: 1,
      assigned: 1,
      accepted: 1,
      Assigned: 1,
      Accepted: 1,

      // 3. Preparing Food (Chef updates status)
      preparing: 2,
      "preparing food": 2,
      "in progress": 2,
      inprogress: 2,
      "In Progress": 2,

      // 4. Food Ready (Chef updates status)
      ready: 3,
      "food ready": 3,
      Ready: 3,

      // 5. Quality Check (Chef marks "Completed" + Admin assigns driver + Driver accepts)
      completed: 4,
      Completed: 4,
      "quality check": 4,
      "Quality Check": 4,

      // 6. Out for Delivery (Driver picks up from chef)
      "out for delivery": 5,
      "Out for Delivery": 5,
      out_for_delivery: 5,
      outfordelivery: 5,

      // 7. Delivered (Driver delivers food)
      delivered: 6,
      Delivered: 6,
    };

    const orderStatus = order?.orderStatus || order?.status;
    const delegationStatus = order?.delegationStatus;
    let rawFinalStatus;

    // Priority order: use orderStatus for final statuses, otherwise use delegationStatus
    if (
      orderStatus === "Delivered" ||
      orderStatus === "delivered" ||
      orderStatus === "Cancelled" ||
      orderStatus === "cancelled" ||
      orderStatus === "Out for Delivery" ||
      orderStatus === "out for delivery"
    ) {
      rawFinalStatus = orderStatus;
    } else {
      // Use delegationStatus for chef-related statuses, orderStatus for others
      rawFinalStatus = delegationStatus || orderStatus || "pending";
    }

    // Normalize and find step
    const normalizedStatus = rawFinalStatus.toLowerCase().trim();
    let step = statusMap[normalizedStatus] || statusMap[rawFinalStatus] || 0;

    // console.log(`🔄 Order ${order?.orderNumber}: ${rawFinalStatus} → Step ${step}`);

    setCurrentStep(step);

    // Animate progress
    Animated.timing(progressAnimation, {
      toValue: step,
      duration: 1000,
      useNativeDriver: false,
    }).start();
  }, [order?.status, order?.orderStatus, order?.delegationStatus, order?._id]);

  const getMealPlanImage = () => {
    console.log("🖼️ Getting meal plan image for order:", {
      orderId: order?._id,
      subscriptionPlanImage: order?.subscription?.planImage,
      subscriptionMealPlanImage: order?.subscription?.mealPlan?.image,
      orderImage: order?.image,
      mealPlanImage: order?.mealPlan?.image,
      orderItemsImage: order?.orderItems?.image,
    });

    // Priority 1: Check for subscription-specific images
    if (order?.subscription?.planImage) {
      console.log("✅ Using subscription.planImage");
      return { uri: order.subscription.planImage };
    }
    if (order?.subscription?.mealPlan?.image) {
      console.log("✅ Using subscription.mealPlan.image");
      return { uri: order.subscription.mealPlan.image };
    }
    if (order?.subscription?.mealPlan?.planImageUrl) {
      console.log("✅ Using subscription.mealPlan.planImageUrl");
      return { uri: order.subscription.mealPlan.planImageUrl };
    }
    if (order?.subscription?.mealPlan?.coverImage) {
      console.log("✅ Using subscription.mealPlan.coverImage");
      return { uri: order.subscription.mealPlan.coverImage };
    }

    // Priority 2: Check for order-specific images
    if (order?.image) {
      console.log("✅ Using order.image");
      return { uri: order.image };
    }
    if (order?.mealPlan?.image) {
      console.log("✅ Using order.mealPlan.image");
      return { uri: order.mealPlan.image };
    }
    if (order?.mealPlan?.planImageUrl) {
      console.log("✅ Using order.mealPlan.planImageUrl");
      return { uri: order.mealPlan.planImageUrl };
    }
    if (order?.mealPlan?.coverImage) {
      console.log("✅ Using order.mealPlan.coverImage");
      return { uri: order.mealPlan.coverImage };
    }
    if (order?.orderItems?.image) {
      console.log("✅ Using order.orderItems.image");
      return { uri: order.orderItems.image };
    }

    // Priority 3: Fallback to plan name matching
    console.log("⚠️ No image found, falling back to plan name matching");
    const planName = (
      order?.subscription?.planName ||
      order?.orderItems?.planName ||
      order?.mealPlan?.name ||
      order?.mealPlan?.planName ||
      ""
    ).toLowerCase();

    if (planName.includes("fitfuel") || planName.includes("fit fuel")) {
      return require("../../assets/images/meal-plans/fitfuel.jpg");
    } else if (planName.includes("wellness") || planName.includes("healthy")) {
      return require("../../assets/images/meal-plans/wellness-hub.jpg");
    } else if (planName.includes("recharge") || planName.includes("energy")) {
      return require("../../assets/images/meal-plans/recharge.jpg");
    } else if (planName.includes("family") || planName.includes("healthyfam")) {
      return require("../../assets/images/meal-plans/healthyfam.jpg");
    }

    return require("../../assets/images/meal-plans/fitfuel.jpg");
  };

  const getStatusInfo = () => {
    const currentStepData = orderSteps[currentStep];
    const isSubscription = isSubscriptionOrder();
    const isFirst = isFirstDelivery();
    const delivered = currentStep === orderSteps.length - 1;

    // Custom messaging for delivered subscription orders (first delivery)
    if (delivered && isSubscription && isFirst) {
      return {
        title: "First Delivery Complete",
        color: "#4CAF50",
        icon: "checkmark-circle",
      };
    }

    return {
      title: currentStepData?.title || "Processing",
      color: currentStepData?.color || "#FF9800",
      icon: currentStepData?.icon || "time",
    };
  };

  const isDelivered = currentStep === orderSteps.length - 1;
  const canCancel = currentStep < 2;
  const canTrackDriver = currentStep === 5;

  const getEstimatedDelivery = () => {
    if (!order?.estimatedDelivery) {
      const now = new Date();
      const estimated = new Date(now.getTime() + 45 * 60000);
      return estimated;
    }
    return new Date(order.estimatedDelivery);
  };

  const getTimeRemaining = () => {
    const isSubscription = isSubscriptionOrder();
    const isFirst = isFirstDelivery();

    if (isDelivered) {
      if (isSubscription && isFirst) {
        return `First delivery completed for ${getMealPlanName()}`;
      }
      return "Delivered!";
    }

    // For subscription first delivery that's not yet delivered, show appropriate message
    if (isSubscription && isFirst) {
      const now = new Date();
      const estimatedDelivery = getEstimatedDelivery();
      const timeDiff = estimatedDelivery.getTime() - now.getTime();

      if (timeDiff <= 0)
        return `Your first delivery arriving now for ${getMealPlanName()}`;

      const minutes = Math.floor(timeDiff / 60000);
      if (minutes < 60)
        return `First delivery in ${minutes} min for ${getMealPlanName()}`;

      const hours = Math.floor(minutes / 60);
      const remainingMinutes = minutes % 60;
      return `First delivery in ${hours}h ${remainingMinutes}m for ${getMealPlanName()}`;
    }

    // Regular order timing for non-subscription or non-first delivery
    const now = new Date();
    const estimatedDelivery = getEstimatedDelivery();
    const timeDiff = estimatedDelivery.getTime() - now.getTime();

    if (timeDiff <= 0) return "Any moment now";

    const minutes = Math.floor(timeDiff / 60000);
    if (minutes < 60) return `${minutes} min`;

    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}h ${remainingMinutes}m`;
  };

  const status = getStatusInfo();

  const renderProgressStep = (step, index) => {
    const isCompleted = index <= currentStep;
    const isActive = index === currentStep;
    const isLast = index === orderSteps.length - 1;

    return (
      <View key={step.key} style={styles(colors).progressStepContainer}>
        <View style={styles(colors).progressStepWrapper}>
          <View
            style={[
              styles(colors).progressStepCircle,
              isCompleted && { backgroundColor: step.color },
              isActive && styles(colors).progressStepActive,
            ]}
          >
            <Ionicons
              name={step.icon}
              size={16}
              color={isCompleted ? colors.white : colors.textMuted}
            />
          </View>

          {!isLast && (
            <View style={styles(colors).progressLine}>
              <Animated.View
                style={[
                  styles(colors).progressLineFill,
                  {
                    backgroundColor: step.color,
                    opacity: index < currentStep ? 1 : 0.2,
                  },
                ]}
              />
            </View>
          )}
        </View>

        <View style={styles(colors).progressStepDetails}>
          <Text
            style={[
              styles(colors).progressStepTitle,
              isActive && { color: step.color, fontWeight: "bold" },
            ]}
          >
            {step.title}
          </Text>
          <Text style={styles(colors).progressStepSubtitle}>
            {step.subtitle}
          </Text>
          {isActive && !isDelivered && (
            <Text
              style={[styles(colors).progressStepTime, { color: step.color }]}
            >
              ⏱️ Est. {step.estimatedTime}
            </Text>
          )}
        </View>
      </View>
    );
  };

  return (
    <View style={[styles(colors).container, style]}>
      {/* Compact Header */}
      <View style={styles(colors).header}>
        <Image
          source={getMealPlanImage()}
          style={styles(colors).mealImage}
          defaultSource={require("../../assets/images/meal-plans/fitfuel.jpg")}
        />

        <View style={styles(colors).mealInfo}>
          <Text style={styles(colors).mealTitle} numberOfLines={1}>
            {order?.orderItems?.planName ||
              order?.mealPlan?.name ||
              "Delicious Meal"}
          </Text>
          <Text style={styles(colors).orderNumber}>
            #{order?.orderNumber || order?.id?.slice(-6) || "CHM001"}
          </Text>
        </View>

        <View style={styles(colors).priceContainer}>
          <Text style={styles(colors).price}>
            ₦{(order?.totalAmount || 25000).toLocaleString()}
          </Text>
        </View>
      </View>

      {/* Status Section */}
      <View style={styles(colors).statusSection}>
        <View style={styles(colors).statusInfo}>
          <View
            style={[
              styles(colors).statusIcon,
              { backgroundColor: status.color },
            ]}
          >
            <Ionicons name={status.icon} size={16} color="white" />
          </View>
          <View style={styles(colors).statusTextContainer}>
            <Text style={[styles(colors).statusText, { color: status.color }]}>
              {status.title}
            </Text>
            <Text style={styles(colors).etaText}>
              {isDelivered ? "Completed" : getTimeRemaining()}
            </Text>
          </View>
        </View>

        <View style={styles(colors).statusButtons}>
          {/* Confirmation Code Button */}
          {isOutForDelivery() && !isDelivered && (
            <TouchableOpacity
              style={styles(colors).codeButton}
              onPress={async () => {
                await fetchConfirmationCode();
                setConfirmationModalVisible(true);
              }}
            >
              <Ionicons name="key" size={14} color={colors.white} />
              <Text style={styles(colors).codeButtonText}>Code</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={styles(colors).detailsButton}
            onPress={() => setDetailsModalVisible(true)}
          >
            <Ionicons
              name="information-circle-outline"
              size={16}
              color={colors.primary}
            />
            {/* <Text style={styles(colors).detailsButtonText}>Details</Text> */}
          </TouchableOpacity>
        </View>
      </View>

      {/* Action Buttons */}
      <View style={styles(colors).actions}>
        <TouchableOpacity
          style={styles(colors).actionButton}
          onPress={onContactSupport}
        >
          <Ionicons name="headset-outline" size={16} color={colors.primary} />
          <Text style={styles(colors).actionButtonText}>Support</Text>
        </TouchableOpacity>

        {canTrackDriver && (
          <TouchableOpacity
            style={styles(colors).actionButton}
            onPress={() =>
              onTrackDriver?.(
                order.driverAssignment?.driver || order.driver,
                order
              )
            }
          >
            <Ionicons
              name="location-outline"
              size={16}
              color={colors.primary}
            />
            <Text style={styles(colors).actionButtonText}>Track</Text>
          </TouchableOpacity>
        )}

        {isDelivered && (
          <TouchableOpacity
            style={styles(colors).actionButton}
            onPress={() => onReorder?.(order)}
          >
            <Ionicons name="repeat-outline" size={16} color={colors.success} />
            <Text
              style={[
                styles(colors).actionButtonText,
                { color: colors.success },
              ]}
            >
              Reorder
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Details Modal */}
      <Modal
        visible={detailsModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setDetailsModalVisible(false)}
      >
        <View style={styles(colors).modalOverlay}>
          <View style={styles(colors).modalContainer}>
            <View style={styles(colors).modalHeader}>
              <Text style={styles(colors).modalTitle}>Order Details</Text>
              <TouchableOpacity
                style={styles(colors).modalCloseButton}
                onPress={() => setDetailsModalVisible(false)}
              >
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles(colors).modalContent}
              showsVerticalScrollIndicator={false}
            >
              {/* Subscription Info Banner (if applicable) */}
              {isSubscriptionOrder() && isFirstDelivery() && (
                <View style={styles(colors).subscriptionBanner}>
                  <View style={styles(colors).subscriptionIcon}>
                    <Ionicons
                      name="refresh-circle"
                      size={24}
                      color={colors.primary}
                    />
                  </View>
                  <View style={styles(colors).subscriptionInfo}>
                    {isDelivered ? (
                      <>
                        <Text style={styles(colors).subscriptionTitle}>
                          First Delivery Complete! 🎉
                        </Text>
                        <Text style={styles(colors).subscriptionMessage}>
                          This was your first delivery for {getMealPlanName()}.
                          Your subscription is now active and future deliveries
                          are scheduled automatically.
                        </Text>
                      </>
                    ) : (
                      <>
                        <Text style={styles(colors).subscriptionTitle}>
                          Your First Delivery 🚀
                        </Text>
                        <Text style={styles(colors).subscriptionMessage}>
                          This is your activation delivery for{" "}
                          {getMealPlanName()}. Once delivered, your subscription
                          will be active and future deliveries will be scheduled
                          automatically.
                        </Text>
                      </>
                    )}
                  </View>
                </View>
              )}

              {/* Order Journey */}
              <View style={styles(colors).journeySection}>
                <Text style={styles(colors).sectionTitle}>
                  {isSubscriptionOrder() && isFirstDelivery()
                    ? "🚀 First Delivery Journey"
                    : "🚀 Order Journey"}
                </Text>
                <Text style={styles(colors).sectionSubtitle}>
                  {isSubscriptionOrder() && isFirstDelivery()
                    ? "Your subscription activation delivery"
                    : "Track your delicious meal"}
                </Text>

                <View style={styles(colors).progressContainer}>
                  {Array.isArray(orderSteps) &&
                    orderSteps.map((step, index) =>
                      renderProgressStep(step, index)
                    )}
                </View>
              </View>

              {/* Driver Information */}
              {canTrackDriver && order?.driver && (
                <View style={styles(colors).driverSection}>
                  <Text style={styles(colors).sectionTitle}>
                    🏍️ Your Delivery Hero
                  </Text>
                  <View style={styles(colors).driverInfo}>
                    <Image
                      source={{
                        uri:
                          order.driver.photo ||
                          "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100",
                      }}
                      style={styles(colors).driverPhoto}
                    />
                    <View style={styles(colors).driverDetails}>
                      <Text style={styles(colors).driverName}>
                        {order.driver.name || "John Doe"}
                      </Text>
                      <Text style={styles(colors).driverVehicle}>
                        {order.driver.vehicle || "Honda - ABC 123 XY"}
                      </Text>
                    </View>
                    <TouchableOpacity
                      style={styles(colors).callButton}
                      onPress={() =>
                        onTrackDriver?.(
                          order.driverAssignment?.driver || order.driver,
                          order
                        )
                      }
                    >
                      <Ionicons name="call" size={16} color={colors.white} />
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {/* Order Details */}
              <View style={styles(colors).orderDetailsSection}>
                <Text style={styles(colors).sectionTitle}>
                  📋 Order Information
                </Text>

                <View style={styles(colors).detailsGrid}>
                  <View style={styles(colors).detailCard}>
                    <Ionicons
                      name="calendar-outline"
                      size={16}
                      color={colors.primary}
                    />
                    <Text style={styles(colors).detailLabel}>Order Date</Text>
                    <Text style={styles(colors).detailValue}>
                      {new Date(
                        order?.createdAt || Date.now()
                      ).toLocaleDateString()}
                    </Text>
                  </View>

                  <View style={styles(colors).detailCard}>
                    <Ionicons
                      name="location-outline"
                      size={16}
                      color={colors.primary}
                    />
                    <Text style={styles(colors).detailLabel}>
                      Delivery Address
                    </Text>
                    <Text style={styles(colors).detailValue} numberOfLines={2}>
                      {order?.deliveryAddress || "Lagos, Nigeria"}
                    </Text>
                  </View>

                  <View style={styles(colors).detailCard}>
                    <Ionicons
                      name="card-outline"
                      size={16}
                      color={colors.primary}
                    />
                    <Text style={styles(colors).detailLabel}>Payment</Text>
                    <Text style={styles(colors).detailValue}>
                      {order?.paymentMethod || "Card ***1234"}
                    </Text>
                  </View>

                  <View style={styles(colors).detailCard}>
                    <Ionicons
                      name="checkmark-circle-outline"
                      size={16}
                      color={colors.primary}
                    />
                    <Text style={styles(colors).detailLabel}>Status</Text>
                    <Text style={styles(colors).detailValue}>
                      {order?.paymentStatus || "Paid"}
                    </Text>
                  </View>
                </View>

                {order?.instructions && (
                  <View style={styles(colors).instructionsCard}>
                    <Ionicons
                      name="chatbox-outline"
                      size={16}
                      color={colors.primary}
                    />
                    <Text style={styles(colors).instructionsLabel}>
                      Special Instructions
                    </Text>
                    <Text style={styles(colors).instructionsText}>
                      {order.instructions}
                    </Text>
                  </View>
                )}
              </View>

              {/* Action Buttons in Modal */}
              <View style={styles(colors).modalActions}>
                {canCancel && (
                  <TouchableOpacity
                    style={[
                      styles(colors).modalActionButton,
                      styles(colors).cancelButton,
                    ]}
                    onPress={() => {
                      setDetailsModalVisible(false);
                      onCancelOrder?.(order._id || order.id);
                    }}
                  >
                    <Ionicons
                      name="close-circle-outline"
                      size={18}
                      color={colors.error}
                    />
                    <Text
                      style={[
                        styles(colors).modalActionText,
                        { color: colors.error },
                      ]}
                    >
                      Cancel Order
                    </Text>
                  </TouchableOpacity>
                )}

                {isDelivered && (
                  <TouchableOpacity
                    style={[
                      styles(colors).modalActionButton,
                      styles(colors).rateButton,
                    ]}
                    onPress={() => {
                      setDetailsModalVisible(false);
                      onRateOrder?.(order);
                    }}
                  >
                    <Ionicons
                      name="star-outline"
                      size={18}
                      color={colors.warning}
                    />
                    <Text
                      style={[
                        styles(colors).modalActionText,
                        { color: colors.warning },
                      ]}
                    >
                      Rate & Review
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Confirmation Code Modal */}
      <Modal
        visible={confirmationModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setConfirmationModalVisible(false)}
      >
        <View style={styles(colors).modalOverlay}>
          <View style={styles(colors).codeModalContainer}>
            <View style={styles(colors).modalHeader}>
              <Text style={styles(colors).modalTitle}>Delivery Code</Text>
              <TouchableOpacity
                style={styles(colors).modalCloseButton}
                onPress={() => setConfirmationModalVisible(false)}
              >
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <View style={styles(colors).modalContent}>
              <View style={styles(colors).codeDisplay}>
                <Text style={styles(colors).codeLabel}>
                  Show this code to your driver:
                </Text>
                <View style={styles(colors).codeContainer}>
                  {loadingCode ? (
                    <ActivityIndicator size="large" color={colors.primary} />
                  ) : (
                    <Text style={styles(colors).confirmationCodeText}>
                      {getConfirmationCode()}
                    </Text>
                  )}
                </View>
              </View>

              <View style={styles(colors).instructions}>
                <View style={styles(colors).instructionRow}>
                  <Ionicons
                    name="information-circle"
                    size={16}
                    color={colors.primary}
                  />
                  <Text style={styles(colors).instructionText}>
                    Your driver will ask for this code when delivering your meal
                  </Text>
                </View>
                <View style={styles(colors).instructionRow}>
                  <Ionicons
                    name="shield-checkmark"
                    size={16}
                    color={colors.success}
                  />
                  <Text style={styles(colors).instructionText}>
                    This ensures secure delivery to the right person
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                style={styles(colors).modalOkButton}
                onPress={() => setConfirmationModalVisible(false)}
              >
                <Text style={styles(colors).modalOkButtonText}>Got it!</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = (colors) =>
  createStylesWithDMSans({
    container: {
      backgroundColor: colors.cardBackground,
      borderRadius: 16,
      marginVertical: 8,
      borderWidth: 1,
      borderColor: colors.border,
      overflow: "hidden",
      // elevation: 3,
      // shadowColor: colors.shadow,
      // shadowOffset: { width: 0, height: 2 },
      // shadowOpacity: 0.15,
      // shadowRadius: 8,
    },

    // Compact Header
    header: {
      flexDirection: "row",
      alignItems: "center",
      padding: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    mealImage: {
      width: 60,
      height: 60,
      borderRadius: 12,
      marginRight: 16,
      backgroundColor: colors.background,
    },
    mealInfo: {
      flex: 1,
    },
    mealTitle: {
      fontSize: 16,
      fontWeight: "700",
      color: colors.text,
      marginBottom: 4,
    },
    orderNumber: {
      fontSize: 12,
      color: colors.textMuted,
      fontWeight: "500",
    },
    priceContainer: {
      backgroundColor: colors.primary + "15",
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 12,
    },
    price: {
      fontSize: 14,
      fontWeight: "700",
      color: colors.primary,
    },

    // Status Section
    statusSection: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      padding: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    statusInfo: {
      flexDirection: "row",
      alignItems: "center",
      flex: 1,
    },
    statusIcon: {
      width: 32,
      height: 32,
      borderRadius: 16,
      justifyContent: "center",
      alignItems: "center",
      marginRight: 12,
    },
    statusTextContainer: {
      flex: 1,
    },
    statusText: {
      fontSize: 16,
      fontWeight: "600",
      marginBottom: 2,
    },
    etaText: {
      fontSize: 12,
      color: colors.textMuted,
      fontWeight: "500",
    },
    detailsButton: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.primary + "15",
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.primary + "30",
    },
    detailsButtonText: {
      fontSize: 12,
      fontWeight: "600",
      color: colors.primary,
      marginLeft: 4,
    },

    // Actions
    actions: {
      flexDirection: "row",
      padding: 16,
      gap: 12,
    },
    actionButton: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.primary + "15",
      paddingVertical: 12,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.primary + "30",
    },
    actionButtonText: {
      color: colors.primary,
      fontSize: 14,
      fontWeight: "600",
      marginLeft: 6,
    },

    // Modal Styles
    modalOverlay: {
      flex: 1,
      backgroundColor: "rgba(0, 0, 0, 0.5)",
      justifyContent: "flex-end",
      alignItems: "flex-end",
    },
    modalContainer: {
      backgroundColor: colors.cardBackground,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      maxHeight: "90%",
      padding: 15,
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: -5 },
      shadowOpacity: 0.3,
      shadowRadius: 20,
      // elevation: 10,
      bottom: 0,
    },
    modalHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 20,
      paddingTop: 20,
      paddingBottom: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    modalTitle: {
      fontSize: 20,
      fontWeight: "700",
      color: colors.text,
    },
    modalCloseButton: {
      padding: 4,
    },
    modalContent: {
      padding: 20,
    },

    // Subscription Banner Styles
    subscriptionBanner: {
      flexDirection: "row",
      backgroundColor: colors.primary + "08",
      borderRadius: 12,
      padding: 16,
      marginVertical: 16,
      borderWidth: 1,
      borderColor: colors.primary + "20",
    },
    subscriptionIcon: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.primary + "15",
      justifyContent: "center",
      alignItems: "center",
      marginRight: 12,
    },
    subscriptionInfo: {
      flex: 1,
    },
    subscriptionTitle: {
      fontSize: 16,
      fontWeight: "700",
      color: colors.text,
      marginBottom: 4,
    },
    subscriptionMessage: {
      fontSize: 14,
      color: colors.textSecondary,
      lineHeight: 20,
    },

    // Journey Section (same as original)
    journeySection: {
      paddingVertical: 20,
    },
    sectionTitle: {
      fontSize: 16,
      fontWeight: "700",
      color: colors.text,
      marginBottom: 4,
    },
    sectionSubtitle: {
      fontSize: 14,
      color: colors.textSecondary,
      fontStyle: "italic",
      marginBottom: 16,
    },
    progressContainer: {
      paddingLeft: 8,
    },
    progressStepContainer: {
      flexDirection: "row",
      marginBottom: 16,
    },
    progressStepWrapper: {
      alignItems: "center",
      marginRight: 16,
    },
    progressStepCircle: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: colors.cardBackground,
      borderWidth: 2,
      borderColor: colors.border,
      justifyContent: "center",
      alignItems: "center",
    },
    progressStepActive: {
      borderColor: colors.primary,
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.3,
      shadowRadius: 4,
      elevation: 2,
    },
    progressLine: {
      width: 2,
      height: 24,
      backgroundColor: colors.border,
      marginTop: 4,
      position: "relative",
    },
    progressLineFill: {
      position: "absolute",
      width: "100%",
      height: "100%",
    },
    progressStepDetails: {
      flex: 1,
      justifyContent: "center",
    },
    progressStepTitle: {
      fontSize: 14,
      fontWeight: "600",
      color: colors.text,
      marginBottom: 2,
    },
    progressStepSubtitle: {
      fontSize: 12,
      color: colors.textSecondary,
      marginBottom: 4,
    },
    progressStepTime: {
      fontSize: 11,
      fontWeight: "500",
    },

    // Driver Section (same as original)
    driverSection: {
      paddingVertical: 16,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    driverInfo: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.background,
      padding: 12,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
    },
    driverPhoto: {
      width: 40,
      height: 40,
      borderRadius: 20,
      marginRight: 12,
    },
    driverDetails: {
      flex: 1,
    },
    driverName: {
      fontSize: 14,
      fontWeight: "600",
      color: colors.text,
    },
    driverVehicle: {
      fontSize: 12,
      color: colors.textSecondary,
    },
    callButton: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: colors.primary,
      justifyContent: "center",
      alignItems: "center",
    },

    // Order Details Section (same as original)
    orderDetailsSection: {
      paddingVertical: 16,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    detailsGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      marginBottom: 16,
      justifyContent: "space-between",
    },
    detailCard: {
      width: "48%",
      backgroundColor: colors.background,
      padding: 12,
      marginBottom: 8,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: "flex-start",
    },
    detailLabel: {
      fontSize: 12,
      color: colors.textSecondary,
      marginTop: 4,
      marginBottom: 2,
    },
    detailValue: {
      fontSize: 14,
      color: colors.text,
      fontWeight: "600",
    },
    instructionsCard: {
      backgroundColor: colors.background,
      padding: 12,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
    },
    instructionsLabel: {
      fontSize: 12,
      color: colors.textSecondary,
      marginTop: 4,
      marginBottom: 6,
    },
    instructionsText: {
      fontSize: 14,
      color: colors.text,
      lineHeight: 20,
    },

    // Modal Actions
    modalActions: {
      flexDirection: "row",
      paddingVertical: 20,
      gap: 12,
    },
    modalActionButton: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 12,
      borderRadius: 12,
      borderWidth: 1,
    },
    cancelButton: {
      backgroundColor: colors.error + "15",
      borderColor: colors.error + "30",
    },
    rateButton: {
      backgroundColor: colors.warning + "15",
      borderColor: colors.warning + "30",
    },
    modalActionText: {
      fontSize: 14,
      fontWeight: "600",
      marginLeft: 6,
    },

    // Status buttons container and confirmation code styles
    statusButtons: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    codeButton: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.primary,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 12,
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.3,
      shadowRadius: 4,
      elevation: 3,
    },
    codeButtonText: {
      fontSize: 12,
      fontWeight: "600",
      color: colors.white,
      marginLeft: 4,
    },

    // Confirmation Code Modal Styles
    codeModalContainer: {
      backgroundColor: colors.cardBackground,
      borderRadius: 20,
      padding: 0,
      width: "100%",
      maxWidth: 350,
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.3,
      shadowRadius: 20,
      elevation: 10,
    },
    codeDisplay: {
      alignItems: "center",
      marginBottom: 24,
    },
    codeLabel: {
      fontSize: 14,
      color: colors.textSecondary,
      marginBottom: 12,
      textAlign: "center",
    },
    codeContainer: {
      backgroundColor: colors.primary + "15",
      borderWidth: 2,
      borderColor: colors.primary + "30",
      borderRadius: 16,
      paddingHorizontal: 24,
      paddingVertical: 16,
      borderStyle: "dashed",
    },
    confirmationCodeText: {
      fontSize: 28,
      fontWeight: "800",
      color: colors.primary,
      letterSpacing: 8,
      textAlign: "center",
      fontFamily: "monospace",
    },
    instructions: {
      marginBottom: 24,
    },
    instructionRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      marginBottom: 12,
    },
    instructionText: {
      fontSize: 14,
      color: colors.textSecondary,
      lineHeight: 20,
      marginLeft: 8,
      flex: 1,
    },
    modalOkButton: {
      backgroundColor: colors.primary,
      paddingVertical: 14,
      borderRadius: 12,
      alignItems: "center",
    },
    modalOkButtonText: {
      fontSize: 16,
      fontWeight: "600",
      color: colors.white,
    },
  });

export default CompactOrderCard;
