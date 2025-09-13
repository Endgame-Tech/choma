import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Core imports
import { useTheme } from "../../styles/theme";
import { useAuth } from "../../hooks/useAuth";
import { useAlert } from "../../contexts/AlertContext";
import { useMealPlans } from "../../hooks/useMealPlans";
import apiService from "../../services/api";
import NotificationService from "../../services/notificationService";

// Component imports
import {
  HomeHeader,
  QuickSearchBar,
  ActiveOrdersSection,
  SubscriptionsSection,
  MealPlansSection,
  RefreshableScrollContainer,
  MealTimelineModal,
} from "../../components/home";

// Modal imports
import Tutorial from "../../components/tutorial/Tutorial";
import SubscriptionManagementModal from "../../components/subscription/SubscriptionManagementModal";
import AddressAutocomplete from "../../components/ui/AddressAutocomplete";
import MealDetailModal from "../../components/modals/MealDetailModal";

// Utils
import { homeScreenTutorialSteps } from "../../utils/tutorialSteps";

const HomeScreen = ({ navigation }) => {
  const { isDark, colors } = useTheme();
  const { user } = useAuth();
  const { showSuccess, showError } = useAlert();
  const { mealPlans, loading, error, refreshing, refreshMealPlans } = useMealPlans();

  // State management
  const [selectedCategory, setSelectedCategory] = useState("All Plans");
  const [showTutorial, setShowTutorial] = useState(false);
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [showBrowseMode, setShowBrowseMode] = useState(false);

  // Orders and subscriptions state
  const [activeOrders, setActiveOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [activeSubscriptions, setActiveSubscriptions] = useState([]);
  const [subscriptionLoading, setSubscriptionLoading] = useState(true);

  // Modal state
  const [showManagementModal, setShowManagementModal] = useState(false);
  const [showMealTimeline, setShowMealTimeline] = useState(false);
  const [selectedSubscription, setSelectedSubscription] = useState(null);
  const [showMealDetailModal, setShowMealDetailModal] = useState(false);
  const [selectedMeals, setSelectedMeals] = useState([]);

  // Check first launch tutorial
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

  // Load data on mount
  useEffect(() => {
    loadActiveOrders();
    loadActiveSubscriptions();
  }, []);

  // Data loading functions
  const loadActiveOrders = async () => {
    try {
      setOrdersLoading(true);
      const result = await apiService.getUserOrders();
      
      if (result.success) {
        const orders = result.data?.data || result.data || result.orders || [];
        const activeOrdersList = Array.isArray(orders) 
          ? orders.filter(order => {
              const status = (order.delegationStatus || order.status || order.orderStatus || "").toLowerCase();
              return status && !["cancelled", "delivered"].includes(status);
            })
          : [];
        
        setActiveOrders(activeOrdersList);
      }
    } catch (error) {
      console.error("❌ Error loading orders:", error);
      setActiveOrders([]);
    } finally {
      setOrdersLoading(false);
    }
  };

  const loadActiveSubscriptions = async () => {
    try {
      setSubscriptionLoading(true);
      const result = await apiService.getUserSubscriptions();
      
      if (result.success) {
        const subscriptions = result.data?.data || result.data || result.subscriptions || [];
        const activeSubsList = Array.isArray(subscriptions)
          ? subscriptions.filter(sub => {
              const status = sub.status?.toLowerCase();
              return status === "active" || status === "paid" || sub.paymentStatus === "Paid";
            })
          : [];
        
        setActiveSubscriptions(activeSubsList);
      }
    } catch (error) {
      console.error("❌ Error loading subscriptions:", error);
      setActiveSubscriptions([]);
    } finally {
      setSubscriptionLoading(false);
    }
  };

  // Navigation and action handlers
  const handleLocationPress = () => {
    setShowAddressModal(true);
  };

  const handleToggleBrowseMode = () => {
    setShowBrowseMode(!showBrowseMode);
  };

  const handleSearchSubmit = (query) => {
    navigation.navigate("Search", { query });
  };

  const handleMealPlanPress = (plan) => {
    navigation.navigate("MealPlanDetail", { bundle: plan });
  };

  const handleSubscriptionPress = (subscription) => {
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
    setActiveSubscriptions(prev =>
      prev.map(sub =>
        sub._id === updatedSubscription._id ? updatedSubscription : sub
      )
    );
  };

  const handleMealPress = (meal) => {
    if (meal) {
      setSelectedMeals([meal]);
      setShowMealDetailModal(true);
    }
  };

  const handleShowMealTimeline = (subscription) => {
    setSelectedSubscription(subscription);
    setShowMealTimeline(true);
  };

  const handleAddressChange = async (addressInfo) => {
    try {
      const response = await apiService.updateProfile({
        address: addressInfo.formattedAddress,
        city: addressInfo.locality || addressInfo.adminArea || "",
        state: addressInfo.adminArea || "Lagos",
      });

      if (response.success) {
        setShowAddressModal(false);
      } else {
        showError("Update Failed", response.message || "Failed to update address");
      }
    } catch (error) {
      console.error("Error updating address:", error);
      showError("Update Failed", "An error occurred while updating your address");
    }
  };

  // Order action handlers
  const handleContactSupport = () => {
    navigation.navigate("HelpCenter");
  };

  const handleReorder = (order) => {
    if (order.mealPlan || order.orderItems?.mealPlan) {
      navigation.navigate("MealPlanDetail", {
        bundle: order.mealPlan || { _id: order.orderItems?.mealPlan },
      });
    }
  };

  const handleCancelOrder = async (orderId) => {
    try {
      const result = await apiService.cancelOrder(orderId);
      if (result.success) {
        showSuccess("Order Cancelled", "Your order has been cancelled successfully");
        await loadActiveOrders();
      } else {
        showError("Cancellation Failed", result.error || "Unable to cancel order at this time");
      }
    } catch (error) {
      showError("Error", "Unable to cancel order. Please try again.");
      console.error("Cancel order error:", error);
    }
  };

  const handleRateOrder = (order) => {
    console.log("Rate order:", order._id);
    // Navigate to rating screen
  };

  const handleTrackDriver = (driver, order) => {
    console.log("Track driver:", driver);
    navigation.navigate("MapTracking", { 
      orderId: order?._id || order?.id, 
      order: order 
    });
  };

  // Refresh handler
  const handleRefresh = async () => {
    await Promise.all([
      refreshMealPlans(),
      loadActiveOrders(),
      loadActiveSubscriptions(),
    ]);
  };

  const refreshingAll = refreshing || ordersLoading || subscriptionLoading;

  return (
    <SafeAreaView style={styles(colors).container}>
      <StatusBar
        barStyle={isDark ? "light-content" : "dark-content"}
        backgroundColor={colors.background}
      />

      {/* Main Content */}
      <View style={styles(colors).content}>
        {/* Header */}
        <HomeHeader
          user={user}
          navigation={navigation}
          onLocationPress={handleLocationPress}
          showBrowseMode={showBrowseMode}
          onToggleBrowseMode={handleToggleBrowseMode}
        />

        {/* Search Bar */}
        <QuickSearchBar
          navigation={navigation}
          onSearchSubmit={handleSearchSubmit}
        />

        {/* Scrollable Content */}
        <RefreshableScrollContainer
          refreshing={refreshingAll}
          onRefresh={handleRefresh}
        >
          {/* Active Orders Section */}
          <ActiveOrdersSection
            orders={activeOrders}
            loading={ordersLoading}
            navigation={navigation}
            onContactSupport={handleContactSupport}
            onReorder={handleReorder}
            onCancelOrder={handleCancelOrder}
            onRateOrder={handleRateOrder}
            onTrackDriver={handleTrackDriver}
          />

          {/* Subscriptions Section */}
          <SubscriptionsSection
            subscriptions={activeSubscriptions}
            loading={subscriptionLoading}
            navigation={navigation}
            onSubscriptionPress={handleSubscriptionPress}
            onSubscriptionMenuPress={handleSubscriptionMenuPress}
          />

          {/* Meal Plans Section */}
          <MealPlansSection
            mealPlans={mealPlans}
            loading={loading}
            navigation={navigation}
            onMealPlanPress={handleMealPlanPress}
            user={user}
            selectedCategory={selectedCategory}
            onCategoryChange={setSelectedCategory}
          />
        </RefreshableScrollContainer>
      </View>

      {/* Modals */}
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
            onPress={() => {}}
          >
            <View style={styles(colors).modalHeader}>
              <Text style={styles(colors).modalTitle}>Change Delivery Address</Text>
              <TouchableOpacity
                onPress={() => setShowAddressModal(false)}
                style={styles(colors).modalCloseButton}
              >
                <Ionicons name="close" size={24} color={colors.text} />
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
      <MealTimelineModal
        visible={showMealTimeline}
        onClose={() => {
          setShowMealTimeline(false);
          setSelectedSubscription(null);
        }}
        selectedSubscription={selectedSubscription}
        onMealPress={handleMealPress}
      />

      {/* Meal Detail Modal */}
      <MealDetailModal
        visible={showMealDetailModal}
        onClose={() => setShowMealDetailModal(false)}
        meals={selectedMeals}
        initialIndex={0}
      />
    </SafeAreaView>
  );
};

const styles = (colors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    content: {
      flex: 1,
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.5)",
      justifyContent: "center",
      alignItems: "center",
    },
    modalContent: {
      backgroundColor: colors.cardBackground,
      borderRadius: 16,
      margin: 20,
      maxHeight: "80%",
      width: "90%",
    },
    modalHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      padding: 20,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    modalTitle: {
      fontSize: 18,
      fontWeight: "600",
      color: colors.text,
    },
    modalCloseButton: {
      padding: 4,
    },
    modalBody: {
      padding: 20,
    },
  });

export default HomeScreen;