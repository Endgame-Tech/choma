import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Image,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "../../styles/theme";
import { useBookmarks } from "../../context/BookmarkContext";
import MealCardSkeleton from "../meal-plans/MealCardSkeleton";
import discountService from "../../services/discountService";
import { createStylesWithDMSans } from "../../utils/fontUtils";

const MealPlansSection = ({
  mealPlans = [],
  loading = false,
  navigation,
  onMealPlanPress,
  user,
  selectedCategory = "All Plans",
  onCategoryChange,
}) => {
  const { colors } = useTheme();
  const { toggleBookmark, isBookmarked } = useBookmarks();
  const [discountData, setDiscountData] = useState({});
  const [discountLoading, setDiscountLoading] = useState(false);

  const categories = [
    { id: "All Plans", label: "All Plans" },
    { id: "Fitness", label: "Fitness" },
    { id: "Professional", label: "Professional" },
    { id: "Family", label: "Family" },
    { id: "Wellness", label: "Wellness" },
  ];

  // Sort and mark plans as new
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

  // Filter plans by category
  const filteredPlans = React.useMemo(() => {
    if (selectedCategory === "All Plans") {
      return displayPlans;
    }
    return displayPlans.filter(
      (plan) => plan.category?.toLowerCase() === selectedCategory.toLowerCase()
    );
  }, [displayPlans, selectedCategory]);

  // Load discount data
  useEffect(() => {
    const fetchDiscountData = async () => {
      if (!user || !mealPlans || mealPlans.length === 0) {
        return;
      }

      try {
        setDiscountLoading(true);
        const discounts = {};

        // Fetch discount for each meal plan
        for (const plan of mealPlans.slice(0, 10)) {
          // Limit to first 10 plans
          try {
            const discount = await discountService.getDiscountForMealPlan(
              plan.planId || plan._id,
              user.id
            );
            if (discount && discount.discountPercentage > 0) {
              discounts[plan.planId || plan._id] = discount;
            }
          } catch (error) {
            console.log(`No discount for plan ${plan.planId}:`, error.message);
          }
        }

        setDiscountData(discounts);
      } catch (error) {
        console.error("Error fetching discount data:", error);
      } finally {
        setDiscountLoading(false);
      }
    };

    fetchDiscountData();
  }, [user, mealPlans]);

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

  const renderCategoryFilter = () => {
    return (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles(colors).categoriesContainer}
      >
        {categories.map((category) => (
          <TouchableOpacity
            key={category.id}
            style={[
              styles(colors).categoryButton,
              selectedCategory === category.id &&
                styles(colors).activeCategoryButton,
            ]}
            onPress={() => onCategoryChange && onCategoryChange(category.id)}
          >
            <Text
              style={[
                styles(colors).categoryText,
                selectedCategory === category.id &&
                  styles(colors).activeCategoryText,
              ]}
            >
              {category.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    );
  };

  const renderMealPlanCard = (plan, index) => {
    const discount = discountData[plan.planId || plan._id];
    const hasDiscount = discount && discount.discountPercentage > 0;
    const originalPrice = plan.pricing?.totalPrice || plan.totalPrice || 0;
    const discountedPrice = hasDiscount
      ? originalPrice * (1 - discount.discountPercentage / 100)
      : originalPrice;

    return (
      <TouchableOpacity
        key={plan._id || plan.planId || index}
        style={styles(colors).mealPlanCard}
        onPress={() => onMealPlanPress && onMealPlanPress(plan)}
        activeOpacity={0.8}
      >
        <View style={styles(colors).cardImageContainer}>
          <Image
            source={{
              uri:
                plan.planImageUrl ||
                plan.image ||
                plan.coverImage ||
                "https://images.unsplash.com/photo-1565299624946-b28f40a0ca4b?w=400",
            }}
            style={styles(colors).cardImage}
            defaultSource={require("../../assets/images/meal-plans/fitfuel.jpg")}
          />

          {/* New Badge */}
          {plan.isNew && (
            <View style={styles(colors).newBadge}>
              <Text style={styles(colors).newBadgeText}>NEW</Text>
            </View>
          )}

          {/* Discount Badge */}
          {hasDiscount && (
            <View style={styles(colors).discountBadge}>
              <Text style={styles(colors).discountText}>
                -{discount.discountPercentage}%
              </Text>
            </View>
          )}

          {/* Bookmark Button */}
          <TouchableOpacity
            style={styles(colors).bookmarkButton}
            onPress={() => toggleBookmark(plan)}
          >
            <Ionicons
              name={
                isBookmarked(plan._id || plan.planId)
                  ? "heart"
                  : "heart-outline"
              }
              size={20}
              color={
                isBookmarked(plan._id || plan.planId) ? "#FF6B6B" : colors.text
              }
            />
          </TouchableOpacity>
        </View>

        <View style={styles(colors).cardContent}>
          <Text style={styles(colors).planName} numberOfLines={1}>
            {plan.planName || plan.name || "Meal Plan"}
          </Text>
          <Text style={styles(colors).planDescription} numberOfLines={2}>
            {getPlanDescription(plan) || "Delicious and healthy meal plan"}
          </Text>

          <View style={styles(colors).planDetails}>
            <View style={styles(colors).planMetrics}>
              <View style={styles(colors).metric}>
                <Ionicons
                  name="time-outline"
                  size={14}
                  color={colors.textSecondary}
                />
                <Text style={styles(colors).metricText}>
                  {plan.durationWeeks || 4} weeks
                </Text>
              </View>
              <View style={styles(colors).metric}>
                <Ionicons
                  name="restaurant-outline"
                  size={14}
                  color={colors.textSecondary}
                />
                <Text style={styles(colors).metricText}>
                  {plan.mealsPerWeek || 21} meals/week
                </Text>
              </View>
            </View>

            <View style={styles(colors).priceContainer}>
              {hasDiscount && (
                <Text style={styles(colors).originalPrice}>
                  ₦{originalPrice.toLocaleString()}
                </Text>
              )}
              <Text style={styles(colors).price}>
                ₦{Math.round(discountedPrice).toLocaleString()}
              </Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles(colors).section}>
        <View style={styles(colors).sectionHeader}>
          <Text style={styles(colors).sectionTitle}>Our Meal Plans</Text>
        </View>
        {renderCategoryFilter()}
        <View style={styles(colors).loadingContainer}>
          {[...Array(3)].map((_, index) => (
            <MealCardSkeleton key={index} />
          ))}
        </View>
      </View>
    );
  }

  return (
    <View style={styles(colors).section}>
      <View style={styles(colors).sectionHeader}>
        <Text style={styles(colors).sectionTitle}>Our Meal Plans</Text>
        <TouchableOpacity
          onPress={() => navigation.navigate("Search")}
          style={styles(colors).seeAllButton}
        >
          <Text style={styles(colors).seeAllText}>See All</Text>
          <Ionicons name="chevron-forward" size={16} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {renderCategoryFilter()}

      {filteredPlans.length === 0 ? (
        <View style={styles(colors).emptyContainer}>
          <Ionicons
            name="restaurant-outline"
            size={60}
            color={colors.textMuted}
          />
          <Text style={styles(colors).emptyTitle}>No meal plans found</Text>
          <Text style={styles(colors).emptySubtitle}>
            Try selecting a different category or check back later for new plans
          </Text>
        </View>
      ) : (
        <View style={styles(colors).mealPlansGrid}>
          {filteredPlans.slice(0, 4).map(renderMealPlanCard)}
        </View>
      )}
    </View>
  );
};

const styles = (colors) =>
  createStylesWithDMSans({
    section: {
      marginBottom: 24,
    },
    sectionHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingHorizontal: 20,
      marginBottom: 16,
    },
    sectionTitle: {
      fontSize: 20,
      fontWeight: "700",
      color: colors.text,
    },
    seeAllButton: {
      flexDirection: "row",
      alignItems: "center",
    },
    seeAllText: {
      fontSize: 14,
      fontWeight: "600",
      color: colors.primary,
      marginRight: 4,
    },
    categoriesContainer: {
      paddingHorizontal: 20,
      marginBottom: 20,
    },
    categoryButton: {
      paddingHorizontal: 16,
      paddingVertical: 8,
      marginRight: 12,
      borderRadius: 20,
      backgroundColor: colors.cardBackground,
      borderWidth: 1,
      borderColor: colors.border,
    },
    activeCategoryButton: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    categoryText: {
      fontSize: 14,
      fontWeight: "500",
      color: colors.text,
    },
    activeCategoryText: {
      color: colors.background,
      fontWeight: "600",
    },
    loadingContainer: {
      paddingHorizontal: 20,
    },
    mealPlansGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      justifyContent: "space-between",
      paddingHorizontal: 20,
    },
    mealPlanCard: {
      width: "48%",
      backgroundColor: colors.cardBackground,
      borderRadius: 16,
      marginBottom: 16,
      overflow: "hidden",
      elevation: 2,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
    },
    cardImageContainer: {
      position: "relative",
      height: 120,
    },
    cardImage: {
      width: "100%",
      height: "100%",
    },
    newBadge: {
      position: "absolute",
      top: 8,
      left: 8,
      backgroundColor: colors.success,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 12,
    },
    newBadgeText: {
      fontSize: 10,
      fontWeight: "700",
      color: colors.background,
    },
    discountBadge: {
      position: "absolute",
      top: 8,
      right: 8,
      backgroundColor: colors.error,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 12,
    },
    discountText: {
      fontSize: 10,
      fontWeight: "700",
      color: colors.background,
    },
    bookmarkButton: {
      position: "absolute",
      bottom: 8,
      right: 8,
      backgroundColor: "rgba(0,0,0,0.5)",
      borderRadius: 16,
      padding: 6,
    },
    cardContent: {
      padding: 12,
    },
    planName: {
      fontSize: 16,
      fontWeight: "600",
      color: colors.text,
      marginBottom: 4,
    },
    planDescription: {
      fontSize: 12,
      color: colors.textSecondary,
      lineHeight: 16,
      marginBottom: 8,
    },
    planDetails: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-end",
    },
    planMetrics: {
      flex: 1,
    },
    metric: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 2,
    },
    metricText: {
      fontSize: 11,
      color: colors.textSecondary,
      marginLeft: 4,
    },
    priceContainer: {
      alignItems: "flex-end",
    },
    originalPrice: {
      fontSize: 11,
      color: colors.textSecondary,
      textDecorationLine: "line-through",
    },
    price: {
      fontSize: 14,
      fontWeight: "700",
      color: colors.primary,
    },
    emptyContainer: {
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 40,
      paddingHorizontal: 40,
    },
    emptyTitle: {
      fontSize: 18,
      fontWeight: "600",
      color: colors.text,
      marginTop: 16,
      marginBottom: 8,
    },
    emptySubtitle: {
      fontSize: 14,
      color: colors.textSecondary,
      textAlign: "center",
      lineHeight: 20,
    },
  });

export default MealPlansSection;
