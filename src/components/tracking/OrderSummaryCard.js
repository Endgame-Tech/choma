import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "../../utils/colors";
import { createStylesWithDMSans } from "../../utils/fontUtils";

const OrderSummaryCard = ({ order, colors, onClose }) => {
  if (!order) return null;

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case "preparing":
        return "#FF9800";
      case "ready":
        return "#4CAF50";
      case "out_for_delivery":
      case "delivering":
        return "#2196F3";
      case "delivered":
        return "#4CAF50";
      default:
        return COLORS.primary;
    }
  };

  const formatOrderItems = () => {
    if (order.meals && order.meals.length > 0) {
      return order.meals;
    }

    // Fallback to order items
    return order.items || [];
  };

  return (
    <View
      style={[styles.container, { backgroundColor: colors.cardBackground }]}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={[styles.title, { color: colors.text }]}>
            Order Summary
          </Text>
          <Text style={[styles.orderNumber, { color: colors.textSecondary }]}>
            #{order._id?.slice(-6) || order.id?.slice(-6) || "------"}
          </Text>
        </View>

        <TouchableOpacity style={styles.closeButton} onPress={onClose}>
          <Ionicons name="close" size={24} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>

      {/* Order Status */}
      <View style={styles.statusContainer}>
        <View
          style={[
            styles.statusDot,
            { backgroundColor: getStatusColor(order.status) },
          ]}
        />
        <Text style={[styles.statusText, { color: colors.text }]}>
          {order.status
            ? order.status.replace("_", " ").toUpperCase()
            : "PROCESSING"}
        </Text>
        <View style={styles.statusTime}>
          <Ionicons
            name="time-outline"
            size={14}
            color={colors.textSecondary}
          />
          <Text style={[styles.timeText, { color: colors.textSecondary }]}>
            {order.estimatedDeliveryTime || "Calculating..."}
          </Text>
        </View>
      </View>

      {/* Order Items */}
      <ScrollView
        style={styles.itemsContainer}
        showsVerticalScrollIndicator={false}
      >
        {formatOrderItems().map((item, index) => (
          <View key={index} style={styles.orderItem}>
            <Image
              source={{
                uri:
                  item.imageUrl ||
                  item.image ||
                  "https://images.unsplash.com/photo-1565299624946-b28f40a0ca4b?w=400",
              }}
              style={styles.itemImage}
              defaultSource={require("../../assets/images/meal-plans/fitfuel.jpg")}
            />

            <View style={styles.itemDetails}>
              <Text style={[styles.itemName, { color: colors.text }]}>
                {item.name || item.title || "Meal Item"}
              </Text>
              <Text
                style={[
                  styles.itemDescription,
                  { color: colors.textSecondary },
                ]}
              >
                {item.description || "Fresh ingredients prepared daily"}
              </Text>

              {item.quantity && (
                <View style={styles.quantityContainer}>
                  <Text
                    style={[
                      styles.quantityText,
                      { color: colors.textSecondary },
                    ]}
                  >
                    Qty: {item.quantity}
                  </Text>
                </View>
              )}
            </View>

            {item.price && (
              <Text style={[styles.itemPrice, { color: colors.text }]}>
                ₦{item.price.toLocaleString()}
              </Text>
            )}
          </View>
        ))}
      </ScrollView>

      {/* Delivery Information */}
      <View style={[styles.deliveryInfo, { borderTopColor: colors.border }]}>
        <View style={styles.deliveryRow}>
          <Ionicons name="location-outline" size={16} color={COLORS.primary} />
          <View style={styles.addressContainer}>
            <Text
              style={[styles.addressLabel, { color: colors.textSecondary }]}
            >
              Delivery Address
            </Text>
            <Text style={[styles.addressText, { color: colors.text }]}>
              {order.deliveryAddress ||
                order.address ||
                "Address not specified"}
            </Text>
          </View>
        </View>

        <View style={styles.deliveryRow}>
          <Ionicons name="card-outline" size={16} color={COLORS.primary} />
          <View style={styles.addressContainer}>
            <Text
              style={[styles.addressLabel, { color: colors.textSecondary }]}
            >
              Payment Method
            </Text>
            <Text style={[styles.addressText, { color: colors.text }]}>
              {order.paymentMethod || "Card Payment"}
            </Text>
          </View>
        </View>

        {/* Order Total */}
        {order.total && (
          <View
            style={[styles.totalContainer, { borderTopColor: colors.border }]}
          >
            <Text style={[styles.totalLabel, { color: colors.text }]}>
              Order Total
            </Text>
            <Text style={[styles.totalAmount, { color: colors.text }]}>
              ₦{order.total.toLocaleString()}
            </Text>
          </View>
        )}
      </View>

      {/* Special Instructions */}
      {order.specialInstructions && (
        <View
          style={[
            styles.instructionsContainer,
            { borderTopColor: colors.border },
          ]}
        >
          <Text
            style={[styles.instructionsLabel, { color: colors.textSecondary }]}
          >
            Special Instructions
          </Text>
          <Text style={[styles.instructionsText, { color: colors.text }]}>
            {order.specialInstructions}
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = createStylesWithDMSans({
  container: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    maxHeight: "60%",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
  },
  headerLeft: {
    flex: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 4,
  },
  orderNumber: {
    fontSize: 14,
    fontWeight: "500",
  },
  closeButton: {
    padding: 4,
  },
  statusContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 16,
    gap: 8,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 14,
    fontWeight: "600",
    flex: 1,
  },
  statusTime: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  timeText: {
    fontSize: 12,
  },
  itemsContainer: {
    maxHeight: 200,
    paddingHorizontal: 20,
  },
  orderItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.05)",
  },
  itemImage: {
    width: 50,
    height: 50,
    borderRadius: 8,
    marginRight: 12,
  },
  itemDetails: {
    flex: 1,
  },
  itemName: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 2,
  },
  itemDescription: {
    fontSize: 12,
    lineHeight: 16,
  },
  quantityContainer: {
    marginTop: 4,
  },
  quantityText: {
    fontSize: 11,
    fontWeight: "500",
  },
  itemPrice: {
    fontSize: 14,
    fontWeight: "600",
  },
  deliveryInfo: {
    paddingHorizontal: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    gap: 12,
  },
  deliveryRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  addressContainer: {
    flex: 1,
  },
  addressLabel: {
    fontSize: 12,
    fontWeight: "500",
    marginBottom: 2,
  },
  addressText: {
    fontSize: 14,
    lineHeight: 18,
  },
  totalContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 12,
    marginTop: 12,
    borderTopWidth: 1,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: "600",
  },
  totalAmount: {
    fontSize: 16,
    fontWeight: "700",
  },
  instructionsContainer: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 20,
    borderTopWidth: 1,
  },
  instructionsLabel: {
    fontSize: 12,
    fontWeight: "500",
    marginBottom: 4,
  },
  instructionsText: {
    fontSize: 14,
    lineHeight: 18,
  },
});

export default OrderSummaryCard;
