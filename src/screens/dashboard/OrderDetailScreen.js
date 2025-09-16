// src/screens/dashboard/OrderDetailScreen.js - Modern Dark Theme Update
import React from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  Image,
  StatusBar,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "../../styles/theme";
import { THEME } from "../../utils/colors";
import StandardHeader from "../../components/layout/Header";
import { createStylesWithDMSans } from "../../utils/fontUtils";

const OrderDetailScreen = ({ route, navigation }) => {
  const { colors } = useTheme();
  const { order } = route.params || {};

  if (!order) {
    return (
      <SafeAreaView style={styles(colors).container}>
        <StatusBar
          barStyle="light-content"
          backgroundColor={colors.background}
        />

        <View style={styles(colors).errorContainer}>
          <Ionicons name="alert-circle" size={80} color={colors.error} />
          <Text style={styles(colors).errorTitle}>Order not found</Text>
          <Text style={styles(colors).errorText}>
            The order you're looking for doesn't exist or has been removed.
          </Text>
          <TouchableOpacity
            style={styles(colors).retryButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles(colors).retryButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles(colors).container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.background} />

      <StandardHeader
        title="Order Details"
        onBackPress={() => navigation.goBack()}
        rightIcon="ellipsis-horizontal"
        onRightPress={() => {
          /* Add more options functionality */
        }}
      />

      <ScrollView
        style={styles(colors).content}
        showsVerticalScrollIndicator={false}
      >
        {/* Order Status Header */}
        <View style={styles(colors).statusCard}>
          <LinearGradient
            colors={[order.statusColor, `${order.statusColor}CC`]}
            style={styles(colors).statusGradient}
          >
            <View style={styles(colors).statusContent}>
              <View style={styles(colors).statusIconContainer}>
                <Ionicons
                  name={
                    order.status === "paid"
                      ? "checkmark-circle"
                      : order.status === "processing"
                        ? "time"
                        : "hourglass"
                  }
                  size={40}
                  color={colors.white}
                />
              </View>
              <Text style={styles(colors).statusTitle}>{order.statusText}</Text>
              <Text style={styles(colors).orderId}>Order #{order.id}</Text>
              <Text style={styles(colors).orderDate}>
                Ordered on {order.orderDate}
              </Text>
            </View>
          </LinearGradient>
        </View>

        {/* Order Item */}
        <View style={styles(colors).section}>
          <Text style={styles(colors).sectionTitle}>Order Items</Text>
          <View style={styles(colors).itemCard}>
            <Image source={order.image} style={styles(colors).itemImage} />
            <View style={styles(colors).itemInfo}>
              <Text style={styles(colors).itemName}>{order.planName}</Text>
              <View style={styles(colors).itemMeta}>
                <View style={styles(colors).ratingContainer}>
                  <Ionicons name="star" size={14} color={colors.rating} />
                  <Text style={styles(colors).ratingText}>4.8</Text>
                </View>
                <Text style={styles(colors).itemCount}>
                  {order.items} Items
                </Text>
              </View>
              <Text style={styles(colors).itemPrice}>
                ₦{(order.price || order.totalAmount || 0).toLocaleString()}
              </Text>
            </View>
            <TouchableOpacity style={styles(colors).reorderButton}>
              <Ionicons name="repeat" size={20} color={colors.primary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Delivery Confirmation Code */}
        {["completed", "ready", "out for delivery", "preparing"].includes(
          (order.status || order.orderStatus || "").toLowerCase()
        ) && (
          <View style={styles(colors).section}>
            <Text style={styles(colors).sectionTitle}>
              Delivery Confirmation
            </Text>
            <View style={styles(colors).confirmationCard}>
              <View style={styles(colors).confirmationHeader}>
                <Ionicons
                  name="shield-checkmark"
                  size={24}
                  color={colors.primary}
                />
                <Text style={styles(colors).confirmationTitle}>
                  Your Delivery Code
                </Text>
              </View>
              <View style={styles(colors).codeContainer}>
                <Text style={styles(colors).confirmationCode}>
                  {order.deliveryConfirmationCode ||
                    (order.orderNumber
                      ? order.orderNumber.toString().slice(-6).toUpperCase()
                      : order.id
                        ? order.id
                            .toString()
                            .slice(-6)
                            .toUpperCase()
                            .padStart(6, "0")
                        : "N/A")}
                </Text>
              </View>
              <Text style={styles(colors).confirmationText}>
                Give this 6-digit code to your delivery driver when they arrive
              </Text>
            </View>
          </View>
        )}

        {/* Delivery Tracking - Real order journey */}
        {!["cancelled"].includes(
          (order.status || order.orderStatus || "").toLowerCase()
        ) && (
          <View style={styles(colors).section}>
            <Text style={styles(colors).sectionTitle}>Order Journey</Text>
            <View style={styles(colors).trackingCard}>
              <View style={styles(colors).trackingSteps}>
                {/* Step 1: Order Confirmed - Always completed */}
                <View
                  style={[
                    styles(colors).trackingStep,
                    styles(colors).trackingStepCompleted,
                  ]}
                >
                  <View
                    style={[
                      styles(colors).trackingIcon,
                      styles(colors).trackingIconCompleted,
                    ]}
                  >
                    <Ionicons name="checkmark" size={16} color={colors.white} />
                  </View>
                  <Text style={styles(colors).trackingLabel}>
                    Order Confirmed
                  </Text>
                </View>

                {/* Step 2: Preparing - Completed when preparing/processing */}
                <View
                  style={[
                    styles(colors).trackingStep,
                    [
                      "preparing",
                      "processing",
                      "completed",
                      "ready",
                      "out for delivery",
                      "delivered",
                    ].includes(
                      (order.status || order.orderStatus || "").toLowerCase()
                    ) && styles(colors).trackingStepCompleted,
                  ]}
                >
                  <View
                    style={[
                      styles(colors).trackingIcon,
                      [
                        "preparing",
                        "processing",
                        "completed",
                        "ready",
                        "out for delivery",
                        "delivered",
                      ].includes(
                        (order.status || order.orderStatus || "").toLowerCase()
                      ) && styles(colors).trackingIconCompleted,
                    ]}
                  >
                    <Ionicons
                      name="restaurant"
                      size={16}
                      color={
                        [
                          "preparing",
                          "processing",
                          "completed",
                          "ready",
                          "out for delivery",
                          "delivered",
                        ].includes(
                          (
                            order.status ||
                            order.orderStatus ||
                            ""
                          ).toLowerCase()
                        )
                          ? colors.white
                          : colors.textMuted
                      }
                    />
                  </View>
                  <Text style={styles(colors).trackingLabel}>
                    Chef Preparing
                  </Text>
                </View>

                {/* Step 3: Ready for Pickup - Completed when chef finished */}
                <View
                  style={[
                    styles(colors).trackingStep,
                    [
                      "completed",
                      "ready",
                      "out for delivery",
                      "delivered",
                    ].includes(
                      (order.status || order.orderStatus || "").toLowerCase()
                    ) && styles(colors).trackingStepCompleted,
                  ]}
                >
                  <View
                    style={[
                      styles(colors).trackingIcon,
                      [
                        "completed",
                        "ready",
                        "out for delivery",
                        "delivered",
                      ].includes(
                        (order.status || order.orderStatus || "").toLowerCase()
                      ) && styles(colors).trackingIconCompleted,
                    ]}
                  >
                    <Ionicons
                      name="checkmark-circle"
                      size={16}
                      color={
                        [
                          "completed",
                          "ready",
                          "out for delivery",
                          "delivered",
                        ].includes(
                          (
                            order.status ||
                            order.orderStatus ||
                            ""
                          ).toLowerCase()
                        )
                          ? colors.white
                          : colors.textMuted
                      }
                    />
                  </View>
                  <Text style={styles(colors).trackingLabel}>
                    Ready for Pickup
                  </Text>
                </View>

                {/* Step 4: Out for Delivery - When driver picks up */}
                <View
                  style={[
                    styles(colors).trackingStep,
                    ["out for delivery", "delivered"].includes(
                      (order.status || order.orderStatus || "").toLowerCase()
                    ) && styles(colors).trackingStepCompleted,
                  ]}
                >
                  <View
                    style={[
                      styles(colors).trackingIcon,
                      ["out for delivery", "delivered"].includes(
                        (order.status || order.orderStatus || "").toLowerCase()
                      ) && styles(colors).trackingIconCompleted,
                    ]}
                  >
                    <Ionicons
                      name="car"
                      size={16}
                      color={
                        ["out for delivery", "delivered"].includes(
                          (
                            order.status ||
                            order.orderStatus ||
                            ""
                          ).toLowerCase()
                        )
                          ? colors.white
                          : colors.textMuted
                      }
                    />
                  </View>
                  <Text style={styles(colors).trackingLabel}>
                    Out for Delivery
                  </Text>
                </View>

                {/* Step 5: Delivered */}
                <View
                  style={[
                    styles(colors).trackingStep,
                    (order.status || order.orderStatus || "").toLowerCase() ===
                      "delivered" && styles(colors).trackingStepCompleted,
                  ]}
                >
                  <View
                    style={[
                      styles(colors).trackingIcon,
                      (
                        order.status ||
                        order.orderStatus ||
                        ""
                      ).toLowerCase() === "delivered" &&
                        styles(colors).trackingIconCompleted,
                    ]}
                  >
                    <Ionicons
                      name="home"
                      size={16}
                      color={
                        (
                          order.status ||
                          order.orderStatus ||
                          ""
                        ).toLowerCase() === "delivered"
                          ? colors.white
                          : colors.textMuted
                      }
                    />
                  </View>
                  <Text style={styles(colors).trackingLabel}>Delivered</Text>
                </View>
              </View>
            </View>
          </View>
        )}

        {/* Delivery Information */}
        <View style={styles(colors).section}>
          <Text style={styles(colors).sectionTitle}>Delivery Information</Text>
          <View style={styles(colors).deliveryCard}>
            <View style={styles(colors).deliveryRow}>
              <Ionicons name="person" size={20} color={colors.primary} />
              <Text style={styles(colors).deliveryText}>
                {order.deliveryInfo.name}
              </Text>
            </View>
            <View style={styles(colors).deliveryRow}>
              <Ionicons name="call" size={20} color={colors.primary} />
              <Text style={styles(colors).deliveryText}>
                {order.deliveryInfo.phone}
              </Text>
            </View>
            <View style={styles(colors).deliveryRow}>
              <Ionicons name="location" size={20} color={colors.primary} />
              <Text style={styles(colors).deliveryText}>
                {order.deliveryInfo.address}
              </Text>
            </View>
            <View style={styles(colors).deliveryRow}>
              <Ionicons name="business" size={20} color={colors.primary} />
              <Text style={styles(colors).deliveryText}>
                {order.deliveryInfo.city}
              </Text>
            </View>
          </View>
        </View>

        {/* Payment Summary */}
        <View style={styles(colors).section}>
          <Text style={styles(colors).sectionTitle}>Payment Summary</Text>
          <View style={styles(colors).summaryCard}>
            <View style={styles(colors).summaryRow}>
              <Text style={styles(colors).summaryLabel}>Subtotal</Text>
              <Text style={styles(colors).summaryValue}>
                ₦{(order.transaction?.subtotal || 0).toLocaleString()}
              </Text>
            </View>
            <View style={styles(colors).summaryRow}>
              <Text style={styles(colors).summaryLabel}>Delivery</Text>
              <Text style={styles(colors).summaryValue}>
                {(order.transaction?.delivery || 0) === 0
                  ? "Free"
                  : `₦${(order.transaction?.delivery || 0).toLocaleString()}`}
              </Text>
            </View>
            <View style={styles(colors).summaryRow}>
              <Text style={styles(colors).summaryLabel}>Tax</Text>
              <Text style={styles(colors).summaryValue}>
                ₦{(order.transaction?.tax || 0).toLocaleString()}
              </Text>
            </View>
            <View style={[styles(colors).summaryRow, styles(colors).totalRow]}>
              <Text style={styles(colors).totalLabel}>Total</Text>
              <Text style={styles(colors).totalValue}>
                ₦
                {(
                  order.transaction?.total ||
                  order.totalAmount ||
                  order.price ||
                  0
                ).toLocaleString()}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles(colors).bottomPadding} />
      </ScrollView>

      {/* Action Buttons */}
      <View style={styles(colors).actionSection}>
        {order.status === "wait" && (
          <TouchableOpacity style={styles(colors).cancelButton}>
            <Text style={styles(colors).cancelButtonText}>Cancel Order</Text>
          </TouchableOpacity>
        )}

        {order.status === "paid" && (
          <View style={styles(colors).actionButtonsRow}>
            <TouchableOpacity style={styles(colors).reorderButtonFull}>
              <Ionicons name="repeat" size={20} color={colors.primary} />
              <Text style={styles(colors).reorderButtonText}>Reorder</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles(colors).rateButton}>
              <Ionicons name="star" size={20} color={colors.white} />
              <Text style={styles(colors).rateButtonText}>Rate & Review</Text>
            </TouchableOpacity>
          </View>
        )}

        {order.status === "processing" && (
          <TouchableOpacity style={styles(colors).trackButton}>
            <Ionicons name="location" size={20} color={colors.white} />
            <Text style={styles(colors).trackButtonText}>Track Order</Text>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = (colors) =>
  createStylesWithDMSans({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    placeholder: {
      width: 40,
    },
    content: {
      flex: 1,
      padding: 20,
    },
    errorContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      paddingHorizontal: 40,
    },
    errorTitle: {
      fontSize: 24,
      fontWeight: "bold",
      color: colors.text,
      marginTop: 20,
      marginBottom: 10,
    },
    errorText: {
      fontSize: 16,
      color: colors.textSecondary,
      textAlign: "center",
      marginBottom: 30,
      lineHeight: 24,
    },
    retryButton: {
      backgroundColor: colors.primary,
      paddingHorizontal: 30,
      paddingVertical: 15,
      borderRadius: THEME.borderRadius.large,
    },
    retryButtonText: {
      color: colors.white,
      fontSize: 16,
      fontWeight: "600",
    },
    statusCard: {
      borderRadius: THEME.borderRadius.large,
      marginBottom: 20,
      overflow: "hidden",
    },
    statusGradient: {
      padding: 25,
    },
    statusContent: {
      alignItems: "center",
    },
    statusIconContainer: {
      width: 80,
      height: 80,
      borderRadius: 40,
      backgroundColor: "rgba(255,255,255,0.2)",
      justifyContent: "center",
      alignItems: "center",
      marginBottom: 15,
    },
    statusTitle: {
      fontSize: 24,
      fontWeight: "bold",
      color: colors.white,
      marginBottom: 5,
    },
    orderId: {
      fontSize: 16,
      fontWeight: "600",
      color: colors.white,
      marginBottom: 5,
    },
    orderDate: {
      fontSize: 14,
      color: "rgba(255,255,255,0.8)",
    },
    section: {
      marginBottom: 20,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: "600",
      color: colors.text,
      marginBottom: 15,
    },
    itemCard: {
      backgroundColor: colors.cardBackground,
      borderRadius: THEME.borderRadius.large,
      padding: 16,
      flexDirection: "row",
      alignItems: "center",
      borderWidth: 1,
      borderColor: colors.border,
    },
    itemImage: {
      width: 70,
      height: 70,
      borderRadius: THEME.borderRadius.medium,
      marginRight: 16,
    },
    itemInfo: {
      flex: 1,
    },
    itemName: {
      fontSize: 16,
      fontWeight: "600",
      color: colors.text,
      marginBottom: 8,
    },
    itemMeta: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 8,
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
    itemCount: {
      fontSize: 12,
      color: colors.textSecondary,
    },
    itemPrice: {
      fontSize: 16,
      fontWeight: "bold",
      color: colors.primary,
    },
    reorderButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: `${colors.primary}20`,
      justifyContent: "center",
      alignItems: "center",
    },
    trackingCard: {
      backgroundColor: colors.cardBackground,
      borderRadius: THEME.borderRadius.large,
      padding: 20,
      borderWidth: 1,
      borderColor: colors.border,
    },
    trackingSteps: {
      gap: 20,
    },
    trackingStep: {
      flexDirection: "row",
      alignItems: "center",
    },
    trackingStepCompleted: {
      opacity: 1,
    },
    trackingIcon: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: colors.textMuted,
      justifyContent: "center",
      alignItems: "center",
      marginRight: 15,
    },
    trackingIconCompleted: {
      backgroundColor: colors.success,
    },
    trackingLabel: {
      fontSize: 16,
      color: colors.text,
      fontWeight: "500",
    },
    deliveryCard: {
      backgroundColor: colors.cardBackground,
      borderRadius: THEME.borderRadius.large,
      padding: 16,
      borderWidth: 1,
      borderColor: colors.border,
    },
    deliveryRow: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 15,
    },
    deliveryText: {
      marginLeft: 12,
      fontSize: 16,
      color: colors.text,
      flex: 1,
    },
    summaryCard: {
      backgroundColor: colors.cardBackground,
      borderRadius: THEME.borderRadius.large,
      padding: 16,
      borderWidth: 1,
      borderColor: colors.border,
    },
    summaryRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 12,
    },
    summaryLabel: {
      fontSize: 16,
      color: colors.textSecondary,
    },
    summaryValue: {
      fontSize: 16,
      color: colors.text,
      fontWeight: "500",
    },
    totalRow: {
      borderTopWidth: 1,
      borderTopColor: colors.border,
      paddingTop: 12,
      marginTop: 8,
      marginBottom: 0,
    },
    totalLabel: {
      fontSize: 18,
      fontWeight: "600",
      color: colors.text,
    },
    totalValue: {
      fontSize: 20,
      fontWeight: "bold",
      color: colors.primary,
    },
    bottomPadding: {
      height: 20,
    },
    actionSection: {
      padding: 20,
      backgroundColor: colors.cardBackground,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    actionButtonsRow: {
      flexDirection: "row",
      gap: 15,
    },
    cancelButton: {
      backgroundColor: colors.error,
      borderRadius: THEME.borderRadius.large,
      paddingVertical: 16,
      alignItems: "center",
    },
    cancelButtonText: {
      color: colors.white,
      fontSize: 16,
      fontWeight: "600",
    },
    reorderButtonFull: {
      flex: 1,
      flexDirection: "row",
      backgroundColor: colors.background,
      paddingVertical: 16,
      borderRadius: THEME.borderRadius.large,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1,
      borderColor: colors.primary,
      gap: 8,
    },
    reorderButtonText: {
      color: colors.primary,
      fontSize: 16,
      fontWeight: "600",
    },
    rateButton: {
      flex: 1,
      flexDirection: "row",
      backgroundColor: colors.primary,
      paddingVertical: 16,
      borderRadius: THEME.borderRadius.large,
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
    },
    rateButtonText: {
      color: colors.white,
      fontSize: 16,
      fontWeight: "600",
    },
    trackButton: {
      flexDirection: "row",
      backgroundColor: colors.primary,
      paddingVertical: 16,
      borderRadius: THEME.borderRadius.large,
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
    },
    trackButtonText: {
      color: colors.white,
      fontSize: 16,
      fontWeight: "600",
    },
    confirmationCard: {
      backgroundColor: colors.cardBackground,
      borderRadius: THEME.borderRadius.large,
      padding: 20,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: "center",
    },
    confirmationHeader: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 15,
      gap: 8,
    },
    confirmationTitle: {
      fontSize: 18,
      fontWeight: "600",
      color: colors.text,
    },
    codeContainer: {
      backgroundColor: `${colors.primary}20`,
      paddingHorizontal: 20,
      paddingVertical: 15,
      borderRadius: THEME.borderRadius.medium,
      marginBottom: 15,
    },
    confirmationCode: {
      fontSize: 24,
      fontWeight: "bold",
      color: colors.primary,
      letterSpacing: 2,
      fontFamily: "monospace",
    },
    confirmationText: {
      fontSize: 14,
      color: colors.textSecondary,
      textAlign: "center",
      lineHeight: 20,
    },
  });

export default OrderDetailScreen;
