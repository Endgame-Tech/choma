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

const { width } = Dimensions.get("window");

const TagScreen = ({ navigation, route }) => {
  const { colors } = useTheme();
  const { user } = useAuth();
  const { toggleBookmark, isBookmarked } = useBookmarks();

  // Route params
  const { tagId, tagName: initialTagName } = route.params;

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

  // Animation
  const scrollY = useRef(new Animated.Value(0)).current;
  const headerOpacity = scrollY.interpolate({
    inputRange: [0, 100],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  // Load initial data
  useEffect(() => {
    loadTagData();
  }, [tagId]);

  // Filter meal plans based on search
  useEffect(() => {
    if (searchQuery.trim()) {
      const filtered = mealPlans.filter(plan =>
        plan.planName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        plan.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        plan.description?.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredMealPlans(filtered);
    } else {
      setFilteredMealPlans(mealPlans);
    }
  }, [searchQuery, mealPlans]);

  // Load discount data
  useEffect(() => {
    fetchDiscountData();
  }, [user, mealPlans]);

  const loadTagData = useCallback(async (isRefresh = false) => {
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
        tagService.getMealPlansByTag(tagId, 1, 20)
      ]);

      if (tagResponse) {
        setTag(tagResponse);
      }

      if (mealPlansResponse?.data) {
        setMealPlans(mealPlansResponse.data.mealPlans || []);
        setHasMoreData(mealPlansResponse.data.pagination?.hasNext || false);
        setCurrentPage(2);
      }
    } catch (err) {
      console.error("Error loading tag data:", err);
      setError(err.message || "Failed to load tag data");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [tagId]);

  const loadMoreMealPlans = useCallback(async () => {
    if (!hasMoreData || loadingMore) return;

    try {
      setLoadingMore(true);
      const response = await tagService.getMealPlansByTag(tagId, currentPage, 20);

      if (response?.data?.mealPlans) {
        setMealPlans(prev => [...prev, ...response.data.mealPlans]);
        setHasMoreData(response.data.pagination?.hasNext || false);
        setCurrentPage(prev => prev + 1);
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
        colors={["#652815", "#7A2E18"]}
        style={styles(colors).heroBackground}
      >
        {/* Navigation Header */}
        <View style={styles(colors).navigationHeader}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles(colors).backButton}
          >
            <CustomIcon name="chevron-left" size={24} color="#FFFFFF" />
          </TouchableOpacity>

          <View style={styles(colors).headerActions}>
            <TouchableOpacity
              onPress={() => setShowSearch(!showSearch)}
              style={styles(colors).headerActionButton}
            >
              <CustomIcon
                name={showSearch ? "close" : "search-filled"}
                size={20}
                color="#FFFFFF"
              />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {/* Add share functionality */}}
              style={styles(colors).headerActionButton}
            >
              <CustomIcon name="share" size={20} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Hero Content */}
        <View style={styles(colors).heroContent}>
          <View style={styles(colors).heroImageContainer}>
            <Image
              source={getTagImage(true)}
              style={styles(colors).heroImage}
              resizeMode="cover"
            />
          </View>

          <View style={styles(colors).heroTextContainer}>
            <Text style={styles(colors).tagName}>
              {tag?.name || initialTagName || "Tag"}
            </Text>
            <Text style={styles(colors).tagDescription}>
              {tag?.description || "Discover amazing meal plans in this category"}
            </Text>
            <View style={styles(colors).mealCountContainer}>
              <CustomIcon name="utensils" size={16} color="#F9B87A" />
              <Text style={styles(colors).mealCountText}>
                {mealPlans.length} meal plan{mealPlans.length !== 1 ? 's' : ''}
              </Text>
            </View>
          </View>
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
          <Text style={styles(colors).errorTitle}>Oops! Something went wrong</Text>
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
            {searchQuery.trim() ? "No matching meal plans" : "No meal plans yet"}
          </Text>
          <Text style={styles(colors).emptyText}>
            {searchQuery.trim()
              ? "Try adjusting your search terms"
              : "Check back soon for new meal plans in this category!"
            }
          </Text>
          {searchQuery.trim() && (
            <TouchableOpacity
              style={styles(colors).clearSearchButton}
              onPress={() => setSearchQuery("")}
            >
              <Text style={styles(colors).clearSearchButtonText}>Clear Search</Text>
            </TouchableOpacity>
          )}
        </View>
      );
    }

    return (
      <View style={styles(colors).mealPlansSection}>
        {searchQuery.trim() && (
          <Text style={styles(colors).resultsHeader}>
            {plansToShow.length} result{plansToShow.length !== 1 ? 's' : ''} for "{searchQuery}"
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
      <StatusBar barStyle="light-content" backgroundColor="#652815" />

      {/* Animated Header Overlay */}
      <Animated.View
        style={[
          styles(colors).animatedHeader,
          { opacity: headerOpacity }
        ]}
      >
        <View style={styles(colors).animatedHeaderContent}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles(colors).backButton}
          >
            <CustomIcon name="chevron-left" size={24} color={colors.text} />
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
    },
    heroWrapper: {
      position: "relative",
      backgroundColor: "#652815",
    },
    heroBackground: {
      paddingTop: 20,
      paddingBottom: 40,
      paddingHorizontal: 20,
    },
    navigationHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 30,
    },
    backButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: "rgba(255, 255, 255, 0.2)",
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
      backgroundColor: "rgba(255, 255, 255, 0.2)",
      justifyContent: "center",
      alignItems: "center",
    },
    heroContent: {
      alignItems: "center",
    },
    heroImageContainer: {
      width: 120,
      height: 120,
      borderRadius: 60,
      borderWidth: 3,
      borderColor: "#FFFFFF",
      overflow: "hidden",
      marginBottom: 20,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 8,
    },
    heroImage: {
      width: "100%",
      height: "100%",
    },
    heroTextContainer: {
      alignItems: "center",
      paddingHorizontal: 20,
    },
    tagName: {
      fontSize: 28,
      fontWeight: "700",
      color: "#FFFFFF",
      textAlign: "center",
      marginBottom: 8,
    },
    tagDescription: {
      fontSize: 16,
      color: "#F9B87A",
      textAlign: "center",
      lineHeight: 22,
      marginBottom: 16,
    },
    mealCountContainer: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: "rgba(255, 255, 255, 0.2)",
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 20,
    },
    mealCountText: {
      fontSize: 14,
      color: "#FFFFFF",
      fontWeight: "500",
      marginLeft: 6,
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
    bottomPadding: {
      height: 120,
    },
  });

export default TagScreen;