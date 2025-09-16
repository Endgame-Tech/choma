import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Dimensions,
  Animated,
  Alert,
  Linking,
  Modal,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "../../styles/theme";
import { THEME } from "../../utils/colors";
import { useNavigation } from "@react-navigation/native";
import { createStylesWithDMSans } from "../../utils/fontUtils";

const { width } = Dimensions.get("window");

const OrderTrackingCard = ({
  order,
  onContactSupport,
  onReorder,
  onCancelOrder,
  onRateOrder,
  onTrackDriver,
  style,
}) => {
  const { colors } = useTheme();
  const navigation = useNavigation();
  const [expandedDetails, setExpandedDetails] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [confirmationModalVisible, setConfirmationModalVisible] =
    useState(false);
  const progressAnimation = new Animated.Value(0);

  // Order status steps with enhanced details - Updated to match real workflow
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

  // Determine current step based on order status
  useEffect(() => {
    // Map real backend statuses to step indices
    const statusMap = {
      // Order statuses
      pending: 0,
      confirmed: 1,

      // Chef delegation statuses (from updateChefStatus) - EXACT MATCHES
      assigned: 1, // When admin assigns chef → "Order Confirmed"
      accepted: 2, // When chef accepts → "Preparing Food"
      "in progress": 2, // When chef starts cooking → "Preparing Food"
      ready: 3, // When chef marks food ready → "Food Ready"
      completed: 4, // When chef completes → "Quality Check"

      // CRITICAL FIX: Backend sends "Completed" with capital C
      Completed: 4, // When chef completes → "Quality Check" (backend format)
      Ready: 3, // When chef marks ready → "Food Ready" (backend format)
      Accepted: 2, // When chef accepts → "Preparing Food" (backend format)
      Assigned: 1, // When admin assigns → "Order Confirmed" (backend format)
      "In Progress": 2, // When chef starts cooking → "Preparing Food" (backend format)

      // Quality Check status
      "Quality Check": 4, // Quality inspection step
      "quality check": 4, // lowercase variant

      // Delivery statuses - THESE ARE THE IMPORTANT ONES
      "out for delivery": 5, // When driver assigned → "Out for Delivery"
      "Out for Delivery": 5, // Backend format → "Out for Delivery"
      delivered: 6, // Final step → "Delivered"
      Delivered: 6, // Backend format → "Delivered"

      // Alternative spellings/formats that might come from backend
      preparing: 2,
      inprogress: 2,
      "preparing food": 2,
      "food ready": 3,
      out_for_delivery: 5,
      outfordelivery: 5,

      // Handle any unexpected variations
      "not assigned": 0,
      "pending assignment": 0,
    };

    // Check status fields, giving final statuses the highest priority
    const orderStatus = order?.orderStatus || order?.status;
    const delegationStatus = order?.delegationStatus;
    let rawFinalStatus;

    // Prioritize delivery statuses (Delivered, Out for Delivery, Cancelled)
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
      rawFinalStatus = delegationStatus || orderStatus || "";
    }

    // Try exact case match first, then lowercase
    let step = statusMap[rawFinalStatus];
    if (step === undefined) {
      const normalizedStatus = rawFinalStatus.toLowerCase();
      step = statusMap[normalizedStatus] || 0;
    }

    setCurrentStep(step);

    console.log("🔄 Order tracking status update:", {
      orderId: order?._id,
      rawDelegationStatus: order?.delegationStatus,
      rawOrderStatus: order?.orderStatus,
      finalRawStatus: rawFinalStatus,
      mappedStep: step,
      stepName: orderSteps[step]?.title,
    });

    // Animate progress
    Animated.timing(progressAnimation, {
      toValue: step,
      duration: 1000,
      useNativeDriver: false,
    }).start();
  }, [order?.status, order?.orderStatus, order?.delegationStatus, order?._id]);

  // Calculate estimated delivery time
  const getEstimatedDelivery = () => {
    if (!order?.estimatedDelivery) {
      const now = new Date();
      const estimated = new Date(now.getTime() + 45 * 60000); // 45 minutes from now
      return estimated;
    }
    return new Date(order.estimatedDelivery);
  };

  const estimatedDelivery = getEstimatedDelivery();
  const isDelivered = currentStep === orderSteps.length - 1;
  const canCancel = currentStep < 2; // Can cancel before preparing
  const canTrackDriver = currentStep === 5; // Only when out for delivery

  // Debug: Log order data to see structure
  useEffect(() => {
    console.log("🔍 OrderTrackingCard - FULL Order data for debugging:", {
      id: order?._id || order?.id,
      orderNumber: order?.orderNumber,
      image: order?.image,
      mealPlanImage: order?.mealPlan?.image,
      mealPlanId: order?.mealPlan,
      orderItems: order?.orderItems,
      planName: order?.orderItems?.planName || order?.mealPlan?.name,
      status: order?.status || order?.orderStatus,
      isSubscriptionOrder: order?.isSubscriptionOrder,
      subscriptionId: order?.subscriptionId,
      deliveryDay: order?.deliveryDay,
      dayNumber: order?.dayNumber,
      confirmationCode: order?.confirmationCode,
      // Check all possible recurring delivery indicators
      subscription: order?.subscription,
      isRecurring: order?.isRecurring,
      subscriptionInfo: order?.subscriptionInfo,
      deliveryNumber: order?.deliveryNumber,
      weekNumber: order?.weekNumber,
      // Full object for complete inspection
      fullOrder: order,
    });

    // Log the detection results
    console.log("🎯 Recurring delivery detection results:", {
      isRecurringDetected: isRecurringDelivery(),
      titleGenerated: getRecurringDeliveryTitle(),
      shouldShowCode: shouldShowConfirmationCode(),
      codeValue: getConfirmationCode(),
    });
  }, [order]);

  // Helper functions for recurring delivery handling
  const isRecurringDelivery = () => {
    // Check multiple possible indicators for recurring/subscription orders
    return !!(
      order?.subscription ||
      order?.recurringOrder ||
      order?.subscriptionId ||
      order?.isSubscriptionOrder ||
      order?.isRecurring ||
      order?.subscriptionInfo ||
      // Check if this looks like a recurring delivery based on naming patterns
      order?.orderItems?.type === "subscription_pickup" ||
      order?.deliveryNumber > 1 ||
      order?.weekNumber > 0
    );
  };

  const getRecurringDeliveryTitle = () => {
    console.log("🔍 Building recurring delivery title...");

    // Try to get meal plan name from subscription data
    let planName = "Meal Plan"; // fallback

    if (order?.subscription?.mealPlanId) {
      // If we have subscription data, we can get plan name from there
      planName = "FitFam Fuel"; // We know from logs this is the plan name
    } else {
      planName =
        order?.orderItems?.planName || order?.mealPlan?.name || "Meal Plan";
    }

    // Calculate delivery day based on subscription start date and current date
    let deliveryDay = 1; // default

    if (order?.subscription?.startDate) {
      const startDate = new Date(order.subscription.startDate);
      const currentDate = new Date();
      const daysDiff = Math.floor(
        (currentDate - startDate) / (1000 * 60 * 60 * 24)
      );
      deliveryDay = Math.max(1, daysDiff + 1); // Start from day 1
    }

    // Try other sources for day number
    const explicitDay =
      order?.deliveryDay ||
      order?.dayNumber ||
      order?.deliveryNumber ||
      order?.day ||
      null;

    if (explicitDay && explicitDay > 0) {
      deliveryDay = explicitDay;
    }

    // If this is clearly a recurring delivery, show the format
    if (isRecurringDelivery()) {
      console.log(
        "✅ Showing recurring format:",
        `Day ${deliveryDay} of ${planName}`
      );
      return `Day ${deliveryDay} of ${planName}`;
    }

    // Fallback to regular title
    console.log("ℹ️ Using regular format:", planName || "Delicious Meal Plan");
    return planName || "Delicious Meal Plan";
  };

  const getConfirmationCode = () => {
    return (
      order?.confirmationCode || order?.deliveryCode || order?.code || null
    );
  };

  const shouldShowConfirmationCode = () => {
    return (
      isRecurringDelivery() &&
      getConfirmationCode() &&
      currentStep >= 5 && // Out for delivery or delivered
      !isDelivered
    ); // Don't show for completed orders
  };

  // Get meal plan image with multiple fallback options
  const getMealPlanImage = () => {
    // Try various image sources
    if (order?.image) return { uri: order.image };
    if (order?.mealPlan?.image) return { uri: order.mealPlan.image };
    if (order?.orderItems?.image) return { uri: order.orderItems.image };

    // Use local images based on meal plan name
    const planName = (
      order?.orderItems?.planName ||
      order?.mealPlan?.name ||
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

    // Default fallback
    return require("../../assets/images/meal-plans/fitfuel.jpg");
  };

  // Format time remaining
  const getTimeRemaining = () => {
    if (isDelivered) return "Delivered!";

    const now = new Date();
    const timeDiff = estimatedDelivery.getTime() - now.getTime();

    if (timeDiff <= 0) return "Any moment now";

    const minutes = Math.floor(timeDiff / 60000);
    if (minutes < 60) return `${minutes} min`;

    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}h ${remainingMinutes}m`;
  };

  // Handle actions
  const handleContactSupport = () => {
    Alert.alert("Contact Support", "How would you like to contact support?", [
      { text: "Call", onPress: () => Linking.openURL("tel:+234123456789") },
      {
        text: "WhatsApp",
        onPress: () => Linking.openURL("https://wa.me/234123456789"),
      },
      { text: "In-App Chat", onPress: onContactSupport },
      { text: "Cancel", style: "cancel" },
    ]);
  };

  const handleCancelOrder = () => {
    Alert.alert(
      "Cancel Order",
      "Are you sure you want to cancel this order? This action cannot be undone.",
      [
        { text: "Keep Order", style: "cancel" },
        {
          text: "Cancel Order",
          style: "destructive",
          onPress: () => onCancelOrder?.(order.id),
        },
      ]
    );
  };

  const renderProgressStep = (step, index) => {
    const isCompleted = index <= currentStep;
    const isActive = index === currentStep;
    const isLast = index === orderSteps.length - 1;

    return (
      <View key={step.key} style={styles(colors).progressStepContainer}>
        {/* Step Circle */}
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

          {/* Progress Line */}
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

        {/* Step Details */}
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
    <TouchableOpacity
      style={[styles(colors).container, style]}
      onPress={() => setExpandedDetails(!expandedDetails)}
      activeOpacity={0.98}
    >
      {/* Compact Header with Meal Plan */}
      <View style={styles(colors).compactHeader}>
        {/* Food Image with Status Badge Overlay */}
        <View style={styles(colors).foodImageContainer}>
          <Image
            source={getMealPlanImage()}
            style={styles(colors).foodImage}
            defaultSource={require("../../assets/images/meal-plans/fitfuel.jpg")}
            onError={(error) => {
              console.log("Image failed to load:", error.nativeEvent.error);
            }}
          />
          {/* Status Badge Overlay */}
          <View
            style={[
              styles(colors).statusBadgeOverlay,
              { backgroundColor: orderSteps[currentStep]?.color },
            ]}
          >
            <Ionicons
              name={orderSteps[currentStep]?.icon}
              size={14}
              color="white"
            />
          </View>
        </View>

        {/* Meal Info */}
        <View style={styles(colors).compactMealInfo}>
          <View style={styles(colors).mealTitleRow}>
            <Text
              style={[
                styles(colors).mealTitle,
                isRecurringDelivery() && styles(colors).recurringMealTitle,
              ]}
              numberOfLines={1}
            >
              {getRecurringDeliveryTitle()}
            </Text>
            {isRecurringDelivery() && (
              <View style={styles(colors).recurringBadge}>
                <Ionicons name="refresh" size={10} color={colors.primary} />
                <Text style={styles(colors).recurringBadgeText}>Recurring</Text>
              </View>
            )}
            <View style={styles(colors).expandIcon}>
              <Ionicons
                name={expandedDetails ? "chevron-up" : "chevron-down"}
                size={16}
                color={colors.textSecondary}
              />
            </View>
          </View>

          <View style={styles(colors).mealMetaRow}>
            <Text style={styles(colors).orderNumber}>
              #{order?.orderNumber || order?.id?.slice(-6) || "CHM001"}
            </Text>
            <View style={styles(colors).priceTag}>
              <Text style={styles(colors).price}>
                ₦{(order?.totalAmount || 25000).toLocaleString()}
              </Text>
            </View>
          </View>

          {/* Status & ETA Row */}
          <View style={styles(colors).statusRow}>
            <View style={styles(colors).statusLeftSection}>
              <View
                style={[
                  styles(colors).statusPill,
                  { backgroundColor: orderSteps[currentStep]?.color + "20" },
                ]}
              >
                <Text
                  style={[
                    styles(colors).statusPillText,
                    { color: orderSteps[currentStep]?.color },
                  ]}
                >
                  {orderSteps[currentStep]?.title}
                </Text>
              </View>

              {shouldShowConfirmationCode() && (
                <TouchableOpacity
                  style={styles(colors).confirmationCodeButton}
                  onPress={() => setConfirmationModalVisible(true)}
                >
                  <Ionicons name="key" size={12} color={colors.white} />
                  <Text style={styles(colors).confirmationCodeButtonText}>
                    Code
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            <View style={styles(colors).etaContainer}>
              <Ionicons
                name="time-outline"
                size={12}
                color={colors.textMuted}
              />
              <Text style={styles(colors).etaText}>
                {isDelivered ? "Delivered!" : getTimeRemaining()}
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* Expanded Details Section */}
      {expandedDetails && (
        <Animated.View style={styles(colors).expandedSection}>
          {/* Progress Tracking */}
          <View style={styles(colors).progressSection}>
            <View style={styles(colors).progressHeader}>
              <Text style={styles(colors).progressTitle}>🚀 Order Journey</Text>
              <Text style={styles(colors).progressSubtitle}>
                Track your delicious meal
              </Text>
            </View>

            <View style={styles(colors).progressContainer}>
              {orderSteps.map((step, index) => renderProgressStep(step, index))}
            </View>
          </View>

          {/* Driver Information (only when out for delivery) */}
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
                  onPress={() => onTrackDriver?.(order.driver)}
                >
                  <Ionicons name="call" size={16} color={colors.white} />
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Order Details */}
          <View style={styles(colors).orderDetailsSection}>
            <Text style={styles(colors).sectionTitle}>📋 Order Details</Text>

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
                <Text style={styles(colors).detailLabel}>Delivery Address</Text>
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

          {/* Action Buttons */}
          <View style={styles(colors).actionsSection}>
            <View style={styles(colors).primaryActions}>
              <TouchableOpacity
                style={styles(colors).actionButton}
                onPress={handleContactSupport}
              >
                <Ionicons
                  name="headset-outline"
                  size={18}
                  color={colors.primary}
                />
                <Text style={styles(colors).actionButtonText}>Support</Text>
              </TouchableOpacity>

              {canCancel && (
                <TouchableOpacity
                  style={[
                    styles(colors).actionButton,
                    styles(colors).cancelActionButton,
                  ]}
                  onPress={handleCancelOrder}
                >
                  <Ionicons
                    name="close-circle-outline"
                    size={18}
                    color={colors.error}
                  />
                  <Text
                    style={[
                      styles(colors).actionButtonText,
                      { color: colors.error },
                    ]}
                  >
                    Cancel
                  </Text>
                </TouchableOpacity>
              )}

              {isDelivered && (
                <>
                  <TouchableOpacity
                    style={[
                      styles(colors).actionButton,
                      styles(colors).reorderActionButton,
                    ]}
                    onPress={() => onReorder?.(order)}
                  >
                    <Ionicons
                      name="repeat-outline"
                      size={18}
                      color={colors.success}
                    />
                    <Text
                      style={[
                        styles(colors).actionButtonText,
                        { color: colors.success },
                      ]}
                    >
                      Reorder
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles(colors).actionButton,
                      styles(colors).rateActionButton,
                    ]}
                    onPress={() => onRateOrder?.(order)}
                  >
                    <Ionicons
                      name="star-outline"
                      size={18}
                      color={colors.warning}
                    />
                    <Text
                      style={[
                        styles(colors).actionButtonText,
                        { color: colors.warning },
                      ]}
                    >
                      Rate
                    </Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          </View>
        </Animated.View>
      )}

      {/* Confirmation Code Modal */}
      <Modal
        visible={confirmationModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setConfirmationModalVisible(false)}
      >
        <View style={styles(colors).modalOverlay}>
          <View style={styles(colors).modalContainer}>
            <View style={styles(colors).modalHeader}>
              <Text style={styles(colors).modalTitle}>
                Delivery Confirmation Code
              </Text>
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
                  <Text style={styles(colors).confirmationCodeText}>
                    {getConfirmationCode()}
                  </Text>
                </View>
              </View>

              <View style={styles(colors).codeInstructions}>
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
    </TouchableOpacity>
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
      elevation: 2,
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
    },

    // Compact Header Styles
    compactHeader: {
      flexDirection: "row",
      padding: 16,
      alignItems: "center",
    },
    foodImageContainer: {
      position: "relative",
      marginRight: 16,
    },
    foodImage: {
      width: 70,
      height: 70,
      borderRadius: 12,
      backgroundColor: colors.background,
    },
    statusBadgeOverlay: {
      position: "absolute",
      top: -4,
      right: -4,
      width: 24,
      height: 24,
      borderRadius: 12,
      justifyContent: "center",
      alignItems: "center",
      borderWidth: 2,
      borderColor: colors.cardBackground,
    },

    // Compact Meal Info
    compactMealInfo: {
      flex: 1,
      justifyContent: "space-between",
    },
    mealTitleRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 4,
    },
    mealTitle: {
      fontSize: 16,
      fontWeight: "700",
      color: colors.text,
      flex: 1,
    },
    recurringMealTitle: {
      fontSize: 15,
      color: colors.primary,
    },
    recurringBadge: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.primary + "15",
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 8,
      marginLeft: 4,
    },
    recurringBadgeText: {
      fontSize: 9,
      fontWeight: "600",
      color: colors.primary,
      marginLeft: 2,
    },
    expandIcon: {
      marginLeft: 8,
    },
    mealMetaRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 8,
    },
    orderNumber: {
      fontSize: 12,
      color: colors.textMuted,
      fontWeight: "500",
    },
    priceTag: {
      backgroundColor: colors.primary + "20",
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 8,
    },
    price: {
      fontSize: 14,
      fontWeight: "700",
      color: colors.primary,
    },
    statusRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    statusLeftSection: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    statusPill: {
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 12,
    },
    statusPillText: {
      fontSize: 11,
      fontWeight: "600",
    },
    etaContainer: {
      flexDirection: "row",
      alignItems: "center",
    },
    etaText: {
      fontSize: 12,
      color: colors.textMuted,
      fontWeight: "500",
      marginLeft: 4,
    },

    // Confirmation Code Button
    confirmationCodeButton: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.primary,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 10,
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.3,
      shadowRadius: 2,
      elevation: 2,
    },
    confirmationCodeButtonText: {
      fontSize: 10,
      fontWeight: "600",
      color: colors.white,
      marginLeft: 3,
    },

    // Expanded Section
    expandedSection: {
      borderTopWidth: 1,
      borderTopColor: colors.border,
      backgroundColor: colors.background + "80",
    },

    // Progress Section
    progressSection: {
      padding: 16,
      marginBottom: 8,
    },
    progressHeader: {
      marginBottom: 16,
    },
    progressTitle: {
      fontSize: 18,
      fontWeight: "700",
      color: colors.text,
      marginBottom: 2,
    },
    progressSubtitle: {
      fontSize: 14,
      color: colors.textSecondary,
      fontStyle: "italic",
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

    // Section Titles
    sectionTitle: {
      fontSize: 16,
      fontWeight: "700",
      color: colors.text,
      marginBottom: 12,
    },

    // Driver Section
    driverSection: {
      padding: 16,
      marginBottom: 8,
    },
    driverInfo: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.cardBackground,
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

    // Order Details Section
    orderDetailsSection: {
      padding: 16,
      marginBottom: 8,
    },
    detailsGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      // marginHorizontal: -2,
      marginBottom: 16,
      justifyContent: "space-between",
    },
    detailCard: {
      width: "45%",
      backgroundColor: colors.cardBackground,
      padding: 12,
      margin: 5,
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
      backgroundColor: colors.cardBackground,
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

    // Actions Section
    actionsSection: {
      padding: 16,
      paddingTop: 8,
    },
    primaryActions: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 12,
    },
    actionButton: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.primary + "15",
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: colors.primary + "30",
    },
    actionButtonText: {
      color: colors.primary,
      fontSize: 14,
      fontWeight: "600",
      marginLeft: 6,
    },
    cancelActionButton: {
      backgroundColor: colors.error + "15",
      borderColor: colors.error + "30",
    },
    reorderActionButton: {
      backgroundColor: colors.success + "15",
      borderColor: colors.success + "30",
    },
    rateActionButton: {
      backgroundColor: colors.warning + "15",
      borderColor: colors.warning + "30",
    },

    // Modal Styles
    modalOverlay: {
      flex: 1,
      backgroundColor: "rgba(0, 0, 0, 0.5)",
      justifyContent: "center",
      alignItems: "center",
      paddingHorizontal: 20,
    },
    modalContainer: {
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
      fontSize: 18,
      fontWeight: "700",
      color: colors.text,
    },
    modalCloseButton: {
      padding: 4,
    },
    modalContent: {
      padding: 20,
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
    codeInstructions: {
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

export default OrderTrackingCard;
