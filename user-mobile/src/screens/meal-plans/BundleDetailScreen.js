// src/screens/meal-plans/BundleDetailScreen.js
import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Animated,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";

import { useCart } from "../../context/CartContext";
import { useTheme } from "../../styles/theme";
import { createStylesWithDMSans } from "../../utils/fontUtils";

const { width, height } = Dimensions.get("window");

const BundleDetailScreen = ({ route, navigation }) => {
  const { colors } = useTheme();
  const { bundle } = route.params;
  const { selectBundle, updateFrequency, updateDuration, frequency, duration } =
    useCart();

  const [selectedFrequency, setSelectedFrequency] = useState("daily");
  const [selectedDuration, setSelectedDuration] = useState("weekly");
  const [calculatedPrice, setCalculatedPrice] = useState(bundle.base_price);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;

  const frequencies = [
    {
      id: "daily",
      label: "1 meal/day",
      multiplier: 1,
      description: "Perfect for lunch or dinner",
    },
    {
      id: "twice_daily",
      label: "2 meals/day",
      multiplier: 2,
      description: "Lunch and dinner covered",
    },
    {
      id: "thrice_daily",
      label: "3 meals/day",
      multiplier: 3,
      description: "All meals for the day",
    },
  ];

  const durations = [
    {
      id: "weekly",
      label: "Weekly",
      multiplier: 1,
      description: "7 days of meals",
    },
    {
      id: "monthly",
      label: "Monthly",
      multiplier: 4,
      description: "4 weeks of meals",
      savings: "15% off",
    },
  ];

  useEffect(() => {
    animateIn();
    calculatePrice();
  }, [selectedFrequency, selectedDuration]);

  const animateIn = () => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const calculatePrice = () => {
    const frequency = frequencies.find((f) => f.id === selectedFrequency);
    const duration = durations.find((d) => d.id === selectedDuration);

    let price = bundle.base_price * frequency.multiplier * duration.multiplier;

    // Apply monthly discount
    if (selectedDuration === "monthly") {
      price = price * 0.85; // 15% discount
    }

    setCalculatedPrice(Math.round(price));
  };

  const handleFrequencySelect = (frequencyId) => {
    setSelectedFrequency(frequencyId);
  };

  const handleDurationSelect = (durationId) => {
    setSelectedDuration(durationId);
  };

  const handleAddToSubscription = () => {
    // Update cart context
    selectBundle({
      ...bundle,
      selectedFrequency,
      selectedDuration,
      finalPrice: calculatedPrice,
    });
    updateFrequency(selectedFrequency);
    updateDuration(selectedDuration);

    // Show success feedback
    Alert.alert(
      "Added to Subscription! 🎉",
      `${bundle.bundle_name} plan has been added to your subscription.`,
      [
        { text: "Continue Shopping", style: "cancel" },
        {
          text: "Proceed to Checkout",
          onPress: () => navigation.navigate("Checkout", { mealPlan: bundle }),
        },
      ]
    );
  };

  const renderFrequencyOption = (freq) => (
    <TouchableOpacity
      key={freq.id}
      style={[
        styles(colors).optionCard,
        selectedFrequency === freq.id && styles(colors).optionCardSelected,
      ]}
      onPress={() => handleFrequencySelect(freq.id)}
    >
      <View style={styles(colors).optionHeader}>
        <View
          style={[
            styles(colors).radioButton,
            selectedFrequency === freq.id && styles(colors).radioButtonSelected,
          ]}
        >
          {selectedFrequency === freq.id && (
            <Ionicons name="checkmark" size={16} color="white" />
          )}
        </View>
        <Text
          style={[
            styles(colors).optionLabel,
            selectedFrequency === freq.id && styles(colors).optionLabelSelected,
          ]}
        >
          {freq.label}
        </Text>
      </View>
      <Text
        style={[
          styles(colors).optionDescription,
          selectedFrequency === freq.id &&
            styles(colors).optionDescriptionSelected,
        ]}
      >
        {freq.description}
      </Text>
    </TouchableOpacity>
  );

  const renderDurationOption = (dur) => (
    <TouchableOpacity
      key={dur.id}
      style={[
        styles(colors).optionCard,
        selectedDuration === dur.id && styles(colors).optionCardSelected,
      ]}
      onPress={() => handleDurationSelect(dur.id)}
    >
      <View style={styles(colors).optionHeader}>
        <View
          style={[
            styles(colors).radioButton,
            selectedDuration === dur.id && styles(colors).radioButtonSelected,
          ]}
        >
          {selectedDuration === dur.id && (
            <Ionicons name="checkmark" size={16} color="white" />
          )}
        </View>
        <View style={styles(colors).optionInfo}>
          <Text
            style={[
              styles(colors).optionLabel,
              selectedDuration === dur.id && styles(colors).optionLabelSelected,
            ]}
          >
            {dur.label}
          </Text>
          {dur.savings && (
            <View style={styles(colors).savingsBadge}>
              <Text style={styles(colors).savingsText}>{dur.savings}</Text>
            </View>
          )}
        </View>
      </View>
      <Text
        style={[
          styles(colors).optionDescription,
          selectedDuration === dur.id &&
            styles(colors).optionDescriptionSelected,
        ]}
      >
        {dur.description}
      </Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles(colors).container}>
      <ScrollView
        style={styles(colors).scrollView}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Section */}
        <Animated.View
          style={[
            styles(colors).heroSection,
            {
              opacity: fadeAnim,
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          <LinearGradient
            colors={bundle.color}
            style={styles(colors).heroGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View style={styles(colors).heroContent}>
              <View style={styles(colors).heroIcon}>
                <Ionicons name={bundle.icon} size={48} color="white" />
              </View>
              <Text style={styles(colors).heroTitle}>{bundle.bundle_name}</Text>
              <Text style={styles(colors).heroDescription}>
                {bundle.description}
              </Text>

              <View style={styles(colors).heroStats}>
                <View style={styles(colors).heroStat}>
                  <Ionicons
                    name="restaurant"
                    size={20}
                    color="rgba(255,255,255,0.9)"
                  />
                  <Text style={styles(colors).heroStatText}>
                    {bundle.meals_per_week} meals/week
                  </Text>
                </View>
                <View style={styles(colors).heroStat}>
                  <Ionicons
                    name="people"
                    size={20}
                    color="rgba(255,255,255,0.9)"
                  />
                  <Text style={styles(colors).heroStatText}>
                    {bundle.target_audience}
                  </Text>
                </View>
              </View>
            </View>
          </LinearGradient>
        </Animated.View>

        {/* Features Section */}
        <Animated.View
          style={[
            styles(colors).section,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <Text style={styles(colors).sectionTitle}>What's Included</Text>
          <View style={styles(colors).featuresGrid}>
            {bundle.features.map((feature, index) => (
              <View key={index} style={styles(colors).featureItem}>
                <View style={styles(colors).featureIcon}>
                  <Ionicons
                    name="checkmark-circle"
                    size={20}
                    color={colors.primary}
                  />
                </View>
                <Text style={styles(colors).featureText}>{feature}</Text>
              </View>
            ))}
          </View>
        </Animated.View>

        {/* Frequency Selection */}
        <Animated.View
          style={[
            styles(colors).section,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <Text style={styles(colors).sectionTitle}>Meal Frequency</Text>
          <Text style={styles(colors).sectionSubtitle}>
            How many meals per day?
          </Text>
          <View style={styles(colors).optionsContainer}>
            {frequencies.map(renderFrequencyOption)}
          </View>
        </Animated.View>

        {/* Duration Selection */}
        <Animated.View
          style={[
            styles(colors).section,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <Text style={styles(colors).sectionTitle}>Subscription Duration</Text>
          <Text style={styles(colors).sectionSubtitle}>
            Choose your commitment level
          </Text>
          <View style={styles(colors).optionsContainer}>
            {durations.map(renderDurationOption)}
          </View>
        </Animated.View>

        {/* Price Summary */}
        <Animated.View
          style={[
            styles(colors).priceSection,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <View style={styles(colors).priceCard}>
            <View style={styles(colors).priceHeader}>
              <Text style={styles(colors).priceTitle}>Price Summary</Text>
              <View style={styles(colors).priceBreakdown}>
                <Text style={styles(colors).priceLabel}>
                  Base price: ₦{bundle.base_price.toLocaleString()}
                </Text>
                <Text style={styles(colors).priceLabel}>
                  Frequency:{" "}
                  {frequencies.find((f) => f.id === selectedFrequency)?.label}
                </Text>
                <Text style={styles(colors).priceLabel}>
                  Duration:{" "}
                  {durations.find((d) => d.id === selectedDuration)?.label}
                </Text>
                {selectedDuration === "monthly" && (
                  <Text style={styles(colors).discount}>
                    Monthly discount: -15%
                  </Text>
                )}
              </View>
            </View>

            <View style={styles(colors).totalPrice}>
              <Text style={styles(colors).totalLabel}>
                Total per {selectedDuration === "weekly" ? "week" : "month"}
              </Text>
              <Text style={styles(colors).totalAmount}>
                ₦{calculatedPrice.toLocaleString()}
              </Text>
            </View>

            <View style={styles(colors).perMealPrice}>
              <Text style={styles(colors).perMealText}>
                ≈ ₦
                {Math.round(
                  calculatedPrice /
                    (frequencies.find((f) => f.id === selectedFrequency)
                      ?.multiplier *
                      7 *
                      durations.find((d) => d.id === selectedDuration)
                        ?.multiplier)
                ).toLocaleString()}{" "}
                per meal
              </Text>
            </View>
          </View>
        </Animated.View>

        {/* Nutritional Info */}
        <Animated.View
          style={[
            styles(colors).section,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <Text style={styles(colors).sectionTitle}>Nutritional Focus</Text>
          <View style={styles(colors).nutritionGrid}>
            <View style={styles(colors).nutritionItem}>
              <Ionicons name="fitness" size={24} color={colors.error} />
              <Text style={styles(colors).nutritionLabel}>Protein</Text>
              <Text style={styles(colors).nutritionValue}>25g+</Text>
            </View>
            <View style={styles(colors).nutritionItem}>
              <Ionicons name="leaf" size={24} color={colors.primary} />
              <Text style={styles(colors).nutritionLabel}>Fiber</Text>
              <Text style={styles(colors).nutritionValue}>8g+</Text>
            </View>
            <View style={styles(colors).nutritionItem}>
              <Ionicons name="heart" size={24} color={colors.warning} />
              <Text style={styles(colors).nutritionLabel}>Calories</Text>
              <Text style={styles(colors).nutritionValue}>450-650</Text>
            </View>
            <View style={styles(colors).nutritionItem}>
              <Ionicons name="water" size={24} color={colors.info} />
              <Text style={styles(colors).nutritionLabel}>Sodium</Text>
              <Text style={styles(colors).nutritionValue}>Low</Text>
            </View>
          </View>
        </Animated.View>

        {/* Bottom Padding */}
        <View style={styles(colors).bottomPadding} />
      </ScrollView>

      {/* Fixed Bottom CTA */}
      <Animated.View
        style={[
          styles(colors).bottomCTA,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          },
        ]}
      >
        <View style={styles(colors).ctaContent}>
          <View style={styles(colors).ctaPrice}>
            <Text style={styles(colors).ctaPriceAmount}>
              ₦{calculatedPrice.toLocaleString()}
            </Text>
            <Text style={styles(colors).ctaPriceLabel}>
              per {selectedDuration === "weekly" ? "week" : "month"}
            </Text>
          </View>
          <TouchableOpacity
            style={styles(colors).ctaButton}
            onPress={handleAddToSubscription}
          >
            <LinearGradient
              colors={[colors.primary, colors.primaryDark]}
              style={styles(colors).ctaButtonGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Text style={styles(colors).ctaButtonText}>
                Add to Subscription
              </Text>
              <Ionicons name="arrow-forward" size={20} color="white" />
            </LinearGradient>
          </TouchableOpacity>
        </View>
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
    scrollView: {
      flex: 1,
    },
    heroSection: {
      overflow: "hidden",
    },
    heroGradient: {
      paddingHorizontal: 24,
      paddingVertical: 40,
      minHeight: 300,
    },
    heroContent: {
      alignItems: "center",
    },
    heroIcon: {
      width: 80,
      height: 80,
      borderRadius: 40,
      backgroundColor: "rgba(255,255,255,0.2)",
      justifyContent: "center",
      alignItems: "center",
      marginBottom: 20,
    },
    heroTitle: {
      fontSize: 32,
      fontWeight: "bold",
      color: "white",
      textAlign: "center",
      marginBottom: 12,
    },
    heroDescription: {
      fontSize: 16,
      color: "rgba(255,255,255,0.9)",
      textAlign: "center",
      lineHeight: 24,
      marginBottom: 24,
      paddingHorizontal: 20,
    },
    heroStats: {
      flexDirection: "row",
      justifyContent: "space-around",
      width: "100%",
    },
    heroStat: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: "rgba(255,255,255,0.2)",
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 20,
    },
    heroStatText: {
      marginLeft: 8,
      color: "white",
      fontWeight: "600",
      fontSize: 14,
    },
    section: {
      padding: 24,
    },
    sectionTitle: {
      fontSize: 24,
      fontWeight: "bold",
      color: colors.text,
      marginBottom: 8,
    },
    sectionSubtitle: {
      fontSize: 16,
      color: colors.textSecondary,
      marginBottom: 20,
    },
    featuresGrid: {
      gap: 16,
    },
    featureItem: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.cardBackground,
      padding: 16,
      borderRadius: 12,
      elevation: 2,
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
    },
    featureIcon: {
      marginRight: 12,
    },
    featureText: {
      flex: 1,
      fontSize: 16,
      color: colors.text,
      fontWeight: "500",
    },
    optionsContainer: {
      gap: 12,
    },
    optionCard: {
      backgroundColor: colors.cardBackground,
      padding: 16,
      borderRadius: 12,
      borderWidth: 2,
      borderColor: colors.border,
      elevation: 2,
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
    },
    optionCardSelected: {
      borderColor: colors.primary,
      backgroundColor: colors.primaryLight,
    },
    optionHeader: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 8,
    },
    optionInfo: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    radioButton: {
      width: 24,
      height: 24,
      borderRadius: 12,
      borderWidth: 2,
      borderColor: colors.border,
      marginRight: 12,
      justifyContent: "center",
      alignItems: "center",
    },
    radioButtonSelected: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    optionLabel: {
      fontSize: 18,
      fontWeight: "600",
      color: colors.text,
    },
    optionLabelSelected: {
      color: colors.primary,
    },
    optionDescription: {
      fontSize: 14,
      color: colors.textSecondary,
      marginLeft: 36,
    },
    optionDescriptionSelected: {
      color: colors.primary,
    },
    savingsBadge: {
      backgroundColor: colors.warning,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 8,
    },
    savingsText: {
      color: colors.white,
      fontSize: 12,
      fontWeight: "bold",
    },
    priceSection: {
      paddingHorizontal: 24,
      paddingBottom: 24,
    },
    priceCard: {
      backgroundColor: colors.cardBackground,
      padding: 24,
      borderRadius: 16,
      elevation: 4,
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.15,
      shadowRadius: 8,
    },
    priceHeader: {
      marginBottom: 20,
    },
    priceTitle: {
      fontSize: 20,
      fontWeight: "bold",
      color: colors.text,
      marginBottom: 12,
    },
    priceBreakdown: {
      gap: 4,
    },
    priceLabel: {
      fontSize: 14,
      color: colors.textSecondary,
    },
    discount: {
      fontSize: 14,
      color: colors.warning,
      fontWeight: "600",
    },
    totalPrice: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingTop: 16,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      marginBottom: 8,
    },
    totalLabel: {
      fontSize: 16,
      color: colors.textSecondary,
      fontWeight: "500",
    },
    totalAmount: {
      fontSize: 28,
      fontWeight: "bold",
      color: colors.primary,
    },
    perMealPrice: {
      alignItems: "center",
    },
    perMealText: {
      fontSize: 14,
      color: colors.textMuted,
      fontStyle: "italic",
    },
    nutritionGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      justifyContent: "space-between",
      gap: 16,
    },
    nutritionItem: {
      width: "47%",
      backgroundColor: colors.cardBackground,
      padding: 20,
      borderRadius: 12,
      alignItems: "center",
      elevation: 2,
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
    },
    nutritionLabel: {
      fontSize: 14,
      color: colors.textSecondary,
      marginTop: 8,
      marginBottom: 4,
    },
    nutritionValue: {
      fontSize: 18,
      fontWeight: "bold",
      color: colors.text,
    },
    bottomPadding: {
      height: 120, // Space for fixed CTA
    },
    bottomCTA: {
      position: "absolute",
      bottom: 0,
      left: 0,
      right: 0,
      backgroundColor: colors.cardBackground,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      elevation: 8,
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: -2 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
    },
    ctaContent: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      padding: 20,
    },
    ctaPrice: {
      flex: 1,
    },
    ctaPriceAmount: {
      fontSize: 24,
      fontWeight: "bold",
      color: colors.text,
    },
    ctaPriceLabel: {
      fontSize: 14,
      color: colors.textSecondary,
    },
    ctaButton: {
      flex: 1,
      marginLeft: 16,
    },
    ctaButtonGradient: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 16,
      paddingHorizontal: 24,
      borderRadius: 25,
    },
    ctaButtonText: {
      color: colors.black,
      fontSize: 18,
      fontWeight: "bold",
      marginRight: 8,
    },
  });

export default BundleDetailScreen;
