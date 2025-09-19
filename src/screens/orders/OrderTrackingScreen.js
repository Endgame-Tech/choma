import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../styles/theme";
import StandardHeader from "../../components/layout/Header";
import OrderTrackingCard from "../../components/orders/OrderTrackingCard";
import RatingModal from "../../components/rating/RatingModal";
import apiService from "../../services/api";
import ratingPromptManager from "../../services/ratingPromptManager";
import { ratingApi } from "../../services/ratingApi";
import { createStylesWithDMSans } from "../../utils/fontUtils";

const OrderTrackingScreen = ({ navigation }) => {
  const { colors } = useTheme();
  const [activeOrders, setActiveOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [ratingModalVisible, setRatingModalVisible] = useState(false);
  const [selectedOrderForRating, setSelectedOrderForRating] = useState(null);
  const [orderRatings, setOrderRatings] = useState({});

  const loadOrders = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      // Try to get regular orders, assigned orders, and subscription-based orders
      const [ordersResult, assignedOrdersResult, subscriptionsResult] =
        await Promise.all([
          apiService
            .getUserOrders()
            .catch((err) => ({ success: false, error: err })),
          apiService
            .get("/orders/assigned")
            .catch((err) => ({ success: false, error: err })),
          apiService
            .getUserSubscriptions()
            .catch((err) => ({ success: false, error: err })),
        ]);

      let allActiveOrders = [];

      // Process regular orders
      if (ordersResult.success) {
        let orders;
        try {
          orders =
            ordersResult.data?.data ||
            ordersResult.data ||
            ordersResult.orders ||
            [];
          
          // Ensure orders is an iterable array
          if (!Array.isArray(orders)) {
            console.warn("❌ Orders data is not an array:", typeof orders, orders);
            orders = [];
          }
        } catch (error) {
          console.error("❌ Error processing orders data:", error);
          orders = [];
        }
        
        const regularActiveOrders = orders.filter((order) => {
          try {
            // Check both 'status' and 'orderStatus' fields
            const status = (
              order.status ||
              order.orderStatus ||
              ""
            ).toLowerCase();
            return (
              status &&
              !["delivered", "cancelled", "completed"].includes(status)
            );
          } catch (error) {
            console.error("❌ Error filtering order:", error);
            return false;
          }
        });

        allActiveOrders = Array.isArray(regularActiveOrders) ? [...regularActiveOrders] : [];
      }

      // Process assigned orders (orders with chefs that are in progress)
      if (assignedOrdersResult.success) {
        let assignedOrders;
        try {
          assignedOrders =
            assignedOrdersResult.data?.data ||
            assignedOrdersResult.data ||
            assignedOrdersResult.orders ||
            [];
          
          // Ensure assignedOrders is an iterable array
          if (!Array.isArray(assignedOrders)) {
            console.warn("❌ Assigned orders data is not an array:", typeof assignedOrders, assignedOrders);
            assignedOrders = [];
          }
        } catch (error) {
          console.error("❌ Error processing assigned orders data:", error);
          assignedOrders = [];
        }
        
        const activeAssignedOrders = assignedOrders.filter((order) => {
          try {
            // Check both 'status' and 'orderStatus' fields
            const status = (
              order.status ||
              order.orderStatus ||
              ""
            ).toLowerCase();
            return (
              status &&
              !["delivered", "cancelled", "completed"].includes(status)
            );
          } catch (error) {
            console.error("❌ Error filtering assigned order:", error);
            return false;
          }
        });

        allActiveOrders = [
          ...(Array.isArray(allActiveOrders) ? allActiveOrders : []), 
          ...(Array.isArray(activeAssignedOrders) ? activeAssignedOrders : [])
        ];
      }

      // Process subscription-based orders (create virtual order from subscription)
      if (subscriptionsResult.success && !allActiveOrders.length) {
        let subscriptions;
        try {
          subscriptions =
            subscriptionsResult.data?.data ||
            subscriptionsResult.data ||
            subscriptionsResult.subscriptions ||
            [];
          
          // Ensure subscriptions is an iterable array
          if (!Array.isArray(subscriptions)) {
            console.warn("❌ Subscriptions data is not an array:", typeof subscriptions, subscriptions);
            subscriptions = [];
          }
        } catch (error) {
          console.error("❌ Error processing subscriptions data:", error);
          subscriptions = [];
        }
        
        const activeSubscriptions = subscriptions.filter((sub) => {
          try {
            const status = sub.status?.toLowerCase();
            return (
              status === "active" ||
              status === "paid" ||
              sub.paymentStatus === "Paid"
            );
          } catch (error) {
            console.error("❌ Error filtering subscription:", error);
            return false;
          }
        });

        // Convert active subscriptions to virtual orders for tracking
        const subscriptionOrders = activeSubscriptions.map((subscription) => ({
          _id: `sub_${subscription._id}`,
          orderNumber:
            subscription.subscriptionId || `SUB${subscription._id?.slice(-8)}`,
          status: "preparing", // Default status for active subscriptions
          orderStatus: "Preparing", // For display
          mealPlan: subscription.mealPlanId || {
            name: "Subscription Meal Plan",
          },
          orderItems: {
            planName:
              subscription.mealPlanId?.planName || "Subscription Meal Plan",
          },
          totalAmount: subscription.totalPrice || subscription.price,
          createdAt: subscription.startDate || subscription.createdAt,
          estimatedDelivery: subscription.nextDelivery,
          deliveryAddress:
            subscription.deliveryAddress || "Your delivery address",
          paymentMethod: subscription.paymentMethod || "Subscription payment",
          paymentStatus: subscription.paymentStatus || "Paid",
          instructions: "Subscription delivery",
          quantity: 1,
          isSubscriptionOrder: true,
        }));

        allActiveOrders = [
          ...(Array.isArray(allActiveOrders) ? allActiveOrders : []), 
          ...(Array.isArray(subscriptionOrders) ? subscriptionOrders : [])
        ];
      }

      // Ensure allActiveOrders is a proper array before setting
      const ordersToSet = Array.isArray(allActiveOrders) ? allActiveOrders : [];
      console.log(`📋 Setting ${ordersToSet.length} active orders`);
      setActiveOrders(ordersToSet);
    } catch (error) {
      console.error("Error loading orders:", error);
      setActiveOrders([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadOrders();
  }, []);

  const handleRefresh = () => {
    loadOrders(true);
  };

  const handleContactSupport = () => {
    navigation.navigate("Support");
  };

  const handleReorder = (order) => {
    // Navigate to meal plan detail for reordering
    if (order.mealPlan || order.orderItems?.mealPlan) {
      navigation.navigate("MealPlanDetail", {
        bundle: order.mealPlan || { _id: order.orderItems?.mealPlan },
      });
    }
  };

  const handleCancelOrder = (orderId) => {
    // Handle order cancellation
    console.log("Cancel order:", orderId);
    // You can implement the cancellation logic here
  };

  const handleRateOrder = (order) => {
    console.log("📝 Opening rating modal for order:", order._id);
    setSelectedOrderForRating(order);
    setRatingModalVisible(true);
  };

  const handleRatingSubmit = async (ratingData) => {
    try {
      console.log("📝 Submitting rating for order:", selectedOrderForRating?._id);
      
      const existingRating = orderRatings[selectedOrderForRating?._id];
      
      if (existingRating) {
        await ratingApi.updateRating(existingRating._id, ratingData);
      } else {
        await ratingApi.createRating(ratingData);
      }
      
      // Trigger additional rating prompts (driver, meal plan, etc.)
      await triggerPostOrderRatingPrompts(selectedOrderForRating);
      
      // Update local ratings state
      setOrderRatings(prev => ({
        ...prev,
        [selectedOrderForRating._id]: { ...ratingData, _id: existingRating?._id }
      }));
      
      console.log('✅ Order rating submitted successfully');
      setRatingModalVisible(false);
      setSelectedOrderForRating(null);
      
    } catch (error) {
      console.error('❌ Error submitting order rating:', error);
    }
  };

  const triggerPostOrderRatingPrompts = async (order) => {
    try {
      // Trigger meal plan rating if this order is part of a meal plan subscription
      if (order.subscriptionId) {
        console.log('🍽️ Triggering meal plan rating prompts after order completion');
        await ratingPromptManager.triggerMealPlanMilestone({
          userId: order.userId,
          mealPlanId: order.mealPlanId,
          subscriptionId: order.subscriptionId,
          completionPercentage: 0, // Would need to calculate from subscription
          mealsCompleted: 0, // Would need to calculate from subscription
          totalMeals: 0, // Would need to calculate from subscription
          weeksCompleted: 0, // Would need to calculate from subscription
          totalWeeks: 4, // Default
          existingRating: null
        });
      }

      // Trigger driver rating if driver info is available
      if (order.driverId || order.driver) {
        console.log('🚗 Triggering driver rating prompts');
        await ratingPromptManager.triggerDriverInteraction({
          userId: order.userId,
          driverId: order.driverId || order.driver?._id,
          orderId: order._id,
          type: 'delivery',
          existingRating: null
        });
      }

      // General order completion trigger
      await ratingPromptManager.triggerOrderCompletion({
        ...order,
        isFirstOrder: false, // Could be calculated
        isRecurringOrder: !!order.subscriptionId
      });
      
    } catch (error) {
      console.error('❌ Error triggering post-order rating prompts:', error);
    }
  };

  const handleTrackDriver = (driver, order) => {
    // Extract driver from driverAssignment if not directly provided
    const actualDriver =
      driver || order?.driverAssignment?.driver || order?.driver;
    console.log("Track driver:", actualDriver);
    navigation.navigate("MapTracking", {
      orderId: order?._id || order?.id,
      order: order,
    });
  };

  if (loading) {
    return (
      <SafeAreaView style={styles(colors).container}>
        <StandardHeader
          title="Order Tracking"
          onBackPress={() => navigation.goBack()}
          showRightIcon={false}
        />
        <View style={styles(colors).loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles(colors).loadingText}>Loading your orders...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles(colors).container}>
      <StandardHeader
        title="Order Tracking"
        onBackPress={() => navigation.goBack()}
        showRightIcon={false}
      />

      <ScrollView
        style={styles(colors).scrollView}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
      >
        {activeOrders.length > 0 ? (
          <View style={styles(colors).ordersContainer}>
            <Text style={styles(colors).sectionTitle}>
              Active Orders ({activeOrders.length})
            </Text>

            {activeOrders.map((order) => (
              <OrderTrackingCard
                key={order._id || order.id}
                order={order}
                onContactSupport={handleContactSupport}
                onReorder={handleReorder}
                onCancelOrder={handleCancelOrder}
                onRateOrder={handleRateOrder}
                onTrackDriver={handleTrackDriver}
              />
            ))}
          </View>
        ) : (
          <View style={styles(colors).emptyContainer}>
            <Ionicons
              name="receipt-outline"
              size={80}
              color={colors.textMuted}
            />
            <Text style={styles(colors).emptyTitle}>No Active Orders</Text>
            <Text style={styles(colors).emptyText}>
              You don't have any active orders at the moment. Browse our meal
              plans to place a new order!
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Rating Modal */}
      <RatingModal
        visible={ratingModalVisible}
        onClose={() => {
          setRatingModalVisible(false);
          setSelectedOrderForRating(null);
        }}
        onSubmit={handleRatingSubmit}
        ratingType="order"
        entityType="order"
        entityId={selectedOrderForRating?._id}
        entityName={`Order #${selectedOrderForRating?._id?.slice(-6)}`}
        existingRating={orderRatings[selectedOrderForRating?._id]}
        contextData={{
          orderId: selectedOrderForRating?._id,
          platform: 'mobile'
        }}
        title="Rate Your Order"
        description="How was your order experience? Your feedback helps us improve our service."
      />
    </SafeAreaView>
  );
};

const styles = (colors) =>
  createStylesWithDMSans({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    scrollView: {
      flex: 1,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      paddingHorizontal: 20,
    },
    loadingText: {
      fontSize: 16,
      color: colors.textSecondary,
      marginTop: 16,
      textAlign: "center",
    },
    ordersContainer: {
      padding: 20,
    },
    sectionTitle: {
      fontSize: 24,
      fontWeight: "bold",
      color: colors.text,
      marginBottom: 20,
    },
    emptyContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      paddingHorizontal: 20,
      paddingTop: 100,
    },
    emptyTitle: {
      fontSize: 24,
      fontWeight: "bold",
      color: colors.text,
      marginTop: 20,
      marginBottom: 12,
      textAlign: "center",
    },
    emptyText: {
      fontSize: 16,
      color: colors.textSecondary,
      textAlign: "center",
      lineHeight: 24,
    },
  });

export default OrderTrackingScreen;
