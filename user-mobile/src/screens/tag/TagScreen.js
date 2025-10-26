import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  Dimensions,
  StatusBar,
  ActivityIndicator,
  RefreshControl,
  Animated,
  TextInput,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "../../styles/theme";
import CustomIcon from "../../components/ui/CustomIcon";
import { createStylesWithDMSans } from "../../utils/fontUtils";
import { useBookmarks } from "../../context/BookmarkContext";
import { useAuth } from "../../hooks/useAuth";
import tagService from "../../services/tagService";
import discountService from "../../services/discountService";
import MealPlanCard from "../../components/meal-plans/MealPlanCard";
import { THEME } from "../../utils/colors";
import BlendSvg from "../../../assets/blend.svg";
import RatingModal from "../../components/rating/RatingModal";
import RatingDisplay from "../../components/rating/RatingDisplay";
import { ratingApi } from "../../services/ratingApi";
import { formatApproximateNumber } from "../../utils/numberUtils";

const { width } = Dimensions.get("window");

const TagScreen = ({ navigation, route }) => {
  const { colors } = useTheme();
  const { user } = useAuth();
  const { toggleBookmark, isBookmarked } = useBookmarks();

  // Route params
  const {
    tagId,
    tagName: initialTagName,
    selectedDuration: initialSelectedDuration,
  } = route.params;

  // State
  const [tag, setTag] = useState(null);
  const [mealPlans, setMealPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMoreData, setHasMoreData] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [error, setError] = useState(null);
  const [discountData, setDiscountData] = useState({});
  const [discountLoading, setDiscountLoading] = useState(true);

  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredMealPlans, setFilteredMealPlans] = useState([]);
  const [showSearch, setShowSearch] = useState(false);

  // Duration filter state
  const [durationOptions, setDurationOptions] = useState([]);
  const [selectedDuration, setSelectedDuration] = useState(null);

  // Rating state
  const [ratingModalVisible, setRatingModalVisible] = useState(false);
  const [existingRatings, setExistingRatings] = useState([]);
  const [ratingStats, setRatingStats] = useState(null);
  const [userRating, setUserRating] = useState(null);
  const [ratingsLoading, setRatingsLoading] = useState(false);

  // Animation
  const scrollY = useRef(new Animated.Value(0)).current;
  const headerOpacity = scrollY.interpolate({
    inputRange: [0, 100],
    outputRange: [0, 1],
    extrapolate: "clamp",
  });

  // Load initial data
  useEffect(() => {
    loadTagData();
  }, [tagId]);

  // Filter meal plans based on search and duration
  useEffect(() => {
    let filtered = mealPlans;

    // Apply search filter
    if (searchQuery.trim()) {
      filtered = filtered.filter(
        (plan) =>
          plan.planName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          plan.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          plan.description?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Apply duration filter
    if (selectedDuration) {
      filtered = filtered.filter(
        (plan) => plan.durationWeeks === selectedDuration.weeks
      );
    }

    setFilteredMealPlans(filtered);
  }, [searchQuery, selectedDuration, mealPlans]);

  // Load discount data
  useEffect(() => {
    fetchDiscountData();
  }, [user, mealPlans]);

  const extractDurationOptions = useCallback(
    (plans) => {
      try {
        // Extract unique duration weeks from meal plans
        const durations = [
          ...new Set(
            plans
              .map((plan) => plan.durationWeeks)
              .filter((duration) => duration && duration > 0)
          ),
        ].sort((a, b) => a - b);

        // Format duration options like TagFilterBar
        const formattedOptions = durations.map((weeks) => ({
          id: weeks,
          label: weeks === 1 ? "1 Week Plan" : `${weeks} Week Plan`,
          weeks: weeks,
          description: `${weeks} week${weeks > 1 ? "s" : ""} duration`,
        }));

        setDurationOptions(formattedOptions);

        // Auto-select duration if provided from navigation
        if (initialSelectedDuration) {
          const matchingDuration = formattedOptions.find(
            (d) => d.weeks === initialSelectedDuration.weeks
          );
          if (matchingDuration) {
            setSelectedDuration(matchingDuration);
          }
        }
      } catch (error) {
        console.error("Error extracting duration options:", error);
        setDurationOptions([]);
      }
    },
    [initialSelectedDuration]
  );

  const loadTagData = useCallback(
    async (isRefresh = false) => {
      try {
        if (isRefresh) {
          setRefreshing(true);
          setCurrentPage(1);
          setHasMoreData(true);
        } else {
          setLoading(true);
        }
        setError(null);

        // Load tag details and meal plans in parallel
        const [tagResponse, mealPlansResponse] = await Promise.all([
          tagService.getTagById(tagId),
          tagService.getMealPlansByTag(tagId, 1, 20),
        ]);

        if (tagResponse) {
          setTag(tagResponse);
        }

        if (mealPlansResponse?.success && mealPlansResponse?.data) {
          const plans = mealPlansResponse.data || [];
          setMealPlans(plans);
          setHasMoreData(mealPlansResponse.pagination?.hasNext || false);
          setCurrentPage(2);

          // Extract duration options from meal plans
          extractDurationOptions(plans);
        }
      } catch (err) {
        console.error("Error loading tag data:", err);
        setError(err.message || "Failed to load tag data");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [tagId]
  );

  const loadMoreMealPlans = useCallback(async () => {
    if (!hasMoreData || loadingMore) return;

    try {
      setLoadingMore(true);
      const response = await tagService.getMealPlansByTag(
        tagId,
        currentPage,
        20
      );

      if (response?.success && response?.data) {
        setMealPlans((prev) => [...prev, ...response.data]);
        setHasMoreData(response.pagination?.hasNext || false);
        setCurrentPage((prev) => prev + 1);
      }
    } catch (err) {
      console.error("Error loading more meal plans:", err);
    } finally {
      setLoadingMore(false);
    }
  }, [tagId, currentPage, hasMoreData, loadingMore]);

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

  // Fetch ratings for this tag
  const fetchRatings = useCallback(async () => {
    if (!tag) {
      return;
    }

    try {
      setRatingsLoading(true);
      const tagIdForRating = tag._id || tagId;

      // Get rating statistics
      const statsResponse = await ratingApi.getEntityStats(
        "tag",
        tagIdForRating
      );

      if (statsResponse.success) {
        setRatingStats(statsResponse.data);
      } else {
        setRatingStats(null);
      }

      // Get existing ratings (first page for display)
      const ratingsResponse = await ratingApi.getEntityRatings(
        "tag",
        tagIdForRating,
        {
          limit: 5,
          sortBy: "createdAt",
          sortOrder: "desc",
        }
      );
      if (ratingsResponse.success) {
        setExistingRatings(ratingsResponse.data.ratings || []);
      }

      // Check if current user has already rated this tag
      const userRatingsResponse = await ratingApi.getMyRatings({
        entityType: "tag",
        ratingType: "tag",
      });
      if (userRatingsResponse.success) {
        const userTagRating = userRatingsResponse.data.ratings?.find(
          (rating) => rating.ratedEntity === tagIdForRating
        );
        setUserRating(userTagRating || null);
      }
    } catch (error) {
      console.error("Error in fetchRatings:", error);
    } finally {
      setRatingsLoading(false);
    }
  }, [tag, tagId]);

  // Handle rating submission
  const handleRatingSubmit = async (ratingData) => {
    try {
      if (userRating) {
        // Update existing rating
        await ratingApi.updateRating(userRating._id, ratingData);
      } else {
        // Create new rating
        await ratingApi.createRating(ratingData);
      }

      // Refresh ratings after submission
      await fetchRatings();

      // Force a delay to ensure backend processing is complete
      setTimeout(async () => {
        await fetchRatings();
      }, 2000);
    } catch (error) {
      console.error("Error submitting rating:", error);

      let errorMessage = "Failed to submit rating. Please try again.";

      if (error.message && error.message.includes("already rated")) {
        try {
          await fetchRatings();
          errorMessage = "Your rating has been recorded successfully.";
          return;
        } catch (fetchError) {
          console.error("Error fetching updated ratings:", fetchError);
        }
        errorMessage =
          "You have already rated this tag. Your rating has been updated.";
      } else if (error.message && error.message.includes("not found")) {
        errorMessage = "This tag is no longer available for rating.";
      } else if (error.message && error.message.includes("unauthorized")) {
        errorMessage = "Please log in to rate this tag.";
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      }

      Alert.alert("Rating Error", errorMessage, [{ text: "OK" }]);
    }
  };

  // Fetch ratings when tag is loaded
  useEffect(() => {
    if (tag) {
      fetchRatings();
    }
  }, [tag, fetchRatings]);

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

  const handleScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { y: scrollY } } }],
    { useNativeDriver: false }
  );

  const renderMealPlanCard = (plan) => (
    <MealPlanCard
      key={plan.id || plan._id}
      plan={plan}
      onPress={() => navigation.navigate("MealPlanDetail", { bundle: plan })}
      onBookmarkPress={() => toggleBookmark(plan.id || plan._id)}
      isBookmarked={isBookmarked(plan.id || plan._id)}
      discountData={discountData}
      getPlanDescription={getPlanDescription}
    />
  );

  const renderHeader = () => (
    <View style={styles(colors).heroWrapper}>
      <LinearGradient
        colors={["#004432", "#7A2E18"]}
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

        {/* Tag Image Circle */}
        {/* <View style={styles(colors).tagImageContainer}>
          <Image
            source={getTagImage(false)}
            style={styles(colors).tagImageCircle}
            resizeMode="cover"
          />
        </View> */}

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

  const renderSearchBar = () => {
    if (!showSearch) return null;

    return (
      <View style={styles(colors).searchContainer}>
        <View style={styles(colors).searchInputContainer}>
          <CustomIcon
            name="search-filled"
            size={20}
            color={colors.textMuted}
            style={styles(colors).searchIcon}
          />
          <TextInput
            style={styles(colors).searchInput}
            placeholder="Search meal plans..."
            placeholderTextColor={colors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoFocus={true}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity
              onPress={() => setSearchQuery("")}
              style={styles(colors).clearButton}
            >
              <CustomIcon
                name="close-circle"
                size={20}
                color={colors.textMuted}
              />
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  const renderContent = () => {
    if (loading && !refreshing) {
      return (
        <View style={styles(colors).loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles(colors).loadingText}>Loading meal plans...</Text>
        </View>
      );
    }

    if (error && !loading) {
      return (
        <View style={styles(colors).errorContainer}>
          <CustomIcon name="alert-circle" size={48} color={colors.error} />
          <Text style={styles(colors).errorTitle}>
            Oops! Something went wrong
          </Text>
          <Text style={styles(colors).errorText}>{error}</Text>
          <TouchableOpacity
            style={styles(colors).retryButton}
            onPress={() => loadTagData()}
          >
            <Text style={styles(colors).retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      );
    }

    const plansToShow = searchQuery.trim() ? filteredMealPlans : mealPlans;

    if (plansToShow.length === 0 && !loading) {
      return (
        <View style={styles(colors).emptyContainer}>
          <CustomIcon
            name={searchQuery.trim() ? "search-filled" : "utensils"}
            size={64}
            color={colors.textMuted}
          />
          <Text style={styles(colors).emptyTitle}>
            {searchQuery.trim()
              ? "No matching meal plans"
              : "No meal plans yet"}
          </Text>
          <Text style={styles(colors).emptyText}>
            {searchQuery.trim()
              ? "Try adjusting your search terms"
              : "Check back soon for new meal plans in this category!"}
          </Text>
          {searchQuery.trim() && (
            <TouchableOpacity
              style={styles(colors).clearSearchButton}
              onPress={() => setSearchQuery("")}
            >
              <Text style={styles(colors).clearSearchButtonText}>
                Clear Search
              </Text>
            </TouchableOpacity>
          )}
        </View>
      );
    }

    return (
      <View style={styles(colors).mealPlansSection}>
        {searchQuery.trim() && (
          <Text style={styles(colors).resultsHeader}>
            {plansToShow.length} result{plansToShow.length !== 1 ? "s" : ""} for
            "{searchQuery}"
          </Text>
        )}

        <View style={styles(colors).mealPlansGrid}>
          {plansToShow.map(renderMealPlanCard)}
        </View>

        {/* Load more button */}
        {hasMoreData && !searchQuery.trim() && (
          <TouchableOpacity
            style={styles(colors).loadMoreButton}
            onPress={loadMoreMealPlans}
            disabled={loadingMore}
          >
            {loadingMore ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <Text style={styles(colors).loadMoreText}>Load More</Text>
            )}
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles(colors).container}>
      <StatusBar barStyle="light-content" backgroundColor="#004432" />

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
            {tag?.name || initialTagName || "Tag"}
          </Text>
          <View style={styles(colors).headerActions}>
            <TouchableOpacity
              onPress={() => setShowSearch(!showSearch)}
              style={styles(colors).animatedHeaderActionButton}
            >
              <CustomIcon
                name={showSearch ? "close" : "search-filled"}
                size={20}
                color={colors.text}
              />
            </TouchableOpacity>
          </View>
        </View>
      </Animated.View>

      <Animated.ScrollView
        style={styles(colors).scrollView}
        showsVerticalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        onEndReached={loadMoreMealPlans}
        onEndReachedThreshold={0.1}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadTagData(true)}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
      >
        {renderHeader()}
        {renderSearchBar()}

        {/* Tag Information Section */}
        <View style={styles(colors).tagInfoSection}>
          <Text style={styles(colors).tagName}>
            {tag?.name || initialTagName || "Tag"}
          </Text>
          <Text style={styles(colors).tagSubtitle}>
            Category • Food • Meal Plans
          </Text>
          <View style={styles(colors).contactContainer}>
            <View style={styles(colors).contactRow}>
              <CustomIcon name="clock" size={16} color={colors.textSecondary} />
              <Text style={styles(colors).contactText}>
                {mealPlans.length} meal plan{mealPlans.length !== 1 ? "s" : ""}
              </Text>
            </View>
          </View>
        </View>

        {/* Duration Filter Pills */}
        {durationOptions.length > 0 && (
          <View style={styles(colors).durationFilterSection}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles(colors).durationOptionsContainer}
            >
              {/* All Plans Option */}
              <TouchableOpacity
                style={[
                  styles(colors).durationOption,
                  !selectedDuration && styles(colors).selectedDurationOption,
                ]}
                onPress={() => setSelectedDuration(null)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles(colors).durationOptionText,
                    !selectedDuration &&
                      styles(colors).selectedDurationOptionText,
                  ]}
                >
                  All Plans
                </Text>
              </TouchableOpacity>

              {/* Duration Options */}
              {durationOptions.map((duration) => (
                <TouchableOpacity
                  key={duration.id}
                  style={[
                    styles(colors).durationOption,
                    selectedDuration?.id === duration.id &&
                      styles(colors).selectedDurationOption,
                  ]}
                  onPress={() =>
                    setSelectedDuration(
                      selectedDuration?.id === duration.id ? null : duration
                    )
                  }
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles(colors).durationOptionText,
                      selectedDuration?.id === duration.id &&
                        styles(colors).selectedDurationOptionText,
                    ]}
                  >
                    {duration.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Bio Section */}
        <View style={styles(colors).bioSection}>
          <Text style={styles(colors).bioTitle}>Bio</Text>
          <Text style={styles(colors).bioText}>
            {tag?.description ||
              "Delicious meal plans carefully crafted for your healthy lifestyle. We offer fresh, nutritious options that make eating well simple and enjoyable."}
          </Text>
        </View>

        {renderContent()}

        {/* Ratings Section */}
        <View style={styles(colors).ratingsSection}>
          <View style={styles(colors).ratingsSectionHeader}>
            <Text style={styles(colors).ratingsTitle}>Reviews & Ratings</Text>
            <TouchableOpacity
              style={styles(colors).rateButton}
              onPress={() => setRatingModalVisible(true)}
            >
              <Text style={styles(colors).rateButtonText}>
                {userRating ? "Update your rating" : "Rate this tag"}
              </Text>
            </TouchableOpacity>
          </View>

          {ratingsLoading ? (
            <View style={styles(colors).ratingsLoadingContainer}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={styles(colors).ratingsLoadingText}>
                Loading ratings...
              </Text>
            </View>
          ) : (
            <>
              {(() => {
                const hasRatingStats = !!ratingStats;
                const totalRatings =
                  ratingStats?.data?.overallStats?.totalRatings || 0;
                const averageRating =
                  ratingStats?.data?.overallStats?.averageRating || 0;

                console.log("🔍 Rating display debug:", {
                  hasRatingStats,
                  totalRatings,
                  averageRating,
                  existingRatingsLength: existingRatings.length,
                });

                // Show ratings if we have rating stats OR if we have existing ratings
                const shouldShowRatings =
                  hasRatingStats || existingRatings.length > 0;

                if (!shouldShowRatings) {
                  return (
                    <View style={styles(colors).ratingStatsContainer}>
                      <Text style={styles(colors).noRatingsText}>
                        No ratings yet
                      </Text>
                      <Text style={styles(colors).noRatingsSubtext}>
                        Be the first to rate this tag!
                      </Text>
                    </View>
                  );
                }

                return (
                  <View style={styles(colors).ratingStatsContainer}>
                    <View style={styles(colors).ratingOverview}>
                      <View style={styles(colors).ratingAverageContainer}>
                        <Text style={styles(colors).ratingAverageNumber}>
                          {ratingStats?.data?.overallStats?.averageRating
                            ? ratingStats.data.overallStats.averageRating.toFixed(
                                1
                              )
                            : "0.0"}
                        </Text>
                        <View style={styles(colors).starsContainer}>
                          {[1, 2, 3, 4, 5].map((star) => (
                            <CustomIcon
                              key={star}
                              name={
                                star <=
                                Math.round(
                                  ratingStats?.data?.overallStats
                                    ?.averageRating || 0
                                )
                                  ? "star-filled"
                                  : star <=
                                    (ratingStats?.data?.overallStats
                                      ?.averageRating || 0)
                                  ? "star-half"
                                  : "star-outline"
                              }
                              size={16}
                              color={
                                star <=
                                  ratingStats?.data?.overallStats
                                    ?.averageRating || 0
                                  ? colors.rating
                                  : colors.textMuted
                              }
                            />
                          ))}
                        </View>
                        <Text style={styles(colors).ratingCount}>
                          {formatApproximateNumber(
                            ratingStats?.data?.overallStats?.totalRatings ||
                              existingRatings.length ||
                              0
                          )}{" "}
                          rating
                          {(ratingStats?.data?.overallStats?.totalRatings ||
                            existingRatings.length ||
                            0) !== 1
                            ? "s"
                            : ""}
                        </Text>
                      </View>

                      <View style={styles(colors).ratingDistribution}>
                        {[5, 4, 3, 2, 1].map((rating) => {
                          const count =
                            ratingStats?.data?.overallStats?.ratingCounts?.[
                              rating.toString()
                            ] || 0;
                          const percentage =
                            (ratingStats?.data?.overallStats?.totalRatings ||
                              0) > 0
                              ? (count /
                                  (ratingStats?.data?.overallStats
                                    ?.totalRatings || 1)) *
                                100
                              : 0;

                          return (
                            <View
                              key={rating}
                              style={styles(colors).ratingDistributionRow}
                            >
                              <Text
                                style={styles(colors).ratingDistributionStar}
                              >
                                {rating}
                              </Text>
                              <CustomIcon
                                name="star-filled"
                                size={12}
                                color={colors.rating}
                              />
                              <View
                                style={styles(colors).ratingDistributionBar}
                              >
                                <View
                                  style={[
                                    styles(colors).ratingDistributionFill,
                                    { width: `${percentage}%` },
                                  ]}
                                />
                              </View>
                              <Text
                                style={styles(colors).ratingDistributionCount}
                              >
                                {count}
                              </Text>
                            </View>
                          );
                        })}
                      </View>
                    </View>
                  </View>
                );
              })()}

              {/* Recent Reviews */}
              {existingRatings.length > 0 && (
                <View style={styles(colors).recentReviewsContainer}>
                  <Text style={styles(colors).recentReviewsTitle}>
                    Recent Reviews
                  </Text>
                  {existingRatings.slice(0, 3).map((rating) => {
                    return (
                      <RatingDisplay
                        key={rating._id}
                        ratings={[rating]}
                        showFullReview={false}
                        style={styles(colors).ratingDisplayItem}
                      />
                    );
                  })}

                  {ratingStats?.data?.overallStats?.totalRatings ||
                  existingRatings.length > 3 ? (
                    <TouchableOpacity
                      style={styles(colors).viewAllReviewsButton}
                    >
                      <Text style={styles(colors).viewAllReviewsText}>
                        View all reviews
                      </Text>
                    </TouchableOpacity>
                  ) : null}
                </View>
              )}
            </>
          )}
        </View>

        <View style={styles(colors).bottomPadding} />
      </Animated.ScrollView>

      {/* Rating Modal */}
      <RatingModal
        visible={ratingModalVisible}
        onClose={() => setRatingModalVisible(false)}
        onSubmit={handleRatingSubmit}
        entityType="tag"
        entityId={tag?._id || tagId}
        entityName={tag?.name || initialTagName}
        existingRating={userRating}
        ratingType="tag"
      />
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
    heroWrapper: {
      position: "relative",
      backgroundColor: "#004432",
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
      backgroundColor: colors.primary2,
      justifyContent: "center",
      alignItems: "center",
    },
    headerActions: {
      flexDirection: "row",
      gap: 12,
    },
    headerActionButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.black,
      justifyContent: "center",
      alignItems: "center",
      borderWidth: 1,
      borderColor: "#1b1b1b",
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
    tagImageContainer: {
      position: "absolute",
      bottom: -40, // Half of the circle height to position it at the middle-bottom
      left: width / 2 - 40, // Center horizontally
      width: 80,
      height: 80,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.2,
      shadowRadius: 8,
      elevation: 8,
      zIndex: 20,
    },
    tagImageCircle: {
      width: 80,
      height: 80,
      borderRadius: 40,
    },
    tagInfoSection: {
      backgroundColor: colors.background,
      paddingHorizontal: 20,
      paddingVertical: 20,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    tagName: {
      fontSize: 24,
      fontWeight: "700",
      color: colors.text,
      marginBottom: 8,
    },
    tagSubtitle: {
      fontSize: 14,
      color: colors.textSecondary,
      marginBottom: 12,
    },
    contactContainer: {
      alignItems: "flex-start",
      width: "100%",
    },
    contactRow: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 8,
    },
    contactText: {
      fontSize: 14,
      color: colors.textSecondary,
      marginLeft: 8,
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
    animatedHeaderActionButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.cardBackground,
      justifyContent: "center",
      alignItems: "center",
    },
    searchContainer: {
      paddingHorizontal: 20,
      paddingVertical: 15,
      backgroundColor: colors.background,
    },
    searchInputContainer: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.cardBackground,
      borderRadius: THEME.borderRadius.xxl,
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
    clearButton: {
      padding: 4,
    },
    mealPlansSection: {
      paddingHorizontal: 20,
      paddingVertical: 20,
    },
    resultsHeader: {
      fontSize: 16,
      fontWeight: "500",
      color: colors.text,
      marginBottom: 20,
    },
    mealPlansGrid: {
      gap: 20,
    },
    loadMoreButton: {
      backgroundColor: colors.cardBackground,
      paddingVertical: 15,
      paddingHorizontal: 20,
      borderRadius: THEME.borderRadius.medium,
      alignItems: "center",
      marginTop: 20,
      borderWidth: 1,
      borderColor: colors.border,
    },
    loadMoreText: {
      fontSize: 16,
      fontWeight: "600",
      color: colors.primary,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      paddingVertical: 60,
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
      paddingVertical: 60,
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
      paddingVertical: 60,
      paddingHorizontal: 20,
    },
    emptyTitle: {
      fontSize: 20,
      fontWeight: "600",
      color: colors.text,
      marginTop: 20,
      marginBottom: 8,
      textAlign: "center",
    },
    emptyText: {
      fontSize: 16,
      color: colors.textSecondary,
      textAlign: "center",
      lineHeight: 24,
    },
    clearSearchButton: {
      backgroundColor: colors.primary,
      paddingHorizontal: 20,
      paddingVertical: 10,
      borderRadius: THEME.borderRadius.medium,
      marginTop: 16,
    },
    clearSearchButtonText: {
      color: colors.white,
      fontSize: 14,
      fontWeight: "600",
    },
    durationFilterSection: {
      backgroundColor: colors.background,
      paddingVertical: 15,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    durationOptionsContainer: {
      paddingHorizontal: 20,
      paddingRight: 40, // Extra padding for last item
    },
    durationOption: {
      backgroundColor: colors.background,
      borderRadius: 42,
      paddingVertical: 10,
      paddingHorizontal: 16,
      marginRight: 12,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: "center",
      minWidth: 80,
    },
    selectedDurationOption: {
      backgroundColor: colors.text3,
      borderColor: colors.text3,
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.3,
      shadowRadius: 4,
      elevation: 3,
    },
    durationOptionText: {
      fontSize: 12,
      fontWeight: "600",
      color: colors.text,
    },
    selectedDurationOptionText: {
      color: colors.background,
    },
    bioSection: {
      backgroundColor: colors.background,
      paddingHorizontal: 20,
      paddingVertical: 20,
    },
    bioTitle: {
      fontSize: 18,
      fontWeight: "600",
      color: colors.text,
      marginBottom: 12,
    },
    bioText: {
      fontSize: 14,
      color: colors.textSecondary,
      lineHeight: 20,
    },
    ratingsSection: {
      backgroundColor: colors.background,
      paddingHorizontal: 20,
      paddingVertical: 20,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    ratingsSectionHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 20,
    },
    ratingsTitle: {
      fontSize: 18,
      fontWeight: "600",
      color: colors.text,
    },
    rateButton: {
      backgroundColor: colors.primary,
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: THEME.borderRadius.medium,
    },
    rateButtonText: {
      color: "#004432",
      fontSize: 12,
      fontWeight: "600",
    },
    ratingsLoadingContainer: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 20,
    },
    ratingsLoadingText: {
      marginLeft: 12,
      fontSize: 14,
      color: colors.textSecondary,
    },
    ratingStatsContainer: {
      marginBottom: 20,
    },
    ratingOverview: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-start",
    },
    ratingAverageContainer: {
      alignItems: "center",
      flex: 1,
    },
    ratingAverageNumber: {
      fontSize: 48,
      fontWeight: "700",
      color: colors.text,
      lineHeight: 56,
    },
    starsContainer: {
      flexDirection: "row",
      marginVertical: 8,
      gap: 2,
    },
    ratingCount: {
      fontSize: 12,
      color: colors.textSecondary,
      textAlign: "center",
    },
    ratingDistribution: {
      flex: 2,
      marginLeft: 20,
    },
    ratingDistributionRow: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 4,
    },
    ratingDistributionStar: {
      fontSize: 12,
      color: colors.text,
      width: 12,
    },
    ratingDistributionBar: {
      flex: 1,
      height: 8,
      backgroundColor: colors.border,
      borderRadius: 4,
      marginHorizontal: 8,
      overflow: "hidden",
    },
    ratingDistributionFill: {
      height: "100%",
      backgroundColor: colors.rating,
      borderRadius: 4,
    },
    ratingDistributionCount: {
      fontSize: 12,
      color: colors.textSecondary,
      width: 20,
      textAlign: "right",
    },
    noRatingsText: {
      fontSize: 16,
      color: colors.textSecondary,
      textAlign: "center",
      marginBottom: 4,
    },
    noRatingsSubtext: {
      fontSize: 14,
      color: colors.textMuted,
      textAlign: "center",
    },
    recentReviewsContainer: {
      marginTop: 20,
    },
    recentReviewsTitle: {
      fontSize: 16,
      fontWeight: "600",
      color: colors.text,
      marginBottom: 16,
    },
    ratingDisplayItem: {
      marginBottom: 16,
    },
    viewAllReviewsButton: {
      alignSelf: "center",
      paddingVertical: 8,
      paddingHorizontal: 16,
    },
    viewAllReviewsText: {
      fontSize: 14,
      color: colors.primary,
      fontWeight: "500",
    },
    bottomPadding: {
      height: 70,
    },
  });

export default TagScreen;
