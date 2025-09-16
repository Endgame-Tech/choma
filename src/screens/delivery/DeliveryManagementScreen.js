// src/screens/delivery/DeliveryManagementScreen.js - Customer Delivery Dashboard
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  Alert,
  ActivityIndicator,
  TextInput,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useAuth } from "../../context/Auth";
import ApiService from "../../services/api";
import { useTheme } from "../../styles/theme";
import { getDeliveries } from "../../data/deliveries";
import { createStylesWithDMSans } from "../../utils/fontUtils";

const DeliveryManagementScreen = ({ navigation }) => {
  const { colors } = useTheme();
  const { user } = useAuth();
  const [deliveries, setDeliveries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("all");

  const statusFilters = [
    { id: "all", label: "All", color: colors.text },
    { id: "Pending Assignment", label: "Pending", color: colors.warning },
    { id: "En Route to Customer", label: "En Route", color: colors.primary },
    { id: "Delivered", label: "Delivered", color: colors.success },
    { id: "Failed Delivery", label: "Failed", color: colors.error },
  ];

  useEffect(() => {
    loadDeliveries();
  }, []);

  const loadDeliveries = async () => {
    try {
      const result = await ApiService.getMyDeliveries();
      if (result.success) {
        setDeliveries(result.data || []);
      } else {
        setDeliveries(getDeliveries());
      }
    } catch (error) {
      console.error("Error loading deliveries:", error);
      setDeliveries(getDeliveries());
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadDeliveries();
  };

  const filteredDeliveries = deliveries.filter((delivery) => {
    const matchesStatus =
      selectedStatus === "all" || delivery.deliveryStatus === selectedStatus;
    const matchesSearch =
      delivery.trackingId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      delivery.order._id.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

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

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const viewDeliveryDetails = (delivery) => {
    navigation.navigate("EnhancedTracking", {
      trackingId: delivery.trackingId,
      orderId: delivery.order._id,
      order: delivery.order,
    });
  };

  const renderDeliveryCard = (delivery) => (
    <TouchableOpacity
      key={delivery._id}
      style={styles(colors).deliveryCard}
      onPress={() => viewDeliveryDetails(delivery)}
    >
      <View style={styles(colors).cardHeader}>
        <View style={styles(colors).orderInfo}>
          <Text style={styles(colors).trackingId}>#{delivery.trackingId}</Text>
          <Text style={styles(colors).orderDate}>
            {formatDate(delivery.createdAt)}
          </Text>
        </View>
        <View
          style={[
            styles(colors).statusBadge,
            { backgroundColor: getStatusColor(delivery.deliveryStatus) },
          ]}
        >
          <Text style={styles(colors).statusText}>
            {delivery.deliveryStatus}
          </Text>
        </View>
      </View>

      <View style={styles(colors).cardContent}>
        <View style={styles(colors).orderDetails}>
          <Text style={styles(colors).orderAmount}>
            ₦{delivery.order.totalAmount?.toLocaleString()}
          </Text>
          <Text style={styles(colors).deliveryAddress}>
            {delivery.deliveryLocation?.address}
          </Text>
        </View>

        {delivery.driver && (
          <View style={styles(colors).driverInfo}>
            <Ionicons
              name="person-circle-outline"
              size={20}
              color={colors.primary}
            />
            <Text style={styles(colors).driverName}>
              {delivery.driver.fullName}
            </Text>
            <View style={styles(colors).driverRating}>
              <Ionicons name="star" size={12} color={colors.warning} />
              <Text style={styles(colors).ratingText}>
                {delivery.driver.rating}
              </Text>
            </View>
          </View>
        )}

        {delivery.estimatedDeliveryTime && (
          <View style={styles(colors).estimatedTime}>
            <Ionicons
              name="time-outline"
              size={16}
              color={colors.textSecondary}
            />
            <Text style={styles(colors).estimatedTimeText}>
              Est. delivery: {formatDate(delivery.estimatedDeliveryTime)}
            </Text>
          </View>
        )}
      </View>

      <View style={styles(colors).cardFooter}>
        <TouchableOpacity
          style={styles(colors).trackButton}
          onPress={() => viewDeliveryDetails(delivery)}
        >
          <Ionicons name="location-outline" size={16} color={colors.primary} />
          <Text style={styles(colors).trackButtonText}>Track Order</Text>
        </TouchableOpacity>

        {delivery.deliveryStatus === "Delivered" &&
          !delivery.customerRating && (
            <TouchableOpacity style={styles(colors).rateButton}>
              <Ionicons name="star-outline" size={16} color={colors.warning} />
              <Text style={styles(colors).rateButtonText}>Rate</Text>
            </TouchableOpacity>
          )}
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles(colors).container}>
        <View style={styles(colors).loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles(colors).loadingText}>
            Loading your deliveries...
          </Text>
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
          <Text style={styles(colors).headerTitle}>My Deliveries</Text>
          <Text style={styles(colors).headerSubtitle}>
            Track all your orders
          </Text>
        </View>
      </LinearGradient>

      {/* Search and Filters */}
      <View style={styles(colors).searchContainer}>
        <View style={styles(colors).searchBox}>
          <Ionicons
            name="search-outline"
            size={20}
            color={colors.textSecondary}
          />
          <TextInput
            style={styles(colors).searchInput}
            placeholder="Search by tracking ID or order..."
            placeholderTextColor={colors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles(colors).filterContainer}
        contentContainerStyle={styles(colors).filterContent}
      >
        {statusFilters.map((filter) => (
          <TouchableOpacity
            key={filter.id}
            style={[
              styles(colors).filterChip,
              selectedStatus === filter.id && styles(colors).filterChipActive,
            ]}
            onPress={() => setSelectedStatus(filter.id)}
          >
            <Text
              style={[
                styles(colors).filterChipText,
                selectedStatus === filter.id &&
                  styles(colors).filterChipTextActive,
              ]}
            >
              {filter.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Deliveries List */}
      <ScrollView
        style={styles(colors).content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {filteredDeliveries.length > 0 ? (
          <>
            <Text style={styles(colors).resultsCount}>
              {filteredDeliveries.length} delivery
              {filteredDeliveries.length !== 1 ? "s" : ""} found
            </Text>
            {filteredDeliveries.map(renderDeliveryCard)}
          </>
        ) : (
          <View style={styles(colors).emptyState}>
            <Ionicons name="receipt-outline" size={80} color={colors.border} />
            <Text style={styles(colors).emptyTitle}>No Deliveries Found</Text>
            <Text style={styles(colors).emptySubtitle}>
              {searchQuery || selectedStatus !== "all"
                ? "Try adjusting your search or filters"
                : "You haven't placed any orders yet"}
            </Text>
            {!searchQuery && selectedStatus === "all" && (
              <TouchableOpacity
                style={styles(colors).orderButton}
                onPress={() => navigation.navigate("Main", { screen: "Home" })}
              >
                <Text style={styles(colors).orderButtonText}>
                  Order Your First Meal
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </ScrollView>
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
    headerSubtitle: {
      fontSize: 14,
      color: "rgba(255, 255, 255, 0.8)",
    },
    searchContainer: {
      paddingHorizontal: 16,
      paddingVertical: 12,
    },
    searchBox: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.cardBackground,
      borderRadius: 12,
      paddingHorizontal: 16,
      paddingVertical: 12,
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.1,
      shadowRadius: 3,
      elevation: 2,
    },
    searchInput: {
      flex: 1,
      marginLeft: 12,
      fontSize: 16,
      color: colors.text,
    },
    filterContainer: {
      paddingLeft: 16,
      marginBottom: 8,
    },
    filterContent: {
      paddingRight: 16,
    },
    filterChip: {
      paddingHorizontal: 16,
      paddingVertical: 8,
      marginRight: 8,
      borderRadius: 20,
      backgroundColor: colors.cardBackground,
      borderWidth: 1,
      borderColor: colors.border,
    },
    filterChipActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    filterChipText: {
      fontSize: 14,
      color: colors.textSecondary,
      fontWeight: "500",
    },
    filterChipTextActive: {
      color: "white",
    },
    content: {
      flex: 1,
      paddingHorizontal: 16,
    },
    resultsCount: {
      fontSize: 14,
      color: colors.textSecondary,
      marginBottom: 16,
      paddingHorizontal: 4,
    },
    deliveryCard: {
      backgroundColor: colors.cardBackground,
      borderRadius: 12,
      padding: 16,
      marginBottom: 16,
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    },
    cardHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 12,
    },
    orderInfo: {},
    trackingId: {
      fontSize: 16,
      fontWeight: "bold",
      color: colors.text,
    },
    orderDate: {
      fontSize: 12,
      color: colors.textSecondary,
      marginTop: 2,
    },
    statusBadge: {
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 12,
    },
    statusText: {
      fontSize: 12,
      fontWeight: "bold",
      color: "white",
    },
    cardContent: {
      marginBottom: 12,
    },
    orderDetails: {
      marginBottom: 8,
    },
    orderAmount: {
      fontSize: 18,
      fontWeight: "bold",
      color: colors.text,
    },
    deliveryAddress: {
      fontSize: 14,
      color: colors.textSecondary,
      marginTop: 2,
    },
    driverInfo: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 8,
    },
    driverName: {
      fontSize: 14,
      color: colors.text,
      marginLeft: 8,
      flex: 1,
    },
    driverRating: {
      flexDirection: "row",
      alignItems: "center",
    },
    ratingText: {
      fontSize: 12,
      color: colors.textSecondary,
      marginLeft: 2,
    },
    estimatedTime: {
      flexDirection: "row",
      alignItems: "center",
    },
    estimatedTimeText: {
      fontSize: 12,
      color: colors.textSecondary,
      marginLeft: 4,
    },
    cardFooter: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    trackButton: {
      flexDirection: "row",
      alignItems: "center",
    },
    trackButtonText: {
      fontSize: 14,
      color: colors.primary,
      fontWeight: "600",
      marginLeft: 4,
    },
    rateButton: {
      flexDirection: "row",
      alignItems: "center",
    },
    rateButtonText: {
      fontSize: 14,
      color: colors.warning,
      fontWeight: "600",
      marginLeft: 4,
    },
    emptyState: {
      alignItems: "center",
      paddingVertical: 60,
      paddingHorizontal: 20,
    },
    emptyTitle: {
      fontSize: 20,
      fontWeight: "bold",
      color: colors.text,
      marginTop: 16,
      marginBottom: 8,
    },
    emptySubtitle: {
      fontSize: 16,
      color: colors.textSecondary,
      textAlign: "center",
      lineHeight: 24,
      marginBottom: 32,
    },
    orderButton: {
      backgroundColor: colors.primary,
      borderRadius: 12,
      paddingHorizontal: 24,
      paddingVertical: 12,
    },
    orderButtonText: {
      color: "white",
      fontSize: 16,
      fontWeight: "bold",
    },
  });

export default DeliveryManagementScreen;
