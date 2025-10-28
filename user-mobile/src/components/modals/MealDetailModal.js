import React, { useState, useRef } from "react";
import {
  Modal,
  View,
  Text,
  Image,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  Animated,
  StyleSheet,
} from "react-native";
import { PanGestureHandler, State } from "react-native-gesture-handler";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "../../styles/theme";
import { createStylesWithDMSans } from "../../utils/fontUtils";
import { formatCalories, formatNutritionValue } from "../../utils/numberUtils";

const { width: screenWidth, height: screenHeight } = Dimensions.get("window");

const MealDetailModal = ({
  visible,
  onClose,
  meals = [],
  initialIndex = 0,
}) => {
  const { colors } = useTheme();
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const translateX = useRef(new Animated.Value(0)).current;
  const gestureRef = useRef();

  const currentMeal = meals[currentIndex] || {};

  const handleSwipe = (direction) => {
    if (direction === "left" && currentIndex < meals.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else if (direction === "right" && currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const onGestureEvent = Animated.event(
    [{ nativeEvent: { translationX: translateX } }],
    { useNativeDriver: true }
  );

  const onHandlerStateChange = (event) => {
    if (event.nativeEvent.state === State.END) {
      // END state
      const { translationX, velocityX } = event.nativeEvent;

      if (
        Math.abs(translationX) > screenWidth * 0.3 ||
        Math.abs(velocityX) > 1000
      ) {
        if (translationX > 0) {
          handleSwipe("right");
        } else {
          handleSwipe("left");
        }
      }

      Animated.spring(translateX, {
        toValue: 0,
        useNativeDriver: true,
      }).start();
    }
  };

  const getMealImage = () => {
    if (currentMeal.image) {
      return { uri: currentMeal.image };
    }
    if (currentMeal.imageUri) {
      return { uri: currentMeal.imageUri };
    }
    if (currentMeal.imageUrl) {
      return { uri: currentMeal.imageUrl };
    }
    // Return a default placeholder object that can be handled by Image component
    return {
      uri: "https://via.placeholder.com/400x300/f0f0f0/666666?text=Meal+Image",
    };
  };

  const formatNutrition = (value) => {
    if (value === null || value === undefined) return "No data";
    if (value === 0) return "0";
    return formatNutritionValue(value);
  };

  const getNutritionValue = (field) => {
    // Get nutrition value by calculating total from all meals in this time slot
    const meal = currentMeal;

    // Debug: Log the meal structure to understand data flow
    console.log("🔍 Meal nutrition debug:", {
      mealName: meal.name || meal.label,
      nutrition: meal.nutrition,
      nutritionInfo: meal.nutritionInfo,
      field: field,
    });

    // Initialize total
    let total = 0;
    let hasValidData = false;

    // Check if this meal has multiple meals assigned (like breakfast with multiple items)
    if (meal.meals && Array.isArray(meal.meals)) {
      // Calculate total from all assigned meals
      meal.meals.forEach((assignedMeal) => {
        const value = getMealNutritionValue(assignedMeal, field);
        if (value !== null && value !== undefined) {
          total += Number(value) || 0;
          hasValidData = true;
        }
      });
    } else {
      // Single meal - get its nutrition value directly
      const value = getMealNutritionValue(meal, field);
      if (value !== null && value !== undefined) {
        total = Number(value) || 0;
        hasValidData = true;
      }
    }

    console.log(
      `✅ Calculated total ${field}:`,
      total,
      "hasValidData:",
      hasValidData
    );
    return hasValidData ? total : null;
  };

  const getMealNutritionValue = (meal, field) => {
    // Helper function to extract nutrition value from individual meal

    // Primary source: meal.nutrition (from DailyMeal model)
    if (
      meal.nutrition &&
      meal.nutrition[field] !== undefined &&
      meal.nutrition[field] !== null
    ) {
      return meal.nutrition[field];
    }

    // Secondary source: meal.nutritionInfo (from schema)
    if (
      meal.nutritionInfo &&
      meal.nutritionInfo[field] !== undefined &&
      meal.nutritionInfo[field] !== null
    ) {
      return meal.nutritionInfo[field];
    }

    // Tertiary source: direct field on meal object
    if (meal[field] !== undefined && meal[field] !== null) {
      return meal[field];
    }

    // No data available
    return null;
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
      statusBarTranslucent
      transparent={false}
    >
      <View style={styles(colors).container}>
        <PanGestureHandler
          ref={gestureRef}
          onGestureEvent={onGestureEvent}
          onHandlerStateChange={onHandlerStateChange}
        >
          <Animated.View
            style={[
              styles(colors).content,
              {
                transform: [{ translateX }],
              },
            ]}
          >
            {/* Meal Image - Full Height */}
            <View style={styles(colors).imageContainer}>
              <Image
                source={getMealImage()}
                style={styles(colors).mealImage}
                resizeMode="cover"
              />

              {/* Title Badge at Bottom */}
              <View style={styles(colors).titleBadge}>
                <Text style={styles(colors).mealTitle}>
                  {currentMeal.label ||
                    currentMeal.type ||
                    currentMeal.mealType ||
                    "Meal"}
                </Text>
              </View>
            </View>

            {/* Dark Content Area - Overlaying Image */}
            <View style={styles(colors).ContentContainer}>
              <ScrollView
                style={styles(colors).scrollableContent}
                showsVerticalScrollIndicator={false}
              >
                {/* Meal Name */}
                <Text style={styles(colors).mealNameTitle}>
                  {currentMeal.customTitle ||
                    currentMeal.name ||
                    currentMeal.title ||
                    "Meal"}
                </Text>

                {/* Description Section */}
                <View style={styles(colors).descriptionSection}>
                  <Text style={styles(colors).description}>
                    {currentMeal.description ||
                      "Experience the authentic taste of Nigeria with our carefully crafted meals. From Jollof rice to Suya, we bring your favorite local dishes right to you in under 30 minutes."}
                  </Text>
                </View>

                {/* Quick Stats Section */}
                <View style={styles(colors).statsSection}>
                  <Text style={styles(colors).statsTitle}>Meal Stats</Text>
                  <View style={styles(colors).statsGrid}>
                    <View style={styles(colors).statCard}>
                      <Text style={styles(colors).statValue}>
                        {formatCalories(getNutritionValue("calories"))}
                      </Text>
                      <Text style={styles(colors).statLabel}>Calories</Text>
                    </View>

                    <View style={styles(colors).statCard}>
                      <Text style={styles(colors).statValue}>
                        {formatNutrition(getNutritionValue("protein"))}g
                      </Text>
                      <Text style={styles(colors).statLabel}>Protein</Text>
                    </View>

                    <View style={styles(colors).statCard}>
                      <Text style={styles(colors).statValue}>
                        {formatNutrition(getNutritionValue("carbs"))}g
                      </Text>
                      <Text style={styles(colors).statLabel}>Carbs</Text>
                    </View>

                    <View style={styles(colors).statCard}>
                      <Text style={styles(colors).statValue}>
                        {formatNutrition(getNutritionValue("fat"))}g
                      </Text>
                      <Text style={styles(colors).statLabel}>Fat</Text>
                    </View>

                    <View style={styles(colors).statCard}>
                      <Text style={styles(colors).statValue}>
                        {formatNutrition(getNutritionValue("fiber"))}g
                      </Text>
                      <Text style={styles(colors).statLabel}>Fiber</Text>
                    </View>

                    <View style={styles(colors).statCard}>
                      <Text style={styles(colors).statValue}>
                        {formatNutrition(getNutritionValue("sugar"))}g
                      </Text>
                      <Text style={styles(colors).statLabel}>Sugar</Text>
                    </View>
                  </View>
                </View>

                {/* Bottom padding for scroll */}
                <View style={styles(colors).bottomScrollPadding} />
              </ScrollView>

              {/* Navigation Buttons - Outside ScrollView */}
              <View style={styles(colors).navigationContainerParent}>
                <View style={styles(colors).navigationContainer}>
                  {/* Left Chevron - Previous Meal */}
                  <TouchableOpacity
                    style={[
                      styles(colors).navButton,
                      currentIndex === 0 && styles(colors).navButtonDisabled,
                    ]}
                    onPress={() => handleSwipe("right")}
                    disabled={currentIndex === 0}
                  >
                    <Ionicons
                      name="chevron-back"
                      size={28}
                      color={currentIndex === 0 ? "#666" : "#000"}
                    />
                  </TouchableOpacity>

                  {/* Close Button - Center */}
                  <TouchableOpacity
                    style={styles(colors).closeButton}
                    onPress={onClose}
                  >
                    <Ionicons name="close" size={34} color="#000" />
                  </TouchableOpacity>

                  {/* Right Chevron - Next Meal */}
                  <TouchableOpacity
                    style={[
                      styles(colors).navButton,
                      currentIndex === meals.length - 1 &&
                        styles(colors).navButtonDisabled,
                    ]}
                    onPress={() => handleSwipe("left")}
                    disabled={currentIndex === meals.length - 1}
                  >
                    <Ionicons
                      name="chevron-forward"
                      size={28}
                      color={
                        currentIndex === meals.length - 1 ? "#666" : "#000"
                      }
                    />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Animated.View>
        </PanGestureHandler>

        {/* Page Indicators */}
        {meals.length > 1 && (
          <View style={styles(colors).indicatorContainer}>
            {meals.map((_, index) => (
              <View
                key={index}
                style={[
                  styles(colors).indicator,
                  index === currentIndex && styles(colors).activeIndicator,
                ]}
              />
            ))}
          </View>
        )}
      </View>
    </Modal>
  );
};

const styles = (colors) =>
  createStylesWithDMSans({
    container: {
      flex: 1,
      backgroundColor: "#000",
    },
    content: {
      flex: 1,
    },
    imageContainer: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      height: screenHeight * 0.6,
      width: screenWidth,
      backgroundColor: "#000",
    },
    mealImage: {
      width: "100%",
      height: "100%",
    },
    titleBadge: {
      position: "absolute",
      top: screenHeight * 0.4,
      left: 30,
      right: 30,
      backgroundColor: "#1b1b1b",
      borderRadius: 35,
      paddingVertical: 15,
      paddingHorizontal: 20,
      alignItems: "center",
    },
    mealTitle: {
      fontSize: 18,
      fontWeight: "600",
      color: "white",
      textAlign: "center",
    },
    ContentContainer: {
      position: "absolute",
      bottom: 0,
      left: 0,
      right: 0,
      height: screenHeight * 0.5,
      backgroundColor: "#1a1a1a",
      borderTopLeftRadius: 30,
      borderTopRightRadius: 30,
      paddingTop: 30,
      paddingHorizontal: 20,
    },
    scrollableContent: {
      flex: 1,
    },
    mealNameTitle: {
      fontSize: 24,
      fontWeight: "bold",
      color: "white",
      marginBottom: 2,
      textAlign: "left",
    },
    descriptionSection: {
      marginBottom: 30,
    },
    description: {
      fontSize: 16,
      lineHeight: 24,
      color: "#cccccc",
    },
    statsTitle: {
      fontSize: 18,
      fontWeight: "600",
      color: "white",
      marginBottom: 20,
    },
    statsGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      justifyContent: "space-between",
    },
    statCard: {
      width: "48%",
      backgroundColor: "#2a2a2a",
      borderRadius: 12,
      padding: 20,
      marginBottom: 15,
      alignItems: "center",
      borderWidth: 1,
      borderColor: "#333",
    },
    statValue: {
      fontSize: 28,
      fontWeight: "bold",
      color: "white",
      marginBottom: 8,
    },
    statUnit: {
      fontSize: 20,
      fontWeight: "bold",
      color: "white",
    },
    statLabel: {
      fontSize: 14,
      color: "#888",
      textTransform: "capitalize",
    },
    bottomScrollPadding: {
      height: 80,
    },
    navigationContainerParent: {
      width: "100%",
      left: 0,
      right: 0,
      paddingHorizontal: 0,
      height: 70,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      // position: "absolute",
      bottom: 70,
      width: "100%",
    },
    navigationContainer: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      width: "100%",
      gap: 30,
    },
    navButton: {
      width: 60,
      height: 60,
      borderRadius: 30,
      backgroundColor: "#FFA726",
      justifyContent: "center",
      alignItems: "center",
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 8,
    },
    navButtonDisabled: {
      backgroundColor: "#333",
      opacity: 0.5,
    },
    closeButton: {
      width: 70,
      height: 70,
      borderRadius: 35,
      backgroundColor: "#FFA726",
      justifyContent: "center",
      alignItems: "center",
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 8,
    },
    indicatorContainer: {
      position: "absolute",
      bottom: 40,
      left: 0,
      right: 0,
      flexDirection: "row",
      justifyContent: "center",
      alignItems: "center",
    },
    indicator: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: "rgba(255,255,255,0.4)",
      marginHorizontal: 4,
    },
    activeIndicator: {
      backgroundColor: "white",
      width: 20,
    },
  });

export default MealDetailModal;
