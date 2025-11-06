import React, { useEffect } from "react";
import { View, StyleSheet, Dimensions } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
} from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "../../styles/theme";

const { width, height } = Dimensions.get("window");

const HomeScreenSkeleton = () => {
  const { colors } = useTheme();
  const shimmerValue = useSharedValue(0);

  useEffect(() => {
    shimmerValue.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1000 }),
        withTiming(0, { duration: 1000 })
      ),
      -1,
      false
    );
  }, []);

  const shimmerStyle = useAnimatedStyle(() => {
    return {
      opacity: 0.3 + shimmerValue.value * 0.4,
    };
  });

  return (
    <View style={styles(colors).container}>
      {/* Header Skeleton */}
      <LinearGradient
        colors={[colors.primary2, "#003C2A", "#003527", "#002E22"]}
        locations={[0, 0.4, 0.7, 1]}
        style={styles(colors).headerGradient}
      >
        {/* Location and Plan Button Skeleton */}
        <View style={styles(colors).headerRow}>
          <Animated.View style={[styles(colors).locationPill, shimmerStyle]} />
          <Animated.View style={[styles(colors).planButton, shimmerStyle]} />
        </View>

        {/* Hero Text Skeleton */}
        <View style={styles(colors).heroTextContainer}>
          <Animated.View style={[styles(colors).heroTitle, shimmerStyle]} />
          <Animated.View style={[styles(colors).heroSubtitle, shimmerStyle]} />
        </View>

        {/* Hero Image Skeleton */}
        <View style={styles(colors).heroImageContainer}>
          <Animated.View style={[styles(colors).heroImage, shimmerStyle]} />
        </View>

        {/* Badge Skeleton */}
        <View style={styles(colors).badgeContainer}>
          <Animated.View style={[styles(colors).badge, shimmerStyle]} />
        </View>

        {/* Choose Heading Skeleton */}
        <Animated.View style={[styles(colors).chooseHeading, shimmerStyle]} />

        {/* Carousel Items Skeleton */}
        <View style={styles(colors).carouselContainer}>
          {[1, 2, 3].map((item) => (
            <Animated.View
              key={item}
              style={[styles(colors).carouselItem, shimmerStyle]}
            />
          ))}
        </View>

        {/* Description Skeleton */}
        <View style={styles(colors).descriptionContainer}>
          <Animated.View
            style={[styles(colors).descriptionLine1, shimmerStyle]}
          />
          <Animated.View
            style={[styles(colors).descriptionLine2, shimmerStyle]}
          />
        </View>
      </LinearGradient>

      {/* Bottom Section Skeleton */}
      <View style={styles(colors).bottomSection}>
        {/* Pagination Dots Skeleton */}
        <View style={styles(colors).paginationContainer}>
          {[1, 2, 3, 4, 5].map((item) => (
            <Animated.View
              key={item}
              style={[styles(colors).paginationDot, shimmerStyle]}
            />
          ))}
        </View>

        {/* Button Skeleton */}
        <Animated.View style={[styles(colors).button, shimmerStyle]} />
      </View>
    </View>
  );
};

const styles = (colors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    headerGradient: {
      paddingTop: 15,
      paddingHorizontal: 20,
      paddingBottom: 80,
    },
    headerRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 20,
      paddingHorizontal: 10,
    },
    locationPill: {
      width: width * 0.55,
      height: 36,
      backgroundColor: "rgba(255, 255, 255, 0.15)",
      borderRadius: 20,
    },
    planButton: {
      width: 90,
      height: 36,
      backgroundColor: "rgba(255, 255, 255, 0.15)",
      borderRadius: 20,
    },
    heroTextContainer: {
      alignItems: "center",
      marginTop: 20,
      marginBottom: 16,
    },
    heroTitle: {
      width: 180,
      height: 28,
      backgroundColor: "rgba(255, 255, 255, 0.15)",
      borderRadius: 8,
      marginBottom: 8,
    },
    heroSubtitle: {
      width: 120,
      height: 20,
      backgroundColor: "rgba(255, 255, 255, 0.15)",
      borderRadius: 6,
    },
    heroImageContainer: {
      alignItems: "center",
      marginTop: 16,
      marginBottom: 20,
    },
    heroImage: {
      width: 260,
      height: 260,
      backgroundColor: "rgba(255, 255, 255, 0.15)",
      borderRadius: 130,
    },
    badgeContainer: {
      alignItems: "center",
      marginBottom: 8,
    },
    badge: {
      width: 150,
      height: 44,
      backgroundColor: "rgba(255, 255, 255, 0.15)",
      borderRadius: 22,
    },
    chooseHeading: {
      width: 160,
      height: 16,
      backgroundColor: "rgba(255, 255, 255, 0.15)",
      borderRadius: 8,
      alignSelf: "center",
      marginBottom: 42,
    },
    carouselContainer: {
      flexDirection: "row",
      justifyContent: "center",
      alignItems: "center",
      marginTop: -140,
      marginBottom: 100,
      gap: 12,
    },
    carouselItem: {
      width: width * 0.28,
      height: width * 0.28,
      backgroundColor: "rgba(255, 255, 255, 0.15)",
      borderRadius: (width * 0.28) / 2,
    },
    descriptionContainer: {
      alignItems: "center",
      paddingHorizontal: 20,
      marginTop: 30,
    },
    descriptionLine1: {
      width: width * 0.7,
      height: 14,
      backgroundColor: colors.border,
      borderRadius: 4,
      marginBottom: 8,
    },
    descriptionLine2: {
      width: width * 0.5,
      height: 14,
      backgroundColor: colors.border,
      borderRadius: 4,
    },
    bottomSection: {
      backgroundColor: colors.background,
      paddingHorizontal: 16,
      paddingTop: 8,
      paddingBottom: 20,
    },
    paginationContainer: {
      flexDirection: "row",
      justifyContent: "center",
      alignItems: "center",
      paddingVertical: 16,
      gap: 6,
    },
    paginationDot: {
      width: 6,
      height: 6,
      backgroundColor: colors.border,
      borderRadius: 3,
    },
    button: {
      width: "100%",
      height: 56,
      backgroundColor: colors.border,
      borderRadius: 32,
    },
  });

export default HomeScreenSkeleton;
