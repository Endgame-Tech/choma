import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Dimensions,
  StatusBar,
  ActivityIndicator,
  Platform,
  PixelRatio,
  Animated as RNAnimated,
} from "react-native";
import Animated, {
  Extrapolate,
  interpolate,
  useAnimatedStyle,
  useAnimatedScrollHandler,
  useSharedValue,
  withRepeat,
  withTiming,
  Easing,
  runOnJS,
} from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "../../styles/theme";
import CustomIcon from "../../components/ui/CustomIcon";
import { createStylesWithDMSans } from "../../utils/fontUtils";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import tagService from "../../services/tagService";
import { Svg, Path } from "react-native-svg";
import MaskedView from "@react-native-masked-view/masked-view";

const { width, height } = Dimensions.get("window");

// Responsive scaling utilities
const scale = (size) => {
  const pixelRatio = PixelRatio.get();
  const deviceScale = width / 375;
  const androidFactor =
    Platform.OS === "android" ? Math.min(pixelRatio / 2, 1.2) : 1;
  return size * deviceScale * androidFactor;
};

const verticalScale = (size) => (height / 812) * size;
const moderateScale = (size, factor = 0.5) =>
  size + (scale(size) - size) * factor;

const isSmallScreen = width < 350;
const isMediumScreen = width >= 350 && width < 414;
const isLargeScreen = width >= 414;
const isTablet = width >= 768;

const statusBarHeight =
  Platform.OS === "android" ? StatusBar.currentHeight || 0 : 0;

const getResponsiveValue = (small, medium, large, tablet = large) => {
  if (isTablet) return tablet;
  if (isLargeScreen) return large;
  if (isMediumScreen) return medium;
  return small;
};

const getShadowStyle = (shadowProps) => ({
  ...shadowProps,
  ...(Platform.OS === "android" && {
    elevation: shadowProps.shadowOpacity ? shadowProps.shadowOpacity * 10 : 5,
  }),
});

const heroImageSize = getResponsiveValue(260, 300, 340, 420);

const DurationItemWidth = getResponsiveValue(
  width / 4.5,
  width / 4,
  width / 3.2,
  width / 4.5
);

