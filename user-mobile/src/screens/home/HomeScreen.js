import React, {
  useState,
  useEffect,
  useRef,
  useMemo,
  useCallback,
} from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  Dimensions,
  StatusBar,
  TextInput,
  ActivityIndicator,
  Platform,
  PixelRatio,
} from "react-native";
import Animated, {
  Extrapolate,
  interpolate,
  useAnimatedStyle,
  useAnimatedScrollHandler,
  useSharedValue,
  withRepeat,
  withTiming,
  withSpring,
  Easing,
  runOnJS,
} from "react-native-reanimated";
import { Animated as RNAnimated } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "../../styles/theme";
import CustomIcon from "../../components/ui/CustomIcon";
import { createStylesWithDMSans } from "../../utils/fontUtils";
import { useAuth } from "../../hooks/useAuth";
import { useMealPlans } from "../../hooks/useMealPlans";
import tagService from "../../services/tagService";
import { LinearGradient } from "expo-linear-gradient";
import * as Location from "expo-location";
import * as Haptics from "expo-haptics";

const { width, height } = Dimensions.get("window");

// Responsive scaling utilities
const scale = (size) => {
  const pixelRatio = PixelRatio.get();
  const deviceScale = width / 375; // Base on iPhone X width

  // Android adjustment factor for varied DPI
  const androidFactor =
    Platform.OS === "android" ? Math.min(pixelRatio / 2, 1.2) : 1;

  return size * deviceScale * androidFactor;
};

const verticalScale = (size) => (height / 812) * size; // Base on iPhone X height
const moderateScale = (size, factor = 0.5) =>
  size + (scale(size) - size) * factor;

// Screen size categories
const isSmallScreen = width < 350;
const isMediumScreen = width >= 350 && width < 414;
const isLargeScreen = width >= 414;
const isTablet = width >= 768;
const isLandscape = width > height;

// Platform-specific status bar height
const statusBarHeight =
  Platform.OS === "android" ? StatusBar.currentHeight || 0 : 0;

// Responsive breakpoints
const getResponsiveValue = (small, medium, large, tablet = large) => {
  if (isTablet) return tablet;
  if (isLargeScreen) return large;
  if (isMediumScreen) return medium;
  return small;
};

// Android-specific responsive values
const getAndroidResponsiveValue = (small, medium, large, xlarge) => {
  if (Platform.OS === "android") {
    if (width < 360) return small;
    if (width < 400) return medium;
    if (width < 500) return large;
    return xlarge;
  }
  return getResponsiveValue(small, medium, large, xlarge);
};

// Shadow utility for cross-platform compatibility
const getShadowStyle = (shadowProps) => ({
  ...shadowProps,
  ...(Platform.OS === "android" && {
    elevation: shadowProps.shadowOpacity ? shadowProps.shadowOpacity * 10 : 5,
  }),
});

// Responsive dimensions - Increased for better visibility
const heroImageSize = getResponsiveValue(260, 300, 340, 420);
const heroImageBorderRadius = heroImageSize / 2;
const previewImageSize = heroImageSize - 6; // Account for border
const previewImageBorderRadius = previewImageSize / 2;

// Circular carousel constants (responsive) - Larger items on bigger screens for better visibility
const ListItemWidth = getResponsiveValue(
  width / 4.5, // Smaller items on small screens
  width / 4, // Medium screens
  width / 3.2, // Large screens - increased size
  width / 4.5 // Tablets - increased size
);

// Clean Circular Carousel Implementation:
// - Based on animate-with-reanimated reference for maximum smoothness
// - Removed infinite scroll complexity for better performance
// - Direct data usage without circular array generation
// - Simple scroll handler matching reference implementation
// - Optimized preview image sync for simplified data structure

// Cache tags globally to avoid re-fetching on every render (same as TagFilterBar)
let cachedTags = [];
let tagsLastFetched = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Export function to refresh tags cache (call when new tags are created)
export const refreshTagsCache = () => {
  cachedTags = [];
  tagsLastFetched = 0;
};

