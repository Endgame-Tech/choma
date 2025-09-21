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
      const [todayStatsResult, assignmentsResult, weekStatsResult, profileResult] =
        await Promise.allSettled([
          driverApiService.getEarnings("today"),
          driverApiService.getAvailableDeliveries(),
          driverApiService.getEarnings("week"), 
          driverApiService.getProfile(),
        ]);

      // Process today's stats
      if (todayStatsResult.status === 'fulfilled' && todayStatsResult.value?.success) {
        const todayData = todayStatsResult.value.data;
        console.log("📈 Today's stats:", todayData);
        
        setDashboardData(prev => ({
          ...prev,
          todayEarnings: todayData.earnings || 0,
          todayTrips: todayData.totalDeliveries || 0,
          completedDeliveries: todayData.completedDeliveries || 0,
          distance: todayData.distance || 0,
        }));
      }

      // Process available assignments
      if (assignmentsResult.status === 'fulfilled' && assignmentsResult.value?.success) {
        const assignmentsData = assignmentsResult.value.data;
        console.log("🚚 Available assignments:", assignmentsData);
        
        setDashboardData(prev => ({
          ...prev,
          availableAssignments: assignmentsData || [],
        }));
      }

      // Process week stats
      if (weekStatsResult.status === 'fulfilled' && weekStatsResult.value?.success) {
        const weekData = weekStatsResult.value.data;
        console.log("📅 Week stats:", weekData);
        
        setDashboardData(prev => ({
          ...prev,
          weeklyEarnings: weekData.earnings || 0,
          totalTrips: weekData.totalDeliveries || 0,
        }));
      }

      // Process driver profile for rating
      if (profileResult.status === 'fulfilled' && profileResult.value?.success) {
        const profileData = profileResult.value.data;
        console.log("👤 Driver profile:", profileData);
        
        setDashboardData(prev => ({
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
      {/* Menu and Status */}
      <View style={styles(colors).topBar}>
        <TouchableOpacity style={styles(colors).menuButton}>
          <CustomIcon name="reorder" size={24} color={colors.text} />
        </TouchableOpacity>

        <View style={styles(colors).statusContainer}>
          <LocationStatusIndicator compact style={styles(colors).locationStatus} />
          
          <TouchableOpacity
            style={[
              styles(colors).statusBadge,
              {
                backgroundColor: isDriverOnline() ? colors.success : colors.error,
              },
            ]}
            onPress={toggleDriverStatus}
          >
            <CustomText style={styles(colors).statusText}>
              {isDriverOnline() ? "Online" : "Offline"}
            </CustomText>
          </TouchableOpacity>
        </View>
      </View>

      {/* Driver Profile */}
      <View style={styles(colors).driverProfile}>
        <View style={styles(colors).avatarContainer}>
          <Image
            source={{
              uri: driver?.profileImage || "https://via.placeholder.com/80",
            }}
            style={styles(colors).avatar}
          />
          <View style={styles(colors).ratingBadge}>
            <CustomIcon name="star-filled" size={14} color="#fff" />
            <CustomText style={styles(colors).ratingText}>
              {dashboardData.rating}
            </CustomText>
          </View>
        </View>

        <View style={styles(colors).driverInfo}>
          <CustomText style={styles(colors).driverName}>
            {driver?.fullName || `${driver?.firstName} ${driver?.lastName}` || "Driver"}
          </CustomText>
          <CustomText style={styles(colors).driverId}>
            ID: #{driver?.driverId || driver?._id?.slice(-8) || "--------"}
          </CustomText>
        </View>
      </View>
    </View>
  );

  // Render today's stats
  const renderTodayStats = () => (
    <View style={styles(colors).statsContainer}>
      <View style={styles(colors).statCard}>
        <CustomText style={styles(colors).statLabel}>
          Today's Earning
        </CustomText>
        <CustomText style={styles(colors).statValue}>
          ₦{dashboardData.todayEarnings.toLocaleString()}
        </CustomText>
      </View>

      <View style={styles(colors).statCard}>
        <CustomText style={styles(colors).statLabel}>Today's Trips</CustomText>
        <CustomText style={styles(colors).statValue}>
          {dashboardData.todayTrips}
        </CustomText>
      </View>

      <View style={styles(colors).statCard}>
        <CustomText style={styles(colors).statLabel}>
          Today's Login Hrs
        </CustomText>
        <CustomText style={styles(colors).statValue}>
          {dashboardData.todayHours} Hrs
        </CustomText>
      </View>
    </View>
  );

  // Render delivery types
  const renderDeliveryTypes = () => (
    <View style={styles(colors).section}>
      <CustomText style={styles(colors).sectionTitle}>
        Delivery Types
      </CustomText>

      <View style={styles(colors).deliveryTypesGrid}>
        <TouchableOpacity style={styles(colors).deliveryTypeCard}>
          <CustomIcon
            name="calendar-filled"
            size={24}
            color={colors.primary}
          />
          <CustomText style={styles(colors).deliveryTypeText}>
            Current Deliveries
          </CustomText>
        </TouchableOpacity>

        <TouchableOpacity style={styles(colors).deliveryTypeCard}>
          <CustomIcon
            name="list-filled"
            size={24}
            color={colors.info}
          />
          <CustomText style={styles(colors).deliveryTypeText}>
            Subscription
          </CustomText>
        </TouchableOpacity>

        <TouchableOpacity style={styles(colors).deliveryTypeCard}>
          <CustomIcon
            name="delivery-man-filled"
            size={24}
            color={colors.warning}
          />
          <CustomText style={styles(colors).deliveryTypeText}>
            Express
          </CustomText>
        </TouchableOpacity>

        <TouchableOpacity style={styles(colors).deliveryTypeCard}>
          <CustomIcon
            name="calendar"
            size={24}
            color={colors.success}
          />
          <CustomText style={styles(colors).deliveryTypeText}>
            Scheduled
          </CustomText>
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
          <View style={styles(colors).sectionHeader}>
            <CustomText style={styles(colors).sectionTitle}>
              Available Assignments
            </CustomText>
          </View>
          <View style={styles(colors).emptyState}>
            <CustomIcon name="delivery-man" size={48} color={colors.textSecondary} />
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
          <TouchableOpacity onPress={() => navigation.navigate("AvailableDeliveries")}>
            <CustomText style={styles(colors).viewAllText}>View All ▶</CustomText>
          </TouchableOpacity>
        </View>

        {assignments.map((assignment, index) => (
          <TouchableOpacity 
            key={assignment._id || index}
            style={styles(colors).assignmentCard}
            onPress={() => navigation.navigate("DeliveryDetail", { assignmentId: assignment._id })}
          >
            <View style={styles(colors).assignmentIcon}>
              <CustomIcon
                name={assignment.subscriptionInfo?.subscriptionId ? "list-filled" : "delivery-man-filled"}
                size={20}
                color={assignment.priority === 'urgent' ? colors.error : colors.primary}
              />
            </View>
            <View style={styles(colors).assignmentInfo}>
              <CustomText style={styles(colors).assignmentTitle}>
                {assignment.subscriptionInfo?.subscriptionId ? "Subscription Delivery" : "One-time Delivery"}
              </CustomText>
              <CustomText style={styles(colors).assignmentTime}>
                {assignment.timeToPickup > 0 
                  ? `Pickup in: ${assignment.timeToPickup} mins`
                  : "Ready for pickup"}
              </CustomText>
              <CustomText style={styles(colors).assignmentSubtitle}>
                ₦{assignment.totalEarning} • {assignment.totalDistance?.toFixed(1)}km
              </CustomText>
            </View>
            <View style={styles(colors).assignmentMeta}>
              <CustomText style={styles(colors).assignmentDateTime}>
                {new Date(assignment.estimatedPickupTime).toLocaleTimeString('en-US', {
                  hour: '2-digit',
                  minute: '2-digit',
                  hour12: true
                })}
              </CustomText>
              {assignment.priority === 'urgent' && (
                <View style={styles(colors).urgentBadge}>
                  <CustomText style={styles(colors).urgentText}>URGENT</CustomText>
                </View>
              )}
            </View>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  // Render recommended assignments
  const renderRecommendedAssignments = () => (
    <View style={styles(colors).section}>
      <View style={styles(colors).sectionHeader}>
        <CustomText style={styles(colors).sectionTitle}>
          Recommended Assignments
        </CustomText>
        <TouchableOpacity>
          <CustomText style={styles(colors).viewAllText}>View All ▶</CustomText>
        </TouchableOpacity>
      </View>

      <View style={styles(colors).recommendedCard}>
        <View style={styles(colors).recommendedHeader}>
          <View style={styles(colors).assignmentIcon}>
            <CustomIcon
              name="location-filled"
              size={20}
              color={colors.primary}
            />
          </View>
          <View style={styles(colors).recommendedInfo}>
            <CustomText style={styles(colors).recommendedTitle}>
              Round Trip
            </CustomText>
            <CustomText style={styles(colors).recommendedDetails}>
              Estimate Usage: 5 Hrs Total Dist.: 85 km
            </CustomText>
          </View>
          <View style={styles(colors).recommendedBadge}>
            <CustomText style={styles(colors).recommendedBadgeText}>
              28 Sep, 10:10 AM
            </CustomText>
          </View>
        </View>

        <View style={styles(colors).routeInfo}>
          <View style={styles(colors).routePoint}>
            <View
              style={[
                styles(colors).routeDot,
                { backgroundColor: colors.primary },
              ]}
            />
            <CustomText style={styles(colors).routeText}>
              108, Auchandi Bawana Rd, Bawana Village, Ba...
            </CustomText>
          </View>

          <View style={styles(colors).routePoint}>
            <View
              style={[
                styles(colors).routeDot,
                { backgroundColor: colors.error },
              ]}
            />
            <CustomText style={styles(colors).routeText}>
              E-15, Block E, East of Kailash, New Delhi, Delh...
            </CustomText>
          </View>
        </View>

        <View style={styles(colors).priceContainer}>
          <CustomIcon
            name="wallet-filled"
            size={18}
            color={colors.primary}
          />
          <CustomText style={styles(colors).priceText}>₦1,500</CustomText>
        </View>
      </View>
    </View>
  );

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
        {renderDeliveryTypes()}
        {renderActiveAssignments()}
        {renderRecommendedAssignments()}

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
      backgroundColor: colors.background,
    },
    scrollView: {
      flex: 1,
    },

    // Header Styles
    headerContainer: {
      backgroundColor: colors.cardBackground,
      paddingHorizontal: 20,
      paddingTop: 10,
      paddingBottom: 20,
      borderBottomLeftRadius: 24,
      borderBottomRightRadius: 24,
      shadowColor: colors.black,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 5,
    },
    topBar: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 20,
    },
    menuButton: {
      padding: 8,
    },
    statusContainer: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    locationStatus: {
      // Additional styling if needed
    },
    statusBadge: {
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 20,
    },
    statusText: {
      color: colors.white,
      fontSize: 14,
      fontWeight: "600",
    },

    // Driver Profile
    driverProfile: {
      flexDirection: "row",
      alignItems: "center",
    },
    avatarContainer: {
      position: "relative",
      marginRight: 16,
    },
    avatar: {
      width: 80,
      height: 80,
      borderRadius: 40,
      borderWidth: 3,
      borderColor: colors.primaryLight,
    },
    ratingBadge: {
      position: "absolute",
      bottom: -2,
      right: -2,
      backgroundColor: colors.accent,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 12,
      flexDirection: "row",
      alignItems: "center",
      gap: 2,
    },
    ratingText: {
      color: colors.white,
      fontSize: 12,
      fontWeight: "600",
    },
    driverInfo: {
      flex: 1,
    },
    driverName: {
      fontSize: 24,
      fontWeight: "700",
      color: "#1A1A1A",
      marginBottom: 4,
    },
    driverId: {
      fontSize: 14,
      color: "#666",
    },

    // Stats Container
    statsContainer: {
      flexDirection: "row",
      paddingHorizontal: 20,
      paddingVertical: 20,
      gap: 12,
    },
    statCard: {
      flex: 1,
      backgroundColor: "#fff",
      padding: 16,
      borderRadius: 16,
      alignItems: "center",
      borderWidth: 1,
      borderColor: "#E0E0E0",
    },
    statLabel: {
      fontSize: 12,
      color: "#666",
      marginBottom: 8,
      textAlign: "center",
    },
    statValue: {
      fontSize: 18,
      fontWeight: "700",
      color: "#1A1A1A",
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
      fontSize: 20,
      fontWeight: "700",
      color: colors.text,
    },
    viewAllText: {
      fontSize: 14,
      color: colors.primary,
      fontWeight: "500",
    },

    // Delivery Types Grid
    deliveryTypesGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 12,
    },
    deliveryTypeCard: {
      width: (width - 56) / 2,
      backgroundColor: colors.cardBackground,
      padding: 20,
      borderRadius: 16,
      alignItems: "center",
    },
    deliveryTypeText: {
      fontSize: 14,
      fontWeight: "600",
      color: colors.text,
      marginTop: 8,
      textAlign: "center",
    },

    // Assignment Cards
    assignmentCard: {
      backgroundColor: "#fff",
      padding: 16,
      borderRadius: 16,
      marginBottom: 12,
      flexDirection: "row",
      alignItems: "center",
    },
    assignmentIcon: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: "#F0F7FF",
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
      color: "#1A1A1A",
      marginBottom: 4,
    },
    assignmentTime: {
      fontSize: 14,
      color: "#666",
    },
    assignmentDateTime: {
      fontSize: 12,
      color: "#999",
      fontWeight: "500",
    },

    // Recommended Card
    recommendedCard: {
      backgroundColor: "#fff",
      padding: 16,
      borderRadius: 16,
    },
    recommendedHeader: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 16,
    },
    recommendedInfo: {
      flex: 1,
      marginLeft: 12,
    },
    recommendedTitle: {
      fontSize: 16,
      fontWeight: "600",
      color: "#1A1A1A",
      marginBottom: 4,
    },
    recommendedDetails: {
      fontSize: 12,
      color: "#666",
    },
    recommendedBadge: {
      backgroundColor: "#FFF4E6",
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 8,
    },
    recommendedBadgeText: {
      fontSize: 10,
      color: "#D97706",
      fontWeight: "500",
    },

    // Route Info
    routeInfo: {
      marginBottom: 16,
    },
    routePoint: {
      flexDirection: "row",
      alignItems: "flex-start",
      marginBottom: 8,
    },
    routeDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      marginTop: 6,
      marginRight: 12,
    },
    routeText: {
      flex: 1,
      fontSize: 14,
      color: "#666",
      lineHeight: 20,
    },

    // Price Container
    priceContainer: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: "#F0F7FF",
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 8,
      alignSelf: "flex-start",
    },
    priceText: {
      fontSize: 16,
      fontWeight: "700",
      color: "#4A90E2",
      marginLeft: 4,
    },

    // Assignment Card Updates
    assignmentSubtitle: {
      fontSize: 12,
      color: "#999",
      fontWeight: "500",
    },
    assignmentMeta: {
      alignItems: "flex-end",
    },
    urgentBadge: {
      backgroundColor: "#FF6B35",
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 8,
    },
    urgentText: {
      fontSize: 10,
      color: "#fff",
      fontWeight: "700",
    },
    emptyState: {
      alignItems: "center",
      paddingVertical: 40,
      paddingHorizontal: 20,
    },
    emptyStateTitle: {
      fontSize: 16,
      fontWeight: "600",
      color: "#1A1A1A",
      marginTop: 16,
      marginBottom: 8,
    },
    emptyStateText: {
      fontSize: 14,
      color: "#666",
      textAlign: "center",
      lineHeight: 20,
    },

    // Bottom spacing
    bottomSpacing: {
      height: 80,
    },
  });
