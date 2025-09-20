// src/screens/dashboard/DashboardScreen.js - Driver dashboard overview
import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../styles/theme";
import { createStylesWithDMSans } from "../../utils/fontUtils";
import { useDriverAuth } from "../../contexts/DriverAuthContext";
import { useLocation } from "../../contexts/LocationContext";
import { useAlert } from "../../contexts/AlertContext";
import CustomText from "../../components/ui/CustomText";
import EarningsCard from "../../components/delivery/EarningsCard";
import DeliveryCard from "../../components/delivery/DeliveryCard";
import DeliveryStatusBadge from "../../components/delivery/DeliveryStatusBadge";
import driverApiService from "../../services/driverApi";
import { DRIVER_STATUSES } from "../../utils/constants";

const DashboardScreen = ({ navigation }) => {
  const { colors } = useTheme();
  const { showError, showSuccess } = useAlert();
  const { driver, driverStatus, setDriverStatus, isDriverOnline } = useDriverAuth();
  const { currentLocation, startTracking, stopTracking } = useLocation();

  const [dashboardData, setDashboardData] = useState({
    todayEarnings: 0,
    weekEarnings: 0,
    monthEarnings: 0,
    completedDeliveries: 0,
    activeDeliveries: [],
    availableDeliveries: [],
    performance: {
      rating: 0,
      completionRate: 0,
      onTimeRate: 0,
    },
  });

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Load dashboard data
  const loadDashboardData = useCallback(async () => {
    try {
      const [earningsResponse, deliveriesResponse, performanceResponse] = await Promise.all([
        driverApiService.getEarnings("today"),
        driverApiService.getActiveDeliveries(),
        driverApiService.getPerformanceMetrics("week"),
      ]);

      setDashboardData(prev => ({
        ...prev,
        todayEarnings: earningsResponse.data?.todayEarnings || 0,
        weekEarnings: earningsResponse.data?.weekEarnings || 0,
        monthEarnings: earningsResponse.data?.monthEarnings || 0,
        completedDeliveries: earningsResponse.data?.completedDeliveries || 0,
        activeDeliveries: deliveriesResponse.data?.active || [],
        availableDeliveries: deliveriesResponse.data?.available || [],
        performance: {
          rating: performanceResponse.data?.averageRating || 0,
          completionRate: performanceResponse.data?.completionRate || 0,
          onTimeRate: performanceResponse.data?.onTimeRate || 0,
        },
      }));
    } catch (error) {
      console.error("Failed to load dashboard data:", error);
      showError("Failed to load dashboard data");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [showError]);

  // Handle refresh
  const onRefresh = useCallback(() => {
    setIsRefreshing(true);
    loadDashboardData();
  }, [loadDashboardData]);

  // Toggle driver status
  const toggleDriverStatus = async () => {
    const newStatus = isDriverOnline() ? DRIVER_STATUSES.OFFLINE : DRIVER_STATUSES.ONLINE;
    
    try {
      await driverApiService.updateStatus(newStatus);
      await setDriverStatus(newStatus);
      
      if (newStatus === DRIVER_STATUSES.ONLINE) {
        startTracking();
        showSuccess("You're now online and ready for deliveries!");
      } else {
        stopTracking();
        showSuccess("You're now offline");
      }
    } catch (error) {
      showError("Failed to update status");
    }
  };

  // Handle delivery card press
  const handleDeliveryPress = (delivery) => {
    navigation.navigate("DeliveryDetail", { deliveryId: delivery.id });
  };

  // Handle accept delivery
  const handleAcceptDelivery = async (delivery) => {
    try {
      await driverApiService.acceptDelivery(delivery.id);
      showSuccess("Delivery accepted!");
      loadDashboardData(); // Refresh data
    } catch (error) {
      showError("Failed to accept delivery");
    }
  };

  // Load data on component mount
  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  // Render driver status header
  const renderStatusHeader = () => (
    <View style={styles(colors).statusHeader}>
      <View style={styles(colors).driverInfo}>
        <CustomText style={styles(colors).greeting}>
          Good {getTimeOfDayGreeting()}, {driver?.firstName || 'Driver'}!
        </CustomText>
        <DeliveryStatusBadge status={driverStatus} type="driver" size="medium" />
      </View>
      
      <TouchableOpacity
        style={[
          styles(colors).statusToggle,
          isDriverOnline() ? styles(colors).statusToggleOnline : styles(colors).statusToggleOffline
        ]}
        onPress={toggleDriverStatus}
      >
        <CustomText style={[
          styles(colors).statusToggleText,
          isDriverOnline() ? styles(colors).statusToggleTextOnline : styles(colors).statusToggleTextOffline
        ]}>
          {isDriverOnline() ? "Go Offline" : "Go Online"}
        </CustomText>
      </TouchableOpacity>
    </View>
  );

  // Render earnings summary
  const renderEarningsSummary = () => (
    <View style={styles(colors).earningsContainer}>
      <EarningsCard
        title="Today's Earnings"
        amount={dashboardData.todayEarnings}
        subtitle={`${dashboardData.completedDeliveries} deliveries completed`}
        onPress={() => navigation.navigate("Earnings")}
      />
      
      <View style={styles(colors).earningsRow}>
        <View style={styles(colors).earningsItem}>
          <CustomText style={styles(colors).earningsLabel}>This Week</CustomText>
          <CustomText style={styles(colors).earningsValue}>
            ₦{dashboardData.weekEarnings.toLocaleString()}
          </CustomText>
        </View>
        <View style={styles(colors).earningsItem}>
          <CustomText style={styles(colors).earningsLabel}>This Month</CustomText>
          <CustomText style={styles(colors).earningsValue}>
            ₦{dashboardData.monthEarnings.toLocaleString()}
          </CustomText>
        </View>
      </View>
    </View>
  );

  // Render performance metrics
  const renderPerformanceMetrics = () => (
    <View style={styles(colors).performanceContainer}>
      <CustomText style={styles(colors).sectionTitle}>Performance</CustomText>
      
      <View style={styles(colors).metricsRow}>
        <View style={styles(colors).metricItem}>
          <View style={styles(colors).metricIcon}>
            <Ionicons name="star" size={20} color={colors.warning} />
          </View>
          <CustomText style={styles(colors).metricValue}>
            {dashboardData.performance.rating.toFixed(1)}
          </CustomText>
          <CustomText style={styles(colors).metricLabel}>Rating</CustomText>
        </View>
        
        <View style={styles(colors).metricItem}>
          <View style={styles(colors).metricIcon}>
            <Ionicons name="checkmark-circle" size={20} color={colors.success} />
          </View>
          <CustomText style={styles(colors).metricValue}>
            {dashboardData.performance.completionRate}%
          </CustomText>
          <CustomText style={styles(colors).metricLabel}>Completion</CustomText>
        </View>
        
        <View style={styles(colors).metricItem}>
          <View style={styles(colors).metricIcon}>
            <Ionicons name="time" size={20} color={colors.info} />
          </View>
          <CustomText style={styles(colors).metricValue}>
            {dashboardData.performance.onTimeRate}%
          </CustomText>
          <CustomText style={styles(colors).metricLabel}>On Time</CustomText>
        </View>
      </View>
    </View>
  );

  // Render active deliveries
  const renderActiveDeliveries = () => {
    if (dashboardData.activeDeliveries.length === 0) return null;

    return (
      <View style={styles(colors).section}>
        <View style={styles(colors).sectionHeader}>
          <CustomText style={styles(colors).sectionTitle}>Active Deliveries</CustomText>
          <TouchableOpacity onPress={() => navigation.navigate("ActiveDeliveries")}>
            <CustomText style={styles(colors).sectionLink}>View All</CustomText>
          </TouchableOpacity>
        </View>
        
        {dashboardData.activeDeliveries.slice(0, 2).map((delivery) => (
          <DeliveryCard
            key={delivery.id}
            delivery={delivery}
            onPress={handleDeliveryPress}
          />
        ))}
      </View>
    );
  };

  // Render available deliveries
  const renderAvailableDeliveries = () => {
    if (!isDriverOnline() || dashboardData.availableDeliveries.length === 0) {
      return (
        <View style={styles(colors).section}>
          <CustomText style={styles(colors).sectionTitle}>Available Deliveries</CustomText>
          <View style={styles(colors).emptyState}>
            <Ionicons 
              name={isDriverOnline() ? "hourglass" : "power"} 
              size={48} 
              color={colors.textSecondary} 
            />
            <CustomText style={styles(colors).emptyStateTitle}>
              {isDriverOnline() ? "No deliveries available" : "Go online to see deliveries"}
            </CustomText>
            <CustomText style={styles(colors).emptyStateText}>
              {isDriverOnline() 
                ? "New deliveries will appear here when available" 
                : "Switch to online mode to start receiving delivery requests"
              }
            </CustomText>
          </View>
        </View>
      );
    }

    return (
      <View style={styles(colors).section}>
        <View style={styles(colors).sectionHeader}>
          <CustomText style={styles(colors).sectionTitle}>Available Deliveries</CustomText>
          <TouchableOpacity onPress={() => navigation.navigate("AvailableDeliveries")}>
            <CustomText style={styles(colors).sectionLink}>View All</CustomText>
          </TouchableOpacity>
        </View>
        
        {dashboardData.availableDeliveries.slice(0, 3).map((delivery) => (
          <DeliveryCard
            key={delivery.id}
            delivery={delivery}
            onPress={handleDeliveryPress}
          />
        ))}
      </View>
    );
  };

  // Get time of day greeting
  const getTimeOfDayGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "morning";
    if (hour < 17) return "afternoon";
    return "evening";
  };

  return (
    <SafeAreaView style={styles(colors).container}>
      {/* Header */}
      <View style={styles(colors).header}>
        <CustomText style={styles(colors).headerTitle}>Dashboard</CustomText>
        <View style={styles(colors).headerActions}>
          <TouchableOpacity
            style={styles(colors).headerButton}
            onPress={() => navigation.navigate("Notifications")}
          >
            <Ionicons name="notifications-outline" size={24} color={colors.text} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles(colors).headerButton}
            onPress={() => navigation.navigate("Profile")}
          >
            <Ionicons name="person-outline" size={24} color={colors.text} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Content */}
      <ScrollView
        style={styles(colors).content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />
        }
      >
        {renderStatusHeader()}
        {renderEarningsSummary()}
        {renderPerformanceMetrics()}
        {renderActiveDeliveries()}
        {renderAvailableDeliveries()}
        
        {/* Bottom spacing */}
        <View style={styles(colors).bottomSpacing} />
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
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 20,
      paddingVertical: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    headerTitle: {
      fontSize: 24,
      fontWeight: "700",
      color: colors.text,
    },
    headerActions: {
      flexDirection: "row",
      alignItems: "center",
    },
    headerButton: {
      padding: 8,
      marginLeft: 8,
    },
    content: {
      flex: 1,
    },
    statusHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 20,
      paddingVertical: 20,
      backgroundColor: colors.surface,
      marginBottom: 16,
    },
    driverInfo: {
      flex: 1,
    },
    greeting: {
      fontSize: 18,
      fontWeight: "600",
      color: colors.text,
      marginBottom: 8,
    },
    statusToggle: {
      paddingHorizontal: 20,
      paddingVertical: 10,
      borderRadius: 20,
      borderWidth: 2,
    },
    statusToggleOnline: {
      backgroundColor: colors.error + "20",
      borderColor: colors.error,
    },
    statusToggleOffline: {
      backgroundColor: colors.success + "20",
      borderColor: colors.success,
    },
    statusToggleText: {
      fontSize: 14,
      fontWeight: "600",
    },
    statusToggleTextOnline: {
      color: colors.error,
    },
    statusToggleTextOffline: {
      color: colors.success,
    },
    earningsContainer: {
      paddingHorizontal: 20,
      marginBottom: 24,
    },
    earningsRow: {
      flexDirection: "row",
      marginTop: 16,
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: 16,
    },
    earningsItem: {
      flex: 1,
      alignItems: "center",
    },
    earningsLabel: {
      fontSize: 12,
      color: colors.textSecondary,
      marginBottom: 4,
    },
    earningsValue: {
      fontSize: 18,
      fontWeight: "700",
      color: colors.text,
    },
    performanceContainer: {
      paddingHorizontal: 20,
      marginBottom: 24,
    },
    metricsRow: {
      flexDirection: "row",
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: 16,
    },
    metricItem: {
      flex: 1,
      alignItems: "center",
    },
    metricIcon: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: colors.backgroundSecondary,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 8,
    },
    metricValue: {
      fontSize: 18,
      fontWeight: "700",
      color: colors.text,
      marginBottom: 2,
    },
    metricLabel: {
      fontSize: 12,
      color: colors.textSecondary,
    },
    section: {
      marginBottom: 24,
    },
    sectionHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 20,
      marginBottom: 12,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: "600",
      color: colors.text,
    },
    sectionLink: {
      fontSize: 14,
      color: colors.primary,
      fontWeight: "500",
    },
    emptyState: {
      alignItems: "center",
      paddingVertical: 40,
      paddingHorizontal: 20,
    },
    emptyStateTitle: {
      fontSize: 16,
      fontWeight: "600",
      color: colors.text,
      marginTop: 16,
      marginBottom: 8,
    },
    emptyStateText: {
      fontSize: 14,
      color: colors.textSecondary,
      textAlign: "center",
      lineHeight: 20,
    },
    bottomSpacing: {
      height: 100,
    },
  });

export default DashboardScreen;