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
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "../../styles/theme";
import NotificationIcon from "../../components/ui/NotificationIcon";
import CustomIcon from "../../components/ui/CustomIcon";
import { createStylesWithDMSans } from "../../utils/fontUtils";
import { useAuth } from "../../hooks/useAuth";
import { useMealPlans } from "../../hooks/useMealPlans";
import { LinearGradient } from "expo-linear-gradient";

const { width, height } = Dimensions.get("window");

// Constants for infinite scroll
const PLAN_CHIP_SIZE = 70;
const PLAN_CHIP_MARGIN = 6;
const ITEM_TOTAL_WIDTH = PLAN_CHIP_SIZE + (PLAN_CHIP_MARGIN * 2);

// Placeholder data
const PLACEHOLDER_PLANS = [
  { id: 'placeholder-1', name: 'FitFam', description: 'Perfect for gym enthusiasts' },
  { id: 'placeholder-2', name: 'HealthyChoice', description: 'Balanced nutrition daily' },
  { id: 'placeholder-3', name: 'PowerPlan', description: 'High protein meals' },
  { id: 'placeholder-4', name: 'GreenLife', description: 'Fresh vegetables focus' },
  { id: 'placeholder-5', name: 'ActiveLife', description: 'Energy boosting meals' },
];

const HomeScreen = ({ navigation }) => {
  const { colors } = useTheme();
  const { user } = useAuth();
  const { mealPlans } = useMealPlans();

  const flatListRef = useRef(null);
  const [selectedPlanIndex, setSelectedPlanIndex] = useState(0);
  const [scrollX, setScrollX] = useState(0);

  const hasRealPlans = Boolean(mealPlans?.length);
  const basePlanData = hasRealPlans ? mealPlans : PLACEHOLDER_PLANS;

  // Create infinite scrolling data by repeating plans multiple times
  const planData = basePlanData.length > 0
    ? [...basePlanData, ...basePlanData, ...basePlanData, ...basePlanData, ...basePlanData]
    : basePlanData;

  // Initialize to middle of infinite list
  useEffect(() => {
    if (basePlanData.length > 0) {
      const middleIndex = Math.floor(planData.length / 2);
      setSelectedPlanIndex(middleIndex);
    }
  }, [basePlanData.length]);

  // Get the actual plan from the base data (handle infinite repetition)
  const getActualPlan = (index) => {
    if (!basePlanData.length) return null;
    const actualIndex = index % basePlanData.length;
    const plan = basePlanData[actualIndex];
    console.log('getActualPlan - index:', index, 'actualIndex:', actualIndex, 'plan:', plan?.name || plan?.planName);
    return plan;
  };

  const heroPlan = getActualPlan(selectedPlanIndex) || basePlanData[0] || null;
  const selectedPlan = hasRealPlans ? heroPlan : null;

  // Removed automatic scroll to prevent sliding back issue
  // The scroll position should only be controlled by user interaction

  const getPlanImage = (plan) => {
    if (!plan) {
      return require("../../../assets/authImage.png");
    }

    const imageSource =
      plan.imageUrl || plan.images?.[0] || plan.image || plan.thumbnail;

    if (typeof imageSource === "string") {
      return { uri: imageSource };
    }

    return imageSource || require("../../../assets/authImage.png");
  };

  const getPlanName = (plan) =>
    plan?.planName || plan?.name || plan?.title || "FitFam";

  const getPlanDescription = (plan) =>
    plan?.mealPlanDetails?.description ||
    plan?.description ||
    plan?.summary ||
    plan?.shortDescription ||
    "Perfect for healthy eating";

  const onSelectPlan = (index) => {
    if (!planData[index]) {
      return;
    }

    setSelectedPlanIndex(index);

    // Scroll to the selected plan when manually tapped
    if (flatListRef.current) {
      flatListRef.current.scrollTo({
        x: index * ITEM_TOTAL_WIDTH - 150, // Account for padding
        y: 0,
        animated: true,
      });
    }

    // Update the hero plan immediately
    const actualPlan = getActualPlan(index);
    if (actualPlan) {
      const actualIndex = index % basePlanData.length;
      console.log('Manually selected plan:', actualPlan.name || actualPlan.planName, 'at index:', actualIndex);
    }
  };

  const handleScroll = ({ nativeEvent }) => {
    const offsetX = nativeEvent.contentOffset.x;
    setScrollX(offsetX);
  };

  const handleMomentumScrollEnd = ({ nativeEvent }) => {
    if (!planData.length || !basePlanData.length) {
      return;
    }

    const offsetX = nativeEvent.contentOffset.x;
    snapToClosestPlan(offsetX);
  };

  const handleScrollEndDrag = ({ nativeEvent }) => {
    if (!planData.length || !basePlanData.length) {
      return;
    }

    const offsetX = nativeEvent.contentOffset.x;
    snapToClosestPlan(offsetX);
  };

  const snapToClosestPlan = (currentOffset) => {
    // Calculate which plan is closest to the center
    const centerPosition = width / 2;
    let closestIndex = 0;
    let minDistance = Infinity;

    for (let i = 0; i < planData.length; i++) {
      const itemPosition = (i * ITEM_TOTAL_WIDTH) - currentOffset + 150; // Account for padding
      const distanceFromCenter = Math.abs(itemPosition - centerPosition);

      if (distanceFromCenter < minDistance) {
        minDistance = distanceFromCenter;
        closestIndex = i;
      }
    }

    // Snap to the closest plan
    const snapOffset = closestIndex * ITEM_TOTAL_WIDTH - 150; // Account for padding

    if (flatListRef.current) {
      flatListRef.current.scrollTo({
        x: snapOffset,
        y: 0,
        animated: true,
      });
    }

    // Update selected index
    if (closestIndex !== selectedPlanIndex) {
      setSelectedPlanIndex(closestIndex);

      // Log the snapped plan
      const actualPlan = getActualPlan(closestIndex);
      const actualIndex = closestIndex % basePlanData.length;
      console.log('Snapped to plan:', actualPlan?.name || actualPlan?.planName, 'at actual index:', actualIndex);
    }
  };

  const selectedPlanName = getPlanName(heroPlan);
  const selectedPlanDescription = getPlanDescription(heroPlan);

  return (
    <SafeAreaView style={styles(colors).container}>
      <StatusBar barStyle="light-content" backgroundColor="#652815" />
      <ScrollView
        style={styles(colors).scrollView}
        contentContainerStyle={styles(colors).scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles(colors).heroWrapper}>
          <LinearGradient
            colors={["#652815", "#7A2E18"]}
            style={styles(colors).heroBackground}
          >
            <View style={styles(colors).header}>
              <TouchableOpacity style={styles(colors).locationPill}>
                <CustomIcon
                  name="location-filled"
                  size={14}
                  color={colors.primary || "#F9B87A"}
                />
                <Text style={styles(colors).locationText} numberOfLines={1}>
                  {user?.address || "My Current Location"}
                </Text>
                <CustomIcon name="chevron-down" size={12} color="#FFFFFF" />
              </TouchableOpacity>

              <NotificationIcon navigation={navigation} />
            </View>

            <View style={styles(colors).heroTextContainer}>
              <Text style={styles(colors).heroTitle}>Eat healthy!</Text>
              <Text style={styles(colors).heroSubtitle}>getChoma</Text>
            </View>

            <View style={styles(colors).heroImageContainer}>
              <View style={styles(colors).imageShadow} />
              <Image
                source={getPlanImage(heroPlan)}
                style={styles(colors).heroImage}
                resizeMode="cover"
              />
            </View>

            {heroPlan && (
              <View style={styles(colors).planBadge}>
                <Text style={styles(colors).planBadgeText}>
                  {selectedPlanName}
                </Text>
              </View>
            )}
          </LinearGradient>

          <View style={styles(colors).heroCurve} />
        </View>

        <View style={styles(colors).contentSection}>
          <Text style={styles(colors).chooseHeading}>Choose a plan</Text>

          <View style={styles(colors).planScrollContainer}>
            {/* Fixed Circle Indicator */}
            <View style={styles(colors).fixedCircleIndicator} />

            <ScrollView
              ref={flatListRef}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles(colors).planScroller}
              snapToInterval={ITEM_TOTAL_WIDTH}
              decelerationRate="fast"
              onScroll={handleScroll}
              scrollEventThrottle={16}
            >
              {planData.map((plan, index) => {
                const actualPlan = getActualPlan(index);

                // Calculate real-time position based on scroll
                const itemOffset = (index * ITEM_TOTAL_WIDTH) - scrollX;
                const centerPosition = width / 2;
                const distanceFromCenter = Math.abs(itemOffset - centerPosition + 150); // Account for padding

                // Scale based on proximity to center (closer = bigger)
                const maxDistance = 100;
                const minScale = 0.6;
                const maxScale = 1.3;
                const normalizedDistance = Math.min(distanceFromCenter, maxDistance) / maxDistance;
                const scale = maxScale - (normalizedDistance * (maxScale - minScale));

                // No opacity effect - all meal plans stay fully visible
                const opacity = 1.0;

                const isInCenter = distanceFromCenter < 50;

                return (
                  <TouchableOpacity
                    key={`${actualPlan?._id || actualPlan?.id || 'placeholder'}-${index}`}
                    style={[
                      styles(colors).planChip,
                      {
                        transform: [{ scale }],
                        opacity,
                      },
                      isInCenter && styles(colors).planChipCentered,
                    ]}
                    activeOpacity={0.85}
                    onPress={() => onSelectPlan(index)}
                  >
                    <Image
                      source={getPlanImage(actualPlan)}
                      style={styles(colors).planChipImage}
                      resizeMode="cover"
                    />
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          <View style={styles(colors).planInfoContainer}>
            <Text style={styles(colors).planTitle}>{selectedPlanName}</Text>
            <Text style={styles(colors).planDescription}>
              {selectedPlanDescription}
            </Text>

            <TouchableOpacity
              style={[
                styles(colors).learnMoreButton,
                !selectedPlan && styles(colors).learnMoreButtonDisabled,
              ]}
              onPress={() =>
                selectedPlan &&
                navigation.navigate("MealPlanDetail", {
                  bundle: selectedPlan,
                })
              }
              activeOpacity={0.7}
              disabled={!selectedPlan}
            >
              <Text style={styles(colors).learnMoreText}>Learn more</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={styles(colors).searchButton}
            onPress={() => navigation.navigate("Search")}
            activeOpacity={0.85}
          >
            <Text style={styles(colors).searchButtonText}>Search</Text>
          </TouchableOpacity>
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
    scrollView: {
      flex: 1,
    },
    scrollContent: {
      paddingBottom: 40,
    },
    heroWrapper: {
      position: "relative",
      backgroundColor: "#652815",
    },
    heroBackground: {
      paddingHorizontal: 20,
      paddingTop: 20,
      paddingBottom: 140,
      borderBottomLeftRadius: 40,
      borderBottomRightRadius: 40,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    locationPill: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: "rgba(255, 255, 255, 0.25)",
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 20,
      maxWidth: width * 0.6,
    },
    locationText: {
      fontSize: 14,
      color: "#FFFFFF",
      marginHorizontal: 8,
      fontWeight: "500",
    },
    heroTextContainer: {
      marginTop: 28,
      alignItems: "center",
    },
    heroTitle: {
      fontSize: 32,
      fontWeight: "700",
      color: "#FFFFFF",
    },
    heroSubtitle: {
      fontSize: 24,
      fontWeight: "600",
      color: "#F9B87A",
      marginTop: 4,
    },
    heroImageContainer: {
      marginTop: 24,
      alignItems: "center",
      justifyContent: "center",
    },
    imageShadow: {
      width: 240,
      height: 240,
      borderRadius: 120,
      backgroundColor: "rgba(255, 255, 255, 0.25)",
      position: "absolute",
      top: 20,
      opacity: 0.7,
      transform: [{ scale: 1.1 }],
    },
    heroImage: {
      width: 240,
      height: 240,
      borderRadius: 120,
      borderWidth: 6,
      borderColor: "#FFFFFF",
    },
    planBadge: {
      position: "absolute",
      bottom: -24,
      alignSelf: "center",
      backgroundColor: "#FFFFFF",
      paddingHorizontal: 26,
      paddingVertical: 10,
      borderRadius: 22,
      shadowColor: "#000000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 8,
      elevation: 6,
    },
    planBadgeText: {
      fontSize: 16,
      fontWeight: "600",
      color: "#652815",
    },
    heroCurve: {
      height: 60,
      backgroundColor: "#FFFFFF",
      borderTopLeftRadius: 40,
      borderTopRightRadius: 40,
      marginTop: -40,
    },
    contentSection: {
      marginTop: -40,
      paddingTop: 56,
      paddingHorizontal: 24,
      backgroundColor: "#FFFFFF",
      borderTopLeftRadius: 40,
      borderTopRightRadius: 40,
      shadowColor: "#000000",
      shadowOffset: { width: 0, height: -4 },
      shadowOpacity: 0.06,
      shadowRadius: 12,
      elevation: 4,
    },
    chooseHeading: {
      fontSize: 22,
      fontWeight: "600",
      color: "#652815",
      textAlign: "center",
    },
    planScrollContainer: {
      position: "relative",
      marginTop: 24,
      height: 150,
      justifyContent: "center",
    },
    fixedCircleIndicator: {
      position: "absolute",
      left: "50%",
      top: "50%",
      width: 80,
      height: 80,
      borderRadius: 40,
      backgroundColor: "#F9B87A",
      marginLeft: -40,
      marginTop: -40,
      zIndex: -20, // Behind the meal plans
      shadowColor: "#F9B87A",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.4,
      shadowRadius: 6,
      elevation: 2, // Lower elevation so it's behind
    },
    planScroller: {
      paddingHorizontal: width / 2 - 125, // Center first item: half screen width minus half item width (70/2)
      alignItems: "center",
      zIndex: 15, // Ensure ScrollView content is above fixed circle
    },
    planChip: {
      width: 70,
      height: 70,
      borderRadius: 35,
      marginHorizontal: 10,
      borderWidth: 2,
      borderColor: "transparent",
      overflow: "hidden",
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: "#F5F1EE",
      // shadowColor: "#000000",
      // shadowOffset: { width: 0, height: 2 },
      // shadowOpacity: 0.08,
      // shadowRadius: 4,
      // elevation: 20, // Much higher elevation
      // zIndex: 20, // Much higher z-index to be on top
    },
    planChipSelected: {
      borderColor: "#F9B87A",
      shadowOpacity: 0.25,
      elevation: 5,
    },
    planChipCentered: {
      borderWidth: 3,
      // borderColor: "#FFFFFF",
      // shadowColor: "#F9B87A",
      // shadowOffset: { width: 0, height: 4 },
      // shadowOpacity: 0.3,
      // shadowRadius: 8,
      // elevation: 25, // Highest elevation for centered plan
      // zIndex: 25, // Highest z-index for centered plan
    },
    planChipImage: {
      width: "100%",
      height: "100%",
      borderRadius: 35,
    },
    planInfoContainer: {
      marginTop: 32,
      alignItems: "center",
      paddingHorizontal: 4,
    },
    planTitle: {
      fontSize: 20,
      fontWeight: "600",
      color: "#652815",
    },
    planDescription: {
      marginTop: 10,
      fontSize: 14,
      color: "#7C6A64",
      textAlign: "center",
      lineHeight: 20,
    },
    learnMoreButton: {
      marginTop: 16,
    },
    learnMoreButtonDisabled: {
      opacity: 0.5,
    },
    learnMoreText: {
      fontSize: 14,
      color: "#F9B87A",
      fontWeight: "600",
      textDecorationLine: "underline",
    },
    searchButton: {
      marginTop: 28,
      marginBottom: 24,
      backgroundColor: "#652815",
      paddingVertical: 16,
      borderRadius: 28,
      alignItems: "center",
      shadowColor: "#652815",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.2,
      shadowRadius: 8,
      elevation: 4,
    },
    searchButtonText: {
      fontSize: 16,
      fontWeight: "600",
      color: "#FFFFFF",
    },
  });

export default HomeScreen;
