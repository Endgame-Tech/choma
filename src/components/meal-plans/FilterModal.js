// src/components/meal-plans/FilterModal.js
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Dimensions,
  StatusBar,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import MultiSlider from "@ptomasroos/react-native-multi-slider";
import { useTheme } from "../../styles/theme";
import { createStylesWithDMSans } from "../../utils/fontUtils";

const { width } = Dimensions.get("window");

const TARGET_AUDIENCES = [
  {
    name: "Fitness",
    icon: "fitness",
    description: "High-protein meals for active lifestyles",
    color: "#FF6B6B",
  },
  {
    name: "Family",
    icon: "people",
    description: "Nutritious meals perfect for families",
    color: "#4ECDC4",
  },
  {
    name: "Professional",
    icon: "briefcase",
    description: "Quick, convenient meals for busy professionals",
    color: "#45B7D1",
  },
  {
    name: "Wellness",
    icon: "leaf",
    description: "Balanced meals focused on overall health",
    color: "#96CEB4",
  },
  {
    name: "Weight Loss",
    icon: "trending-down",
    description: "Calorie-controlled meals for weight management",
    color: "#FECA57",
  },
  {
    name: "Muscle Gain",
    icon: "barbell",
    description: "High-protein, high-calorie meals for muscle building",
    color: "#FF9FF3",
  },
  {
    name: "Diabetic Friendly",
    icon: "medical",
    description: "Low-sugar, diabetes-friendly meal options",
    color: "#54A0FF",
  },
  {
    name: "Heart Healthy",
    icon: "heart",
    description: "Heart-healthy meals with reduced sodium",
    color: "#FF6B6B",
  },
];

const SORT_OPTIONS = [
  { id: "popularity", name: "Most Popular", icon: "trending-up" },
  { id: "price-low", name: "Price: Low to High", icon: "arrow-up" },
  { id: "price-high", name: "Price: High to Low", icon: "arrow-down" },
  { id: "newest", name: "Newest First", icon: "time" },
  { id: "rating", name: "Highest Rated", icon: "star" },
];

const DURATION_OPTIONS = [
  { id: 1, name: "1 Week", days: 7 },
  { id: 2, name: "2 Weeks", days: 14 },
  { id: 3, name: "3 Weeks", days: 21 },
  { id: 4, name: "4 Weeks", days: 28 },
];

