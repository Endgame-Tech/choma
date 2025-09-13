// src/screens/dashboard/ProfileScreen.js - Enhanced with Dark Theme and Rate Limiting
import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  TextInput,
  Platform,
  Image,
  Dimensions,
  Modal,
  Animated,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as ImagePicker from "expo-image-picker";
import { useAuth } from "../../hooks/useAuth";
import { DIETARY_PREFERENCES, VALIDATION } from "../../utils/profileConstants";
import { useTheme } from "../../styles/theme";
import { THEME } from "../../utils/colors";
import AsyncStorage from "@react-native-async-storage/async-storage";
import apiService from "../../services/api";
import { Linking, Share } from "react-native";
import UserAvatar from "../../components/ui/UserAvatar";
import ProfileHeader from "../../components/profile/ProfileHeader";
import ProfileTabs from "../../components/profile/ProfileTabs";
import ProfileStats from "../../components/profile/ProfileStats";
import CloudStorageService from "../../services/cloudStorage";
import { APP_CONFIG } from "../../utils/constants";
import StatusMessage from "../../components/StatusMessage";
import NetworkUtils from "../../utils/networkUtils";
import { useAlert } from "../../contexts/AlertContext";
import AddressAutocomplete from "../../components/ui/AddressAutocomplete";

const { width } = Dimensions.get("window");

// Constants
const HEADER_HEIGHT = 400; // Background image height