// Placeholder data
const PLACEHOLDER_PLANS = [
  {
    id: "placeholder-1",
    name: "FitFam",
    description: "Perfect for gym enthusiasts",
  },
  {
    id: "placeholder-2",
    name: "HealthyChoice",
    description: "Balanced nutrition daily",
  },
  { id: "placeholder-3", name: "PowerPlan", description: "High protein meals" },
  {
    id: "placeholder-4",
    name: "GreenLife",
    description: "Fresh vegetables focus",
  },
  {
    id: "placeholder-5",
    name: "ActiveLife",
    description: "Energy boosting meals",
  },
];

const HomeScreen = ({ navigation }) => {
  const { colors, isDark } = useTheme();
  const { user } = useAuth();
  const { mealPlans } = useMealPlans();

  const flatListRef = useRef(null);
  const [tags, setTags] = useState(cachedTags || []);
  const [loading, setLoading] = useState((cachedTags || []).length === 0);
  const [currentLocation, setCurrentLocation] = useState(
    user?.address || "My Current Location"
  );
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);

  // Pre-fetch duration data for focused tag
  const [prefetchedDurations, setPrefetchedDurations] = useState({});

  // Carousel state (simplified)
  const [previousDescription, setPreviousDescription] = useState("");

  // Circular reveal animation state (like reference animation)
  const circleAnimation = useRef(new RNAnimated.Value(0)).current;

  // Shared values for all animations (eliminate state-based race conditions)
  const contentOffset = useSharedValue(0);
  const spinValue = useSharedValue(0);
  const descriptionOpacity = useSharedValue(1);

  // Text rotation messages
  const heroMessages = [
    "Eat healthy!",
    "Save Money!",
    "Stay Fresh!",
    "Live Better!",
  ];

  const [currentMessageIndex, setCurrentMessageIndex] = useState(0);

  useEffect(() => {
    // Start the spinning animation with physics-based timing
    spinValue.value = withRepeat(
      withTiming(360, {
        duration: 20000,
        easing: Easing.linear,
      }),
      -1,
      false
    );

    fetchTags();
    getCurrentLocation();

    // Cleanup function for shared values
    return () => {
      // Cancel all running animations
      spinValue.value = 0;
      contentOffset.value = 0;
    };
  }, [getCurrentLocation]); // Add dependency

  // Text rotation animation effect with proper cleanup
  useEffect(() => {
    let interval = null;
    let isActive = true;

    const rotateMessage = () => {
      if (!isActive) return;
      // Remove animation completely to reduce load
      setCurrentMessageIndex((prev) => (prev + 1) % heroMessages.length);
    };

    // Start the cycle after a delay
    const timeout = setTimeout(() => {
      if (isActive) {
        interval = setInterval(rotateMessage, 7000); // Slower, less distracting rotation
      }
    }, 3000);

    // Comprehensive cleanup
    return () => {
      isActive = false;
      if (timeout) clearTimeout(timeout);
      if (interval) clearInterval(interval);
    };
  }, []);

  const getCurrentLocation = useCallback(async () => {
    // Prevent multiple simultaneous calls
    if (isLoadingLocation) return;

    try {
      setIsLoadingLocation(true);

      // Add timeout wrapper to prevent hanging
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Location timeout")), 10000)
      );

      // Request permission
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setCurrentLocation("Location permission denied");
        return;
      }

      // Get current position with race condition timeout
      const locationPromise = Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
        timeInterval: 8000,
      });

      const location = await Promise.race([locationPromise, timeoutPromise]);

      // Reverse geocode with timeout
      const geocodePromise = Location.reverseGeocodeAsync({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });

      const address = await Promise.race([geocodePromise, timeoutPromise]);

      if (address && address.length > 0) {
        const { city, region, district } = address[0];
        const locationParts = [district, city, region].filter(Boolean);
        const locationString =
          locationParts.length > 0
            ? locationParts.slice(0, 2).join(", ")
            : "Current Location";
        setCurrentLocation(locationString);
      } else {
        setCurrentLocation("Location found");
      }
    } catch (error) {
      console.error("Location error:", error.message);
      setCurrentLocation("Tap to get location");
    } finally {
      setIsLoadingLocation(false);
    }
  }, [isLoadingLocation]);

  const handleLocationPress = () => {
    getCurrentLocation();
  };

  const handleSearchPress = () => {
    // Expand circle to cover screen (like reference animation)
    RNAnimated.timing(circleAnimation, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start(() => {
      // Navigate when circle fully expands
      navigation.navigate("SearchScreen");

      // Reverse animation to reveal SearchScreen
      setTimeout(() => {
        RNAnimated.timing(circleAnimation, {
          toValue: 0,
          duration: 400,
          useNativeDriver: true,
        }).start();
      }, 100);
    });
  };

  const fetchTags = useCallback(async () => {
    try {
      const now = Date.now();
      if (
        (cachedTags || []).length > 0 &&
        now - tagsLastFetched < CACHE_DURATION
      ) {
        setTags(cachedTags || []);
        setLoading(false);
        return;
      }

      setLoading(true);

      // Add timeout to prevent hanging requests
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);

      try {
        const tagsData = await tagService.getAllTags(true);
        clearTimeout(timeoutId);

        // Validate data before using
        if (Array.isArray(tagsData) && tagsData.length > 0) {
          cachedTags = tagsData;
          tagsLastFetched = now;
          setTags(tagsData);

          // Lazy load: prefetch only first visible item and neighbors
          const visibleRange = 3; // Current + 1 left + 1 right
          tagsData.slice(0, visibleRange).forEach((tag) => {
            if (tag?.image) {
              Image.prefetch(tag.image).catch(() => {});
            }
            if (tag?.bigPreviewImage) {
              Image.prefetch(tag.bigPreviewImage).catch(() => {});
            }
          });
        } else {
          throw new Error("Invalid tags data received");
        }
      } catch (fetchError) {
        clearTimeout(timeoutId);
        throw fetchError;
      }
    } catch (error) {
      console.error("Error fetching tags:", error.message);
      // Fallback to cached data or placeholder
      setTags(cachedTags.length > 0 ? cachedTags : PLACEHOLDER_PLANS);
    } finally {
      setLoading(false);
    }
  }, []);

  const hasRealTags = Boolean(tags?.length);
  const tagData = hasRealTags ? tags : PLACEHOLDER_PLANS; // Simple direct data usage

  // Lazy load images for carousel items near current position
  const prefetchNearbyImages = useCallback((centerIndex) => {
    const range = 2; // Prefetch 2 items before and after
    const startIndex = Math.max(0, centerIndex - range);
    const endIndex = Math.min(tagData.length - 1, centerIndex + range);

    for (let i = startIndex; i <= endIndex; i++) {
      const tag = tagData[i];
      if (tag?.image) {
        Image.prefetch(tag.image).catch(() => {});
      }
      if (tag?.bigPreviewImage) {
        Image.prefetch(tag.bigPreviewImage).catch(() => {});
      }
    }
  }, [tagData]);

  // Reference circular carousel implementation - clean and simple
  const CircularCarouselListItem = React.memo(({ tag, index }) => {
    const rStyle = useAnimatedStyle(() => {
      const inputRange = [
        (index - 2) * ListItemWidth,
        (index - 1) * ListItemWidth,
        index * ListItemWidth,
        (index + 1) * ListItemWidth,
        (index + 2) * ListItemWidth,
      ];

      const translateYOutputRange = [
        0,
        -ListItemWidth / 3,
        -ListItemWidth / 2,
        -ListItemWidth / 3,
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

    // Arrow visibility animation - only show on centered item
    const arrowStyle = useAnimatedStyle(() => {
      const inputRange = [
        (index - 1) * ListItemWidth,
        index * ListItemWidth,
        (index + 1) * ListItemWidth,
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
        onPress={() => onSelectTag(index)}
        accessible={true}
        accessibilityRole="button"
        accessibilityLabel={`Select ${tag?.name || 'category'} meal plan`}
        accessibilityHint="Double tap to view this meal plan category"
      >
        <Animated.View
          style={[
            {
              width: ListItemWidth,
              aspectRatio: 1,
              elevation: 5,
              shadowOpacity: 0.2,
              shadowOffset: { width: 0, height: 0 },
              shadowRadius: 20,
              minWidth: 44, // Minimum touch target
              minHeight: 44,
            },
            rStyle,
          ]}
        >
          <Image
            source={getTagImage(tag, false)}
            style={{
              margin: 3,
              height: ListItemWidth,
              width: ListItemWidth,
              borderRadius: 200,
              borderWidth: 2,
              borderColor: colors.white,
            }}
            resizeMode="cover"
          />
          {/* Down arrow indicator - only visible on centered item */}
          <Animated.View
            style={[
              {
                position: 'absolute',
                bottom: 8,
                alignSelf: 'center',
                backgroundColor: colors.primary,
                borderRadius: 20,
                padding: 6,
              },
              arrowStyle
            ]}
            pointerEvents="none"
          >
            <CustomIcon name="chevron-down" size={20} color={colors.white} />
          </Animated.View>
        </Animated.View>
      </TouchableOpacity>
    );
  });

  // Track current focused tag for hero image
  const [focusedTag, setFocusedTag] = useState(tagData[0] || null);
  const [currentCarouselIndex, setCurrentCarouselIndex] = useState(0);
  const lastHapticIndex = useRef(0); // Track last index that triggered haptic

  const getTagImage = useCallback((tag, useBigPreview = false) => {
    try {
      if (!tag) {
        return require("../../../assets/authImage.png");
      }

      // Use bigPreviewImage for hero display, regular image for carousel
      const imageSource = useBigPreview
        ? tag.bigPreviewImage || tag.image
        : tag.image;

      if (typeof imageSource === "string" && imageSource.trim()) {
        return { uri: imageSource };
      }

      return require("../../../assets/authImage.png");
    } catch (error) {
      console.warn("Image loading error:", error.message);
      return require("../../../assets/authImage.png");
    }
  }, []);

  const getTagName = (tag) => tag?.name || "FitFam";

  const getTagDescription = (tag) =>
    tag?.description || "Perfect for healthy eating";

  // Pre-fetch duration options for a tag
  const prefetchDurationsForTag = useCallback(async (tag) => {
    if (!tag || !tag._id) return;

    // Skip if already prefetched
    if (prefetchedDurations[tag._id]) return;

    try {
      const response = await tagService.getMealPlansByTag(tag._id, 1, 100);

      if (response?.success && response?.data) {
        const plans = response.data || [];

        // Extract unique duration weeks
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

        // Cache the result
        setPrefetchedDurations(prev => ({
          ...prev,
          [tag._id]: formattedOptions
        }));
      }
    } catch (error) {
      console.error("Error prefetching durations:", error);
    }
  }, [prefetchedDurations]);

  const onSelectTag = (index) => {
    if (!tagData[index]) return;

    const targetOffset = index * ListItemWidth;
    const currentOffset = contentOffset.value;
    const distanceFromCenter = Math.abs(currentOffset - targetOffset);
    const isAtCenter = distanceFromCenter < 5; // Within 5 pixels of exact center

    if (isAtCenter) {
      // Item is already centered - navigate to duration selection
      navigation.navigate('DurationSelectionScreen', {
        tag: tagData[index],
        tagId: tagData[index]._id,
        tagName: tagData[index].name,
        currentLocation: currentLocation, // Pass location to avoid refetching
        prefetchedDurations: prefetchedDurations[tagData[index]._id] || null, // Pass prefetched data
      });
    } else {
      // Item is not centered - scroll to it
      if (flatListRef.current) {
        flatListRef.current.scrollToOffset({
          offset: targetOffset,
          animated: true,
        });
      }
    }
  };

  // Reference scroll handler - simple and clean
  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      contentOffset.value = event.contentOffset.x;
    },
  });

  // Sync focused tag with scroll position for hero image
  useEffect(() => {
    if (!tagData || tagData.length === 0) return;

    let lastUpdateTime = 0;
    const DEBOUNCE_DELAY = 150; // Prevent rapid transitions

    const interval = setInterval(() => {
      try {
        const now = Date.now();
        if (now - lastUpdateTime < DEBOUNCE_DELAY) return;

        const currentIndex = Math.round(contentOffset.value / ListItemWidth);
        const clampedIndex = Math.max(
          0,
          Math.min(currentIndex, tagData.length - 1)
        );

        const newFocusedTag = tagData[clampedIndex] || null;
        if (newFocusedTag && newFocusedTag !== focusedTag) {
          lastUpdateTime = now;
          // Update carousel index for pagination dots
          setCurrentCarouselIndex(clampedIndex);

          // Haptic feedback ONLY when item is exactly centered (snapped)
          // Check if scroll position is very close to exact center
          const exactCenterOffset = clampedIndex * ListItemWidth;
          const distanceFromCenter = Math.abs(contentOffset.value - exactCenterOffset);
          const isAtCenter = distanceFromCenter < 5; // Within 5 pixels of exact center

          // Only trigger haptic if at center AND index changed
          if (isAtCenter && lastHapticIndex.current !== clampedIndex) {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            lastHapticIndex.current = clampedIndex;
          }

          // Lazy load nearby images
          prefetchNearbyImages(clampedIndex);

          // Pre-fetch durations for this tag
          prefetchDurationsForTag(newFocusedTag);

          // Update focused tag directly without fade animation
          setFocusedTag(newFocusedTag);
        }
      } catch (error) {
        console.warn("Error syncing focused tag:", error);
      }
    }, 33); // 30fps for better battery life while maintaining smoothness

    return () => clearInterval(interval);
  }, [tagData, focusedTag, ListItemWidth, prefetchNearbyImages, prefetchDurationsForTag]);

  // Animate description changes
  useEffect(() => {
    const selectedTagDescription = getTagDescription(focusedTag);

    if (selectedTagDescription !== previousDescription) {
      descriptionOpacity.value = withTiming(0, { duration: 150 }, () => {
        runOnJS(setPreviousDescription)(selectedTagDescription);
        descriptionOpacity.value = withTiming(1, { duration: 150 });
      });
    }
  }, [focusedTag, previousDescription]);

  // Animated style for spinning dish
  const spinAnimatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        {
          rotate: `${spinValue.value}deg`,
        },
      ],
    };
  });

  // Animated style for description
  const descriptionAnimatedStyle = useAnimatedStyle(() => {
    return {
      opacity: descriptionOpacity.value,
    };
  });

  // Error boundary
  if (!tagData) {
    return (
      <SafeAreaView
        style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
      >
        <Text>Loading...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles(colors).container}>
      <StatusBar
        barStyle={colors.background === "#FFFFFF" ? "dark-content" : "light-content"}
        backgroundColor={colors.primary2}
      />
      <View style={styles(colors).mainContent}>
        <View style={styles(colors).heroWrapper}>
          <LinearGradient
            colors={[colors.primary2, colors.primary2]}
            style={styles(colors).heroBackground}
          >
            <View style={styles(colors).header}>
              <TouchableOpacity
                style={styles(colors).locationPill}
                onPress={handleLocationPress}
                activeOpacity={0.7}
                disabled={isLoadingLocation}
                accessible={true}
                accessibilityRole="button"
                accessibilityLabel={`Current location: ${currentLocation}`}
                accessibilityHint="Double tap to refresh your location"
              >
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
                  {isLoadingLocation ? "Getting location..." : currentLocation}
                </Text>
                {isLoadingLocation ? (
                  <ActivityIndicator size="small" color={colors.white} />
                ) : (
                  <CustomIcon name="chevron-down" size={12} color={colors.white} />
                )}
              </TouchableOpacity>
            </View>

            <View
              style={styles(colors).heroTextContainer}
              accessible={true}
              accessibilityLabel={`${heroMessages[currentMessageIndex]}, getChoma`}
              accessibilityRole="header"
            >
              <Text style={styles(colors).heroTitle}>
                {heroMessages[currentMessageIndex]}
              </Text>
              <Text style={styles(colors).heroSubtitle}>getChoma</Text>
            </View>

            <View style={styles(colors).heroImageContainer}>
              {/* Hero image synced with focused carousel item */}
              <View style={styles(colors).heroImageCircle}>
                <Image
                  source={getTagImage(focusedTag, true)}
                  style={styles(colors).previewImageItem}
                  resizeMode="cover"
                />
              </View>
            </View>

            {focusedTag && (
              <TouchableOpacity
                style={styles(colors).planBadge}
                onPress={() =>
                  focusedTag &&
                  navigation.navigate("TagScreen", {
                    tagId: focusedTag._id,
                    tagName: focusedTag.name,
                  })
                }
                activeOpacity={0.8}
                accessible={true}
                accessibilityRole="button"
                accessibilityLabel={`${focusedTag?.name || 'Selected'} meal plan`}
                accessibilityHint="Double tap to view this meal plan"
              >
                <Text style={styles(colors).planBadgeText}>
                  {getTagName(focusedTag)}
                </Text>
              </TouchableOpacity>
            )}
            <Text style={styles(colors).chooseHeading}>Choose a category</Text>
          </LinearGradient>

          <View style={styles(colors).heroCurve}>
            {/* Spinning Dish Background - Theme aware */}
            <Animated.Image
              source={
                isDark
                  ? require("../../../assets/spin-dish-dark.png")
                  : require("../../../assets/spin-dish.png")
              }
              style={[styles(colors).spinDishBackground, spinAnimatedStyle]}
              resizeMode="contain"
              onLoad={() => console.log("Spin dish image loaded successfully")}
              onError={(error) => console.log("Spin dish image error:", error)}
            />
          </View>
        </View>

        <View style={styles(colors).contentSection}>
          <Animated.FlatList
            ref={flatListRef}
            data={tagData || []}
            keyExtractor={(_, index) => index.toString()}
            scrollEventThrottle={16}
            onScroll={scrollHandler}
            pagingEnabled
            snapToInterval={ListItemWidth}
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
              paddingHorizontal: 1.5 * ListItemWidth,
              paddingRight: 1.8 * ListItemWidth, // Extra spacing at the end for last item
            }}
            horizontal
            renderItem={({ item, index }) => {
              return <CircularCarouselListItem tag={item} index={index} />;
            }}
          />

          {/* Pagination Dots */}
          <View style={styles(colors).paginationContainer}>
            {tagData.map((_, index) => (
              <View
                key={index}
                style={[
                  styles(colors).paginationDot,
                  index === currentCarouselIndex &&
                    styles(colors).paginationDotActive,
                ]}
              />
            ))}
          </View>

          <View style={styles(colors).planInfoContainer}>
            <Animated.Text
              style={[styles(colors).planDescription, descriptionAnimatedStyle]}
              numberOfLines={2}
              ellipsizeMode="tail"
            >
              {getTagDescription(focusedTag)}
            </Animated.Text>

            <TouchableOpacity
              style={[
                styles(colors).learnMoreButton,
                !focusedTag && styles(colors).learnMoreButtonDisabled,
              ]}
              onPress={() =>
                focusedTag &&
                navigation.navigate("TagScreen", {
                  tagId: focusedTag._id,
                  tagName: focusedTag.name,
                })
              }
              activeOpacity={0.7}
              disabled={!focusedTag}
              accessible={true}
              accessibilityRole="button"
              accessibilityLabel={`Explore ${focusedTag?.name || 'meal'} category`}
              accessibilityHint="Double tap to view meals in this category"
            >
              <Text style={styles(colors).learnMoreText}>Explore meals</Text>
            </TouchableOpacity>
          </View>

          {/* Search Bar */}
          <View style={styles(colors).searchContainer}>
            <TouchableOpacity
              style={styles(colors).searchInputContainer}
              onPress={handleSearchPress}
              activeOpacity={0.85}
              accessible={true}
              accessibilityRole="search"
              accessibilityLabel="Search meal plans"
              accessibilityHint="Double tap to search for meal plans"
            >
              <CustomIcon
                name="search-filled"
                size={20}
                color={colors.textMuted}
                style={styles(colors).searchIcon}
              />
              <Text style={styles(colors).searchPlaceholder}>
                Browse meal plans...
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Circular Reveal Animation - Reference Style */}
        <RNAnimated.View
          pointerEvents="none"
          style={[
            styles(colors).circleBackground,
            {
              transform: [
                {
                  scale: circleAnimation.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, 50],
                  }),
                },
              ],
            },
          ]}
        />
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
      justifyContent: "center", // Center the location
    },
    locationPill: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: "rgba(255, 255, 255, 0.25)",
      paddingHorizontal: scale(16),
      paddingVertical: verticalScale(9),
      borderRadius: moderateScale(20),
      maxWidth: width * 1.8, // Allow more width for centered location
      minWidth: width * 0.7, // Ensure minimum width
    },
    locationText: {
      flex: 1,
      fontSize: moderateScale(14),
      color: colors.white,
      marginHorizontal: scale(8),
      fontWeight: "500",
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
      // marginTop: 4,
    },
    heroImageContainer: {
      marginTop: verticalScale(16),
      alignItems: "center",
      justifyContent: "center",
    },
    heroImageCircle: {
      width: heroImageSize,
      height: heroImageSize,
      borderRadius: heroImageBorderRadius,
      borderWidth: scale(3),
      borderColor: colors.white,
      overflow: "hidden",
      justifyContent: "center",
      alignItems: "center",
    },
    previewImageItem: {
      width: previewImageSize, // Perfect fit inside circle
      height: previewImageSize,
      borderRadius: previewImageBorderRadius, // Rounded to fit circle perfectly
    },
    chooseHeading: {
      fontSize: moderateScale(getResponsiveValue(18, 20, 22, 24)),
      fontWeight: "700",
      color: colors.white,
      textAlign: "center",
      paddingTop: verticalScale(12),
    },
    planBadge: {
      position: "absolute",
      bottom: verticalScale(getResponsiveValue(80, 100, 120, 150)),
      alignSelf: "center",
      backgroundColor: colors.white,
      paddingHorizontal: scale(18),
      paddingVertical: verticalScale(12),
      marginBottom: verticalScale(8),
      borderRadius: moderateScale(20),
      ...getShadowStyle({
        shadowColor: colors.text,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
      }),
    },
    planBadgeText: {
      fontSize: moderateScale(getResponsiveValue(16, 20, 22, 26)),
      fontWeight: "700",
      color: colors.primary2,
    },
    spinDishBackground: {
      position: "absolute",
      top: verticalScale(0),
      left: "50%",
      marginLeft: -scale(300), // Half of responsive width to center
      width: scale(600), // Responsive size
      height: scale(600),
      zIndex: 0, // Behind all content
    },
    planInfoContainer: {
      position: "absolute",
      top: verticalScale(20), // Position at top
      left: 0,
      right: 0,
      alignItems: "center",
      paddingHorizontal: scale(20),
      paddingBottom: verticalScale(15),
    },
    planDescription: {
      fontSize: moderateScale(14),
      color: colors.textSecondary,
      textAlign: "center",
      lineHeight: moderateScale(20),
      marginBottom: verticalScale(10), // Changed to bottom margin
    },
    learnMoreButton: {
      // marginTop: verticalScale(8),
    },
    learnMoreButtonDisabled: {
      opacity: 0.5,
    },
    learnMoreText: {
      fontSize: 14,
      color: colors.primary,
      fontWeight: "600",
      textDecorationLine: "underline",
    },
    searchContainer: {
      position: "absolute",
      top: verticalScale(65), // Position higher below description
      left: 0,
      right: 0,
      paddingHorizontal: scale(20),
      paddingVertical: verticalScale(15),
    },
    searchInputContainer: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.cardBackground,
      borderRadius: moderateScale(30),
      paddingHorizontal: scale(15),
      paddingVertical: verticalScale(12),
      borderWidth: scale(1),
      borderColor: colors.border,
      ...getShadowStyle({
        shadowColor: colors.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      }),
    },
    searchIcon: {
      marginRight: scale(10),
    },
    searchPlaceholder: {
      flex: 1,
      fontSize: moderateScale(16),
      color: colors.textMuted,
    },
    // Circular reveal animation background (reference style)
    circleBackground: {
      backgroundColor: colors.primary,
      position: "absolute",
      width: 60,
      height: 60,
      bottom: 100,
      left: "50%",
      marginLeft: -30, // Half of width to center
      borderRadius: 30,
      zIndex: 1000, // Above all content
    },
    // Pagination dots
    paginationContainer: {
      flexDirection: "row",
      justifyContent: "center",
      alignItems: "center",
      marginTop: verticalScale(150),
      paddingVertical: verticalScale(8),
    },
    paginationDot: {
      width: scale(6),
      height: scale(6),
      borderRadius: scale(3),
      backgroundColor: colors.textMuted,
      marginHorizontal: scale(4),
      opacity: 0.5,
    },
    paginationDotActive: {
      width: scale(8),
      height: scale(8),
      borderRadius: scale(4),
      backgroundColor: colors.primary,
      opacity: 1,
    },
  });

export default HomeScreen;
