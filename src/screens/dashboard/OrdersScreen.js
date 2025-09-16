// src/screens/dashboard/OrdersScreen.js - Production Ready with Real API
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Image,
  Dimensions,
  StatusBar,
  Modal,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "../../styles/theme";
import { COLORS, THEME } from "../../utils/colors";
import apiService from "../../services/api";
import { useAuth } from "../../hooks/useAuth";
import NotificationIcon from "../../components/ui/NotificationIcon";
import OrderCardSkeleton from "../../components/dashboard/OrderCardSkeleton";
import OrderTrackingCard from "../../components/orders/OrderTrackingCard";
import CompactOrderCard from "../../components/orders/CompactOrderCard";
import RecurringDeliveryCard from "../../components/orders/RecurringDeliveryCard";
import { useNotification } from "../../context/NotificationContext";
import { useAlert } from "../../contexts/AlertContext";
import { useFocusEffect } from "@react-navigation/native";
import { createStylesWithDMSans } from "../../utils/fontUtils";

const { width } = Dimensions.get("window");

const OrdersScreen = ({ navigation }) => {
  const { isDark, colors } = useTheme();
  const { showError, showSuccess } = useAlert();
  const [selectedTab, setSelectedTab] = useState("active");
  const [cancelModalVisible, setCancelModalVisible] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [isNavigating, setIsNavigating] = useState(false);
  const { user } = useAuth();
  const [realTimeUpdateInterval, setRealTimeUpdateInterval] = useState(null);

  // Silent update function that only updates status without refreshing UI
  const silentOrderUpdate = async () => {
    try {
      const response = await apiService.getUserOrders();

      // Enhanced error checking
      if (!response) {
        console.log("Silent update: No response received");
        return;
      }

      if (!response.success) {
        console.log("Silent update: API returned success: false");
        return;
      }

      // Enhanced error checking and data structure handling
      if (!response.data) {
        console.log("Silent update: No data in response");
        return;
      }

      // Handle different possible data structures
      let ordersData = response.data;
      if (!Array.isArray(ordersData)) {
        // Check if data is nested (e.g., response.data.data)
        if (response.data.data && Array.isArray(response.data.data)) {
          ordersData = response.data.data;
        } else if (
          response.data.orders &&
          Array.isArray(response.data.orders)
        ) {
          ordersData = response.data.orders;
        } else {
          console.log("Silent update: Invalid data structure", {
            hasData: !!response.data,
            isArray: Array.isArray(response.data),
            dataType: typeof response.data,
            hasNestedData: !!response.data.data,
            hasOrders: !!response.data.orders,
            responseKeys: Object.keys(response.data || {}),
          });
          return;
        }
      }

      setOrders((prevOrders) => {
        const newOrders = [...prevOrders];
        let hasChanges = false;

        // Update status for existing orders without triggering refresh
        ordersData.forEach((newOrder) => {
          const existingIndex = newOrders.findIndex(
            (order) => order._id === newOrder._id || order.id === newOrder.id
          );

          if (existingIndex !== -1) {
            const existing = newOrders[existingIndex];
            const newStatus = newOrder.orderStatus || newOrder.status;
            const newDelegationStatus = newOrder.delegationStatus;
            const existingStatus = existing.orderStatus || existing.status;
            const existingDelegationStatus = existing.delegationStatus;

            // Only update if status has actually changed
            if (
              newStatus !== existingStatus ||
              newDelegationStatus !== existingDelegationStatus
            ) {
              console.log(
                `📱 Status update for order ${newOrder.orderNumber}: ${existingStatus} → ${newStatus}`
              );
              newOrders[existingIndex] = { ...existing, ...newOrder };
              hasChanges = true;
            }
          }
        });

        return hasChanges ? newOrders : prevOrders;
      });
    } catch (error) {
      console.log("Silent update failed:", error.message);
      // Don't show error to user for silent updates
    }
  };

  // Helper function to handle track driver navigation with safety checks
  const handleTrackDriver = (driver, order, orderData) => {
    if (isNavigating) {
      console.log("Navigation already in progress, ignoring");
      return;
    }

    console.log("Track driver:", driver);
    setIsNavigating(true);

    try {
      navigation.navigate("EnhancedTracking", {
        orderId: order._id || order.id,
        order: orderData || order,
        driver: driver,
      });
    } catch (error) {
      console.error("Navigation error:", error);
    } finally {
      // Reset navigation lock after a short delay
      setTimeout(() => setIsNavigating(false), 1000);
    }
  };

  // Dynamic tabs based on actual order counts
  const [tabs, setTabs] = useState([
    { id: "active", label: "Active Orders", count: 0 },
    { id: "completed", label: "Completed", count: 0 },
    { id: "cancelled", label: "Cancelled", count: 0 },
  ]);

  // Load orders on component mount
  useEffect(() => {
    loadOrders();
  }, []);

  // Set up intelligent real-time updates for active orders
  useEffect(() => {
    // Clear any existing interval
    if (realTimeUpdateInterval) {
      clearInterval(realTimeUpdateInterval);
      setRealTimeUpdateInterval(null);
    }

    // Only set up real-time updates if we have active orders and user is on active tab
    const hasActiveOrders = orders.some((order) => {
      const status = (
        order.delegationStatus ||
        order.status ||
        order.orderStatus ||
        ""
      ).toLowerCase();
      return status && !["cancelled", "delivered"].includes(status);
    });

    if (hasActiveOrders && orders.length > 0 && selectedTab === "active") {
      console.log("🔄 Starting intelligent order status updates...");
      const interval = setInterval(async () => {
        console.log("🔄 Checking for order status updates...");
        await silentOrderUpdate(); // New function for status-only updates
      }, 30000); // Check every 30 seconds for status changes only

      setRealTimeUpdateInterval(interval);
    }

    return () => {
      if (realTimeUpdateInterval) {
        clearInterval(realTimeUpdateInterval);
      }
    };
  }, [orders.length, selectedTab]); // Add selectedTab to dependencies

  // Reduced focus refresh - only for major updates
  useFocusEffect(
    React.useCallback(() => {
      // Only refresh after significant time away or if orders are empty
      const lastUpdate = Date.now() - (global.lastOrderUpdate || 0);
      const shouldRefresh = orders.length === 0 || lastUpdate > 300000; // 5 minutes

      if (shouldRefresh) {
        console.log("🔄 Screen focused - major refresh needed");
        loadOrders();
      } else {
        console.log("🔄 Screen focused - using silent update");
        silentOrderUpdate();
      }
    }, [orders.length])
  );

  // Cleanup intervals on unmount
  useEffect(() => {
    return () => {
      if (realTimeUpdateInterval) {
        clearInterval(realTimeUpdateInterval);
      }
    };
  }, []);

  const loadOrders = async () => {
    try {
      setLoading(true);
      setError(null);

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

      let allOrders = [];

      // Process regular orders
      if (ordersResult.success) {
        const orders =
          ordersResult.data?.data ||
          ordersResult.data ||
          ordersResult.orders ||
          [];
        if (Array.isArray(orders)) {
          allOrders = [...orders];
        }
      }

      // Process assigned orders (orders with chefs that are in progress)
      if (assignedOrdersResult.success) {
        const assignedOrders =
          assignedOrdersResult.data?.data ||
          assignedOrdersResult.data ||
          assignedOrdersResult.orders ||
          [];
        if (Array.isArray(assignedOrders)) {
          // Add assigned orders to the list
          allOrders = [...allOrders, ...assignedOrders];
        }
      }

      // Process subscription-based orders (create virtual order from subscription)
      if (subscriptionsResult.success) {
        const subscriptions =
          subscriptionsResult.data?.data ||
          subscriptionsResult.data ||
          subscriptionsResult.subscriptions ||
          [];
        const activeSubscriptions = Array.isArray(subscriptions)
          ? subscriptions.filter((sub) => {
              const status = sub.status?.toLowerCase();
              return (
                status === "active" ||
                status === "paid" ||
                sub.paymentStatus === "Paid"
              );
            })
          : [];

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

        allOrders = [...allOrders, ...subscriptionOrders];
      }

      // Deduplicate orders by _id to prevent duplicate cards with same keys
      // Keep the order with the most recent status (prioritize delegationStatus over regular status)
      const deduplicatedOrders = [];
      const seenIds = new Set();

      // Process orders in reverse to keep later entries (which might have more recent status)
      [...allOrders].reverse().forEach((order) => {
        const orderId = order._id || order.id;

        if (!seenIds.has(orderId)) {
          seenIds.add(orderId);
          deduplicatedOrders.unshift(order); // Add to beginning to maintain original order
        } else {
          // If we've seen this order before, check if current order has more recent status
          const existingIndex = deduplicatedOrders.findIndex(
            (o) => (o._id || o.id) === orderId
          );
          if (existingIndex !== -1) {
            const existingOrder = deduplicatedOrders[existingIndex];
            const currentStatus =
              order.delegationStatus || order.status || order.orderStatus;
            const existingStatus =
              existingOrder.delegationStatus ||
              existingOrder.status ||
              existingOrder.orderStatus;

            // If current order has delegationStatus and existing doesn't, prefer current
            if (order.delegationStatus && !existingOrder.delegationStatus) {
              console.log(
                `🔄 Replacing order ${orderId} with updated status:`,
                {
                  oldStatus: existingStatus,
                  newStatus: currentStatus,
                  hasDelegationStatus: !!order.delegationStatus,
                }
              );
              deduplicatedOrders[existingIndex] = order;
            }
          }
        }
      });

      console.log(
        `📊 Order deduplication: ${allOrders.length} → ${deduplicatedOrders.length} orders`
      );

      setOrders(deduplicatedOrders);

      // Update tab counts based on deduplicated data - check delegationStatus first (chef updates), then fallback
      const activeCounts = deduplicatedOrders.filter((order) => {
        if (!order) return false;
        // Check delegationStatus first (chef status), then fallback to order status
        const status = (
          order.delegationStatus ||
          order.status ||
          order.orderStatus ||
          ""
        ).toLowerCase();
        return status && !["cancelled", "delivered"].includes(status);
      }).length;

      const completedCount = deduplicatedOrders.filter((order) => {
        if (!order) return false;
        // Check delegationStatus first (chef status), then fallback to order status
        const status = (
          order.delegationStatus ||
          order.status ||
          order.orderStatus ||
          ""
        ).toLowerCase();
        return status && ["delivered"].includes(status);
      }).length;

      const cancelledCount = deduplicatedOrders.filter((order) => {
        if (!order) return false;
        // Check delegationStatus first (chef status), then fallback to order status
        const status = (
          order.delegationStatus ||
          order.status ||
          order.orderStatus ||
          ""
        ).toLowerCase();
        return status === "cancelled";
      }).length;

      setTabs([
        { id: "active", label: "Active Orders", count: activeCounts },
        { id: "completed", label: "Completed", count: completedCount },
        { id: "cancelled", label: "Cancelled", count: cancelledCount },
      ]);

      console.log(
        `✅ Loaded ${deduplicatedOrders.length} total orders (${activeCounts} active)`
      );
    } catch (err) {
      setError("Unable to connect to server");
      console.error("❌ Orders loading error:", err);
      setOrders([]); // Ensure orders is always an array
    } finally {
      // Track last update time for smart refresh
      global.lastOrderUpdate = Date.now();
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadOrders();
    setRefreshing(false);
  };

  // Get fresh order details with fallback (similar to meal plan pattern)
  const getOrderDetails = async (orderBundle) => {
    try {
      // Try to fetch fresh data from API
      const result = await apiService.getOrderDetails(
        orderBundle._id || orderBundle.id
      );

      if (result.success && result.order) {
        console.log("✅ Fresh order data loaded from API");
        return result.order;
      } else {
        console.log("⚠️ API failed, using fallback order data");
        return orderBundle; // Fallback to existing data
      }
    } catch (error) {
      console.log("⚠️ API error, using fallback order data:", error);
      return orderBundle; // Fallback to existing data
    }
  };

  // Get status styling based on order status
  const getStatusStyle = (status) => {
    switch (status?.toLowerCase()) {
      case "completed":
      case "delivered":
        return { color: colors.success, text: "Delivered" };
      case "confirmed":
      case "preparing":
        return { color: colors.warning, text: "Preparing" };
      case "ready":
      case "out_for_delivery":
        return { color: colors.primary, text: "Out for Delivery" };
      case "cancelled":
        return { color: colors.error, text: "Cancelled" };
      case "pending":
      default:
        return { color: colors.textSecondary, text: "Pending" };
    }
  };

  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const handleCancelOrder = (order) => {
    setSelectedOrder(order);
    setCancelModalVisible(true);
  };

  const confirmCancelOrder = async () => {
    if (!selectedOrder) return;

    try {
      setCancelModalVisible(false);

      // Call API to cancel order
      const result = await apiService.cancelOrder(
        selectedOrder._id || selectedOrder.orderId
      );

      if (result.success) {
        showSuccess(
          "Order Cancelled",
          "Your order has been cancelled successfully"
        );
        // Refresh orders list
        await loadOrders();
      } else {
        showError(
          "Cancellation Failed",
          result.error || "Unable to cancel order at this time"
        );
      }
    } catch (error) {
      showError("Error", "Unable to cancel order. Please try again.");
      console.error("Cancel order error:", error);
    }

    setSelectedOrder(null);
  };

  // Render active orders with appropriate card based on order type
  const renderActiveOrder = (order) => {
    // Debug logging to see order properties
    console.log("🔍 Rendering order:", {
      id: order._id || order.id,
      isSubscriptionOrder: order.isSubscriptionOrder,
      orderNumber: order.orderNumber,
      status: order.status || order.orderStatus || order.delegationStatus,
      orderType: order.orderType,
      recurringOrder: order.recurringOrder,
      subscription: !!order.subscription,
      deliveryDay: order.deliveryDay,
      dayNumber: order.dayNumber,
      isActivationOrder: order.recurringOrder?.isActivationOrder,
      // Add more fields for debugging
      hasSubscriptionField: order.subscription !== undefined,
      hasRecurringOrder: order.recurringOrder !== undefined,
      recurringOrderType: order.recurringOrder?.orderType,
      activationCompleted: order.recurringOrder?.activationCompleted,
    });

    // Check if this is a subscription order (but not the first delivery)
    const isSubscriptionOrder =
      order.isSubscriptionOrder === true ||
      order.orderNumber?.startsWith("SUB") ||
      order._id?.startsWith("sub_") ||
      order.id?.startsWith("sub_") ||
      order.orderType === "subscription" ||
      order.recurringOrder !== undefined ||
      order.subscription === true; // Add this check for boolean subscription field

    // Check if this is the first delivery of a subscription
    // For recurring orders, check if it's NOT an activation order and activation is completed
    const isFirstDelivery =
      order.recurringOrder?.isActivationOrder === true ||
      order.recurringOrder?.orderType === "one-time" ||
      (order.recurringOrder &&
        order.recurringOrder.activationCompleted === false) ||
      (order.deliveryDay && parseInt(order.deliveryDay) === 1) ||
      (order.dayNumber && parseInt(order.dayNumber) === 1);

    console.log("📊 Order analysis:", {
      isSubscriptionOrder,
      isFirstDelivery,
      cardType:
        isSubscriptionOrder && !isFirstDelivery
          ? "RecurringDeliveryCard"
          : "CompactOrderCard",
      reasoning: {
        hasSubscription: order.subscription === true,
        hasRecurringOrder: order.recurringOrder !== undefined,
        isActivationOrder: order.recurringOrder?.isActivationOrder,
        activationCompleted: order.recurringOrder?.activationCompleted,
        orderType: order.recurringOrder?.orderType,
      },
    });

    // Use RecurringDeliveryCard for subscription orders EXCEPT the first delivery
    if (isSubscriptionOrder && !isFirstDelivery) {
      return (
        <RecurringDeliveryCard
          key={order._id || order.id}
          order={order}
          onContactSupport={() => navigation.navigate("HelpCenter")}
          style={{ marginHorizontal: 0, marginBottom: 20 }}
        />
      );
    }

    // Use CompactOrderCard for:
    // 1. Regular first-time orders (non-subscription)
    // 2. First delivery of subscription orders
    return (
      <CompactOrderCard
        key={order._id || order.id}
        order={order}
        onContactSupport={() => navigation.navigate("HelpCenter")}
        onReorder={(order) => {
          // Navigate to meal plan detail for reordering
          if (order.mealPlan || order.orderItems?.mealPlan) {
            navigation.navigate("MealPlanDetail", {
              bundle: order.mealPlan || { _id: order.orderItems?.mealPlan },
            });
          }
        }}
        onCancelOrder={(orderId) => {
          const orderToCancel = orders.find((o) => (o._id || o.id) === orderId);
          if (orderToCancel) {
            handleCancelOrder(orderToCancel);
          }
        }}
        onRateOrder={(order) => {
          console.log("Rate order:", order._id);
        }}
        style={{ marginHorizontal: 0, marginBottom: 20 }}
      />
    );
  };

  // Render completed/cancelled orders with appropriate card based on order type
  const renderOrderCard = (order) => {
    // Check if this is a subscription order
    const isSubscriptionOrder =
      order.isSubscriptionOrder === true ||
      order.orderNumber?.startsWith("SUB") ||
      order._id?.startsWith("sub_") ||
      order.id?.startsWith("sub_") ||
      order.orderType === "subscription" ||
      order.recurringOrder !== undefined ||
      order.subscription === true; // Add this check for boolean subscription field

    // Check if this is the first delivery of a subscription
    // For recurring orders, check if it's NOT an activation order and activation is completed
    const isFirstDelivery =
      order.recurringOrder?.isActivationOrder === true ||
      order.recurringOrder?.orderType === "one-time" ||
      (order.recurringOrder &&
        order.recurringOrder.activationCompleted === false) ||
      (order.deliveryDay && parseInt(order.deliveryDay) === 1) ||
      (order.dayNumber && parseInt(order.dayNumber) === 1);

    // Use RecurringDeliveryCard for subscription orders EXCEPT the first delivery
    if (isSubscriptionOrder && !isFirstDelivery) {
      return (
        <RecurringDeliveryCard
          key={order._id || order.id}
          order={order}
          onContactSupport={() => navigation.navigate("HelpCenter")}
          style={{ marginHorizontal: 0, marginBottom: 20 }}
        />
      );
    }

    // Use CompactOrderCard for:
    // 1. Regular first-time orders (non-subscription)
    // 2. First delivery of subscription orders
    return (
      <CompactOrderCard
        key={order._id || order.id}
        order={order}
        onContactSupport={() => navigation.navigate("HelpCenter")}
        onReorder={(order) => {
          // Navigate to meal plan detail for reordering
          if (order.mealPlan || order.orderItems?.mealPlan) {
            navigation.navigate("MealPlanDetail", {
              bundle: order.mealPlan || { _id: order.orderItems?.mealPlan },
            });
          }
        }}
        onCancelOrder={(orderId) => {
          const orderToCancel = orders.find((o) => (o._id || o.id) === orderId);
          if (orderToCancel) {
            handleCancelOrder(orderToCancel);
          }
        }}
        onRateOrder={(order) => {
          console.log("Rate order:", order._id);
        }}
        style={{ marginHorizontal: 0, marginBottom: 20 }}
      />
    );
  };

  const renderTabButton = (tab) => (
    <TouchableOpacity
      key={tab.id}
      style={[
        styles(colors).tabButton,
        selectedTab === tab.id && styles(colors).tabButtonActive,
      ]}
      onPress={() => setSelectedTab(tab.id)}
    >
      <Text
        style={[
          styles(colors).tabText,
          selectedTab === tab.id && styles(colors).tabTextActive,
        ]}
      >
        {tab.label}
      </Text>
      {tab.count > 0 && (
        <View
          style={[
            styles(colors).tabBadge,
            selectedTab === tab.id && styles(colors).tabBadgeActive,
          ]}
        >
          <Text
            style={[
              styles(colors).tabBadgeText,
              selectedTab === tab.id && styles(colors).tabBadgeTextActive,
            ]}
          >
            {tab.count}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );

  const filteredOrders = Array.isArray(orders)
    ? orders.filter((order) => {
        if (!order) return false; // Skip null/undefined orders
        // Check delegationStatus first (chef status), then fallback to order status
        const status = (
          order.delegationStatus ||
          order.status ||
          order.orderStatus ||
          ""
        ).toLowerCase();

        if (selectedTab === "active") {
          return status && !["cancelled", "delivered"].includes(status);
        }
        if (selectedTab === "completed") {
          return status && ["delivered"].includes(status);
        }
        if (selectedTab === "cancelled") {
          return status === "cancelled";
        }
        return true;
      })
    : [];

  return (
    <SafeAreaView style={styles(colors).container}>
      <StatusBar
        barStyle={isDark === true ? "light-content" : "dark-content"}
        backgroundColor={colors.background}
      />

      {/* Header */}
      <View style={styles(colors).header}>
        <TouchableOpacity
          style={styles(colors).backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </TouchableOpacity>

        <View style={styles(colors).headerContent}>
          <Text style={styles(colors).headerTitle}>My Orders</Text>
          <Text style={styles(colors).headerSubtitle}>
            You deserve better meal
          </Text>
        </View>

        {/* <TouchableOpacity style={styles(colors).notificationButton}>
          <Ionicons name="notifications-outline" size={24} color={colors.text} />
          <View style={styles(colors).notificationBadge}>
            <Text style={styles(colors).notificationBadgeText}>2</Text>
          </View>
        </TouchableOpacity> */}
        <View style={styles(colors).notificationContainer}>
          <NotificationIcon navigation={navigation} />
        </View>
      </View>

      {/* Tabs */}
      <View style={styles(colors).tabsContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles(colors).tabsContent}
        >
          {tabs.map(renderTabButton)}
        </ScrollView>
      </View>

      {/* Orders List */}
      <ScrollView
        style={styles(colors).scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles(colors).scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
      >
        {loading ? (
          <View style={styles(colors).ordersContainer}>
            {[...Array(3)].map((_, index) => (
              <OrderCardSkeleton key={index} />
            ))}
          </View>
        ) : filteredOrders.length > 0 ? (
          <View style={styles(colors).ordersContainer}>
            {selectedTab === "active"
              ? filteredOrders.map(renderActiveOrder)
              : filteredOrders.map(renderOrderCard)}
          </View>
        ) : (
          <View style={styles(colors).emptyState}>
            <Ionicons
              name="receipt-outline"
              size={80}
              color={colors.textMuted}
            />
            <Text style={styles(colors).emptyStateTitle}>No orders found</Text>
            <Text style={styles(colors).emptyStateText}>
              {selectedTab === "active" &&
                "You don't have any active orders right now."}
              {selectedTab === "completed" &&
                "You haven't completed any orders yet."}
              {selectedTab === "cancelled" &&
                "You don't have any cancelled orders."}
            </Text>
            <TouchableOpacity
              style={styles(colors).emptyStateButton}
              onPress={() => navigation.navigate("Search")}
            >
              <Text style={styles(colors).emptyStateButtonText}>
                Browse Meal Plans
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* Cancel Order Modal */}
      <Modal
        visible={cancelModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setCancelModalVisible(false)}
      >
        <View style={styles(colors).modalOverlay}>
          <View style={styles(colors).modalContainer}>
            <View style={styles(colors).modalIcon}>
              <Ionicons name="warning" size={40} color={colors.warning} />
            </View>

            <Text style={styles(colors).modalTitle}>Cancel Order</Text>
            <Text style={styles(colors).modalMessage}>
              Oh no! Are you sure you want to cancel this order?
            </Text>

            <View style={styles(colors).modalButtons}>
              <TouchableOpacity
                style={styles(colors).modalCancelButton}
                onPress={() => setCancelModalVisible(false)}
              >
                <Text style={styles(colors).modalCancelText}>No!</Text>
                <Text style={styles(colors).modalCancelSubtext}>
                  I change my mind
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles(colors).modalConfirmButton}
                onPress={confirmCancelOrder}
              >
                <Text style={styles(colors).modalConfirmText}>Yes!</Text>
                <Text style={styles(colors).modalConfirmSubtext}>
                  Please cancel my order
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = (colors) =>
  createStylesWithDMSans({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 20,
      paddingVertical: 15,
      backgroundColor: colors.cardBackground,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    backButton: {
      padding: 5,
    },
    headerContent: {
      flex: 1,
      alignItems: "center",
    },
    headerTitle: {
      fontSize: 18,
      fontWeight: "600",
      color: colors.text,
    },
    headerSubtitle: {
      fontSize: 12,
      color: colors.textSecondary,
      marginTop: 2,
    },
    notificationButton: {
      padding: 5,
      position: "relative",
    },
    notificationBadge: {
      position: "absolute",
      top: 2,
      right: 2,
      width: 16,
      height: 16,
      borderRadius: 8,
      backgroundColor: colors.primary,
      justifyContent: "center",
      alignItems: "center",
    },
    notificationBadgeText: {
      fontSize: 10,
      color: colors.white,
      fontWeight: "bold",
    },
    tabsContainer: {
      backgroundColor: colors.cardBackground,
      paddingVertical: 15,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    tabsContent: {
      paddingHorizontal: 20,
      gap: 15,
    },
    tabButton: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 20,
      paddingVertical: 10,
      borderRadius: THEME.borderRadius.large,
      backgroundColor: colors.background,
      borderWidth: 1,
      borderColor: colors.border,
    },
    tabButtonActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    tabText: {
      fontSize: 14,
      fontWeight: "500",
      color: colors.textSecondary,
    },
    tabTextActive: {
      color: colors.black,
    },
    tabBadge: {
      marginLeft: 8,
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 10,
      backgroundColor: colors.textMuted,
    },
    tabBadgeActive: {
      backgroundColor: "rgba(255,255,255,0.3)",
    },
    tabBadgeText: {
      fontSize: 11,
      fontWeight: "bold",
      color: colors.background,
    },
    tabBadgeTextActive: {
      color: colors.white,
    },
    scrollView: {
      flex: 1,
    },
    scrollContent: {
      paddingBottom: 120, // Extra padding for floating tab bar
    },
    ordersContainer: {
      paddingHorizontal: 20,
      paddingTop: 20,
    },
    emptyState: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      paddingHorizontal: 40,
      paddingVertical: 60,
    },
    emptyStateTitle: {
      fontSize: 20,
      fontWeight: "bold",
      color: colors.text,
      marginTop: 20,
      marginBottom: 10,
    },
    emptyStateText: {
      fontSize: 14,
      color: colors.textSecondary,
      textAlign: "center",
      lineHeight: 20,
      marginBottom: 30,
    },
    emptyStateButton: {
      backgroundColor: colors.primary,
      paddingHorizontal: 30,
      paddingVertical: 12,
      borderRadius: THEME.borderRadius.large,
    },
    emptyStateButtonText: {
      color: colors.black,
      fontSize: 16,
      fontWeight: "600",
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.5)",
      justifyContent: "center",
      alignItems: "center",
      paddingHorizontal: 20,
    },
    modalContainer: {
      backgroundColor: colors.cardBackground,
      borderRadius: THEME.borderRadius.large,
      padding: 25,
      width: "100%",
      maxWidth: 320,
      alignItems: "center",
    },
    modalIcon: {
      width: 80,
      height: 80,
      borderRadius: 40,
      backgroundColor: `${colors.warning}20`,
      justifyContent: "center",
      alignItems: "center",
      marginBottom: 20,
    },
    modalTitle: {
      fontSize: 20,
      fontWeight: "bold",
      color: colors.text,
      textAlign: "center",
      marginBottom: 15,
    },
    modalMessage: {
      fontSize: 14,
      color: colors.textSecondary,
      textAlign: "center",
      lineHeight: 20,
      marginBottom: 25,
    },
    modalButtons: {
      flexDirection: "row",
      gap: 15,
      width: "100%",
    },
    modalCancelButton: {
      flex: 1,
      backgroundColor: colors.primary,
      paddingVertical: 15,
      borderRadius: THEME.borderRadius.medium,
      alignItems: "center",
    },
    modalCancelText: {
      color: colors.white,
      fontSize: 16,
      fontWeight: "bold",
      marginBottom: 2,
    },
    modalCancelSubtext: {
      color: "rgba(255,255,255,0.8)",
      fontSize: 11,
    },
    modalConfirmButton: {
      flex: 1,
      backgroundColor: colors.error,
      paddingVertical: 15,
      borderRadius: THEME.borderRadius.medium,
      alignItems: "center",
    },
    modalConfirmText: {
      color: colors.white,
      fontSize: 16,
      fontWeight: "bold",
      marginBottom: 2,
    },
    modalConfirmSubtext: {
      color: "rgba(255,255,255,0.8)",
      fontSize: 11,
    },
  });

export default OrdersScreen;
