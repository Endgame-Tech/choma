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
  Animated,
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
import BlendSvg from "../../../assets/blend.svg";

const { width, height } = Dimensions.get("window");

// Responsive scaling utilities
const scale = (size) => {
  const pixelRatio = PixelRatio.get();
  const deviceScale = width / 375;
  const androidFactor =
    Platform.OS === "android" ? Math.min(pixelRatio / 2, 1.2) : 1;
  return size * deviceScale * androidFactor;
};

const verticalScale = (size) => (height / 812) * size;
const moderateScale = (size, factor = 0.5) =>
  size + (scale(size) - size) * factor;

const isSmallScreen = width < 350;
const isMediumScreen = width >= 350 && width < 414;
const isLargeScreen = width >= 414;
const isTablet = width >= 768;

const statusBarHeight =
  Platform.OS === "android" ? StatusBar.currentHeight || 0 : 0;

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
  const [availableTiers, setAvailableTiers] = useState([]);

  // Banner state
  const [banners, setBanners] = useState([]);
  const [bannersLoading, setBannersLoading] = useState(true);
  const [currentBannerIndex, setCurrentBannerIndex] = useState(0);
  const [isUserInteracting, setIsUserInteracting] = useState(false);
  const [trackedImpressions, setTrackedImpressions] = useState(new Set());
  const bannerScrollRef = useRef(null);

  // Animation
  const scrollY = useRef(new Animated.Value(0)).current;
  const headerOpacity = scrollY.interpolate({
    inputRange: [0, 100],
    outputRange: [0, 1],
    extrapolate: "clamp",
  });

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

  // Filter meal plans when tier changes and calculate available tiers
  useEffect(() => {
    // Calculate available tiers from meal plans
    const tiersInPlans = [
      ...new Set(mealPlans.map((plan) => plan.tier).filter(Boolean)),
    ];
    const availableTierOptions = TIER_OPTIONS.filter((tierOption) =>
      tiersInPlans.includes(tierOption.id)
    );
    setAvailableTiers(availableTierOptions);

    // Filter meal plans based on selected tier
    if (!selectedTier) {
      setFilteredMealPlans(mealPlans);
    } else {
      const filtered = mealPlans.filter((plan) => plan.tier === selectedTier);
      setFilteredMealPlans(filtered);
    }
  }, [selectedTier, mealPlans]);

  const loadMealPlans = useCallback(
    async (isRefresh = false) => {
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
            plans = plans.filter(
              (plan) => plan.durationWeeks === selectedDuration.weeks
            );
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
    },
    [tagId, selectedDuration]
  );

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
          console.error(
            `Error calculating discount for plan ${plan._id}:`,
            error
          );
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

  const handleScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { y: scrollY } } }],
    { useNativeDriver: false }
  );

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

  const getTagImage = (useBigPreview = true) => {
    if (!tag) return require("../../../assets/authImage.png");

    const imageSource = useBigPreview
      ? tag.bigPreviewImage || tag.image
      : tag.image;

    if (typeof imageSource === "string" && imageSource.trim()) {
      return { uri: imageSource };
    }

    return require("../../../assets/authImage.png");
  };

  const renderHeader = () => (
    <View style={styles(colors).heroWrapper}>
      <LinearGradient
        colors={[colors.primary2, colors.primary2]}
        style={styles(colors).heroBackground}
      >
        {/* Navigation Header */}
        <View style={styles(colors).navigationHeader}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles(colors).backButton}
          >
            <CustomIcon name="chevron-back" size={24} color={colors.primary} />
          </TouchableOpacity>
        </View>

        {/* Hero Background Image */}
        <Image
          source={getTagImage(true)}
          style={styles(colors).heroBackgroundImage}
          resizeMode="cover"
        />

        {/* Blend Transition */}
        <View style={styles(colors).blendTransition}>
          <BlendSvg
            width="100%"
            height={60}
            fill={colors.background}
            preserveAspectRatio="none"
            style={styles(colors).blendSvg}
          />
        </View>
      </LinearGradient>
    </View>
  );

  const renderFixedBackground = () => (
    <View style={styles(colors).fixedBackground}>
      <LinearGradient
        colors={[colors.primary2, "#003C2A", "#003527", "#002E22"]}
        style={styles(colors).heroBackground}
      >
        {/* Hero Background Image */}
        <Image
          source={getTagImage(true)}
          style={styles(colors).heroBackgroundImage}
          resizeMode="cover"
        />
      </LinearGradient>
    </View>
  );

  const renderStickyHeader = () => (
    <View
      style={[
        styles(colors).stickyHeaderContainer,
        isHeaderSticky && styles(colors).stickyHeaderFixed,
      ]}
    >
      {/* Tag Image Circle Overlay */}
      <View
        style={[
          styles(colors).tagImageOverlay,
          isHeaderSticky && styles(colors).tagImageOverlaySticky,
        ]}
      >
        <View style={styles(colors).tagImageContainer}>
          <Image
            source={getTagImage(false)}
            style={styles(colors).tagImageCircle}
            resizeMode="cover"
          />
        </View>
      </View>

      {/* Blend Transition */}
      <View style={styles(colors).blendTransition}>
        <BlendSvg
          width="100%"
          height={60}
          fill={colors.background}
          preserveAspectRatio="none"
          style={styles(colors).blendSvg}
        />
      </View>

      {/* Tag Information Section */}
      <View style={styles(colors).tagInfoSection}>
        <Text style={styles(colors).tagName}>{tagName}</Text>
        {selectedDuration && (
          <Text style={styles(colors).tagSubtitle}>
            {selectedDuration.label}
          </Text>
        )}
        <View style={styles(colors).contactContainer}>
          <View style={styles(colors).contactRow}>
            <CustomIcon
              name="clock-filled"
              size={16}
              color={colors.textSecondary}
            />
            <Text style={styles(colors).contactText}>
              {filteredMealPlans.length} meal plan
              {filteredMealPlans.length !== 1 ? "s" : ""}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );

  // const renderPromoBanners = () => {
  //   if (bannersLoading) {
  //     return (
  //       <View style={styles(colors).heroBannerContainer}>
  //         <View
  //           style={[
  //             styles(colors).heroBanner,
  //             { justifyContent: "center", alignItems: "center" },
  //           ]}
  //         >
  //           <ActivityIndicator size="large" color={colors.primary} />
  //           <Text
  //             style={[
  //               styles(colors).loadingText,
  //               { color: colors.white, marginTop: 10 },
  //             ]}
  //           >
  //             Loading banners...
  //           </Text>
  //         </View>
  //       </View>
  //     );
  //   }

  //   if (!banners || banners.length === 0) {
  //     return null;
  //   }

  //   return (
  //     <View style={styles(colors).heroBannerContainer}>
  //       <ScrollView
  //         ref={bannerScrollRef}
  //         horizontal
  //         pagingEnabled
  //         showsHorizontalScrollIndicator={false}
  //         onMomentumScrollEnd={(event) => {
  //           const slideIndex = Math.round(
  //             event.nativeEvent.contentOffset.x / width
  //           );
  //           setCurrentBannerIndex(slideIndex);
  //         }}
  //         onScrollBeginDrag={() => setIsUserInteracting(true)}
  //         onScrollEndDrag={() => setIsUserInteracting(false)}
  //       >
  //         {(banners || []).map((banner, index) => (
  //           <TouchableOpacity
  //             key={banner._id || index}
  //             style={styles(colors).bannerSlide}
  //             onPress={() => {
  //               if (banner.actionUrl) {
  //                 navigation.navigate(banner.actionUrl);
  //               }
  //             }}
  //           >
  //             <View style={styles(colors).promoBannerContainer}>
  //               <Image
  //                 source={{
  //                   uri: banner.imageUrl,
  //                   cache: "default",
  //                 }}
  //                 style={styles(colors).promoBannerImage}
  //                 resizeMode="cover"
  //                 onLoad={() => {
  //                   if (!trackedImpressions.has(banner._id || index)) {
  //                     setTrackedImpressions(
  //                       (prev) => new Set([...prev, banner._id || index])
  //                     );
  //                   }
  //                 }}
  //               />
  //             </View>
  //           </TouchableOpacity>
  //         ))}
  //       </ScrollView>
  //       {(banners || []).length > 1 && (
  //         <View style={styles(colors).bannerIndicators}>
  //           {(banners || []).map((_, index) => (
  //             <View
  //               key={index}
  //               style={[
  //                 styles(colors).bannerIndicator,
  //                 currentBannerIndex === index &&
  //                   styles(colors).bannerIndicatorActive,
  //               ]}
  //             />
  //           ))}
  //         </View>
  //       )}
  //     </View>
  //   );
  // };

  const renderTierFilters = () => {
    // Don't show tier filters if no tiers are available
    if (availableTiers.length === 0) {
      return null;
    }

    return (
      <View style={styles(colors).tierFiltersContainer}>
        <Text style={styles(colors).tierFiltersLabel}>Filter by Tier</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles(colors).tierFiltersList}
        >
          {/* All Plans option - only show if there are multiple tiers available */}
          {availableTiers.length > 1 && (
            <TouchableOpacity
              style={[
                styles(colors).tierItem,
                !selectedTier && styles(colors).selectedTierItem,
              ]}
              onPress={() => setSelectedTier(null)}
              activeOpacity={0.7}
            >
              <View
                style={[
                  styles(colors).tierImageContainer,
                  !selectedTier && styles(colors).selectedTierImageContainer,
                ]}
              >
                <Text
                  style={[
                    styles(colors).allTierIcon,
                    !selectedTier && styles(colors).selectedAllTierIcon,
                  ]}
                >
                  🍽️
                </Text>
              </View>
              <Text
                style={[
                  styles(colors).tierName,
                  !selectedTier && styles(colors).selectedTierName,
                ]}
              >
                All Plans
              </Text>
            </TouchableOpacity>
          )}

          {/* Only show tiers that have meal plans available */}
          {availableTiers.map((tier) => (
            <TouchableOpacity
              key={tier.id}
              style={[
                styles(colors).tierItem,
                selectedTier === tier.id && styles(colors).selectedTierItem,
              ]}
              onPress={() =>
                setSelectedTier(selectedTier === tier.id ? null : tier.id)
              }
              activeOpacity={0.7}
            >
              <View
                style={[
                  styles(colors).tierImageContainer,
                  selectedTier === tier.id &&
                    styles(colors).selectedTierImageContainer,
                ]}
              >
                <Text
                  style={[
                    styles(colors).tierEmoji,
                    selectedTier === tier.id &&
                      styles(colors).selectedTierEmoji,
                  ]}
                >
                  {tier.emoji}
                </Text>
              </View>
              <Text
                style={[
                  styles(colors).tierName,
                  selectedTier === tier.id && styles(colors).selectedTierName,
                ]}
              >
                {tier.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    );
  };

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
              <Text style={styles(colors).clearFilterButtonText}>
                View All Plans
              </Text>
            </TouchableOpacity>
          )}
        </View>
      );
    }

    return (
      <View style={styles(colors).mealPlansContainer}>
        <Text style={styles(colors).resultsCount}>
          {filteredMealPlans.length} meal plan
          {filteredMealPlans.length !== 1 ? "s" : ""} found
        </Text>
        {filteredMealPlans.map((plan) => (
          <MealPlanCard
            key={plan._id || plan.id}
            plan={plan}
            onPress={() =>
              navigation.navigate("MealPlanDetail", { bundle: plan })
            }
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
    <SafeAreaView
      style={styles(colors).container}
      edges={["top", "left", "right"]}
    >
      <StatusBar barStyle="light-content" backgroundColor={colors.primary2} />

      {/* Animated Header Overlay */}
      <Animated.View
        style={[styles(colors).animatedHeader, { opacity: headerOpacity }]}
      >
        <View style={styles(colors).animatedHeaderContent}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            // style={styles(colors).backButton}
          >
            <CustomIcon name="chevron-back" size={20} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles(colors).animatedHeaderTitle} numberOfLines={1}>
            {tagName}
          </Text>
          <View style={styles(colors).headerActions} />
        </View>
      </Animated.View>

      <Animated.ScrollView
        style={styles(colors).scrollView}
        showsVerticalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadMealPlans(true)}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
      >
        {renderHeader()}

        {/* Tag Information Section */}
        <View style={styles(colors).tagInfoSection}>
          <Text style={styles(colors).tagName}>{tagName}</Text>
          {selectedDuration && (
            <Text style={styles(colors).tagSubtitle}>
              {selectedDuration.label}
            </Text>
          )}
          <View style={styles(colors).contactContainer}>
            <View style={styles(colors).contactRow}>
              <CustomIcon
                name="clock-filled"
                size={16}
                color={colors.textSecondary}
              />
              <Text style={styles(colors).contactText}>
                {filteredMealPlans.length} meal plan
                {filteredMealPlans.length !== 1 ? "s" : ""}
              </Text>
            </View>
          </View>
        </View>

        {/* Promo Banners */}
        {/* {renderPromoBanners()} */}

        {/* Tier Filters */}
        {renderTierFilters()}

        {/* Content */}
        {renderContent()}

        <View style={styles(colors).bottomPadding} />
      </Animated.ScrollView>
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
      backgroundColor: colors.background,
    },
    heroWrapper: {
      position: "relative",
      backgroundColor: colors.primary2,
      height: 250,
      overflow: "hidden",
    },
    heroBackground: {
      paddingTop: 20,
      paddingBottom: 0,
      paddingHorizontal: 0,
      position: "relative",
      height: "100%",
      minHeight: 250,
    },
    navigationHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 30,
      paddingHorizontal: 20,
      position: "relative",
      zIndex: 10,
    },
    backButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.black,
      justifyContent: "center",
      alignItems: "center",
      borderWidth: 1,
      borderColor: "#1b1b1b",
    },
    headerActions: {
      flexDirection: "row",
      gap: 12,
    },
    heroBackgroundImage: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      width: "100%",
      height: "100%",
      minHeight: 250,
    },
    blendTransition: {
      position: "absolute",
      bottom: 0,
      left: 0,
      right: 0,
      width: "100%",
      height: 60,
      zIndex: 2,
      shadowColor: "#000000",
      shadowOffset: { width: 0, height: -2 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 5,
    },
    blendSvg: {
      width: "100%",
      height: "100%",
    },
    animatedHeader: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      zIndex: 1000,
      backgroundColor: colors.background,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    animatedHeaderContent: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 20,
      paddingVertical: 15,
      paddingTop: 55, // Account for status bar
    },
    animatedHeaderTitle: {
      flex: 1,
      fontSize: 18,
      fontWeight: "600",
      color: colors.text,
      textAlign: "center",
      marginHorizontal: 20,
    },
    tagInfoSection: {
      backgroundColor: colors.background,
      paddingHorizontal: scale(20),
      paddingVertical: verticalScale(20),
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    tagName: {
      fontSize: moderateScale(24),
      fontWeight: "700",
      color: colors.text,
      marginBottom: verticalScale(8),
    },
    tagSubtitle: {
      fontSize: moderateScale(14),
      color: colors.textSecondary,
      marginBottom: verticalScale(12),
    },
    contactContainer: {
      alignItems: "flex-start",
      width: "100%",
    },
    contactRow: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: verticalScale(8),
    },
    contactText: {
      fontSize: moderateScale(14),
      color: colors.textSecondary,
      marginLeft: scale(8),
    },
    heroBannerContainer: {
      marginVertical: 10,
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
      paddingVertical: verticalScale(5),
    },
    tierItem: {
      alignItems: "center",
      marginRight: scale(15),
      paddingVertical: verticalScale(8),
      paddingHorizontal: scale(12),
      borderRadius: moderateScale(20),
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      minWidth: scale(70),
    },
    selectedTierItem: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.3,
      shadowRadius: 4,
      elevation: 4,
    },
    tierImageContainer: {
      width: scale(40),
      height: scale(40),
      borderRadius: scale(20),
      backgroundColor: colors.background,
      justifyContent: "center",
      alignItems: "center",
      marginBottom: verticalScale(6),
      overflow: "hidden",
    },
    selectedTierImageContainer: {
      backgroundColor: "rgba(255, 255, 255, 0.2)",
    },
    allTierIcon: {
      fontSize: moderateScale(20),
    },
    selectedAllTierIcon: {
      color: colors.white,
    },
    tierEmoji: {
      fontSize: moderateScale(20),
    },
    selectedTierEmoji: {
      fontSize: moderateScale(20),
    },
    tierName: {
      fontSize: moderateScale(12),
      fontWeight: "600",
      color: colors.text,
      textAlign: "center",
    },
    selectedTierName: {
      color: colors.white,
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
    bottomPadding: {
      height: 120,
    },
  });

export default MealPlanListingScreen;