const ProfileScreen = ({ navigation, route }) => {
  const { isDark, colors } = useTheme();
  const { showError, showSuccess, showConfirm, showInfo } = useAlert();
  const {
    user,
    isOffline,
    logout,
    updateProfile,
    updateUserProfile,
    deleteAccount,
  } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editableUser, setEditableUser] = useState({});
  const [refreshing, setRefreshing] = useState(false);

  // Status message state for user feedback
  const [statusMessage, setStatusMessage] = useState({
    visible: false,
    type: "info",
    message: "",
  });

  // Show status message helper
  const showStatusMessage = (type, message, duration = 3000) => {
    setStatusMessage({ visible: true, type, message });
    if (duration > 0) {
      setTimeout(() => {
        setStatusMessage({ visible: false, type: "info", message: "" });
      }, duration);
    }
  };
  const [profileImage, setProfileImage] = useState(null);
  const [errors, setErrors] = useState({});
  const [saveAttempted, setSaveAttempted] = useState(false);
  const [selectedTab, setSelectedTab] = useState("overview");

  // Handle navigation parameters
  useEffect(() => {
    if (route?.params?.tab) {
      setSelectedTab(route.params.tab);
    }
    if (route?.params?.editAddress && route?.params?.tab === "profile") {
      setIsEditing(true);
    }
  }, [route?.params]);

  // Real user stats data
  const [userStats, setUserStats] = useState({
    ordersThisMonth: 0,
    totalOrdersCompleted: 0,
    favoriteCategory: "",
    streakDays: 0,
    nextDelivery: null,
    activeSubscriptions: 0,
    totalSaved: 0,
    nutritionScore: 0,
  });
  const [statsLoading, setStatsLoading] = useState(true);
  const [userSubscriptions, setUserSubscriptions] = useState([]);
  const [subscriptionsLoading, setSubscriptionsLoading] = useState(true);

  const [recentActivity, setRecentActivity] = useState([]);
  const [activityLoading, setActivityLoading] = useState(true);

  const [achievements, setAchievements] = useState([]);
  const [achievementsLoading, setAchievementsLoading] = useState(true);
  const [notificationPreferences, setNotificationPreferences] = useState({
    orderUpdates: true,
    deliveryReminders: true,
    promotions: false,
    newMealPlans: true,
    achievements: true,
  });
  const [notificationsLoading, setNotificationsLoading] = useState(true);

  // Debounce utility to prevent rapid successive calls
  const debounce = useCallback((func, delay) => {
    let timeoutId;
    return (...args) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => func.apply(null, args), delay);
    };
  }, []);

  // Rate limiting state
  const [lastDataLoad, setLastDataLoad] = useState(0);
  const dataLoadCooldown = 10000; // 10 seconds minimum between full data loads

  useEffect(() => {
    if (user) {
      setEditableUser({
        fullName: user.fullName,
        phone: user.phone || "",
        address: user.address || "",
        city: user.city || "",
        dietaryPreferences: user.dietaryPreferences || [],
        allergies: user.allergies || "",
      });

      // Rate limit the initial data loading
      const now = Date.now();
      if (now - lastDataLoad > dataLoadCooldown) {
        setLastDataLoad(now);

        // Load data in batches to prevent rate limiting
        setTimeout(() => fetchUserStats(), 100);
        setTimeout(() => fetchUserSubscriptions(), 300);
        setTimeout(() => fetchUserActivity(), 500);
        setTimeout(() => fetchUserAchievements(), 700);
        setTimeout(() => fetchNotificationPreferences(), 900);
      } else {
      }
    }
    loadProfileImage();

    // Debounce the profile refresh to prevent multiple rapid calls
    const debouncedRefresh = debounce(refreshUserProfile, 1000);
    debouncedRefresh();
  }, [user, debounce]);

  // Function to refresh user profile from database
  const refreshUserProfile = async () => {
    try {
      // Rate limiting check - don't refresh too frequently
      const now = Date.now();
      const lastUpdate = refreshUserProfile.lastUpdate || 0;
      const cooldown = 3000; // 3 seconds minimum between profile refreshes

      if (now - lastUpdate < cooldown) {
        console.log("� User profile refresh rate limited, skipping...");
        return;
      }

      refreshUserProfile.lastUpdate = now;

      console.log("�🔄 Refreshing user profile from database...");
      const result = await updateProfile();
      if (result.success) {
        console.log("✅ User profile refreshed successfully");
      } else if (result.rateLimited) {
        console.log("⏱️ Profile refresh rate limited by server");
      } else {
        console.log("❌ Failed to refresh user profile:", result.message);
      }
    } catch (error) {
      console.error("❌ Error refreshing user profile:", error);
    }
  };

  const loadProfileImage = async () => {
    try {
      // First check if user has a profile image from registration
      if (user?.profileImage) {
        setProfileImage(user.profileImage);
        return;
      }

      // Fall back to AsyncStorage for locally stored images
      const storedImage = await AsyncStorage.getItem("profileImage");
      if (storedImage) {
        setProfileImage(storedImage);
      } else {
        setProfileImage(null);
      }
    } catch (error) {
      setProfileImage(null);
    }
  };

  // Function to force refresh profile image from database
  const refreshProfileImage = async () => {
    try {
      // Rate limiting check - don't refresh too frequently
      const now = Date.now();
      const lastUpdate = refreshProfileImage.lastUpdate || 0;
      const cooldown = 2000; // 2 seconds minimum between image refreshes

      refreshProfileImage.lastUpdate = now;

      const result = await updateProfile();
      if (result.success) {
        await loadProfileImage();
      } else if (result.rateLimited) {
      } else {
      }
    } catch (error) {}
  };

  const fetchUserStats = async () => {
    try {
      setStatsLoading(true);
      console.log("� Fetching user stats...");
      const response = await apiService.getUserStats();

      console.log("📊 Stats API response:", response);

      if (response.success && response.data) {
        // Ensure all numeric values are valid numbers
        // Handle nested API response structure
        const statsData = response.data.data || response.data;
        const validStats = {
          ordersThisMonth: isNaN(statsData.ordersThisMonth)
            ? 0
            : statsData.ordersThisMonth,
          totalOrdersCompleted: isNaN(statsData.totalOrdersCompleted)
            ? 0
            : statsData.totalOrdersCompleted,
          favoriteCategory: statsData.favoriteCategory || "",
          streakDays: isNaN(statsData.streakDays) ? 0 : statsData.streakDays,
          nextDelivery: statsData.nextDelivery || null,
          activeSubscriptions: isNaN(statsData.activeSubscriptions)
            ? 0
            : statsData.activeSubscriptions,
          totalSaved: isNaN(statsData.totalSaved) ? 0 : statsData.totalSaved,
          nutritionScore: isNaN(statsData.nutritionScore)
            ? 0
            : Math.max(0, Math.min(100, statsData.nutritionScore)),
        };
        setUserStats(validStats);
        console.log("✅ User stats loaded and validated:", validStats);
      } else {
        // Handle rate limiting specifically
        if (response.status === 429 || response.error?.includes("Too many")) {
          console.log(
            "⏱️ Stats API rate limited, using cached data if available"
          );
          // Keep existing stats if we have them, or use fallback
          if (!userStats || Object.keys(userStats).length === 0) {
            const fallbackStats = {
              ordersThisMonth: 0,
              totalOrdersCompleted: 0,
              favoriteCategory: "",
              streakDays: 0,
              nextDelivery: null,
              activeSubscriptions: 0,
              totalSaved: 0,
              nutritionScore: 0,
            };
            setUserStats(fallbackStats);
          }
          return; // Don't overwrite with fallback data
        }

        console.log(
          "❌ Stats API failed, using realistic data for active user"
        );
        // Generate realistic data for a user without active subscription
        const realisticStats = {
          ordersThisMonth: 0,
          totalOrdersCompleted: 0,
          favoriteCategory: "",
          streakDays: 0,
          nextDelivery: null,
          activeSubscriptions: 0, // No active subscription
          totalSaved: 0,
          nutritionScore: 0,
        };
        setUserStats(realisticStats);
        console.log(
          "🔄 Using realistic stats for active user:",
          realisticStats
        );
      }
    } catch (error) {
      console.error("❌ Error fetching user stats:", error);

      // Show user-friendly error message
      const parsedError = NetworkUtils.parseApiError(
        error,
        "/auth/profile/stats"
      );
      showStatusMessage(parsedError.type, parsedError.userMessage, 3000);

      // Fallback data for user without subscription
      setUserStats({
        ordersThisMonth: 0,
        totalOrdersCompleted: 0,
        favoriteCategory: "",
        streakDays: 0,
        nextDelivery: null,
        activeSubscriptions: 0,
        totalSaved: 0,
        nutritionScore: 0,
      });
    } finally {
      setStatsLoading(false);
    }
  };

  const fetchUserSubscriptions = async () => {
    try {
      setSubscriptionsLoading(true);
      console.log("🔄 Fetching user subscriptions from orders...");

      // Get subscriptions from delivered orders like HomeScreen does
      const ordersResult = await apiService.getUserOrders();
      console.log("📋 Orders API response:", ordersResult);

      if (ordersResult.success && ordersResult.data) {
        // Handle nested data structure: {data: {data: [orders]}}
        const orders = Array.isArray(ordersResult.data)
          ? ordersResult.data
          : Array.isArray(ordersResult.data.data)
          ? ordersResult.data.data
          : [];
        const subscriptionOrders = orders.filter(
          (order) =>
            order.subscription &&
            (order.subscription.status === "Active" ||
              order.subscription.status === "active")
        );

        console.log(
          `📊 Found ${subscriptionOrders.length} orders with active subscriptions`
        );

        const activeSubscriptions = [];
        const subscriptionMap = new Map();

        subscriptionOrders.forEach((order) => {
          const subId = order.subscription._id;
          if (subId && !subscriptionMap.has(subId)) {
            subscriptionMap.set(subId, {
              _id: subId,
              mealPlan: {
                planName:
                  order.orderItems?.planName ||
                  order.mealPlanId?.planName ||
                  order.mealPlanId?.name ||
                  "Meal Plan",
                planId: order.mealPlanId?._id || order.mealPlanId,
              },
              frequency: order.subscription.frequency || "Weekly",
              duration: order.subscription.duration || "4 weeks",
              status: "active",
              nextDelivery: order.subscription.nextDelivery,
              startDate: order.subscription.startDate || order.createdAt,
              endDate: order.subscription.endDate,
              currentWeek:
                Math.ceil(
                  (Date.now() -
                    new Date(order.subscription.startDate || order.createdAt)) /
                    (7 * 24 * 60 * 60 * 1000)
                ) || 1,
              totalWeeks: order.subscription.durationWeeks || 4,
              mealsPerWeek: 21,
              price: order.subscription.price || order.totalAmount,
              orderId: order._id,
            });
            activeSubscriptions.push(subscriptionMap.get(subId));
          }
        });

        setUserSubscriptions(activeSubscriptions);
        console.log(
          `✅ Found ${activeSubscriptions.length} active subscriptions from orders`
        );
      } else {
        console.log("❌ No orders found, showing empty subscription state");
        setUserSubscriptions([]);
      }
    } catch (error) {
      console.error("❌ Error fetching user subscriptions:", error);
      setUserSubscriptions([]);
    } finally {
      setSubscriptionsLoading(false);
    }
  };

  const formatDeliveryDate = (dateString) => {
    if (!dateString) return "Not scheduled";
    const date = new Date(dateString);
    const options = { month: "short", day: "numeric" };
    return date.toLocaleDateString("en-US", options);
  };

  const fetchUserActivity = async () => {
    try {
      setActivityLoading(true);
      console.log("🔄 Generating user activity from orders...");

      // Get recent activity from orders and user actions
      const ordersResult = await apiService.getUserOrders();
      const activities = [];

      console.log("🔍 ACTIVITY DEBUG - Orders API Result:", {
        success: ordersResult?.success,
        hasData: !!ordersResult?.data,
        dataType: typeof ordersResult?.data,
        isArray: Array.isArray(ordersResult?.data),
        dataKeys: ordersResult?.data ? Object.keys(ordersResult.data) : null,
      });

      if (ordersResult.success && ordersResult.data) {
        // Handle nested data structure: {data: {data: [orders]}}
        const orders = Array.isArray(ordersResult.data)
          ? ordersResult.data
          : Array.isArray(ordersResult.data.data)
          ? ordersResult.data.data
          : [];

        console.log("🔍 ACTIVITY DEBUG - Extracted Orders:", {
          ordersCount: orders.length,
          firstOrder: orders[0]
            ? {
                id: orders[0]._id,
                status: orders[0].status,
                orderStatus: orders[0].orderStatus,
                delegationStatus: orders[0].delegationStatus,
                createdAt: orders[0].createdAt,
                updatedAt: orders[0].updatedAt,
                mealPlanId: orders[0].mealPlanId,
                planName: orders[0].planName,
                name: orders[0].name,
              }
            : null,
        });

        console.log("📋 Total orders to process:", orders.length);
        console.log(
          "📋 Order details:",
          orders.map((o, i) => ({
            index: i,
            id: o._id,
            status: o.status,
            orderStatus: o.orderStatus,
            createdAt: o.createdAt,
            updatedAt: o.updatedAt,
            mealPlan:
              o.mealPlanId?.planName || o.planName || o.name || "Unknown",
          }))
        );

        // Sort orders by date (most recent first)
        orders.sort(
          (a, b) =>
            new Date(b.updatedAt || b.createdAt) -
            new Date(a.updatedAt || a.createdAt)
        );

        // Generate activity items from recent orders (last 10)
        orders.slice(0, 10).forEach((order, index) => {
          const orderDate = new Date(order.updatedAt || order.createdAt);
          const isToday =
            orderDate.toDateString() === new Date().toDateString();
          const isYesterday =
            orderDate.toDateString() ===
            new Date(Date.now() - 86400000).toDateString();

          let dateText;
          if (isToday) {
            dateText = "Today";
          } else if (isYesterday) {
            dateText = "Yesterday";
          } else {
            dateText = orderDate.toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
            });
          }

          // Get meal plan name from various possible structures
          const mealPlanName =
            order.mealPlanId?.planName ||
            order.mealPlanId?.name ||
            order.planName ||
            order.name ||
            order.meal?.name ||
            "Meal Plan";

          const orderStatus = (
            order.status ||
            order.orderStatus ||
            order.delegationStatus ||
            ""
          ).toLowerCase();

          console.log(`🔍 ACTIVITY DEBUG - Order ${index + 1}:`, {
            id: order._id,
            originalStatus: order.status,
            originalOrderStatus: order.orderStatus,
            originalDelegationStatus: order.delegationStatus,
            normalizedStatus: orderStatus,
            mealPlanName,
            dateText,
          });

          // Create activities for various order statuses
          let activityAdded = false;

          if (orderStatus === "delivered") {
            activities.push({
              id: `delivery_${order._id}`,
              title: `Meal delivered - ${mealPlanName}`,
              date: dateText,
              type: "delivery",
              icon: "checkmark-circle",
              color: colors.success || "#4CAF50",
              orderId: order._id,
            });
            activityAdded = true;
            console.log("✅ Added DELIVERED activity");
          } else if (orderStatus === "out_for_delivery") {
            activities.push({
              id: `outfordelivery_${order._id}`,
              title: `Order out for delivery - ${mealPlanName}`,
              date: dateText,
              type: "delivery",
              icon: "car",
              color: colors.warning || "#FF9800",
              orderId: order._id,
            });
            activityAdded = true;
            console.log("✅ Added OUT_FOR_DELIVERY activity");
          } else if (
            orderStatus === "confirmed" ||
            orderStatus === "quality_check"
          ) {
            activities.push({
              id: `confirmed_${order._id}`,
              title: `Order confirmed - ${mealPlanName}`,
              date: dateText,
              type: "order",
              icon: "checkmark",
              color: colors.primary || "#4ECDC4",
              orderId: order._id,
            });
            activityAdded = true;
            console.log("✅ Added CONFIRMED/QUALITY_CHECK activity");
          } else if (
            orderStatus === "pending" ||
            orderStatus === "processing" ||
            orderStatus === "preparing" ||
            orderStatus === "accepted" ||
            orderStatus === "in progress" ||
            orderStatus === "assigned" ||
            orderStatus === "ready" ||
            orderStatus === "completed"
          ) {
            activities.push({
              id: `processing_${order._id}`,
              title: `Order is being prepared - ${mealPlanName}`,
              date: dateText,
              type: "order",
              icon: "restaurant",
              color: colors.warning || "#FF9800",
              orderId: order._id,
            });
            activityAdded = true;
            console.log("✅ Added PREPARING/PROCESSING activity");
          } else if (orderStatus === "placed" || orderStatus === "created") {
            activities.push({
              id: `placed_${order._id}`,
              title: `Order placed - ${mealPlanName}`,
              date: dateText,
              type: "order",
              icon: "receipt",
              color: colors.primary || "#4ECDC4",
              orderId: order._id,
            });
            activityAdded = true;
            console.log("✅ Added PLACED/CREATED activity");
          } else if (
            orderStatus &&
            !["cancelled", "failed", ""].includes(orderStatus)
          ) {
            // Fallback for any other status that's not cancelled or failed
            activities.push({
              id: `order_${order._id}`,
              title: `Order ${orderStatus} - ${mealPlanName}`,
              date: dateText,
              type: "order",
              icon: "time",
              color: colors.textSecondary || "#666",
              orderId: order._id,
            });
            activityAdded = true;
            console.log(
              `✅ Added FALLBACK activity for status: ${orderStatus}`
            );
          }

          if (!activityAdded) {
            console.log(
              `❌ NO ACTIVITY ADDED for order ${
                order._id
              } - Status: "${orderStatus}" (empty: ${orderStatus === ""})`
            );
          }

          // Add subscription activation activity
          if (order.subscriptionDetails && order.status === "delivered") {
            activities.push({
              id: `subscription_${order.subscriptionDetails._id}`,
              title: `Subscription activated - ${order.subscriptionDetails.planName}`,
              date: dateText,
              type: "subscription",
              icon: "play-circle",
              color: colors.secondary || "#FF6B6B",
            });
          }
        });

        // Remove duplicates and sort by most recent
        const uniqueActivities = activities
          .filter(
            (activity, index, self) =>
              index === self.findIndex((a) => a.id === activity.id)
          )
          .slice(0, 8);

        console.log("📊 Activities generated:", activities.length);
        console.log(
          "📊 Unique activities after filtering:",
          uniqueActivities.length
        );
        console.log("📊 Final activities:", uniqueActivities);

        setRecentActivity(uniqueActivities);
        console.log(
          `✅ Generated ${uniqueActivities.length} activity items from orders`
        );
      } else {
        console.log("❌ No orders found, showing empty activity state");
        setRecentActivity([]);
      }
    } catch (error) {
      console.error("❌ Error generating user activity:", error);
      setRecentActivity([]);
    } finally {
      setActivityLoading(false);
    }
  };

  const fetchUserAchievements = async () => {
    try {
      setAchievementsLoading(true);
      console.log("🔄 Calculating user achievements...");

      // Calculate achievements based on actual user data
      const ordersResult = await apiService.getUserOrders();
      const profileResult = await apiService.getProfile();

      const userAchievements = [];
      // Handle nested data structure
      const rawOrders = ordersResult.success ? ordersResult.data : null;
      const orders = Array.isArray(rawOrders)
        ? rawOrders
        : Array.isArray(rawOrders?.data)
        ? rawOrders.data
        : [];
      const userProfile = profileResult.success ? profileResult.data || {} : {};

      // 1. Welcome Achievement - Always earned when user exists
      userAchievements.push({
        id: "welcome",
        title: "Welcome!",
        description: "Welcome to Choma!",
        icon: "person-add",
        earned: true,
        claimed: true,
        claimedAt: userProfile.createdAt || new Date().toISOString(),
        reward: "Welcome bonus",
      });

      // 2. First Order Achievement
      const completedOrders = orders.filter((order) =>
        ["delivered", "completed"].includes(order.status)
      );
      if (completedOrders.length > 0) {
        userAchievements.push({
          id: "first_order",
          title: "First Order",
          description: "Completed your first meal order",
          icon: "restaurant",
          earned: true,
          claimed: true,
          claimedAt:
            completedOrders[0].deliveredAt || completedOrders[0].updatedAt,
          reward: "₦500 credit",
        });
      }

      // 3. Subscription Achievement
      const subscriptionOrdersForAchievement = orders.filter(
        (order) => order.subscription
      );
      if (subscriptionOrdersForAchievement.length > 0) {
        userAchievements.push({
          id: "first_subscription",
          title: "Subscriber",
          description: "Started your first meal plan subscription",
          icon: "calendar",
          earned: true,
          claimed: true,
          claimedAt: subscriptionOrdersForAchievement[0].createdAt,
          reward: "10% off next order",
        });
      }

      // 4. Multiple Plans Achievement
      const uniquePlans = new Set(
        orders.map((order) => order.mealPlanId?._id || order.mealPlanId)
      );
      if (uniquePlans.size >= 2) {
        userAchievements.push({
          id: "plan_explorer",
          title: "Plan Explorer",
          description: "Tried multiple meal plans",
          icon: "compass",
          earned: true,
          claimed: false,
          reward: "Free delivery voucher",
        });
      }

      // 5. Streak Achievement
      if (completedOrders.length >= 7) {
        userAchievements.push({
          id: "weekly_streak",
          title: "Weekly Warrior",
          description: "Completed 7 meal deliveries",
          icon: "flame",
          earned: true,
          claimed: false,
          reward: "₦1000 credit",
        });
      }

      // 6. Loyal Customer (in progress)
      const loyalProgress = Math.min(completedOrders.length, 20);
      if (loyalProgress < 20) {
        userAchievements.push({
          id: "loyal_customer",
          title: "Loyal Customer",
          description: "Complete 20 meal deliveries",
          icon: "heart",
          earned: false,
          progress: loyalProgress,
          target: 20,
          reward: "VIP status + exclusive meals",
        });
      } else {
        userAchievements.push({
          id: "loyal_customer",
          title: "Loyal Customer",
          description: "Completed 20+ meal deliveries",
          icon: "heart",
          earned: true,
          claimed: false,
          reward: "VIP status + exclusive meals",
        });
      }

      setAchievements(userAchievements);
      console.log(
        `✅ Generated ${userAchievements.length} achievements based on user data`
      );
    } catch (error) {
      console.error("❌ Error calculating user achievements:", error);
      setAchievements([]);
    } finally {
      setAchievementsLoading(false);
    }
  };

  const fetchNotificationPreferences = async () => {
    try {
      setNotificationsLoading(true);
      const response = await apiService.getNotificationPreferences();

      if (response.success) {
        setNotificationPreferences(response.data);
      } else {
        console.error(
          "Failed to fetch notification preferences:",
          response.error
        );
      }
    } catch (error) {
      console.error("Error fetching notification preferences:", error);
    } finally {
      setNotificationsLoading(false);
    }
  };

  const updateNotificationPreference = async (key, value) => {
    try {
      const updatedPreferences = { ...notificationPreferences, [key]: value };
      setNotificationPreferences(updatedPreferences);

      const response = await apiService.updateNotificationPreferences(
        updatedPreferences
      );

      if (!response.success) {
        // Revert on failure
        setNotificationPreferences(notificationPreferences);
        showError("Error", "Failed to update notification preferences");
      }
    } catch (error) {
      // Revert on error
      setNotificationPreferences(notificationPreferences);
      console.error("Error updating notification preferences:", error);
      showError("Error", "Failed to update notification preferences");
    }
  };

  // Quick Action Handlers
  const handleReorder = async () => {
    // Log activity
    try {
      await apiService.logUserActivity?.({
        action: "navigate_reorder",
        description: "Accessed orders for reordering from profile",
        timestamp: new Date().toISOString(),
        metadata: { screen: "ProfileScreen" },
      });
    } catch (error) {
      console.log("Activity logging failed:", error);
    }

    // Navigate to Orders screen where user can reorder previous orders
    navigation.navigate("Orders");
  };

  const handleInviteFriends = async () => {
    try {
      const shareMessage = `🍽️ Join me on choma - the best meal delivery service! \n\nGet healthy, delicious meals delivered to your door. Use my referral link to get started!\n\n📱 Download the app now and use code: ${
        user?.customerId || "FRIEND"
      }\n\n#choma #HealthyEating #FoodDelivery`;

      const result = await Share.share({
        message: shareMessage,
        title: "Join choma!",
      });

      if (result.action === Share.sharedAction) {
        // TODO: Track referral in backend
        console.log("Shared successfully");
      }
    } catch (error) {
      console.error("Error sharing:", error);
      showError("Error", "Unable to share at the moment");
    }
  };

  const handleSupport = () => {
    showInfo("Support", "How can we help you?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Call Support",
        onPress: () => Linking.openURL("tel:+2348000000000"),
      },
      {
        text: "Email Support",
        onPress: () =>
          Linking.openURL("mailto:support@choma.ng?subject=Support Request"),
      },
      {
        text: "Help Center",
        onPress: () => navigation.navigate("HelpCenter"),
      },
    ]);
  };

  const handleRateApp = () => {
    showInfo(
      "Rate choma",
      "Loving the app? Please take a moment to rate us on the app store!",
      [
        { text: "Maybe Later", style: "cancel" },
        {
          text: "Rate Now",
          onPress: () => {
            // For development - replace with actual app store URLs
            const appStoreUrl =
              Platform.OS === "ios"
                ? "https://apps.apple.com/app/choma"
                : "https://play.google.com/store/apps/details?id=com.choma";

            Linking.openURL(appStoreUrl).catch(() => {
              showError("Error", "Unable to open app store");
            });
          },
        },
      ]
    );
  };

  const handleWalletPress = () => {
    const totalSaved = isNaN(userStats.totalSaved) ? 0 : userStats.totalSaved;
    const thisMonth = Math.floor(totalSaved / 3);
    const rewardsEarned = Math.floor(totalSaved * 0.1);
    const referralBonus = Math.floor(totalSaved * 0.05);

    showInfo(
      "💰 Your Savings",
      `Total Saved: ₦${totalSaved.toLocaleString()}\n\n` +
        `This Month: ₦${thisMonth.toLocaleString()}\n` +
        `Rewards Earned: ₦${rewardsEarned.toLocaleString()}\n` +
        `Referral Bonus: ₦${referralBonus.toLocaleString()}\n\n` +
        `${
          totalSaved === 0
            ? "Start ordering to begin saving!"
            : "Keep ordering to save more!"
        }`,
      [
        { text: "Got it!", style: "default" },
        {
          text: "View Details",
          onPress: () => navigation.navigate("Wallet"), // Navigate to Wallet screen
        },
      ]
    );
  };

  const handleNutritionScorePress = () => {
    const nutritionScore = isNaN(userStats.nutritionScore)
      ? 0
      : userStats.nutritionScore;
    const mealVariety = Math.floor(nutritionScore * 0.3);
    const nutrientBalance = Math.floor(nutritionScore * 0.4);
    const healthyChoices = Math.floor(nutritionScore * 0.3);

    const message =
      nutritionScore === 0
        ? `Your Nutrition Score: Not yet calculated\n\n` +
          `🎯 Get Started:\n` +
          `• Subscribe to a meal plan to begin tracking\n` +
          `• Your nutrition score will be calculated based on:\n` +
          `  - Meal variety and diversity\n` +
          `  - Nutrient balance and completeness\n` +
          `  - Healthy food choices\n\n` +
          `💡 Start your nutrition journey today!`
        : `Your Score: ${nutritionScore}/100\n\n` +
          `This score is based on:\n` +
          `• Meal variety (${mealVariety}/30)\n` +
          `• Nutrient balance (${nutrientBalance}/40)\n` +
          `• Healthy choices (${healthyChoices}/30)\n\n` +
          `Tips to improve:\n` +
          `• Try more vegetable-rich meals\n` +
          `• Include more protein sources\n` +
          `• Choose whole grain options`;

    showInfo("🥗 Nutrition Score", message, [
      { text: "Got it!", style: "default" },
      // ...(nutritionScore > 0
      //   ? [
      //       // {
      //       //   text: "View Details",
      //       //   onPress: () => navigation.navigate("NutritionScreen"), // TODO: Create NutritionScreen
      //       // },
      //     ]
      //   : []),
    ]);
  };

  const handleActivityItemPress = (activity) => {
    let message = `${activity.title}\n\n${activity.date}`;

    if (activity.type === "delivery") {
      message += `

Order delivered successfully! Rate your experience?`;
    } else if (activity.type === "achievement") {
      message += `

Congratulations on your achievement!`;
    } else if (activity.type === "meal_plan") {
      message += `

Your meal plan has been updated with fresh options.`;
    }

    showInfo("Activity Details", message, [
      { text: "Close", style: "cancel" },
      ...(activity.type === "delivery"
        ? [
            {
              text: "Rate Order",
              onPress: () =>
                navigation.navigate("RateOrderScreen", {
                  orderId: activity.id,
                }),
            },
          ]
        : []),
    ]);
  };

  useEffect(() => {
    if (isEditing || saveAttempted) {
      validateForm();
    }
  }, [editableUser, saveAttempted]);

  const handleEditProfile = async () => {
    try {
      setIsLoading(true);
      const profileResult = await apiService.getProfile();
      console.log(
        "Full profile result:",
        JSON.stringify(profileResult, null, 2)
      );
      if (profileResult.success && profileResult.data) {
        const fullProfile = profileResult.data;
        setEditableUser({
          fullName: fullProfile.fullName || user.fullName,
          phone: fullProfile.phone || "",
          address: fullProfile.address || "",
          city: fullProfile.city || user.city || "",
          dietaryPreferences:
            fullProfile.dietaryPreferences || user.dietaryPreferences || [],
          allergies: fullProfile.allergies || "",
        });
      } else {
        // fallback to user object if API fails
        setEditableUser({
          fullName: user.fullName,
          phone: user.phone || "",
          address: user.address || "",
          city: user.city || "",
          dietaryPreferences: user.dietaryPreferences || [],
          allergies: user.allergies || "",
        });
        showError(
          "Error",
          "Could not load full profile. Please check your connection."
        );
      }
    } catch (error) {
      console.error("Error fetching full profile:", error);
      showError(
        "Error",
        "Could not load full profile. Please check your connection."
      );
    } finally {
      setIsLoading(false);
      setIsEditing(true);
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (
      !editableUser.fullName ||
      editableUser.fullName.trim().length < VALIDATION.fullName.minLength
    ) {
      newErrors.fullName = VALIDATION.fullName.errorMessage;
    }

    if (
      editableUser.phone &&
      !VALIDATION.phone.pattern.test(editableUser.phone)
    ) {
      newErrors.phone = VALIDATION.phone.errorMessage;
    }

    if (
      editableUser.address &&
      (editableUser.address.length < VALIDATION.address.minLength ||
        editableUser.address.length > VALIDATION.address.maxLength)
    ) {
      newErrors.address = VALIDATION.address.errorMessage;
    }

    if (
      editableUser.allergies &&
      editableUser.allergies.length > VALIDATION.allergies.maxLength
    ) {
      newErrors.allergies = VALIDATION.allergies.errorMessage;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSaveProfile = async () => {
    setSaveAttempted(true);

    if (!validateForm()) {
      showError(
        "Validation Error",
        "Please fix the errors in the form before saving."
      );
      return;
    }

    try {
      setIsLoading(true);

      // Log activity
      await apiService.logUserActivity?.({
        action: "profile_update",
        description: "Updated profile information",
        timestamp: new Date().toISOString(),
        metadata: {
          screen: "ProfileScreen",
          fields_updated: Object.keys(editableUser).join(", "),
        },
      });

      const result = await updateUserProfile(editableUser);

      if (result.success) {
        setIsEditing(false);
        setSaveAttempted(false);
        showSuccess("Success", "Your profile has been updated successfully!");

        // Refresh profile data
        await updateProfile();
      } else {
        showError(
          "Update Failed",
          result.message || "Unable to update profile. Please try again."
        );
      }
    } catch (error) {
      console.error("Profile update error:", error);
      showError("Error", "Unable to update profile. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelEdit = () => {
    showConfirm(
      "Discard Changes",
      "Are you sure you want to discard your changes?",
      () => {
        // Reset to original user data
        setEditableUser({
          fullName: user.fullName,
          phone: user.phone || "",
          address: user.address || "",
          city: user.city || "",
          dietaryPreferences: user.dietaryPreferences || [],
          allergies: user.allergies || "",
        });
        setIsEditing(false);
        setSaveAttempted(false);
        setErrors({});
      }
    );
  };

  const toggleDietaryPreference = (preference) => {
    setEditableUser((prev) => ({
      ...prev,
      dietaryPreferences: (prev.dietaryPreferences || []).includes(preference)
        ? (prev.dietaryPreferences || []).filter((p) => p !== preference)
        : [...(prev.dietaryPreferences || []), preference],
    }));
  };

  const handleAchievementPress = async (achievement) => {
    if (achievement.earned && !achievement.claimed) {
      // Claim the achievement
      try {
        const result = await apiService.claimAchievement(achievement.id);

        if (result.success) {
          showSuccess(
            "🎉 Achievement Claimed!",
            `Congratulations! You've claimed "${
              achievement.title
            }"\n\nReward: ${achievement.reward || "Special recognition"}`,
            [{ text: "Awesome!", onPress: () => fetchUserAchievements() }]
          );

          // Log activity
          await apiService.logUserActivity?.({
            action: "achievement_claimed",
            description: `Claimed achievement: ${achievement.title}`,
            timestamp: new Date().toISOString(),
            metadata: {
              screen: "ProfileScreen",
              achievementId: achievement.id,
              achievementTitle: achievement.title,
            },
          });
        } else {
          showError(
            "Claim Failed",
            "Unable to claim this achievement. Please try again."
          );
        }
      } catch (error) {
        console.error("Achievement claim error:", error);
        showError("Error", "Failed to claim achievement.");
      }
    } else if (!achievement.earned) {
      // Show achievement details and progress
      showInfo(
        achievement.title,
        `${achievement.description}\n\nProgress: ${achievement.progress || 0}/${
          achievement.target || 100
        }\n\n${achievement.hint || "Keep going to unlock this achievement!"}`,
        [{ text: "Got it!" }]
      );
    } else {
      // Already claimed - show details
      showInfo(
        `🏆 ${achievement.title}`,
        `${achievement.description}\n\nClaimed on: ${new Date(
          achievement.claimedAt
        ).toLocaleDateString()}\n\nReward: ${
          achievement.reward || "Special recognition"
        }`,
        [{ text: "Nice!" }]
      );
    }
  };

  const checkForNewAchievements = async () => {
    try {
      const result = await apiService.checkAchievements();

      if (
        result.success &&
        result.data &&
        result.data.newAchievements.length > 0
      ) {
        const newAchievements = result.data.newAchievements;

        // Show achievement notification
        showSuccess(
          "🎉 New Achievement Unlocked!",
          `You've unlocked ${newAchievements.length} new achievement${
            newAchievements.length > 1 ? "s" : ""
          }:\n\n${newAchievements
            .map((a) => `• ${a.title}`)
            .join("\n")}\n\nCheck your profile to claim your rewards!`,
          [
            {
              text: "View Achievements",
              onPress: () => fetchUserAchievements(),
            },
          ]
        );
      }
    } catch (error) {
      console.log("Achievement check failed:", error);
    }
  };

  const handleRefresh = async () => {
    try {
      setRefreshing(true);
      showStatusMessage("loading", "Refreshing profile data...", 0);

      // Reduce the number of concurrent API calls to prevent rate limiting
      // Execute in smaller batches with delays

      console.log("🔄 Starting profile refresh (batch 1)...");
      await Promise.all([updateProfile(), fetchUserStats()]);

      // Small delay between batches to prevent rate limiting
      await new Promise((resolve) => setTimeout(resolve, 300));

      console.log("🔄 Starting profile refresh (batch 2)...");
      await Promise.all([fetchUserSubscriptions(), fetchUserActivity()]);

      // Another small delay
      await new Promise((resolve) => setTimeout(resolve, 300));

      console.log("🔄 Starting profile refresh (batch 3)...");
      await Promise.all([
        fetchUserAchievements(),
        fetchNotificationPreferences(),
      ]);

      console.log("✅ Profile refresh completed");
      showStatusMessage("success", "Profile data updated successfully", 2000);
    } catch (error) {
      console.error("❌ Profile refresh error:", error);
      showStatusMessage("error", "Failed to refresh some profile data", 3000);
    } finally {
      setRefreshing(false);
    }
  };

  const handleLogout = async () => {
    showConfirm("Logout", "Are you sure you want to logout?", async () => {
      setIsLoading(true);
      await logout();
      setIsLoading(false);
    });
  };

  const pickImage = async () => {
    showInfo(
      "Update Profile Picture",
      "Choose how you want to update your profile picture",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Take Photo",
          onPress: () => takePhoto(),
        },
        {
          text: "Choose from Library",
          onPress: () => selectFromLibrary(),
        },
        ...(profileImage
          ? [
              {
                text: "Remove Photo",
                style: "destructive",
                onPress: () => removeProfilePicture(),
              },
            ]
          : []),
      ]
    );
  };

  const takePhoto = async () => {
    try {
      const permissionResult =
        await ImagePicker.requestCameraPermissionsAsync();

      if (!permissionResult.granted) {
        showError(
          "Permission Required",
          "You need to grant permission to access your camera"
        );
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        await processSelectedImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error("Error taking photo:", error);
      showError("Error", "Failed to take photo");
    }
  };

  const selectFromLibrary = async () => {
    try {
      const permissionResult =
        await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permissionResult.granted) {
        showError(
          "Permission Required",
          "You need to grant permission to access your photos"
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        await processSelectedImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error("Error picking image:", error);
      showError("Error", "Failed to select image");
    }
  };

  const processSelectedImage = async (imageUri) => {
    try {
      // Show loading state
      setIsLoading(true);

      // Immediately show the image locally for better UX
      setProfileImage(imageUri);

      console.log("Uploading profile image to production server...");
      console.log(
        "Upload URL will be:",
        APP_CONFIG.API_BASE_URL.replace("/api", "") +
          "/api/upload/profile-image"
      );

      // Upload to backend server
      const cloudImageUrl = await CloudStorageService.uploadToBackend(
        imageUri,
        user.email
      );

      console.log("Image uploaded successfully to:", cloudImageUrl);

      // Update user profile with cloud URL
      console.log("📤 Updating profile with image URL:", cloudImageUrl);

      // Include current user data to avoid validation errors
      // Ensure fullName meets minimum requirements
      const fullName = user?.fullName || "";
      const validFullName = fullName.length >= 2 ? fullName : "User Name";

      const profileUpdateData = {
        fullName: validFullName,
        phone: user?.phone || "",
        address: user?.address || "",
        city: user?.city || "",
        dietaryPreferences: user?.dietaryPreferences || [],
        allergies: user?.allergies || "",
        profileImage: cloudImageUrl,
        // Include user ID if available (some backends require it)
        ...(user?.id && { id: user.id }),
        ...(user?.customerId && { customerId: user.customerId }),
      };

      console.log("📤 Profile update data:", profileUpdateData);
      const profileUpdateResult = await updateUserProfile(profileUpdateData);

      console.log("📤 Profile update result:", profileUpdateResult);

      if (!profileUpdateResult.success) {
        throw new Error(
          profileUpdateResult.message || "Failed to update profile"
        );
      }

      // Save cloud URL locally as well
      await AsyncStorage.setItem("profileImage", cloudImageUrl);

      console.log("Profile image updated successfully");
      showSuccess("Success", "Profile picture updated successfully!");

      // Refresh user profile to get updated data
      await refreshProfileImage();
    } catch (error) {
      console.error("Error uploading profile image:", error);

      // Show more specific error message
      let errorMessage = "Failed to save profile picture";
      if (error.message.includes("Network")) {
        errorMessage = "Network error. Please check your internet connection.";
      } else if (error.message.includes("Upload failed")) {
        errorMessage = "Upload failed. Please try again.";
      } else if (error.message) {
        errorMessage = error.message;
      }

      showError("Upload Error", errorMessage);

      // Revert the image to original state
      setProfileImage(user?.profileImage || null);
      await loadProfileImage();
    } finally {
      setIsLoading(false);
    }
  };

  const removeProfilePicture = async () => {
    showConfirm(
      "Remove Profile Picture",
      "Are you sure you want to remove your profile picture?",
      async () => {
        try {
          setIsLoading(true);
          setProfileImage(null);

          // Update user profile - include all user data to avoid validation errors
          // Ensure fullName meets minimum requirements
          const fullName = user?.fullName || "";
          const validFullName = fullName.length >= 2 ? fullName : "User Name";

          const profileUpdateData = {
            fullName: validFullName,
            phone: user?.phone || "",
            address: user?.address || "",
            city: user?.city || "",
            dietaryPreferences: user?.dietaryPreferences || [],
            allergies: user?.allergies || "",
            profileImage: null,
            // Include user ID if available (some backends require it)
            ...(user?.id && { id: user.id }),
            ...(user?.customerId && { customerId: user.customerId }),
          };

          await updateUserProfile(profileUpdateData);

          // Remove from local storage
          await AsyncStorage.removeItem("profileImage");

          console.log("Profile image removed successfully");
          showSuccess("Success", "Profile picture removed successfully!");

          // Refresh user profile to get updated data
          await refreshProfileImage();
        } catch (error) {
          console.error("Error removing profile image:", error);
          showError("Error", "Failed to remove profile picture");
          // Revert
          setProfileImage(user.profileImage || null);
        } finally {
          setIsLoading(false);
        }
      }
    );
  };

  const renderOverviewTab = () => (
    <View style={styles(colors).tabContent}>
      {/* Quick Stats */}
      <ProfileStats
        userStats={userStats}
        statsLoading={statsLoading}
        onWalletPress={handleWalletPress}
      />

      {/* Active Subscriptions */}
      <View style={styles(colors).section}>
        <View style={styles(colors).sectionHeader}>
          <Text style={styles(colors).sectionTitle}>Active Subscriptions</Text>
          {userSubscriptions.length > 1 && (
            <TouchableOpacity
              onPress={() =>
                navigation.navigate("SubscriptionDetails", {
                  subscriptionId: "all",
                })
              }
            >
              <Text style={styles(colors).seeAllText}>View All</Text>
            </TouchableOpacity>
          )}
        </View>

        {subscriptionsLoading ? (
          <View style={styles(colors).subscriptionCard}>
            <View
              style={[styles(colors).subscriptionGradient, { padding: 40 }]}
            >
              <ActivityIndicator size="large" color={colors.white} />
            </View>
          </View>
        ) : userSubscriptions.length > 0 ? (
          userSubscriptions.slice(0, 1).map((subscription) => (
            <View
              key={subscription._id}
              style={styles(colors).subscriptionCard}
            >
              <LinearGradient
                colors={[colors.primary, colors.primaryDark]}
                style={styles(colors).subscriptionGradient}
              >
                {/* Decorative Pattern */}
                <View style={styles(colors).subscriptionPattern}>
                  <Ionicons
                    name="restaurant"
                    size={80}
                    color="rgba(255,255,255,0.1)"
                  />
                </View>

                <View style={styles(colors).subscriptionContent}>
                  <View>
                    <Text style={styles(colors).subscriptionTitle}>
                      {subscription.mealPlan?.planName || "Meal Plan"}
                    </Text>
                    <Text style={styles(colors).subscriptionSubtitle}>
                      {subscription.frequency} • {subscription.duration}
                    </Text>
                    <Text style={styles(colors).subscriptionNext}>
                      Next delivery:{" "}
                      {formatDeliveryDate(subscription.nextDelivery)}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles(colors).manageButton}
                    onPress={() =>
                      navigation.navigate("SubscriptionDetails", {
                        subscriptionId: subscription._id,
                        subscription: subscription,
                      })
                    }
                  >
                    <Text style={styles(colors).manageButtonText}>Manage</Text>
                  </TouchableOpacity>
                </View>
              </LinearGradient>
            </View>
          ))
        ) : (
          <View style={styles(colors).emptySubscriptionCard}>
            <Ionicons
              name="calendar-outline"
              size={40}
              color={colors.textMuted}
            />
            <Text style={styles(colors).emptySubscriptionTitle}>
              No Active Subscriptions
            </Text>
            <Text style={styles(colors).emptySubscriptionText}>
              Start a meal plan to see it here
            </Text>
            <TouchableOpacity
              style={styles(colors).startSubscriptionButton}
              onPress={() => navigation.navigate("Home")}
            >
              <Text style={styles(colors).startSubscriptionButtonText}>
                Browse Meal Plans
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Achievements */}
      <View style={styles(colors).section}>
        <Text style={styles(colors).sectionTitle}>Achievements</Text>
        {achievementsLoading ? (
          <View style={styles(colors).achievementsLoadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles(colors).loadingText}>
              Loading achievements...
            </Text>
          </View>
        ) : achievements.length > 0 ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles(colors).achievementsScroll}
          >
            {achievements.map((achievement) => (
              <TouchableOpacity
                key={achievement.id}
                style={[
                  styles(colors).achievementCard,
                  !achievement.earned && styles(colors).achievementCardLocked,
                ]}
                onPress={() => handleAchievementPress(achievement)}
                activeOpacity={0.8}
              >
                <View
                  style={[
                    styles(colors).achievementIcon,
                    !achievement.earned && styles(colors).achievementIconLocked,
                  ]}
                >
                  <Ionicons
                    name={
                      typeof achievement.icon === "string"
                        ? achievement.icon
                        : "trophy-outline"
                    }
                    size={24}
                    color={
                      achievement.earned ? colors.primary : colors.textMuted
                    }
                  />
                  {achievement.earned && !achievement.claimed && (
                    <View style={styles(colors).achievementClaimBadge}>
                      <Ionicons name="gift" size={12} color={colors.white} />
                    </View>
                  )}
                  {achievement.earned && achievement.claimed && (
                    <View style={styles(colors).achievementEarnedBadge}>
                      <Ionicons
                        name="checkmark"
                        size={12}
                        color={colors.white}
                      />
                    </View>
                  )}
                </View>
                <Text
                  style={[
                    styles(colors).achievementTitle,
                    !achievement.earned &&
                      styles(colors).achievementTitleLocked,
                  ]}
                >
                  {achievement.title}
                </Text>
                <Text style={styles(colors).achievementDescription}>
                  {achievement.description}
                </Text>
                {!achievement.earned && achievement.progress !== undefined && (
                  <View style={styles(colors).achievementProgress}>
                    <Text style={styles(colors).achievementProgressText}>
                      {achievement.progress}/{achievement.target}
                    </Text>
                    <View style={styles(colors).achievementProgressBar}>
                      <View
                        style={[
                          styles(colors).achievementProgressFill,
                          {
                            width: `${Math.min(
                              (achievement.progress / achievement.target) * 100,
                              100
                            )}%`,
                          },
                        ]}
                      />
                    </View>
                  </View>
                )}
                {achievement.earned && !achievement.claimed && (
                  <Text style={styles(colors).achievementClaimText}>
                    Tap to claim!
                  </Text>
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
        ) : (
          <View style={styles(colors).emptyAchievementsContainer}>
            <Ionicons
              name="trophy-outline"
              size={40}
              color={colors.textMuted}
            />
            <Text style={styles(colors).emptyAchievementsTitle}>
              No Achievements Yet
            </Text>
            <Text style={styles(colors).emptyAchievementsText}>
              Subscribe to a meal plan and start your journey to unlock amazing
              achievements and rewards!
            </Text>
            <TouchableOpacity
              style={styles(colors).startAchievementsButton}
              onPress={() => navigation.navigate("MealPlans")}
            >
              <Text style={styles(colors).startAchievementsButtonText}>
                Start Your Journey
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Quick Actions */}
      <View style={styles(colors).section}>
        <Text style={styles(colors).sectionTitle}>Quick Actions</Text>
        <View style={styles(colors).quickActionsGrid}>
          <TouchableOpacity
            style={styles(colors).quickActionCard}
            onPress={handleReorder}
          >
            <Ionicons name="refresh" size={24} color={colors.primary} />
            <Text style={styles(colors).quickActionText}>Reorder</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles(colors).quickActionCard}
            onPress={handleInviteFriends}
          >
            <Ionicons name="people" size={24} color={colors.primary} />
            <Text style={styles(colors).quickActionText}>Invite Friends</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles(colors).quickActionCard}
            onPress={handleSupport}
          >
            <Ionicons name="help-circle" size={24} color={colors.primary} />
            <Text style={styles(colors).quickActionText}>Support</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles(colors).quickActionCard}
            onPress={handleRateApp}
          >
            <Ionicons name="star" size={24} color={colors.primary} />
            <Text style={styles(colors).quickActionText}>Rate App</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  const renderActivityTab = () => (
    <View style={styles(colors).tabContent}>
      {/* Nutrition Score */}
      <View style={styles(colors).section}>
        <Text style={styles(colors).sectionTitle}>Nutrition Score</Text>
        <TouchableOpacity
          style={styles(colors).nutritionCard}
          onPress={handleNutritionScorePress}
          activeOpacity={0.8}
        >
          {statsLoading ? (
            <ActivityIndicator
              size="large"
              color={colors.primary}
              style={{ marginVertical: 20 }}
            />
          ) : (
            <>
              <View style={styles(colors).nutritionScoreContainer}>
                <Text style={styles(colors).nutritionScore}>
                  {isNaN(userStats.nutritionScore)
                    ? 0
                    : userStats.nutritionScore}
                </Text>
                <Text style={styles(colors).nutritionScoreMax}>/100</Text>
              </View>
              <Text style={styles(colors).nutritionLabel}>
                {(() => {
                  const score = isNaN(userStats.nutritionScore)
                    ? 0
                    : userStats.nutritionScore;
                  if (score === 0) return "Start your nutrition journey!";
                  if (score >= 80) return "Excellent! Keep it up";
                  if (score >= 60) return "Great job! Keep it up";
                  if (score >= 40) return "Good progress!";
                  return `Let's improve together!`;
                })()}
              </Text>
              <View style={styles(colors).nutritionProgress}>
                <View
                  style={[
                    styles(colors).nutritionProgressFill,
                    {
                      width: `${
                        isNaN(userStats.nutritionScore)
                          ? 0
                          : Math.max(0, Math.min(100, userStats.nutritionScore))
                      }%`,
                    },
                  ]}
                />
              </View>
              <Text style={styles(colors).tapToViewDetails}>
                {isNaN(userStats.nutritionScore) ||
                userStats.nutritionScore === 0
                  ? "Subscribe to a meal plan to start tracking"
                  : "Tap to view details"}
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* Recent Activity */}
      <View style={styles(colors).section}>
        <Text style={styles(colors).sectionTitle}>Recent Activity</Text>
        {activityLoading ? (
          <View style={styles(colors).activityLoadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles(colors).loadingText}>Loading activity...</Text>
          </View>
        ) : recentActivity.length > 0 ? (
          <View style={styles(colors).activityList}>
            {recentActivity.map((activity) => (
              <TouchableOpacity
                key={activity.id}
                style={styles(colors).activityItem}
                onPress={() => handleActivityItemPress(activity)}
                activeOpacity={0.7}
              >
                <View
                  style={[
                    styles(colors).activityIcon,
                    { backgroundColor: `${activity.color}20` },
                  ]}
                >
                  <Ionicons
                    name={
                      typeof activity.icon === "string"
                        ? activity.icon
                        : "time-outline"
                    }
                    size={20}
                    color={activity.color}
                  />
                </View>
                <View style={styles(colors).activityContent}>
                  <Text style={styles(colors).activityTitle}>
                    {activity.title}
                  </Text>
                  <Text style={styles(colors).activityDate}>
                    {activity.date}
                  </Text>
                </View>
                <Ionicons
                  name="chevron-forward"
                  size={16}
                  color={colors.textMuted}
                />
              </TouchableOpacity>
            ))}
          </View>
        ) : (
          <View style={styles(colors).emptyActivityContainer}>
            <Ionicons name="time-outline" size={40} color={colors.textMuted} />
            <Text style={styles(colors).emptyActivityTitle}>
              No Recent Activity
            </Text>
            <Text style={styles(colors).emptyActivityText}>
              Start your meal journey! Subscribe to a meal plan and your
              activities will appear here.
            </Text>
            <TouchableOpacity
              style={styles(colors).startActivityButton}
              onPress={() => navigation.navigate("Home")}
            >
              <Text style={styles(colors).startActivityButtonText}>
                Browse Meal Plans
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Dietary Preferences */}
      <View style={styles(colors).section}>
        <Text style={styles(colors).sectionTitle}>Dietary Preferences</Text>
        {user.dietaryPreferences && user.dietaryPreferences.length > 0 ? (
          <View style={styles(colors).preferencesContainer}>
            {user.dietaryPreferences.map((preference, index) => (
              <View key={index} style={styles(colors).preferenceTag}>
                <Text style={styles(colors).preferenceTagText}>
                  {preference}
                </Text>
              </View>
            ))}
          </View>
        ) : (
          <Text style={styles(colors).emptyText}>
            No dietary preferences set
          </Text>
        )}
      </View>
    </View>
  );

  const renderProfileTab = () => (
    <View style={styles(colors).tabContent}>
      {/* Account Information */}
      <View style={styles(colors).section}>
        <Text style={styles(colors).sectionTitle}>Account Information</Text>

        <View style={styles(colors).infoCard}>
          <View style={styles(colors).infoRow}>
            <View style={styles(colors).infoIconContainer}>
              <Ionicons name="mail" size={20} color={colors.primary} />
            </View>
            <View style={styles(colors).infoContent}>
              <Text style={styles(colors).infoLabel}>Email</Text>
              <Text style={styles(colors).infoValue}>{user.email}</Text>
            </View>
          </View>

          <View style={styles(colors).infoRow}>
            <View style={styles(colors).infoIconContainer}>
              <Ionicons name="call" size={20} color={colors.primary} />
            </View>
            <View style={styles(colors).infoContent}>
              <Text style={styles(colors).infoLabel}>Phone</Text>
              <Text style={styles(colors).infoValue}>
                {user.phone || "Not provided"}
              </Text>
            </View>
          </View>

          <View style={styles(colors).infoRow}>
            <View style={styles(colors).infoIconContainer}>
              <Ionicons name="location" size={20} color={colors.primary} />
            </View>
            <View style={styles(colors).infoContent}>
              <Text style={styles(colors).infoLabel}>Address</Text>
              <Text style={styles(colors).infoValue}>
                {user.address || "Not provided"}
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* Dietary Preferences */}
      <View style={styles(colors).section}>
        <Text style={styles(colors).sectionTitle}>Dietary Preferences</Text>
        {user.dietaryPreferences && user.dietaryPreferences.length > 0 ? (
          <View style={styles(colors).preferencesContainer}>
            {user.dietaryPreferences.map((preference, index) => (
              <View key={index} style={styles(colors).preferenceTag}>
                <Text style={styles(colors).preferenceTagText}>
                  {preference}
                </Text>
              </View>
            ))}
          </View>
        ) : (
          <Text style={styles(colors).emptyText}>
            No dietary preferences set
          </Text>
        )}
      </View>

      {/* Account Actions */}
      <View style={styles(colors).section}>
        <Text style={styles(colors).sectionTitle}>Account Actions</Text>

        <TouchableOpacity
          style={styles(colors).actionButton}
          onPress={handleEditProfile}
        >
          <Ionicons name="pencil" size={20} color={colors.primary} />
          <Text style={styles(colors).actionButtonText}>Edit Profile</Text>
          <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles(colors).actionButton}
          onPress={() =>
            Share.share({
              message: `Check out choma - the best meal planning app! Get personalized meal plans delivered to your door.`,
              url: "https://choma.app",
            })
          }
        >
          <Ionicons name="share" size={20} color={colors.primary} />
          <Text style={styles(colors).actionButtonText}>Share App</Text>
          <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles(colors).actionButton}
          onPress={() => navigation.navigate("HelpCenter")}
        >
          <Ionicons name="help-circle" size={20} color={colors.primary} />
          <Text style={styles(colors).actionButtonText}>Help & Support</Text>
          <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
        </TouchableOpacity>
      </View>
    </View>
  );

  if (!user) {
    return (
      <SafeAreaView style={styles(colors).container}>
        <View style={styles(colors).loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles(colors).loadingText}>Loading profile...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles(colors).container}>
      {/* Status Message for Rate Limiting and Connection Issues */}
      <StatusMessage
        type={statusMessage.type}
        message={statusMessage.message}
        visible={statusMessage.visible}
      />

      {/* Offline Status */}
      {isOffline && (
        <StatusMessage
          type="offline"
          message="You're offline. Some features may be limited."
          visible={true}
        />
      )}

      {/* Fixed Background Image for Parallax */}
      <View style={styles(colors).fixedBackground}>
        {user?.profileImage || profileImage ? (
          <Image
            source={{ uri: profileImage || user.profileImage }}
            style={styles(colors).parallaxImage}
            onError={(error) => {
              console.log("❌ Background image failed to load:", error);
              console.log(
                "❌ Image URL was:",
                profileImage || user.profileImage
              );
            }}
            onLoad={() => {
              console.log("✅ Background image loaded successfully");
            }}
          />
        ) : (
          <View
            style={[
              styles(colors).parallaxImage,
              {
                backgroundColor: colors.primary,
                justifyContent: "center",
                alignItems: "center",
              },
            ]}
          >
            <UserAvatar
              user={user}
              size={120}
              fontSize={48}
              imageUri={profileImage || user?.profileImage}
            />
          </View>
        )}
        <View
          style={[
            styles(colors).backgroundOverlay,
            // Reduce overlay opacity when profile image is present
            user?.profileImage && {
              backgroundColor: "rgba(0, 0, 0, 0.1)",
            },
          ]}
        />
      </View>

      <ScrollView
        style={styles(colors).scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles(colors).scrollContent}
        refreshing={refreshing}
        onRefresh={handleRefresh}
        stickyHeaderIndices={[1]}
      >
        {/* Spacer for background image */}
        <View style={styles(colors).headerSpacer} />

        {/* Sticky Header Content */}
        <View style={styles(colors).headerContent}>
          {/* Name and Info Section */}
          <View style={styles(colors).nameSection}>
            {/* Content Row - Left: Name/Email, Right: Buttons */}
            <View style={styles(colors).contentRow}>
              {/* Left side - Name and Email */}
              <View style={styles(colors).leftContent}>
                <View style={styles(colors).nameContainer}>
                  <Text style={styles(colors).userName}>
                    {user?.fullName
                      ? user.fullName
                          .split(" ")
                          .map((name) => name.toUpperCase())
                          .join("\n")
                      : "ANDY\nROWLAND"}
                  </Text>
                </View>
                <Text style={styles(colors).userEmail}>
                  {user?.email || "andy@gmail.com"}
                </Text>
              </View>

              {/* Right side - Icons and Edit Button */}
              <View style={styles(colors).rightContent}>
                <View style={styles(colors).rightButtons}>
                  <TouchableOpacity
                    style={styles(colors).headerButton}
                    onPress={() =>
                      Share.share({
                        message: `Check out choma - the best meal planning app!`,
                        url: "https://choma.vercel.app",
                      })
                    }
                  >
                    <Ionicons
                      name="share-outline"
                      size={20}
                      color={colors.text}
                    />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles(colors).headerButton}
                    onPress={() => navigation.navigate("Settings")}
                  >
                    <Ionicons
                      name="settings-outline"
                      size={20}
                      color={colors.text}
                    />
                  </TouchableOpacity>
                </View>

                {/* Edit Profile Button */}
                <TouchableOpacity
                  style={styles(colors).editButton}
                  onPress={handleEditProfile}
                >
                  <Text style={styles(colors).editButtonText}>
                    Edit Profile
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* Profile Tabs */}
          <ProfileTabs selectedTab={selectedTab} onTabChange={setSelectedTab} />
        </View>

        {/* Profile Content Section */}
        <View style={styles(colors).profileContent}>
          {/* Tab Content */}
          <View style={styles(colors).tabContentContainer}>
            {selectedTab === "overview" && renderOverviewTab()}
            {selectedTab === "activity" && renderActivityTab()}
            {selectedTab === "profile" && renderProfileTab()}
          </View>
        </View>
      </ScrollView>

      {/* Edit Profile Modal */}
      <Modal
        visible={isEditing}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={styles(colors).editModalContainer}>
          <View style={styles(colors).editHeader}>
            <TouchableOpacity onPress={handleCancelEdit}>
              <Text style={styles(colors).editCancelText}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles(colors).editTitle}>Edit Profile</Text>
            <TouchableOpacity onPress={handleSaveProfile} disabled={isLoading}>
              <Text
                style={[
                  styles(colors).editSaveText,
                  isLoading && styles(colors).editSaveTextDisabled,
                ]}
              >
                {isLoading ? "Saving..." : "Save"}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles(colors).editScrollContent}>
            {/* Profile Picture */}
            <View style={styles(colors).editFieldContainer}>
              <Text style={styles(colors).editFieldLabel}>Profile Picture</Text>
              <View style={styles(colors).profilePictureSection}>
                <TouchableOpacity
                  style={styles(colors).profilePictureContainer}
                  onPress={pickImage}
                  activeOpacity={0.7}
                >
                  <UserAvatar
                    user={user}
                    size={100}
                    fontSize={36}
                    imageUri={profileImage}
                  />
                  <View style={styles(colors).profilePictureOverlay}>
                    <Ionicons name="camera" size={24} color={colors.white} />
                  </View>
                </TouchableOpacity>
                <View style={styles(colors).profilePictureInfo}>
                  <Text style={styles(colors).profilePictureTitle}>
                    Update Profile Picture
                  </Text>
                  <Text style={styles(colors).profilePictureSubtitle}>
                    Tap the image above to change your profile picture
                  </Text>
                  <Text style={styles(colors).profilePictureHint}>
                    JPG, PNG up to 5MB
                  </Text>
                </View>
              </View>
            </View>

            {/* Full Name */}
            <View style={styles(colors).editFieldContainer}>
              <Text style={styles(colors).editFieldLabel}>Full Name *</Text>
              <TextInput
                style={[
                  styles(colors).editInput,
                  errors.fullName && styles(colors).editInputError,
                ]}
                value={editableUser.fullName}
                onChangeText={(text) =>
                  setEditableUser((prev) => ({ ...prev, fullName: text }))
                }
                placeholder="Enter your full name"
                placeholderTextColor={colors.textMuted}
              />
              {errors.fullName && (
                <Text style={styles(colors).editErrorText}>
                  {errors.fullName}
                </Text>
              )}
            </View>

            {/* Phone */}
            <View style={styles(colors).editFieldContainer}>
              <Text style={styles(colors).editFieldLabel}>Phone Number</Text>
              <TextInput
                style={[
                  styles(colors).editInput,
                  errors.phone && styles(colors).editInputError,
                ]}
                value={editableUser.phone}
                onChangeText={(text) =>
                  setEditableUser((prev) => ({ ...prev, phone: text }))
                }
                placeholder="Enter your phone number"
                placeholderTextColor={colors.textMuted}
                keyboardType="phone-pad"
              />
              {errors.phone && (
                <Text style={styles(colors).editErrorText}>{errors.phone}</Text>
              )}
            </View>

            {/* Address */}
            <View style={styles(colors).editFieldContainer}>
              <Text style={styles(colors).editFieldLabel}>Address</Text>
              <View style={styles(colors).autocompleteContainer}>
                <AddressAutocomplete
                  placeholder="Enter your delivery address"
                  onAddressSelect={(addressInfo) => {
                    setEditableUser((prev) => ({
                      ...prev,
                      address: addressInfo.formattedAddress,
                      city:
                        addressInfo.locality ||
                        addressInfo.adminArea ||
                        prev.city,
                    }));
                  }}
                  defaultValue={editableUser.address}
                  style={[
                    errors.address && {
                      borderColor: colors.error,
                      borderWidth: 2,
                    },
                  ]}
                />
              </View>
              {errors.address && (
                <Text style={styles(colors).editErrorText}>
                  {errors.address}
                </Text>
              )}
            </View>

            {/* City */}
            <View style={styles(colors).editFieldContainer}>
              <Text style={styles(colors).editFieldLabel}>City</Text>
              <TextInput
                style={styles(colors).editInput}
                value={editableUser.city}
                onChangeText={(text) =>
                  setEditableUser((prev) => ({ ...prev, city: text }))
                }
                placeholder="Enter your city"
                placeholderTextColor={colors.textMuted}
              />
            </View>

            {/* Dietary Preferences */}
            <View style={styles(colors).editFieldContainer}>
              <Text style={styles(colors).editFieldLabel}>
                Dietary Preferences
              </Text>
              <View style={styles(colors).editPreferencesContainer}>
                {DIETARY_PREFERENCES.map((preference) => (
                  <TouchableOpacity
                    key={preference}
                    style={[
                      styles(colors).editPreferenceTag,
                      (editableUser.dietaryPreferences || []).includes(
                        preference
                      ) && styles(colors).editPreferenceTagActive,
                    ]}
                    onPress={() => toggleDietaryPreference(preference)}
                  >
                    <Text
                      style={[
                        styles(colors).editPreferenceTagText,
                        (editableUser.dietaryPreferences || []).includes(
                          preference
                        ) && styles(colors).editPreferenceTagTextActive,
                      ]}
                    >
                      {preference}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Allergies */}
            <View style={styles(colors).editFieldContainer}>
              <Text style={styles(colors).editFieldLabel}>
                Allergies & Restrictions
              </Text>
              <TextInput
                style={[
                  styles(colors).editInput,
                  styles(colors).editTextArea,
                  errors.allergies && styles(colors).editInputError,
                ]}
                value={editableUser.allergies}
                onChangeText={(text) =>
                  setEditableUser((prev) => ({ ...prev, allergies: text }))
                }
                placeholder="List any food allergies or restrictions"
                placeholderTextColor={colors.textMuted}
                multiline
                numberOfLines={2}
              />
              {errors.allergies && (
                <Text style={styles(colors).editErrorText}>
                  {errors.allergies}
                </Text>
              )}
            </View>
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
};

const styles = (colors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    // Parallax Background Styles
    fixedBackground: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      height: 400,
      zIndex: -1, // Behind everything
    },
    parallaxImage: {
      width: "100%",
      height: "100%",
      resizeMode: "cover",
    },
    backgroundOverlay: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: "rgba(0, 0, 0, 0.3)",
    },
    // Main Content Styles
    headerSpacer: {
      height: 300, // Reduced height - header will stick sooner
    },
    profileContent: {
      backgroundColor: colors.background,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      marginTop: -20,
      paddingTop: 20,
      zIndex: 1, // Below the sticky header
      position: "relative",
    },
    nameSection: {
      paddingHorizontal: 20,
      paddingVertical: 20,
    },
    contentRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-start",
    },
    leftContent: {
      flex: 1,
    },
    rightContent: {
      alignItems: "flex-end",
    },
    nameContainer: {
      marginBottom: 8,
    },
    userName: {
      fontSize: 28,
      fontWeight: "bold",
      color: colors.text,
      letterSpacing: 0.5,
      lineHeight: 32,
    },
    userEmail: {
      fontSize: 14,
      color: colors.textMuted,
    },
    rightButtons: {
      flexDirection: "row",
      gap: 12,
      alignItems: "center",
      marginBottom: 12,
    },
    headerButton: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: `${colors.text}15`,
      justifyContent: "center",
      alignItems: "center",
    },
    editButton: {
      borderWidth: 1,
      borderColor: `${colors.text}50`,
      paddingHorizontal: 24,
      paddingVertical: 10,
      borderRadius: 25,
    },
    editButtonText: {
      color: colors.text,
      fontSize: 14,
      fontWeight: "500",
    },
    tabContentContainer: {
      flex: 1,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
    },
    loadingText: {
      marginTop: 10,
      fontSize: 16,
      color: colors.textSecondary,
    },
    scrollView: {
      flex: 1,
      zIndex: 10, // Above the background image
    },
    scrollContent: {
      paddingBottom: 120, // Extra padding for floating tab bar
    },
    tabContent: {
      paddingHorizontal: 20,
      paddingTop: 20,
    },
    section: {
      marginBottom: 28,
    },
    sectionHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 15,
    },
    sectionTitle: {
      fontSize: 20,
      fontWeight: "700",
      color: colors.text,
      marginBottom: 16,
      letterSpacing: 0.3,
    },
    seeAllText: {
      fontSize: 14,
      color: colors.primary,
      fontWeight: "500",
    },
    subscriptionCard: {
      borderRadius: THEME.borderRadius.large,
      overflow: "hidden",
    },
    subscriptionGradient: {
      padding: 20,
      position: "relative",
    },
    subscriptionContent: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    subscriptionPattern: {
      position: "absolute",
      top: -10,
      right: -10,
      opacity: 0.1,
    },
    subscriptionTitle: {
      fontSize: 18,
      fontWeight: "600",
      color: colors.white,
      marginBottom: 4,
    },
    subscriptionSubtitle: {
      fontSize: 14,
      color: "rgba(255,255,255,0.8)",
      marginBottom: 4,
    },
    subscriptionNext: {
      fontSize: 12,
      color: "rgba(255,255,255,0.7)",
    },
    manageButton: {
      backgroundColor: "rgba(255,255,255,0.25)",
      paddingHorizontal: 18,
      paddingVertical: 10,
      borderRadius: THEME.borderRadius.large,
      borderWidth: 1,
      borderColor: "rgba(255,255,255,0.3)",
    },
    manageButtonText: {
      color: colors.white,
      fontSize: 14,
      fontWeight: "500",
    },
    achievementsScroll: {
      paddingRight: 20,
      marginBottom: 10,
      gap: 15,
    },
    achievementCard: {
      width: 130,
      backgroundColor: colors.cardBackground,
      borderRadius: THEME.borderRadius.large,
      padding: 16,
      alignItems: "center",
      borderWidth: 1,
      borderColor: colors.border,
      shadowColor: colors.shadow || "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    },
    achievementCardLocked: {
      opacity: 0.5,
    },
    achievementIcon: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: `${colors.primary}20`,
      justifyContent: "center",
      alignItems: "center",
      marginBottom: 12,
      borderWidth: 2,
      borderColor: `${colors.primary}40`,
    },
    achievementIconLocked: {
      backgroundColor: `${colors.textMuted}20`,
    },
    achievementTitle: {
      fontSize: 12,
      fontWeight: "600",
      color: colors.text,
      textAlign: "center",
      marginBottom: 5,
    },
    achievementTitleLocked: {
      color: colors.textMuted,
    },
    achievementDescription: {
      fontSize: 10,
      color: colors.textSecondary,
      textAlign: "center",
      lineHeight: 14,
    },
    quickActionsGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 15,
    },
    quickActionCard: {
      width: (width - 55) / 2,
      backgroundColor: colors.cardBackground,
      borderRadius: THEME.borderRadius.large,
      padding: 22,
      alignItems: "center",
      borderWidth: 1.5,
      borderColor: colors.border,
    },
    quickActionText: {
      fontSize: 14,
      color: colors.text,
      marginTop: 10,
      fontWeight: "500",
    },
    nutritionCard: {
      backgroundColor: colors.cardBackground,
      borderRadius: THEME.borderRadius.large,
      padding: 28,
      alignItems: "center",
      borderWidth: 2,
      borderColor: colors.border,
      shadowColor: colors.shadow || "#000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.0015,
      shadowRadius: 8,
      elevation: 4,
    },
    nutritionScoreContainer: {
      flexDirection: "row",
      alignItems: "baseline",
      marginBottom: 10,
    },
    nutritionScore: {
      fontSize: 48,
      fontWeight: "bold",
      color: colors.primary,
    },
    nutritionScoreMax: {
      fontSize: 24,
      color: colors.textSecondary,
      marginLeft: 5,
    },
    nutritionLabel: {
      fontSize: 16,
      color: colors.textSecondary,
      marginBottom: 20,
    },
    nutritionProgress: {
      width: "100%",
      height: 8,
      backgroundColor: `${colors.primary}20`,
      borderRadius: 4,
      overflow: "hidden",
    },
    nutritionProgressFill: {
      height: "100%",
      backgroundColor: colors.primary,
      borderRadius: 4,
    },
    tapToViewDetails: {
      fontSize: 12,
      color: colors.textMuted,
      marginTop: 10,
      fontStyle: "italic",
    },
    activityList: {
      gap: 15,
    },
    activityItem: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.cardBackground,
      padding: 16,
      borderRadius: THEME.borderRadius.large,
      borderWidth: 1,
      borderColor: colors.border,
      shadowColor: colors.shadow || "#000",
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.08,
      shadowRadius: 3,
      elevation: 2,
    },
    activityIcon: {
      width: 44,
      height: 44,
      borderRadius: 22,
      justifyContent: "center",
      alignItems: "center",
      marginRight: 16,
      borderWidth: 1,
      borderColor: "rgba(255,255,255,0.2)",
    },
    activityContent: {
      flex: 1,
    },
    activityTitle: {
      fontSize: 16,
      fontWeight: "500",
      color: colors.text,
      marginBottom: 2,
    },
    activityDate: {
      fontSize: 12,
      color: colors.textSecondary,
    },
    preferencesContainer: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 10,
    },
    preferenceTag: {
      backgroundColor: `${colors.primary}20`,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: THEME.borderRadius.medium,
    },
    preferenceTagText: {
      color: colors.primary,
      fontSize: 14,
      fontWeight: "500",
    },
    emptyText: {
      color: colors.textMuted,
      fontStyle: "italic",
      textAlign: "center",
      paddingVertical: 20,
    },
    infoCard: {
      backgroundColor: `${colors.cardBackground}20`,
      borderRadius: THEME.borderRadius.medium,
      padding: 15,
      borderWidth: 1,
      borderColor: `${colors.primary}15`,
    },
    infoRow: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    infoIconContainer: {
      width: 40,
      alignItems: "center",
      justifyContent: "center",
    },
    infoContent: {
      flex: 1,
      marginLeft: 10,
    },
    infoLabel: {
      fontSize: 14,
      color: colors.textSecondary,
      marginBottom: 2,
    },
    infoValue: {
      fontSize: 16,
      color: colors.text,
      fontWeight: "500",
    },
    settingsCard: {
      backgroundColor: colors.cardBackground,
      borderRadius: THEME.borderRadius.medium,
      padding: 15,
      borderWidth: 1,
      borderColor: colors.border,
    },
    settingRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    settingText: {
      fontSize: 16,
      color: colors.text,
      fontWeight: "500",
    },
    actionButton: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.cardBackground,
      padding: 15,
      borderRadius: THEME.borderRadius.medium,
      marginBottom: 10,
      borderWidth: 1,
      borderColor: colors.border,
    },
    actionButtonText: {
      flex: 1,
      fontSize: 16,
      color: colors.text,
      fontWeight: "500",
      marginLeft: 15,
    },
    logoutButton: {
      borderColor: colors.error,
    },
    logoutText: {
      color: colors.error,
    },
    emptySubscriptionCard: {
      backgroundColor: colors.cardBackground,
      borderRadius: THEME.borderRadius.large,
      padding: 30,
      alignItems: "center",
      borderWidth: 2,
      borderColor: `${colors.primary}30`,
      borderStyle: "dashed",
    },
    emptySubscriptionTitle: {
      fontSize: 18,
      fontWeight: "600",
      color: colors.text,
      marginTop: 15,
      // marginBottom: 8,
    },
    emptySubscriptionText: {
      fontSize: 14,
      color: colors.textSecondary,
      textAlign: "center",
      marginBottom: 20,
    },
    startSubscriptionButton: {
      backgroundColor: colors.primary,
      paddingHorizontal: 24,
      paddingVertical: 12,
      borderRadius: THEME.borderRadius.xxl,
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 6,
      elevation: 5,
    },
    startSubscriptionButtonText: {
      color: colors.black,
      fontSize: 14,
      fontWeight: "600",
    },
    activityLoadingContainer: {
      paddingVertical: 40,
      alignItems: "center",
    },
    loadingText: {
      marginTop: 10,
      fontSize: 14,
      color: colors.textSecondary,
    },
    emptyActivityContainer: {
      backgroundColor: colors.cardBackground,
      borderRadius: THEME.borderRadius.large,
      padding: 32,
      alignItems: "center",
      borderWidth: 2,
      borderColor: colors.border,
      borderStyle: "dashed",
      shadowColor: colors.shadow || "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.08,
      shadowRadius: 4,
      elevation: 3,
    },
    emptyActivityTitle: {
      fontSize: 16,
      fontWeight: "600",
      color: colors.text,
      marginTop: 15,
      marginBottom: 8,
    },
    emptyActivityText: {
      fontSize: 14,
      color: colors.textSecondary,
      textAlign: "center",
    },
    achievementsLoadingContainer: {
      paddingVertical: 40,
      alignItems: "center",
    },
    achievementEarnedBadge: {
      position: "absolute",
      top: -5,
      right: -5,
      backgroundColor: colors.success,
      borderRadius: 8,
      width: 16,
      height: 16,
      justifyContent: "center",
      alignItems: "center",
    },
    achievementClaimBadge: {
      position: "absolute",
      top: -5,
      right: -5,
      backgroundColor: colors.warning,
      borderRadius: 8,
      width: 16,
      height: 16,
      justifyContent: "center",
      alignItems: "center",
    },
    achievementClaimText: {
      fontSize: 10,
      color: colors.warning,
      fontWeight: "600",
      textAlign: "center",
      marginTop: 5,
    },
    achievementProgress: {
      marginTop: 8,
      alignItems: "center",
    },
    achievementProgressText: {
      fontSize: 10,
      color: colors.textSecondary,
      marginBottom: 4,
    },
    achievementProgressBar: {
      width: "100%",
      height: 4,
      backgroundColor: `${colors.textMuted}30`,
      borderRadius: 2,
      overflow: "hidden",
    },
    achievementProgressFill: {
      height: "100%",
      backgroundColor: colors.primary,
      borderRadius: 2,
    },
    emptyAchievementsContainer: {
      backgroundColor: colors.cardBackground,
      borderRadius: THEME.borderRadius.large,
      padding: 32,
      alignItems: "center",
      borderWidth: 2,
      borderColor: `${colors.primary}30`,
      borderStyle: "dashed",
      shadowColor: colors.shadow || "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.08,
      shadowRadius: 4,
      elevation: 3,
    },
    emptyAchievementsTitle: {
      fontSize: 16,
      fontWeight: "600",
      color: colors.text,
      marginTop: 15,
      marginBottom: 8,
    },
    emptyAchievementsText: {
      fontSize: 14,
      color: colors.textSecondary,
      textAlign: "center",
      marginBottom: 20,
    },
    startAchievementsButton: {
      backgroundColor: colors.primary,
      paddingHorizontal: 24,
      paddingVertical: 12,
      borderRadius: THEME.borderRadius.xxl,
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 6,
      elevation: 5,
    },
    startAchievementsButtonText: {
      color: colors.black,
      fontSize: 14,
      fontWeight: "600",
    },
    startActivityButton: {
      backgroundColor: colors.primary,
      paddingHorizontal: 24,
      paddingVertical: 12,
      borderRadius: THEME.borderRadius.xxl,
      marginTop: 18,
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 6,
      elevation: 5,
    },
    startActivityButtonText: {
      color: colors.black,
      fontSize: 14,
      fontWeight: "600",
    },
    notificationsLoadingContainer: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 20,
    },
    // Edit Profile Modal Styles
    editModalContainer: {
      flex: 1,
      backgroundColor: colors.background,
    },
    editHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingHorizontal: 20,
      paddingVertical: 15,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    editTitle: {
      fontSize: 18,
      fontWeight: "600",
      color: colors.text,
    },
    editCancelText: {
      fontSize: 16,
      color: colors.textSecondary,
    },
    editSaveText: {
      fontSize: 16,
      color: colors.primary,
      fontWeight: "600",
    },
    editSaveTextDisabled: {
      color: colors.textMuted,
    },
    editScrollContent: {
      paddingHorizontal: 20,
      paddingVertical: 20,
    },
    editFieldContainer: {
      marginBottom: 20,
    },
    editFieldLabel: {
      fontSize: 16,
      fontWeight: "500",
      color: colors.text,
      marginBottom: 10,
    },
    // Profile Picture Edit Styles
    profilePictureSection: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.cardBackground,
      borderRadius: THEME.borderRadius.medium,
      padding: 20,
      borderWidth: 1,
      borderColor: colors.border,
    },
    profilePictureContainer: {
      position: "relative",
      marginRight: 20,
    },
    profilePictureOverlay: {
      position: "absolute",
      bottom: 0,
      right: 0,
      backgroundColor: colors.primary,
      borderRadius: 15,
      width: 30,
      height: 30,
      justifyContent: "center",
      alignItems: "center",
      borderWidth: 2,
      borderColor: colors.cardBackground,
    },
    profilePictureInfo: {
      flex: 1,
    },
    profilePictureTitle: {
      fontSize: 16,
      fontWeight: "600",
      color: colors.text,
      marginBottom: 4,
    },
    profilePictureSubtitle: {
      fontSize: 14,
      color: colors.textSecondary,
      marginBottom: 8,
    },
    profilePictureHint: {
      fontSize: 12,
      color: colors.textMuted,
      fontStyle: "italic",
    },
    // Input Styles
    editInput: {
      backgroundColor: colors.cardBackground,
      borderRadius: THEME.borderRadius.medium,
      padding: 15,
      fontSize: 16,
      color: colors.text,
      borderWidth: 1,
      borderColor: colors.border,
    },
    editInputError: {
      borderColor: colors.error,
    },
    editTextArea: {
      height: 80,
      textAlignVertical: "top",
    },
    autocompleteContainer: {
      minHeight: 50,
      zIndex: 1000,
    },
    editErrorText: {
      color: colors.error,
      fontSize: 12,
      marginTop: 5,
    },
    // Preferences Styles
    editPreferencesContainer: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 10,
    },
    editPreferenceTag: {
      backgroundColor: colors.cardBackground,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: THEME.borderRadius.medium,
      paddingHorizontal: 12,
      paddingVertical: 8,
    },
    editPreferenceTagActive: {
      backgroundColor: `${colors.primary}20`,
      borderColor: `${colors.primary}20`,
    },
    editPreferenceTagText: {
      color: colors.textSecondary,
      fontSize: 14,
      fontWeight: "500",
    },
    editPreferenceTagTextActive: {
      color: colors.primary,
    },
    // Header Content Styles
    headerContent: {
      backgroundColor: colors.background,
      zIndex: 1000,
      elevation: 10,
      shadowColor: "#00000040",
      shadowOffset: {
        width: 0,
        height: 5,
      },
      shadowOpacity: 0.2,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
    },
  });

export default ProfileScreen;
