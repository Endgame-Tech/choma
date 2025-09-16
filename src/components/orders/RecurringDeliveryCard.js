import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Dimensions,
  Modal,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../styles/theme";
import apiService from "../../services/api";
import { createStylesWithDMSans } from "../../utils/fontUtils";



const { width } = Dimensions.get("window");

const RecurringDeliveryCard = ({
  order,
  onContactSupport,
  onTrackDriver,
  style,
}) => {
  const { colors } = useTheme();
  const [confirmationModalVisible, setConfirmationModalVisible] =
    useState(false);
  const [actualConfirmationCode, setActualConfirmationCode] = useState(null);
  const [loadingCode, setLoadingCode] = useState(false);

  // Extract recurring delivery information
  const getDeliveryDay = () => {
    // Try multiple possible data sources for delivery day
    if (order?.deliveryDay) {
      return parseInt(order.deliveryDay);
    }

    if (order?.dayNumber) {
      return parseInt(order.dayNumber);
    }

    // Check if this is an activation order (first delivery)
    if (order?.recurringOrder?.isActivationOrder === true) {
      return 1;
    }

    // Check order type - "one-time" is usually the first/activation delivery
    if (order?.recurringOrder?.orderType === "one-time") {
      return 1;
    }

    // Check order type - "subscription-recurring" is usually Day 2+
    if (order?.recurringOrder?.orderType === "subscription-recurring") {
      return 2; // Or calculate based on subscription progression
    }

    // If we have subscription and delivery date info, calculate from that
    if (order?.subscription?.startDate && order?.deliveryDate) {
      const startDate = new Date(order.subscription.startDate);
      const deliveryDate = new Date(order.deliveryDate);
      const daysDiff = Math.floor(
        (deliveryDate - startDate) / (1000 * 60 * 60 * 24)
      );
      return Math.max(1, daysDiff + 1);
    }

    // Fallback to current date calculation if subscription start date exists
    if (order?.subscription?.startDate) {
      const startDate = new Date(order.subscription.startDate);
      const currentDate = new Date();
      const daysDiff = Math.floor(
        (currentDate - startDate) / (1000 * 60 * 60 * 24)
      );
      return Math.max(1, daysDiff + 1);
    }

    // Default to day 1 if no information is available
    return 1;
  };

  const getMealPlanName = () => {
    return (
      order?.orderItems?.planName ||
      order?.mealPlan?.name ||
      order?.subscription?.planName ||
      "Meal Plan"
    );
  };

  // Fetch driver assignment data to get confirmation code
  const fetchConfirmationCode = async () => {
    if (actualConfirmationCode) {
      return actualConfirmationCode; // Use cached value
    }

    setLoadingCode(true);
    try {
      // For now, just simulate loading since we need to find the correct API endpoint
      // TODO: Replace with actual API call once backend provides the endpoint
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Check if order has confirmation code in any field
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
    // Return cached actual code if available
    if (actualConfirmationCode) {
      return actualConfirmationCode;
    }

    // Check for driver assignment confirmation code first (from backend)
    if (order?.driverAssignment?.confirmationCode) {
      return order.driverAssignment.confirmationCode;
    }

    // Check direct order confirmation code field (added by backend)
    if (order?.confirmationCode) {
      return order.confirmationCode;
    }

    // Check other possible fields
    if (order?.deliveryCode) {
      return order.deliveryCode;
    }

    if (order?.pickupCode) {
      return order.pickupCode;
    }

    // For recurring deliveries, if no confirmation code is available,
    // temporarily show last 6 characters of order number until backend provides confirmation code
    if (order?.orderNumber) {
      const orderNumber = order.orderNumber.toString();
      return orderNumber.slice(-6).toUpperCase();
    }

    // Show pending status if no confirmation code is available yet
    return "PENDING";
  };

  const isOutForDelivery = () => {
    return (
      order?.orderStatus === "Out for Delivery" ||
      order?.status === "Out for Delivery"
    );
  };

  const isDelivered = () => {
    return order?.orderStatus === "Delivered" || order?.status === "Delivered";
  };

  const getStatusInfo = () => {
    if (isDelivered()) {
      return { title: "Delivered", color: "#4CAF50", icon: "checkmark-circle" };
    } else if (isOutForDelivery()) {
      return { title: "Out for Delivery", color: "#2196F3", icon: "car" };
    } else {
      return { title: "Preparing", color: "#FF9800", icon: "restaurant" };
    }
  };

  const status = getStatusInfo();

  return (
    <View style={[styles(colors).container, style]}>
      {/* Header with Day Information */}
      <View style={styles(colors).header}>
        <View style={styles(colors).dayInfo}>
          <Text style={styles(colors).dayLabel}>Day</Text>
          <Text style={styles(colors).dayNumber}>{getDeliveryDay()}</Text>
        </View>
        <View style={styles(colors).planInfo}>
          <Text style={styles(colors).planTitle}>of {getMealPlanName()}</Text>
          <View style={styles(colors).recurringBadge}>
            <Ionicons name="refresh" size={12} color={colors.primary} />
            <Text style={styles(colors).recurringText}>Recurring</Text>
          </View>
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
          <Text style={[styles(colors).statusText, { color: status.color }]}>
            {status.title}
          </Text>
        </View>

        {/* Confirmation Code Button */}
        {isOutForDelivery() && !isDelivered() && (
          <TouchableOpacity
            style={styles(colors).codeButton}
            onPress={async () => {
              await fetchConfirmationCode();
              setConfirmationModalVisible(true);
            }}
          >
            <Ionicons name="key" size={14} color={colors.white} />
            <Text style={styles(colors).codeButtonText}>View Code</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Order Details */}
      <View style={styles(colors).orderDetails}>
        <View style={styles(colors).detailRow}>
          <Text style={styles(colors).detailLabel}>Order #</Text>
          <Text style={styles(colors).detailValue}>
            {order?.orderNumber || "CHM001"}
          </Text>
        </View>
        <View style={styles(colors).detailRow}>
          <Text style={styles(colors).detailLabel}>Amount</Text>
          <Text style={styles(colors).detailValue}>
            ₦{(order?.totalAmount || 17929).toLocaleString()}
          </Text>
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

        {isOutForDelivery() && (
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
      </View>

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

    // Header Section
    header: {
      backgroundColor: colors.primary + "08",
      padding: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    dayInfo: {
      flexDirection: "row",
      alignItems: "baseline",
      marginBottom: 4,
    },
    dayLabel: {
      fontSize: 16,
      color: colors.textSecondary,
      fontWeight: "500",
      marginRight: 8,
    },
    dayNumber: {
      fontSize: 28,
      fontWeight: "800",
      color: colors.primary,
    },
    planInfo: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    planTitle: {
      fontSize: 18,
      fontWeight: "600",
      color: colors.text,
      flex: 1,
    },
    recurringBadge: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.primary + "15",
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 12,
    },
    recurringText: {
      fontSize: 11,
      fontWeight: "600",
      color: colors.primary,
      marginLeft: 4,
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
    },
    statusIcon: {
      width: 32,
      height: 32,
      borderRadius: 16,
      justifyContent: "center",
      alignItems: "center",
      marginRight: 12,
    },
    statusText: {
      fontSize: 16,
      fontWeight: "600",
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

    // Order Details
    orderDetails: {
      padding: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    detailRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 8,
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

export default RecurringDeliveryCard;
