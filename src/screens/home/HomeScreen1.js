import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Image,
  TextInput,
  Dimensions,
  StatusBar,
  RefreshControl,
  ActivityIndicator,
  Animated,
  Modal,
  LayoutAnimation,
  UIManager,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import CustomIcon from "../../components/ui/CustomIcon";
import { LinearGradient } from "expo-linear-gradient";
import { useNotification } from "../../context/NotificationContext";
import { useBookmarks } from "../../context/BookmarkContext";
import NotificationIcon from "../../components/ui/NotificationIcon";
import { useMealPlans } from "../../hooks/useMealPlans";
import { useTheme } from "../../styles/theme";
import { COLORS, THEME } from "../../utils/colors";
import apiService from "../../services/api";
import discountService from "../../services/discountService";
import { useAuth } from "../../hooks/useAuth";
import MealCardSkeleton from "../../components/meal-plans/MealCardSkeleton";
import Tutorial from "../../components/tutorial/Tutorial";
import { homeScreenTutorialSteps } from "../../utils/tutorialSteps";
import ErrorBoundary from "../../components/ErrorBoundary";
import AsyncStorage from "@react-native-async-storage/async-storage";
import NotificationService from "../../services/notificationService";
import NotificationTestService from "../../services/notificationTestService";
import AddressAutocomplete from "../../components/ui/AddressAutocomplete";
import { useAlert } from "../../contexts/AlertContext";
import OrderTrackingCard from "../../components/orders/OrderTrackingCard";
import CompactOrderCard from "../../components/orders/CompactOrderCard";
import RecurringDeliveryCard from "../../components/orders/RecurringDeliveryCard";
import SubscriptionCard from "../../components/dashboard/SubscriptionCard";
import MealProgressionTimeline from "../../components/subscription/MealProgressionTimeline";
import SubscriptionManagementModal from "../../components/subscription/SubscriptionManagementModal";
import CustomText from "../../components/ui/CustomText";
import { DMSansFonts } from "../../constants/fonts";
import { createStylesWithDMSans } from "../../utils/fontUtils";
import TagFilterBar from "../../components/home/TagFilterBar";
import tagService from "../../services/tagService";

const { width } = Dimensions.get("window");

