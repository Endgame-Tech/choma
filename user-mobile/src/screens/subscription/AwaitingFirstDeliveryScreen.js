import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Image,
  Linking,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "../../styles/theme";
import CustomIcon from "../../components/ui/CustomIcon";
import { createStylesWithDMSans } from "../../utils/fontUtils";
import apiService from "../../services/api";
import CompactOrderCard from "../../components/orders/CompactOrderCard";

/**
 * AwaitingFirstDeliveryScreen
 *
 * Shown when user has paid for subscription but first delivery hasn't been completed yet.
 * Shows order tracking, estimated delivery, and helpful information.
 */
const AwaitingFirstDeliveryScreen = ({ navigation, route }) => {
  const { colors } = useTheme();
  const { subscription, subscriptionId, estimatedDelivery, mealPlanId } =
    route.params || {};

  const [loading, setLoading] = useState(true);
  const [firstOrder, setFirstOrder] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [firstMealImage, setFirstMealImage] = useState(
    subscription?.planImage || subscription?.mealPlanId?.image || null
  );
  const [realTimeUpdateInterval, setRealTimeUpdateInterval] = useState(null);

  useEffect(() => {
    console.log("📦 AwaitingFirstDeliveryScreen params:", {
      subscription,
      subscriptionId,
      estimatedDelivery,
      planImage: subscription?.planImage,
    });
    fetchFirstOrder();
    fetchFirstMeal();
  }, [subscriptionId]);

  // Silent update function that only updates status without refreshing UI
  const silentOrderUpdate = async (forceRefresh = false) => {
    try {
      const response = await apiService.getUserOrders(forceRefresh);

      if (!response?.success || !response?.data) {
        return;
      }

      // Handle both array and nested data structure
      const orders = Array.isArray(response.data)
        ? response.data
        : response.data.orders || [];

      // Find the first order for this subscription
      const subFirstOrder = orders.find(
        (order) =>
          order.subscription === subscriptionId ||
          order.subscription?._id === subscriptionId
      );

      if (subFirstOrder && firstOrder) {
        const newStatus = subFirstOrder.orderStatus || subFirstOrder.status;
        const existingStatus = firstOrder.orderStatus || firstOrder.status;

        // Only update if status has actually changed
        if (newStatus !== existingStatus) {
          console.log(
            `📱 Status update for first order: ${existingStatus} → ${newStatus}`
          );
          setFirstOrder({ ...firstOrder, ...subFirstOrder });

          // If order is now delivered, clear dashboard cache and navigate to TodayMeal
          if (newStatus === "Delivered") {
            console.log(
              "✅ First delivery completed! Clearing cache and navigating..."
            );
            await apiService.clearCache("dashboard");
            await apiService.clearCache("mealDashboard");

            // Navigate to TodayMeal screen
            setTimeout(() => {
              navigation.replace("TodayMeal", {
                subscriptionId: subscriptionId,
                subscription: subscription,
              });
            }, 1000); // Small delay to show success state
          }
        }
      } else if (subFirstOrder && !firstOrder) {
        // New order appeared
        console.log("📱 First order now available:", subFirstOrder.orderNumber);
        setFirstOrder(subFirstOrder);
      }
    } catch (error) {
      console.log("Silent update failed:", error.message);
    }
  };

  // Real-time polling for order status updates
  useEffect(() => {
    // Only poll if we have an order (real or virtual)
    if (firstOrder) {
      console.log("🔄 Starting real-time order status updates...");
      const interval = setInterval(async () => {
        console.log("🔄 Checking for order status updates...");
        await silentOrderUpdate(true); // Force refresh to get latest
      }, 30000); // Check every 30 seconds

      setRealTimeUpdateInterval(interval);

      return () => {
        if (interval) {
          clearInterval(interval);
        }
      };
    }
  }, [firstOrder?._id]); // Re-run when order changes

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (realTimeUpdateInterval) {
        console.log("🧹 Cleaning up order status polling on unmount");
        clearInterval(realTimeUpdateInterval);
      }
    };
  }, [realTimeUpdateInterval]);

  const fetchFirstOrder = async (forceRefresh = false) => {
    try {
      setLoading(true);

      // Fetch the first order for this subscription
      const response = await apiService.getUserOrders(forceRefresh);

      console.log("📦 getUserOrders response:", {
        success: response?.success,
        dataType: typeof response?.data,
        isArray: Array.isArray(response?.data),
        hasOrders: response?.data?.orders ? true : false,
        dataLength: Array.isArray(response?.data)
          ? response.data.length
          : "not array",
      });

      if (response?.success && response?.data) {
        // Handle both array and nested data structure
        const orders = Array.isArray(response.data)
          ? response.data
          : response.data.orders || [];

        console.log("📦 Orders array:", {
          ordersCount: orders.length,
          subscriptionIdToFind: subscriptionId,
          firstOrderSub: orders[0]?.subscription,
        });

        // Find the first order for this subscription
        const subFirstOrder = orders.find(
          (order) =>
            order.subscription === subscriptionId ||
            order.subscription?._id === subscriptionId
        );

        console.log(
          "📦 First order found:",
          subFirstOrder
            ? {
                id: subFirstOrder._id,
                orderNumber: subFirstOrder.orderNumber,
                status: subFirstOrder.orderStatus,
              }
            : null
        );

        // If no real order exists yet, create a virtual order from subscription data
        // (similar to what OrdersScreen does)
        if (!subFirstOrder && subscription) {
          console.log("📦 Creating virtual order from subscription data");
          const virtualOrder = {
            _id: `sub_${subscriptionId}`,
            orderNumber:
              subscription.subscriptionId || `SUB${subscriptionId.slice(-8)}`,
            status: "preparing",
            orderStatus: "Preparing",
            delegationStatus: "preparing",
            mealPlan: subscription.mealPlanId || {
              name: subscription.planName || "Meal Plan",
              image: firstMealImage || subscription.planImage, // Add meal plan image
            },
            orderItems: {
              planName: subscription.planName || "Meal Plan",
              image: firstMealImage || subscription.planImage, // Add order item image
            },
            image: firstMealImage || subscription.planImage, // Add top-level image
            totalAmount: subscription.totalPrice,
            createdAt: subscription.startDate || new Date().toISOString(),
            estimatedDelivery: estimatedDelivery,
            deliveryAddress: "Your delivery address",
            paymentMethod: "Subscription payment",
            paymentStatus: "Paid",
            instructions: "First delivery for subscription",
            isSubscriptionOrder: true,
            isVirtualOrder: true, // Flag to indicate this is a placeholder
          };
          setFirstOrder(virtualOrder);
        } else {
          setFirstOrder(subFirstOrder);
        }
      }
    } catch (error) {
      console.error("❌ Error fetching first order:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchFirstMeal = async () => {
    try {
      // Try to get meal plan ID from route params or subscription
      const planId =
        mealPlanId || subscription?.mealPlanId?._id || subscription?.mealPlanId;

      console.log("🔍 Fetching meal plan:", planId);
      console.log("📦 Subscription object:", subscription);

      if (!planId) {
        console.log("⚠️ No meal plan ID found");
        return;
      }

      // Fetch the meal plan details with meals
      const response = await apiService.getMealPlanById(planId);

      console.log("📦 Meal plan response:", JSON.stringify(response, null, 2));

      if (response?.success && response?.data) {
        const mealPlan = response.data;

        // Get the first meal from different possible locations
        let firstMeal = null;

        // Try sampleMeals first
        if (mealPlan.sampleMeals && mealPlan.sampleMeals.length > 0) {
          firstMeal = mealPlan.sampleMeals[0];
          console.log("✅ Found meal in sampleMeals:", firstMeal.name);
        }
        // Try assignments
        else if (mealPlan.assignments && mealPlan.assignments.length > 0) {
          const firstAssignment = mealPlan.assignments[0];
          if (firstAssignment.mealIds && firstAssignment.mealIds.length > 0) {
            firstMeal = firstAssignment.mealIds[0];
            console.log("✅ Found meal in assignments:", firstMeal.name);
          }
        }
        // Try weeklyMeals
        else if (mealPlan.weeklyMeals) {
          const weeks = Object.keys(mealPlan.weeklyMeals);
          if (weeks.length > 0) {
            const firstWeek = mealPlan.weeklyMeals[weeks[0]];
            const days = Object.keys(firstWeek);
            if (days.length > 0) {
              const firstDay = firstWeek[days[0]];
              const mealTimes = Object.keys(firstDay);
              if (mealTimes.length > 0) {
                const firstMealTime = firstDay[mealTimes[0]];
                if (
                  firstMealTime.mealDetails &&
                  firstMealTime.mealDetails.length > 0
                ) {
                  firstMeal = firstMealTime.mealDetails[0];
                  console.log("✅ Found meal in weeklyMeals:", firstMeal.name);
                }
              }
            }
          }
        }

        if (firstMeal) {
          console.log("🍽️ First meal found:", firstMeal.name);

          if (firstMeal.image) {
            console.log("✅ Setting meal image:", firstMeal.image);
            setFirstMealImage(firstMeal.image);
          } else {
            console.log("⚠️ First meal has no image");
          }
        } else {
          console.log("⚠️ No meals found in meal plan");
        }
      }
    } catch (error) {
      console.error("Error fetching first meal:", error);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    console.log("🔄 Manual refresh requested - clearing all caches");

    // Clear all relevant caches to force fresh data
    await apiService.clearCache("userOrders");
    await apiService.clearCache("dashboard");
    await apiService.clearCache("mealDashboard");

    // Force refresh to bypass cache like OrdersScreen does
    await fetchFirstOrder(true);
    setRefreshing(false);
  };

  const handleContactSupport = () => {
    // TODO: Implement support contact
    Linking.openURL("mailto:support@getchoma.com");
  };

  const handleTrackOrder = () => {
    if (firstOrder) {
      console.log("🚗 Navigating to tracking with order:", {
        orderId: firstOrder._id,
        hasDriver: !!firstOrder.driver,
        driverId: firstOrder.driver?._id,
      });

      navigation.navigate("EnhancedTracking", {
        orderId: firstOrder._id,
        order: firstOrder,
        driver: firstOrder.driver,
      });
    } else {
      // If no order yet, just refresh
      handleRefresh();
    }
  };

  const handleGoBack = () => {
    // Navigate to Home with flag to skip subscription check
    // This prevents the loop where Home redirects back to AwaitingFirstDelivery
    navigation.navigate("Home", { skipSubscriptionCheck: true });
  };

  const getOrderStatusText = () => {
    if (!firstOrder) return "Preparing your order";

    switch (firstOrder.orderStatus) {
      case "Pending":
        return "Order received";
      case "Confirmed":
        return "Order confirmed";
      case "Preparing":
        return "Chef is preparing your meal";
      case "Out for Delivery":
        return "Driver is on the way";
      case "Delivered":
        return "Delivered!";
      default:
        return "Processing order";
    }
  };

  const getOrderStatusIcon = () => {
    if (!firstOrder) return "clock";

    switch (firstOrder.orderStatus) {
      case "Pending":
        return "clock";
      case "Confirmed":
        return "check-circle";
      case "Preparing":
        return "chef-hat";
      case "Out for Delivery":
        return "truck";
      case "Delivered":
        return "check-circle";
      default:
        return "clock";
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles(colors).container} edges={["top"]}>
        <View style={styles(colors).loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles(colors).loadingText}>
            Checking your order status...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles(colors).container} edges={["top"]}>
      <ScrollView
        contentContainerStyle={styles(colors).scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header with Meal Image */}
        <View style={styles(colors).headerWrapper}>
          {/* Background Image */}
          {(firstMealImage ||
            subscription?.planImage ||
            subscription?.mealPlanId?.image) && (
            <Image
              source={{
                uri:
                  firstMealImage ||
                  subscription?.planImage ||
                  subscription?.mealPlanId?.image,
              }}
              style={styles(colors).headerBackgroundImage}
              resizeMode="cover"
              onError={() => console.log("❌ Failed to load header image")}
              onLoad={() => console.log("✅ Header image loaded successfully")}
            />
          )}

          {/* Dark Overlay */}
          <View style={styles(colors).headerOverlay} />

          {/* Gradient Overlay */}
          <LinearGradient
            colors={["rgba(0,0,0,0.6)", "rgba(0,0,0,0.4)", "transparent"]}
            style={styles(colors).headerGradient}
          />

          {/* Header Content */}
          <View style={styles(colors).header}>
            <TouchableOpacity
              style={styles(colors).backButton}
              onPress={handleGoBack}
            >
              <CustomIcon name="arrow-left" size={20} color={colors.white} />
            </TouchableOpacity>

            <View style={styles(colors).headerContent}>
              <CustomIcon
                name={getOrderStatusIcon()}
                size={64}
                color={colors.white}
              />
              <Text style={styles(colors).headerTitle}>
                Your First Meal is On Its Way!
              </Text>
              <Text style={styles(colors).headerSubtitle}>
                {getOrderStatusText()}
              </Text>
            </View>
          </View>
        </View>

        {/* Status Card */}
        <View style={styles(colors).contentContainer}>
          <View style={styles(colors).statusCard}>
            <View style={styles(colors).statusHeader}>
              <CustomIcon name="info" size={24} color={colors.primary} />
              <Text style={styles(colors).statusTitle}>What happens next?</Text>
            </View>

            <View style={styles(colors).statusSteps}>
              <View style={styles(colors).statusStep}>
                <View style={styles(colors).stepNumber}>
                  <Text style={styles(colors).stepNumberText}>1</Text>
                </View>
                <View style={styles(colors).stepContent}>
                  <Text style={styles(colors).stepTitle}>
                    Chef Prepares Your Meal
                  </Text>
                  <Text style={styles(colors).stepDescription}>
                    Our chef is carefully preparing your delicious meal
                  </Text>
                </View>
              </View>

              <View style={styles(colors).statusStep}>
                <View style={styles(colors).stepNumber}>
                  <Text style={styles(colors).stepNumberText}>2</Text>
                </View>
                <View style={styles(colors).stepContent}>
                  <Text style={styles(colors).stepTitle}>
                    Driver Picks Up Order
                  </Text>
                  <Text style={styles(colors).stepDescription}>
                    Your meal is packaged and ready for delivery
                  </Text>
                </View>
              </View>

              <View style={styles(colors).statusStep}>
                <View style={styles(colors).stepNumber}>
                  <Text style={styles(colors).stepNumberText}>3</Text>
                </View>
                <View style={styles(colors).stepContent}>
                  <Text style={styles(colors).stepTitle}>
                    First Delivery Complete
                  </Text>
                  <Text style={styles(colors).stepDescription}>
                    Your meal plan starts and you'll see today's meals
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* Order Card */}
          {firstOrder && (
            <View style={styles(colors).orderCardContainer}>
              <Text style={styles(colors).sectionTitle}>Your First Order</Text>
              <CompactOrderCard
                order={firstOrder}
                onTrackDriver={handleTrackOrder}
              />
              {firstOrder.isVirtualOrder && (
                <View style={styles(colors).virtualOrderNote}>
                  <CustomIcon
                    name="info"
                    size={16}
                    color={colors.textSecondary}
                  />
                  <Text style={styles(colors).virtualOrderNoteText}>
                    Your order is being scheduled. Details will update
                    automatically.
                  </Text>
                </View>
              )}
            </View>
          )}

          {/* Subscription Details */}
          <View style={styles(colors).subscriptionCard}>
            <Text style={styles(colors).sectionTitle}>Your Subscription</Text>
            <View style={styles(colors).subscriptionDetail}>
              <Text style={styles(colors).detailLabel}>Plan Name:</Text>
              <Text style={styles(colors).detailValue}>
                {subscription?.planName || "Meal Plan"}
              </Text>
            </View>
            <View style={styles(colors).subscriptionDetail}>
              <Text style={styles(colors).detailLabel}>Duration:</Text>
              <Text style={styles(colors).detailValue}>
                {subscription?.durationWeeks || 1} Week
                {subscription?.durationWeeks > 1 ? "s" : ""}
              </Text>
            </View>
            {estimatedDelivery && (
              <View style={styles(colors).subscriptionDetail}>
                <Text style={styles(colors).detailLabel}>
                  Estimated Delivery:
                </Text>
                <Text style={styles(colors).detailValue}>
                  {new Date(estimatedDelivery).toLocaleDateString()}
                </Text>
              </View>
            )}
          </View>

          {/* Action Buttons */}
          {firstOrder ? (
            <>
              {/* <TouchableOpacity
                style={styles(colors).primaryButton}
                onPress={handleTrackOrder}
              >
                <CustomIcon name="location" size={20} color={colors.white} />
                <Text style={styles(colors).primaryButtonText}>
                  Track Your Order
                </Text>
              </TouchableOpacity> */}
              <TouchableOpacity
                style={styles(colors).secondaryButton}
                onPress={handleRefresh}
              >
                <CustomIcon
                  name="refresh-cw"
                  size={20}
                  color={colors.primary}
                />
                <Text style={styles(colors).secondaryButtonText}>
                  Refresh Status
                </Text>
              </TouchableOpacity>
            </>
          ) : (
            <TouchableOpacity
              style={styles(colors).primaryButton}
              onPress={handleRefresh}
            >
              <CustomIcon name="refresh-cw" size={20} color={colors.white} />
              <Text style={styles(colors).primaryButtonText}>
                Check for Order Updates
              </Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={styles(colors).textButton}
            onPress={handleContactSupport}
          >
            <CustomIcon
              name="message-circle"
              size={18}
              color={colors.textSecondary}
            />
            <Text style={styles(colors).textButtonText}>Contact Support</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = (colors) =>
  createStylesWithDMSans({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    scrollContent: {
      flexGrow: 1,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
    },
    loadingText: {
      marginTop: 16,
      fontSize: 16,
      color: colors.textSecondary,
    },
    headerWrapper: {
      position: "relative",
      overflow: "hidden",
      borderBottomLeftRadius: 24,
      borderBottomRightRadius: 24,
    },
    headerBackgroundImage: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      width: "100%",
      height: "100%",
    },
    headerOverlay: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: "rgba(0, 0, 0, 0.5)",
    },
    headerGradient: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      height: "100%",
    },
    header: {
      padding: 24,
      paddingTop: 16,
    },
    backButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: "rgba(255, 255, 255, 0.2)",
      justifyContent: "center",
      alignItems: "center",
      marginBottom: 16,
    },
    headerContent: {
      alignItems: "center",
      paddingVertical: 24,
    },
    headerTitle: {
      fontSize: 24,
      fontWeight: "700",
      color: colors.white,
      marginTop: 16,
      textAlign: "center",
      textShadowColor: "rgba(0, 0, 0, 0.75)",
      textShadowOffset: { width: 0, height: 2 },
      textShadowRadius: 4,
    },
    headerSubtitle: {
      fontSize: 16,
      color: colors.white,
      opacity: 0.9,
      marginTop: 8,
      textAlign: "center",
      textShadowColor: "rgba(0, 0, 0, 0.75)",
      textShadowOffset: { width: 0, height: 1 },
      textShadowRadius: 3,
    },
    contentContainer: {
      padding: 20,
    },
    statusCard: {
      backgroundColor: colors.cardBackground,
      borderRadius: 16,
      padding: 20,
      marginBottom: 16,
    },
    statusHeader: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 20,
    },
    statusTitle: {
      fontSize: 18,
      fontWeight: "600",
      color: colors.text,
      marginLeft: 12,
    },
    statusSteps: {
      gap: 16,
    },
    statusStep: {
      flexDirection: "row",
      alignItems: "flex-start",
    },
    stepNumber: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: colors.primary,
      justifyContent: "center",
      alignItems: "center",
      marginRight: 12,
    },
    stepNumberText: {
      fontSize: 16,
      fontWeight: "700",
      color: colors.white,
    },
    stepContent: {
      flex: 1,
    },
    stepTitle: {
      fontSize: 16,
      fontWeight: "600",
      color: colors.text,
      marginBottom: 4,
    },
    stepDescription: {
      fontSize: 14,
      color: colors.textSecondary,
      lineHeight: 20,
    },
    orderCardContainer: {
      marginBottom: 16,
    },
    virtualOrderNote: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.primary + "10",
      borderRadius: 8,
      padding: 12,
      marginTop: 12,
      gap: 8,
    },
    virtualOrderNoteText: {
      fontSize: 13,
      color: colors.textSecondary,
      flex: 1,
      lineHeight: 18,
    },
    subscriptionCard: {
      backgroundColor: colors.cardBackground,
      borderRadius: 16,
      padding: 20,
      marginBottom: 16,
    },
    sectionTitle: {
      fontSize: 16,
      fontWeight: "600",
      color: colors.text,
      marginBottom: 16,
    },
    subscriptionDetail: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    detailLabel: {
      fontSize: 14,
      color: colors.textSecondary,
    },
    detailValue: {
      fontSize: 14,
      fontWeight: "600",
      color: colors.text,
    },
    primaryButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.primary,
      paddingVertical: 16,
      paddingHorizontal: 24,
      borderRadius: 42,
      marginBottom: 12,
      gap: 8,
    },
    primaryButtonText: {
      fontSize: 16,
      fontWeight: "600",
      color: colors.white,
    },
    secondaryButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.cardBackground,
      paddingVertical: 16,
      paddingHorizontal: 24,
      borderRadius: 42,
      //   borderWidth: 1,
      //   borderColor: colors.primary,
      marginBottom: 12,
      gap: 8,
    },
    secondaryButtonText: {
      fontSize: 16,
      fontWeight: "600",
      color: colors.primary,
    },
    textButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 12,
      gap: 8,
    },
    textButtonText: {
      fontSize: 14,
      color: colors.textSecondary,
    },
  });

export default AwaitingFirstDeliveryScreen;
