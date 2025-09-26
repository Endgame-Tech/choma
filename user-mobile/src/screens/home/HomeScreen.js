// src/screens/home/HomeScreen.js - Interactive meal plan selector with spinning dish
import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  Dimensions,
  StatusBar,
  Animated,
  Platform,
} from "react-native";
import { PanGestureHandler, State } from "react-native-gesture-handler";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "../../styles/theme";
import NotificationIcon from "../../components/ui/NotificationIcon";
import CustomIcon from "../../components/ui/CustomIcon";
import { createStylesWithDMSans } from "../../utils/fontUtils";
import { useAuth } from "../../hooks/useAuth";
import { useMealPlans } from "../../hooks/useMealPlans";
import { LinearGradient } from "expo-linear-gradient";
import SpinDish from "../../../assets/spin-dish.svg";

const { width, height } = Dimensions.get("window");

const HomeScreen = ({ navigation }) => {
  const { isDark, colors } = useTheme();
  const { user } = useAuth();
  const { mealPlans } = useMealPlans();

  // State for meal plan selection
  const [selectedPlanIndex, setSelectedPlanIndex] = useState(0);
  const [selectedPlan, setSelectedPlan] = useState(null);

  // Create infinite meal plans array
  const infinitePlans = mealPlans ? [
    ...mealPlans,
    ...mealPlans,
    ...mealPlans,
    ...mealPlans,
    ...mealPlans,
  ] : [];

  const centerIndex = mealPlans ? mealPlans.length * 2 : 0; // Middle set

  // Animation values
  const dishRotation = useRef(new Animated.Value(0)).current;
  const imageOpacity = useRef(new Animated.Value(1)).current;
  const arcRotation = useRef(new Animated.Value(0)).current;
  const dragStartX = useRef(0);
  const dragStartRotation = useRef(0);

  // Animated values for infinite meal plan positions
  const animatedPositions = useRef(
    infinitePlans ? infinitePlans.map(() => ({
      x: new Animated.Value(0),
      y: new Animated.Value(0),
      scale: new Animated.Value(1),
      opacity: new Animated.Value(1),
    })) : []
  ).current;

  // Initialize animated positions when meal plans load
  useEffect(() => {
    if (mealPlans && mealPlans.length > 0) {
      setSelectedPlan(mealPlans[0]);

      // Initialize animated positions array if not already done
      if (animatedPositions.length !== infinitePlans.length) {
        animatedPositions.length = 0;
        animatedPositions.push(...infinitePlans.map(() => ({
          x: new Animated.Value(0),
          y: new Animated.Value(0),
          scale: new Animated.Value(1),
          opacity: new Animated.Value(1),
        })));
      }

      // Set initial positions starting from center
      updateItemPositions(centerIndex);
    }
  }, [mealPlans]);

  // Function to update all item positions with smooth animation
  const updateItemPositions = (selectedIndex, animate = true) => {
    if (!mealPlans || animatedPositions.length === 0) return;

    const animations = [];
    const totalPlans = mealPlans.length;
    const visibleRange = 9; // Show more items for better visibility during transitions

    infinitePlans.forEach((plan, index) => {
      // Calculate relative position from selected index
      let relativeIndex = index - selectedIndex;

      // Extended visibility range for smoother transitions
      if (Math.abs(relativeIndex) > visibleRange) {
        // Smoothly hide items far from center
        animations.push(
          Animated.parallel([
            Animated.timing(animatedPositions[index].opacity, {
              toValue: 0,
              duration: animate ? 600 : 0,
              useNativeDriver: false,
            }),
            Animated.timing(animatedPositions[index].scale, {
              toValue: 0.3,
              duration: animate ? 600 : 0,
              useNativeDriver: false,
            }),
          ])
        );
        return;
      }

      // Arc spans from 180 to 360 degrees (wider bottom arc for better visibility)
      const centerAngle = 270; // Bottom center
      const angleRange = 180; // Wider arc for smoother transitions
      const maxAngleStep = 25; // Maximum angle between adjacent items
      const angleStep = Math.min(angleRange / Math.max(visibleRange - 1, 1), maxAngleStep);
      const angle = centerAngle + (relativeIndex * angleStep);

      const radius = (width + 300) / 2 - 60;
      const radian = (angle * Math.PI) / 180;
      const x = Math.cos(radian) * radius;
      const y = Math.sin(radian) * radius;

      // Smoother scaling curve based on distance from center
      const distanceFromCenter = Math.abs(relativeIndex);
      const normalizedDistance = Math.min(distanceFromCenter, 4) / 4;

      // More dramatic scaling for better visual effect
      let scale;
      let opacity;

      if (relativeIndex === 0) {
        // Center item - largest
        scale = 1.6;
        opacity = 1;
      } else if (distanceFromCenter === 1) {
        // Adjacent items - medium
        scale = 1.2;
        opacity = 0.9;
      } else if (distanceFromCenter === 2) {
        // Second adjacent - smaller
        scale = 0.95;
        opacity = 0.7;
      } else {
        // Further items - smallest
        scale = 0.7 - normalizedDistance * 0.2;
        opacity = 0.5 - normalizedDistance * 0.2;
      }

      // Longer duration for smoother, more visible transitions
      const duration = animate ? 800 : 0;
      const easing = {
        easing: require('react-native').Easing.bezier(0.25, 0.46, 0.45, 0.94), // Smooth easing curve
      };

      animations.push(
        Animated.parallel([
          Animated.timing(animatedPositions[index].x, {
            toValue: x,
            duration,
            useNativeDriver: false,
            ...easing,
          }),
          Animated.timing(animatedPositions[index].y, {
            toValue: y,
            duration,
            useNativeDriver: false,
            ...easing,
          }),
          Animated.timing(animatedPositions[index].scale, {
            toValue: scale,
            duration,
            useNativeDriver: false,
            ...easing,
          }),
          Animated.timing(animatedPositions[index].opacity, {
            toValue: opacity,
            duration,
            useNativeDriver: false,
            ...easing,
          }),
        ])
      );
    });

    // Run all animations in parallel
    if (animate) {
      Animated.parallel(animations).start();
    } else {
      // Set values immediately without animation
      animations.forEach(animation => {
        animation._children?.forEach(child => {
          child._animation?.start();
        });
      });
    }
  };

  // Handle meal plan selection with animations
  const handlePlanSelect = (plan, index) => {
    if (selectedPlanIndex === index) return;

    // Animate dish rotation
    const rotationValue = index * (360 / mealPlans.length);
    Animated.timing(dishRotation, {
      toValue: rotationValue,
      duration: 500,
      useNativeDriver: true,
    }).start();

    // Animate image transition
    Animated.sequence([
      Animated.timing(imageOpacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(imageOpacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();

    // Update item positions with animation
    updateItemPositions(index, true);

    setSelectedPlanIndex(index);
    setSelectedPlan(plan);
  };

  // Handle swipe left (next plan)
  const goToNextPlan = () => {
    if (!mealPlans || mealPlans.length === 0) return;

    const currentInfiniteIndex = centerIndex + selectedPlanIndex;
    const nextInfiniteIndex = currentInfiniteIndex + 1;

    // Update selected plan index (wrapping around the original array)
    const nextIndex = (selectedPlanIndex + 1) % mealPlans.length;
    const nextPlan = mealPlans[nextIndex];

    updateItemPositions(nextInfiniteIndex, true);

    setSelectedPlanIndex(nextIndex);
    setSelectedPlan(nextPlan);
  };

  // Handle swipe right (previous plan)
  const goToPreviousPlan = () => {
    if (!mealPlans || mealPlans.length === 0) return;

    const currentInfiniteIndex = centerIndex + selectedPlanIndex;
    const prevInfiniteIndex = currentInfiniteIndex - 1;

    // Update selected plan index (wrapping around the original array)
    const prevIndex = selectedPlanIndex === 0 ? mealPlans.length - 1 : selectedPlanIndex - 1;
    const prevPlan = mealPlans[prevIndex];

    updateItemPositions(prevInfiniteIndex, true);

    setSelectedPlanIndex(prevIndex);
    setSelectedPlan(prevPlan);
  };

  // Handle drag gestures for continuous rotation
  const handleDragGesture = (event) => {
    const { translationX } = event.nativeEvent;

    // Calculate continuous drag offset (not discrete steps)
    const dragSensitivity = width / (mealPlans.length * 2); // More sensitive for smoother dragging
    const continuousOffset = translationX / dragSensitivity;

    // Calculate floating point index for smooth interpolation
    const currentInfiniteIndex = centerIndex + selectedPlanIndex;
    const draggedIndex = currentInfiniteIndex + continuousOffset;

    // Update positions with smooth interpolation during drag
    updateItemPositionsSmooth(draggedIndex);

    // Update dish rotation continuously
    const rotationDegrees = (continuousOffset * 360) / mealPlans.length;
    dishRotation.setValue(dragStartRotation.current + rotationDegrees);

    // Update selection only when crossing discrete boundaries
    const discreteIndex = Math.round(draggedIndex);
    const newPlanIndex = ((discreteIndex % mealPlans.length) + mealPlans.length) % mealPlans.length;

    if (newPlanIndex !== selectedPlanIndex) {
      setSelectedPlanIndex(newPlanIndex);
      setSelectedPlan(mealPlans[newPlanIndex]);

      // Quick image transition for real-time feedback
      Animated.timing(imageOpacity, {
        toValue: 0.9,
        duration: 100,
        useNativeDriver: true,
      }).start(() => {
        Animated.timing(imageOpacity, {
          toValue: 1,
          duration: 150,
          useNativeDriver: true,
        }).start();
      });
    }
  };

  // Smooth position update function for real-time dragging
  const updateItemPositionsSmooth = (centerIndex) => {
    if (!mealPlans || animatedPositions.length === 0) return;

    const visibleRange = 9;

    infinitePlans.forEach((plan, index) => {
      // Calculate relative position from dragged center
      let relativeIndex = index - centerIndex;

      // Only update items within visible range
      if (Math.abs(relativeIndex) > visibleRange) {
        animatedPositions[index].opacity.setValue(0);
        animatedPositions[index].scale.setValue(0.3);
        return;
      }

      // Calculate smooth positions
      const centerAngle = 270;
      const maxAngleStep = 25;
      const angle = centerAngle + (relativeIndex * maxAngleStep);

      const radius = (width + 300) / 2 - 60;
      const radian = (angle * Math.PI) / 180;
      const x = Math.cos(radian) * radius;
      const y = Math.sin(radian) * radius;

      // Smooth scaling and opacity
      const distanceFromCenter = Math.abs(relativeIndex);
      let scale, opacity;

      if (distanceFromCenter < 0.5) {
        // Very close to center
        scale = 1.6 - (distanceFromCenter * 0.8);
        opacity = 1;
      } else if (distanceFromCenter < 1.5) {
        // Close to center
        scale = 1.2 - ((distanceFromCenter - 0.5) * 0.5);
        opacity = 0.9;
      } else if (distanceFromCenter < 2.5) {
        // Medium distance
        scale = 0.95 - ((distanceFromCenter - 1.5) * 0.25);
        opacity = 0.7;
      } else {
        // Far from center
        scale = 0.7 - ((distanceFromCenter - 2.5) * 0.1);
        opacity = 0.5;
      }

      // Set values immediately for real-time response
      animatedPositions[index].x.setValue(x);
      animatedPositions[index].y.setValue(y);
      animatedPositions[index].scale.setValue(Math.max(scale, 0.3));
      animatedPositions[index].opacity.setValue(Math.max(opacity, 0));
    });
  };

  // Handle swipe/drag state changes
  const handleSwipeStateChange = (event) => {
    const { translationX, state } = event.nativeEvent;

    console.log('Gesture state change:', { translationX, state }); // Debug log

    if (state === State.BEGAN) {
      // Store starting position and rotation
      dragStartX.current = translationX;
      dragStartRotation.current = dishRotation._value || 0;
      console.log('Drag started');
    } else if (state === State.END || state === State.CANCELLED) {
      console.log('Gesture ended with translationX:', translationX);

      // Smoothly animate to the final snapped position
      const currentInfiniteIndex = centerIndex + selectedPlanIndex;
      updateItemPositions(currentInfiniteIndex, true);

      // Update base rotation for next gesture
      const finalRotation = selectedPlanIndex * (360 / mealPlans.length);
      dragStartRotation.current = finalRotation;

      // Handle quick swipes for navigation
      if (Math.abs(translationX) > 100) { // Threshold for intentional swipes
        if (translationX > 100) {
          // Swiped right - go to previous plan
          console.log('Going to previous plan');
          setTimeout(() => goToPreviousPlan(), 100); // Small delay for smooth transition
        } else if (translationX < -100) {
          // Swiped left - go to next plan
          console.log('Going to next plan');
          setTimeout(() => goToNextPlan(), 100); // Small delay for smooth transition
        }
      }
    }
  };

  const getPlanImage = (plan) => {
    return plan?.imageUrl || plan?.images?.[0] || plan?.image || require("../../../assets/authImage.png");
  };

  const getPlanDescription = (plan) => {
    if (!plan) return "Perfect for healthy eating";
    return (
      plan.mealPlanDetails?.description ||
      plan.description ||
      plan.summary ||
      plan.shortDescription ||
      "Perfect for your lifestyle"
    );
  };

  return (
    <SafeAreaView style={styles(colors).container}>
      <StatusBar
        barStyle="light-content"
        backgroundColor="#652815"
      />

      <ScrollView
        style={styles(colors).mainScrollView}
        showsVerticalScrollIndicator={false}
      >
        {/* Brown Background Section */}
        <LinearGradient
          colors={['#652815', '#7A2E18']}
          style={styles(colors).heroSection}
        >
          {/* Header */}
          <View style={styles(colors).header}>
            <TouchableOpacity style={styles(colors).locationContainer}>
              <View style={styles(colors).locationPill}>
                <CustomIcon name="location-filled" size={14} color={colors.primary} />
                <Text style={styles(colors).locationText} numberOfLines={1}>
                  {user?.address || "My Current Location"}
                </Text>
                <CustomIcon name="chevron-down" size={12} color="#fff" />
              </View>
            </TouchableOpacity>

            <View style={styles(colors).notificationContainer}>
              <NotificationIcon navigation={navigation} />
            </View>
          </View>

          {/* Hero Content */}
          <View style={styles(colors).heroContent}>
            <Text style={styles(colors).heroTitle}>Eat healthy!</Text>
            <Text style={styles(colors).heroSubtitle}>getChoma</Text>

            {/* Main Food Image */}
            <View style={styles(colors).foodImageContainer}>
              {/* Food Image */}
              <Animated.View
                style={[
                  styles(colors).foodImageWrapper,
                  { opacity: imageOpacity }
                ]}
              >
                <Image
                  source={typeof getPlanImage(selectedPlan) === 'string'
                    ? { uri: getPlanImage(selectedPlan) }
                    : getPlanImage(selectedPlan)
                  }
                  style={styles(colors).foodImage}
                  resizeMode="cover"
                />
              </Animated.View>

              {/* Plan Name Badge */}
              {selectedPlan && (
                <View style={styles(colors).planBadge}>
                  <Text style={styles(colors).planBadgeText}>
                    {selectedPlan.planName || selectedPlan.name || "FitFam"}
                  </Text>
                </View>
              )}

            </View>
          {/* Choose Plan Header */}
          <View style={styles(colors).choosePlanHeader}>
            <Text style={styles(colors).chooseTitle}>Chose a plan</Text>
          </View>
          </View>
        </LinearGradient>
        

        {/* Bottom Section with Spinning Dish */}
        <View style={styles(colors).bottomSection}>
          <View style={styles(colors).planSelectionContainer}>
            {/* Spinning Dish with Draggable Arc Selection */}
            <PanGestureHandler
              onGestureEvent={handleDragGesture}
              onHandlerStateChange={handleSwipeStateChange}
            >
              <Animated.View
                style={styles(colors).dishSelectionContainer}
                onTouchStart={() => console.log('Touch started')}
                onTouchEnd={() => console.log('Touch ended')}
              >
              {/* Spinning Dish Background */}
              <Animated.View
                style={[
                  styles(colors).bottomSpinDishContainer,
                  {
                    transform: [
                      {
                        rotate: dishRotation.interpolate({
                          inputRange: [0, 360],
                          outputRange: ['0deg', '360deg'],
                        }),
                      },
                    ],
                  },
                ]}
              >
                <SpinDish width={width + 300} height={width + 300} />
              </Animated.View>

              {/* Meal Plan Items in Arc - Infinite */}
              {infinitePlans?.map((plan, index) => {
                const originalIndex = index % mealPlans.length;
                const isSelected = selectedPlanIndex === originalIndex;

                // Use animated positions if available, otherwise fallback to default
                const animatedPos = animatedPositions[index];
                if (!animatedPos) return null;

                return (
                  <Animated.View
                    key={`${plan._id || plan.id || originalIndex}-${index}`}
                    style={[
                      styles(colors).arcPlanItem,
                      {
                        transform: [
                          { translateX: animatedPos.x },
                          { translateY: animatedPos.y },
                          { scale: animatedPos.scale }
                        ],
                        opacity: animatedPos.opacity,
                        zIndex: isSelected ? 10 : 5,
                      }
                    ]}
                  >
                    <TouchableOpacity
                      style={styles(colors).arcPlanButton}
                      onPress={() => {
                        updateItemPositions(index, true);
                        setSelectedPlanIndex(originalIndex);
                        setSelectedPlan(mealPlans[originalIndex]);
                      }}
                      activeOpacity={0.8}
                    >
                      <Image
                        source={typeof getPlanImage(plan) === 'string'
                          ? { uri: getPlanImage(plan) }
                          : getPlanImage(plan)
                        }
                        style={[
                          styles(colors).arcPlanImage,
                          isSelected && { borderWidth: 3, borderColor: '#E6B17A' }
                        ]}
                        resizeMode="cover"
                      />
                    </TouchableOpacity>
                  </Animated.View>
                );
              })}

              {/* Content positioned on the dish */}
              <View style={styles(colors).dishContentContainer}>
                {/* Selected Plan Info */}
                {selectedPlan && (
                  <View style={styles(colors).planInfo}>
                    <Text style={styles(colors).planInfoTitle}>
                      {selectedPlan.planName || selectedPlan.name || "FitFam"}
                    </Text>
                    <Text style={styles(colors).planInfoDescription}>
                      {getPlanDescription(selectedPlan)}
                    </Text>

                    <TouchableOpacity
                      style={styles(colors).learnMoreButton}
                      onPress={() => navigation.navigate("MealPlanDetail", { bundle: selectedPlan })}
                    >
                      <Text style={styles(colors).learnMoreText}>Learn more</Text>
                    </TouchableOpacity>
                  </View>
                )}

                {/* Search Button */}
                <TouchableOpacity
                  style={styles(colors).searchButton}
                  onPress={() => navigation.navigate("Search")}
                >
                  <Text style={styles(colors).searchButtonText}>Search</Text>
                </TouchableOpacity>
              </View>
              </Animated.View>
            </PanGestureHandler>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = (colors) =>
  createStylesWithDMSans({
    container: {
      flex: 1,
      backgroundColor: "#652815",
    },
    mainScrollView: {
      flex: 1,
    },
    heroSection: {
      minHeight: height * 0.7,
      backgroundColor: "#652815",
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 20,
      paddingTop: 20,
      paddingBottom: 10,
    },
    locationContainer: {
      flex: 1,
    },
    locationPill: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: "rgba(255, 255, 255, 0.2)",
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 20,
      alignSelf: "flex-start",
    },
    locationText: {
      fontSize: 14,
      color: "#fff",
      marginLeft: 6,
      marginRight: 6,
      fontWeight: "500",
    },
    notificationContainer: {
      alignItems: "flex-end",
    },
    choosePlanHeader: {
      alignItems: "center",
      // paddingTop: 20,
      paddingBottom: 10,
    },
    heroContent: {
      alignItems: "center",
      paddingHorizontal: 20,
      paddingTop: 20,
    },
    heroTitle: {
      fontSize: 32,
      fontWeight: "700",
      color: "#fff",
      textAlign: "center",
    },
    heroSubtitle: {
      fontSize: 24,
      fontWeight: "600",
      color: "#E6B17A",
      textAlign: "center",
      // marginBottom: 40,
    },
    foodImageContainer: {
      position: "relative",
      alignItems: "center",
      justifyContent: "center",
      width: 320,
      height: 320,
    },
    spinDishContainer: {
      position: "absolute",
      alignItems: "center",
      justifyContent: "center",
    },
    foodImageWrapper: {
      position: "absolute",
      alignItems: "center",
      justifyContent: "center",
    },
    foodImage: {
      width: 280,
      height: 280,
      borderRadius: 190,
    },
    planBadge: {
      position: "absolute",
      bottom: 50,
      backgroundColor: "#fff",
      paddingHorizontal: 20,
      paddingVertical: 8,
      borderRadius: 20,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.2,
      shadowRadius: 4,
      elevation: 4,
    },
    planBadgeText: {
      fontSize: 16,
      fontWeight: "600",
      color: "#652815",
    },
    bottomSection: {
      backgroundColor: "transparent",
      marginTop: -30,
      paddingTop: 40,
      minHeight: height * 0.4,
    },
    planSelectionContainer: {
      paddingHorizontal: 20,
      alignItems: "center",
    },
    dishSelectionContainer: {
      position: "relative",
      alignItems: "center",
      justifyContent: "center",
      width: width + 300,
      height: width + 300,
      marginBottom: 20,
    },
    bottomSpinDishContainer: {
      position: "absolute",
      alignItems: "center",
      justifyContent: "center",
    },
    dishContentContainer: {
      position: "absolute",
      alignItems: "center",
      justifyContent: "center",
      width: "100%",
      height: "100%",
      paddingTop: 60,
      zIndex: 5,
    },
    chooseTitle: {
      fontSize: 24,
      fontWeight: "600",
      color: "#E6B17A",
      marginBottom: 30,
    },
    planCarousel: {
      marginBottom: 30,
    },
    planCarouselContent: {
      paddingHorizontal: width / 2 - 40, // Center the carousel
      alignItems: 'center',
    },
    planItem: {
      width: 70,
      height: 70,
      borderRadius: 35,
      marginHorizontal: 5,
      borderWidth: 3,
      borderColor: "transparent",
      overflow: "hidden",
    },
    planItemSelected: {
      borderColor: "#E6B17A",
    },
    planItemImage: {
      width: "100%",
      height: "100%",
    },
    arcPlanItem: {
      position: "absolute",
      alignItems: "center",
      justifyContent: "center",
    },
    arcPlanButton: {
      width: 50,
      height: 50,
      borderRadius: 25,
      overflow: "hidden",
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.2,
      shadowRadius: 4,
      elevation: 4,
    },
    arcPlanImage: {
      width: "100%",
      height: "100%",
      borderRadius: 25,
    },
    planInfo: {
      alignItems: "center",
      marginBottom: 30,
      paddingHorizontal: 20,
    },
    planInfoTitle: {
      fontSize: 20,
      fontWeight: "600",
      color: "#333",
      marginBottom: 8,
    },
    planInfoDescription: {
      fontSize: 14,
      color: "#666",
      textAlign: "center",
      lineHeight: 20,
      marginBottom: 16,
    },
    learnMoreButton: {
      marginBottom: 10,
    },
    learnMoreText: {
      fontSize: 14,
      color: "#E6B17A",
      fontWeight: "500",
      textDecorationLine: "underline",
    },
    searchButton: {
      backgroundColor: "#652815",
      paddingHorizontal: 60,
      paddingVertical: 16,
      borderRadius: 25,
      marginBottom: 40,
    },
    searchButtonText: {
      fontSize: 16,
      fontWeight: "600",
      color: "#fff",
    },
  });

export default HomeScreen;