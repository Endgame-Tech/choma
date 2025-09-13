import React from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../styles/theme";
import CompactOrderCard from "../orders/CompactOrderCard";
import RecurringDeliveryCard from "../orders/RecurringDeliveryCard";

const ActiveOrdersSection = ({
  orders = [],
  loading = false,
  navigation,
  onContactSupport,
  onReorder,
  onCancelOrder,
  onRateOrder,
  onTrackDriver,
}) => {
  const { colors } = useTheme();

  // Determine which card to use based on order type
  const isFirstDelivery = (order) => {
    return (
      order.recurringOrder?.isActivationOrder === true ||
      order.recurringOrder?.orderType === "one-time" ||
      (order.deliveryDay && parseInt(order.deliveryDay) === 1) ||
      (order.dayNumber && parseInt(order.dayNumber) === 1)
    );
  };

  const isSubscriptionOrder = (order) => {
    return (
      order.isSubscriptionOrder === true ||
      order.orderNumber?.startsWith("SUB") ||
      order._id?.startsWith("sub_") ||
      order.id?.startsWith("sub_") ||
      order.orderType === "subscription" ||
      order.recurringOrder !== undefined
    );
  };

  const renderOrderCard = (order, index) => {
    const isSubscription = isSubscriptionOrder(order);
    const isFirst = isFirstDelivery(order);

    // Use RecurringDeliveryCard for subscription orders EXCEPT the first delivery
    if (isSubscription && !isFirst) {
      return (
        <RecurringDeliveryCard
          key={order._id || order.id || index}
          order={order}
          onContactSupport={onContactSupport}
          onTrackDriver={onTrackDriver}
          style={styles(colors).orderCard}
        />
      );
    }

    // Use CompactOrderCard for regular orders and first delivery of subscriptions
    return (
      <CompactOrderCard
        key={order._id || order.id || index}
        order={order}
        onContactSupport={onContactSupport}
        onReorder={onReorder}
        onCancelOrder={onCancelOrder}
        onRateOrder={onRateOrder}
        onTrackDriver={onTrackDriver}
        style={styles(colors).orderCard}
      />
    );
  };

  if (loading) {
    return (
      <View style={styles(colors).section}>
        <View style={styles(colors).sectionHeader}>
          <Text style={styles(colors).sectionTitle}>Active Orders</Text>
        </View>
        <View style={styles(colors).loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles(colors).loadingText}>Loading your orders...</Text>
        </View>
      </View>
    );
  }

  if (!orders || orders.length === 0) {
    return (
      <View style={styles(colors).section}>
        <View style={styles(colors).sectionHeader}>
          <Text style={styles(colors).sectionTitle}>Active Orders</Text>
        </View>
        <View style={styles(colors).emptyContainer}>
          <Ionicons name="receipt-outline" size={60} color={colors.textMuted} />
          <Text style={styles(colors).emptyTitle}>No Active Orders</Text>
          <Text style={styles(colors).emptySubtitle}>
            Your active orders will appear here once you place an order
          </Text>
          <TouchableOpacity
            style={styles(colors).browseButton}
            onPress={() => navigation.navigate("Search")}
          >
            <Text style={styles(colors).browseButtonText}>Browse Meal Plans</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles(colors).section}>
      <View style={styles(colors).sectionHeader}>
        <Text style={styles(colors).sectionTitle}>Active Orders</Text>
        <TouchableOpacity
          onPress={() => navigation.navigate("OrderTracking")}
          style={styles(colors).seeAllButton}
        >
          <Text style={styles(colors).seeAllText}>See All</Text>
          <Ionicons name="chevron-forward" size={16} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles(colors).scrollContainer}
      >
        {orders.map(renderOrderCard)}
      </ScrollView>
    </View>
  );
};

const styles = (colors) =>
  StyleSheet.create({
    section: {
      marginBottom: 24,
    },
    sectionHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingHorizontal: 20,
      marginBottom: 16,
    },
    sectionTitle: {
      fontSize: 20,
      fontWeight: "700",
      color: colors.text,
    },
    seeAllButton: {
      flexDirection: "row",
      alignItems: "center",
    },
    seeAllText: {
      fontSize: 14,
      fontWeight: "600",
      color: colors.primary,
      marginRight: 4,
    },
    scrollContainer: {
      paddingLeft: 20,
      paddingRight: 20,
    },
    orderCard: {
      marginRight: 16,
      width: 280,
    },
    loadingContainer: {
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 40,
    },
    loadingText: {
      fontSize: 16,
      color: colors.textSecondary,
      marginTop: 12,
    },
    emptyContainer: {
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 40,
      paddingHorizontal: 40,
    },
    emptyTitle: {
      fontSize: 18,
      fontWeight: "600",
      color: colors.text,
      marginTop: 16,
      marginBottom: 8,
    },
    emptySubtitle: {
      fontSize: 14,
      color: colors.textSecondary,
      textAlign: "center",
      lineHeight: 20,
      marginBottom: 24,
    },
    browseButton: {
      backgroundColor: colors.primary,
      paddingHorizontal: 24,
      paddingVertical: 12,
      borderRadius: 25,
    },
    browseButtonText: {
      fontSize: 16,
      fontWeight: "600",
      color: colors.background,
    },
  });

export default ActiveOrdersSection;