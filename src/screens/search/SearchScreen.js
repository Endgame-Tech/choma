// src/screens/search/SearchScreen.js - Search functionality with filtering
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Image,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useTheme } from "../../styles/theme";
import { THEME } from "../../utils/colors";
import StandardHeader from "../../components/layout/Header";
import { useMealPlans } from "../../hooks/useMealPlans";
import { useBookmarks } from "../../context/BookmarkContext";
import { useAuth } from "../../hooks/useAuth";
import FilterModal from "../../components/meal-plans/FilterModal";
import apiService from "../../services/api";
import discountService from "../../services/discountService";
import { createStylesWithDMSans } from "../../utils/fontUtils";
import TagFilterBar from "../../components/home/TagFilterBar";
import tagService from "../../services/tagService";

const SearchScreen = ({ navigation }) => {
  const { isDark, colors } = useTheme();
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");

  // Discount state
  const [discountData, setDiscountData] = useState({});
  const [discountLoading, setDiscountLoading] = useState(true);
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchHistory, setSearchHistory] = useState([]);
  const [popularSearches, setPopularSearches] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const { mealPlans } = useMealPlans();
  const { toggleBookmark, isBookmarked } = useBookmarks();

  // Filter state management
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [activeFilters, setActiveFilters] = useState({});
  const [targetAudiences, setTargetAudiences] = useState([]);
  
  // Tag filtering state
  const [selectedTagId, setSelectedTagId] = useState(null);
  const [selectedTag, setSelectedTag] = useState(null);

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
          for (const plan of mealPlans.slice(0, 6)) {
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
          .slice(0, 5) // Take first 5
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
        setSearchHistory(parsedHistory.slice(0, 5)); // Keep only last 5 searches
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
        console.error('Error fetching meal plans by tag:', error);
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
      ].slice(0, 5);
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
    let results = [...mealPlans];

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

  return (
    <SafeAreaView style={styles(colors).container}>
      <StatusBar
        barStyle={isDark === true ? "light-content" : "dark-content"}
        backgroundColor={colors.background}
      />

      <StandardHeader
        title="Search"
        onBackPress={() => navigation.goBack()}
        showRightIcon={false}
        navigation={null}
      />

      {/* Search Input */}
      <View style={styles(colors).searchContainer}>
        <View style={styles(colors).searchInputContainer}>
          <Ionicons
            name="search"
            size={20}
            color={colors.textMuted}
            style={styles(colors).searchIcon}
          />
          <TextInput
            style={styles(colors).searchInput}
            placeholder="Search for meals, restaurants..."
            placeholderTextColor={colors.textMuted}
            value={searchQuery}
            onChangeText={handleSearch}
            autoFocus
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity
              onPress={clearSearch}
              style={styles(colors).clearButton}
            >
              <Ionicons
                name="close-circle"
                size={20}
                color={colors.textMuted}
              />
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[
              styles(colors).filterButton,
              hasActiveFilters && styles(colors).filterButtonActive,
            ]}
            onPress={() => setShowFilterModal(true)}
          >
            <Ionicons
              name="options"
              size={20}
              color={hasActiveFilters ? colors.primary : colors.textMuted}
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
      </View>

      {/* Tag Filter Bar */}
      <TagFilterBar
        onTagSelect={handleTagSelect}
        selectedTagId={selectedTagId}
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
                      onPress={() => {
                        const newFilters = { ...activeFilters };
                        delete newFilters.priceRange;
                        handleApplyFilters(newFilters);
                      }}
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
            </View>
          </ScrollView>
        </View>
      )}

      {/* Search Results */}
      <ScrollView
        style={styles(colors).resultsContainer}
        contentContainerStyle={styles(colors).scrollContent}
      >
        {searchQuery.length > 0 ? (
          isSearching ? (
            <View style={styles(colors).loadingContainer}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={styles(colors).loadingText}>Searching...</Text>
            </View>
          ) : searchResults.length > 0 ? (
            <View>
              <Text style={styles(colors).resultsHeader}>
                {searchResults.length} result
                {searchResults.length !== 1 ? "s" : ""} found
                {searchQuery.trim() && ` for "${searchQuery.trim()}"`}
              </Text>
              <View style={styles(colors).resultsGrid}>
                {searchResults.map((plan) => {
                  const imageSource =
                    plan.planImage || plan.image
                      ? { uri: plan.planImage || plan.image }
                      : require("../../assets/images/meal-plans/fitfuel.jpg");

                  return (
                    <TouchableOpacity
                      key={plan.id || plan._id}
                      style={styles(colors).mealplanCard}
                      onPress={() =>
                        navigation.navigate("MealPlanDetail", { bundle: plan })
                      }
                      activeOpacity={0.8}
                    >
                      {/* Large Image Container */}
                      <View style={styles(colors).mealplanImageContainer}>
                        <Image
                          source={imageSource}
                          style={styles(colors).mealplanImage}
                          defaultSource={require("../../assets/images/meal-plans/fitfuel.jpg")}
                        />

                        {/* Heart Button positioned on top-right of image */}
                        <TouchableOpacity
                          style={styles(colors).mealplanHeartButton}
                          onPress={(e) => {
                            e.stopPropagation();
                            toggleBookmark(plan.id || plan._id);
                          }}
                          activeOpacity={0.7}
                        >
                          <Ionicons
                            name={
                              isBookmarked(plan.id || plan._id)
                                ? "heart"
                                : "heart-outline"
                            }
                            size={20}
                            color={
                              isBookmarked(plan.id || plan._id)
                                ? colors.error
                                : colors.white
                            }
                          />
                        </TouchableOpacity>

                        {/* "NEW" Badge for new plans */}
                        {plan.isNew && (
                          <View style={styles(colors).newBadge}>
                            <Text style={styles(colors).newBadgeText}>NEW</Text>
                          </View>
                        )}

                        {/* Discount Pill - Bottom Right */}
                        {(() => {
                          const planDiscount =
                            discountData[plan.id || plan._id];
                          const hasDiscount =
                            planDiscount && planDiscount.discountPercent > 0;
                          return hasDiscount ? (
                            <View style={styles(colors).searchDiscountPill}>
                              <Ionicons
                                name="gift-outline"
                                size={14}
                                color="#333"
                              />
                              <Text
                                style={styles(colors).searchDiscountPillText}
                              >
                                Up to {planDiscount.discountPercent}% Off
                              </Text>
                            </View>
                          ) : null;
                        })()}
                      </View>

                      {/* Text Content Below Image */}
                      <View style={styles(colors).mealplanTextContent}>
                        <Text
                          style={styles(colors).mealplanTitle}
                          numberOfLines={1}
                        >
                          {plan.planName || plan.name}
                        </Text>
                        <Text
                          style={styles(colors).mealplanDescription}
                          numberOfLines={2}
                        >
                          {getPlanDescription(plan) ||
                            "Satisfy your junk food cravings with fast, delicious, and effortless delivery."}
                        </Text>
                        <Text style={styles(colors).mealplanPrice}>
                          ₦
                          {(
                            plan.totalPrice ||
                            plan.basePrice ||
                            plan.price ||
                            0
                          ).toLocaleString()}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          ) : (
            <View style={styles(colors).emptyResults}>
              <Ionicons name="search" size={64} color={colors.textMuted} />
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
          )
        ) : (
          <View style={styles(colors).suggestionsContainer}>
            {historyLoading ? (
              <View style={styles(colors).loadingContainer}>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text style={styles(colors).loadingText}>
                  Loading suggestions...
                </Text>
              </View>
            ) : (
              <>
                {/* Search History */}
                {/* {searchHistory.length > 0 && (
                  <View style={styles(colors).historySection}>
                    <Text style={styles(colors).suggestionsTitle}>
                      Recent Searches
                    </Text>
                    {searchHistory.map((historyItem, index) => (
                      <TouchableOpacity
                        key={`history-${index}`}
                        style={styles(colors).suggestionItem}
                        onPress={() => handleSearch(historyItem)}
                      >
                        <Ionicons
                          name="time-outline"
                          size={16}
                          color={colors.textSecondary}
                        />
                        <Text style={styles(colors).suggestionText}>
                          {historyItem}
                        </Text>
                        <Ionicons
                          name="arrow-up-outline"
                          size={16}
                          color={colors.textSecondary}
                        />
                      </TouchableOpacity>
                    ))}
                  </View>
                )} */}

                {/* Popular Searches */}
                {popularSearches.length > 0 && (
                  <View style={styles(colors).historySection}>
                    <Text style={styles(colors).suggestionsTitle}>
                      Popular Searches
                    </Text>
                    {popularSearches.slice(0, 5).map((searchTerm, index) => (
                      <TouchableOpacity
                        key={`popular-search-${index}`}
                        style={styles(colors).suggestionItem}
                        onPress={() => handleSearch(searchTerm)}
                      >
                        <Ionicons
                          name="search-outline"
                          size={16}
                          color={colors.textSecondary}
                        />
                        <Text style={styles(colors).suggestionText}>
                          {searchTerm}
                        </Text>
                        <Ionicons
                          name="arrow-up-outline"
                          size={16}
                          color={colors.textSecondary}
                        />
                      </TouchableOpacity>
                    ))}
                  </View>
                )}

                {/* Popular Meal Plans */}
                <View style={styles(colors).popularSection}>
                  <Text style={styles(colors).suggestionsTitle}>
                    Popular Meal Plans
                  </Text>
                  <View style={styles(colors).resultsGrid}>
                    {mealPlans.slice(0, 6).map((plan, index) => {
                      const imageSource =
                        plan.image || plan.planImage
                          ? { uri: plan.image || plan.planImage }
                          : require("../../assets/images/meal-plans/fitfuel.jpg");

                      return (
                        <TouchableOpacity
                          key={plan._id || plan.id || `popular-${index}`}
                          style={styles(colors).mealplanCard}
                          onPress={() =>
                            navigation.navigate("MealPlanDetail", {
                              bundle: plan,
                            })
                          }
                          activeOpacity={0.8}
                        >
                          {/* Large Image Container */}
                          <View style={styles(colors).mealplanImageContainer}>
                            <Image
                              source={imageSource}
                              style={styles(colors).mealplanImage}
                              defaultSource={require("../../assets/images/meal-plans/fitfuel.jpg")}
                            />

                            {/* Heart Button positioned on top-right of image */}
                            <TouchableOpacity
                              style={styles(colors).mealplanHeartButton}
                              onPress={(e) => {
                                e.stopPropagation();
                                toggleBookmark(plan._id || plan.id);
                              }}
                              activeOpacity={0.7}
                            >
                              <Ionicons
                                name={
                                  isBookmarked(plan._id || plan.id)
                                    ? "heart"
                                    : "heart-outline"
                                }
                                size={20}
                                color={
                                  isBookmarked(plan._id || plan.id)
                                    ? colors.error
                                    : colors.primary
                                }
                              />
                            </TouchableOpacity>

                            {/* "NEW" Badge for new plans */}
                            {plan.isNew && (
                              <View style={styles(colors).newBadge}>
                                <Text style={styles(colors).newBadgeText}>
                                  NEW
                                </Text>
                              </View>
                            )}

                            {/* Discount Pill - Bottom Right */}
                            {(() => {
                              const planDiscount =
                                discountData[plan._id || plan.id];
                              const hasDiscount =
                                planDiscount &&
                                planDiscount.discountPercent > 0;
                              return hasDiscount ? (
                                <View style={styles(colors).searchDiscountPill}>
                                  <Ionicons
                                    name="gift-outline"
                                    size={14}
                                    color="#333"
                                  />
                                  <Text
                                    style={
                                      styles(colors).searchDiscountPillText
                                    }
                                  >
                                    Up to {planDiscount.discountPercent}% Off
                                  </Text>
                                </View>
                              ) : null;
                            })()}
                          </View>

                          {/* Text Content Below Image */}
                          <View style={styles(colors).mealplanTextContent}>
                            <Text
                              style={styles(colors).mealplanTitle}
                              numberOfLines={1}
                            >
                              {plan.planName || plan.name}
                            </Text>
                            <Text
                              style={styles(colors).mealplanDescription}
                              numberOfLines={2}
                            >
                              {getPlanDescription(plan) ||
                                "Satisfy your junk food cravings with fast, delicious, and effortless delivery."}
                            </Text>
                            <Text style={styles(colors).mealplanPrice}>
                              ₦
                              {(
                                plan.totalPrice ||
                                plan.basePrice ||
                                plan.price ||
                                0
                              ).toLocaleString()}
                            </Text>
                          </View>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              </>
            )}
          </View>
        )}
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
    // Mealplan Card Styles (matching HomeScreen)
    mealplanCard: {
      width: "100%",
      borderRadius: 20,
      overflow: "hidden",
      marginBottom: 0,
    },
    mealplanImageContainer: {
      position: "relative",
      height: 150,
      width: "100%",
      borderRadius: 20,
      overflow: "hidden",
    },
    mealplanImage: {
      width: "100%",
      height: "100%",
      resizeMode: "cover",
      borderRadius: 20,
    },
    mealplanHeartButton: {
      position: "absolute",
      top: 12,
      right: 12,
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: colors.black,
      justifyContent: "center",
      alignItems: "center",
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
      paddingTop: 12,
    },
    mealplanTitle: {
      fontSize: 16,
      fontWeight: "600",
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
      fontWeight: "700",
      color: colors.text,
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
    // Search Discount Pill Styles (matching Home Screen)
    searchDiscountPill: {
      position: "absolute",
      bottom: 8,
      right: 8,
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: "#F3E9DF", // Cream background matching the image
      paddingHorizontal: 8,
      paddingVertical: 7,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: "#1b1b1b",
    },
    searchDiscountPillText: {
      fontSize: 15,
      fontWeight: "450",
      color: "#333",
      marginLeft: 3,
    },
  });

export default SearchScreen;
