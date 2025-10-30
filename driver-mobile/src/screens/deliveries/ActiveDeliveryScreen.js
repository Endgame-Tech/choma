// src/screens/deliveries/ActiveDeliveryScreen.js - Active delivery with driver controls
import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  Linking,
  ActivityIndicator,
  Image,
  Modal,
  TextInput,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "../../styles/theme";
import { useAlert } from "../../contexts/AlertContext";
import { createStylesWithDMSans } from "../../utils/fontUtils";

// Services
import driverApiService from "../../services/driverApi";

const ActiveDeliveryScreen = ({ route, navigation }) => {
  const { colors } = useTheme();
  const { showError, showInfo, showSuccess } = useAlert();
  const { delivery, assignmentId } = route.params || {};

  // State
  const [activeDelivery, setActiveDelivery] = useState(delivery || null);
  const [loading, setLoading] = useState(!delivery);
  const [refreshing, setRefreshing] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [confirmationNotes, setConfirmationNotes] = useState("");
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [pendingStatus, setPendingStatus] = useState(null);
  const refreshInterval = useRef(null);

  // Load active delivery data
  const loadDeliveryData = async () => {
    try {
      const response = await driverApiService.getAssignmentDetails(
        assignmentId || activeDelivery?.assignmentId || activeDelivery?._id
      );

      if (response.success) {
        setActiveDelivery(response.data);
      } else {
        showError("Failed to load delivery details");
      }
    } catch (error) {
      console.error("Error loading delivery:", error);
      showError("Failed to load delivery details");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (!activeDelivery || !activeDelivery._id) {
      loadDeliveryData();
    }

    // Auto-refresh every 60 seconds for status updates
    refreshInterval.current = setInterval(() => {
      if (activeDelivery && !isDeliveryCompleted()) {
        loadDeliveryData();
      }
    }, 60000);

    return () => {
      if (refreshInterval.current) {
        clearInterval(refreshInterval.current);
      }
    };
  }, [assignmentId, activeDelivery?._id]);

  const onRefresh = () => {
    setRefreshing(true);
    loadDeliveryData();
  };

  const isDeliveryCompleted = () => {
    return (
      activeDelivery?.status === "delivered" ||
      activeDelivery?.status === "cancelled"
    );
  };

  const getNextStatus = () => {
    const currentStatus = activeDelivery?.status;
    const statusFlow = {
      assigned: "picked_up",
      picked_up: "en_route",
      en_route: "delivered",
    };
    return statusFlow[currentStatus];
  };

  const getStatusDisplayName = (status) => {
    const statusNames = {
      assigned: "Assigned",
      picked_up: "Picked Up",
      en_route: "En Route to Customer",
      delivered: "Delivered",
      cancelled: "Cancelled",
    };
    return statusNames[status] || status;
  };

  const getNextActionText = () => {
    const currentStatus = activeDelivery?.status;
    const actions = {
      assigned: "Confirm Pickup",
      picked_up: "Start Delivery",
      en_route: "Confirm Delivery",
    };
    return actions[currentStatus] || "Update Status";
  };

  const handleStatusUpdate = async (newStatus, notes = "") => {
    try {
      setIsUpdatingStatus(true);

      const response = await driverApiService.updateDeliveryStatus(
        activeDelivery._id,
        newStatus,
        { notes: notes.trim() }
      );

      if (response.success) {
        setActiveDelivery(response.data);
        showSuccess(`Status updated to ${getStatusDisplayName(newStatus)}`);

        if (newStatus === "delivered") {
          // Navigate back to deliveries list after completion
          setTimeout(() => {
            navigation.navigate("AvailableDeliveries");
          }, 2000);
        }
      } else {
        showError("Failed to update status");
      }
    } catch (error) {
      console.error("Error updating status:", error);
      showError("Failed to update status");
    } finally {
      setIsUpdatingStatus(false);
      setShowStatusModal(false);
      setConfirmationNotes("");
      setPendingStatus(null);
    }
  };

  const handleNextAction = () => {
    const nextStatus = getNextStatus();
    if (!nextStatus) return;

    setPendingStatus(nextStatus);

    if (nextStatus === "delivered") {
      // Require confirmation notes for delivery
      setShowStatusModal(true);
    } else {
      // Confirm action for pickup and en route
      Alert.alert(
        "Confirm Action",
        `Are you sure you want to mark this delivery as ${getStatusDisplayName(
          nextStatus
        )}?`,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Confirm",
            onPress: () => handleStatusUpdate(nextStatus),
          },
        ]
      );
    }
  };

  const openMapsNavigation = () => {
    if (!activeDelivery) return;

    const destination =
      activeDelivery.deliveryLocation?.address ||
      activeDelivery.deliveryAddress ||
      activeDelivery.customer?.address;

    if (!destination) {
      showError("Delivery address not available");
      return;
    }

    const encodedAddress = encodeURIComponent(destination);
    const mapsUrl = `https://maps.google.com/?daddr=${encodedAddress}`;

    Alert.alert(
      "Open Navigation",
      "This will open Google Maps for turn-by-turn directions.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Open Maps",
          onPress: () => Linking.openURL(mapsUrl),
        },
      ]
    );
  };

  const callCustomer = () => {
    const phone = activeDelivery?.customer?.phone;
    if (phone) {
      Linking.openURL(`tel:${phone}`);
    } else {
      showInfo("Customer contact not available");
    }
  };

  const getStatusColor = (status) => {
    const statusColors = {
      assigned: colors.warning,
      picked_up: colors.primary,
      en_route: colors.success,
      delivered: colors.success,
      cancelled: colors.error,
    };
    return statusColors[status] || colors.textMuted;
  };

  const getStatusIcon = (status) => {
    const icons = {
      assigned: "person-add-outline",
      picked_up: "bag-check-outline",
      en_route: "navigation-outline",
      delivered: "checkmark-circle-outline",
      cancelled: "close-circle-outline",
    };
    return icons[status] || "ellipse-outline";
  };

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatCurrency = (amount) => {
    return `₦${(amount || 0).toLocaleString()}`;
  };

  if (loading) {
    return (
      <SafeAreaView style={styles(colors).container}>
        <View style={styles(colors).loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles(colors).loadingText}>
            Loading delivery details...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!activeDelivery) {
    return (
      <SafeAreaView style={styles(colors).container}>
        <View style={styles(colors).errorContainer}>
          <Ionicons
            name="alert-circle-outline"
            size={80}
            color={colors.error}
          />
          <Text style={styles(colors).errorTitle}>Delivery Not Found</Text>
          <Text style={styles(colors).errorSubtitle}>
            Please check your delivery details and try again
          </Text>
          <TouchableOpacity
            style={styles(colors).button}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles(colors).buttonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles(colors).container}>
      {/* Header */}
      <LinearGradient
        colors={[colors.primary, colors.primaryDark]}
        style={styles(colors).header}
      >
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles(colors).backButton}
        >
          <Ionicons name="chevron-back" size={20} color="white" />
        </TouchableOpacity>

        <View style={styles(colors).headerContent}>
          <Text style={styles(colors).headerTitle}>Active Delivery</Text>
          <Text style={styles(colors).deliveryId}>
            #{activeDelivery.orderNumber || activeDelivery._id?.slice(-6)}
          </Text>
        </View>

        <TouchableOpacity
          onPress={openMapsNavigation}
          style={styles(colors).mapButton}
        >
          <Ionicons name="navigate" size={24} color="white" />
        </TouchableOpacity>
      </LinearGradient>

      <ScrollView
        style={styles(colors).content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Current Status Card */}
        <View style={styles(colors).statusCard}>
          <View style={styles(colors).statusHeader}>
            <View
              style={[
                styles(colors).statusIcon,
                { backgroundColor: getStatusColor(activeDelivery.status) },
              ]}
            >
              <Ionicons
                name={getStatusIcon(activeDelivery.status)}
                size={24}
                color="white"
              />
            </View>
            <View style={styles(colors).statusInfo}>
              <Text style={styles(colors).statusText}>
                {getStatusDisplayName(activeDelivery.status)}
              </Text>
              <Text style={styles(colors).statusTime}>
                Updated {formatTime(activeDelivery.updatedAt)}
              </Text>
            </View>
          </View>

          {!isDeliveryCompleted() && (
            <TouchableOpacity
              style={styles(colors).nextActionButton}
              onPress={handleNextAction}
              disabled={isUpdatingStatus}
            >
              {isUpdatingStatus ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <>
                  <Ionicons name="checkmark-circle" size={16} color="white" />
                  <Text style={styles(colors).nextActionText}>
                    {getNextActionText()}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </View>

        {/* Earnings Card */}
        <View style={styles(colors).earningsCard}>
          <Text style={styles(colors).sectionTitle}>Delivery Earnings</Text>
          <View style={styles(colors).earningsContent}>
            <View style={styles(colors).earningsItem}>
              <Text style={styles(colors).earningsLabel}>Base Rate</Text>
              <Text style={styles(colors).earningsValue}>
                {formatCurrency(activeDelivery.baseRate || 2000)}
              </Text>
            </View>
            <View style={styles(colors).earningsItem}>
              <Text style={styles(colors).earningsLabel}>Distance Bonus</Text>
              <Text style={styles(colors).earningsValue}>
                {formatCurrency(activeDelivery.distanceBonus || 500)}
              </Text>
            </View>
            <View style={styles(colors).earningsTotal}>
              <Text style={styles(colors).totalLabel}>Total Earnings</Text>
              <Text style={styles(colors).totalValue}>
                {formatCurrency(activeDelivery.totalEarnings || 2500)}
              </Text>
            </View>
          </View>
        </View>

        {/* Route Information */}
        <View style={styles(colors).routeCard}>
          <Text style={styles(colors).sectionTitle}>Route Information</Text>

          {/* Pickup Location */}
          <View style={styles(colors).locationItem}>
            <View
              style={[
                styles(colors).locationIcon,
                { backgroundColor: colors.warning + "20" },
              ]}
            >
              <Ionicons name="restaurant" size={20} color={colors.warning} />
            </View>
            <View style={styles(colors).locationDetails}>
              <Text style={styles(colors).locationTitle}>Pickup Location</Text>
              <Text style={styles(colors).locationAddress}>
                {activeDelivery.pickupLocation?.address ||
                  activeDelivery.chef?.kitchenAddress}
              </Text>
              <Text style={styles(colors).locationNote}>
                Chef: {activeDelivery.chef?.name || "Kitchen Staff"}
              </Text>
            </View>
          </View>

          <View style={styles(colors).routeConnector} />

          {/* Delivery Location */}
          <View style={styles(colors).locationItem}>
            <View
              style={[
                styles(colors).locationIcon,
                { backgroundColor: colors.success + "20" },
              ]}
            >
              <Ionicons name="location" size={20} color={colors.success} />
            </View>
            <View style={styles(colors).locationDetails}>
              <Text style={styles(colors).locationTitle}>
                Delivery Location
              </Text>
              <Text style={styles(colors).locationAddress}>
                {activeDelivery.deliveryLocation?.address ||
                  activeDelivery.deliveryAddress}
              </Text>
              <Text style={styles(colors).locationNote}>
                Customer: {activeDelivery.customer?.name || "Customer"}
              </Text>
            </View>
            <TouchableOpacity
              style={styles(colors).callButton}
              onPress={callCustomer}
            >
              <Ionicons name="call" size={16} color="white" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Order Details */}
        <View style={styles(colors).orderCard}>
          <Text style={styles(colors).sectionTitle}>Order Details</Text>
          <View style={styles(colors).orderInfo}>
            <View style={styles(colors).infoRow}>
              <Text style={styles(colors).infoLabel}>Meal Plan:</Text>
              <Text style={styles(colors).infoValue}>
                {activeDelivery.mealPlan?.name ||
                  activeDelivery.orderItems?.planName ||
                  "Delicious Meal"}
              </Text>
            </View>
            <View style={styles(colors).infoRow}>
              <Text style={styles(colors).infoLabel}>Order Value:</Text>
              <Text style={styles(colors).infoValue}>
                {formatCurrency(activeDelivery.totalAmount || 25000)}
              </Text>
            </View>
            <View style={styles(colors).infoRow}>
              <Text style={styles(colors).infoLabel}>Distance:</Text>
              <Text style={styles(colors).infoValue}>
                {activeDelivery.estimatedDistance || "5.2"} km
              </Text>
            </View>
            {activeDelivery.instructions && (
              <View style={styles(colors).instructionsSection}>
                <Text style={styles(colors).instructionsTitle}>
                  Special Instructions:
                </Text>
                <Text style={styles(colors).instructionsText}>
                  {activeDelivery.instructions}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles(colors).actionsCard}>
          <Text style={styles(colors).sectionTitle}>Quick Actions</Text>
          <View style={styles(colors).actionButtons}>
            <TouchableOpacity
              style={styles(colors).actionButton}
              onPress={openMapsNavigation}
            >
              <Ionicons
                name="navigate-outline"
                size={20}
                color={colors.primary}
              />
              <Text style={styles(colors).actionButtonText}>Navigation</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles(colors).actionButton}
              onPress={callCustomer}
            >
              <Ionicons name="call-outline" size={20} color={colors.primary} />
              <Text style={styles(colors).actionButtonText}>Call Customer</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* Status Update Modal */}
      <Modal
        visible={showStatusModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowStatusModal(false)}
      >
        <View style={styles(colors).modalOverlay}>
          <View style={styles(colors).modalContent}>
            <Text style={styles(colors).modalTitle}>Confirm Delivery</Text>

            <Text style={styles(colors).modalSubtitle}>
              Add any delivery notes or special circumstances:
            </Text>

            <TextInput
              style={styles(colors).notesInput}
              placeholder="Delivery notes (optional)"
              placeholderTextColor={colors.textMuted}
              value={confirmationNotes}
              onChangeText={setConfirmationNotes}
              multiline
              numberOfLines={3}
            />

            <View style={styles(colors).modalButtons}>
              <TouchableOpacity
                style={[
                  styles(colors).modalButton,
                  styles(colors).cancelButton,
                ]}
                onPress={() => setShowStatusModal(false)}
              >
                <Text style={styles(colors).cancelButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles(colors).modalButton,
                  styles(colors).confirmButton,
                ]}
                onPress={() =>
                  handleStatusUpdate(pendingStatus, confirmationNotes)
                }
                disabled={isUpdatingStatus}
              >
                {isUpdatingStatus ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <Text style={styles(colors).confirmButtonText}>
                    Confirm Delivery
                  </Text>
                )}
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
    loadingContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
    },
    loadingText: {
      marginTop: 16,
      fontSize: 16,
      color: colors.textMuted,
    },
    errorContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      padding: 20,
    },
    errorTitle: {
      fontSize: 24,
      fontWeight: "700",
      marginTop: 16,
      color: colors.text,
    },
    errorSubtitle: {
      fontSize: 16,
      color: colors.textMuted,
      textAlign: "center",
      marginTop: 8,
      marginBottom: 32,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 20,
      paddingVertical: 16,
    },
    backButton: {
      marginRight: 16,
    },
    headerContent: {
      flex: 1,
    },
    headerTitle: {
      fontSize: 20,
      fontWeight: "700",
      color: "white",
    },
    deliveryId: {
      fontSize: 14,
      color: "rgba(255, 255, 255, 0.8)",
    },
    mapButton: {
      marginLeft: 16,
    },
    content: {
      flex: 1,
      padding: 16,
    },
    statusCard: {
      backgroundColor: colors.cardBackground,
      borderRadius: 16,
      padding: 20,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: colors.border,
    },
    statusHeader: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 16,
    },
    statusIcon: {
      width: 50,
      height: 50,
      borderRadius: 25,
      justifyContent: "center",
      alignItems: "center",
      marginRight: 16,
    },
    statusInfo: {
      flex: 1,
    },
    statusText: {
      fontSize: 18,
      fontWeight: "700",
      color: colors.text,
    },
    statusTime: {
      fontSize: 14,
      color: colors.textMuted,
      marginTop: 4,
    },
    nextActionButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.success,
      paddingVertical: 12,
      borderRadius: 12,
    },
    nextActionText: {
      color: "white",
      fontSize: 16,
      fontWeight: "600",
      marginLeft: 8,
    },
    earningsCard: {
      backgroundColor: colors.cardBackground,
      borderRadius: 16,
      padding: 20,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: colors.border,
    },
    sectionTitle: {
      fontSize: 16,
      fontWeight: "700",
      color: colors.text,
      marginBottom: 16,
    },
    earningsContent: {
      backgroundColor: colors.background,
      borderRadius: 12,
      padding: 16,
    },
    earningsItem: {
      flexDirection: "row",
      justifyContent: "space-between",
      marginBottom: 8,
    },
    earningsLabel: {
      fontSize: 14,
      color: colors.textMuted,
    },
    earningsValue: {
      fontSize: 14,
      fontWeight: "600",
      color: colors.text,
    },
    earningsTotal: {
      flexDirection: "row",
      justifyContent: "space-between",
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      marginTop: 8,
    },
    totalLabel: {
      fontSize: 16,
      fontWeight: "600",
      color: colors.text,
    },
    totalValue: {
      fontSize: 18,
      fontWeight: "700",
      color: colors.success,
    },
    routeCard: {
      backgroundColor: colors.cardBackground,
      borderRadius: 16,
      padding: 20,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: colors.border,
    },
    locationItem: {
      flexDirection: "row",
      alignItems: "flex-start",
    },
    locationIcon: {
      width: 40,
      height: 40,
      borderRadius: 20,
      justifyContent: "center",
      alignItems: "center",
      marginRight: 12,
    },
    locationDetails: {
      flex: 1,
    },
    locationTitle: {
      fontSize: 14,
      fontWeight: "600",
      color: colors.text,
      marginBottom: 4,
    },
    locationAddress: {
      fontSize: 14,
      color: colors.text,
      marginBottom: 2,
    },
    locationNote: {
      fontSize: 12,
      color: colors.textMuted,
    },
    routeConnector: {
      width: 2,
      height: 20,
      backgroundColor: colors.border,
      marginLeft: 20,
      marginVertical: 16,
    },
    callButton: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: colors.primary,
      justifyContent: "center",
      alignItems: "center",
      marginLeft: 12,
    },
    orderCard: {
      backgroundColor: colors.cardBackground,
      borderRadius: 16,
      padding: 20,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: colors.border,
    },
    orderInfo: {
      backgroundColor: colors.background,
      borderRadius: 12,
      padding: 16,
    },
    infoRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      marginBottom: 12,
    },
    infoLabel: {
      fontSize: 14,
      color: colors.textMuted,
      flex: 1,
    },
    infoValue: {
      fontSize: 14,
      color: colors.text,
      fontWeight: "600",
      flex: 2,
      textAlign: "right",
    },
    instructionsSection: {
      marginTop: 12,
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    instructionsTitle: {
      fontSize: 14,
      fontWeight: "600",
      color: colors.text,
      marginBottom: 8,
    },
    instructionsText: {
      fontSize: 14,
      color: colors.text,
      lineHeight: 20,
    },
    actionsCard: {
      backgroundColor: colors.cardBackground,
      borderRadius: 16,
      padding: 20,
      marginBottom: 20,
      borderWidth: 1,
      borderColor: colors.border,
    },
    actionButtons: {
      flexDirection: "row",
      justifyContent: "space-between",
    },
    actionButton: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.primary + "15",
      paddingVertical: 12,
      borderRadius: 12,
      marginHorizontal: 4,
      borderWidth: 1,
      borderColor: colors.primary + "30",
    },
    actionButtonText: {
      color: colors.primary,
      fontSize: 14,
      fontWeight: "600",
      marginLeft: 6,
    },
    button: {
      backgroundColor: colors.primary,
      borderRadius: 12,
      paddingVertical: 16,
      paddingHorizontal: 32,
      alignItems: "center",
    },
    buttonText: {
      color: "white",
      fontSize: 16,
      fontWeight: "600",
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: "rgba(0, 0, 0, 0.5)",
      justifyContent: "center",
      alignItems: "center",
    },
    modalContent: {
      backgroundColor: colors.cardBackground,
      borderRadius: 16,
      padding: 24,
      width: "90%",
      maxWidth: 400,
    },
    modalTitle: {
      fontSize: 20,
      fontWeight: "700",
      color: colors.text,
      textAlign: "center",
      marginBottom: 16,
    },
    modalSubtitle: {
      fontSize: 14,
      color: colors.textMuted,
      textAlign: "center",
      marginBottom: 20,
    },
    notesInput: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      padding: 12,
      fontSize: 16,
      color: colors.text,
      textAlignVertical: "top",
      marginBottom: 24,
      minHeight: 80,
      backgroundColor: colors.background,
    },
    modalButtons: {
      flexDirection: "row",
      justifyContent: "space-between",
    },
    modalButton: {
      flex: 1,
      paddingVertical: 12,
      borderRadius: 12,
      alignItems: "center",
    },
    cancelButton: {
      backgroundColor: colors.background,
      marginRight: 8,
      borderWidth: 1,
      borderColor: colors.border,
    },
    confirmButton: {
      backgroundColor: colors.success,
      marginLeft: 8,
    },
    cancelButtonText: {
      color: colors.textMuted,
      fontSize: 16,
      fontWeight: "600",
    },
    confirmButtonText: {
      color: "white",
      fontSize: 16,
      fontWeight: "600",
    },
  });

export default ActiveDeliveryScreen;
