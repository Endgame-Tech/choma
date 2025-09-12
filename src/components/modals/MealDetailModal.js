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
import { PanGestureHandler } from "react-native-gesture-handler";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "../../styles/theme";

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
    if (event.nativeEvent.state === 5) {
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
    if (!value) return "0";
    return typeof value === "number" ? value.toString() : value;
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
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
                  {currentMeal.name || currentMeal.title || "BreakFast"}
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
                  {currentMeal.name || currentMeal.title || "BreakFast"}
                </Text>

                {/* Description Section */}
                <View style={styles(colors).descriptionSection}>
                  <Text style={styles(colors).descriptionTitle}>Description</Text>
                  <Text style={styles(colors).description}>
                    {currentMeal.description || 
                      "Experience the authentic taste of Nigeria with our carefully crafted meals. From Jollof rice to Suya, we bring your favorite local dishes right to you in under 30 minutes."}
                  </Text>
                </View>

                {/* Quick Stats Section */}
                <View style={styles(colors).statsSection}>
                  <Text style={styles(colors).statsTitle}>Quick Stats</Text>
                  <View style={styles(colors).statsGrid}>
                    <View style={styles(colors).statCard}>
                      <Text style={styles(colors).statValue}>
                        {formatNutrition(
                          currentMeal.protein || currentMeal.nutrition?.protein || "15"
                        )}k g
                      </Text>
                      <Text style={styles(colors).statLabel}>Protein</Text>
                    </View>

                    <View style={styles(colors).statCard}>
                      <Text style={styles(colors).statValue}>
                        {formatNutrition(
                          currentMeal.carbs ||
                            currentMeal.nutrition?.carbs ||
                            currentMeal.nutrition?.carbohydrates ||
                            "600"
                        )} g
                      </Text>
                      <Text style={styles(colors).statLabel}>Carbs</Text>
                    </View>

                    <View style={styles(colors).statCard}>
                      <Text style={styles(colors).statValue}>
                        {formatNutrition(
                          currentMeal.fat || currentMeal.nutrition?.fat || "20"
                        )} g
                      </Text>
                      <Text style={styles(colors).statLabel}>Fat</Text>
                    </View>

                    <View style={styles(colors).statCard}>
                      <Text style={styles(colors).statValue}>
                        {formatNutrition(
                          currentMeal.fiber || currentMeal.nutrition?.fiber || "19"
                        )} g
                      </Text>
                      <Text style={styles(colors).statLabel}>Fiber</Text>
                    </View>
                  </View>
                </View>

                {/* Bottom padding for scroll */}
                <View style={styles(colors).bottomScrollPadding} />
              </ScrollView>

              {/* Close Button - Outside ScrollView */}
              <TouchableOpacity
                style={styles(colors).closeButton}
                onPress={onClose}
              >
                <Ionicons name="close" size={24} color="#000" />
              </TouchableOpacity>
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
  StyleSheet.create({
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
    },
    mealImage: {
      width: "100%",
      height: "100%",
    },
    titleBadge: {
      position: "absolute",
      bottom: 60,
      left: 30,
      right: 30,
      backgroundColor: "#000",
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
      height: screenHeight * 0.55,
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
      marginBottom: 25,
      textAlign: "left",
    },
    descriptionSection: {
      marginBottom: 30,
    },
    descriptionTitle: {
      fontSize: 18,
      fontWeight: "600",
      color: "white",
      marginBottom: 15,
    },
    description: {
      fontSize: 16,
      lineHeight: 24,
      color: "#cccccc",
    },
    statsSection: {
      marginBottom: 30,
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
      height: 100,
    },
    closeButton: {
      position: "absolute",
      bottom: 30,
      left: "50%",
      marginLeft: -25,
      width: 50,
      height: 50,
      borderRadius: 25,
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
      top: 60,
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
