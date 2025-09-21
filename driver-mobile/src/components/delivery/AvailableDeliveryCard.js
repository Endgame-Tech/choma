// src/components/delivery/AvailableDeliveryCard.js - Adapted from user-mobile CompactOrderCard
import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Dimensions,
  Modal,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../styles/theme";
import { createStylesWithDMSans } from "../../utils/fontUtils";
import CustomIcon from "../ui/CustomIcon";

const { width } = Dimensions.get("window");

const AvailableDeliveryCard = ({
  delivery,
  onAcceptDelivery,
  onViewDetails,
  style,
}) => {
  const { colors } = useTheme();
  const [detailsModalVisible, setDetailsModalVisible] = useState(false);
  const [isAccepting, setIsAccepting] = useState(false);

  const getMealPlanImage = () => {
    if (delivery?.image) return { uri: delivery.image };
    if (delivery?.mealPlan?.image) return { uri: delivery.mealPlan.image };
    if (delivery?.orderItems?.image) return { uri: delivery.orderItems.image };

    const planName = (
      delivery?.orderItems?.planName ||
      delivery?.mealPlan?.name ||
      ""
    ).toLowerCase();

    if (planName.includes("fitfuel") || planName.includes("fit fuel")) {
      return require("../../assets/images/meal-plans/fitfuel.jpg");
    } else if (planName.includes("wellness") || planName.includes("healthy")) {
      return require("../../assets/images/meal-plans/wellness-hub.jpg");
    } else if (planName.includes("recharge") || planName.includes("energy")) {
      return require("../../assets/images/meal-plans/recharge.jpg");
    } else if (planName.includes("family") || planName.includes("healthyfam")) {
      return require("../../assets/images/meal-plans/healthyfam.jpg");
    }

    return require("../../assets/images/meal-plans/fitfuel.jpg");
  };

  const getDeliveryDistance = () => {
    // Calculate distance from current location to pickup/delivery
    // This would use actual GPS calculation in production
    const distance = delivery?.estimatedDistance || Math.floor(Math.random() * 15) + 1;
    return `${distance} km away`;
  };

  const getEstimatedEarnings = () => {
    // Calculate estimated earnings based on distance and order value
    const baseRate = 2000; // ₦2,000 base
    const distanceRate = (delivery?.estimatedDistance || 5) * 200; // ₦200 per km
    const total = baseRate + distanceRate;
    return total;
  };

  const getPickupLocation = () => {
    return delivery?.pickupLocation || delivery?.chef?.kitchenAddress || "Kitchen Location";
  };

  const getDeliveryLocation = () => {
    return delivery?.deliveryAddress || delivery?.customer?.address || "Customer Location";
  };

  const handleAcceptDelivery = async () => {
    setIsAccepting(true);
    try {
      await onAcceptDelivery?.(delivery._id || delivery.id);
    } catch (error) {
      console.error('Failed to accept delivery:', error);
    } finally {
      setIsAccepting(false);
    }
  };

  return (
    <View style={[styles(colors).container, style]}>
      {/* Header */}
      <View style={styles(colors).header}>
        <Image
          source={getMealPlanImage()}
          style={styles(colors).mealImage}
          defaultSource={require("../../assets/images/meal-plans/fitfuel.jpg")}
        />

        <View style={styles(colors).deliveryInfo}>
          <Text style={styles(colors).mealTitle} numberOfLines={1}>
            {delivery?.orderItems?.planName ||
              delivery?.mealPlan?.name ||
              "Delicious Meal"}
          </Text>
          <Text style={styles(colors).orderNumber}>
            #{delivery?.orderNumber || delivery?.id?.slice(-6) || "CHM001"}
          </Text>
          <Text style={styles(colors).distance}>
            {getDeliveryDistance()}
          </Text>
        </View>

        <View style={styles(colors).earningsContainer}>
          <Text style={styles(colors).earningsLabel}>Earn</Text>
          <Text style={styles(colors).earnings}>
            ₦{getEstimatedEarnings().toLocaleString()}
          </Text>
        </View>
      </View>

      {/* Pickup & Delivery Info */}
      <View style={styles(colors).routeSection}>
        <View style={styles(colors).routeItem}>
          <View style={styles(colors).routeIcon}>
            <CustomIcon name="food-filled" size={16} color={colors.warning} />
          </View>
          <View style={styles(colors).routeDetails}>
            <Text style={styles(colors).routeLabel}>Pickup from</Text>
            <Text style={styles(colors).routeAddress} numberOfLines={1}>
              {getPickupLocation()}
            </Text>
          </View>
        </View>

        <View style={styles(colors).routeLine} />

        <View style={styles(colors).routeItem}>
          <View style={styles(colors).routeIcon}>
            <CustomIcon name="location-filled" size={16} color={colors.success} />
          </View>
          <View style={styles(colors).routeDetails}>
            <Text style={styles(colors).routeLabel}>Deliver to</Text>
            <Text style={styles(colors).routeAddress} numberOfLines={1}>
              {getDeliveryLocation()}
            </Text>
          </View>
        </View>
      </View>

      {/* Action Buttons */}
      <View style={styles(colors).actions}>
        <TouchableOpacity
          style={styles(colors).detailsButton}
          onPress={() => setDetailsModalVisible(true)}
        >
          <CustomIcon name="details" size={16} color={colors.primary} />
          <Text style={styles(colors).detailsButtonText}>Details</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles(colors).acceptButton}
          onPress={handleAcceptDelivery}
          disabled={isAccepting}
        >
          {isAccepting ? (
            <ActivityIndicator size="small" color={colors.white} />
          ) : (
            <>
              <CustomIcon name="checkmark-circle" size={16} color={colors.white} />
              <Text style={styles(colors).acceptButtonText}>Accept</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* Details Modal */}
      <Modal
        visible={detailsModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setDetailsModalVisible(false)}
      >
        <View style={styles(colors).modalOverlay}>
          <View style={styles(colors).modalContainer}>
            <View style={styles(colors).modalHeader}>
              <Text style={styles(colors).modalTitle}>Delivery Details</Text>
              <TouchableOpacity
                style={styles(colors).modalCloseButton}
                onPress={() => setDetailsModalVisible(false)}
              >
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles(colors).modalContent}
              showsVerticalScrollIndicator={false}
            >
              {/* Order Information */}
              <View style={styles(colors).orderSection}>
                <Text style={styles(colors).sectionTitle}>📦 Order Information</Text>
                
                <View style={styles(colors).detailsGrid}>
                  <View style={styles(colors).detailCard}>
                    <Ionicons name="restaurant-outline" size={16} color={colors.primary} />
                    <Text style={styles(colors).detailLabel}>Meal Plan</Text>
                    <Text style={styles(colors).detailValue}>
                      {delivery?.orderItems?.planName || delivery?.mealPlan?.name || "Delicious Meal"}
                    </Text>
                  </View>

                  <View style={styles(colors).detailCard}>
                    <Ionicons name="card-outline" size={16} color={colors.primary} />
                    <Text style={styles(colors).detailLabel}>Order Value</Text>
                    <Text style={styles(colors).detailValue}>
                      ₦{(delivery?.totalAmount || 25000).toLocaleString()}
                    </Text>
                  </View>

                  <View style={styles(colors).detailCard}>
                    <Ionicons name="time-outline" size={16} color={colors.primary} />
                    <Text style={styles(colors).detailLabel}>Prep Time</Text>
                    <Text style={styles(colors).detailValue}>
                      {delivery?.estimatedPrepTime || "30"} mins
                    </Text>
                  </View>

                  <View style={styles(colors).detailCard}>
                    <Ionicons name="cash-outline" size={16} color={colors.primary} />
                    <Text style={styles(colors).detailLabel}>Your Earnings</Text>
                    <Text style={[styles(colors).detailValue, { color: colors.success }]}>
                      ₦{getEstimatedEarnings().toLocaleString()}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Route Information */}
              <View style={styles(colors).routeSection}>
                <Text style={styles(colors).sectionTitle}>🗺️ Route Information</Text>
                
                <View style={styles(colors).routeCard}>
                  <View style={styles(colors).routeStep}>
                    <View style={[styles(colors).stepIcon, { backgroundColor: colors.warning + "20" }]}>
                      <Ionicons name="restaurant" size={20} color={colors.warning} />
                    </View>
                    <View style={styles(colors).stepDetails}>
                      <Text style={styles(colors).stepTitle}>Pickup Location</Text>
                      <Text style={styles(colors).stepAddress}>{getPickupLocation()}</Text>
                      <Text style={styles(colors).stepNote}>Chef: {delivery?.chef?.name || "Kitchen Staff"}</Text>
                    </View>
                  </View>

                  <View style={styles(colors).routeConnector} />

                  <View style={styles(colors).routeStep}>
                    <View style={[styles(colors).stepIcon, { backgroundColor: colors.success + "20" }]}>
                      <Ionicons name="location" size={20} color={colors.success} />
                    </View>
                    <View style={styles(colors).stepDetails}>
                      <Text style={styles(colors).stepTitle}>Delivery Location</Text>
                      <Text style={styles(colors).stepAddress}>{getDeliveryLocation()}</Text>
                      <Text style={styles(colors).stepNote}>Customer: {delivery?.customer?.name || "Customer"}</Text>
                    </View>
                  </View>
                </View>
              </View>

              {/* Special Instructions */}
              {delivery?.instructions && (
                <View style={styles(colors).instructionsSection}>
                  <Text style={styles(colors).sectionTitle}>📝 Special Instructions</Text>
                  <View style={styles(colors).instructionsCard}>
                    <Text style={styles(colors).instructionsText}>
                      {delivery.instructions}
                    </Text>
                  </View>
                </View>
              )}

              {/* Accept Button in Modal */}
              <View style={styles(colors).modalActions}>
                <TouchableOpacity
                  style={styles(colors).modalAcceptButton}
                  onPress={() => {
                    setDetailsModalVisible(false);
                    handleAcceptDelivery();
                  }}
                  disabled={isAccepting}
                >
                  {isAccepting ? (
                    <ActivityIndicator size="small" color={colors.white} />
                  ) : (
                    <>
                      <Ionicons name="checkmark-circle" size={18} color={colors.white} />
                      <Text style={styles(colors).modalAcceptButtonText}>
                        Accept Delivery - ₦{getEstimatedEarnings().toLocaleString()}
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
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
    },

    // Header
    header: {
      flexDirection: "row",
      alignItems: "center",
      padding: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    mealImage: {
      width: 60,
      height: 60,
      borderRadius: 12,
      marginRight: 16,
      backgroundColor: colors.background,
    },
    deliveryInfo: {
      flex: 1,
    },
    mealTitle: {
      fontSize: 16,
      fontWeight: "700",
      color: colors.text,
      marginBottom: 4,
    },
    orderNumber: {
      fontSize: 12,
      color: colors.textMuted,
      fontWeight: "500",
      marginBottom: 2,
    },
    distance: {
      fontSize: 12,
      color: colors.primary,
      fontWeight: "600",
    },
    earningsContainer: {
      backgroundColor: colors.success + "15",
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 12,
      alignItems: "center",
    },
    earningsLabel: {
      fontSize: 10,
      color: colors.success,
      fontWeight: "500",
      marginBottom: 2,
    },
    earnings: {
      fontSize: 14,
      fontWeight: "700",
      color: colors.success,
    },

    // Route Section
    routeSection: {
      padding: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    routeItem: {
      flexDirection: "row",
      alignItems: "center",
      marginVertical: 4,
    },
    routeIcon: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: colors.background,
      justifyContent: "center",
      alignItems: "center",
      marginRight: 12,
      borderWidth: 1,
      borderColor: colors.border,
    },
    routeDetails: {
      flex: 1,
    },
    routeLabel: {
      fontSize: 12,
      color: colors.textMuted,
      fontWeight: "500",
      marginBottom: 2,
    },
    routeAddress: {
      fontSize: 14,
      color: colors.text,
      fontWeight: "600",
    },
    routeLine: {
      width: 2,
      height: 16,
      backgroundColor: colors.border,
      marginLeft: 16,
      marginVertical: 4,
    },

    // Actions
    actions: {
      flexDirection: "row",
      padding: 16,
      gap: 12,
    },
    detailsButton: {
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
    detailsButtonText: {
      color: colors.primary,
      fontSize: 14,
      fontWeight: "600",
      marginLeft: 6,
    },
    acceptButton: {
      flex: 2,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.success,
      paddingVertical: 12,
      borderRadius: 12,
    },
    acceptButtonText: {
      color: colors.white,
      fontSize: 14,
      fontWeight: "600",
      marginLeft: 6,
    },

    // Modal Styles
    modalOverlay: {
      flex: 1,
      backgroundColor: "rgba(0, 0, 0, 0.5)",
      justifyContent: "flex-end",
    },
    modalContainer: {
      backgroundColor: colors.cardBackground,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      maxHeight: "90%",
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
      fontSize: 20,
      fontWeight: "700",
      color: colors.text,
    },
    modalCloseButton: {
      padding: 4,
    },
    modalContent: {
      padding: 20,
    },

    // Modal Sections
    orderSection: {
      marginBottom: 20,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: "700",
      color: colors.text,
      marginBottom: 16,
    },
    detailsGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      justifyContent: "space-between",
    },
    detailCard: {
      width: "48%",
      backgroundColor: colors.background,
      padding: 12,
      marginBottom: 8,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: "flex-start",
    },
    detailLabel: {
      fontSize: 12,
      color: colors.textMuted,
      marginTop: 4,
      marginBottom: 2,
    },
    detailValue: {
      fontSize: 14,
      color: colors.text,
      fontWeight: "600",
    },

    // Route Card
    routeCard: {
      backgroundColor: colors.background,
      borderRadius: 12,
      padding: 16,
      borderWidth: 1,
      borderColor: colors.border,
    },
    routeStep: {
      flexDirection: "row",
      alignItems: "flex-start",
    },
    stepIcon: {
      width: 40,
      height: 40,
      borderRadius: 20,
      justifyContent: "center",
      alignItems: "center",
      marginRight: 12,
    },
    stepDetails: {
      flex: 1,
    },
    stepTitle: {
      fontSize: 14,
      fontWeight: "600",
      color: colors.text,
      marginBottom: 4,
    },
    stepAddress: {
      fontSize: 14,
      color: colors.text,
      marginBottom: 2,
    },
    stepNote: {
      fontSize: 12,
      color: colors.textMuted,
    },
    routeConnector: {
      width: 2,
      height: 20,
      backgroundColor: colors.border,
      marginLeft: 20,
      marginVertical: 8,
    },

    // Instructions
    instructionsSection: {
      marginBottom: 20,
    },
    instructionsCard: {
      backgroundColor: colors.background,
      padding: 12,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
    },
    instructionsText: {
      fontSize: 14,
      color: colors.text,
      lineHeight: 20,
    },

    // Modal Actions
    modalActions: {
      paddingVertical: 20,
    },
    modalAcceptButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.success,
      paddingVertical: 16,
      borderRadius: 12,
    },
    modalAcceptButtonText: {
      fontSize: 16,
      fontWeight: "600",
      color: colors.white,
      marginLeft: 8,
    },
  });

export default AvailableDeliveryCard;