const DurationSelectionScreen = ({ navigation, route }) => {
  const { colors, isDark } = useTheme();
  const {
    tag,
    tagId,
    tagName,
    currentLocation = "My Current Location",
    prefetchedDurations = null,
  } = route.params;

  const flatListRef = useRef(null);
  const [mealPlans, setMealPlans] = useState([]);
  const [durationOptions, setDurationOptions] = useState(
    prefetchedDurations || []
  );
  const [loading, setLoading] = useState(!prefetchedDurations);
  const [currentDurationIndex, setCurrentDurationIndex] = useState(0);

  const contentOffset = useSharedValue(0);
  const spinValue = useSharedValue(0);
  const lastHapticIndex = useRef(0);

  useEffect(() => {
    // Start the spinning animation
    spinValue.value = withRepeat(
      withTiming(360, {
        duration: 20000,
        easing: Easing.linear,
      }),
      -1,
      false
    );

    loadMealPlans();

    return () => {
      spinValue.value = 0;
      contentOffset.value = 0;
    };
  }, []);

  const loadMealPlans = useCallback(async () => {
    // Skip loading if we have prefetched data
    if (prefetchedDurations && prefetchedDurations.length > 0) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const response = await tagService.getMealPlansByTag(tagId, 1, 100);

      if (response?.success && response?.data) {
        const plans = response.data || [];
        setMealPlans(plans);
        extractDurationOptions(plans);
      }
    } catch (error) {
      console.error("Error loading meal plans:", error);
      setDurationOptions([]);
    } finally {
      setLoading(false);
    }
  }, [tagId, prefetchedDurations]);

  const extractDurationOptions = useCallback((plans) => {
    try {
      // Extract unique duration weeks from meal plans
      const durations = [
        ...new Set(
          plans
            .map((plan) => plan.durationWeeks)
            .filter((duration) => duration && duration > 0)
        ),
      ].sort((a, b) => a - b);

      // Format duration options
      const formattedOptions = durations.map((weeks) => ({
        id: weeks,
        label: weeks === 1 ? "1 Week" : `${weeks} Weeks`,
        weeks: weeks,
        description: `${weeks} week${weeks > 1 ? "s" : ""} meal plan`,
      }));

      setDurationOptions(formattedOptions);
    } catch (error) {
      console.error("Error extracting duration options:", error);
      setDurationOptions([]);
    }
  }, []);

  const DurationCarouselItem = React.memo(({ duration, index }) => {
    const rStyle = useAnimatedStyle(() => {
      const inputRange = [
        (index - 2) * DurationItemWidth,
        (index - 1) * DurationItemWidth,
        index * DurationItemWidth,
        (index + 1) * DurationItemWidth,
        (index + 2) * DurationItemWidth,
      ];

      const translateYOutputRange = [
        0,
        -DurationItemWidth / 3,
        -DurationItemWidth / 2,
        -DurationItemWidth / 3,
        0,
      ];

      const opacityOutputRange = [0.7, 0.9, 1, 0.9, 0.7];
      const scaleOutputRange = [0.7, 0.8, 1, 0.8, 0.7];

      const translateY = interpolate(
        contentOffset.value,
        inputRange,
        translateYOutputRange,
        Extrapolate.CLAMP
      );

      const opacity = interpolate(
        contentOffset.value,
        inputRange,
        opacityOutputRange,
        Extrapolate.CLAMP
      );

      const scale = interpolate(
        contentOffset.value,
        inputRange,
        scaleOutputRange,
        Extrapolate.CLAMP
      );

      return {
        opacity,
        transform: [{ translateY }, { scale }],
      };
    });

    // Arrow visibility animation
    const arrowStyle = useAnimatedStyle(() => {
      const inputRange = [
        (index - 1) * DurationItemWidth,
        index * DurationItemWidth,
        (index + 1) * DurationItemWidth,
      ];

      const arrowOpacity = interpolate(
        contentOffset.value,
        inputRange,
        [0, 1, 0],
        Extrapolate.CLAMP
      );

      return {
        opacity: arrowOpacity,
      };
    });

    return (
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={() => onSelectDuration(index)}
        accessible={true}
        accessibilityRole="button"
        accessibilityLabel={`Select ${duration.label} duration`}
        accessibilityHint="Double tap to view meal plans with this duration"
      >
        <Animated.View
          style={[
            {
              width: DurationItemWidth,
              height: DurationItemWidth,
              justifyContent: "center",
              alignItems: "center",
              elevation: 5,
              shadowOpacity: 0.2,
              shadowOffset: { width: 0, height: 0 },
              shadowRadius: 20,
              minWidth: 44,
              minHeight: 44,
            },
            rStyle,
          ]}
        >
          {/* Duration disk background image */}
          <Image
            source={require("../../../assets/duration-disk.png")}
            style={{
              position: "absolute",
              width: DurationItemWidth,
              height: DurationItemWidth,
            }}
            resizeMode="contain"
          />

          {/* Content overlay */}
          <View
            style={{
              width: DurationItemWidth,
              height: DurationItemWidth,
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <Text
              style={{
                fontSize: moderateScale(18),
                fontWeight: "700",
                color: colors.white,
                textAlign: "center",
              }}
            >
              {duration.weeks}
            </Text>
            <Text
              style={{
                fontSize: moderateScale(10),
                fontWeight: "600",
                color: colors.white,
                textAlign: "center",
              }}
            >
              {duration.weeks === 1 ? "Week" : "Weeks"}
            </Text>
          </View>
        </Animated.View>
      </TouchableOpacity>
    );
  });

  const onSelectDuration = (index) => {
    if (!durationOptions[index]) return;

    const targetOffset = index * DurationItemWidth;
    const currentOffset = contentOffset.value;
    const distanceFromCenter = Math.abs(currentOffset - targetOffset);
    const isAtCenter = distanceFromCenter < 5;

    if (isAtCenter) {
      // Navigate to MealPlanListingScreen with tag and duration
      navigation.navigate("MealPlanListingScreen", {
        tag: tag,
        tagId: tagId,
        tagName: tagName,
        selectedDuration: durationOptions[index],
      });
    } else {
      // Scroll to center the item
      if (flatListRef.current) {
        flatListRef.current.scrollToOffset({
          offset: targetOffset,
          animated: true,
        });
      }
    }
  };

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      contentOffset.value = event.contentOffset.x;
    },
  });

  // Sync with scroll position for haptic feedback
  useEffect(() => {
    if (!durationOptions || durationOptions.length === 0) return;

    const interval = setInterval(() => {
      try {
        const currentIndex = Math.round(
          contentOffset.value / DurationItemWidth
        );
        const clampedIndex = Math.max(
          0,
          Math.min(currentIndex, durationOptions.length - 1)
        );

        if (clampedIndex !== currentDurationIndex) {
          setCurrentDurationIndex(clampedIndex);

          // Haptic feedback only when exactly centered
          const exactCenterOffset = clampedIndex * DurationItemWidth;
          const distanceFromCenter = Math.abs(
            contentOffset.value - exactCenterOffset
          );
          const isAtCenter = distanceFromCenter < 5;

          if (isAtCenter && lastHapticIndex.current !== clampedIndex) {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            lastHapticIndex.current = clampedIndex;
          }
        }
      } catch (error) {
        console.warn("Error in duration sync:", error);
      }
    }, 33);

    return () => clearInterval(interval);
  }, [durationOptions, currentDurationIndex, DurationItemWidth]);

  const spinAnimatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ rotate: `${spinValue.value}deg` }],
    };
  });

  const getTagImage = () => {
    if (!tag) return require("../../../assets/authImage.png");

    const imageSource = tag.bigPreviewImage || tag.image;

    if (typeof imageSource === "string" && imageSource.trim()) {
      return { uri: imageSource };
    }

    return require("../../../assets/authImage.png");
  };

  // Skeleton loader component
  const SkeletonCircle = ({ index }) => {
    const pulseAnim = useRef(new RNAnimated.Value(0)).current;

    useEffect(() => {
      RNAnimated.loop(
        RNAnimated.sequence([
          RNAnimated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
          RNAnimated.timing(pulseAnim, {
            toValue: 0,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      ).start();
    }, []);

    const opacity = pulseAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [0.3, 0.7],
    });

    return (
      <RNAnimated.View
        style={{
          width: DurationItemWidth,
          height: DurationItemWidth,
          borderRadius: DurationItemWidth / 2,
          backgroundColor: colors.border,
          opacity,
          marginHorizontal: 5,
        }}
      />
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles(colors).container}>
        <StatusBar
          barStyle={
            colors.background === "#FFFFFF" ? "dark-content" : "light-content"
          }
          backgroundColor={colors.primary2}
        />
        <View style={styles(colors).mainContent}>
          <View style={styles(colors).heroWrapper}>
            <LinearGradient
              colors={[colors.primary2, colors.primary2]}
              style={styles(colors).heroBackground}
            >
              <View style={styles(colors).header}>
                <View style={styles(colors).locationPill}>
                  <CustomIcon
                    name="location-filled"
                    size={14}
                    color={colors.primary}
                  />
                  <Text
                    style={styles(colors).locationText}
                    numberOfLines={1}
                    ellipsizeMode="tail"
                  >
                    {currentLocation}
                  </Text>
                </View>
              </View>

              <View style={styles(colors).heroTextContainer}>
                <Text style={styles(colors).heroTitle}>{tagName}</Text>
              </View>

              <View style={styles(colors).heroImageContainer}>
                <View style={styles(colors).heroImageWrapper}>
                  <MaskedView
                    style={{ width: heroImageSize, height: heroImageSize }}
                    maskElement={
                      <Svg width={heroImageSize} height={heroImageSize} viewBox="0 0 375 375">
                        <Path
                          d="M188.67,.63c27.65,1.13,54.8,6.39,80.03,17.7,25.57,11.46,49.48,26.89,67.38,48.37,18.05,21.65,30.03,47.81,35.76,75.35,5.68,27.29,3.07,55.29-2.88,82.53-5.99,27.4-13.84,55.25-31.92,76.76-17.96,21.36-44.86,31.93-69.92,44.35-25.31,12.55-50.2,27.93-78.45,29.21-28.62,1.29-56.26-9.35-81.94-21.98-25.54-12.56-48.89-29.24-66.87-51.21-18.07-22.08-31.62-47.9-37.12-75.84-5.43-27.6-2.41-56.21,5.87-83.1,8-25.99,24.92-47.46,41.09-69.36,16.67-22.58,30.79-48.71,55.71-61.76C130.49-1.5,160.34-.54,188.67,.63Z"
                          fill="white"
                        />
                      </Svg>
                    }
                  >
                    <Image
                      source={getTagImage()}
                      style={{
                        width: heroImageSize,
                        height: heroImageSize,
                      }}
                      resizeMode="cover"
                    />
                  </MaskedView>

                  {/* SVG stroke border on top */}
                  <Svg width={heroImageSize} height={heroImageSize} viewBox="0 0 375 375" style={{ position: 'absolute', top: 0, left: 0 }}>
                    <Path
                      d="M188.67,.63c27.65,1.13,54.8,6.39,80.03,17.7,25.57,11.46,49.48,26.89,67.38,48.37,18.05,21.65,30.03,47.81,35.76,75.35,5.68,27.29,3.07,55.29-2.88,82.53-5.99,27.4-13.84,55.25-31.92,76.76-17.96,21.36-44.86,31.93-69.92,44.35-25.31,12.55-50.2,27.93-78.45,29.21-28.62,1.29-56.26-9.35-81.94-21.98-25.54-12.56-48.89-29.24-66.87-51.21-18.07-22.08-31.62-47.9-37.12-75.84-5.43-27.6-2.41-56.21,5.87-83.1,8-25.99,24.92-47.46,41.09-69.36,16.67-22.58,30.79-48.71,55.71-61.76C130.49-1.5,160.34-.54,188.67,.63Z"
                      fill="none"
                      stroke={colors.primary}
                      strokeWidth="5"
                    />
                  </Svg>
                </View>
              </View>

              <TouchableOpacity
                style={styles(colors).backButtonBadge}
                onPress={() => navigation.goBack()}
                activeOpacity={0.8}
              >
                <CustomIcon
                  name="chevron-back"
                  size={20}
                  color={colors.primary2}
                />
              </TouchableOpacity>

              <Text style={styles(colors).chooseHeading}>
                Loading durations...
              </Text>
            </LinearGradient>

            <View style={styles(colors).heroCurve}>
              <Animated.Image
                source={
                  isDark
                    ? require("../../../assets/spin-dish-dark.png")
                    : require("../../../assets/spin-dish.png")
                }
                style={[styles(colors).spinDishBackground, spinAnimatedStyle]}
                resizeMode="contain"
              />
            </View>
          </View>

          <View style={styles(colors).contentSection}>
            {/* Skeleton Carousel */}
            <View
              style={{
                position: "absolute",
                top: "50%",
                marginTop: -150,
                left: 0,
                right: 0,
                flexDirection: "row",
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              {[0, 1, 2, 3, 4].map((index) => (
                <SkeletonCircle key={index} index={index} />
              ))}
            </View>

            {/* Skeleton description */}
            <View style={styles(colors).durationInfoContainer}>
              <RNAnimated.View
                style={{
                  width: "60%",
                  height: 20,
                  backgroundColor: colors.border,
                  borderRadius: 4,
                  opacity: 0.5,
                }}
              />
            </View>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  if (durationOptions.length === 0 && !loading) {
    return (
      <SafeAreaView style={styles(colors).container}>
        <StatusBar
          barStyle={
            colors.background === "#FFFFFF" ? "dark-content" : "light-content"
          }
          backgroundColor={colors.primary2}
        />
        <View style={styles(colors).emptyContainer}>
          <TouchableOpacity
            style={styles(colors).emptyBackButton}
            onPress={() => navigation.navigate("Home")}
            activeOpacity={0.8}
          >
            <CustomIcon name="chevron-back" size={20} color={colors.primary2} />
          </TouchableOpacity>
          <CustomIcon name="clock" size={64} color={colors.textMuted} />
          <Text style={styles(colors).emptyTitle}>No durations available</Text>
          <Text style={styles(colors).emptyText}>
            This category doesn't have any meal plans with duration options yet.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles(colors).container}>
      <StatusBar
        barStyle={
          colors.background === "#FFFFFF" ? "dark-content" : "light-content"
        }
        backgroundColor={colors.primary2}
      />
      <View style={styles(colors).mainContent}>
        <View style={styles(colors).heroWrapper}>
          <LinearGradient
            colors={[colors.primary2, colors.primary2]}
            style={styles(colors).heroBackground}
          >
            <View style={styles(colors).header}>
              <View style={styles(colors).locationPill}>
                <CustomIcon
                  name="location-filled"
                  size={14}
                  color={colors.primary}
                />
                <Text
                  style={styles(colors).locationText}
                  numberOfLines={1}
                  ellipsizeMode="tail"
                >
                  {currentLocation}
                </Text>
              </View>
            </View>

            <View style={styles(colors).heroTextContainer}>
              {/* <Text style={styles(colors).heroTitle}>Choose Duration</Text> */}
              <Text style={styles(colors).heroTitle}>{tagName}</Text>
            </View>

            <View style={styles(colors).heroImageContainer}>
              <View style={styles(colors).heroImageWrapper}>
                <MaskedView
                  style={{ width: heroImageSize, height: heroImageSize }}
                  maskElement={
                    <Svg width={heroImageSize} height={heroImageSize} viewBox="0 0 375 375">
                      <Path
                        d="M188.67,.63c27.65,1.13,54.8,6.39,80.03,17.7,25.57,11.46,49.48,26.89,67.38,48.37,18.05,21.65,30.03,47.81,35.76,75.35,5.68,27.29,3.07,55.29-2.88,82.53-5.99,27.4-13.84,55.25-31.92,76.76-17.96,21.36-44.86,31.93-69.92,44.35-25.31,12.55-50.2,27.93-78.45,29.21-28.62,1.29-56.26-9.35-81.94-21.98-25.54-12.56-48.89-29.24-66.87-51.21-18.07-22.08-31.62-47.9-37.12-75.84-5.43-27.6-2.41-56.21,5.87-83.1,8-25.99,24.92-47.46,41.09-69.36,16.67-22.58,30.79-48.71,55.71-61.76C130.49-1.5,160.34-.54,188.67,.63Z"
                        fill="white"
                      />
                    </Svg>
                  }
                >
                  <Image
                    source={getTagImage()}
                    style={{
                      width: heroImageSize,
                      height: heroImageSize,
                    }}
                    resizeMode="cover"
                  />
                </MaskedView>

                {/* SVG stroke border on top */}
                <Svg width={heroImageSize} height={heroImageSize} viewBox="0 0 375 375" style={{ position: 'absolute', top: 0, left: 0 }}>
                  <Path
                    d="M188.67,.63c27.65,1.13,54.8,6.39,80.03,17.7,25.57,11.46,49.48,26.89,67.38,48.37,18.05,21.65,30.03,47.81,35.76,75.35,5.68,27.29,3.07,55.29-2.88,82.53-5.99,27.4-13.84,55.25-31.92,76.76-17.96,21.36-44.86,31.93-69.92,44.35-25.31,12.55-50.2,27.93-78.45,29.21-28.62,1.29-56.26-9.35-81.94-21.98-25.54-12.56-48.89-29.24-66.87-51.21-18.07-22.08-31.62-47.9-37.12-75.84-5.43-27.6-2.41-56.21,5.87-83.1,8-25.99,24.92-47.46,41.09-69.36,16.67-22.58,30.79-48.71,55.71-61.76C130.49-1.5,160.34-.54,188.67,.63Z"
                    fill="none"
                    stroke={colors.primary}
                    strokeWidth="5"
                  />
                </Svg>
              </View>
            </View>

            <Text style={styles(colors).chooseHeading}>
              Select meal plan duration
            </Text>
          </LinearGradient>

          <View style={styles(colors).heroCurve}>
            <Animated.Image
              source={
                isDark
                  ? require("../../../assets/spin-dish-dark.png")
                  : require("../../../assets/spin-dish.png")
              }
              style={[styles(colors).spinDishBackground, spinAnimatedStyle]}
              resizeMode="contain"
            />
          </View>
        </View>

        <View style={styles(colors).contentSection}>
          <Animated.FlatList
            ref={flatListRef}
            data={durationOptions}
            keyExtractor={(_, index) => index.toString()}
            scrollEventThrottle={16}
            onScroll={scrollHandler}
            pagingEnabled
            snapToInterval={DurationItemWidth}
            showsHorizontalScrollIndicator={false}
            initialNumToRender={5}
            maxToRenderPerBatch={3}
            windowSize={7}
            removeClippedSubviews={true}
            style={{
              position: "absolute",
              top: "50%",
              marginTop: -350,
              height: 300,
              left: 0,
              right: 0,
            }}
            contentContainerStyle={{
              justifyContent: "center",
              alignItems: "center",
              paddingHorizontal: 1.5 * DurationItemWidth,
              paddingRight: 1.5 * DurationItemWidth,
            }}
            horizontal
            renderItem={({ item, index }) => (
              <DurationCarouselItem duration={item} index={index} />
            )}
          />

          <View style={styles(colors).durationInfoContainer}>
            <Text style={styles(colors).durationDescription}>
              {durationOptions[currentDurationIndex]?.description || ""}
            </Text>
          </View>

          {/* Bottom Actions */}
          <View style={styles(colors).bottomActionsContainer}>
            <TouchableOpacity
              style={styles(colors).backButtonBadge}
              onPress={() => navigation.goBack()}
              activeOpacity={0.8}
              accessible={true}
              accessibilityRole="button"
              accessibilityLabel="Go back"
              accessibilityHint="Double tap to go back"
            >
              <CustomIcon
                name="chevron-back"
                size={20}
                color={colors.primary2}
              />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles(colors).exploreBadge}
              onPress={() => {
                if (durationOptions[currentDurationIndex]) {
                  navigation.navigate("MealPlanListingScreen", {
                    tag: tag,
                    tagId: tagId,
                    tagName: tagName,
                    selectedDuration: durationOptions[currentDurationIndex],
                  });
                }
              }}
              activeOpacity={0.8}
              accessible={true}
              accessibilityRole="button"
              accessibilityLabel="Explore meal plans"
              accessibilityHint="Double tap to view meal plans with selected duration"
            >
              <Text style={styles(colors).exploreBadgeText}>
                Explore meal plans
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = (colors) =>
  createStylesWithDMSans({
    container: {
      flex: 1,
      backgroundColor: colors.primary2,
      paddingTop: statusBarHeight,
    },
    mainContent: {
      flex: 1,
    },
    contentSection: {
      height: 380,
      position: "relative",
      marginTop: verticalScale(40),
    },
    heroWrapper: {
      position: "relative",
    },
    heroBackground: {
      paddingHorizontal: scale(50),
      paddingTop: verticalScale(15),
      paddingBottom: verticalScale(isSmallScreen ? 60 : 80),
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
    },
    locationPill: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: "rgba(255, 255, 255, 0.25)",
      paddingHorizontal: scale(16),
      paddingVertical: verticalScale(9),
      borderRadius: moderateScale(20),
      maxWidth: width * 1.8,
      minWidth: width * 0.7,
    },
    locationText: {
      flex: 1,
      fontSize: moderateScale(14),
      color: colors.white,
      marginHorizontal: scale(8),
      fontWeight: "500",
    },
    bottomActionsContainer: {
      position: "absolute",
      top: verticalScale(110),
      left: 0,
      right: 0,
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingHorizontal: scale(20),
      paddingVertical: verticalScale(15),
    },
    backButtonBadge: {
      backgroundColor: colors.white,
      width: 44,
      height: 44,
      borderRadius: 22,
      justifyContent: "center",
      alignItems: "center",
      ...getShadowStyle({
        shadowColor: colors.text,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
      }),
    },
    exploreBadge: {
      backgroundColor: colors.white,
      paddingHorizontal: scale(18),
      paddingVertical: verticalScale(12),
      borderRadius: moderateScale(20),
      ...getShadowStyle({
        shadowColor: colors.text,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
      }),
    },
    exploreBadgeText: {
      fontSize: moderateScale(getResponsiveValue(14, 16, 18, 20)),
      fontWeight: "700",
      color: colors.primary2,
    },
    heroTextContainer: {
      marginTop: verticalScale(20),
      alignItems: "center",
    },
    heroTitle: {
      fontSize: moderateScale(getResponsiveValue(22, 26, 28, 32)),
      fontWeight: "700",
      color: colors.white,
    },
    heroSubtitle: {
      fontSize: moderateScale(getResponsiveValue(16, 18, 20, 24)),
      fontWeight: "600",
      color: colors.primary,
    },
    heroImageContainer: {
      marginTop: verticalScale(16),
      alignItems: "center",
      justifyContent: "center",
    },
    heroImageWrapper: {
      width: heroImageSize,
      height: heroImageSize,
      alignItems: "center",
      justifyContent: "center",
      ...getShadowStyle({
        shadowColor: colors.shadow,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.2,
        shadowRadius: 16,
      }),
    },
    chooseHeading: {
      fontSize: moderateScale(getResponsiveValue(16, 18, 20, 22)),
      fontWeight: "700",
      color: colors.white,
      textAlign: "center",
      paddingTop: verticalScale(12),
    },
    spinDishBackground: {
      position: "absolute",
      top: verticalScale(0),
      left: "50%",
      marginLeft: -scale(300),
      width: scale(600),
      height: scale(600),
      zIndex: 0,
    },
    heroCurve: {
      position: "relative",
    },
    durationInfoContainer: {
      position: "absolute",
      top: verticalScale(20),
      left: 0,
      right: 0,
      alignItems: "center",
      paddingHorizontal: scale(20),
      paddingBottom: verticalScale(15),
    },
    durationDescription: {
      fontSize: moderateScale(14),
      color: colors.textSecondary,
      textAlign: "center",
      lineHeight: moderateScale(20),
    },
    loadingContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
    },
    loadingText: {
      fontSize: 16,
      color: colors.textSecondary,
      marginTop: 10,
    },
    emptyContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      paddingHorizontal: 40,
    },
    emptyBackButton: {
      position: "absolute",
      top: verticalScale(20),
      left: scale(20),
      backgroundColor: colors.white,
      width: 44,
      height: 44,
      borderRadius: 22,
      justifyContent: "center",
      alignItems: "center",
      ...getShadowStyle({
        shadowColor: colors.text,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
      }),
    },
    emptyTitle: {
      fontSize: 20,
      fontWeight: "600",
      color: colors.text,
      marginTop: 20,
      marginBottom: 8,
      textAlign: "center",
    },
    emptyText: {
      fontSize: 16,
      color: colors.textSecondary,
      textAlign: "center",
      lineHeight: 24,
    },
  });

export default DurationSelectionScreen;
