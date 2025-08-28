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
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "../../styles/theme";
import { THEME } from "../../utils/colors";
import { useNavigation } from "@react-navigation/native";

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
      subtitle: "Final quality check completed",
      icon: "shield-checkmark",
      color: "#9C27B0",
      estimatedTime: "2-5 min",
    },
    {
      key: "out_for_delivery",
      title: "Out for Delivery",
      subtitle: "Your order is on the way",
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
      assigned: 1,        // When admin assigns chef → "Order Confirmed"
      accepted: 2,        // When chef accepts → "Preparing Food"
      "in progress": 2,   // When chef starts cooking → "Preparing Food" 
      ready: 3,           // When chef marks food ready → "Food Ready"
      completed: 4,       // When chef completes → "Quality Check"
      
      // CRITICAL FIX: Backend sends "Completed" with capital C
      "Completed": 4,     // When chef completes → "Quality Check" (backend format)
      "Ready": 3,         // When chef marks ready → "Food Ready" (backend format)
      "Accepted": 2,      // When chef accepts → "Preparing Food" (backend format) 
      "Assigned": 1,      // When admin assigns → "Order Confirmed" (backend format)
      "In Progress": 2,   // When chef starts cooking → "Preparing Food" (backend format)
      
      // Delivery statuses
      "out for delivery": 5,  // When handed to driver → "Out for Delivery"
      delivered: 6,           // Final step → "Delivered"
      
      // Alternative spellings/formats that might come from backend
      preparing: 2,
      inprogress: 2,
      "preparing food": 2,
      "food ready": 3,
      "quality check": 4,
      quality_check: 4,
      "out_for_delivery": 5,
      outfordelivery: 5,
      
      // Handle any unexpected variations
      "not assigned": 0,
      "pending assignment": 0,
    };

    // Check status, orderStatus, and delegationStatus fields for most accurate status
    const rawOrderStatus = (
      order?.delegationStatus ||  // Primary: Chef delegation status (most accurate)
      order?.status ||           // Secondary: General order status  
      order?.orderStatus ||      // Tertiary: Alternative status field
      ""
    );
    
    // Try exact case match first, then lowercase
    let step = statusMap[rawOrderStatus];
    if (step === undefined) {
      const normalizedStatus = rawOrderStatus.toLowerCase();
      step = statusMap[normalizedStatus] || 0;
    }
    
    setCurrentStep(step);
    
    console.log('🔄 Order tracking status update:', {
      orderId: order?._id,
      rawDelegationStatus: order?.delegationStatus,
      rawStatus: order?.status, 
      rawOrderStatus: order?.orderStatus,
      finalRawStatus: rawOrderStatus,
      normalizedStatus: rawOrderStatus.toLowerCase(),
      foundExactMatch: statusMap.hasOwnProperty(rawOrderStatus),
      foundNormalizedMatch: statusMap.hasOwnProperty(rawOrderStatus.toLowerCase()),
      mappedStep: step,
      stepName: orderSteps[step]?.title,
      currentStepBefore: currentStep,
      willUpdate: step !== currentStep,
      allStatusMapKeys: Object.keys(statusMap)
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
    console.log("OrderTrackingCard - Order data:", {
      id: order?._id || order?.id,
      orderNumber: order?.orderNumber,
      image: order?.image,
      mealPlanImage: order?.mealPlan?.image,
      mealPlanId: order?.mealPlan,
      orderItems: order?.orderItems,
      planName: order?.orderItems?.planName || order?.mealPlan?.name,
      status: order?.status || order?.orderStatus,
      isSubscriptionOrder: order?.isSubscriptionOrder,
      fullOrder: order
    });
  }, [order]);

  // Get meal plan image with multiple fallback options
  const getMealPlanImage = () => {
    // Try various image sources
    if (order?.image) return { uri: order.image };
    if (order?.mealPlan?.image) return { uri: order.mealPlan.image };
    if (order?.orderItems?.image) return { uri: order.orderItems.image };
    
    // Use local images based on meal plan name
    const planName = (order?.orderItems?.planName || order?.mealPlan?.name || "").toLowerCase();
    
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
            <Text style={styles(colors).mealTitle} numberOfLines={1}>
              {order?.orderItems?.planName ||
                order?.mealPlan?.name ||
                "Delicious Meal Plan"}
            </Text>
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
            <View style={[styles(colors).statusPill, { backgroundColor: orderSteps[currentStep]?.color + "20" }]}>
              <Text style={[styles(colors).statusPillText, { color: orderSteps[currentStep]?.color }]}>
                {orderSteps[currentStep]?.title}
              </Text>
            </View>
            <View style={styles(colors).etaContainer}>
              <Ionicons name="time-outline" size={12} color={colors.textMuted} />
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
              <Text style={styles(colors).progressSubtitle}>Track your delicious meal</Text>
            </View>

            <View style={styles(colors).progressContainer}>
              {orderSteps.map((step, index) => renderProgressStep(step, index))}
            </View>
          </View>

          {/* Driver Information (only when out for delivery) */}
          {canTrackDriver && order?.driver && (
            <View style={styles(colors).driverSection}>
              <Text style={styles(colors).sectionTitle}>🏍️ Your Delivery Hero</Text>
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
                <Ionicons name="calendar-outline" size={16} color={colors.primary} />
                <Text style={styles(colors).detailLabel}>Order Date</Text>
                <Text style={styles(colors).detailValue}>
                  {new Date(order?.createdAt || Date.now()).toLocaleDateString()}
                </Text>
              </View>

              <View style={styles(colors).detailCard}>
                <Ionicons name="location-outline" size={16} color={colors.primary} />
                <Text style={styles(colors).detailLabel}>Delivery Address</Text>
                <Text style={styles(colors).detailValue} numberOfLines={2}>
                  {order?.deliveryAddress || "Lagos, Nigeria"}
                </Text>
              </View>

              <View style={styles(colors).detailCard}>
                <Ionicons name="card-outline" size={16} color={colors.primary} />
                <Text style={styles(colors).detailLabel}>Payment</Text>
                <Text style={styles(colors).detailValue}>
                  {order?.paymentMethod || "Card ***1234"}
                </Text>
              </View>

              <View style={styles(colors).detailCard}>
                <Ionicons name="checkmark-circle-outline" size={16} color={colors.primary} />
                <Text style={styles(colors).detailLabel}>Status</Text>
                <Text style={styles(colors).detailValue}>
                  {order?.paymentStatus || "Paid"}
                </Text>
              </View>
            </View>

            {order?.instructions && (
              <View style={styles(colors).instructionsCard}>
                <Ionicons name="chatbox-outline" size={16} color={colors.primary} />
                <Text style={styles(colors).instructionsLabel}>Special Instructions</Text>
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
                <Ionicons name="headset-outline" size={18} color={colors.primary} />
                <Text style={styles(colors).actionButtonText}>Support</Text>
              </TouchableOpacity>

              {canCancel && (
                <TouchableOpacity
                  style={[styles(colors).actionButton, styles(colors).cancelActionButton]}
                  onPress={handleCancelOrder}
                >
                  <Ionicons name="close-circle-outline" size={18} color={colors.error} />
                  <Text style={[styles(colors).actionButtonText, { color: colors.error }]}>Cancel</Text>
                </TouchableOpacity>
              )}

              {isDelivered && (
                <>
                  <TouchableOpacity
                    style={[styles(colors).actionButton, styles(colors).reorderActionButton]}
                    onPress={() => onReorder?.(order)}
                  >
                    <Ionicons name="repeat-outline" size={18} color={colors.success} />
                    <Text style={[styles(colors).actionButtonText, { color: colors.success }]}>Reorder</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles(colors).actionButton, styles(colors).rateActionButton]}
                    onPress={() => onRateOrder?.(order)}
                  >
                    <Ionicons name="star-outline" size={18} color={colors.warning} />
                    <Text style={[styles(colors).actionButtonText, { color: colors.warning }]}>Rate</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          </View>
        </Animated.View>
      )}
    </TouchableOpacity>
  );
};

const styles = (colors) =>
  StyleSheet.create({
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
  });

export default OrderTrackingCard;
