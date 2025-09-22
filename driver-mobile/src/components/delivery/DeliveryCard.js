import React from "react";
import { View, TouchableOpacity, Image, Animated } from "react-native";
import { useTheme } from "../../styles/theme";
import { createStylesWithDMSans } from "../../utils/fontUtils";
import CustomText from "../ui/CustomText";
import { DELIVERY_STATUSES } from "../../utils/constants";
import { Ionicons } from "@expo/vector-icons";

const DeliveryCard = ({ delivery, onPress, style = {} }) => {
  const { colors, isDark } = useTheme();

  const getStatusInfo = (status) => {
    switch (status) {
      case DELIVERY_STATUSES.ASSIGNED:
        return {
          color: colors.warning,
          icon: "flash-outline",
          text: "NEW",
          bgColor: `${colors.warning}15`,
        };
      case DELIVERY_STATUSES.ACCEPTED:
        return {
          color: colors.info,
          icon: "checkmark-circle-outline",
          text: "ACCEPTED",
          bgColor: `${colors.info}15`,
        };
      case DELIVERY_STATUSES.PICKED_UP:
        return {
          color: colors.primary,
          icon: "bag-check-outline",
          text: "PICKED UP",
          bgColor: `${colors.primary}15`,
        };
      case DELIVERY_STATUSES.IN_TRANSIT:
        return {
          color: colors.primary,
          icon: "car-sport-outline",
          text: "IN TRANSIT",
          bgColor: `${colors.primary}15`,
        };
      case DELIVERY_STATUSES.DELIVERED:
        return {
          color: colors.success,
          icon: "checkmark-done-outline",
          text: "DELIVERED",
          bgColor: `${colors.success}15`,
        };
      case DELIVERY_STATUSES.CANCELLED:
      case DELIVERY_STATUSES.FAILED:
        return {
          color: colors.error,
          icon: "close-circle-outline",
          text: "CANCELLED",
          bgColor: `${colors.error}15`,
        };
      default:
        return {
          color: colors.textSecondary,
          icon: "help-circle-outline",
          text: status?.toUpperCase() || "UNKNOWN",
          bgColor: `${colors.textSecondary}15`,
        };
    }
  };

  const formatTime = (dateString) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now - date) / (1000 * 60 * 60);

    if (diffInHours < 1) {
      const diffInMinutes = Math.floor((now - date) / (1000 * 60));
      return `${diffInMinutes}m ago`;
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)}h ago`;
    } else {
      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      });
    }
  };

  const formatDistance = (distance) => {
    if (!distance) return "N/A";
    if (distance < 1000) {
      return `${Math.round(distance)}m`;
    }
    return `${(distance / 1000).toFixed(1)}km`;
  };

  const formatEarnings = (earnings) => {
    if (!earnings) return "₦0";
    return `₦${parseFloat(earnings).toLocaleString()}`;
  };

  const statusInfo = getStatusInfo(delivery.status);

  return (
    <TouchableOpacity
      style={[styles(colors).container, style]}
      onPress={() => onPress(delivery)}
      activeOpacity={0.7}
    >
      {/* Status Indicator */}
      <View
        style={[
          styles(colors).statusIndicator,
          { backgroundColor: statusInfo.color },
        ]}
      />

      {/* Header Section */}
      <View style={styles(colors).header}>
        <View style={styles(colors).orderInfo}>
          <View style={styles(colors).orderIdContainer}>
            <CustomText style={styles(colors).orderIdLabel}>Order</CustomText>
            <CustomText style={styles(colors).orderId}>
              #{delivery.orderId || delivery.id}
            </CustomText>
          </View>
          <CustomText style={styles(colors).orderTime}>
            {formatTime(delivery.createdAt)}
          </CustomText>
        </View>

        <View
          style={[
            styles(colors).statusBadge,
            { backgroundColor: statusInfo.bgColor },
          ]}
        >
          <Ionicons
            name={statusInfo.icon}
            size={14}
            color={statusInfo.color}
            style={styles(colors).statusIcon}
          />
          <CustomText
            style={[styles(colors).statusText, { color: statusInfo.color }]}
          >
            {statusInfo.text}
          </CustomText>
        </View>
      </View>

      {/* Customer Section */}
      <View style={styles(colors).customerSection}>
        <View style={styles(colors).customerInfo}>
          <View style={styles(colors).customerHeader}>
            <Ionicons
              name="person-circle-outline"
              size={20}
              color={colors.textSecondary}
            />
            <CustomText style={styles(colors).customerName}>
              {delivery.customerName || "Customer"}
            </CustomText>
          </View>
        </View>

        <View style={styles(colors).locationContainer}>
          <Ionicons
            name="location-outline"
            size={16}
            color={colors.textSecondary}
            style={styles(colors).locationIcon}
          />
          <CustomText style={styles(colors).deliveryAddress} numberOfLines={2}>
            {delivery.deliveryAddress}
          </CustomText>
        </View>
      </View>

      {/* Metrics Section */}
      <View style={styles(colors).metricsSection}>
        <View style={styles(colors).metricItem}>
          <View
            style={[
              styles(colors).metricIconContainer,
              { backgroundColor: `${colors.primary}15` },
            ]}
          >
            <Ionicons
              name="navigate-outline"
              size={16}
              color={colors.primary}
            />
          </View>
          <View style={styles(colors).metricContent}>
            <CustomText style={styles(colors).metricValue}>
              {formatDistance(delivery.distance)}
            </CustomText>
            <CustomText style={styles(colors).metricLabel}>Distance</CustomText>
          </View>
        </View>

        <View style={styles(colors).metricItem}>
          <View
            style={[
              styles(colors).metricIconContainer,
              { backgroundColor: `${colors.success}15` },
            ]}
          >
            <Ionicons name="wallet-outline" size={16} color={colors.success} />
          </View>
          <View style={styles(colors).metricContent}>
            <CustomText style={styles(colors).metricValue}>
              {formatEarnings(delivery.earnings)}
            </CustomText>
            <CustomText style={styles(colors).metricLabel}>Earnings</CustomText>
          </View>
        </View>

        <View style={styles(colors).metricItem}>
          <View
            style={[
              styles(colors).metricIconContainer,
              { backgroundColor: `${colors.info}15` },
            ]}
          >
            <Ionicons name="bag-outline" size={16} color={colors.info} />
          </View>
          <View style={styles(colors).metricContent}>
            <CustomText style={styles(colors).metricValue}>
              {delivery.itemCount || 1}
            </CustomText>
            <CustomText style={styles(colors).metricLabel}>Items</CustomText>
          </View>
        </View>
      </View>

      {/* Action Section */}
      {delivery.status === DELIVERY_STATUSES.ASSIGNED && (
        <View style={styles(colors).actionSection}>
          <View style={styles(colors).actionButton}>
            <Ionicons name="flash" size={16} color={colors.white} />
            <CustomText style={styles(colors).actionText}>
              Accept Delivery
            </CustomText>
          </View>
        </View>
      )}

      {delivery.status === DELIVERY_STATUSES.IN_TRANSIT && (
        <View style={styles(colors).actionSection}>
          <View
            style={[
              styles(colors).actionButton,
              { backgroundColor: colors.success },
            ]}
          >
            <Ionicons name="checkmark" size={16} color={colors.white} />
            <CustomText style={styles(colors).actionText}>
              Mark as Delivered
            </CustomText>
          </View>
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = (colors) =>
  createStylesWithDMSans({
    container: {
      backgroundColor: colors.cardBackground,
      borderRadius: 16,
      marginHorizontal: 16,
      marginVertical: 8,
      overflow: "hidden",
      borderWidth: 1,
      borderColor: colors.border,
    },
    statusIndicator: {
      height: 4,
      width: "100%",
    },
    header: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-start",
      padding: 20,
      paddingBottom: 12,
    },
    orderInfo: {
      flex: 1,
    },
    orderIdContainer: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 4,
    },
    orderIdLabel: {
      fontSize: 12,
      color: colors.textSecondary,
      marginRight: 6,
      fontWeight: "500",
    },
    orderId: {
      fontSize: 18,
      fontWeight: "700",
      color: colors.text,
    },
    orderTime: {
      fontSize: 13,
      color: colors.textSecondary,
      fontWeight: "400",
    },
    statusBadge: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 12,
    },
    statusIcon: {
      marginRight: 4,
    },
    statusText: {
      fontSize: 11,
      fontWeight: "600",
    },
    customerSection: {
      paddingHorizontal: 20,
      paddingBottom: 16,
    },
    customerInfo: {
      marginBottom: 12,
    },
    customerHeader: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 8,
    },
    customerName: {
      fontSize: 16,
      fontWeight: "600",
      color: colors.text,
      marginLeft: 8,
    },
    locationContainer: {
      flexDirection: "row",
      alignItems: "flex-start",
      backgroundColor: colors.surface,
      padding: 12,
      borderRadius: 10,
    },
    locationIcon: {
      marginRight: 8,
      marginTop: 2,
    },
    deliveryAddress: {
      fontSize: 14,
      color: colors.text,
      lineHeight: 20,
      flex: 1,
      fontWeight: "400",
    },
    metricsSection: {
      flexDirection: "row",
      paddingHorizontal: 20,
      paddingVertical: 16,
      backgroundColor: colors.surface,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    metricItem: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
    },
    metricIconContainer: {
      width: 32,
      height: 32,
      borderRadius: 16,
      justifyContent: "center",
      alignItems: "center",
      marginRight: 8,
    },
    metricContent: {
      flex: 1,
    },
    metricValue: {
      fontSize: 16,
      fontWeight: "700",
      color: colors.text,
      marginBottom: 2,
    },
    metricLabel: {
      fontSize: 11,
      color: colors.textSecondary,
      fontWeight: "500",
    },
    actionSection: {
      padding: 20,
      paddingTop: 16,
    },
    actionButton: {
      backgroundColor: colors.primary,
      borderRadius: 12,
      paddingVertical: 14,
      flexDirection: "row",
      justifyContent: "center",
      alignItems: "center",
    },
    actionText: {
      fontSize: 16,
      fontWeight: "600",
      color: colors.white,
      marginLeft: 6,
    },
  });

export default DeliveryCard;
