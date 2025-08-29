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
import { useNotification } from "../../context/NotificationContext";
import { useAlert } from "../../contexts/AlertContext";
import { useFocusEffect } from "@react-navigation/native";

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
  const { user } = useAuth();
  const [realTimeUpdateInterval, setRealTimeUpdateInterval] = useState(null);

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

  // Set up real-time updates for active orders
  useEffect(() => {
    // Clear any existing interval
    if (realTimeUpdateInterval) {
      clearInterval(realTimeUpdateInterval);
    }
    
    // Only set up real-time updates if we have active orders
    const hasActiveOrders = orders.some(order => {
      const status = (order.delegationStatus || order.status || order.orderStatus || "").toLowerCase();
      return status && !["cancelled", "delivered"].includes(status);
    });
    
    if (hasActiveOrders && orders.length > 0) {
      console.log("🔄 Starting real-time order updates...");
      const interval = setInterval(() => {
        console.log("🔄 Real-time order update check...");
        loadOrders();
      }, 30000); // Update every 30 seconds for active orders
      
      setRealTimeUpdateInterval(interval);
      
      return () => clearInterval(interval);
    }
    
    return () => {
      if (realTimeUpdateInterval) {
        clearInterval(realTimeUpdateInterval);
      }
    };
  }, [orders.length, orders]);

  // Refresh orders when screen comes into focus (chef status might have changed)
  useFocusEffect(
    React.useCallback(() => {
      // Refresh orders when user navigates back to this screen
      loadOrders();
    }, [])
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
      const [ordersResult, assignedOrdersResult, subscriptionsResult] = await Promise.all([
        apiService
          .getUserOrders()
          .catch((err) => ({ success: false, error: err })),
        apiService
          .get('/orders/assigned')
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

      setOrders(allOrders);

      // Update tab counts based on real data - check delegationStatus first (chef updates), then fallback
      const activeCounts = allOrders.filter((order) => {
        if (!order) return false;
        // Check delegationStatus first (chef status), then fallback to order status
        const status = (
          order.delegationStatus || 
          order.status || 
          order.orderStatus || 
          ""
        ).toLowerCase();
        return (
          status && !["cancelled", "delivered"].includes(status)
        );
      }).length;

      const completedCount = allOrders.filter((order) => {
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

      const cancelledCount = allOrders.filter((order) => {
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
        `✅ Loaded ${allOrders.length} total orders (${activeCounts} active)`
      );
    } catch (err) {
      setError("Unable to connect to server");
      console.error("❌ Orders loading error:", err);
      setOrders([]); // Ensure orders is always an array
    } finally {
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
      const result = await apiService.getOrderDetails(orderBundle._id || orderBundle.id);
      
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

  // Render active orders with OrderTrackingCard
  const renderActiveOrder = (order) => (
    <OrderTrackingCard
      key={order._id || order.id}
      order={order}
      onContactSupport={() => navigation.navigate("Support")}
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
        // Navigate to rating screen or show rating modal
        console.log("Rate order:", order._id);
      }}
      onTrackDriver={(driver) => {
        // Handle driver tracking
        console.log("Track driver:", driver);
      }}
      style={{ marginHorizontal: 0, marginBottom: 20 }}
    />
  );

  const renderOrderCard = (order) => (
    <TouchableOpacity
      key={order.id}
      style={styles(colors).orderCard}
      onPress={async () => {
        const freshOrder = await getOrderDetails(order);
        navigation.navigate("OrderDetail", { order: freshOrder });
      }}
      activeOpacity={0.9}
    >
      {/* Order Header */}
      <View style={styles(colors).orderHeader}>
        <Text style={styles(colors).orderTitle}>Your Orders</Text>
        <View
          style={[
            styles(colors).statusBadge,
            { backgroundColor: order.statusColor },
          ]}
        >
          <Text style={styles(colors).statusText}>{order.statusText}</Text>
        </View>
      </View>

      {/* Order Item */}
      <View style={styles(colors).orderItem}>
        <Image source={order.image} style={styles(colors).orderImage} />
        <View style={styles(colors).orderItemInfo}>
          <Text style={styles(colors).orderItemName}>{order.planName}</Text>
          <View style={styles(colors).orderItemMeta}>
            <Text style={styles(colors).orderItemPrice}>
              ₦{(order.price || order.totalAmount || 0).toLocaleString()}
            </Text>
            <Text style={styles(colors).orderItemCount}>
              {order.items} Items
            </Text>
          </View>
          <View style={styles(colors).ratingContainer}>
            <Ionicons name="star" size={14} color={colors.rating} />
            <Text style={styles(colors).ratingText}>4.8</Text>
          </View>
        </View>
        <TouchableOpacity style={styles(colors).reorderButton}>
          <Ionicons name="repeat" size={16} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Order Summary */}
      <View style={styles(colors).orderSummary}>
        <View style={styles(colors).summaryRow}>
          <Text style={styles(colors).summaryLabel}>Order Date</Text>
          <Text style={styles(colors).summaryValue}>{order.orderDate}</Text>
        </View>
        <View style={styles(colors).summaryRow}>
          <Text style={styles(colors).summaryLabel}>Total Amount</Text>
          <Text style={styles(colors).summaryValue}>
            ₦{(order.transaction?.total || order.totalAmount || order.price || 0).toLocaleString()}
          </Text>
        </View>
        <View style={styles(colors).summaryRow}>
          <Text style={styles(colors).summaryLabel}>Order ID</Text>
          <Text style={styles(colors).summaryValue}>#{order.id}</Text>
        </View>
      </View>

      {/* Action Buttons */}
      <View style={styles(colors).actionButtons}>
        {order.status === "paid" && (
          <TouchableOpacity
            style={styles(colors).primaryButton}
            onPress={() => navigation.navigate("Main", { screen: "Home" })}
          >
            <Text style={styles(colors).primaryButtonText}>Rate & Review</Text>
          </TouchableOpacity>
        )}

        {/* Show Cancel button for cancellable statuses */}
        {(order.status === "wait" || order.status === "processing") && (
          <TouchableOpacity
            style={styles(colors).secondaryButton}
            onPress={() => handleCancelOrder(order)}
          >
            <Text style={styles(colors).secondaryButtonText}>Cancel Order</Text>
          </TouchableOpacity>
        )}

        {/* Show Track Order only for orders being actively prepared or delivered - NOT for completed orders */}
        {selectedTab === "active" && 
          [
            "out_for_delivery",
            "en_route", 
            "ready",
            "preparing",
            "inprogress",
            "confirmed",
            "processing"
          ].includes(
            (order.status || order.orderStatus || "").toLowerCase()
          ) && (
          <TouchableOpacity
            style={styles(colors).primaryButton}
            onPress={async () => {
              const freshOrder = await getOrderDetails(order);
              navigation.navigate("TrackingScreen", {
                orderId: freshOrder._id || freshOrder.id,
                trackingId: freshOrder.trackingId || null,
                order: freshOrder,
              });
            }}
          >
            <Text style={styles(colors).primaryButtonText}>Track Order</Text>
          </TouchableOpacity>
        )}

        {/* Show "View Details" button for delivered orders */}
        {["delivered", "cancelled"].includes(
          (order.status || order.orderStatus || "").toLowerCase()
        ) && (
          <TouchableOpacity
            style={styles(colors).secondaryButton}
            onPress={async () => {
              const freshOrder = await getOrderDetails(order);
              navigation.navigate("OrderDetail", {
                order: freshOrder,
              });
            }}
          >
            <Text style={styles(colors).secondaryButtonText}>View Details</Text>
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  );

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
          return (
            status && !["cancelled", "delivered"].includes(status)
          );
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
  StyleSheet.create({
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
    orderCard: {
      backgroundColor: colors.cardBackground,
      borderRadius: THEME.borderRadius.large,
      padding: 20,
      marginBottom: 20,
      borderWidth: 1,
      borderColor: colors.border,
      ...THEME.shadows.medium,
    },
    orderHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 15,
    },
    orderTitle: {
      fontSize: 16,
      fontWeight: "600",
      color: colors.text,
    },
    statusBadge: {
      paddingHorizontal: 12,
      paddingVertical: 4,
      borderRadius: THEME.borderRadius.medium,
    },
    statusText: {
      fontSize: 12,
      fontWeight: "bold",
      color: colors.white,
    },
    orderItem: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 20,
      paddingBottom: 15,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    orderImage: {
      width: 70,
      height: 70,
      borderRadius: THEME.borderRadius.medium,
      marginRight: 15,
    },
    orderItemInfo: {
      flex: 1,
    },
    orderItemName: {
      fontSize: 16,
      fontWeight: "600",
      color: colors.text,
      marginBottom: 8,
    },
    orderItemMeta: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 5,
    },
    orderItemPrice: {
      fontSize: 16,
      fontWeight: "bold",
      color: colors.primary,
    },
    orderItemCount: {
      fontSize: 12,
      color: colors.textSecondary,
      fontWeight: "500",
    },
    ratingContainer: {
      flexDirection: "row",
      alignItems: "center",
    },
    ratingText: {
      fontSize: 12,
      color: colors.textSecondary,
      marginLeft: 4,
      fontWeight: "500",
    },
    reorderButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: `${colors.primary}20`,
      justifyContent: "center",
      alignItems: "center",
    },
    orderSummary: {
      marginBottom: 20,
      paddingBottom: 15,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    summaryRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 8,
    },
    summaryLabel: {
      fontSize: 14,
      color: colors.textSecondary,
    },
    summaryValue: {
      fontSize: 14,
      fontWeight: "500",
      color: colors.text,
    },
    actionButtons: {
      flexDirection: "row",
      gap: 10,
    },
    primaryButton: {
      flex: 1,
      backgroundColor: colors.primary,
      paddingVertical: 12,
      borderRadius: THEME.borderRadius.medium,
      alignItems: "center",
    },
    primaryButtonText: {
      color: colors.white,
      fontSize: 14,
      fontWeight: "600",
    },
    secondaryButton: {
      flex: 1,
      backgroundColor: colors.background,
      paddingVertical: 12,
      borderRadius: THEME.borderRadius.medium,
      alignItems: "center",
      borderWidth: 1,
      borderColor: colors.error,
    },
    secondaryButtonText: {
      color: colors.error,
      fontSize: 14,
      fontWeight: "600",
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