// Enable LayoutAnimation on Android
if (
  Platform.OS === "android" &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const HomeScreen = ({ navigation }) => {
  const { isDark, colors } = useTheme();
  const { user } = useAuth();
  const {
    showSuccess,
    showError,
    showDeleteConfirm,
    showPaymentSuccess,
    showUpdateReminder,
    showRetryError,
  } = useAlert();
  const [selectedCategory, setSelectedCategory] = useState("All Plans");

  // Discount state
  const [discountData, setDiscountData] = useState({});
  const [discountLoading, setDiscountLoading] = useState(true);
  const [currentPopularIndex, setCurrentPopularIndex] = useState(0);
  const [currentBannerIndex, setCurrentBannerIndex] = useState(0);
  const popularScrollRef = useRef(null);
  const bannerScrollRef = useRef(null);
  const mealsScrollRef = useRef(null);
  const { mealPlans, loading, error, refreshing, refreshMealPlans } =
    useMealPlans();
  const { toggleBookmark, isBookmarked } = useBookmarks();
  const [banners, setBanners] = useState([]);
  const [bannersLoading, setBannersLoading] = useState(true);
  const [activeSubscriptions, setActiveSubscriptions] = useState([]);
  const [subscriptionLoading, setSubscriptionLoading] = useState(true);
  const [showSubscriptionMenu, setShowSubscriptionMenu] = useState(false);
  const [showPauseModal, setShowPauseModal] = useState(false);
  const [pauseReason, setPauseReason] = useState("");
  const [pauseDuration, setPauseDuration] = useState("1_week");
  const [showBrowseMode, setShowBrowseMode] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [activeOrders, setActiveOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [showManagementModal, setShowManagementModal] = useState(false);
  const [selectedSubscription, setSelectedSubscription] = useState(null);
  const [showMealTimeline, setShowMealTimeline] = useState(false);

  // Tag filtering state
  const [selectedTagId, setSelectedTagId] = useState(null);
  const [selectedTag, setSelectedTag] = useState(null);
  const [filteredMealPlans, setFilteredMealPlans] = useState([]);

  useEffect(() => {
    const checkFirstLaunch = async () => {
      const hasLaunched = await AsyncStorage.getItem("hasLaunched");
      if (hasLaunched === null) {
        setShowTutorial(true);
        await AsyncStorage.setItem("hasLaunched", "true");
      }
    };
    checkFirstLaunch();
  }, []);

  // ... (rest of the component logic remains the same)

  // Handle promo banner button press
  const handlePromoBannerPress = async (banner) => {
    try {
      // Track banner click
      if (banner._id) {
        await apiService.trackBannerClick(banner._id);
      }

      // Navigate based on CTA destination
      switch (banner.ctaDestination) {
        case "Search":
          navigation.navigate("Search");
          break;
        case "MealPlans":
          navigation.navigate("Search");
          break;
        case "MealPlanDetail":
          if (banner.ctaParams?.planId) {
            // Find the meal plan by planId
            const plan = mealPlans.find(
              (p) => p.planId === banner.ctaParams.planId
            );
            if (plan) {
              navigation.navigate("MealPlanDetail", { bundle: plan });
            } else {
              navigation.navigate("Search");
            }
          } else {
            navigation.navigate("Search");
          }
          break;
        case "Profile":
          navigation.navigate("Profile");
          break;
        case "Orders":
          navigation.navigate("OrderTracking");
          break;
        case "Support":
          navigation.navigate("HelpCenter");
          break;
        case "External":
          if (banner.externalUrl) {
            await Linking.openURL(banner.externalUrl);
          }
          break;
        default:
          navigation.navigate("Search");
      }
    } catch (error) {
      console.error("Error handling banner press:", error);
      // Still navigate even if tracking fails
      navigation.navigate("Search");
    }
  };

  // Handle address change from modal
  const handleAddressChange = async (addressInfo) => {
    try {
      // Update user profile with new address
      const response = await apiService.updateProfile({
        address: addressInfo.formattedAddress,
        city: addressInfo.locality || addressInfo.adminArea || "",
        state: addressInfo.adminArea || "Lagos",
      });

      if (response.success) {
        setShowAddressModal(false);
        // The user context will be updated automatically through the auth context
      } else {
        showError(
          "Update Failed",
          response.message || "Failed to update address"
        );
      }
    } catch (error) {
      console.error("Error updating address:", error);
      showError(
        "Update Failed",
        "An error occurred while updating your address"
      );
    }
  };

  const categories = [
    { id: "All Plans", label: "All Plans" },
    { id: "Fitness", label: "Fitness" },
    { id: "Professional", label: "Professional" },
    { id: "Family", label: "Family" },
    { id: "Wellness", label: "Wellness" },
  ];

  // Prefer the same description precedence as the detail screen:
  // mealPlanDetails?.description -> plan.description -> other fallbacks
  const getPlanDescription = (plan) => {
    if (!plan) return "";
    return (
      plan.mealPlanDetails?.description ||
      plan.description ||
      plan.bundle?.description ||
      plan.longDescription ||
      plan.fullDescription ||
      plan.summary ||
      plan.shortDescription ||
      ""
    );
  };

  // Sort mealPlans so that newest appear first and determine which are "new"
  const displayPlans = React.useMemo(() => {
    const sortedPlans = [...mealPlans].sort((a, b) => {
      const dateA = new Date(a.createdAt || "2024-01-01");
      const dateB = new Date(b.createdAt || "2024-01-01");
      return dateB - dateA; // Newest first
    });

    // Mark plans as "new" if created within the last 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    return sortedPlans.map((plan) => ({
      ...plan,
      isNew: new Date(plan.createdAt || "2024-01-01") > sevenDaysAgo,
    }));
  }, [mealPlans]);

  // Initialize filteredMealPlans with all meal plans when displayPlans changes
  useEffect(() => {
    if (!selectedTagId) {
      setFilteredMealPlans(displayPlans);
    }
  }, [displayPlans, selectedTagId]);

  // Tag filtering logic - only when a tag is selected
  useEffect(() => {
    const filterMealPlans = async () => {
      if (!selectedTagId) {
        return; // Already handled in the above useEffect
      }

      try {
        // Fetch meal plans for the selected tag
        const response = await tagService.getMealPlansByTag(selectedTagId);
        if (response.success && response.data) {
          setFilteredMealPlans(response.data);
        } else {
          setFilteredMealPlans([]);
        }
      } catch (error) {
        console.error("Error filtering meal plans by tag:", error);
        setFilteredMealPlans([]);
      }
    };

    if (selectedTagId) {
      filterMealPlans();
    }
  }, [selectedTagId]);

  // Handle tag selection with smooth animation
  const handleTagSelect = (tagId, tag) => {
    // Configure the layout animation
    LayoutAnimation.configureNext({
      duration: 300,
      create: {
        type: LayoutAnimation.Types.easeInEaseOut,
        property: LayoutAnimation.Properties.opacity,
      },
      update: {
        type: LayoutAnimation.Types.easeInEaseOut,
        property: LayoutAnimation.Properties.scaleXY,
      },
      delete: {
        type: LayoutAnimation.Types.easeInEaseOut,
        property: LayoutAnimation.Properties.opacity,
      },
    });

    setSelectedTagId(tagId);
    setSelectedTag(tag);
  };

  // Handle filter application
  const handleApplyFilters = (filters) => {
    console.log("🔍 Applying filters:", filters);
    // You can implement additional filter logic here
    // For now, the filters will be handled by the FilterModal
    // and could be used to further filter the meal plans
  };

  // Load banners, subscription, and orders from backend
  useEffect(() => {
    // Load data concurrently for faster home screen loading
    Promise.all([
      loadBanners(true), // Force refresh on initial load
      loadActiveSubscriptions(),
      loadActiveOrders(),
    ]).catch((error) => {
      console.error("Error loading home screen data:", error);
    });
  }, []);

  // Fetch discount data for meal plans
  useEffect(() => {
    const fetchDiscountData = async () => {
      if (!user || !mealPlans || mealPlans.length === 0) {
        setDiscountLoading(false);
        return;
      }

      try {
        setDiscountLoading(true);
        console.log("💰 HomeScreen: Fetching discount data for meal plans");

        const discounts = {};

        // Fetch discount for each meal plan
        for (const plan of mealPlans) {
          try {
            const discount = await discountService.calculateDiscount(
              user,
              plan
            );
            discounts[plan.id || plan._id] = discount;
          } catch (error) {
            console.error(
              `Error calculating discount for plan ${plan.id}:`,
              error
            );
            // Set default no discount for this plan
            discounts[plan.id || plan._id] = {
              discountPercent: 0,
              discountAmount: 0,
              reason: "No discount available",
            };
          }
        }

        setDiscountData(discounts);
      } catch (error) {
        console.error("Error fetching discount data:", error);
        setDiscountData({});
      } finally {
        setDiscountLoading(false);
      }
    };

    fetchDiscountData();
  }, [user, mealPlans]);

  const loadBanners = async (forceRefresh = false) => {
    try {
      setBannersLoading(true);
      const result = await apiService.getActiveBanners(forceRefresh);

      if (result.success) {
        // Handle nested response structure: result.data.data contains the actual banners array
        const bannersData = Array.isArray(result.data?.data)
          ? result.data.data
          : Array.isArray(result.data)
            ? result.data
            : [];
        setBanners(bannersData);
        console.log(
          `✅ Loaded ${bannersData.length} banners:`,
          bannersData.map((b) => b.title || b.name || "Untitled")
        );
      } else {
        console.error("❌ Failed to load banners:", result.error);
        setBanners([]);
      }
    } catch (error) {
      console.error("❌ Banners loading error:", error);
      setBanners([]);
    } finally {
      setBannersLoading(false);
    }
  };

  // Subscription action handlers
  const handlePauseSubscription = () => {
    setShowPauseModal(true);
  };

  // New recurring delivery handlers
  const handleSubscriptionPress = (subscription) => {
    // Navigate to subscription details
    navigation.navigate("SubscriptionTracking", {
      subscriptionId: subscription._id,
      subscription,
    });
  };

  const handleSubscriptionMenuPress = (subscription) => {
    setSelectedSubscription(subscription);
    setShowManagementModal(true);
  };

  const handleSubscriptionUpdate = (updatedSubscription) => {
    setActiveSubscriptions((prev) =>
      prev.map((sub) =>
        sub._id === updatedSubscription._id ? updatedSubscription : sub
      )
    );
  };

  const handleMealPress = (meal) => {
    // Handle meal detail view
    console.log("Meal pressed:", meal);
  };

  const handleShowMealTimeline = (subscription) => {
    setSelectedSubscription(subscription);
    setShowMealTimeline(true);
  };

  const confirmPauseSubscription = async () => {
    const primarySubscription = activeSubscriptions[0];
    if (!primarySubscription || !pauseReason) return;

    try {
      // Update subscription status
      const result = await apiService.updateSubscription(
        primarySubscription._id,
        {
          status: "paused",
          pauseReason,
          pauseDuration,
          pausedAt: new Date().toISOString(),
        }
      );

      if (result.success) {
        // Update the subscription in the list
        const updatedSubscriptions = activeSubscriptions.map((sub) =>
          sub._id === primarySubscription._id
            ? { ...sub, status: "paused" }
            : sub
        );
        setActiveSubscriptions(updatedSubscriptions);

        // Send notifications to all stakeholders
        await NotificationService.notifySubscriptionPause(
          primarySubscription._id,
          pauseReason,
          pauseDuration,
          {
            id: primarySubscription.userId,
            name: "User", // You might want to get actual user name
          }
        );

        setShowPauseModal(false);
        setPauseReason("");
        console.log("✅ Subscription paused and notifications sent");
      }
    } catch (error) {
      console.error("❌ Error pausing subscription:", error);
    }
  };

  const handleModifySubscription = async () => {
    const primarySubscription = activeSubscriptions[0];
    if (!primarySubscription?.mealPlanId) return;

    // Navigate to subscription modification screen
    navigation.navigate("MealPlanDetail", {
      bundle: primarySubscription.mealPlanId || {},
      subscriptionId: primarySubscription._id,
      isModification: true,
    });

    // Send notification about modification attempt
    await NotificationService.notifySubscriptionModification(
      primarySubscription._id,
      { action: "modification_started" },
      {
        id: primarySubscription.userId,
        name: "User",
      }
    );
  };

  const handleScheduleSubscription = async () => {
    const primarySubscription = activeSubscriptions[0];
    if (!primarySubscription) return;

    // Navigate to scheduling screen
    navigation.navigate("Profile", {
      tab: "schedule",
      subscriptionId: primarySubscription._id,
    });

    // Send notification about schedule change attempt
    await NotificationService.notifyScheduleChange(
      primarySubscription._id,
      { action: "schedule_modification_started" },
      {
        id: primarySubscription.userId,
        name: "User",
      }
    );
  };

  // Meatball menu options
  const menuOptions = [
    {
      icon: "information-circle",
      title: "View Details",
      subtitle: "See subscription details",
      onPress: () => {
        setShowSubscriptionMenu(false);
        navigation.navigate("Profile", { tab: "subscriptions" });
      },
    },
    {
      icon: "location",
      title: "Change Address",
      subtitle: "Update delivery address",
      onPress: () => {
        setShowSubscriptionMenu(false);
        navigation.navigate("Profile", { tab: "profile", editAddress: true });
      },
    },
    {
      icon: "nutrition",
      title: "Dietary Preferences",
      subtitle: "Update food preferences",
      onPress: () => {
        setShowSubscriptionMenu(false);
        navigation.navigate("Profile", { tab: "preferences" });
      },
    },
    {
      icon: "close-circle",
      title: "Cancel Subscription",
      subtitle: "End your subscription",
      onPress: () => {
        setShowSubscriptionMenu(false);
        // Handle cancellation
        handleCancelSubscription();
      },
      danger: true,
    },
    {
      icon: "help-circle",
      title: "Contact Support",
      subtitle: "Get help with your subscription",
      onPress: () => {
        setShowSubscriptionMenu(false);
        navigation.navigate("HelpCenter");
      },
    },
  ];

  const handleCancelSubscription = async () => {
    const primarySubscription = activeSubscriptions[0];
    if (!primarySubscription) return;

    // Show confirmation dialog first
    // For now, just log
    console.log("Cancel subscription requested for:", primarySubscription._id);
  };

  const loadActiveSubscriptions = async () => {
    try {
      setSubscriptionLoading(true);

      // SOLUTION: Extract subscription data from delivered orders since that's where the real data is
      const ordersResult = await apiService.getUserOrders();
      const subscriptionsFromOrders = [];

      if (ordersResult.success) {
        const orders =
          ordersResult.data?.data ||
          ordersResult.data ||
          ordersResult.orders ||
          [];

        console.log("🔍 Orders data structure:", {
          hasData: !!ordersResult.data,
          dataType: typeof ordersResult.data,
          isArray: Array.isArray(orders),
          ordersLength: orders?.length,
          firstOrderHasSubscription: orders?.[0]?.subscription ? "YES" : "NO",
        });

        // Extract unique subscriptions from orders - only if orders is an array
        if (Array.isArray(orders)) {
          const uniqueSubscriptions = new Map();

          orders.forEach((order) => {
            if (order.subscription && order.subscription.status === "Active") {
              const subId = order.subscription._id;
              if (!uniqueSubscriptions.has(subId)) {
                // Enrich subscription with meal plan data from order
                const enrichedSubscription = {
                  ...order.subscription,
                  mealPlanId: order.subscription.mealPlanId || {
                    _id: order.orderItems?.mealPlan,
                    name: order.orderItems?.planName,
                    planName: order.orderItems?.planName,
                  },
                };
                uniqueSubscriptions.set(subId, enrichedSubscription);
              }
            }
          });

          subscriptionsFromOrders.push(...uniqueSubscriptions.values());
        }
      }

      // Also try the subscriptions endpoint as fallback
      const result = await apiService.getUserSubscriptions();
      let apiSubscriptions = [];

      if (result.success) {
        const subscriptions =
          result.data?.data || result.data || result.subscriptions || [];

        if (Array.isArray(subscriptions)) {
          apiSubscriptions = subscriptions.filter((sub) => {
            const status = sub.status?.toLowerCase();
            return (
              status === "active" ||
              status === "paid" ||
              sub.paymentStatus === "Paid"
            );
          });
        } else if (subscriptions && typeof subscriptions === "object") {
          const status = subscriptions?.status?.toLowerCase();
          if (
            status === "active" ||
            status === "paid" ||
            subscriptions.paymentStatus === "Paid"
          ) {
            apiSubscriptions = [subscriptions];
          }
        }
      }

      // Combine and deduplicate subscriptions from both sources
      const allSubscriptions = [
        ...subscriptionsFromOrders,
        ...apiSubscriptions,
      ];
      const uniqueSubscriptionsMap = new Map();

      allSubscriptions.forEach((sub) => {
        const subId = sub._id || sub.subscriptionId;
        if (subId && !uniqueSubscriptionsMap.has(subId)) {
          uniqueSubscriptionsMap.set(subId, sub);
        }
      });

      const finalSubscriptions = Array.from(uniqueSubscriptionsMap.values());

      // CRITICAL FIX: Fetch full meal plan data for each subscription
      const enrichedSubscriptions = await Promise.all(
        finalSubscriptions.map(async (subscription) => {
          try {
            const mealPlanId =
              subscription.mealPlanId?._id || subscription.mealPlanId;
            if (mealPlanId) {
              const mealPlanResult =
                await apiService.getMealPlanById(mealPlanId);
              if (mealPlanResult.success && mealPlanResult.data) {
                return {
                  ...subscription,
                  mealPlanId: mealPlanResult.data,
                };
              } else {
                console.warn(
                  `⚠️ Meal plan not found (ID: ${mealPlanId}) for subscription ${subscription._id}. Using fallback data.`
                );
                // Return subscription with fallback meal plan data
                return {
                  ...subscription,
                  mealPlanId: {
                    _id: mealPlanId,
                    planName:
                      subscription.mealPlanId?.planName ||
                      "Meal Plan (Unavailable)",
                    name:
                      subscription.mealPlanId?.name ||
                      "Meal Plan (Unavailable)",
                    planImageUrl: subscription.mealPlanId?.planImageUrl || null,
                    image: subscription.mealPlanId?.image || null,
                    weeklyMeals: subscription.mealPlanId?.weeklyMeals || {},
                    // Add other fallback properties as needed
                  },
                };
              }
            }
            return subscription;
          } catch (error) {
            const errorMessage = error.message || "Unknown error";
            console.warn(
              `⚠️ Failed to fetch meal plan for subscription ${subscription._id}: ${errorMessage}. Using fallback data.`
            );
            // Return subscription with minimal fallback data to prevent crashes
            return {
              ...subscription,
              mealPlanId: {
                _id:
                  subscription.mealPlanId?._id ||
                  subscription.mealPlanId ||
                  "unknown",
                planName:
                  subscription.mealPlanId?.planName ||
                  "Meal Plan (Unavailable)",
                name:
                  subscription.mealPlanId?.name || "Meal Plan (Unavailable)",
                planImageUrl: null,
                image: null,
                weeklyMeals: {},
              },
            };
          }
        })
      );

      setActiveSubscriptions(enrichedSubscriptions);

      console.log(
        "🎯 Active subscriptions found:",
        enrichedSubscriptions.length
      );
      console.log("📦 Subscription sources:", {
        fromOrders: subscriptionsFromOrders.length,
        fromAPI: apiSubscriptions.length,
        final: enrichedSubscriptions.length,
      });
    } catch (error) {
      console.error("❌ Error loading subscriptions:", error);
      setActiveSubscriptions([]);
    } finally {
      setSubscriptionLoading(false);
    }
  };

  const loadActiveOrders = async () => {
    try {
      setOrdersLoading(true);

      // Try to get both regular orders and subscription-based orders
      const [ordersResult, subscriptionsResult] = await Promise.all([
        apiService
          .getUserOrders()
          .catch((err) => ({ success: false, error: err })),
        apiService
          .getUserSubscriptions()
          .catch((err) => ({ success: false, error: err })),
      ]);

      let allActiveOrders = [];

      // Process regular orders
      if (ordersResult.success) {
        const orders =
          ordersResult.data?.data ||
          ordersResult.data ||
          ordersResult.orders ||
          [];
        const regularActiveOrders = Array.isArray(orders)
          ? orders.filter((order) => {
              // Check both 'status' and 'orderStatus' fields
              const status = (
                order.status ||
                order.orderStatus ||
                ""
              ).toLowerCase();
              return (
                status &&
                !["delivered", "cancelled", "completed"].includes(status)
              );
            })
          : [];

        console.log("🔍 Found orders:", orders.length);
        console.log(
          "🔍 Active orders after filter:",
          regularActiveOrders.length
        );
        if (orders.length > 0) {
          console.log(
            "🔍 First order status:",
            orders[0].status,
            "orderStatus:",
            orders[0].orderStatus
          );
        }

        allActiveOrders = [...regularActiveOrders];
      }

      // Process subscription-based orders (create virtual order from subscription)
      if (subscriptionsResult.success && !allActiveOrders.length) {
        const subscriptions =
          subscriptionsResult.data?.data ||
          subscriptionsResult.data ||
          subscriptionsResult.subscriptions ||
          [];
        const activeSubscriptionsList = Array.isArray(subscriptions)
          ? subscriptions.filter((sub) => {
              const status = sub.status?.toLowerCase();
              return (
                status === "active" ||
                status === "paid" ||
                sub.paymentStatus === "Paid"
              );
            })
          : [];

        // Convert active subscriptions to virtual orders for tracking
        const subscriptionOrders = activeSubscriptionsList.map(
          (subscription) => {
            // Calculate delivery day for the subscription
            let deliveryDay = 1;
            if (subscription.startDate && subscription.nextDelivery) {
              const startDate = new Date(subscription.startDate);
              const nextDelivery = new Date(subscription.nextDelivery);

              // Normalize dates to midnight to avoid time-of-day issues
              const startDateNormalized = new Date(
                startDate.getFullYear(),
                startDate.getMonth(),
                startDate.getDate()
              );
              const nextDeliveryNormalized = new Date(
                nextDelivery.getFullYear(),
                nextDelivery.getMonth(),
                nextDelivery.getDate()
              );

              const daysDiff = Math.floor(
                (nextDeliveryNormalized - startDateNormalized) /
                  (1000 * 60 * 60 * 24)
              );
              deliveryDay = Math.max(1, daysDiff + 1);
              console.log(
                "📅 HomeScreen Virtual Order Delivery Day Calculation:",
                {
                  subscriptionId: subscription._id?.slice(-8),
                  startDate: subscription.startDate,
                  nextDelivery: subscription.nextDelivery,
                  daysDiff,
                  calculatedDeliveryDay: deliveryDay,
                }
              );
            } else if (subscription.startDate) {
              const startDate = new Date(subscription.startDate);
              const currentDate = new Date();

              // Normalize dates to midnight to avoid time-of-day issues
              const startDateNormalized = new Date(
                startDate.getFullYear(),
                startDate.getMonth(),
                startDate.getDate()
              );
              const currentDateNormalized = new Date(
                currentDate.getFullYear(),
                currentDate.getMonth(),
                currentDate.getDate()
              );

              const daysDiff = Math.floor(
                (currentDateNormalized - startDateNormalized) /
                  (1000 * 60 * 60 * 24)
              );
              deliveryDay = Math.max(1, daysDiff + 1);
              console.log(
                "📅 HomeScreen Virtual Order Delivery Day Calculation (current date):",
                {
                  subscriptionId: subscription._id?.slice(-8),
                  startDate: subscription.startDate,
                  currentDate: currentDate.toISOString(),
                  startDateNormalized: startDateNormalized.toISOString(),
                  currentDateNormalized: currentDateNormalized.toISOString(),
                  daysDiff,
                  calculatedDeliveryDay: deliveryDay,
                }
              );
            } else {
              console.log(
                "📅 HomeScreen Virtual Order - No date info, defaulting to Day 1:",
                {
                  subscriptionId: subscription._id?.slice(-8),
                  hasStartDate: !!subscription.startDate,
                  hasNextDelivery: !!subscription.nextDelivery,
                }
              );
            }

            return {
              _id: `sub_${subscription._id}`,
              orderNumber:
                subscription.subscriptionId ||
                `SUB${subscription._id?.slice(-8)}`,
              status: "preparing", // Default status for active subscriptions
              mealPlan: subscription.mealPlanId || {
                name: "Subscription Meal Plan",
              },
              totalAmount: subscription.totalPrice || subscription.price,
              createdAt: subscription.startDate || subscription.createdAt,
              estimatedDelivery: subscription.nextDelivery,
              deliveryAddress:
                subscription.deliveryAddress || "Your delivery address",
              paymentMethod:
                subscription.paymentMethod || "Subscription payment",
              instructions: "Subscription delivery",
              quantity: 1,
              isSubscriptionOrder: true,
              subscription: subscription, // Include the full subscription data
              deliveryDay: deliveryDay, // Add the calculated delivery day
              dayNumber: deliveryDay, // Also add as dayNumber for fallback
            };
          }
        );

        allActiveOrders = [...allActiveOrders, ...subscriptionOrders];
      }

      console.log("🚚 Active orders found:", allActiveOrders.length);
      setActiveOrders(allActiveOrders);
    } catch (error) {
      console.error("Error loading active orders:", error);
      setActiveOrders([]);
    } finally {
      setOrdersLoading(false);
    }
  };

  // Track impression when banner is displayed
  const [trackedImpressions, setTrackedImpressions] = useState(new Set());

  useEffect(() => {
    if (banners && banners.length > 0 && banners[currentBannerIndex]) {
      const banner = banners[currentBannerIndex];
      if (banner._id && !trackedImpressions.has(banner._id)) {
        // Track impression only once per session per banner
        apiService
          .trackBannerImpression(banner._id)
          .then(() => {
            setTrackedImpressions((prev) => new Set([...prev, banner._id]));
          })
          .catch((err) => {
            console.log("Failed to track banner impression:", err);
          });
      }
    }
  }, [currentBannerIndex, banners, trackedImpressions]);

  // Auto-slide effect for banner
  useEffect(() => {
    if (!banners || banners.length <= 1) return;

    const bannerInterval = setInterval(() => {
      setCurrentBannerIndex((prevIndex) => {
        const nextIndex = (prevIndex + 1) % banners.length;
        bannerScrollRef.current?.scrollTo({
          x: nextIndex * width,
          animated: true,
        });
        return nextIndex;
      });
    }, 6000);

    return () => clearInterval(bannerInterval);
  }, [banners?.length]);

  // Auto-slide effect for popular meal plans - DISABLED
  // useEffect(() => {
  //   if (!filteredMealPlans || filteredMealPlans.length <= 1) return;

  //   const popularInterval = setInterval(() => {
  //     setCurrentPopularIndex((prevIndex) => {
  //       const nextIndex = (prevIndex + 1) % filteredMealPlans.length;
  //       const cardWidth = width * 0.75; // Same as popularPlanCard width
  //       const cardMargin = 20; // Same as marginRight in popularPlanCard
  //       const scrollPosition = nextIndex * (cardWidth + cardMargin);

  //       popularScrollRef.current?.scrollTo({
  //         x: scrollPosition,
  //         animated: true,
  //       });
  //       return nextIndex;
  //     });
  //   }, 4000); // 4 seconds per slide (faster than banners)

  //   return () => clearInterval(popularInterval);
  // }, [filteredMealPlans?.length]);

  // Helper function to calculate delivery day
  const getDeliveryDay = (order) => {
    // Try multiple possible data sources for delivery day
    if (order?.deliveryDay) {
      return parseInt(order.deliveryDay);
    }

    if (order?.dayNumber) {
      return parseInt(order.dayNumber);
    }

    // If we have subscription and delivery date info, calculate from that
    if (order?.subscription?.startDate && order?.deliveryDate) {
      const startDate = new Date(order.subscription.startDate);
      const deliveryDate = new Date(order.deliveryDate);

      // Normalize dates to midnight to avoid time-of-day issues
      const startDateNormalized = new Date(
        startDate.getFullYear(),
        startDate.getMonth(),
        startDate.getDate()
      );
      const deliveryDateNormalized = new Date(
        deliveryDate.getFullYear(),
        deliveryDate.getMonth(),
        deliveryDate.getDate()
      );

      const daysDiff = Math.floor(
        (deliveryDateNormalized - startDateNormalized) / (1000 * 60 * 60 * 24)
      );
      return Math.max(1, daysDiff + 1);
    }

    // Fallback to current date calculation if subscription start date exists
    if (order?.subscription?.startDate) {
      const startDate = new Date(order.subscription.startDate);
      const currentDate = new Date();

      // Normalize dates to midnight to avoid time-of-day issues
      const startDateNormalized = new Date(
        startDate.getFullYear(),
        startDate.getMonth(),
        startDate.getDate()
      );
      const currentDateNormalized = new Date(
        currentDate.getFullYear(),
        currentDate.getMonth(),
        currentDate.getDate()
      );

      const daysDiff = Math.floor(
        (currentDateNormalized - startDateNormalized) / (1000 * 60 * 60 * 24)
      );
      return Math.max(1, daysDiff + 1);
    }

    // Default to day 1 if no information is available
    return 1;
  };

  // Helper function to determine if order is a subscription order (any day)
  const isSubscriptionOrder = (order) => {
    return !!(
      order?.subscription ||
      order?.recurringOrder ||
      order?.isSubscriptionOrder ||
      order?.orderItems?.type === "subscription_pickup"
    );
  };

  // Helper function to determine if this is the first delivery of a subscription
  const isFirstDelivery = (order) => {
    return (
      order.recurringOrder?.isActivationOrder === true ||
      order.recurringOrder?.orderType === "one-time" ||
      (order.deliveryDay && parseInt(order.deliveryDay) === 1) ||
      (order.dayNumber && parseInt(order.dayNumber) === 1)
    );
  };

  // Helper function to determine if order should use RecurringDeliveryCard
  const isRecurringDelivery = (order) => {
    const isSubscription = isSubscriptionOrder(order);
    const isFirst = isFirstDelivery(order);

    // Use RecurringDeliveryCard for subscription orders EXCEPT the first delivery
    return isSubscription && !isFirst;
  };

  // Render active orders with appropriate card
  const renderActiveOrder = (order) => {
    const isSubscription = isSubscriptionOrder(order);
    const isFirst = isFirstDelivery(order);
    const isRecurring = isRecurringDelivery(order);
    const deliveryDay = getDeliveryDay(order);

    // Enhanced debug logging to understand the actual order data structure
    // console.log("📋 HomeScreen Order FULL DEBUG:", {
    //   orderId: order._id?.slice(-8) || order.id?.slice(-8),
    //   // Current calculated values
    //   isSubscription,
    //   isFirst,
    //   deliveryDay,
    //   isRecurring,
    //   cardType: isRecurring ? "RecurringDeliveryCard" : "CompactOrderCard",
    //   // Raw order data inspection
    //   orderKeys: Object.keys(order || {}),
    //   deliveryDay_raw: order?.deliveryDay,
    //   dayNumber_raw: order?.dayNumber,
    //   subscription_raw: order?.subscription,
    //   recurringOrder_raw: order?.recurringOrder,
    //   isActivationOrder: order.recurringOrder?.isActivationOrder,
    //   orderType: order.recurringOrder?.orderType,
    //   isSubscriptionOrder_raw: order?.isSubscriptionOrder,
    //   orderItems_type: order?.orderItems?.type,
    //   orderItems_keys: order?.orderItems ? Object.keys(order.orderItems) : null,
    //   // Status information
    //   orderStatus: order?.orderStatus,
    //   status: order?.status,
    //   // Dates
    //   createdAt: order?.createdAt,
    //   deliveryDate: order?.deliveryDate,
    //   subscription_startDate: order?.subscription?.startDate,
    // });

    // Use dedicated RecurringDeliveryCard ONLY for Day 2+ recurring deliveries
    if (isRecurring) {
      return (
        <RecurringDeliveryCard
          key={order._id || order.id}
          order={order}
          onContactSupport={() => navigation.navigate("HelpCenter")}
          onTrackDriver={(driver, orderData) => {
            // Navigate to enhanced tracking screen
            console.log("Track driver:", driver);
            navigation.navigate("EnhancedTracking", {
              orderId: order._id || order.id,
              order: orderData || order,
            });
          }}
          style={styles(colors).orderCard}
        />
      );
    }

    // Use compact card for one-time orders and Day 1 first deliveries
    return (
      <CompactOrderCard
        key={order._id || order.id}
        order={order}
        onContactSupport={() => navigation.navigate("HelpCenter")}
        onReorder={async (order) => {
          // Handle reorder logic - improved to handle missing meal plans
          try {
            console.log("🔄 Reordering:", JSON.stringify(order, null, 2));

            // Try to get the meal plan ID from various sources
            const mealPlanId =
              order?.mealPlan?._id ||
              order?.mealPlan?.id ||
              order?.mealPlan?.planId ||
              order?.subscription?.mealPlanId?._id ||
              order?.subscription?.mealPlanId;

            if (!mealPlanId) {
              console.warn(
                "⚠️ No meal plan ID found for reorder, navigating to search"
              );
              navigation.navigate("Search");
              return;
            }

            // Check if we have a complete meal plan object or just an ID
            if (order?.mealPlan?.planName || order?.mealPlan?.name) {
              // We have meal plan data, use it directly
              navigation.navigate("MealPlanDetail", {
                bundle: {
                  ...order.mealPlan,
                  id: mealPlanId,
                  planId: order.mealPlan.planId || mealPlanId,
                },
              });
            } else {
              // We only have an ID, fetch the meal plan first
              console.log(`🔍 Fetching meal plan for reorder: ${mealPlanId}`);
              const mealPlanResult =
                await apiService.getMealPlanById(mealPlanId);

              if (mealPlanResult.success && mealPlanResult.data) {
                navigation.navigate("MealPlanDetail", {
                  bundle: {
                    ...mealPlanResult.data,
                    id: mealPlanResult.data._id || mealPlanId,
                    planId: mealPlanResult.data.planId || mealPlanId,
                  },
                });
              } else {
                console.warn(
                  "⚠️ Meal plan not found for reorder, navigating to search"
                );
                showError(
                  "Meal Plan Not Available",
                  "This meal plan is no longer available. Please browse our current selection."
                );
                navigation.navigate("Search");
              }
            }
          } catch (error) {
            console.error("❌ Error in reorder:", error);
            showError(
              "Reorder Failed",
              "Unable to reorder this meal. Please browse our current selection."
            );
            navigation.navigate("Search");
          }
        }}
        onCancelOrder={(orderId) => {
          // Handle order cancellation
          console.log("Cancel order requested:", orderId);
        }}
        onRateOrder={(order) => {
          // Handle order rating
          navigation.navigate("OrderDetail", {
            orderId: order._id,
          });
        }}
        onTrackDriver={(driver, orderData) => {
          // Navigate to enhanced tracking screen
          console.log("Track driver:", driver);
          navigation.navigate("EnhancedTracking", {
            orderId: order._id || order.id,
            order: orderData || order,
          });
        }}
        style={styles(colors).orderCard}
      />
    );
  };

  // Subscription-focused UI components
  const renderActiveOrdersSection = () => {
    if (!activeOrders.length) return null;

    return (
      <View style={styles(colors).activeOrdersSection}>
        <Text variant="h2" style={styles(colors).sectionTitle}>
          Active Orders
        </Text>
        {activeOrders.map((order) => renderActiveOrder(order))}
      </View>
    );
  };

  const renderSubscriptionCards = () => {
    if (!activeSubscriptions.length) return null;

    return (
      <View style={styles(colors).subscriptionsSection}>
        <View style={styles(colors).sectionHeader}>
          <Text style={styles(colors).sectionTitle}>
            My Active Subscriptions
          </Text>
          {activeSubscriptions.length === 1 && (
            <TouchableOpacity
              onPress={() => handleShowMealTimeline(activeSubscriptions[0])}
              style={styles(colors).timelineButton}
            >
              <Text style={styles(colors).timelineButtonText}>Timeline</Text>
              <CustomIcon
                name="calendar-filled"
                size={16}
                color={COLORS.primary}
              />
            </TouchableOpacity>
          )}
        </View>

        {activeSubscriptions
          .filter((subscription) => subscription && subscription._id)
          .map((subscription, index) => (
            <SubscriptionCard
              key={subscription._id}
              subscription={subscription}
              onPress={() => handleSubscriptionPress(subscription)}
              onMenuPress={() => handleSubscriptionMenuPress(subscription)}
            />
          ))}
      </View>
    );
  };

  // Legacy render function for backward compatibility
  const renderLegacySubscriptionCards = () => {
    if (!activeSubscriptions.length) return null;

    if (activeSubscriptions.length === 1) {
      // Single subscription - show detailed card
      return renderSubscriptionStatus(activeSubscriptions[0]);
    }

    // Multiple subscriptions - show card list
    return (
      <View style={styles(colors).subscriptionsSection}>
        <Text variant="h2" style={styles(colors).sectionTitle}>
          Your Meal Plans
        </Text>
        {activeSubscriptions.map((subscription, index) => (
          <TouchableOpacity
            key={subscription._id}
            style={styles(colors).subscriptionListCard}
            onPress={() =>
              navigation.navigate("SubscriptionTracking", {
                subscriptionId: subscription._id,
                subscription,
              })
            }
            activeOpacity={0.8}
          >
            <View style={styles(colors).subscriptionCardContent}>
              <View style={styles(colors).subscriptionCardImage}>
                <Image
                  source={{
                    uri:
                      subscription.mealPlanId?.planImageUrl ||
                      subscription.mealPlanId?.image,
                  }}
                  style={styles(colors).subscriptionCardImageStyle}
                  defaultSource={require("../../assets/images/meal-plans/fitfuel.jpg")}
                />
              </View>

              <View style={styles(colors).subscriptionCardDetails}>
                <Text
                  style={styles(colors).subscriptionCardTitle}
                  numberOfLines={1}
                >
                  {subscription.mealPlanId?.planName ||
                    subscription.mealPlanId?.name ||
                    "Meal Plan"}
                </Text>

                <Text style={styles(colors).subscriptionCardSubtitle}>
                  {(() => {
                    const endDate = new Date(subscription.endDate);
                    const currentDate = new Date();
                    const daysRemaining = Math.max(
                      0,
                      Math.ceil((endDate - currentDate) / (1000 * 60 * 60 * 24))
                    );
                    return daysRemaining > 0
                      ? `${daysRemaining} days remaining`
                      : "Plan completed";
                  })()}
                </Text>

                <View style={styles(colors).subscriptionCardMeta}>
                  <View
                    style={[
                      styles(colors).subscriptionStatusBadge,
                      {
                        backgroundColor:
                          subscription.status === "active"
                            ? colors.success + "20"
                            : colors.warning + "20",
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles(colors).subscriptionStatusText,
                        {
                          color:
                            subscription.status === "active"
                              ? colors.success
                              : colors.warning,
                        },
                      ]}
                    >
                      {(subscription.status || "pending")
                        .charAt(0)
                        .toUpperCase() +
                        (subscription.status || "pending").slice(1)}
                    </Text>
                  </View>

                  <Text style={styles(colors).subscriptionCardPrice}>
                    ₦
                    {(
                      subscription.totalPrice ||
                      subscription.price ||
                      0
                    ).toLocaleString()}
                  </Text>
                </View>
              </View>

              <CustomIcon
                name="chevron-forward"
                size={20}
                color={colors.textMuted}
                style={styles(colors).subscriptionCardChevron}
              />
            </View>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  const renderAggregateStats = () => {
    if (!activeSubscriptions.length) return null;

    // Calculate aggregate stats from all subscriptions
    const aggregateStats = activeSubscriptions.reduce(
      (acc, subscription) => {
        const metrics = subscription.metrics || {};
        return {
          totalMealsDelivered:
            acc.totalMealsDelivered + (metrics.totalMealsDelivered || 0),
          totalSpent:
            acc.totalSpent +
            (metrics.totalSpent ||
              subscription.totalPrice ||
              subscription.price ||
              0),
          maxConsecutiveDays: Math.max(
            acc.maxConsecutiveDays,
            metrics.consecutiveDays || 0
          ),
        };
      },
      { totalMealsDelivered: 0, totalSpent: 0, maxConsecutiveDays: 0 }
    );

    const formatNumber = (num) => {
      if (typeof num !== "number") {
        num = Number(num) || 0;
      }
      if (num >= 1000000) {
        return `${(num / 1000000).toFixed(1)}M`;
      } else if (num >= 1000) {
        return `${(num / 1000).toFixed(1)}K`;
      }
      return num.toLocaleString("en-NG", {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      });
    };
    return (
      <View style={styles(colors).quickStatsSection}>
        <Text variant="h2" style={styles(colors).sectionTitle}>
          Your Progress
        </Text>
        <View style={styles(colors).statsGrid}>
          <View style={styles(colors).statCard}>
            <Text variant="h3" style={styles(colors).statNumber}>
              {aggregateStats.totalMealsDelivered}
            </Text>
            <Text variant="caption" style={styles(colors).statLabel}>
              Meals Delivered
            </Text>
          </View>
          <View style={styles(colors).statCard}>
            <Text variant="h3" style={styles(colors).statNumber}>
              ₦{formatNumber(aggregateStats.totalSpent)}
            </Text>
            <Text variant="caption" style={styles(colors).statLabel}>
              Total Spent
            </Text>
          </View>
          <View style={styles(colors).statCard}>
            <Text variant="h3" style={styles(colors).statNumber}>
              {aggregateStats.maxConsecutiveDays}
            </Text>
            <Text variant="caption" style={styles(colors).statLabel}>
              Best Streak
            </Text>
          </View>
        </View>
      </View>
    );
  };

  const renderTodaysMeals = () => {
    try {
      // Use the first active subscription for My Today's Meals
      const primarySubscription = activeSubscriptions[0];
      if (!primarySubscription?.mealPlanId) {
        console.log("⚠️ No primary subscription or mealPlanId found");
        return null;
      }

      // Additional safety check to ensure mealPlanId has the required properties
      if (!primarySubscription.mealPlanId?.weeklyMeals) {
        console.log("⚠️ No weeklyMeals data found in mealPlanId");
        return null;
      }
      // Calculate subscription day using same logic as RecurringDeliveryCard
      const getSubscriptionDay = () => {
        // If subscription is not yet activated (first delivery not completed), always show Day 1
        if (
          !primarySubscription.activationDeliveryCompleted ||
          !primarySubscription.isActivated
        ) {
          console.log("🔄 Subscription not yet activated - showing Day 1");
          return 1;
        }

        // If subscription has nextDelivery date, calculate based on that
        if (primarySubscription.nextDelivery && primarySubscription.startDate) {
          const startDate = new Date(primarySubscription.startDate);
          const nextDelivery = new Date(primarySubscription.nextDelivery);

          // Normalize dates to avoid timezone issues
          const startDateNormalized = new Date(
            startDate.getFullYear(),
            startDate.getMonth(),
            startDate.getDate()
          );
          const nextDeliveryNormalized = new Date(
            nextDelivery.getFullYear(),
            nextDelivery.getMonth(),
            nextDelivery.getDate()
          );

          const daysDiff = Math.floor(
            (nextDeliveryNormalized - startDateNormalized) /
              (1000 * 60 * 60 * 24)
          );
          return Math.max(1, daysDiff + 1);
        }

        // Fallback to current date calculation if nextDelivery not available
        if (primarySubscription.startDate) {
          const startDate = new Date(primarySubscription.startDate);
          const currentDate = new Date();

          // Normalize dates to avoid timezone issues
          const startDateNormalized = new Date(
            startDate.getFullYear(),
            startDate.getMonth(),
            startDate.getDate()
          );
          const currentDateNormalized = new Date(
            currentDate.getFullYear(),
            currentDate.getMonth(),
            currentDate.getDate()
          );

          const daysDiff = Math.floor(
            (currentDateNormalized - startDateNormalized) /
              (1000 * 60 * 60 * 24)
          );
          return Math.max(1, daysDiff + 1);
        }

        // Default to day 1 if no dates available
        return 1;
      };

      const subscriptionDay = getSubscriptionDay();

      // Map subscription day to week and day
      // Day 1-7 = Week 1, Day 8-14 = Week 2, etc.
      const weekNumber = Math.ceil(subscriptionDay / 7);
      const dayInWeek = ((subscriptionDay - 1) % 7) + 1; // 1-7

      // Handle cycling through weeks (after 4 weeks, start over)
      const currentWeekNumber = ((weekNumber - 1) % 4) + 1; // 1-4

      // Map subscription day to calendar day names (as used in database)
      const dayNames = [
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday",
        "Sunday",
      ];
      const dayName = dayNames[dayInWeek - 1]; // dayInWeek is 1-7, array is 0-6

      // Get My Today's Meals from the subscription's meal plan
      const weeklyMeals = primarySubscription.mealPlanId?.weeklyMeals || {};
      const currentWeek = weeklyMeals[`week${currentWeekNumber}`] || {};
      const todaysMealsData = currentWeek[dayName] || {};

      // Helper function to get specific meal assignment from weeklyMeals structure
      const getMealAssignment = (mealType) => {
        // Look in the organized weekly schedule for the assignment
        const assignment = todaysMealsData[mealType.toLowerCase()];
        return assignment;
      };

      // Helper function to get specific meal image from assignment data
      const getMealImage = (mealType) => {
        const assignment = getMealAssignment(mealType);

        // Use the assignment's imageUrl if available
        if (assignment?.imageUrl) {
          return { uri: assignment.imageUrl };
        }

        // Fallback to meal plan image if specific meal image not found
        const mealPlan = primarySubscription.mealPlanId;
        if (mealPlan?.planImageUrl || mealPlan?.image || mealPlan?.coverImage) {
          const fallbackImage =
            mealPlan.planImageUrl || mealPlan.image || mealPlan.coverImage;
          console.log(
            `⚠️ HomeScreen - Using fallback meal plan image for ${mealType}:`,
            fallbackImage
          );
          return { uri: fallbackImage };
        }

        console.log(
          `❌ HomeScreen - No image found for ${mealType}, using default`
        );
        return require("../../assets/images/meal-plans/fitfuel.jpg");
      };

      // Helper function to get meal name from assignment data
      const getMealName = (mealType) => {
        const assignment = getMealAssignment(mealType);

        // Use the assignment's custom title if available
        if (assignment?.title) {
          return assignment.title;
        }

        // If assignment exists but no title, it means meal is scheduled but no custom name
        if (assignment) {
          const capitalizedMealType =
            mealType.charAt(0).toUpperCase() + mealType.slice(1);
          console.log(
            `⚠️ HomeScreen - Assignment exists but no title for ${mealType}, using default`
          );
          return `${capitalizedMealType} meal`;
        }

        console.log(`❌ HomeScreen - No assignment found for ${mealType}`);
        return null;
      };

      // Helper function to get meal calories from assignment data
      const getMealCalories = (mealType) => {
        const assignment = getMealAssignment(mealType);

        // Try to get calories from assignment
        if (assignment?.calories) {
          return assignment.calories;
        }

        // If assignment has meals info, try to calculate calories
        if (assignment?.meals && typeof assignment.meals === "object") {
          // This would need to be implemented based on your meal structure
          // For now, return null since we don't have direct calorie data
        }

        return null;
      };

      const todaysMeals = {
        breakfast: {
          name: getMealName("breakfast"),
          image: getMealImage("breakfast"),
          calories: getMealCalories("breakfast"),
          time: "8:00 AM",
        },
        lunch: {
          name: getMealName("lunch"),
          image: getMealImage("lunch"),
          calories: getMealCalories("lunch"),
          time: "1:00 PM",
        },
        dinner: {
          name: getMealName("dinner"),
          image: getMealImage("dinner"),
          calories: getMealCalories("dinner"),
          time: "7:00 PM",
        },
      };

      // Filter out meals that don't have actual assignment data (no template fallbacks)
      const availableMeals = Object.entries(todaysMeals).filter(
        ([mealType, meal]) => {
          const assignment = getMealAssignment(mealType);
          // Only include meals that have actual assignment data
          return assignment && meal.name;
        }
      );

      // If no meals are available for today, show a message
      if (availableMeals.length === 0) {
        return (
          <View style={styles(colors).todaysMealsSection}>
            <Text style={styles(colors).sectionTitle}>
              My Today's Meals - Day {subscriptionDay}
            </Text>
            <View style={styles(colors).noMealsContainer}>
              <CustomIcon
                name="restaurant-outline"
                size={48}
                color={colors.textMuted}
              />
              <Text style={styles(colors).noMealsTitle}>
                No meals scheduled for today
              </Text>
              <Text style={styles(colors).noMealsText}>
                Week {currentWeekNumber}, {dayName} meals are not available in
                your meal plan. Please contact support.
              </Text>
              <TouchableOpacity
                style={styles(colors).contactSupportButton}
                onPress={() => setShowBrowseMode(true)}
              >
                <Text style={styles(colors).contactSupportText}>
                  Browse Meal Plans
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        );
      }

      // Calculate delivery status based on real subscription data
      const today = new Date();
      const nextDelivery = new Date(primarySubscription.nextDelivery);
      const isToday = nextDelivery.toDateString() === today.toDateString();
      const deliveryTime = nextDelivery.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      });

      let deliveryStatus = "";
      if (isToday) {
        deliveryStatus = `🚚 Preparing your meals • Estimated delivery: ${deliveryTime}`;
      } else {
        const deliveryDate = nextDelivery.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        });
        deliveryStatus = `📅 Next delivery: ${deliveryDate} at ${deliveryTime}`;
      }

      return (
        <View style={styles(colors).todaysMealsSection}>
          <Text style={styles(colors).sectionTitle}>
            My Today's Meals - Day {subscriptionDay}
          </Text>
          <Text style={styles(colors).deliveryStatus}>{deliveryStatus}</Text>

          {/* Dynamic layout: ScrollView for multiple meals, full width for single meal */}
          {availableMeals.length === 1 ? (
            // Single meal - full width card
            <View style={styles(colors).singleMealContainer}>
              {availableMeals.map(([mealType, meal]) => (
                <TouchableOpacity
                  key={mealType}
                  style={styles(colors).fullWidthMealCard}
                >
                  <View style={styles(colors).todayMealImageContainer}>
                    <Image
                      source={meal.image}
                      style={styles(colors).todayMealImage}
                    />
                    <LinearGradient
                      colors={["rgba(0, 0, 0, 0)", "rgba(0, 0, 0, 0.7)"]}
                      style={styles(colors).todayMealOverlay}
                    >
                      <View style={styles(colors).mealTimeContainer}>
                        <Text style={styles(colors).mealTime}>{meal.time}</Text>
                      </View>
                      <Text style={styles(colors).mealType}>
                        {(mealType || "").charAt(0).toUpperCase() +
                          (mealType || "").slice(1)}
                      </Text>
                      <Text
                        style={styles(colors).todayMealName}
                        numberOfLines={2}
                      >
                        {meal.name}
                      </Text>
                      {/* <Text style={styles(colors).mealCalories}>
                        {meal.calories} cal
                      </Text> */}
                    </LinearGradient>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            // Multiple meals - horizontal scroll
            <ScrollView
              ref={mealsScrollRef}
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles(colors).mealsScroll}
              scrollEventThrottle={16}
              decelerationRate="fast"
              snapToInterval={215} // Card width (200) + margin (15) for snapping
              snapToAlignment="start"
              onMomentumScrollEnd={(event) => {
                const cardWidth = 200;
                const cardMargin = 15;
                const slideIndex = Math.round(
                  event.nativeEvent.contentOffset.x / (cardWidth + cardMargin)
                );
                // Optional: You can track the current meal index if needed
                // setCurrentMealIndex(slideIndex);
              }}
            >
              {availableMeals.map(([mealType, meal]) => (
                <TouchableOpacity
                  key={mealType}
                  style={styles(colors).todayMealCard}
                >
                  <View style={styles(colors).todayMealImageContainer}>
                    <Image
                      source={meal.image}
                      style={styles(colors).todayMealImage}
                    />
                    <LinearGradient
                      colors={["rgba(0, 0, 0, 0)", "rgba(0, 0, 0, 0.7)"]}
                      style={styles(colors).todayMealOverlay}
                    >
                      <View style={styles(colors).mealTimeContainer}>
                        <Text style={styles(colors).mealTime}>{meal.time}</Text>
                      </View>
                      <Text style={styles(colors).mealType}>
                        {(mealType || "").charAt(0).toUpperCase() +
                          (mealType || "").slice(1)}
                      </Text>
                      <Text
                        style={styles(colors).todayMealName}
                        numberOfLines={2}
                      >
                        {meal.name}
                      </Text>
                      {/* <Text style={styles(colors).mealCalories}>
                        {meal.calories} cal
                      </Text> */}
                    </LinearGradient>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
        </View>
      );
    } catch (error) {
      console.error("❌ Error in renderTodaysMeals:", error);
      return null;
    }
  };

  const renderSubscriptionStatus = (subscription = null) => {
    const targetSubscription = subscription || activeSubscriptions[0];
    if (!targetSubscription) return null;

    // Calculate real days remaining and progress
    const startDate = new Date(targetSubscription.startDate);
    const endDate = new Date(targetSubscription.endDate);
    const currentDate = new Date();

    const totalDuration = Math.ceil(
      (endDate - startDate) / (1000 * 60 * 60 * 24)
    );
    const daysElapsed = Math.ceil(
      (currentDate - startDate) / (1000 * 60 * 60 * 24)
    );
    const daysRemaining = Math.max(
      0,
      Math.ceil((endDate - currentDate) / (1000 * 60 * 60 * 24))
    );

    const progressPercentage =
      totalDuration > 0
        ? Math.min(100, Math.max(0, (daysElapsed / totalDuration) * 100))
        : 0;

    return (
      <View style={styles(colors).subscriptionSection}>
        <View style={styles(colors).subscriptionCard}>
          <LinearGradient
            colors={[colors.primary, "#FFB347"]}
            style={styles(colors).subscriptionGradient}
          >
            <View style={styles(colors).subscriptionHeader}>
              <View>
                <Text style={styles(colors).subscriptionPlanName}>
                  {targetSubscription.mealPlanId?.planName || "Your Meal Plan"}
                </Text>
                <Text style={styles(colors).subscriptionDuration}>
                  {daysRemaining > 0
                    ? `${daysRemaining} days remaining`
                    : "Plan completed"}
                </Text>
              </View>
              <TouchableOpacity
                style={styles(colors).subscriptionMenuButton}
                onPress={() => setShowSubscriptionMenu(!showSubscriptionMenu)}
                activeOpacity={0.7}
              >
                <CustomIcon
                  name="ellipsis-horizontal"
                  size={20}
                  color={colors.white}
                />
              </TouchableOpacity>
            </View>

            <View style={styles(colors).progressContainer}>
              <View style={styles(colors).progressBar}>
                <View
                  style={[
                    styles(colors).progressFill,
                    { width: `${progressPercentage}%` },
                  ]}
                />
              </View>
              <Text style={styles(colors).progressText}>
                {Math.round(progressPercentage)}% completed
              </Text>
            </View>

            <View style={styles(colors).subscriptionActions}>
              <TouchableOpacity
                style={styles(colors).actionButton}
                onPress={handlePauseSubscription}
                activeOpacity={0.7}
              >
                <CustomIcon name="pause" size={16} color={colors.white} />
                <Text style={styles(colors).actionButtonText}>Pause</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles(colors).actionButton}
                onPress={handleModifySubscription}
                activeOpacity={0.7}
              >
                <CustomIcon name="settings" size={16} color={colors.white} />
                <Text style={styles(colors).actionButtonText}>Modify</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles(colors).actionButton}
                onPress={handleScheduleSubscription}
                activeOpacity={0.7}
              >
                <CustomIcon name="calendar" size={16} color={colors.white} />
                <Text style={styles(colors).actionButtonText}>Schedule</Text>
              </TouchableOpacity>
            </View>
          </LinearGradient>
        </View>

        {/* Subscription Menu Dropdown */}
        {showSubscriptionMenu && (
          <View style={styles(colors).menuDropdown}>
            {menuOptions.map((option, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles(colors).menuOption,
                  option.danger && styles(colors).menuOptionDanger,
                  index === menuOptions.length - 1 &&
                    styles(colors).menuOptionLast,
                ]}
                onPress={option.onPress}
                activeOpacity={0.7}
              >
                <CustomIcon
                  name={option.icon}
                  size={20}
                  color={option.danger ? colors.error : colors.text}
                />
                <View style={styles(colors).menuOptionText}>
                  <Text
                    style={[
                      styles(colors).menuOptionTitle,
                      option.danger && styles(colors).menuOptionTitleDanger,
                    ]}
                  >
                    {option.title}
                  </Text>
                  <Text style={styles(colors).menuOptionSubtitle}>
                    {option.subtitle}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>
    );
  };

  // Pause Modal Component
  const renderPauseModal = () => {
    return (
      <Modal
        visible={showPauseModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowPauseModal(false)}
      >
        <View style={styles(colors).modalOverlay}>
          <View style={styles(colors).pauseModal}>
            <Text style={styles(colors).modalTitle}>Pause Subscription</Text>
            <Text style={styles(colors).modalSubtitle}>
              Tell us why you're pausing and for how long
            </Text>

            {/* Pause Reason */}
            <Text style={styles(colors).inputLabel}>Reason for pausing:</Text>
            <TextInput
              style={styles(colors).textInput}
              placeholder="e.g., Going on vacation, financial reasons..."
              value={pauseReason}
              onChangeText={setPauseReason}
              multiline
              numberOfLines={3}
              placeholderTextColor={colors.textMuted}
            />

            {/* Pause Duration */}
            <Text style={styles(colors).inputLabel}>Pause duration:</Text>
            <View style={styles(colors).durationOptions}>
              {[
                { value: "1_week", label: "1 Week" },
                { value: "2_weeks", label: "2 Weeks" },
                { value: "1_month", label: "1 Month" },
                { value: "2_months", label: "2 Months" },
              ].map((duration) => (
                <TouchableOpacity
                  key={duration.value}
                  style={[
                    styles(colors).durationOption,
                    pauseDuration === duration.value &&
                      styles(colors).durationOptionSelected,
                  ]}
                  onPress={() => setPauseDuration(duration.value)}
                >
                  <Text
                    style={[
                      styles(colors).durationOptionText,
                      pauseDuration === duration.value &&
                        styles(colors).durationOptionTextSelected,
                    ]}
                  >
                    {duration.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Action Buttons */}
            <View style={styles(colors).modalActions}>
              <TouchableOpacity
                style={[
                  styles(colors).modalButton,
                  styles(colors).modalButtonSecondary,
                ]}
                onPress={() => setShowPauseModal(false)}
              >
                <Text style={styles(colors).modalButtonTextSecondary}>
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles(colors).modalButton,
                  styles(colors).modalButtonPrimary,
                  !pauseReason && styles(colors).modalButtonDisabled,
                ]}
                onPress={confirmPauseSubscription}
                disabled={!pauseReason}
              >
                <Text style={styles(colors).modalButtonTextPrimary}>
                  Pause Subscription
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    );
  };

  const renderCategoryTab = (category) => (
    <TouchableOpacity
      key={category.id}
      style={[
        styles(colors).categoryTab,
        selectedCategory === category.id && styles(colors).categoryTabActive,
      ]}
      onPress={() => setSelectedCategory(category.id)}
      activeOpacity={0.7}
    >
      <Text
        style={[
          styles(colors).categoryText,
          selectedCategory === category.id && styles(colors).categoryTextActive,
        ]}
      >
        {category.label}
      </Text>
    </TouchableOpacity>
  );

  const renderPopularFoodCard = (plan, index) => {
    const imageSource = plan.image
      ? typeof plan.image === "string"
        ? { uri: plan.image }
        : plan.image
      : require("../../assets/images/meal-plans/fitfuel.jpg");

    return (
      <TouchableOpacity
        key={plan.id || plan._id}
        style={styles(colors).popularPlanCard}
        onPress={() => navigation.navigate("MealPlanDetail", { bundle: plan })}
        activeOpacity={0.8}
      >
        <View style={styles(colors).popularCardImageContainer}>
          <Image
            source={imageSource}
            style={styles(colors).popularCardImage}
            defaultSource={require("../../assets/images/meal-plans/fitfuel.jpg")}
          />
          {/* Discount Pill */}
          {(() => {
            const planDiscount = discountData[plan.id || plan._id];
            const hasDiscount =
              planDiscount && planDiscount.discountPercent > 0;
            return hasDiscount ? (
              <View style={styles(colors).homeDiscountPill}>
                <CustomIcon name="gift" size={14} color="#333" />
                <Text style={styles(colors).homeDiscountPillText}>
                  Up to {planDiscount.discountPercent}% Off
                </Text>
              </View>
            ) : null;
          })()}
        </View>

        {/* Content Overlay with Gradient */}
        <LinearGradient
          colors={["rgba(0, 0, 0, 0)", "rgba(0, 0, 0, 0)", "rgba(0, 0, 0, 1)"]}
          locations={[0, 0.6, 1]} // Example: stays fully transparent up to 60% of the gradient's height/width
          style={styles(colors).popularCardContent}
        >
          {/* Heart Button positioned above title */}
          <TouchableOpacity
            style={styles(colors).popularHeartButton}
            onPress={() => toggleBookmark(plan.id || plan._id)}
            activeOpacity={0.7}
          >
            <CustomIcon
              name="heart"
              filled={isBookmarked(plan.id || plan._id)}
              size={20}
              color={
                isBookmarked(plan.id || plan._id) ? colors.error : "#FF9A3F"
              }
            />
          </TouchableOpacity>

          <Text style={styles(colors).popularCardTitle} numberOfLines={1}>
            {plan.name}
          </Text>
          <Text style={styles(colors).popularCardDescription} numberOfLines={2}>
            {getPlanDescription(plan) ||
              "Delicious and nutritious meal plan crafted for your healthy lifestyle"}
          </Text>
          <Text style={styles(colors).popularCardPrice}>
            ₦{plan.price?.toLocaleString()}
          </Text>
        </LinearGradient>
      </TouchableOpacity>
    );
  };

  const renderMealplanCard = (plan, index) => {
    const imageSource = plan.image
      ? typeof plan.image === "string"
        ? { uri: plan.image }
        : plan.image
      : require("../../assets/images/meal-plans/fitfuel.jpg");

    return (
      <TouchableOpacity
        key={plan.id || plan._id}
        style={styles(colors).mealplanCard}
        onPress={() => navigation.navigate("MealPlanDetail", { bundle: plan })}
        activeOpacity={0.8}
      >
        {/* Image Container */}
        <View style={styles(colors).mealplanImageContainer}>
          <Image
            source={imageSource}
            style={styles(colors).mealplanImage}
            defaultSource={require("../../assets/images/meal-plans/fitfuel.jpg")}
          />

          {/* Heart Button positioned on top-right of image */}
          <TouchableOpacity
            style={styles(colors).mealplanHeartButton}
            onPress={() => toggleBookmark(plan.id || plan._id)}
            activeOpacity={0.7}
          >
            <CustomIcon
              name="heart"
              filled={isBookmarked(plan.id || plan._id)}
              size={20}
              color={
                isBookmarked(plan.id || plan._id) ? colors.error : "#FF9A3F"
              }
            />
          </TouchableOpacity>

          {/* New Badge positioned on top-left of image - only show for new meals */}
          {plan.isNew && (
            <View style={styles(colors).newBadge}>
              <Text style={styles(colors).newBadgeText}>New</Text>
            </View>
          )}

          {/* Discount Pill - Bottom Right */}
          {(() => {
            const planDiscount = discountData[plan.id || plan._id];
            const hasDiscount =
              planDiscount && planDiscount.discountPercent > 0;
            return hasDiscount ? (
              <View style={styles(colors).homeDiscountPill}>
                <CustomIcon name="gift" size={14} color="#333" />
                <Text style={styles(colors).homeDiscountPillText}>
                  Up to {planDiscount.discountPercent}% Off
                </Text>
              </View>
            ) : null;
          })()}
        </View>

        {/* Text Content Below Image */}
        <View style={styles(colors).mealplanTextContent}>
          <Text style={styles(colors).mealplanTitle} numberOfLines={1}>
            {plan.name}
          </Text>
          <Text style={styles(colors).mealplanDescription} numberOfLines={2}>
            {getPlanDescription(plan) ||
              "Satisfy your junk food cravings with fast, delicious, and effortless delivery."}
          </Text>
          <Text style={styles(colors).mealplanPrice}>
            ₦{plan.price?.toLocaleString()}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  const renderPromoBanners = () => {
    if (bannersLoading) {
      return (
        <View style={styles(colors).heroBannerContainer}>
          <View
            style={[
              styles(colors).heroBanner,
              { justifyContent: "center", alignItems: "center" },
            ]}
          >
            <ActivityIndicator size="large" color={colors.white} />
            <Text
              style={[
                styles(colors).heroSubtitle,
                { marginTop: 10, textAlign: "center" },
              ]}
            >
              Loading promotions...
            </Text>
          </View>
        </View>
      );
    }

    if (!banners || banners.length === 0) {
      // Hide banner section when no banners are available
      return null;
    }

    // Show dynamic banners
    return (
      <View style={styles(colors).heroBannerContainer}>
        <ScrollView
          ref={bannerScrollRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={(event) => {
            const slideIndex = Math.round(
              event.nativeEvent.contentOffset.x / width
            );
            setCurrentBannerIndex(slideIndex);
          }}
        >
          {banners.map((banner, index) => (
            <TouchableOpacity
              key={banner._id || index}
              style={styles(colors).bannerSlide}
              activeOpacity={0.8}
              onPress={() => handlePromoBannerPress(banner)}
            >
              <View style={styles(colors).promoBannerContainer}>
                {/* Full-size banner image */}
                <Image
                  source={{
                    uri: banner.imageUrl,
                    cache: "default",
                  }}
                  style={styles(colors).promoBannerImage}
                  defaultSource={require("../../assets/images/meal-plans/fitfuel.jpg")}
                  onError={(error) => {
                    console.log(
                      "🖼️ Banner image error:",
                      error.nativeEvent.error
                    );
                  }}
                  resizeMode="cover"
                />

                {/* CTA Button Overlay - Visual only, banner handles the press */}
                {/* <View style={styles(colors).promoBannerCTA}>
                  <Text style={styles(colors).promoBannerCTAText}>
                    {banner.ctaText}
                  </Text>
                  <CustomIcon
                    name="chevron-forward"
                    size={16}
                    color="#000"
                    style={styles(colors).promoBannerCTAIcon}
                  />
                </View> */}
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Banner Indicators */}
        {banners.length > 1 && (
          <View style={styles(colors).bannerIndicators}>
            {banners.map((_, index) => (
              <View
                key={index}
                style={[
                  styles(colors).bannerIndicator,
                  currentBannerIndex === index &&
                    styles(colors).bannerIndicatorActive,
                ]}
              />
            ))}
          </View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles(colors).container}>
      <StatusBar
        barStyle={isDark === true ? "light-content" : "dark-content"}
        backgroundColor={colors.background}
      />

      {/* Header */}
      <View style={styles(colors).header}>
        <TouchableOpacity
          style={styles(colors).locationContainer}
          onPress={() => setShowAddressModal(true)}
          activeOpacity={0.7}
        >
          <CustomIcon name="location-filled" size={16} color={colors.primary} />
          <Text style={styles(colors).locationText} numberOfLines={1}>
            {user?.address || "Set delivery address"}
          </Text>
          <CustomIcon
            name="chevron-down"
            size={14}
            color={colors.textMuted}
            style={styles(colors).chevronIcon}
          />
        </TouchableOpacity>

        <View style={styles(colors).notificationContainer}>
          <NotificationIcon navigation={navigation} />
          {__DEV__ && (
            <>
              <TouchableOpacity
                style={styles(colors).testButton}
                onPress={() => NotificationTestService.sendOrderNotification()}
              >
                <Text style={styles(colors).testButtonText}>Local</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles(colors).testButton,
                  { backgroundColor: colors.warning },
                ]}
                onPress={() =>
                  NotificationTestService.forceRegisterPushTokens()
                }
              >
                <Text style={styles(colors).testButtonText}>Reg</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles(colors).testButton,
                  { backgroundColor: colors.success },
                ]}
                onPress={() =>
                  NotificationTestService.sendTestPushNotification()
                }
              >
                <Text style={styles(colors).testButtonText}>Push</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>

      <ScrollView
        style={styles(colors).scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing || subscriptionLoading}
            onRefresh={() => {
              refreshMealPlans();
              loadBanners(true); // Force refresh banners on pull-to-refresh
              loadActiveSubscriptions();
              loadActiveOrders();
            }}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
      >
        {/* Conditional Content Based on Subscription Status */}
        {(() => {
          // If browse mode is enabled, show regular home screen
          if (showBrowseMode) {
            return (
              <>
                {/* Back to My Plan Button */}
                <View style={styles(colors).backToPlanSection}>
                  <TouchableOpacity
                    style={styles(colors).backToPlanButton}
                    onPress={() => setShowBrowseMode(false)}
                    activeOpacity={0.8}
                  >
                    <CustomIcon
                      name="chevron-back"
                      size={20}
                      color={colors.primary}
                    />
                    <Text style={styles(colors).backToPlanText}>
                      Back to My Plan
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Regular browsing UI */}
                {/* Promo Banners */}
                {renderPromoBanners()}

                {/* Tag Filter Bar */}
                <TagFilterBar
                  onTagSelect={handleTagSelect}
                  selectedTagId={selectedTagId}
                  onApplyFilters={handleApplyFilters}
                />

                {/* Popular Food Section */}
                <View style={styles(colors).section}>
                  <View style={styles(colors).sectionHeader}>
                    <Text style={styles(colors).sectionTitle}>
                      {selectedTag
                        ? `${selectedTag.name} Plans`
                        : "Popular plans"}
                    </Text>
                    <TouchableOpacity
                      onPress={() => navigation.navigate("Search")}
                    ></TouchableOpacity>
                  </View>

                  {/* Loading State */}
                  {loading && !refreshing && (
                    <View style={styles(colors).mealplansGrid}>
                      {[...Array(4)].map((_, index) => (
                        <MealCardSkeleton key={index} />
                      ))}
                    </View>
                  )}

                  {/* Error State */}
                  {error && !loading && (
                    <View style={styles(colors).errorContainer}>
                      <CustomIcon
                        name="alert-circle"
                        size={48}
                        color={colors.error}
                      />
                      <Text style={styles(colors).errorTitle}>
                        Oops! Something went wrong
                      </Text>
                      <Text style={styles(colors).errorText}>{error}</Text>
                      <TouchableOpacity
                        style={styles(colors).retryButton}
                        onPress={refreshMealPlans}
                      >
                        <Text style={styles(colors).retryButtonText}>
                          Try Again
                        </Text>
                      </TouchableOpacity>
                    </View>
                  )}

                  {/* Popular Food Slider */}
                  {!loading && !error && (
                    <View style={styles(colors).popularFoodContainer}>
                      {filteredMealPlans.length > 0 ? (
                        <ScrollView
                          ref={popularScrollRef}
                          horizontal
                          showsHorizontalScrollIndicator={false}
                          contentContainerStyle={
                            styles(colors).popularFoodScrollContent
                          }
                          scrollEventThrottle={16}
                          decelerationRate="fast"
                          snapToInterval={width * 0.75 + 20} // Card width + margin for snapping
                          snapToAlignment="center"
                          disableIntervalMomentum={true}
                          onMomentumScrollEnd={(event) => {
                            const cardWidth = width * 0.75;
                            const cardMargin = 20;
                            const slideIndex = Math.round(
                              event.nativeEvent.contentOffset.x /
                                (cardWidth + cardMargin)
                            );
                            setCurrentPopularIndex(slideIndex);
                          }}
                        >
                          {filteredMealPlans.map((plan, index) =>
                            renderPopularFoodCard(plan, index)
                          )}
                        </ScrollView>
                      ) : (
                        <View style={styles(colors).emptyContainer}>
                          <CustomIcon
                            name="food"
                            size={48}
                            color={colors.textMuted}
                          />
                          <Text style={styles(colors).emptyTitle}>
                            No meal plans found
                          </Text>
                          <Text style={styles(colors).emptyText}>
                            Try selecting a different category or refresh to
                            load plans.
                          </Text>
                        </View>
                      )}
                    </View>
                  )}
                </View>

                {/* Our Mealplans Section */}
                <View style={styles(colors).section}>
                  <Text style={styles(colors).sectionTitle}>Our Mealplans</Text>

                  {!loading && !error && (
                    <View style={styles(colors).mealplansGrid}>
                      {filteredMealPlans
                        .slice(0, 4)
                        .map((plan, index) => renderMealplanCard(plan, index))}
                    </View>
                  )}
                </View>
              </>
            );
          }

          // Calculate subscription progress for use in multiple components
          if (!subscriptionLoading && activeSubscriptions.length > 0) {
            // Show subscription-focused UI when user has active subscriptions

            return (
              // Subscription-focused UI
              <>
                {/* My Today's Meals Section - only show for single subscription */}
                {activeSubscriptions.length === 1 && renderTodaysMeals()}

                {/* Multiple Subscription Cards Section */}
                {renderSubscriptionCards()}

                {/* Quick Stats - aggregate from all subscriptions */}
                {renderAggregateStats()}

                {/* Active Orders Tracking */}
                {renderActiveOrdersSection()}

                {/* Browse Meal Plans Button */}
                <View style={styles(colors).browseSection}>
                  <TouchableOpacity
                    style={styles(colors).browseMealPlansButton}
                    onPress={() => setShowBrowseMode(true)}
                    activeOpacity={0.8}
                  >
                    <CustomIcon name="food" size={20} color={colors.white} />
                    <Text style={styles(colors).browseMealPlansText}>
                      Browse Meal Plans
                    </Text>
                    <CustomIcon
                      name="chevron-forward"
                      size={16}
                      color={colors.white}
                    />
                  </TouchableOpacity>
                </View>
              </>
            );
          } else {
            return (
              // Regular browsing UI
              <>
                {/* Promo Banners */}
                {renderPromoBanners()}

                {/* Tag Filter Bar */}
                <TagFilterBar
                  onTagSelect={handleTagSelect}
                  selectedTagId={selectedTagId}
                  onApplyFilters={handleApplyFilters}
                />

                {/* Popular Food Section - Conditional visibility */}
                {!selectedTagId && (
                  <View style={styles(colors).section}>
                    <View style={styles(colors).sectionHeader}>
                      <Text style={styles(colors).sectionTitle}>
                        Popular plans
                      </Text>
                      <TouchableOpacity
                        onPress={() => navigation.navigate("Search")}
                      ></TouchableOpacity>
                    </View>

                    {/* Loading State */}
                    {loading && !refreshing && (
                      <View style={styles(colors).loadingContainer}>
                        <ActivityIndicator
                          size="large"
                          color={colors.primary}
                        />
                        <Text style={styles(colors).loadingText}>
                          Loading meal plans...
                        </Text>
                      </View>
                    )}

                    {/* Error State */}
                    {error && !loading && (
                      <View style={styles(colors).errorContainer}>
                        <CustomIcon
                          name="alert-circle"
                          size={48}
                          color={colors.error}
                        />
                        <Text style={styles(colors).errorTitle}>
                          Oops! Something went wrong
                        </Text>
                        <Text style={styles(colors).errorText}>{error}</Text>
                        <TouchableOpacity
                          style={styles(colors).retryButton}
                          onPress={refreshMealPlans}
                        >
                          <Text style={styles(colors).retryButtonText}>
                            Try Again
                          </Text>
                        </TouchableOpacity>
                      </View>
                    )}

                    {/* Popular Food Slider */}
                    {!loading && !error && (
                      <View style={styles(colors).popularFoodContainer}>
                        {filteredMealPlans.length > 0 ? (
                          <ScrollView
                            ref={popularScrollRef}
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={
                              styles(colors).popularFoodScrollContent
                            }
                            scrollEventThrottle={16}
                            decelerationRate="fast"
                            snapToInterval={width * 0.75 + 20} // Card width + margin for snapping
                            snapToAlignment="center"
                            disableIntervalMomentum={true}
                          >
                            {filteredMealPlans.map((plan, index) =>
                              renderPopularFoodCard(plan, index)
                            )}
                          </ScrollView>
                        ) : (
                          <View style={styles(colors).emptyContainer}>
                            <CustomIcon
                              name="food"
                              size={48}
                              color={colors.textMuted}
                            />
                            <Text style={styles(colors).emptyTitle}>
                              No meal plans found
                            </Text>
                            <Text style={styles(colors).emptyText}>
                              Try selecting a different category or refresh to
                              load plans.
                            </Text>
                          </View>
                        )}
                      </View>
                    )}
                  </View>
                )}

                {/* Our Mealplans Section */}
                <View style={styles(colors).section}>
                  <Text style={styles(colors).sectionTitle}>Our Mealplans</Text>

                  {!loading && !error && (
                    <View style={styles(colors).mealplansGrid}>
                      {filteredMealPlans
                        .slice(0, 4)
                        .map((plan, index) => renderMealplanCard(plan, index))}
                    </View>
                  )}
                </View>
              </>
            );
          }
        })()}

        <View style={styles(colors).bottomPadding} />
      </ScrollView>

      {/* Pause Modal */}
      {renderPauseModal()}

      <Tutorial
        steps={homeScreenTutorialSteps}
        isVisible={showTutorial}
        onDismiss={() => setShowTutorial(false)}
      />

      {/* Address Change Modal */}
      <Modal
        visible={showAddressModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowAddressModal(false)}
      >
        <TouchableOpacity
          style={styles(colors).modalOverlay}
          activeOpacity={1}
          onPress={() => setShowAddressModal(false)}
        >
          <TouchableOpacity
            style={styles(colors).modalContent}
            activeOpacity={1}
            onPress={() => {}} // Prevent close when tapping inside modal
          >
            <View style={styles(colors).modalHeader}>
              <Text style={styles(colors).modalTitle}>
                Change Delivery Address
              </Text>
              <TouchableOpacity
                onPress={() => setShowAddressModal(false)}
                style={styles(colors).modalCloseButton}
              >
                <CustomIcon name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <View style={styles(colors).modalBody}>
              <AddressAutocomplete
                placeholder="Search for new delivery address"
                onAddressSelect={handleAddressChange}
                defaultValue={user?.address || ""}
              />
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* Subscription Management Modal */}
      <SubscriptionManagementModal
        visible={showManagementModal}
        onClose={() => {
          setShowManagementModal(false);
          setSelectedSubscription(null);
        }}
        subscription={selectedSubscription}
        onSubscriptionUpdate={handleSubscriptionUpdate}
      />

      {/* Meal Timeline Modal */}
      <Modal
        visible={showMealTimeline}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => {
          setShowMealTimeline(false);
          setSelectedSubscription(null);
        }}
      >
        <View style={{ flex: 1, backgroundColor: "#FFFFFF" }}>
          <View style={styles(colors).modalHeader}>
            <TouchableOpacity
              onPress={() => {
                setShowMealTimeline(false);
                setSelectedSubscription(null);
              }}
              style={styles(colors).modalCloseButton}
            >
              <CustomIcon name="close" size={24} color={COLORS.textPrimary} />
            </TouchableOpacity>
            <Text style={styles(colors).modalHeaderTitle}>Meal Timeline</Text>
            <View style={{ width: 32 }} />
          </View>

          {selectedSubscription && (
            <MealProgressionTimeline
              subscriptionId={selectedSubscription._id}
              onMealPress={handleMealPress}
            />
          )}
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
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 20,
      paddingVertical: 15,
      backgroundColor: colors.background,
    },
    locationContainer: {
      flexDirection: "row",
      alignItems: "center",
      flex: 1,
    },
    locationText: {
      fontSize: 14,
      fontFamily: DMSansFonts.medium,
      color: colors.textSecondary,
      marginLeft: 4,
      fontWeight: "500",
      flex: 1,
    },
    chevronIcon: {
      marginLeft: 4,
    },
    notificationContainer: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "flex-end",
      gap: 8,
    },
    testButton: {
      backgroundColor: colors.primary,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 12,
    },
    testButtonText: {
      color: "#FFFFFF",
      fontSize: 12,
      fontWeight: "600",
    },
    scrollView: {
      flex: 1,
    },
    searchContainer: {
      paddingHorizontal: 20,
      paddingVertical: 15,
    },
    searchInputContainer: {
      flexDirection: "row",
      alignItems: "center",
      // backgroundColor: colors.cardBackground,
      borderRadius: THEME.borderRadius.large,
      paddingHorizontal: 15,
      paddingVertical: 12,
      borderWidth: 1,
      borderColor: colors.border,
    },
    searchIcon: {
      marginRight: 10,
    },
    searchInput: {
      flex: 1,
      fontSize: 16,
      color: colors.text,
    },
    filterButton: {
      padding: 4,
    },
    heroBannerContainer: {
      marginBottom: 20,
      // paddingHorizontal: 20,
    },
    heroBanner: {
      backgroundColor: colors.primary,
      borderRadius: THEME.borderRadius.large,
      overflow: "hidden",
      width: "100%",
      minHeight: 120,
      maxHeight: 130,
    },
    heroContent: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    heroTextSection: {
      flex: 1,
      paddingHorizontal: 20,
      // paddingTop: 5,
    },
    heroTitle: {
      fontSize: 20,
      fontWeight: "bold",
      color: colors.black,
      marginBottom: 8,
    },
    heroSubtitle: {
      fontSize: 14,
      color: "#333",
      marginBottom: 16,
      lineHeight: 20,
    },
    heroButton: {
      backgroundColor: colors.black,
      paddingHorizontal: 15,
      paddingVertical: 7,
      borderRadius: THEME.borderRadius.xxl,
      alignSelf: "flex-start",
      flexDirection: "row",
      alignItems: "center",
    },
    heroButtonText: {
      color: colors.primary,
      fontSize: 10,
      fontWeight: "600",
      marginRight: 4,
    },
    heroButtonIcon: {
      marginLeft: 4,
      color: colors.primary,
    },
    heroImageSection: {
      width: 150,
      height: 130,
      paddingRight: 15,
      // paddingLeft: 5,
      overflow: "hidden",
    },
    heroImage: {
      width: "100%",
      height: "150%",
      borderRadius: THEME.borderRadius.medium,
    },
    categoriesSection: {
      paddingVertical: 15,
    },
    section: {
      paddingHorizontal: 20,
      paddingVertical: 15,
    },
    sectionHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      // marginBottom: 15,
      paddingHorizontal: 20,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: "600",
      fontFamily: DMSansFonts.semiBold,
      marginBottom: 15,
      opacity: 0.7,
      color: colors.text,
    },
    // sectionTitleTodaytext: {
    //   fontSize: 18,
    //   fontWeight: "600",
    //   marginBottom: 15,
    //   opacity: 0.7,
    //   color: colors.text,
    // },
    seeAllText: {
      fontSize: 14,
      color: colors.primary,
      fontWeight: "500",
    },
    categoriesContainer: {
      paddingVertical: 10,
    },
    categoriesScroll: {
      flexGrow: 0,
    },
    categoriesContent: {
      paddingHorizontal: 20,
    },
    categoryTab: {
      paddingHorizontal: 20,
      paddingVertical: 10,
      marginRight: 15,
      borderRadius: THEME.borderRadius.large,
      backgroundColor: colors.cardBackground,
      borderWidth: 1,
      borderColor: colors.border,
    },
    categoryTabActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    categoryText: {
      fontSize: 14,
      fontWeight: "500",
      color: colors.textSecondary,
    },
    categoryTextActive: {
      color: colors.white,
    },
    popularFoodContainer: {
      // marginTop: 5,
    },
    popularFoodScrollContent: {
      paddingLeft: (width * 0.125) / 2, // Half of the remaining space for center alignment
      paddingRight: (width * 0.125) / 2 + 20, // Half space + margin for last card
    },
    popularFoodCard: {
      width: width * 0.8,
      height: 400,
      marginRight: 20,
      borderRadius: 30,
      overflow: "hidden",
      // ...THEME.shadows.medium,
    },
    popularImageContainer: {
      width: "100%",
      height: "100%",
      position: "relative",
    },
    popularImage: {
      width: "100%",
      height: "100%",
      resizeMode: "cover",
    },
    priceBadgeContainer: {
      position: "absolute",
      top: 12,
      left: 12,
      borderWeight: 2,
      borderWhite: "#ffffff",
      borderRadius: 20,
      overflow: "hidden",
      ...THEME.shadows.light,
    },
    priceBadge: {
      paddingHorizontal: 10,
      paddingVertical: 13,
      justifyContent: "center",
      alignItems: "center",
    },
    priceBadgeText: {
      fontSize: 14,
      fontWeight: "bold",
      color: "#000000ff",
    },
    heartButton: {
      position: "absolute",
      top: 12,
      right: 12,
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: "#1b1b1b",
      justifyContent: "center",
      alignItems: "center",
      // ...THEME.shadows.light,
    },
    popularFoodInfo: {
      position: "absolute",
      bottom: 0,
      left: 0,
      right: 0,
      height: 400,
    },
    popularInfoGradient: {
      height: "100%",
      justifyContent: "flex-end",
      padding: 15,
    },
    popularFoodName: {
      fontSize: 18,
      fontWeight: "600",
      color: colors.white,
      textAlign: "left",
    },
    loadingContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      paddingVertical: 40,
    },
    loadingText: {
      fontSize: 16,
      color: colors.textSecondary,
      marginTop: 10,
    },
    errorContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      paddingVertical: 40,
      paddingHorizontal: 20,
    },
    errorTitle: {
      fontSize: 18,
      fontWeight: "bold",
      color: colors.text,
      marginTop: 16,
      marginBottom: 8,
    },
    errorText: {
      fontSize: 14,
      color: colors.textSecondary,
      textAlign: "center",
      marginBottom: 20,
    },
    retryButton: {
      backgroundColor: colors.primary,
      paddingHorizontal: 24,
      paddingVertical: 12,
      borderRadius: THEME.borderRadius.medium,
    },
    retryButtonText: {
      color: colors.white,
      fontSize: 16,
      fontWeight: "600",
    },
    emptyContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      paddingVertical: 40,
      paddingHorizontal: 20,
    },
    emptyTitle: {
      fontSize: 18,
      fontWeight: "bold",
      color: colors.text,
      marginTop: 16,
      marginBottom: 8,
    },
    emptyText: {
      fontSize: 14,
      color: colors.textSecondary,
      textAlign: "center",
    },
    bottomPadding: {
      height: 120, // Extra padding for floating tab bar
    },
    // New Popular Plans Styles
    popularPlanCard: {
      width: width * 0.75,
      height: 400,
      marginRight: 20,
      borderRadius: 20,
      overflow: "hidden",
      position: "relative",
      backgroundColor: colors.cardBackground,
    },
    popularCardImageContainer: {
      width: "100%",
      height: "100%",
      position: "relative",
    },
    popularCardImage: {
      width: "100%",
      height: "100%",
      resizeMode: "cover",
    },
    // Home Screen Discount Pill
    homeDiscountPill: {
      position: "absolute",
      bottom: 8,
      right: 8,
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: "#F3E9DF",
      paddingHorizontal: 8,
      paddingVertical: 7,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: "#1b1b1b",
      zIndex: 10,
    },
    homeDiscountPillText: {
      fontSize: 15,
      fontWeight: "450",
      color: "#333",
      marginLeft: 3,
    },
    popularHeartButton: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: colors.black,
      justifyContent: "center",
      alignItems: "center",
      alignSelf: "flex-start",
      marginBottom: 12,
    },
    popularCardContent: {
      position: "absolute",
      top: 0,
      bottom: 0,
      left: 0,
      right: 0,
      padding: 20,
      justifyContent: "flex-end",
    },
    popularCardTitle: {
      fontSize: 24,
      fontWeight: "bold",
      color: colors.white,
      marginBottom: 8,
    },
    popularCardDescription: {
      fontSize: 14,
      color: colors.white,
      opacity: 0.9,
      marginBottom: 12,
      lineHeight: 20,
    },
    popularCardPrice: {
      fontSize: 20,
      fontWeight: "bold",
      color: colors.primary,
    },
    // Mealplans Grid Styles
    mealplansGrid: {
      flexDirection: "column",
      paddingHorizontal: 0,
      gap: 20, // Uniform spacing between cards
    },
    mealplanCard: {
      width: "100%",
      borderRadius: 20,
      overflow: "hidden",
      marginBottom: 0, // Remove margin as gap handles spacing
    },
    mealplanImageContainer: {
      position: "relative",
      height: 150, // Much larger image height
      width: "100%",
      borderRadius: 20,
      overflow: "hidden",
    },
    mealplanImage: {
      width: "100%",
      height: "100%",
      resizeMode: "cover",
      borderRadius: 15,
    },
    mealplanHeartButton: {
      position: "absolute",
      top: 16,
      right: 16,
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.black,
      justifyContent: "center",
      alignItems: "center",
      borderWidth: 1,
      borderColor: "#1b1b1b",
    },
    newBadge: {
      position: "absolute",
      top: 16,
      left: 16,
      backgroundColor: colors.error,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 20,
    },
    newBadgeText: {
      color: colors.white,
      fontSize: 12,
      fontWeight: "bold",
    },
    mealplanTextContent: {
      padding: 16,
    },
    mealplanTitle: {
      fontSize: 18,
      fontWeight: 450,
      color: colors.text,
      marginBottom: 6,
    },
    mealplanDescription: {
      fontSize: 14,
      color: colors.textSecondary,
      marginBottom: 8,
      lineHeight: 20,
    },
    mealplanPrice: {
      fontSize: 20,
      fontWeight: "bold",
      color: colors.text,
    },
    // Subscription-focused UI Styles
    todaysMealsSection: {
      paddingHorizontal: 20,
      paddingVertical: 15,
    },
    deliveryStatus: {
      fontSize: 16,
      color: colors.textSecondary,
      marginBottom: 15,
      // fontStyle: "italic",
    },
    mealsScroll: {
      marginTop: 5,
    },
    todayMealCard: {
      width: 200,
      height: 280,
      marginRight: 15,
      borderRadius: 20,
      overflow: "hidden",
    },
    todayMealImageContainer: {
      width: "100%",
      height: "100%",
      position: "relative",
    },
    todayMealImage: {
      width: "100%",
      height: "100%",
      resizeMode: "cover",
    },
    todayMealOverlay: {
      position: "absolute",
      // top: 0,
      bottom: 0,
      left: 0,
      right: 0,
      padding: 15,
      // justifyContent: ",
    },
    mealTimeContainer: {
      alignSelf: "flex-start",
      top: 0,
      backgroundColor: "rgba(255, 255, 255, 0.9)",
      paddingHorizontal: 12,
      paddingVertical: 2,
      borderRadius: 15,
    },
    mealTime: {
      fontSize: 12,
      fontWeight: "600",
      color: "#1b1b1b",
    },
    mealType: {
      fontSize: 16,
      fontWeight: "bold",
      color: colors.white,
      marginBottom: 4,
    },
    todayMealName: {
      fontSize: 18,
      fontWeight: "bold",
      color: colors.white,
      marginBottom: 4,
    },
    mealCalories: {
      fontSize: 14,
      color: colors.white,
      opacity: 0.9,
    },
    subscriptionSection: {
      paddingHorizontal: 20,
      paddingVertical: 15,
    },
    subscriptionCard: {
      borderRadius: 20,
      overflow: "hidden",
      elevation: 4,
      shadowColor: colors.black,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.15,
      shadowRadius: 8,
    },
    subscriptionGradient: {
      padding: 20,
    },
    subscriptionHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-start",
      marginBottom: 20,
    },
    subscriptionPlanName: {
      fontSize: 20,
      fontWeight: "bold",
      color: colors.white,
      marginBottom: 4,
    },
    subscriptionDuration: {
      fontSize: 14,
      color: colors.white,
      opacity: 0.9,
    },
    subscriptionMenuButton: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: "rgba(255, 255, 255, 0.2)",
      justifyContent: "center",
      alignItems: "center",
    },
    progressContainer: {
      marginBottom: 20,
    },
    progressBar: {
      width: "100%",
      height: 8,
      backgroundColor: "rgba(255, 255, 255, 0.3)",
      borderRadius: 4,
      marginBottom: 8,
    },
    progressFill: {
      height: "100%",
      backgroundColor: colors.white,
      borderRadius: 4,
    },
    progressText: {
      fontSize: 14,
      color: colors.white,
      opacity: 0.9,
    },
    subscriptionActions: {
      flexDirection: "row",
      justifyContent: "space-between",
    },
    actionButton: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: "rgba(255, 255, 255, 0.2)",
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 20,
      flex: 1,
      marginHorizontal: 4,
      justifyContent: "center",
    },
    actionButtonText: {
      fontSize: 12,
      color: colors.white,
      fontWeight: "600",
      marginLeft: 4,
    },
    quickStatsSection: {
      paddingHorizontal: 20,
      paddingVertical: 15,
    },
    statsGrid: {
      flexDirection: "row",
      justifyContent: "space-between",
      gap: 12,
    },
    statCard: {
      flex: 1,
      backgroundColor: colors.cardBackground,
      padding: 20,
      borderRadius: 15,
      alignItems: "center",
      borderWidth: 1,
      borderColor: colors.border,
    },
    statNumber: {
      fontSize: 24,
      fontWeight: "bold",
      fontWeight: "bold",
      color: colors.text,
      marginBottom: 4,
    },
    statLabel: {
      fontSize: 12,
      fontFamily: DMSansFonts.medium,
      color: colors.textSecondary,
      textAlign: "center",
    },
    // Browse section styles
    browseSection: {
      paddingHorizontal: 20,
      paddingVertical: 15,
    },
    browseMealPlansButton: {
      backgroundColor: colors.textSecondary,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 15,
      paddingHorizontal: 20,
      borderRadius: 50,
      gap: 8,
    },
    browseMealPlansText: {
      color: colors.white,
      fontSize: 16,
      fontWeight: "600",
      flex: 1,
      textAlign: "center",
    },
    // Menu dropdown styles
    menuDropdown: {
      position: "absolute",
      top: 60,
      right: 16,
      backgroundColor: colors.white,
      borderRadius: 12,
      shadowColor: colors.black,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 12,
      elevation: 8,
      zIndex: 1000,
      minWidth: 250,
    },
    menuOption: {
      flexDirection: "row",
      alignItems: "center",
      padding: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    menuOptionLast: {
      borderBottomWidth: 0,
    },
    menuOptionDanger: {
      backgroundColor: "rgba(255, 0, 0, 0.05)",
    },
    menuOptionText: {
      marginLeft: 12,
      flex: 1,
    },
    menuOptionTitle: {
      fontSize: 16,
      fontWeight: "600",
      color: colors.text,
      marginBottom: 2,
    },
    menuOptionTitleDanger: {
      color: colors.error,
    },
    menuOptionSubtitle: {
      fontSize: 13,
      color: colors.textSecondary,
    },
    // Pause modal styles
    modalOverlay: {
      flex: 1,
      backgroundColor: "rgba(0, 0, 0, 0.5)",
      justifyContent: "center",
      alignItems: "center",
      padding: 20,
    },
    pauseModal: {
      backgroundColor: colors.white,
      borderRadius: 20,
      padding: 24,
      width: "100%",
      maxWidth: 400,
    },
    modalTitle: {
      fontSize: 20,
      fontWeight: "bold",
      fontWeight: "bold",
      color: colors.text,
      textAlign: "center",
      marginBottom: 8,
    },
    modalSubtitle: {
      fontSize: 14,
      color: colors.textSecondary,
      textAlign: "center",
      marginBottom: 24,
    },
    inputLabel: {
      fontSize: 16,
      fontWeight: "600",
      color: colors.text,
      marginBottom: 8,
      marginTop: 16,
    },
    textInput: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      padding: 16,
      fontSize: 16,
      color: colors.text,
      textAlignVertical: "top",
      backgroundColor: colors.cardBackground,
    },
    durationOptions: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 12,
      marginTop: 8,
    },
    durationOption: {
      flex: 1,
      minWidth: "45%",
      backgroundColor: colors.cardBackground,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      paddingVertical: 12,
      paddingHorizontal: 16,
      alignItems: "center",
    },
    durationOptionSelected: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    durationOptionText: {
      fontSize: 14,
      fontWeight: "600",
      color: colors.text,
    },
    durationOptionTextSelected: {
      color: colors.white,
    },
    modalActions: {
      flexDirection: "row",
      gap: 12,
      marginTop: 24,
    },
    modalButton: {
      flex: 1,
      paddingVertical: 16,
      borderRadius: 12,
      alignItems: "center",
    },
    modalButtonSecondary: {
      backgroundColor: colors.cardBackground,
      borderWidth: 1,
      borderColor: colors.border,
    },
    modalButtonPrimary: {
      backgroundColor: colors.primary,
    },
    modalButtonDisabled: {
      backgroundColor: colors.textMuted,
      opacity: 0.6,
    },
    modalButtonTextSecondary: {
      fontSize: 16,
      fontWeight: "600",
      color: colors.text,
    },
    modalButtonTextPrimary: {
      fontSize: 16,
      fontWeight: "600",
      color: colors.white,
    },
    // No meals container styles
    noMealsContainer: {
      alignItems: "center",
      paddingVertical: 40,
      paddingHorizontal: 20,
    },
    noMealsTitle: {
      fontSize: 18,
      fontWeight: "bold",
      color: colors.text,
      marginTop: 16,
      marginBottom: 8,
    },
    noMealsText: {
      fontSize: 14,
      color: colors.textSecondary,
      textAlign: "center",
      marginBottom: 20,
      lineHeight: 20,
    },
    contactSupportButton: {
      backgroundColor: colors.primary,
      paddingHorizontal: 24,
      paddingVertical: 12,
      borderRadius: 80,
    },
    contactSupportText: {
      color: colors.white,
      fontSize: 14,
      fontWeight: "600",
    },
    // Back to plan styles
    backToPlanSection: {
      paddingHorizontal: 20,
      paddingVertical: 10,
    },
    backToPlanButton: {
      flexDirection: "row",
      alignItems: "center",
      alignSelf: "flex-start",
      paddingHorizontal: 15,
      paddingVertical: 8,
      borderRadius: 20,
      backgroundColor: "rgba(255, 193, 7, 0.1)",
      borderWidth: 1,
      borderColor: colors.primary,
    },
    backToPlanText: {
      color: colors.primary,
      fontSize: 14,
      fontWeight: "600",
      marginLeft: 6,
    },
    // Banner slide styles
    bannerSlide: {
      width: width,
      paddingHorizontal: 20,
    },
    promoBannerContainer: {
      position: "relative",
      borderRadius: THEME.borderRadius.large,
      overflow: "hidden",
      minHeight: 110,
      maxHeight: 120,
    },
    promoBannerImage: {
      width: "100%",
      height: "100%",
      position: "absolute",
      top: 0,
      left: 0,
    },
    promoBannerCTA: {
      position: "absolute",
      bottom: 15,
      right: 15,
      backgroundColor: colors.white,
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: THEME.borderRadius.xxl,
      flexDirection: "row",
      alignItems: "center",
      shadowColor: "#000",
      shadowOffset: {
        width: 0,
        height: 2,
      },
      shadowOpacity: 0.25,
      shadowRadius: 3.84,
      elevation: 5,
      // Visual indicator - not interactive since whole banner is clickable
      opacity: 0.95,
    },
    promoBannerCTAText: {
      color: colors.black,
      fontSize: 12,
      fontWeight: "700",
      marginRight: 4,
    },
    promoBannerCTAIcon: {
      marginLeft: 4,
      color: colors.black,
    },
    bannerIndicators: {
      flexDirection: "row",
      justifyContent: "center",
      alignItems: "center",
      marginTop: 15,
      gap: 8,
    },
    bannerIndicator: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: colors.textMuted,
      opacity: 0.5,
    },
    bannerIndicatorActive: {
      backgroundColor: colors.primary,
      opacity: 1,
    },
    // Active Orders Section Styles
    activeOrdersSection: {
      paddingHorizontal: 20,
      paddingVertical: 15,
    },
    // Single Meal Layout Styles
    singleMealContainer: {
      paddingHorizontal: 0,
      alignItems: "center", // Center the single meal card
      justifyContent: "center",
    },
    fullWidthMealCard: {
      width: width - 40, // Full width minus section padding
      height: 200,
      borderRadius: 16,
      overflow: "hidden",
      elevation: 4,
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 6,
    },
    orderCard: {
      marginBottom: 12,
    },
    // Multiple Subscription Cards Styles
    subscriptionsSection: {
      paddingHorizontal: 20,
      paddingVertical: 15,
    },
    subscriptionListCard: {
      backgroundColor: colors.cardBackground,
      borderRadius: 16,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: colors.border,
      elevation: 2,
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
    },
    subscriptionCardContent: {
      flexDirection: "row",
      alignItems: "center",
      // padding: 16,
    },
    subscriptionCardImage: {
      marginRight: 16,
    },
    subscriptionCardImageStyle: {
      width: 60,
      height: 60,
      borderRadius: 12,
      backgroundColor: colors.background,
    },
    subscriptionCardDetails: {
      flex: 1,
      justifyContent: "space-between",
    },
    subscriptionCardTitle: {
      fontSize: 16,
      fontWeight: "700",
      color: colors.text,
      marginBottom: 4,
    },
    subscriptionCardSubtitle: {
      fontSize: 14,
      color: colors.textSecondary,
      marginBottom: 8,
    },
    subscriptionCardMeta: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    subscriptionStatusBadge: {
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 12,
    },
    subscriptionStatusText: {
      fontSize: 12,
      fontWeight: "600",
    },
    subscriptionCardPrice: {
      fontSize: 16,
      fontWeight: "700",
      color: colors.text,
    },
    subscriptionCardChevron: {
      marginLeft: 8,
    },
    // Address Modal Styles
    modalOverlay: {
      flex: 1,
      backgroundColor: "rgba(0, 0, 0, 0.5)",
      justifyContent: "flex-end",
    },
    modalContent: {
      backgroundColor: colors.cardBackground,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      minHeight: 400,
      maxHeight: "80%",
      overflow: "visible", // Allow suggestions to overflow
    },
    modalHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      padding: 20,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    modalTitle: {
      fontSize: 18,
      fontWeight: "600",
      color: colors.text,
      flex: 1,
    },
    modalCloseButton: {
      padding: 4,
    },
    modalBody: {
      flex: 1,
      padding: 20,
      minHeight: 250, // Ensure enough space for suggestions
    },
    // New styles for recurring delivery components
    sectionHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 16,
    },
    timelineButton: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 16,
      backgroundColor: `${COLORS.primary}15`,
    },
    timelineButtonText: {
      color: COLORS.primary,
      fontSize: 12,
      fontWeight: "600",
      fontFamily: DMSansFonts.semiBold,
      marginRight: 4,
    },
    modalHeader: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 16,
      paddingVertical: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    modalHeaderTitle: {
      flex: 1,
      textAlign: "center",
      fontSize: 18,
      fontWeight: "600",
      color: colors.text,
    },
  });

const WrappedHomeScreen = (props) => (
  <ErrorBoundary
    fallback={({ onRetry }) => (
      <SafeAreaView
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          padding: 20,
        }}
      >
        <CustomIcon name="alert-circle" size={60} color="#ef4444" />
        <Text
          style={{
            fontSize: 20,
            fontWeight: "bold",
            color: "#1f2937",
            marginTop: 16,
            marginBottom: 8,
          }}
        >
          Home Screen Error
        </Text>
        <Text
          style={{
            fontSize: 16,
            color: "#6b7280",
            textAlign: "center",
            marginBottom: 24,
          }}
        >
          Something went wrong loading your home screen. Please try again.
        </Text>
        <TouchableOpacity
          style={{
            backgroundColor: "#f97316",
            paddingHorizontal: 24,
            paddingVertical: 12,
            borderRadius: 8,
          }}
          onPress={onRetry}
        >
          <Text style={{ color: "#ffffff", fontSize: 16, fontWeight: "600" }}>
            Retry
          </Text>
        </TouchableOpacity>
      </SafeAreaView>
    )}
  >
    <HomeScreen {...props} />
  </ErrorBoundary>
);

export default WrappedHomeScreen;
