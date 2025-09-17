// src/screens/meal-plans/MealPlansScreen.js - Payment Flow Aesthetic
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Image,
  Dimensions,
  StatusBar,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useMealPlans } from "../../hooks/useMealPlans";
import { useTheme } from "../../styles/theme";
import { useAuth } from "../../hooks/useAuth";
import { THEME } from "../../utils/colors";
import FilterModal from "../../components/meal-plans/FilterModal";
import { api } from "../../services/api";
import discountService from "../../services/discountService";
import { createStylesWithDMSans } from "../../utils/fontUtils";

const { width } = Dimensions.get("window");

const MealPlansScreen = ({ navigation }) => {
  const { colors } = useTheme();
  const { user } = useAuth();
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [discountData, setDiscountData] = useState({});
  const [discountLoading, setDiscountLoading] = useState(true);
  const {
    mealPlans: allMealPlans,
    loading: initialLoading,
    error: initialError,
    refreshing,
    refreshMealPlans,
  } = useMealPlans();

  // Filter state management
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [activeFilters, setActiveFilters] = useState({});
  const [filteredMealPlans, setFilteredMealPlans] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Initialize meal plans
  useEffect(() => {
    if (allMealPlans && allMealPlans.length > 0) {
      setFilteredMealPlans(allMealPlans);
    }
  }, [allMealPlans]);

  // Fetch discount data for all meal plans
  useEffect(() => {
    const fetchDiscountData = async () => {
      if (!user || !allMealPlans || allMealPlans.length === 0) {
        setDiscountLoading(false);
        return;
      }

      try {
        setDiscountLoading(true);
        console.log("💰 Fetching discount data for all meal plans");

        const discounts = {};

        // Fetch discount for each meal plan
        for (const plan of allMealPlans) {
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

        console.log("💰 All discount data fetched:", discounts);
        setDiscountData(discounts);
      } catch (error) {
        console.error("Error fetching discount data:", error);
        setDiscountData({});
      } finally {
        setDiscountLoading(false);
      }
    };

    fetchDiscountData();
  }, [user, allMealPlans]);

  // Combined refresh function
  const handleRefresh = async () => {
    await refreshMealPlans();
    // Discount data will be refetched automatically when allMealPlans updates
  };

  const hasActiveFilters = Object.keys(activeFilters).some((key) => {
    const value = activeFilters[key];
    if (key === "audiences") return value && value.length > 0;
    if (key === "priceRange")
      return value && (value[0] > 0 || value[1] < 50000);
    if (key === "sortBy") return value && value !== "popularity";
    if (key === "duration") return value !== null;
    return false;
  });

  const renderPlanCard = (plan) => {
    // Handle image source - use remote URL if available, otherwise fallback
    const imageSource = plan.image
      ? typeof plan.image === "string"
        ? { uri: plan.image }
        : plan.image
      : require("../../assets/images/meal-plans/fitfuel.jpg"); // Use existing image as default

    // Get discount information for this plan
    const planDiscount = discountData[plan.id || plan._id];
    const originalPrice = plan.basePrice || plan.price || 25000;
    const hasDiscount = planDiscount && planDiscount.discountPercent > 0;
    const discountedPrice = hasDiscount
      ? planDiscount.discountedPrice ||
        originalPrice - planDiscount.discountAmount
      : originalPrice;

    return (
      <TouchableOpacity
        key={plan.id}
        style={[
          styles(colors).planCard,
          selectedPlan === plan.id && styles(colors).planCardSelected,
        ]}
        onPress={() => {
          setSelectedPlan(plan.id);
          // Navigate to detail after a moment
          setTimeout(() => {
            navigation.navigate("MealPlanDetail", { bundle: plan });
          }, 200);
        }}
        activeOpacity={0.9}
      >
        <View style={styles(colors).cardContainer}>
          {/* Discount Pill - Priority over tag badge */}
          {hasDiscount ? (
            <View style={[styles(colors).discountPill]}>
              <Ionicons name="gift-outline" size={16} color="#333" />
              <Text style={styles(colors).discountPillText}>
                Up to {planDiscount.discountPercent}% Off
              </Text>
            </View>
          ) : (
            plan.tag && (
              <View
                style={[
                  styles(colors).tagBadge,
                  { backgroundColor: plan.gradient[0] },
                ]}
              >
                <Text style={styles(colors).tagText}>{plan.tag}</Text>
              </View>
            )
          )}

          {/* Plan Image */}
          <View style={styles(colors).imageContainer}>
            <Image
              source={imageSource}
              style={styles(colors).planImage}
              defaultSource={require("../../assets/images/meal-plans/fitfuel.jpg")}
              onError={() => {
                console.log("Failed to load image for plan:", plan.name);
              }}
            />
            <LinearGradient
              colors={["transparent", "rgba(0,0,0,0.3)"]}
              style={styles(colors).imageOverlay}
            />
          </View>

          {/* Plan Info */}
          <View style={styles(colors).planInfo}>
            <View style={styles(colors).planHeader}>
              <View style={styles(colors).planTitleContainer}>
                <Text style={styles(colors).planName}>{plan.name}</Text>
                <Text style={styles(colors).planSubtitle}>{plan.subtitle}</Text>
              </View>

              <View style={styles(colors).planMeta}>
                <Text style={styles(colors).planMeals}>{plan.meals}</Text>
                <Text style={styles(colors).planDuration}>{plan.duration}</Text>
              </View>
            </View>

            {/* Features */}
            <View style={styles(colors).featuresContainer}>
              {(plan.features || []).slice(0, 2).map((feature, index) => (
                <View key={index} style={styles(colors).featureItem}>
                  <Ionicons
                    name="checkmark-circle"
                    size={14}
                    color={plan.gradient[0]}
                  />
                  <Text style={styles(colors).featureText}>{feature}</Text>
                </View>
              ))}
            </View>

            {/* Pricing */}
            <View style={styles(colors).pricingContainer}>
              <View style={styles(colors).priceInfo}>
                {discountLoading ? (
                  <ActivityIndicator size="small" color={colors.primary} />
                ) : (
                  <>
                    <Text style={styles(colors).currentPrice}>
                      ₦{discountedPrice.toLocaleString()}
                    </Text>
                    {hasDiscount ? (
                      <>
                        <Text style={styles(colors).originalPrice}>
                          ₦{originalPrice.toLocaleString()}
                        </Text>
                        <View style={styles(colors).savingsBadge}>
                          <Text style={styles(colors).savingsText}>
                            {planDiscount.discountPercent}% OFF
                          </Text>
                        </View>
                        {planDiscount.reason && (
                          <Text
                            style={styles(colors).discountReason}
                            numberOfLines={1}
                          >
                            🎉 {planDiscount.reason}
                          </Text>
                        )}
                      </>
                    ) : (
                      <Text style={styles(colors).originalPrice}>
                        ₦{originalPrice.toLocaleString()}
                      </Text>
                    )}
                  </>
                )}
              </View>

              <TouchableOpacity
                style={[
                  styles(colors).selectButton,
                  { backgroundColor: plan.gradient[0] },
                ]}
                onPress={() =>
                  navigation.navigate("MealPlanDetail", { bundle: plan })
                }
              >
                <Text style={styles(colors).selectButtonText}>Select Plan</Text>
                <Ionicons name="arrow-forward" size={16} color="white" />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles(colors).container}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />

      {/* Header */}
      <View style={styles(colors).header}>
        <TouchableOpacity
          style={styles(colors).backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </TouchableOpacity>

        <View style={styles(colors).headerContent}>
          <Text style={styles(colors).headerTitle}>Meal Plans</Text>
          <Text style={styles(colors).headerSubtitle}>
            You deserve better meal
          </Text>
        </View>

        <TouchableOpacity
          style={[
            styles(colors).filterButton,
            hasActiveFilters && styles(colors).filterButtonActive,
          ]}
          onPress={() => setShowFilterModal(true)}
        >
          <Ionicons
            name="options"
            size={24}
            color={hasActiveFilters ? colors.primary : colors.text}
          />
          {hasActiveFilters && (
            <View style={styles(colors).filterBadge}>
              <Text style={styles(colors).filterBadgeText}>
                {getActiveFiltersCount()}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Subscription Info Banner */}
      <View style={styles(colors).infoBanner}>
        <LinearGradient
          colors={[colors.successLight, colors.successLight]}
          style={styles(colors).infoBannerGradient}
        >
          <View style={styles(colors).infoBannerContent}>
            <Ionicons
              name="information-circle"
              size={20}
              color={colors.primary}
            />
            <Text style={styles(colors).infoBannerText}>
              All plans include free delivery and can be paused anytime
            </Text>
          </View>
        </LinearGradient>
      </View>

      <ScrollView
        style={styles(colors).scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles(colors).scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
      >
        {/* Loading State */}
        {(loading || (initialLoading && !refreshing)) && (
          <View style={styles(colors).loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles(colors).loadingText}>
              {loading ? "Applying filters..." : "Loading meal plans..."}
            </Text>
          </View>
        )}

        {/* Error State */}
        {(error || initialError) && !loading && !initialLoading && (
          <View style={styles(colors).errorContainer}>
            <Ionicons name="alert-circle" size={48} color={colors.error} />
            <Text style={styles(colors).errorTitle}>
              Oops! Something went wrong
            </Text>
            <Text style={styles(colors).errorText}>
              {error || initialError}
            </Text>
            <TouchableOpacity
              style={styles(colors).retryButton}
              onPress={handleRefresh}
            >
              <Text style={styles(colors).retryButtonText}>Try Again</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Plans List */}
        {/* Active Filters Display */}
        {hasActiveFilters && (
          <View style={styles(colors).activeFiltersContainer}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {activeFilters.audiences &&
                activeFilters.audiences.length > 0 && (
                  <View style={styles(colors).activeFilterChip}>
                    <Text style={styles(colors).activeFilterText}>
                      {activeFilters.audiences.length} Audience
                      {activeFilters.audiences.length > 1 ? "s" : ""}
                    </Text>
                    <TouchableOpacity
                      onPress={() => clearSpecificFilter("audiences")}
                    >
                      <Ionicons name="close" size={16} color={colors.primary} />
                    </TouchableOpacity>
                  </View>
                )}
              {activeFilters.priceRange &&
                (activeFilters.priceRange[0] > 0 ||
                  activeFilters.priceRange[1] < 50000) && (
                  <View style={styles(colors).activeFilterChip}>
                    <Text style={styles(colors).activeFilterText}>
                      ₦{activeFilters.priceRange[0].toLocaleString()} - ₦
                      {activeFilters.priceRange[1].toLocaleString()}
                    </Text>
                    <TouchableOpacity
                      onPress={() => clearSpecificFilter("priceRange")}
                    >
                      <Ionicons name="close" size={16} color={colors.primary} />
                    </TouchableOpacity>
                  </View>
                )}
              {activeFilters.duration && (
                <View style={styles(colors).activeFilterChip}>
                  <Text style={styles(colors).activeFilterText}>
                    {getDurationLabel(activeFilters.duration)}
                  </Text>
                  <TouchableOpacity
                    onPress={() => clearSpecificFilter("duration")}
                  >
                    <Ionicons name="close" size={16} color={colors.primary} />
                  </TouchableOpacity>
                </View>
              )}
              <TouchableOpacity
                style={styles(colors).clearAllFiltersButton}
                onPress={clearAllFilters}
              >
                <Text style={styles(colors).clearAllFiltersText}>
                  Clear All
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        )}

        {!loading && !error && (
          <View style={styles(colors).plansContainer}>
            {filteredMealPlans.length > 0 ? (
              filteredMealPlans.map(renderPlanCard)
            ) : (
              <View style={styles(colors).emptyContainer}>
                <Ionicons
                  name="restaurant"
                  size={48}
                  color={colors.textMuted}
                />
                <Text style={styles(colors).emptyTitle}>
                  {hasActiveFilters
                    ? "No plans match your filters"
                    : "No meal plans available"}
                </Text>
                <Text style={styles(colors).emptyText}>
                  {hasActiveFilters
                    ? "Try adjusting your filters to see more plans"
                    : "Check back later for new meal plans!"}
                </Text>
                {hasActiveFilters && (
                  <TouchableOpacity
                    style={styles(colors).clearFiltersButton}
                    onPress={clearAllFilters}
                  >
                    <Text style={styles(colors).clearFiltersButtonText}>
                      Clear Filters
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>
        )}

        {/* Compare Plans Section */}
        <View style={styles(colors).compareSection}>
          <TouchableOpacity style={styles(colors).compareButton}>
            <Ionicons
              name="analytics-outline"
              size={20}
              color={colors.textSecondary}
            />
            <Text style={styles(colors).compareButtonText}>
              Compare All Plans
            </Text>
            <Ionicons
              name="chevron-forward"
              size={16}
              color={colors.textSecondary}
            />
          </TouchableOpacity>
        </View>

        {/* FAQ Section */}
        <View style={styles(colors).faqSection}>
          <Text style={styles(colors).faqTitle}>
            Frequently Asked Questions
          </Text>

          <TouchableOpacity style={styles(colors).faqItem}>
            <Text style={styles(colors).faqQuestion}>
              Can I pause my subscription?
            </Text>
            <Ionicons
              name="chevron-down"
              size={16}
              color={colors.textSecondary}
            />
          </TouchableOpacity>

          <TouchableOpacity style={styles(colors).faqItem}>
            <Text style={styles(colors).faqQuestion}>
              How do I customize my meals?
            </Text>
            <Ionicons
              name="chevron-down"
              size={16}
              color={colors.textSecondary}
            />
          </TouchableOpacity>

          <TouchableOpacity style={styles(colors).faqItem}>
            <Text style={styles(colors).faqQuestion}>
              What if I don't like a meal?
            </Text>
            <Ionicons
              name="chevron-down"
              size={16}
              color={colors.textSecondary}
            />
          </TouchableOpacity>
        </View>

        <View style={styles(colors).bottomPadding} />
      </ScrollView>

      {/* Filter Modal */}
      <FilterModal
        visible={showFilterModal}
        onClose={() => setShowFilterModal(false)}
        onApplyFilters={handleApplyFilters}
        initialFilters={activeFilters}
      />
    </SafeAreaView>
  );

  // Helper functions
  async function handleApplyFilters(filters) {
    setLoading(true);
    setError(null);
    setActiveFilters(filters);

    try {
      const filteredPlans = await api.getFilteredMealPlans(filters);
      setFilteredMealPlans(filteredPlans);
    } catch (err) {
      console.error("Filter error:", err);
      setError("Failed to apply filters");
      // Fallback to original meal plans
      setFilteredMealPlans(allMealPlans || []);
    } finally {
      setLoading(false);
    }
  }

  function clearAllFilters() {
    setActiveFilters({});
    setFilteredMealPlans(allMealPlans || []);
  }

  function clearSpecificFilter(filterKey) {
    const newFilters = { ...activeFilters };
    delete newFilters[filterKey];
    setActiveFilters(newFilters);
    handleApplyFilters(newFilters);
  }

  function getActiveFiltersCount() {
    let count = 0;
    if (activeFilters.audiences && activeFilters.audiences.length > 0) count++;
    if (
      activeFilters.priceRange &&
      (activeFilters.priceRange[0] > 0 || activeFilters.priceRange[1] < 50000)
    )
      count++;
    if (activeFilters.sortBy && activeFilters.sortBy !== "popularity") count++;
    if (activeFilters.duration) count++;
    return count;
  }

  function getDurationLabel(durationId) {
    const durations = {
      1: "1 Week",
      2: "2 Weeks",
      3: "3 Weeks",
      4: "4 Weeks",
    };
    return durations[durationId] || "Custom Duration";
  }
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
    backButton: {
      padding: 5,
    },
    headerContent: {
      flex: 1,
      alignItems: "center",
    },
    headerTitle: {
      fontSize: 18,
      fontWeight: "600",
      color: colors.text,
    },
    headerSubtitle: {
      fontSize: 12,
      color: colors.textSecondary,
      marginTop: 2,
    },
    filterButton: {
      padding: 5,
      position: "relative",
    },
    filterButtonActive: {
      backgroundColor: colors.primaryLight,
      borderRadius: 8,
    },
    filterBadge: {
      position: "absolute",
      top: -2,
      right: -2,
      backgroundColor: colors.primary,
      borderRadius: 10,
      minWidth: 20,
      height: 20,
      justifyContent: "center",
      alignItems: "center",
    },
    filterBadgeText: {
      color: colors.white,
      fontSize: 12,
      fontWeight: "600",
    },
    activeFiltersContainer: {
      paddingHorizontal: 20,
      paddingVertical: 10,
    },
    activeFilterChip: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.primaryLight,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 16,
      marginRight: 8,
      borderWidth: 1,
      borderColor: colors.primary,
    },
    activeFilterText: {
      color: colors.primary,
      fontSize: 12,
      fontWeight: "500",
      marginRight: 6,
    },
    clearAllFiltersButton: {
      backgroundColor: colors.cardBackground,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
    },
    clearAllFiltersText: {
      color: colors.textSecondary,
      fontSize: 12,
      fontWeight: "500",
    },
    clearFiltersButton: {
      backgroundColor: colors.primary,
      paddingHorizontal: 20,
      paddingVertical: 10,
      borderRadius: 8,
      marginTop: 16,
    },
    clearFiltersButtonText: {
      color: colors.white,
      fontSize: 14,
      fontWeight: "600",
    },
    infoBanner: {
      marginHorizontal: 20,
      marginVertical: 10,
      borderRadius: 12,
      overflow: "hidden",
    },
    infoBannerGradient: {
      padding: 12,
    },
    infoBannerContent: {
      flexDirection: "row",
      alignItems: "center",
    },
    infoBannerText: {
      flex: 1,
      fontSize: 13,
      color: colors.primary,
      marginLeft: 8,
      fontWeight: "500",
    },
    scrollView: {
      flex: 1,
    },
    scrollContent: {
      paddingBottom: 20,
    },
    plansContainer: {
      paddingHorizontal: 20,
    },
    planCard: {
      backgroundColor: colors.cardBackground,
      borderRadius: 20,
      marginBottom: 20,
      elevation: 4,
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      borderWidth: 2,
      borderColor: "transparent",
    },
    planCardSelected: {
      borderColor: colors.primary,
      elevation: 6,
    },
    cardContainer: {
      overflow: "hidden",
      borderRadius: 20,
    },
    tagBadge: {
      position: "absolute",
      top: 15,
      right: 15,
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 12,
      zIndex: 10,
    },
    tagText: {
      fontSize: 11,
      fontWeight: "bold",
      color: colors.white,
    },
    // New Discount Pill Design (matching provided image)
    discountPill: {
      position: "absolute",
      top: 12,
      right: 12,
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: "#F5F4F0", // Light cream background like in the image
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 20, // Fully rounded pill shape
      zIndex: 10,
      elevation: 3,
      shadowColor: colors.black,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.2,
      shadowRadius: 3,
    },
    discountPillText: {
      fontSize: 11,
      fontWeight: "600",
      color: "#333",
      marginLeft: 4,
    },
    // Keep old discountBadge for backward compatibility
    discountBadge: {
      position: "absolute",
      top: 12,
      right: 12,
      backgroundColor: colors.error, // Use red/orange for urgency
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 12,
      zIndex: 10,
      elevation: 3,
      shadowColor: colors.black,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.3,
      shadowRadius: 3,
    },
    discountBadgeText: {
      color: colors.white,
      fontSize: 11,
      fontWeight: "bold",
      textAlign: "center",
    },
    imageContainer: {
      position: "relative",
      height: 160,
    },
    planImage: {
      width: "100%",
      height: "100%",
    },
    imageOverlay: {
      position: "absolute",
      bottom: 0,
      left: 0,
      right: 0,
      height: 60,
    },
    planInfo: {
      padding: 20,
    },
    planHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-start",
      marginBottom: 15,
    },
    planTitleContainer: {
      flex: 1,
      marginRight: 15,
    },
    planName: {
      fontSize: 18,
      fontWeight: "bold",
      color: colors.text,
      marginBottom: 4,
    },
    planSubtitle: {
      fontSize: 13,
      color: colors.textSecondary,
      lineHeight: 18,
    },
    planMeta: {
      alignItems: "flex-end",
    },
    planMeals: {
      fontSize: 16,
      fontWeight: "600",
      color: colors.primary,
    },
    planDuration: {
      fontSize: 12,
      color: colors.textMuted,
      marginTop: 2,
    },
    featuresContainer: {
      marginBottom: 20,
    },
    featureItem: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 8,
    },
    featureText: {
      fontSize: 13,
      color: colors.textSecondary,
      marginLeft: 8,
      flex: 1,
    },
    pricingContainer: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    priceInfo: {
      flex: 1,
    },
    currentPrice: {
      fontSize: 20,
      fontWeight: "bold",
      color: colors.text,
      marginBottom: 4,
    },
    originalPrice: {
      fontSize: 14,
      color: colors.textMuted,
      textDecorationLine: "line-through",
      marginBottom: 4,
    },
    savingsBadge: {
      backgroundColor: colors.successLight,
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 8,
      alignSelf: "flex-start",
    },
    savingsText: {
      fontSize: 11,
      color: colors.primary,
      fontWeight: "600",
    },
    discountReason: {
      fontSize: 10,
      color: colors.primary,
      fontWeight: "500",
      marginTop: 4,
      fontStyle: "italic",
    },
    selectButton: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 20,
      paddingVertical: 12,
      borderRadius: 25,
    },
    selectButtonText: {
      color: colors.white,
      fontWeight: "600",
      marginRight: 8,
    },
    compareSection: {
      paddingHorizontal: 20,
      marginVertical: 20,
    },
    compareButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.cardBackground,
      paddingVertical: 15,
      paddingHorizontal: 20,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
    },
    compareButtonText: {
      fontSize: 16,
      color: colors.textSecondary,
      fontWeight: "500",
      marginLeft: 8,
      marginRight: 8,
    },
    faqSection: {
      paddingHorizontal: 20,
      marginTop: 10,
    },
    faqTitle: {
      fontSize: 18,
      fontWeight: "600",
      color: colors.text,
      marginBottom: 15,
    },
    faqItem: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      backgroundColor: colors.cardBackground,
      paddingVertical: 15,
      paddingHorizontal: 16,
      borderRadius: 12,
      marginBottom: 10,
    },
    faqQuestion: {
      fontSize: 14,
      color: colors.textSecondary,
      flex: 1,
    },
    bottomPadding: {
      height: 40,
    },
    // Loading States
    loadingContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      paddingVertical: 60,
    },
    loadingText: {
      marginTop: 16,
      fontSize: 16,
      color: colors.textSecondary,
      textAlign: "center",
    },
    // Error States
    errorContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      paddingVertical: 60,
      paddingHorizontal: 32,
    },
    errorTitle: {
      fontSize: 18,
      fontWeight: "600",
      color: colors.text,
      marginTop: 16,
      marginBottom: 8,
      textAlign: "center",
    },
    errorText: {
      fontSize: 14,
      color: colors.textSecondary,
      textAlign: "center",
      marginBottom: 24,
      lineHeight: 20,
    },
    retryButton: {
      backgroundColor: colors.primary,
      paddingHorizontal: 24,
      paddingVertical: 12,
      borderRadius: 8,
    },
    retryButtonText: {
      color: colors.white,
      fontSize: 14,
      fontWeight: "600",
    },
    // Empty States
    emptyContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      paddingVertical: 60,
    },
    emptyTitle: {
      fontSize: 18,
      fontWeight: "600",
      color: colors.text,
      marginTop: 16,
      marginBottom: 8,
      textAlign: "center",
    },
    emptyText: {
      fontSize: 14,
      color: colors.textSecondary,
      textAlign: "center",
    },
  });

export default MealPlansScreen;
