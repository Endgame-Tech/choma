// src/screens/dashboard/DashboardScreen.js - Driver dashboard overview
import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Alert,
  Dimensions,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useTheme } from "../../styles/theme";
import { createStylesWithDMSans } from "../../utils/fontUtils";
import { useDriverAuth } from "../../contexts/DriverAuthContext";
import { useLocation } from "../../contexts/LocationContext";
import { useAlert } from "../../contexts/AlertContext";
import CustomText from "../../components/ui/CustomText";
import CustomIcon from "../../components/ui/CustomIcon";
import EarningsCard from "../../components/delivery/EarningsCard";
import DeliveryCard from "../../components/delivery/DeliveryCard";
import DeliveryStatusBadge from "../../components/delivery/DeliveryStatusBadge";
import LocationStatusIndicator from "../../components/location/LocationStatusIndicator";
import driverApiService from "../../services/driverApi";
import { DRIVER_STATUSES } from "../../utils/constants";

const { width } = Dimensions.get("window");

const DashboardScreen = ({ navigation }) => {
  const { colors } = useTheme();
  const { showError, showSuccess } = useAlert();
  const { driver, driverStatus, setDriverStatus, isDriverOnline } =
    useDriverAuth();
  const { currentLocation, startTracking, stopTracking } = useLocation();

  const [dashboardData, setDashboardData] = useState({
    todayEarnings: 0,
    todayTrips: 0,
    todayHours: 0,
    rating: 5.0,
    activeAssignments: [],
    availableAssignments: [],
    weeklyEarnings: 0,
    totalTrips: 0,
    completedDeliveries: 0,
    distance: 0,
  });

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Load dashboard data
  const loadDashboardData = useCallback(async () => {
    try {
      setIsLoading(true);
      console.log("📊 Loading real dashboard data...");

      // Fetch real data from your existing API endpoints
      const [
        todayStatsResult,
        assignmentsResult,
        weekStatsResult,
        profileResult,
      ] = await Promise.allSettled([
        driverApiService.getEarnings("today"),
        driverApiService.getAvailableDeliveries(),
        driverApiService.getEarnings("week"),
        driverApiService.getProfile(),
      ]);

      // Process today's stats
      if (
        todayStatsResult.status === "fulfilled" &&
        todayStatsResult.value?.success
      ) {
        const todayData = todayStatsResult.value.data;
        console.log("📈 Today's stats:", todayData);

        setDashboardData((prev) => ({
          ...prev,
          todayEarnings: todayData.earnings || 0,
          todayTrips: todayData.totalDeliveries || 0,
          completedDeliveries: todayData.completedDeliveries || 0,
          distance: todayData.distance || 0,
        }));
      }

      // Process available assignments
      if (
        assignmentsResult.status === "fulfilled" &&
        assignmentsResult.value?.success
      ) {
        const assignmentsData = assignmentsResult.value.data;
        console.log("🚚 Available assignments:", assignmentsData);

        setDashboardData((prev) => ({
          ...prev,
          availableAssignments: assignmentsData || [],
        }));
      }

      // Process week stats
      if (
        weekStatsResult.status === "fulfilled" &&
        weekStatsResult.value?.success
      ) {
        const weekData = weekStatsResult.value.data;
        console.log("📅 Week stats:", weekData);

        setDashboardData((prev) => ({
          ...prev,
          weeklyEarnings: weekData.earnings || 0,
          totalTrips: weekData.totalDeliveries || 0,
        }));
      }

      // Process driver profile for rating
      if (
        profileResult.status === "fulfilled" &&
        profileResult.value?.success
      ) {
        const profileData = profileResult.value.data;
        console.log("👤 Driver profile:", profileData);

        setDashboardData((prev) => ({
          ...prev,
          rating: profileData.rating?.average || 5.0,
        }));
      }

      console.log("✅ Dashboard data loaded successfully");
    } catch (error) {
      console.error("❌ Dashboard load error:", error);
      showError("Failed to load dashboard data");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [showError]);

  const onRefresh = useCallback(() => {
    setIsRefreshing(true);
    loadDashboardData();
  }, [loadDashboardData]);

  const toggleDriverStatus = async () => {
    const newStatus = isDriverOnline()
      ? DRIVER_STATUSES.OFFLINE
      : DRIVER_STATUSES.ONLINE;

    try {
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

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  // Render driver profile header
  const renderDriverHeader = () => (
    <View style={styles(colors).headerContainer}>
      {/* Status Bar */}
      <View style={styles(colors).statusBar}>
        <TouchableOpacity
          style={[
            styles(colors).statusToggle,
            {
              backgroundColor: isDriverOnline()
                ? colors.success
                : colors.textSecondary,
            },
          ]}
          onPress={toggleDriverStatus}
        >
          <View style={styles(colors).statusIndicator} />
          <CustomText style={styles(colors).statusLabel}>
            {isDriverOnline() ? "Online" : "Offline"}
          </CustomText>
        </TouchableOpacity>

        <View style={styles(colors).headerActions}>
          <TouchableOpacity style={styles(colors).actionButton}>
            <Ionicons
              name="notifications-outline"
              size={24}
              color={colors.text}
            />
          </TouchableOpacity>
          <TouchableOpacity style={styles(colors).actionButton}>
            <Ionicons name="menu-outline" size={24} color={colors.text} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Driver Profile */}
      <View style={styles(colors).profileSection}>
        <View style={styles(colors).avatarContainer}>
          <Image
            source={{
              uri: driver?.profileImage || "https://via.placeholder.com/60",
            }}
            style={styles(colors).avatar}
          />
        </View>

        <View style={styles(colors).profileInfo}>
          <CustomText style={styles(colors).welcomeText}>
            Good morning,
          </CustomText>
          <CustomText style={styles(colors).driverName}>
            {driver?.fullName ||
              `${driver?.firstName} ${driver?.lastName}` ||
              "Driver"}
          </CustomText>
          <View style={styles(colors).ratingContainer}>
            <Ionicons name="star" size={16} color="#FFD700" />
            <CustomText style={styles(colors).ratingText}>
              {dashboardData.rating} rating
            </CustomText>
          </View>
        </View>
      </View>
    </View>
  );

  // Render today's stats
  const renderTodayStats = () => (
    <View style={styles(colors).statsSection}>
      <CustomText style={styles(colors).sectionTitle}>
        Today's Performance
      </CustomText>

      <View style={styles(colors).statsGrid}>
        <View style={styles(colors).primaryStatCard}>
          <View style={styles(colors).statIconContainer}>
            <Ionicons name="wallet" size={24} color={colors.primary} />
          </View>
          <View style={styles(colors).statContent}>
            <CustomText style={styles(colors).statValue}>
              ₦{dashboardData.todayEarnings.toLocaleString()}
            </CustomText>
            <CustomText style={styles(colors).statLabel}>Earnings</CustomText>
          </View>
        </View>

        <View style={styles(colors).statCard}>
          <CustomText style={styles(colors).statNumber}>
            {dashboardData.todayTrips}
          </CustomText>
          <CustomText style={styles(colors).statLabel}>Trips</CustomText>
        </View>

        <View style={styles(colors).statCard}>
          <CustomText style={styles(colors).statNumber}>
            {dashboardData.todayHours}h
          </CustomText>
          <CustomText style={styles(colors).statLabel}>Online</CustomText>
        </View>
      </View>
    </View>
  );

  // Render quick actions
  const renderQuickActions = () => (
    <View style={styles(colors).quickActionsSection}>
      <CustomText style={styles(colors).sectionTitle}>Quick Actions</CustomText>

      <View style={styles(colors).actionsRow}>
        <TouchableOpacity
          style={styles(colors).actionCard}
          onPress={() => navigation.navigate("Deliveries")}
        >
          <View
            style={[
              styles(colors).actionIcon,
              { backgroundColor: colors.primary + "15" },
            ]}
          >
            <Ionicons name="car-outline" size={20} color={colors.primary} />
          </View>
          <CustomText style={styles(colors).actionText}>Deliveries</CustomText>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles(colors).actionCard}
          onPress={() => navigation.navigate("Earnings")}
        >
          <View
            style={[
              styles(colors).actionIcon,
              { backgroundColor: colors.success + "15" },
            ]}
          >
            <Ionicons
              name="analytics-outline"
              size={20}
              color={colors.success}
            />
          </View>
          <CustomText style={styles(colors).actionText}>Earnings</CustomText>
        </TouchableOpacity>

        <TouchableOpacity style={styles(colors).actionCard}>
          <View
            style={[
              styles(colors).actionIcon,
              { backgroundColor: colors.warning + "15" },
            ]}
          >
            <Ionicons name="map-outline" size={20} color={colors.warning} />
          </View>
          <CustomText style={styles(colors).actionText}>Navigate</CustomText>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles(colors).actionCard}
          onPress={() => navigation.navigate("Profile")}
        >
          <View
            style={[
              styles(colors).actionIcon,
              { backgroundColor: colors.textSecondary + "15" },
            ]}
          >
            <Ionicons
              name="person-outline"
              size={20}
              color={colors.textSecondary}
            />
          </View>
          <CustomText style={styles(colors).actionText}>Profile</CustomText>
        </TouchableOpacity>
      </View>
    </View>
  );

  // Render active assignments
  const renderActiveAssignments = () => {
    // Show first 2 available assignments
    const assignments = dashboardData.availableAssignments.slice(0, 2);

    if (!assignments.length) {
      return (
        <View style={styles(colors).section}>
          <CustomText style={styles(colors).sectionTitle}>
            Available Assignments
          </CustomText>
          <View style={styles(colors).emptyState}>
            <Ionicons
              name="car-outline"
              size={48}
              color={colors.textSecondary}
            />
            <CustomText style={styles(colors).emptyStateTitle}>
              No assignments available
            </CustomText>
            <CustomText style={styles(colors).emptyStateText}>
              {isDriverOnline()
                ? "New assignments will appear here when available"
                : "Go online to receive assignment requests"}
            </CustomText>
          </View>
        </View>
      );
    }

    return (
      <View style={styles(colors).section}>
        <View style={styles(colors).sectionHeader}>
          <CustomText style={styles(colors).sectionTitle}>
            Available Assignments ({assignments.length})
          </CustomText>
          <TouchableOpacity onPress={() => navigation.navigate("Deliveries")}>
            <CustomText style={styles(colors).viewAllText}>View All</CustomText>
          </TouchableOpacity>
        </View>

        {assignments.map((assignment, index) => (
          <TouchableOpacity
            key={assignment._id || index}
            style={styles(colors).assignmentCard}
            onPress={() =>
              navigation.navigate("DeliveryDetail", {
                assignmentId: assignment._id,
                assignment: assignment,
              })
            }
          >
            <View style={styles(colors).assignmentIcon}>
              <CustomIcon
                name={
                  assignment.subscriptionInfo?.subscriptionId
                    ? "list-filled"
                    : "delivery-man-filled"
                }
                size={20}
                color={
                  assignment.priority === "urgent"
                    ? colors.error
                    : colors.primary
                }
              />
            </View>
            <View style={styles(colors).assignmentInfo}>
              <CustomText style={styles(colors).assignmentTitle}>
                {assignment.subscriptionInfo?.subscriptionId
                  ? "Subscription Delivery"
                  : "One-time Delivery"}
              </CustomText>
              <CustomText style={styles(colors).assignmentTime}>
                {assignment.timeToPickup > 0
                  ? `Pickup in: ${assignment.timeToPickup} mins`
                  : "Ready for pickup"}
              </CustomText>
              <CustomText style={styles(colors).assignmentSubtitle}>
                ₦{assignment.totalEarning} •{" "}
                {assignment.totalDistance?.toFixed(1)}km
              </CustomText>
            </View>
            <View style={styles(colors).assignmentMeta}>
              <CustomText style={styles(colors).assignmentDateTime}>
                {new Date(assignment.estimatedPickupTime).toLocaleTimeString(
                  "en-US",
                  {
                    hour: "2-digit",
                    minute: "2-digit",
                    hour12: true,
                  }
                )}
              </CustomText>
              {assignment.priority === "urgent" && (
                <View style={styles(colors).urgentBadge}>
                  <CustomText style={styles(colors).urgentText}>
                    URGENT
                  </CustomText>
                </View>
              )}
            </View>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles(colors).container}>
      <ScrollView
        style={styles(colors).scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />
        }
      >
        {renderDriverHeader()}
        {renderTodayStats()}
        {renderQuickActions()}
        {renderActiveAssignments()}

        <View style={styles(colors).bottomSpacing} />
      </ScrollView>
    </SafeAreaView>
  );
};
export default DashboardScreen;

const styles = (colors) =>
  createStylesWithDMSans({
    container: {
      flex: 1,
      backgroundColor: colors.background, // Fixed: was hardcoded '#FAFAFA'
    },
    scrollView: {
      flex: 1,
    },

    // Header Styles
    headerContainer: {
      backgroundColor: colors.surface,
      paddingHorizontal: 20,
      paddingTop: 16,
      paddingBottom: 24,
      borderBottomLeftRadius: 20,
      borderBottomRightRadius: 20,
      shadowColor: "#000",
      shadowOffset: {
        width: 0,
        height: 2,
      },
      shadowOpacity: 0.1,
      shadowRadius: 3.84,
      elevation: 5,
      marginBottom: 24,
    },
    statusBar: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 24,
    },
    statusToggle: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 20,
      gap: 8,
    },
    statusIndicator: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: "white",
    },
    statusLabel: {
      color: "white",
      fontSize: 14,
      fontWeight: "600",
    },
    headerActions: {
      flexDirection: "row",
      gap: 12,
    },
    actionButton: {
      padding: 8,
    },

    // Profile Section
    profileSection: {
      flexDirection: "row",
      alignItems: "center",
    },
    avatarContainer: {
      marginRight: 16,
    },
    avatar: {
      width: 60,
      height: 60,
      borderRadius: 30,
    },
    profileInfo: {
      flex: 1,
    },
    welcomeText: {
      fontSize: 14,
      color: colors.textSecondary,
      marginBottom: 2,
    },
    driverName: {
      fontSize: 20,
      fontWeight: "700",
      color: colors.text,
      marginBottom: 4,
    },
    ratingContainer: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
    },
    ratingText: {
      fontSize: 12,
      color: colors.textSecondary,
      fontWeight: "500",
    },

    // Stats Section
    statsSection: {
      paddingHorizontal: 20,
      marginBottom: 24,
    },
    statsGrid: {
      flexDirection: "row",
      gap: 12,
    },
    primaryStatCard: {
      flex: 2,
      backgroundColor: colors.surface,
      padding: 20,
      borderRadius: 16,
      flexDirection: "row",
      alignItems: "center",
      borderWidth: 1,
      borderColor: colors.border,
    },
    statIconContainer: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: colors.primary + "15",
      alignItems: "center",
      justifyContent: "center",
      marginRight: 16,
    },
    statContent: {
      flex: 1,
    },
    statValue: {
      fontSize: 24,
      fontWeight: "700",
      color: colors.text,
      marginBottom: 2,
    },
    statCard: {
      flex: 1,
      backgroundColor: colors.surface,
      padding: 16,
      borderRadius: 16,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1,
      borderColor: colors.border,
    },
    statNumber: {
      fontSize: 20,
      fontWeight: "700",
      color: colors.text,
      marginBottom: 4,
    },
    statLabel: {
      fontSize: 12,
      color: colors.textSecondary,
      textAlign: "center",
    },

    // Section Styles
    section: {
      paddingHorizontal: 20,
      marginBottom: 24,
    },
    sectionHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 16,
    },
    sectionTitle: {
      fontSize: 16,
      fontWeight: "400",
      color: colors.text,
      marginBottom: 16,
      opacity: 0.7,
    },
    sectionHeaderTitle: {
      fontSize: 18,
      fontWeight: "700",
      color: colors.text,
    },
    viewAllText: {
      fontSize: 14,
      color: colors.primary,
      fontWeight: "600",
    },

    // Quick Actions
    quickActionsSection: {
      paddingHorizontal: 20,
      marginBottom: 24,
    },
    actionsRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      gap: 12,
    },
    actionCard: {
      flex: 1,
      backgroundColor: colors.surface,
      padding: 16,
      borderRadius: 12,
      alignItems: "center",
      minHeight: 80,
      justifyContent: "center",
      borderWidth: 1,
      borderColor: colors.border,
    },
    actionIcon: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 8,
    },
    actionText: {
      fontSize: 12,
      fontWeight: "600",
      color: colors.text,
      textAlign: "center",
    },

    // Assignment Cards
    assignmentCard: {
      backgroundColor: colors.surface,
      padding: 16,
      borderRadius: 12,
      marginBottom: 12,
      flexDirection: "row",
      alignItems: "center",
      borderWidth: 1,
      borderColor: colors.border,
    },
    assignmentIcon: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.primary + "15",
      alignItems: "center",
      justifyContent: "center",
      marginRight: 12,
    },
    assignmentInfo: {
      flex: 1,
    },
    assignmentTitle: {
      fontSize: 16,
      fontWeight: "600",
      color: colors.text,
      marginBottom: 4,
    },
    assignmentTime: {
      fontSize: 14,
      color: colors.textSecondary,
      marginBottom: 2,
    },
    assignmentSubtitle: {
      fontSize: 12,
      color: colors.textSecondary,
      fontWeight: "500",
    },
    assignmentMeta: {
      alignItems: "flex-end",
    },
    assignmentDateTime: {
      fontSize: 12,
      color: colors.textSecondary,
      fontWeight: "500",
    },

    urgentBadge: {
      backgroundColor: colors.error,
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 6,
      marginTop: 4,
    },
    urgentText: {
      fontSize: 10,
      color: colors.white, // Fixed: was hardcoded "#fff"
      fontWeight: "700",
    },
    emptyState: {
      alignItems: "center",
      paddingVertical: 40,
      paddingHorizontal: 20,
      backgroundColor: colors.surface,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
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

    // Bottom spacing
    bottomSpacing: {
      height: 80,
    },
  });
