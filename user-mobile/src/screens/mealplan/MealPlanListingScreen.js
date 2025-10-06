import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  StatusBar,
  ActivityIndicator,
  Platform,
  PixelRatio,
  RefreshControl,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "../../styles/theme";
import CustomIcon from "../../components/ui/CustomIcon";
import { createStylesWithDMSans } from "../../utils/fontUtils";
import { LinearGradient } from "expo-linear-gradient";
import tagService from "../../services/tagService";
import MealPlanCard from "../../components/meal-plans/MealPlanCard";
import { useBookmarks } from "../../context/BookmarkContext";
import discountService from "../../services/discountService";
import { useAuth } from "../../hooks/useAuth";
import apiService from "../../services/api";
import { THEME } from "../../utils/colors";

const { width, height } = Dimensions.get("window");

// Responsive scaling utilities
const scale = (size) => {
  const pixelRatio = PixelRatio.get();
  const deviceScale = width / 375;
  const androidFactor = Platform.OS === "android" ? Math.min(pixelRatio / 2, 1.2) : 1;
  return size * deviceScale * androidFactor;
};

const verticalScale = (size) => (height / 812) * size;
const moderateScale = (size, factor = 0.5) => size + (scale(size) - size) * factor;

const isSmallScreen = width < 350;
const isMediumScreen = width >= 350 && width < 414;
const isLargeScreen = width >= 414;
const isTablet = width >= 768;

const statusBarHeight = Platform.OS === "android" ? StatusBar.currentHeight || 0 : 0;

const getResponsiveValue = (small, medium, large, tablet = large) => {
  if (isTablet) return tablet;
  if (isLargeScreen) return large;
  if (isMediumScreen) return medium;
  return small;
};

const getShadowStyle = (shadowProps) => ({
  ...shadowProps,
  ...(Platform.OS === "android" && {
    elevation: shadowProps.shadowOpacity ? shadowProps.shadowOpacity * 10 : 5,
  }),
});

// Tier options in hierarchy order
const TIER_OPTIONS = [
  { id: "Premium", label: "Premium", emoji: "💎" },
  { id: "Gold", label: "Gold", emoji: "🥇" },
  { id: "Silver", label: "Silver", emoji: "🥈" },
];

