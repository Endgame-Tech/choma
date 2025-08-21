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
import FilterModal from "../../components/meal-plans/FilterModal";
import apiService from "../../services/api";

const SearchScreen = ({ navigation }) => {
  const { isDark, colors } = useTheme();
  const [searchQuery, setSearchQuery] = useState("");
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

  const loadSearchData = async () => {
    try {
      setHistoryLoading(true);

      // Load local search history
      const storedHistory = await AsyncStorage.getItem("searchHistory");
      if (storedHistory) {
        const parsedHistory = JSON.parse(storedHistory);
        setSearchHistory(parsedHistory.slice(0, 5)); // Keep only last 5 searches
      }

      // Load popular searches from backend (or fallback to default)
      try {
        const response = await apiService.getPopularSearches?.();
        if (response?.success && Array.isArray(response.data)) {
          setPopularSearches(response.data);
        } else {
          // Fallback popular searches
          setPopularSearches([
            "Jollof Rice",
            "Amala & Ewedu",
            "Pepper Soup",
            "Suya",
            "Pounded Yam",
          ]);
        }
      } catch (error) {
        console.log("Popular searches not available, using fallback");
        setPopularSearches([
          "Jollof Rice",
          "Amala & Ewedu",
          "Pepper Soup",
          "Suya",
          "Pounded Yam",
        ]);
      }
    } catch (error) {
      console.error("Error loading search data:", error);
      setPopularSearches([
        "Jollof Rice",
        "Amala & Ewedu",
        "Pepper Soup",
        "Suya",
        "Pounded Yam",
      ]);
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
        showRightIcon={true}
        rightIcon={
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
        }
        navigation={navigation}
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
        </View>
      </View>

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

                        {/* Content Overlay with Gradient */}
                        <LinearGradient
                          colors={[
                            "rgba(0, 0, 0, 0)",
                            "rgba(0, 0, 0, 0)",
                            "rgba(0, 0, 0, 0.9)",
                          ]}
                          locations={[0, 0.4, 1]}
                          style={styles(colors).mealplanContentOverlay}
                        >
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
                            {plan.description ||
                              plan.shortDescription ||
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
                        </LinearGradient>
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
                {searchHistory.length > 0 && (
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
                )}

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
                                    : colors.white
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

                            {/* Content Overlay with Gradient */}
                            <LinearGradient
                              colors={[
                                "rgba(0, 0, 0, 0)",
                                "rgba(0, 0, 0, 0)",
                                "rgba(0, 0, 0, 0.9)",
                              ]}
                              locations={[0, 0.4, 1]}
                              style={styles(colors).mealplanContentOverlay}
                            >
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
                                {plan.description ||
                                  plan.shortDescription ||
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
                            </LinearGradient>
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
  StyleSheet.create({
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
      backgroundColor: colors.cardBackground,
      borderRadius: 20,
      marginBottom: 0,
      overflow: "hidden",
      borderWidth: 1,
      borderColor: colors.border,
      elevation: 3,
      shadowColor: colors.black,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.15,
      shadowRadius: 4,
    },
    mealplanImageContainer: {
      position: "relative",
      width: "100%",
      height: 200,
    },
    mealplanImage: {
      width: "100%",
      height: "100%",
      resizeMode: "cover",
    },
    mealplanHeartButton: {
      position: "absolute",
      top: 16,
      right: 16,
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: "rgba(255, 255, 255, 1)",
      justifyContent: "center",
      alignItems: "center",
      elevation: 2,
      shadowColor: colors.black,
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.2,
      shadowRadius: 2,
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
    mealplanContentOverlay: {
      position: "absolute",
      bottom: 0,
      left: 0,
      right: 0,
      padding: 20,
      paddingTop: 90, // Extra padding for gradient effect
    },
    mealplanTitle: {
      fontSize: 20,
      fontWeight: "bold",
      color: colors.white,
      marginBottom: 6,
    },
    mealplanDescription: {
      fontSize: 14,
      color: colors.white,
      opacity: 0.9,
      marginBottom: 8,
      lineHeight: 20,
    },
    mealplanPrice: {
      fontSize: 20,
      fontWeight: "bold",
      color: colors.primary,
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
      borderRadius: THEME.borderRadius.medium,
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
  });

export default SearchScreen;