const FilterModal = ({
  visible,
  onClose,
  onApplyFilters,
  initialFilters = {},
}) => {
  const { colors } = useTheme();
  const [selectedAudiences, setSelectedAudiences] = useState(
    initialFilters.audiences || []
  );
  const [priceRange, setPriceRange] = useState(
    initialFilters.priceRange || [0, 50000]
  );
  const [selectedSort, setSelectedSort] = useState(
    initialFilters.sortBy || "popularity"
  );
  const [selectedDuration, setSelectedDuration] = useState(
    initialFilters.duration || null
  );

  const toggleAudience = (audienceName) => {
    setSelectedAudiences((prev) =>
      prev.includes(audienceName)
        ? prev.filter((a) => a !== audienceName)
        : [...prev, audienceName]
    );
  };

  const clearAllFilters = () => {
    setSelectedAudiences([]);
    setPriceRange([0, 50000]);
    setSelectedSort("popularity");
    setSelectedDuration(null);
  };

  const applyFilters = () => {
    const filters = {
      audiences: selectedAudiences,
      priceRange,
      sortBy: selectedSort,
      duration: selectedDuration,
      minPrice: priceRange[0],
      maxPrice: priceRange[1],
    };

    onApplyFilters(filters);
    onClose();
  };

  const formatPrice = (price) => {
    return `₦${price.toLocaleString()}`;
  };

  const getActiveFiltersCount = () => {
    let count = 0;
    if (selectedAudiences.length > 0) count++;
    if (priceRange[0] > 0 || priceRange[1] < 50000) count++;
    if (selectedSort !== "popularity") count++;
    if (selectedDuration) count++;
    return count;
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <StatusBar barStyle="dark-content" />
      <SafeAreaView style={styles(colors).container}>
        {/* Header */}
        <View style={styles(colors).header}>
          <TouchableOpacity
            onPress={onClose}
            style={styles(colors).closeButton}
          >
            <Ionicons name="close" size={24} color={colors.text} />
          </TouchableOpacity>

          <Text style={styles(colors).headerTitle}>Filter Meal Plans</Text>

          <TouchableOpacity
            onPress={clearAllFilters}
            style={styles(colors).clearButton}
          >
            <Text style={styles(colors).clearText}>Clear All</Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles(colors).content}
          showsVerticalScrollIndicator={false}
        >
          {/* Target Audience Section */}
          <View style={styles(colors).section}>
            <Text style={styles(colors).sectionTitle}>Target Audience</Text>
            <Text style={styles(colors).sectionSubtitle}>
              Choose meal plans designed for your lifestyle
            </Text>

            <View style={styles(colors).audienceGrid}>
              {TARGET_AUDIENCES.map((audience) => (
                <TouchableOpacity
                  key={audience.name}
                  style={[
                    styles(colors).audienceItem,
                    selectedAudiences.includes(audience.name) &&
                      styles(colors).audienceItemSelected,
                  ]}
                  onPress={() => toggleAudience(audience.name)}
                >
                  <LinearGradient
                    colors={
                      selectedAudiences.includes(audience.name)
                        ? [audience.color, audience.color + "80"]
                        : [colors.cardBackground, colors.cardBackground]
                    }
                    style={styles(colors).audienceGradient}
                  >
                    <Ionicons
                      name={audience.icon}
                      size={24}
                      color={
                        selectedAudiences.includes(audience.name)
                          ? "#FFFFFF"
                          : colors.textSecondary
                      }
                    />
                    <Text
                      style={[
                        styles(colors).audienceName,
                        selectedAudiences.includes(audience.name) &&
                          styles(colors).audienceNameSelected,
                      ]}
                    >
                      {audience.name}
                    </Text>
                    <Text
                      style={[
                        styles(colors).audienceDescription,
                        selectedAudiences.includes(audience.name) &&
                          styles(colors).audienceDescriptionSelected,
                      ]}
                    >
                      {audience.description}
                    </Text>
                  </LinearGradient>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Price Range Section */}
          <View style={styles(colors).section}>
            <Text style={styles(colors).sectionTitle}>Price Range</Text>
            <Text style={styles(colors).sectionSubtitle}>
              {formatPrice(priceRange[0])} - {formatPrice(priceRange[1])}
            </Text>

            <View style={styles(colors).sliderContainer}>
              <MultiSlider
                values={priceRange}
                sliderLength={width - 80}
                onValuesChange={setPriceRange}
                min={0}
                max={50000}
                step={1000}
                selectedStyle={{ backgroundColor: colors.primary }}
                unselectedStyle={{ backgroundColor: colors.border }}
                containerStyle={{ height: 40 }}
                trackStyle={{ height: 4, borderRadius: 2 }}
                markerStyle={{
                  backgroundColor: colors.primary,
                  height: 20,
                  width: 20,
                  borderWidth: 2,
                  borderColor: "#FFFFFF",
                }}
              />
            </View>

            <View style={styles(colors).priceLabels}>
              <Text style={styles(colors).priceLabel}>₦0</Text>
              <Text style={styles(colors).priceLabel}>₦50,000+</Text>
            </View>
          </View>

          {/* Duration Section */}
          <View style={styles(colors).section}>
            <Text style={styles(colors).sectionTitle}>Plan Duration</Text>
            <Text style={styles(colors).sectionSubtitle}>
              Select preferred plan length
            </Text>

            <View style={styles(colors).durationGrid}>
              {DURATION_OPTIONS.map((duration) => (
                <TouchableOpacity
                  key={duration.id}
                  style={[
                    styles(colors).durationItem,
                    selectedDuration === duration.id &&
                      styles(colors).durationItemSelected,
                  ]}
                  onPress={() =>
                    setSelectedDuration(
                      selectedDuration === duration.id ? null : duration.id
                    )
                  }
                >
                  <Text
                    style={[
                      styles(colors).durationName,
                      selectedDuration === duration.id &&
                        styles(colors).durationNameSelected,
                    ]}
                  >
                    {duration.name}
                  </Text>
                  <Text
                    style={[
                      styles(colors).durationDays,
                      selectedDuration === duration.id &&
                        styles(colors).durationDaysSelected,
                    ]}
                  >
                    {duration.days} days
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Sort By Section */}
          <View style={styles(colors).section}>
            <Text style={styles(colors).sectionTitle}>Sort By</Text>
            <Text style={styles(colors).sectionSubtitle}>
              Choose how to order your results
            </Text>

            {SORT_OPTIONS.map((option) => (
              <TouchableOpacity
                key={option.id}
                style={[
                  styles(colors).sortItem,
                  selectedSort === option.id && styles(colors).sortItemSelected,
                ]}
                onPress={() => setSelectedSort(option.id)}
              >
                <View style={styles(colors).sortContent}>
                  <Ionicons
                    name={option.icon}
                    size={20}
                    color={
                      selectedSort === option.id
                        ? colors.primary
                        : colors.textSecondary
                    }
                  />
                  <Text
                    style={[
                      styles(colors).sortName,
                      selectedSort === option.id &&
                        styles(colors).sortNameSelected,
                    ]}
                  >
                    {option.name}
                  </Text>
                </View>

                {selectedSort === option.id && (
                  <Ionicons
                    name="checkmark-circle"
                    size={20}
                    color={colors.primary}
                  />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

        {/* Footer */}
        <View style={styles(colors).footer}>
          <View style={styles(colors).filterSummary}>
            <Text style={styles(colors).filterCount}>
              {getActiveFiltersCount()} filter
              {getActiveFiltersCount() !== 1 ? "s" : ""} applied
            </Text>
          </View>

          <TouchableOpacity
            style={styles(colors).applyButton}
            onPress={applyFilters}
          >
            <LinearGradient
              colors={[colors.primary, colors.primaryDark]}
              style={styles(colors).applyButtonGradient}
            >
              <Text style={styles(colors).applyButtonText}>Apply Filters</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );
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
      paddingVertical: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    closeButton: {
      padding: 4,
    },
    headerTitle: {
      fontSize: 18,
      fontWeight: "600",
      color: colors.text,
    },
    clearButton: {
      padding: 4,
    },
    clearText: {
      fontSize: 16,
      color: colors.primary,
      fontWeight: "500",
    },
    content: {
      flex: 1,
      padding: 20,
    },
    section: {
      marginBottom: 32,
    },
    sectionTitle: {
      fontSize: 20,
      fontWeight: "600",
      color: colors.text,
      marginBottom: 4,
    },
    sectionSubtitle: {
      fontSize: 14,
      color: colors.textSecondary,
      marginBottom: 16,
    },
    audienceGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 12,
    },
    audienceItem: {
      width: (width - 64) / 2,
      borderRadius: 12,
      overflow: "hidden",
    },
    audienceItemSelected: {
      transform: [{ scale: 0.98 }],
    },
    audienceGradient: {
      padding: 16,
      minHeight: 120,
      justifyContent: "center",
      alignItems: "center",
    },
    audienceName: {
      fontSize: 14,
      fontWeight: "600",
      color: colors.text,
      marginTop: 8,
      textAlign: "center",
    },
    audienceNameSelected: {
      color: "#FFFFFF",
    },
    audienceDescription: {
      fontSize: 12,
      color: colors.textSecondary,
      marginTop: 4,
      textAlign: "center",
      lineHeight: 16,
    },
    audienceDescriptionSelected: {
      color: "#FFFFFF",
      opacity: 0.9,
    },
    sliderContainer: {
      alignItems: "center",
      marginVertical: 20,
    },
    priceLabels: {
      flexDirection: "row",
      justifyContent: "space-between",
      paddingHorizontal: 10,
    },
    priceLabel: {
      fontSize: 12,
      color: colors.textSecondary,
    },
    durationGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 12,
    },
    durationItem: {
      flex: 1,
      minWidth: (width - 64) / 2 - 6,
      backgroundColor: colors.cardBackground,
      borderRadius: 12,
      padding: 16,
      alignItems: "center",
      borderWidth: 1,
      borderColor: colors.border,
    },
    durationItemSelected: {
      backgroundColor: colors.primaryDark2,
      borderColor: colors.primary,
    },
    durationName: {
      fontSize: 16,
      fontWeight: "600",
      color: colors.text,
      marginBottom: 4,
    },
    durationNameSelected: {
      color: colors.primary,
    },
    durationDays: {
      fontSize: 12,
      color: colors.textSecondary,
    },
    durationDaysSelected: {
      color: colors.primary,
      opacity: 0.8,
    },
    sortItem: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingVertical: 16,
      paddingHorizontal: 12,
      backgroundColor: colors.cardBackground,
      borderRadius: 30,
      marginBottom: 8,
      borderWidth: 1,
      borderColor: colors.border,
    },
    sortItemSelected: {
      backgroundColor: colors.primaryDark2,
      // borderColor: colors.primary,
    },
    sortContent: {
      flexDirection: "row",
      alignItems: "center",
    },
    sortName: {
      fontSize: 16,
      color: colors.text,
      marginLeft: 12,
    },
    sortNameSelected: {
      color: colors.primary,
      fontWeight: "500",
    },
    footer: {
      padding: 20,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    filterSummary: {
      alignItems: "center",
      marginBottom: 16,
    },
    filterCount: {
      fontSize: 14,
      color: colors.textSecondary,
    },
    applyButton: {
      borderRadius: 30,
      overflow: "hidden",
    },
    applyButtonGradient: {
      paddingVertical: 16,
      alignItems: "center",
    },
    applyButtonText: {
      fontSize: 16,
      fontWeight: "600",
      color: "#FFFFFF",
    },
  });

export default FilterModal;
