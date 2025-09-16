// src/screens/delivery/TrackingScreen.js - Real-time Delivery Tracking
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
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import ApiService from "../../services/api";
import { useTheme } from "../../styles/theme";
import { useAlert } from "../../contexts/AlertContext";
import { createStylesWithDMSans } from "../../utils/fontUtils";

export const TrackingScreen = ({ route, navigation }) => {
  const { colors } = useTheme();
  const { showError, showInfo, showSuccess } = useAlert();
  const { trackingId, orderId, order } = route.params || {};
  const [tracking, setTracking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [rating, setRating] = useState(0);
  const [feedback, setFeedback] = useState("");
  const refreshInterval = useRef(null);

  useEffect(() => {
    if (trackingId || orderId || order) {
      loadTrackingData();
      // Set up auto-refresh every 2 minutes (reduced from 30 seconds)
      refreshInterval.current = setInterval(loadTrackingData, 120000);
    }

    return () => {
      if (refreshInterval.current) {
        clearInterval(refreshInterval.current);
      }
    };
  }, [trackingId]);

  const loadTrackingData = async () => {
    try {
      let result;
      let freshOrderData = order;

      // First, get fresh order data if we have an order ID (similar to meal plan pattern)
      if (orderId || order?._id) {
        try {
          const orderResult = await ApiService.getOrderDetails(
            orderId || order._id
          );
          if (orderResult.success && orderResult.order) {
            console.log("✅ Fresh order data loaded for tracking");
            freshOrderData = orderResult.order;
          } else {
            console.log("⚠️ Order API failed, using fallback order data");
            freshOrderData = order;
          }
        } catch (error) {
          console.log("⚠️ Order API error, using fallback order data:", error);
          freshOrderData = order;
        }
      }

      // Try to get tracking data by trackingId first
      if (trackingId) {
        result = await ApiService.getDeliveryTracking(trackingId);
      }
      // If no trackingId but we have orderId, try to find tracking by order
      else if (orderId) {
        // Try to get customer deliveries and find by order ID
        const deliveriesResult = await ApiService.getUserOrders();
        if (deliveriesResult.success) {
          const orderData = freshOrderData || {
            _id: orderId,
            orderStatus: "Preparing",
          };
          setTracking(createTrackingFromOrder(orderData));
          setLoading(false);
          setRefreshing(false);
          return;
        }
      } else if (freshOrderData) {
        setTracking(createTrackingFromOrder(freshOrderData));
        setLoading(false);
        setRefreshing(false);
        return;
      }

      if (result && result.success) {
        setTracking(result.data);
      } else {
        if (freshOrderData) {
          setTracking(createTrackingFromOrder(freshOrderData));
        } else {
          showError("Error", "Failed to load tracking information");
        }
      }
    } catch (error) {
      console.error("Error loading tracking:", error);
      if (freshOrderData) {
        setTracking(createTrackingFromOrder(freshOrderData));
      } else {
        showError("Error", "Failed to load tracking information");
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const createTrackingFromOrder = (orderData) => {
    // Create a tracking object from order data when tracking API is not available
    const orderStatusToDeliveryStatus = {
      pending: "Pending Assignment",
      confirmed: "Assigned",
      preparing: "Driver En Route to Kitchen",
      ready: "Picked Up",
      delivering: "En Route to Customer",
      delivered: "Delivered",
      cancelled: "Cancelled",
    };

    const deliveryStatus =
      orderStatusToDeliveryStatus[orderData.orderStatus?.toLowerCase()] ||
      "Pending Assignment";

    return {
      trackingId: orderData._id?.slice(-8).toUpperCase() || "TRACK001",
      deliveryStatus: deliveryStatus,
      order: orderData,
      deliveryLocation: {
        address:
          orderData.deliveryAddress ||
          orderData.address ||
          "Address not provided",
        instructions: orderData.deliveryInstructions || "",
      },
      timeline: [
        {
          status: deliveryStatus,
          timestamp: orderData.updatedAt || new Date().toISOString(),
          notes: orderData.orderStatus
            ? `Order status: ${orderData.orderStatus}`
            : "",
        },
      ],
      estimatedDeliveryTime: orderData.deliveryDate || null,
      driver: null, // Driver info not available from order data
    };
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadTrackingData();
  };

  const callDriver = () => {
    if (tracking?.driver?.phone) {
      Linking.openURL(`tel:${tracking.driver.phone}`);
    } else {
      showInfo("Info", "Driver contact not available");
    }
  };

  const submitRating = async () => {
    if (rating === 0) {
      showError("Rating Required", "Please select a rating before submitting");
      return;
    }

    try {
      const result = await ApiService.updateDeliveryStatus(trackingId, {
        status: tracking.deliveryStatus,
        customerRating: rating,
        customerFeedback: feedback.trim(),
      });

      if (result.success) {
        setShowRatingModal(false);
        setTracking(result.data);
        showSuccess(
          "Thank you!",
          "Your rating has been submitted successfully"
        );
      } else {
        showError("Error", "Failed to submit rating");
      }
    } catch (error) {
      console.error("Error submitting rating:", error);
      showError("Error", "Failed to submit rating");
    }
  };

  const getStatusColor = (status) => {
    const statusColors = {
      "Pending Assignment": colors.warning,
      Assigned: colors.primary,
      "Driver En Route to Kitchen": colors.primary,
      "Picked Up": colors.success,
      "En Route to Customer": colors.success,
      "Arrived at Location": colors.success,
      Delivered: colors.success,
      "Failed Delivery": colors.error,
      Cancelled: colors.error,
    };
    return statusColors[status] || colors.textSecondary;
  };

  const getStatusIcon = (status) => {
    const icons = {
      "Pending Assignment": "time-outline",
      Assigned: "person-add-outline",
      "Driver En Route to Kitchen": "car-outline",
      "Picked Up": "bag-check-outline",
      "En Route to Customer": "navigation-outline",
      "Arrived at Location": "location-outline",
      Delivered: "checkmark-circle-outline",
      "Failed Delivery": "close-circle-outline",
      Cancelled: "ban-outline",
    };
    return icons[status] || "ellipse-outline";
  };

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatDate = (timestamp) => {
    return new Date(timestamp).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading) {
    return (
      <SafeAreaView style={styles(colors).container}>
        <View style={styles(colors).loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles(colors).loadingText}>
            Loading tracking information...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!tracking) {
    return (
      <SafeAreaView style={styles(colors).container}>
        <View style={styles(colors).errorContainer}>
          <Ionicons
            name="alert-circle-outline"
            size={80}
            color={colors.error}
          />
          <Text style={styles(colors).errorTitle}>Tracking Not Found</Text>
          <Text style={styles(colors).errorSubtitle}>
            Please check your tracking ID and try again
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
          <Ionicons name="chevron-back" size={24} color="white" />
        </TouchableOpacity>

        <View style={styles(colors).headerContent}>
          <Text style={styles(colors).headerTitle}>Order Tracking</Text>
          <Text style={styles(colors).trackingId}>#{tracking.trackingId}</Text>
        </View>

        <TouchableOpacity
          onPress={() => {
            // Navigate to the enhanced tracking screen
            navigation.navigate("EnhancedTracking", {
              orderId: tracking.order._id || orderId,
              order: tracking.order || order,
            });
          }}
          style={styles(colors).mapToggle}
        >
          <Ionicons name="map" size={24} color="white" />
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
                { backgroundColor: getStatusColor(tracking.deliveryStatus) },
              ]}
            >
              <Ionicons
                name={getStatusIcon(tracking.deliveryStatus)}
                size={24}
                color="white"
              />
            </View>
            <View style={styles(colors).statusInfo}>
              <Text style={styles(colors).statusText}>
                {tracking.deliveryStatus}
              </Text>
              <Text style={styles(colors).statusTime}>
                {tracking.timeline.length > 0 &&
                  formatTime(
                    tracking.timeline[tracking.timeline.length - 1].timestamp
                  )}
              </Text>
            </View>
          </View>

          {tracking.estimatedDeliveryTime && (
            <View style={styles(colors).estimatedTime}>
              <Ionicons
                name="time-outline"
                size={16}
                color={colors.textSecondary}
              />
              <Text style={styles(colors).estimatedTimeText}>
                Estimated delivery: {formatDate(tracking.estimatedDeliveryTime)}
              </Text>
            </View>
          )}
        </View>

        {/* Driver Information */}
        {tracking.driver && (
          <View style={styles(colors).driverCard}>
            <Text style={styles(colors).sectionTitle}>Your Driver</Text>
            <View style={styles(colors).driverInfo}>
              <View style={styles(colors).driverAvatar}>
                {tracking.driver.profileImage ? (
                  <Image
                    source={{ uri: tracking.driver.profileImage }}
                    style={styles(colors).driverImage}
                  />
                ) : (
                  <Ionicons name="person" size={30} color={colors.primary} />
                )}
              </View>
              <View style={styles(colors).driverDetails}>
                <Text style={styles(colors).driverName}>
                  {tracking.driver.fullName}
                </Text>
                <View style={styles(colors).driverRating}>
                  <Ionicons name="star" size={14} color={colors.warning} />
                  <Text style={styles(colors).ratingText}>
                    {tracking.driver.rating || 5.0}
                  </Text>
                </View>
                <Text style={styles(colors).vehicleInfo}>
                  {tracking.driver.vehicleInfo?.type} •{" "}
                  {tracking.driver.vehicleInfo?.plateNumber}
                </Text>
              </View>
              <TouchableOpacity
                onPress={callDriver}
                style={styles(colors).callButton}
              >
                <Ionicons name="call" size={20} color="white" />
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Delivery Timeline */}
        <View style={styles(colors).timelineCard}>
          <Text style={styles(colors).sectionTitle}>Delivery Timeline</Text>
          <View style={styles(colors).timeline}>
            {tracking.timeline.map((event, index) => (
              <View key={index} style={styles(colors).timelineItem}>
                <View style={styles(colors).timelineMarker}>
                  <View
                    style={[
                      styles(colors).timelineDot,
                      { backgroundColor: getStatusColor(event.status) },
                    ]}
                  />
                  {index < tracking.timeline.length - 1 && (
                    <View style={styles(colors).timelineLine} />
                  )}
                </View>
                <View style={styles(colors).timelineContent}>
                  <Text style={styles(colors).timelineStatus}>
                    {event.status}
                  </Text>
                  <Text style={styles(colors).timelineTime}>
                    {formatDate(event.timestamp)}
                  </Text>
                  {event.notes && (
                    <Text style={styles(colors).timelineNotes}>
                      {event.notes}
                    </Text>
                  )}
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Order Details */}
        <View style={styles(colors).orderCard}>
          <Text style={styles(colors).sectionTitle}>Order Details</Text>
          <View style={styles(colors).orderInfo}>
            <View style={styles(colors).infoRow}>
              <Text style={styles(colors).infoLabel}>Order ID:</Text>
              <Text style={styles(colors).infoValue}>
                #{tracking.order._id?.slice(-6)}
              </Text>
            </View>
            <View style={styles(colors).infoRow}>
              <Text style={styles(colors).infoLabel}>Delivery Address:</Text>
              <Text style={styles(colors).infoValue}>
                {tracking.deliveryLocation.address}
              </Text>
            </View>
            {tracking.deliveryLocation.instructions && (
              <View style={styles(colors).infoRow}>
                <Text style={styles(colors).infoLabel}>Instructions:</Text>
                <Text style={styles(colors).infoValue}>
                  {tracking.deliveryLocation.instructions}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Rate Delivery Button */}
        {tracking.deliveryStatus === "Delivered" &&
          !tracking.customerRating && (
            <TouchableOpacity
              style={styles(colors).rateButton}
              onPress={() => setShowRatingModal(true)}
            >
              <Text style={styles(colors).rateButtonText}>
                Rate Your Delivery
              </Text>
            </TouchableOpacity>
          )}
      </ScrollView>

      {/* Rating Modal */}
      <Modal
        visible={showRatingModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowRatingModal(false)}
      >
        <View style={styles(colors).modalOverlay}>
          <View style={styles(colors).modalContent}>
            <Text style={styles(colors).modalTitle}>Rate Your Delivery</Text>

            <View style={styles(colors).ratingContainer}>
              {[1, 2, 3, 4, 5].map((star) => (
                <TouchableOpacity
                  key={star}
                  onPress={() => setRating(star)}
                  style={styles(colors).starButton}
                >
                  <Ionicons
                    name={star <= rating ? "star" : "star-outline"}
                    size={30}
                    color={star <= rating ? colors.warning : colors.border}
                  />
                </TouchableOpacity>
              ))}
            </View>

            <TextInput
              style={styles(colors).feedbackInput}
              placeholder="Share your feedback (optional)"
              placeholderTextColor={colors.textMuted}
              value={feedback}
              onChangeText={setFeedback}
              multiline
              numberOfLines={3}
            />

            <View style={styles(colors).modalButtons}>
              <TouchableOpacity
                style={[
                  styles(colors).modalButton,
                  styles(colors).cancelButton,
                ]}
                onPress={() => setShowRatingModal(false)}
              >
                <Text style={styles(colors).cancelButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles(colors).modalButton,
                  styles(colors).submitButton,
                ]}
                onPress={submitRating}
              >
                <Text style={styles(colors).submitButtonText}>Submit</Text>
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
      color: colors.textSecondary,
    },
    errorContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      padding: 20,
    },
    errorTitle: {
      fontSize: 24,
      fontWeight: "bold",
      marginTop: 16,
      color: colors.text,
    },
    errorSubtitle: {
      fontSize: 16,
      color: colors.textSecondary,
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
      fontWeight: "bold",
      color: "white",
    },
    trackingId: {
      fontSize: 14,
      color: "rgba(255, 255, 255, 0.8)",
    },
    mapToggle: {
      marginLeft: 16,
    },
    content: {
      flex: 1,
      padding: 16,
    },
    statusCard: {
      backgroundColor: colors.cardBackground,
      borderRadius: 12,
      padding: 20,
      marginBottom: 16,
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    },
    statusHeader: {
      flexDirection: "row",
      alignItems: "center",
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
      fontWeight: "bold",
      color: colors.text,
    },
    statusTime: {
      fontSize: 14,
      color: colors.textSecondary,
      marginTop: 4,
    },
    estimatedTime: {
      flexDirection: "row",
      alignItems: "center",
      marginTop: 16,
      paddingTop: 16,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    estimatedTimeText: {
      marginLeft: 8,
      fontSize: 14,
      color: colors.textSecondary,
    },
    driverCard: {
      backgroundColor: colors.cardBackground,
      borderRadius: 12,
      padding: 20,
      marginBottom: 16,
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: "bold",
      color: colors.text,
      marginBottom: 16,
    },
    driverInfo: {
      flexDirection: "row",
      alignItems: "center",
    },
    driverAvatar: {
      width: 60,
      height: 60,
      borderRadius: 30,
      backgroundColor: colors.background,
      justifyContent: "center",
      alignItems: "center",
      marginRight: 16,
    },
    driverImage: {
      width: 60,
      height: 60,
      borderRadius: 30,
    },
    driverDetails: {
      flex: 1,
    },
    driverName: {
      fontSize: 16,
      fontWeight: "bold",
      color: colors.text,
    },
    driverRating: {
      flexDirection: "row",
      alignItems: "center",
      marginTop: 4,
    },
    ratingText: {
      marginLeft: 4,
      fontSize: 14,
      color: colors.textSecondary,
    },
    vehicleInfo: {
      fontSize: 14,
      color: colors.textSecondary,
      marginTop: 4,
    },
    callButton: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: colors.primary,
      justifyContent: "center",
      alignItems: "center",
    },
    timelineCard: {
      backgroundColor: colors.cardBackground,
      borderRadius: 12,
      padding: 20,
      marginBottom: 16,
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    },
    timeline: {
      marginTop: 8,
    },
    timelineItem: {
      flexDirection: "row",
      marginBottom: 20,
    },
    timelineMarker: {
      alignItems: "center",
      marginRight: 16,
    },
    timelineDot: {
      width: 12,
      height: 12,
      borderRadius: 6,
    },
    timelineLine: {
      width: 2,
      height: 30,
      backgroundColor: colors.border,
      marginTop: 4,
    },
    timelineContent: {
      flex: 1,
    },
    timelineStatus: {
      fontSize: 16,
      fontWeight: "600",
      color: colors.text,
    },
    timelineTime: {
      fontSize: 14,
      color: colors.textSecondary,
      marginTop: 2,
    },
    timelineNotes: {
      fontSize: 14,
      color: colors.textMuted,
      marginTop: 4,
      fontStyle: "italic",
    },
    orderCard: {
      backgroundColor: colors.cardBackground,
      borderRadius: 12,
      padding: 20,
      marginBottom: 16,
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    },
    orderInfo: {
      marginTop: 8,
    },
    infoRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      marginBottom: 12,
    },
    infoLabel: {
      fontSize: 14,
      color: colors.textSecondary,
      flex: 1,
    },
    infoValue: {
      fontSize: 14,
      color: colors.text,
      fontWeight: "500",
      flex: 2,
      textAlign: "right",
    },
    rateButton: {
      backgroundColor: colors.primary,
      borderRadius: 12,
      padding: 16,
      alignItems: "center",
      marginBottom: 20,
    },
    rateButtonText: {
      color: "white",
      fontSize: 16,
      fontWeight: "bold",
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
      fontWeight: "bold",
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
      fontWeight: "bold",
      color: colors.text,
      textAlign: "center",
      marginBottom: 24,
    },
    ratingContainer: {
      flexDirection: "row",
      justifyContent: "center",
      marginBottom: 24,
    },
    starButton: {
      marginHorizontal: 8,
    },
    feedbackInput: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 8,
      padding: 12,
      fontSize: 16,
      color: colors.text,
      textAlignVertical: "top",
      marginBottom: 24,
      minHeight: 80,
    },
    modalButtons: {
      flexDirection: "row",
      justifyContent: "space-between",
    },
    modalButton: {
      flex: 1,
      paddingVertical: 12,
      borderRadius: 8,
      alignItems: "center",
    },
    cancelButton: {
      backgroundColor: colors.background,
      marginRight: 8,
    },
    submitButton: {
      backgroundColor: colors.primary,
      marginLeft: 8,
    },
    cancelButtonText: {
      color: colors.textSecondary,
      fontSize: 16,
      fontWeight: "600",
    },
    submitButtonText: {
      color: "white",
      fontSize: 16,
      fontWeight: "600",
    },
  });
