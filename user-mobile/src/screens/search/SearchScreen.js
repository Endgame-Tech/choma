// src/screens/search/SearchScreen.js - Enhanced search with HomeScreen layout (excluding subscriptions)
import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  TextInput,
  Dimensions,
  StatusBar,
  RefreshControl,
  ActivityIndicator,
  Modal,
  LayoutAnimation,
  UIManager,
  Platform,
  Animated,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useSafeAreaInsets } from "react-native-safe-area-context";
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
import CustomText from "../../components/ui/CustomText";
import { DMSansFonts } from "../../constants/fonts";
import { createStylesWithDMSans } from "../../utils/fontUtils";
import TagFilterBar from "../../components/home/TagFilterBar";
import tagService from "../../services/tagService";
import PopularPlanCard from "../../components/meal-plans/PopularPlanCard";
import { usePopularMealPlans } from "../../hooks/usePopularMealPlans";
import MealPlanCard from "../../components/meal-plans/MealPlanCard";
import TagMealPlanCard from "../../components/meal-plans/TagMealPlanCard";
import FilterModal from "../../components/meal-plans/FilterModal";

const { width } = Dimensions.get("window");

// Enable LayoutAnimation on Android
if (
  Platform.OS === "android" &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const SearchScreen = ({ navigation }) => {
  const { isDark, colors } = useTheme();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const {
    showSuccess,
    showError,
    showDeleteConfirm,
    showPaymentSuccess,
    showUpdateReminder,
    showRetryError,
  } = useAlert();
  const [selectedCategory, setSelectedCategory] = useState("All Plans");
  const [searchQuery, setSearchQuery] = useState("");

  // Discount state
  const [discountData, setDiscountData] = useState({});
  const [discountLoading, setDiscountLoading] = useState(true);
  const [currentPopularIndex, setCurrentPopularIndex] = useState(0);
  const [currentBannerIndex, setCurrentBannerIndex] = useState(0);
  const popularScrollRef = useRef(null);
  const bannerScrollRef = useRef(null);

  // Search-specific state
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchHistory, setSearchHistory] = useState([]);
  const [popularSearches, setPopularSearches] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(true);

  const { mealPlans, loading, error, refreshing, refreshMealPlans } =
    useMealPlans();
  const {
    popularPlans,
    loading: popularLoading,
    error: popularError,
    refreshing: popularRefreshing,
    refreshPopularPlans,
  } = usePopularMealPlans();
  const { toggleBookmark, isBookmarked } = useBookmarks();
  const [banners, setBanners] = useState([]);
  const [bannersLoading, setBannersLoading] = useState(true);

  // HomeScreen state variables (excluding subscription-related)
  const [showTutorial, setShowTutorial] = useState(false);
  const [isUserInteracting, setIsUserInteracting] = useState(false);
  const [trackedImpressions, setTrackedImpressions] = useState(new Set());
  const [selectedWeek, setSelectedWeek] = useState(null);
  const [filteredMealPlans, setFilteredMealPlans] = useState([]);
  const [showAddressModal, setShowAddressModal] = useState(false);
  const bannerIntervalRef = useRef(null);

  // Filter state management
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [activeFilters, setActiveFilters] = useState({});
  const [targetAudiences, setTargetAudiences] = useState([]);

  // Tag filtering state
  const [selectedTagId, setSelectedTagId] = useState(null);
  const [selectedTag, setSelectedTag] = useState(null);

  // Scroll to top state
  const [showScrollToTop, setShowScrollToTop] = useState(false);
  const scrollViewRef = useRef(null);
  const scrollToTopOpacity = useRef(new Animated.Value(0)).current;

  const hasActiveFilters = Object.keys(activeFilters).some((key) => {
    const value = activeFilters[key];
    if (key === "audiences") return value && value.length > 0;
    if (key === "priceRange")
      return value && (value[0] > 0 || value[1] < 50000);
    if (key === "sortBy") return value && value !== "popularity";
    if (key === "duration") return value !== null;
    return false;
  });

  // Load search history, popular searches, and target audiences
  useEffect(() => {
    loadSearchData();
    loadTargetAudiences();
  }, []);

  // Fetch discount data for search results and popular plans
  useEffect(() => {
    const fetchDiscountData = async () => {
      if (!user) {
        setDiscountLoading(false);
        return;
      }

      try {
        setDiscountLoading(true);
        console.log("💰 Fetching discount data for search/popular plans");

        const discounts = {};

        // Fetch discount for search results
        if (searchResults && searchResults.length > 0) {
          for (const plan of searchResults) {
            try {
              const discount = await discountService.calculateDiscount(
                user,
                plan
              );
              discounts[plan.id || plan._id] = discount;
            } catch (error) {
              console.error(
                `Error calculating discount for search result plan ${plan.id}:`,
                error
              );
              discounts[plan.id || plan._id] = {
                discountPercent: 0,
                discountAmount: 0,
                reason: "No discount available",
              };
            }
          }
        }

        // Fetch discount for popular plans (shown when no search)
        if (mealPlans && mealPlans.length > 0) {
          for (const plan of mealPlans.slice(0, 3)) {
            try {
              const discount = await discountService.calculateDiscount(
                user,
                plan
              );
              discounts[plan._id || plan.id] = discount;
            } catch (error) {
              console.error(
                `Error calculating discount for popular plan ${
                  plan._id || plan.id
                }:`,
                error
              );
              discounts[plan._id || plan.id] = {
                discountPercent: 0,
                discountAmount: 0,
                reason: "No discount available",
              };
            }
          }
        }

        console.log("💰 Search discount data fetched:", discounts);
        setDiscountData(discounts);
      } catch (error) {
        console.error("Error fetching discount data for search:", error);
        setDiscountData({});
      } finally {
        setDiscountLoading(false);
      }
    };

    fetchDiscountData();
  }, [user, searchResults, mealPlans]);

  // Helper function to set fallback popular searches from actual meal plans
  const setFallbackPopularSearches = async () => {
    try {
      // Get available meal plans and use their names
      const mealPlansResponse = await apiService.getMealPlans();
      if (mealPlansResponse?.success && Array.isArray(mealPlansResponse.data)) {
        const mealPlanNames = mealPlansResponse.data
          .filter((plan) => plan?.planName || plan?.name) // Only plans with names
          .slice(0, 3) // Take first 5
          .map((plan) => plan.planName || plan.name);

        if (mealPlanNames.length > 0) {
          console.log(
            "📋 Using meal plan names as popular searches:",
            mealPlanNames
          );
          setPopularSearches(mealPlanNames);
          return;
        }
      }
    } catch (error) {
      console.log("Could not fetch meal plans for fallback searches:", error);
    }

    // Final fallback to meal plan-like names if API fails
    console.log("📋 Using final fallback popular searches");
    setPopularSearches([
      "FitFuel Plan",
      "Wellness Hub",
      "Recharge Plan",
      "HealthyFam Plan",
      "Premium Plan",
    ]);
  };

  const loadSearchData = async () => {
    try {
      setHistoryLoading(true);

      // Load local search history
      const storedHistory = await AsyncStorage.getItem("searchHistory");
      if (storedHistory) {
        const parsedHistory = JSON.parse(storedHistory);
        setSearchHistory(parsedHistory.slice(0, 3)); // Keep only last 5 searches
      }

      // Load popular searches from backend (or fallback to meal plan names)
      try {
        const response = await apiService.getPopularSearches?.();
        if (response?.success && Array.isArray(response.data)) {
          setPopularSearches(response.data);
        } else {
          // Fallback: use actual meal plan names from available meal plans
          await setFallbackPopularSearches();
        }
      } catch (error) {
        console.log(
          "Popular searches not available, using fallback from meal plans"
        );
        await setFallbackPopularSearches();
      }
    } catch (error) {
      console.error("Error loading search data:", error);
      // Use the same fallback function for consistency
      await setFallbackPopularSearches();
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleSearch = async (query, filters = activeFilters) => {
    setSearchQuery(query);
    if (!query.trim() && !hasActiveFilters) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);

    try {
      // Use enhanced search API with filters
      const response = await apiService.searchMealPlans(query, filters);
      if (response?.success && response.data) {
        setSearchResults(response.data);
      } else {
        // Fallback to local filtering
        const filteredResults = performLocalSearch(query, filters);
        setSearchResults(filteredResults);
      }

      // Save search query to history
      if (query.trim()) {
        await saveSearchToHistory(query);
      }
    } catch (error) {
      console.error("Search error:", error);
      // Fallback to local filtering on error
      const filteredResults = performLocalSearch(query, filters);
      setSearchResults(filteredResults);
    } finally {
      setIsSearching(false);
    }
  };

  // Handle tag selection
  const handleTagSelect = async (tagId, tag) => {
    setSelectedTagId(tagId);
    setSelectedTag(tag);

    if (tagId) {
      // If a tag is selected, fetch meal plans for that tag
      setIsSearching(true);
      try {
        const response = await tagService.getMealPlansByTag(tagId);
        if (response.success && response.data) {
          setSearchResults(response.data);
        } else {
          setSearchResults([]);
        }
      } catch (error) {
        console.error("Error fetching meal plans by tag:", error);
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    } else {
      // If no tag selected, clear search results or show all plans
      if (searchQuery.trim()) {
        await handleSearch(searchQuery, activeFilters);
      } else {
        setSearchResults([]);
      }
    }
  };

  const saveSearchToHistory = async (query) => {
    try {
      const trimmedQuery = query.trim();
      if (!trimmedQuery) return;

      // Add to local history (avoid duplicates)
      const updatedHistory = [
        trimmedQuery,
        ...searchHistory.filter((item) => item !== trimmedQuery),
      ].slice(0, 3);
      setSearchHistory(updatedHistory);

      // Save to AsyncStorage
      await AsyncStorage.setItem(
        "searchHistory",
        JSON.stringify(updatedHistory)
      );
    } catch (error) {
      console.error("Error saving search history:", error);
    }
  };

  const loadTargetAudiences = async () => {
    try {
      const response = await apiService.getTargetAudiences();
      if (response?.success && response.data) {
        setTargetAudiences(response.data);
      }
    } catch (error) {
      console.error("Error loading target audiences:", error);
    }
  };

  // Prefer the most complete description field available for cards
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

  const performLocalSearch = (query, filters) => {
    let results = Array.isArray(mealPlans) ? [...mealPlans] : [];

    // Filter by search query
    if (query.trim()) {
      const searchTerm = query.toLowerCase();
      results = results.filter(
        (plan) =>
          plan.planName?.toLowerCase().includes(searchTerm) ||
          plan.name?.toLowerCase().includes(searchTerm) ||
          plan.description?.toLowerCase().includes(searchTerm) ||
          plan.targetAudience?.toLowerCase().includes(searchTerm) ||
          plan.category?.toLowerCase().includes(searchTerm)
      );
    }

    // Apply filters
    if (filters.audiences && filters.audiences.length > 0) {
      results = results.filter((plan) =>
        filters.audiences.includes(plan.targetAudience)
      );
    }

    if (filters.priceRange) {
      results = results.filter((plan) => {
        const price = plan.totalPrice || plan.basePrice || plan.price || 0;
        return price >= filters.priceRange[0] && price <= filters.priceRange[1];
      });
    }

    // Sort results
    if (filters.sortBy) {
      switch (filters.sortBy) {
        case "price-low":
          results.sort(
            (a, b) =>
              (a.totalPrice || a.price || 0) - (b.totalPrice || b.price || 0)
          );
          break;
        case "price-high":
          results.sort(
            (a, b) =>
              (b.totalPrice || b.price || 0) - (a.totalPrice || a.price || 0)
          );
          break;
        case "newest":
          results.sort(
            (a, b) =>
              new Date(b.createdDate || b.createdAt) -
              new Date(a.createdDate || a.createdAt)
          );
          break;
        case "rating":
          results.sort((a, b) => (b.avgRating || 0) - (a.avgRating || 0));
          break;
        default: // popularity
          results.sort(
            (a, b) => (b.totalSubscriptions || 0) - (a.totalSubscriptions || 0)
          );
      }
    }

    return results;
  };

  const handleApplyFilters = async (filters) => {
    setActiveFilters(filters);
    if (searchQuery.trim() || Object.keys(filters).length > 0) {
      await handleSearch(searchQuery, filters);
    }
  };

  const clearAllFilters = () => {
    setActiveFilters({});
    if (searchQuery.trim()) {
      handleSearch(searchQuery, {});
    } else {
      setSearchResults([]);
    }
  };

  const clearSearch = () => {
    setSearchQuery("");
    setSearchResults([]);
    setActiveFilters({});
  };

  const getActiveFiltersCount = () => {
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
  };

  // HomeScreen functions (excluding subscription-related ones)
  useEffect(() => {
    loadPublicDashboardData();
  }, []);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setDiscountLoading(false);
    }, 5000);
    return () => clearTimeout(timeoutId);
  }, [user]);

  // Fetch discount data for meal plans
  useEffect(() => {
    const fetchDiscountData = async () => {
      if (!user || !mealPlans || mealPlans.length === 0) {
        setDiscountLoading(false);
        return;
      }

      try {
        setDiscountLoading(true);
        console.log("💰 Fetching discount data for meal plans");

        const discounts = {};
        for (const plan of mealPlans) {
          try {
            const discount = await discountService.calculateDiscount(
              user,
              plan
            );
            discounts[plan._id || plan.id] = discount;
          } catch (error) {
            console.error(
              `Error calculating discount for plan ${plan._id || plan.id}:`,
              error
            );
            discounts[plan._id || plan.id] = {
              discountPercent: 0,
              discountAmount: 0,
              reason: "No discount available",
            };
          }
        }

        console.log("💰 Discount data fetched:", discounts);
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

  // Load public dashboard data (banners, etc.)
  const loadPublicDashboardData = async (forceRefresh = false) => {
    try {
      console.log("🔄 Loading public dashboard data...");
      setBannersLoading(true);

      const bannersResult = await apiService.getActiveBanners();
      console.log("🎯 Banner API response:", bannersResult);
      if (
        bannersResult &&
        bannersResult.success &&
        bannersResult.data &&
        bannersResult.data.data
      ) {
        console.log("🎯 Banner data:", bannersResult.data.data);
        setBanners(bannersResult.data.data);
        console.log("🎯 Banners loaded:", bannersResult.data.data.length);
      } else {
        console.log("🎯 No banners received, setting empty array");
        setBanners([]);
      }
    } catch (error) {
      console.error("❌ Error loading public dashboard data:", error);
    } finally {
      setBannersLoading(false);
    }
  };

  const handleAddressChange = async (newAddress) => {
    try {
      setShowAddressModal(false);
      // Handle address change logic here
      console.log("Address changed to:", newAddress);
    } catch (error) {
      console.error("Error updating address:", error);
    }
  };

  // Helper functions

  const renderPopularPlanCard = (plan, index) => {
    return (
      <PopularPlanCard
        key={plan.id || plan._id}
        plan={plan}
        onPress={() => navigation.navigate("MealPlanDetail", { bundle: plan })}
        onBookmarkPress={() => toggleBookmark(plan.id || plan._id)}
        isBookmarked={isBookmarked(plan.id || plan._id)}
        discountData={discountData}
        getPlanDescription={getPlanDescription}
      />
    );
  };

  const renderMealPlanCard = (plan) => {
    return (
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
  };

  const renderTagMealPlanCard = (plan) => {
    return (
      <TagMealPlanCard
        key={plan.id || plan._id}
        plan={plan}
        onPress={() => navigation.navigate("MealPlanDetail", { bundle: plan })}
        onBookmarkPress={() => toggleBookmark(plan.id || plan._id)}
        isBookmarked={isBookmarked(plan.id || plan._id)}
        discountData={discountData}
        getPlanDescription={getPlanDescription}
      />
    );
  };

  const renderMixedMealPlanFeed = (plans) => {
    if (!plans || plans.length === 0) return null;

    if (selectedTagId) {
      return plans.map((plan) => renderTagMealPlanCard(plan));
    }

    return plans.map((plan) => renderMealPlanCard(plan));
  };

  // Tag handling functions

  const handleWeekSelect = (week) => {
    setSelectedWeek(week);
    console.log("Week selected:", week);
  };

  // Scroll to top functionality
  const handleScroll = (event) => {
    const scrollY = event.nativeEvent.contentOffset.y;
    const shouldShow = scrollY > 300; // Show button after scrolling 300px

    if (shouldShow !== showScrollToTop) {
      setShowScrollToTop(shouldShow);
      Animated.timing(scrollToTopOpacity, {
        toValue: shouldShow ? 1 : 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  };

  const scrollToTop = () => {
    scrollViewRef.current?.scrollTo({
      y: 0,
      animated: true,
    });
  };

  // Banner rendering functions
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
                {/* Full-size banner image */}
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
          activeOpacity={0.9}
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
        ref={scrollViewRef}
        stickyHeaderIndices={[1]} // Make the search bar sticky (index 1 after banners)
        style={styles(colors).scrollView}
        showsVerticalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        refreshControl={
          <RefreshControl
            refreshing={refreshing || discountLoading}
            onRefresh={() => {
              refreshMealPlans();
              loadPublicDashboardData(true);
            }}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
      >
        {/* Promo Banners - Always present to maintain consistent sticky index */}
        <View>{renderPromoBanners()}</View>

        {/* Enhanced Search Input - This will be sticky */}
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
              placeholder="Search for meal plans..."
              placeholderTextColor={colors.textMuted}
              value={searchQuery}
              onChangeText={handleSearch}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity
                onPress={clearSearch}
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
        {/* Search Results Section - Prominent when searching */}
        {searchQuery.length > 0 ? (
          <>
            {/* Tag Filter Bar */}
            <TagFilterBar
              onTagSelect={handleTagSelect}
              selectedTagId={selectedTagId}
              navigation={navigation}
            />

            {/* Active Filters Display */}
            {hasActiveFilters && (
              <View style={styles(colors).activeFiltersContainer}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={styles(colors).filtersRow}>
                    {activeFilters.audiences &&
                      activeFilters.audiences.length > 0 && (
                        <View style={styles(colors).activeFilterChip}>
                          <Text style={styles(colors).activeFilterText}>
                            {activeFilters.audiences.length} Audience
                            {activeFilters.audiences.length > 1 ? "s" : ""}
                          </Text>
                          <TouchableOpacity
                            onPress={() => {
                              const newFilters = { ...activeFilters };
                              delete newFilters.audiences;
                              handleApplyFilters(newFilters);
                            }}
                          >
                            <CustomIcon
                              name="close"
                              size={16}
                              color={colors.primary}
                            />
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
                            onPress={() => {
                              const newFilters = { ...activeFilters };
                              delete newFilters.priceRange;
                              handleApplyFilters(newFilters);
                            }}
                          >
                            <CustomIcon
                              name="close"
                              size={16}
                              color={colors.primary}
                            />
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
                  </View>
                </ScrollView>
              </View>
            )}

            {/* Search Results */}
            {isSearching ? (
              <View style={styles(colors).loadingContainer}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={styles(colors).loadingText}>Searching...</Text>
              </View>
            ) : searchResults.length > 0 ? (
              <View style={styles(colors).section}>
                <Text style={styles(colors).resultsHeader}>
                  {searchResults.length} result
                  {searchResults.length !== 1 ? "s" : ""} found
                  {searchQuery.trim() && ` for "${searchQuery.trim()}"`}
                </Text>
                <View style={styles(colors).mealplansGrid}>
                  {searchResults.map((plan) => (
                    <MealPlanCard
                      key={plan.id || plan._id}
                      plan={plan}
                      onPress={() =>
                        navigation.navigate("MealPlanDetail", { bundle: plan })
                      }
                      onBookmarkPress={() =>
                        toggleBookmark(plan.id || plan._id)
                      }
                      isBookmarked={isBookmarked(plan.id || plan._id)}
                      discountData={discountData}
                      getPlanDescription={getPlanDescription}
                    />
                  ))}
                </View>
              </View>
            ) : (
              <View style={styles(colors).emptyResults}>
                <CustomIcon
                  name="search-filled"
                  size={64}
                  color={colors.textMuted}
                />
                <Text style={styles(colors).emptyTitle}>
                  {hasActiveFilters
                    ? "No plans match your filters"
                    : "No results found"}
                </Text>
                <Text style={styles(colors).emptyText}>
                  {hasActiveFilters
                    ? "Try adjusting your filters or search terms"
                    : "Try searching with different keywords"}
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
          </>
        ) : (
          <>
            {/* No Search Query - Show HomeScreen Content */}

            {/* Tag Filter Bar */}
            <TagFilterBar
              onTagSelect={handleTagSelect}
              selectedTagId={selectedTagId}
              navigation={navigation}
            />

            {/* Popular Food Section - Conditional visibility */}
            {!selectedTagId && (
              <View style={styles(colors).section}>
                {/* Loading State */}
                {loading && !refreshing && (
                  <View style={styles(colors).loadingContainer}>
                    <ActivityIndicator size="large" color={colors.primary} />
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

                {/* Most Popular This Week Section */}
                {!loading && !error && (
                  <View style={styles(colors).sectionpopular}>
                    <Text style={styles(colors).sectionTitle}>
                      Most Popular This Week
                    </Text>

                    {popularLoading && (
                      <View style={styles(colors).loadingContainer}>
                        <ActivityIndicator
                          size="large"
                          color={colors.primary}
                        />
                        <Text style={styles(colors).loadingText}>
                          Loading popular plans...
                        </Text>
                      </View>
                    )}

                    {popularError && !popularLoading && (
                      <View style={styles(colors).errorContainer}>
                        <CustomIcon
                          name="alert-circle"
                          size={48}
                          color={colors.error}
                        />
                        <Text style={styles(colors).errorTitle}>
                          Could not load popular plans
                        </Text>
                        <Text style={styles(colors).errorText}>
                          {popularError}
                        </Text>
                        <TouchableOpacity
                          style={styles(colors).retryButton}
                          onPress={refreshPopularPlans}
                        >
                          <Text style={styles(colors).retryButtonText}>
                            Try Again
                          </Text>
                        </TouchableOpacity>
                      </View>
                    )}

                    {!popularLoading && !popularError && (
                      <View style={styles(colors).popularFoodContainer}>
                        {popularPlans.length > 0 ? (
                          <ScrollView
                            ref={popularScrollRef}
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={
                              styles(colors).popularFoodScrollContent
                            }
                            scrollEventThrottle={16}
                            decelerationRate="fast"
                            snapToInterval={300 + 20} // Card width + margin
                            snapToAlignment="center"
                            disableIntervalMomentum={true}
                          >
                            {popularPlans.map((plan, index) =>
                              renderPopularPlanCard(plan, index)
                            )}
                          </ScrollView>
                        ) : (
                          <View style={styles(colors).emptyContainer}>
                            <CustomIcon
                              name="trending-up"
                              size={48}
                              color={colors.textMuted}
                            />
                            <Text style={styles(colors).emptyTitle}>
                              No popular plans yet
                            </Text>
                            <Text style={styles(colors).emptyText}>
                              Check back soon for trending meal plans!
                            </Text>
                          </View>
                        )}
                      </View>
                    )}
                  </View>
                )}
              </View>
            )}

            {/* Our Meal Plans Section */}
            <View style={styles(colors).section}>
              <Text style={styles(colors).sectionTitle}>Our Meal Plans</Text>

              {!loading && !error && (
                <View style={styles(colors).mealplansGrid}>
                  {renderMixedMealPlanFeed(
                    filteredMealPlans.length > 0 ? filteredMealPlans : mealPlans
                  )}
                </View>
              )}
            </View>

            {/* Search History and Popular Searches for Empty Search */}
            {historyLoading ? (
              <View style={styles(colors).loadingContainer}>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text style={styles(colors).loadingText}>
                  Loading suggestions...
                </Text>
              </View>
            ) : (
              popularSearches.length > 0 && (
                <View style={styles(colors).section}>
                  <Text style={styles(colors).sectionTitle}>
                    Popular Searches
                  </Text>
                  {popularSearches.slice(0, 3).map((searchTerm, index) => (
                    <TouchableOpacity
                      key={`popular-search-${index}`}
                      style={styles(colors).suggestionItem}
                      onPress={() => handleSearch(searchTerm)}
                    >
                      <CustomIcon
                        name="search"
                        size={16}
                        color={colors.textSecondary}
                      />
                      <Text style={styles(colors).suggestionText}>
                        {searchTerm}
                      </Text>
                      <CustomIcon
                        name="chevron-up"
                        size={16}
                        color={colors.textSecondary}
                      />
                    </TouchableOpacity>
                  ))}
                </View>
              )
            )}
          </>
        )}

        <View style={styles(colors).bottomPadding} />
      </ScrollView>

      {/* Filter Modal */}
      <FilterModal
        visible={showFilterModal}
        onClose={() => setShowFilterModal(false)}
        onApplyFilters={handleApplyFilters}
        initialFilters={activeFilters}
      />

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
                <CustomIcon name="close" size={20} color={colors.text} />
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

      {/* Scroll to Top Button */}
      <Animated.View
        style={[
          styles(colors).scrollToTopButton,
          {
            opacity: scrollToTopOpacity,
            bottom:
              navigation.getParent()?.getId() === "TabNavigator"
                ? 100
                : 110 + insets.bottom,
            transform: [
              {
                scale: scrollToTopOpacity.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.8, 1],
                }),
              },
            ],
          },
        ]}
        pointerEvents={showScrollToTop ? "auto" : "none"}
      >
        <TouchableOpacity
          style={styles(colors).scrollToTopButtonInner}
          onPress={scrollToTop}
          activeOpacity={0.8}
        >
          <CustomIcon name="chevron-up" size={20} color={colors.white} />
        </TouchableOpacity>
      </Animated.View>
    </SafeAreaView>
  );
};

const styles = (colors) =>
  createStylesWithDMSans({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    searchContainer: {
      paddingHorizontal: 20,
      paddingVertical: 15,
      // backgroundColor: colors.background, // Background for sticky header
    },
    searchInputContainer: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.cardBackground,
      borderRadius: THEME.borderRadius.xxl,
      paddingHorizontal: 15,
      paddingVertical: 6,
      borderWidth: 1,
      borderColor: colors.border,
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.9,
      shadowRadius: 4,
      elevation: 3,
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
    resultsContainer: {
      flex: 1,
      paddingHorizontal: 20,
    },
    emptyResults: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      paddingVertical: 60,
    },
    emptyTitle: {
      fontSize: 20,
      fontWeight: "600",
      color: colors.text,
      marginTop: 20,
      marginBottom: 8,
    },
    emptyText: {
      fontSize: 16,
      color: colors.textSecondary,
      textAlign: "center",
      lineHeight: 24,
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
    resultsGrid: {
      flexDirection: "column",
      paddingVertical: 20,
      gap: 20,
    },
    scrollContent: {
      paddingBottom: 120, // Extra padding for floating tab bar
    },
    historySection: {
      marginBottom: 25,
    },
    popularSection: {
      marginBottom: 20,
    },
    suggestionsContainer: {
      paddingVertical: 20,
    },
    suggestionsTitle: {
      fontSize: 18,
      fontWeight: "600",
      color: colors.text,
      marginBottom: 20,
    },
    suggestionItem: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: 15,
      paddingHorizontal: 16,
      backgroundColor: colors.cardBackground,
      borderRadius: THEME.borderRadius.xxl,
      marginBottom: 10,
      borderWidth: 0.5,
      borderColor: colors.border,
    },
    suggestionText: {
      flex: 1,
      fontSize: 16,
      color: colors.text,
      marginLeft: 12,
    },
    // Filter styles
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
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    filtersRow: {
      flexDirection: "row",
      alignItems: "center",
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
    resultsHeader: {
      fontSize: 16,
      fontWeight: "500",
      color: colors.text,
      marginBottom: 15,
      paddingTop: 10,
    },
    // Additional HomeScreen styles
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
    section: {
      paddingHorizontal: 20,
      paddingVertical: 15,
    },
    sectionpopular: {
      paddingHorizontal: 0,
      paddingVertical: 0,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: "600",
      fontFamily: DMSansFonts.semiBold,
      marginBottom: 15,
      opacity: 0.7,
      color: colors.text,
    },
    popularFoodContainer: {
      // paddingHorizontal: 20,
    },
    popularFoodScrollContent: {
      paddingLeft: (width * 0.125) / 10,
      paddingRight: (width * 0.125) / 2 + 20,
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
      height: 120,
    },
    mealplansGrid: {
      flexDirection: "column",
      paddingHorizontal: 0,
      gap: 20,
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
      overflow: "visible",
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
      minHeight: 250,
    },
    scrollToTopButton: {
      position: "absolute",
      right: 20,
      width: 50,
      height: 50,
      borderRadius: 25,
      justifyContent: "center",
      alignItems: "center",
      elevation: 8,
      shadowColor: "#000",
      shadowOffset: {
        width: 0,
        height: 4,
      },
      shadowOpacity: 0.3,
      shadowRadius: 8,
    },
    scrollToTopButtonInner: {
      width: 50,
      height: 50,
      borderRadius: 25,
      backgroundColor: colors.primary,
      justifyContent: "center",
      alignItems: "center",
    },
  });

const WrappedSearchScreen = (props) => (
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
          Search Screen Error
        </Text>
        <Text
          style={{
            fontSize: 16,
            color: "#6b7280",
            textAlign: "center",
            marginBottom: 24,
          }}
        >
          Something went wrong loading your search screen. Please try again.
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
    <SearchScreen {...props} />
  </ErrorBoundary>
);

export default WrappedSearchScreen;