const MealPlanListingScreen = ({ navigation, route }) => {
  const { colors, isDark } = useTheme();
  const { user } = useAuth();
  const { toggleBookmark, isBookmarked } = useBookmarks();
  const { tag, tagId, tagName, selectedDuration } = route.params;

  const [mealPlans, setMealPlans] = useState([]);
  const [filteredMealPlans, setFilteredMealPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedTier, setSelectedTier] = useState(null);
  const [discountData, setDiscountData] = useState({});
  const [discountLoading, setDiscountLoading] = useState(true);

  // Banner state
  const [banners, setBanners] = useState([]);
  const [bannersLoading, setBannersLoading] = useState(true);
  const [currentBannerIndex, setCurrentBannerIndex] = useState(0);
  const [isUserInteracting, setIsUserInteracting] = useState(false);
  const [trackedImpressions, setTrackedImpressions] = useState(new Set());
  const bannerScrollRef = useRef(null);

  useEffect(() => {
    loadMealPlans();
  }, [tagId, selectedDuration]);

  useEffect(() => {
    if (mealPlans.length > 0) {
      fetchDiscountData();
    }
  }, [mealPlans, user]);

  // Load banners
  useEffect(() => {
    loadPublicDashboardData();
  }, []);

  // Filter meal plans when tier changes
  useEffect(() => {
    if (!selectedTier) {
      setFilteredMealPlans(mealPlans);
    } else {
      const filtered = mealPlans.filter(plan => plan.tier === selectedTier);
      setFilteredMealPlans(filtered);
    }
  }, [selectedTier, mealPlans]);

  const loadMealPlans = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const response = await tagService.getMealPlansByTag(tagId, 1, 100);

      if (response?.success && response?.data) {
        let plans = response.data || [];

        // Filter by duration if provided
        if (selectedDuration) {
          plans = plans.filter(plan => plan.durationWeeks === selectedDuration.weeks);
        }

        setMealPlans(plans);
        setFilteredMealPlans(plans);
      }
    } catch (error) {
      console.error("Error loading meal plans:", error);
      setMealPlans([]);
      setFilteredMealPlans([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [tagId, selectedDuration]);

  const fetchDiscountData = useCallback(async () => {
    if (!user || !mealPlans.length) {
      setDiscountLoading(false);
      return;
    }

    try {
      setDiscountLoading(true);
      const discounts = {};

      for (const plan of mealPlans) {
        try {
          const discount = await discountService.calculateDiscount(user, plan);
          discounts[plan._id || plan.id] = discount;
        } catch (error) {
          console.error(`Error calculating discount for plan ${plan._id}:`, error);
          discounts[plan._id || plan.id] = {
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
  }, [user, mealPlans]);

  const loadPublicDashboardData = async () => {
    try {
      setBannersLoading(true);

      const bannersResult = await apiService.getActiveBanners();
      if (
        bannersResult &&
        bannersResult.success &&
        bannersResult.data &&
        bannersResult.data.data
      ) {
        setBanners(bannersResult.data.data);
      } else {
        setBanners([]);
      }
    } catch (error) {
      console.error("Error loading banners:", error);
      setBanners([]);
    } finally {
      setBannersLoading(false);
    }
  };

  const getPlanDescription = (plan) => {
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

  const renderHeader = () => (
    <View style={styles(colors).headerContainer}>
      <LinearGradient
        colors={[colors.primary2, colors.primary2]}
        style={styles(colors).headerGradient}
      >
        <View style={styles(colors).headerTop}>
          <TouchableOpacity
            style={styles(colors).backButton}
            onPress={() => navigation.goBack()}
            activeOpacity={0.8}
          >
            <CustomIcon name="chevron-back" size={24} color={colors.white} />
          </TouchableOpacity>

          <View style={styles(colors).headerTextContainer}>
            <Text style={styles(colors).headerTitle}>{tagName}</Text>
            {selectedDuration && (
              <Text style={styles(colors).headerSubtitle}>
                {selectedDuration.label}
              </Text>
            )}
          </View>

          <View style={{ width: 40 }} />
        </View>
      </LinearGradient>
    </View>
  );

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
            <ActivityIndicator size="large" color={colors.primary} />
            <Text
              style={[
                styles(colors).loadingText,
                { color: colors.white, marginTop: 10 },
              ]}
            >
              Loading banners...
            </Text>
          </View>
        </View>
      );
    }

    if (!banners || banners.length === 0) {
      return null;
    }

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
          onScrollBeginDrag={() => setIsUserInteracting(true)}
          onScrollEndDrag={() => setIsUserInteracting(false)}
        >
          {(banners || []).map((banner, index) => (
            <TouchableOpacity
              key={banner._id || index}
              style={styles(colors).bannerSlide}
              onPress={() => {
                if (banner.actionUrl) {
                  navigation.navigate(banner.actionUrl);
                }
              }}
            >
              <View style={styles(colors).promoBannerContainer}>
                <Image
                  source={{
                    uri: banner.imageUrl,
                    cache: "default",
                  }}
                  style={styles(colors).promoBannerImage}
                  resizeMode="cover"
                  onLoad={() => {
                    if (!trackedImpressions.has(banner._id || index)) {
                      setTrackedImpressions(
                        (prev) => new Set([...prev, banner._id || index])
                      );
                    }
                  }}
                />
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
        {(banners || []).length > 1 && (
          <View style={styles(colors).bannerIndicators}>
            {(banners || []).map((_, index) => (
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

  const renderTierFilters = () => (
    <View style={styles(colors).tierFiltersContainer}>
      <Text style={styles(colors).tierFiltersLabel}>Filter by Tier</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles(colors).tierFiltersList}
      >
        {/* All Plans option */}
        <TouchableOpacity
          style={[
            styles(colors).tierPill,
            !selectedTier && styles(colors).tierPillActive,
          ]}
          onPress={() => setSelectedTier(null)}
          activeOpacity={0.7}
        >
          <Text
            style={[
              styles(colors).tierPillText,
              !selectedTier && styles(colors).tierPillTextActive,
            ]}
          >
            All Plans
          </Text>
        </TouchableOpacity>

        {/* Tier options in hierarchy order */}
        {TIER_OPTIONS.map((tier) => (
          <TouchableOpacity
            key={tier.id}
            style={[
              styles(colors).tierPill,
              selectedTier === tier.id && styles(colors).tierPillActive,
            ]}
            onPress={() => setSelectedTier(selectedTier === tier.id ? null : tier.id)}
            activeOpacity={0.7}
          >
            <Text style={styles(colors).tierPillEmoji}>{tier.emoji}</Text>
            <Text
              style={[
                styles(colors).tierPillText,
                selectedTier === tier.id && styles(colors).tierPillTextActive,
              ]}
            >
              {tier.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  const renderContent = () => {
    if (loading) {
      return (
        <View style={styles(colors).loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles(colors).loadingText}>Loading meal plans...</Text>
        </View>
      );
    }

    if (filteredMealPlans.length === 0) {
      return (
        <View style={styles(colors).emptyContainer}>
          <CustomIcon name="utensils" size={64} color={colors.textMuted} />
          <Text style={styles(colors).emptyTitle}>No meal plans found</Text>
          <Text style={styles(colors).emptyText}>
            {selectedTier
              ? `No ${selectedTier} tier meal plans available for this duration.`
              : "No meal plans available for this selection."}
          </Text>
          {selectedTier && (
            <TouchableOpacity
              style={styles(colors).clearFilterButton}
              onPress={() => setSelectedTier(null)}
            >
              <Text style={styles(colors).clearFilterButtonText}>View All Plans</Text>
            </TouchableOpacity>
          )}
        </View>
      );
    }

    return (
      <View style={styles(colors).mealPlansContainer}>
        <Text style={styles(colors).resultsCount}>
          {filteredMealPlans.length} meal plan{filteredMealPlans.length !== 1 ? 's' : ''} found
        </Text>
        {filteredMealPlans.map((plan) => (
          <MealPlanCard
            key={plan._id || plan.id}
            plan={plan}
            onPress={() => navigation.navigate("MealPlanDetail", { bundle: plan })}
            onBookmarkPress={() => toggleBookmark(plan._id || plan.id)}
            isBookmarked={isBookmarked(plan._id || plan.id)}
            discountData={discountData}
            getPlanDescription={getPlanDescription}
          />
        ))}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles(colors).container}>
      <StatusBar
        barStyle={isDark ? "light-content" : "dark-content"}
        backgroundColor={colors.primary2}
      />
      {renderHeader()}

      <ScrollView
        style={styles(colors).scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadMealPlans(true)}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
      >
        {renderPromoBanners()}
        {renderTierFilters()}
        {renderContent()}
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
    scrollView: {
      flex: 1,
    },
    headerContainer: {
      backgroundColor: colors.primary2,
    },
    headerGradient: {
      paddingTop: verticalScale(10),
      paddingBottom: verticalScale(15),
      paddingHorizontal: scale(20),
    },
    headerTop: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    backButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: "rgba(255, 255, 255, 0.2)",
      justifyContent: "center",
      alignItems: "center",
    },
    headerTextContainer: {
      flex: 1,
      alignItems: "center",
    },
    headerTitle: {
      fontSize: moderateScale(20),
      fontWeight: "700",
      color: colors.white,
      textAlign: "center",
    },
    headerSubtitle: {
      fontSize: moderateScale(14),
      fontWeight: "500",
      color: colors.primary,
      textAlign: "center",
      marginTop: 2,
    },
    heroBannerContainer: {
      marginBottom: 10,
    },
    heroBanner: {
      backgroundColor: colors.primary,
      borderRadius: THEME.borderRadius.large,
      overflow: "hidden",
      width: "100%",
      minHeight: 120,
      maxHeight: 130,
    },
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
    tierFiltersContainer: {
      paddingTop: verticalScale(15),
      paddingBottom: verticalScale(10),
      backgroundColor: colors.background,
    },
    tierFiltersLabel: {
      fontSize: moderateScale(14),
      fontWeight: "600",
      color: colors.text,
      paddingHorizontal: scale(20),
      marginBottom: verticalScale(10),
    },
    tierFiltersList: {
      paddingHorizontal: scale(20),
      paddingBottom: verticalScale(5),
    },
    tierPill: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.cardBackground,
      borderRadius: moderateScale(20),
      paddingVertical: verticalScale(8),
      paddingHorizontal: scale(16),
      marginRight: scale(10),
      borderWidth: 1,
      borderColor: colors.border,
    },
    tierPillActive: {
      backgroundColor: colors.text,
      borderColor: colors.text,
    },
    tierPillEmoji: {
      fontSize: moderateScale(16),
      marginRight: scale(6),
    },
    tierPillText: {
      fontSize: moderateScale(14),
      fontWeight: "600",
      color: colors.text,
    },
    tierPillTextActive: {
      color: colors.background,
    },
    mealPlansContainer: {
      padding: scale(20),
      paddingTop: verticalScale(10),
    },
    resultsCount: {
      fontSize: moderateScale(14),
      fontWeight: "500",
      color: colors.textSecondary,
      marginBottom: verticalScale(15),
    },
    loadingContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      paddingVertical: verticalScale(60),
    },
    loadingText: {
      fontSize: moderateScale(16),
      color: colors.textSecondary,
      marginTop: verticalScale(10),
    },
    emptyContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      paddingVertical: verticalScale(60),
      paddingHorizontal: scale(40),
    },
    emptyTitle: {
      fontSize: moderateScale(20),
      fontWeight: "600",
      color: colors.text,
      marginTop: verticalScale(20),
      marginBottom: verticalScale(8),
      textAlign: "center",
    },
    emptyText: {
      fontSize: moderateScale(16),
      color: colors.textSecondary,
      textAlign: "center",
      lineHeight: moderateScale(24),
    },
    clearFilterButton: {
      marginTop: verticalScale(20),
      backgroundColor: colors.primary,
      paddingVertical: verticalScale(12),
      paddingHorizontal: scale(24),
      borderRadius: moderateScale(8),
    },
    clearFilterButtonText: {
      fontSize: moderateScale(14),
      fontWeight: "600",
      color: colors.white,
    },
  });

export default MealPlanListingScreen;
