import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../styles/theme";
import apiService from "../../services/api";
import { createStylesWithDMSans } from "../../utils/fontUtils";

const QuickSearchBar = ({
  navigation,
  onSearchFocus,
  onSearchSubmit,
  placeholder = "Search for meal plans...",
}) => {
  const { colors } = useTheme();
  const [searchQuery, setSearchQuery] = useState("");
  const [popularSearches, setPopularSearches] = useState([]);
  const [loadingPopular, setLoadingPopular] = useState(true);

  if (!colors) {
    console.error(
      "❌ QuickSearchBar: colors is undefined - theme context missing"
    );
    return null;
  }

  useEffect(() => {
    loadPopularSearches();
  }, []);

  const loadPopularSearches = async () => {
    try {
      setLoadingPopular(true);

      // Try to get meal plan names from API first
      const mealPlansResult = await apiService.getMealPlans();

      if (mealPlansResult.success && mealPlansResult.data) {
        const mealPlans = Array.isArray(mealPlansResult.data)
          ? mealPlansResult.data
          : mealPlansResult.data.data || [];

        // Extract unique plan names
        const planNames = mealPlans
          .map((plan) => plan.planName || plan.name || plan.title)
          .filter((name) => name && name.length > 0)
          .slice(0, 6); // Limit to 6 popular searches

        if (planNames.length > 0) {
          console.log("✅ Loaded popular searches from meal plans:", planNames);
          setPopularSearches(planNames);
        } else {
          // Fallback to default searches
          setPopularSearches(getFallbackSearches());
        }
      } else {
        setPopularSearches(getFallbackSearches());
      }
    } catch (error) {
      console.error("❌ Error loading popular searches:", error);
      setPopularSearches(getFallbackSearches());
    } finally {
      setLoadingPopular(false);
    }
  };

  const getFallbackSearches = () => {
    return [
      "FitFam Fuel",
      "Professional Power",
      "Family Feast",
      "Wellness Wonder",
      "Quick Bites",
      "Healthy Choice",
    ];
  };

  const handleSearchSubmit = () => {
    if (searchQuery.trim()) {
      if (onSearchSubmit) {
        onSearchSubmit(searchQuery);
      } else {
        navigation.navigate("Search", { query: searchQuery });
      }
      setSearchQuery("");
    }
  };

  const handlePopularSearchPress = (searchTerm) => {
    if (onSearchSubmit) {
      onSearchSubmit(searchTerm);
    } else {
      navigation.navigate("Search", { query: searchTerm });
    }
  };

  return (
    <View style={styles(colors).container}>
      {/* Search Input */}
      <View style={styles(colors).searchContainer}>
        <View style={styles(colors).searchInputContainer}>
          <Ionicons
            name="search"
            size={20}
            color={colors.textSecondary}
            style={styles(colors).searchIcon}
          />
          <TextInput
            style={styles(colors).searchInput}
            placeholder={placeholder}
            placeholderTextColor={colors.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
            onFocus={onSearchFocus}
            onSubmitEditing={handleSearchSubmit}
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity
              onPress={() => setSearchQuery("")}
              style={styles(colors).clearButton}
            >
              <Ionicons
                name="close-circle"
                size={20}
                color={colors.textSecondary}
              />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Popular Searches */}
      <View style={styles(colors).popularSection}>
        <View style={styles(colors).popularHeader}>
          <Text style={styles(colors).popularTitle}>Popular Searches</Text>
          {loadingPopular && (
            <ActivityIndicator size="small" color={colors.primary} />
          )}
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles(colors).popularScrollContainer}
        >
          {popularSearches.map((search, index) => (
            <TouchableOpacity
              key={index}
              style={styles(colors).popularItem}
              onPress={() => handlePopularSearchPress(search)}
            >
              <Text style={styles(colors).popularText}>{search}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    </View>
  );
};

const styles = (colors) =>
  createStylesWithDMSans({
    container: {
      backgroundColor: colors.background,
      paddingHorizontal: 20,
      paddingVertical: 15,
    },
    searchContainer: {
      marginBottom: 20,
    },
    searchInputContainer: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.inputBackground,
      borderRadius: 25,
      paddingHorizontal: 16,
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
      marginLeft: 8,
    },
    popularSection: {
      marginBottom: 10,
    },
    popularHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 12,
    },
    popularTitle: {
      fontSize: 16,
      fontWeight: "600",
      color: colors.text,
    },
    popularScrollContainer: {
      paddingRight: 20,
    },
    popularItem: {
      backgroundColor: colors.cardBackground,
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 20,
      marginRight: 10,
      borderWidth: 1,
      borderColor: colors.border,
    },
    popularText: {
      fontSize: 14,
      color: colors.text,
      fontWeight: "500",
    },
  });

export default QuickSearchBar;
