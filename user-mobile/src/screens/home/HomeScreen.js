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
  useDerivedValue,
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
import apiService from "../../services/api";
import { LinearGradient } from "expo-linear-gradient";
import * as Location from "expo-location";
import * as Haptics from "expo-haptics";
import { Svg, Path } from "react-native-svg";
import MaskedView from "@react-native-masked-view/masked-view";

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

// Responsive dimensions - Smaller preview image
const heroImageSize = getResponsiveValue(220, 260, 300, 360);
const heroImageBorderRadius = heroImageSize / 2;
const previewImageSize = heroImageSize - 6; // Account for border
const previewImageBorderRadius = previewImageSize / 2;

// Circular carousel constants (responsive) - Larger items on bigger screens for better visibility
const ListItemWidth = width * 0.28; // Use a percentage of the screen width for more consistent sizing

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

// Placeholder data with images
const PLACEHOLDER_PLANS = [
  {
    id: "placeholder-1",
    name: "FitFam",
    description: "Perfect for gym enthusiasts",
    image: require("../../../assets/authImage.png"),
    bigPreviewImage: require("../../../assets/authImage.png"),
  },
  {
    id: "placeholder-2",
    name: "HealthyChoice",
    description: "Balanced nutrition daily",
    image: require("../../../assets/authImage.png"),
    bigPreviewImage: require("../../../assets/authImage.png"),
  },
  {
    id: "placeholder-3",
    name: "PowerPlan",
    description: "High protein meals",
    image: require("../../../assets/authImage.png"),
    bigPreviewImage: require("../../../assets/authImage.png"),
  },
  {
    id: "placeholder-4",
    name: "GreenLife",
    description: "Fresh vegetables focus",
    image: require("../../../assets/authImage.png"),
    bigPreviewImage: require("../../../assets/authImage.png"),
  },
  {
    id: "placeholder-5",
    name: "ActiveLife",
    description: "Energy boosting meals",
    image: require("../../../assets/authImage.png"),
    bigPreviewImage: require("../../../assets/authImage.png"),
  },
];

const HomeScreen = ({ navigation, route }) => {
  const { colors, isDark } = useTheme();
  const { user } = useAuth();
  const { mealPlans } = useMealPlans();

  // Check if we should skip subscription check (prevents redirect loop)
  const skipSubscriptionCheck = route?.params?.skipSubscriptionCheck || false;

  const flatListRef = useRef(null);
  const [tags, setTags] = useState(cachedTags || []);
  const [loading, setLoading] = useState((cachedTags || []).length === 0);
  const [currentLocation, setCurrentLocation] = useState(
    user?.address || "My Current Location"
  );
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);

  // State for checking active subscription
  const [checkingSubscription, setCheckingSubscription] = useState(true);
  const [hasCheckedSubscription, setHasCheckedSubscription] = useState(false);
  const [userHasActiveSubscription, setUserHasActiveSubscription] =
    useState(false);
  const [subscriptionData, setSubscriptionData] = useState(null);

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

  // Animation shared values for hero transitions
  const heroImageScale = useSharedValue(1);
  const heroImageOpacity = useSharedValue(1);
  const badgeScale = useSharedValue(1);
  const badgeOpacity = useSharedValue(1);
  const descriptionTranslateY = useSharedValue(0);

  // Text rotation messages
  const heroMessages = [
    "Eat healthy!",
    "Save Money!",
    "Stay Fresh!",
    "Live Better!",
  ];

  const [currentMessageIndex, setCurrentMessageIndex] = useState(0);

  // Check for active subscription and navigate to TodayMeal
  useEffect(() => {
    const checkActiveSubscription = async () => {
      // Only check once per session (unless skipSubscriptionCheck changed)
      if (hasCheckedSubscription && !skipSubscriptionCheck) {
        console.log("ℹ️ Already checked subscription, skipping");
        return;
      }

      try {
        console.log("🔍 Checking for active subscription...");
        setCheckingSubscription(true);

        // Ensure token is loaded before making API call
        await apiService.getStoredToken();

        // STRATEGY: Call getMealDashboard API for unified meal data (more reliable)
        console.log("📞 Calling getMealDashboard API...");
        const subscriptionsResult = await apiService.getMealDashboard();
        console.log(
          "📦 Dashboard API response:",
          JSON.stringify(subscriptionsResult, null, 2)
        );

        // Handle 401 errors (no token)
        if (
          subscriptionsResult?.status === 401 ||
          subscriptionsResult?.error === "No token provided"
        ) {
          console.log("⚠️ No valid token, staying on Home screen");
          setCheckingSubscription(false);
          return;
        }

        // ✨ NEW: Extract data from unified endpoint response
        if (subscriptionsResult?.success && subscriptionsResult?.data) {
          // Handle nested data structure: subscriptionsResult.data.data
          const data =
            subscriptionsResult.data.data || subscriptionsResult.data;

          console.log("📊 Unified dashboard data:", {
            hasActiveSubscription: data.hasActiveSubscription,
            hasSubscription: !!data.activeSubscription,
            subscriptionState: data.subscriptionState,
          });

          if (data.hasActiveSubscription && data.activeSubscription) {
            const subscription = data.activeSubscription;
            const subscriptionState = data.subscriptionState;

            console.log("✅ Active subscription detected from dashboard!");
            console.log("📋 Subscription details:", {
              id: subscription.id,
              planName: subscription.planName,
              status: subscription.status,
              firstDeliveryCompleted: subscription.firstDeliveryCompleted,
              startDate: subscription.startDate,
              daysRemaining: subscription.daysRemaining,
            });
            console.log("🎯 Subscription state:", subscriptionState);

            // Set subscription state for "Check my Plan" button
            setUserHasActiveSubscription(true);
            setSubscriptionData(data);

            // Skip navigation if explicitly requested (prevents redirect loop)
            if (skipSubscriptionCheck) {
              console.log(
                "ℹ️ Skip navigation requested, staying on Home with subscription data"
              );
              setCheckingSubscription(false);
              return;
            }

            // Check subscription state to determine which screen to show
            if (
              subscriptionState?.screen === "TodayMealScreen" &&
              subscriptionState?.canAccessTodayMeals
            ) {
              console.log("🚀 Navigating to TodayMeal screen...");
              navigation.replace("TodayMeal", {
                subscription: subscription,
                subscriptionId: subscription.id,
              });
            } else if (
              subscriptionState?.screen === "AwaitingFirstDeliveryScreen"
            ) {
              console.log("⏳ Navigating to AwaitingFirstDelivery screen...");
              console.log("📦 Full subscription data:", subscription);
              navigation.replace("AwaitingFirstDelivery", {
                subscription: subscription,
                subscriptionId: subscription.id || subscription._id,
                estimatedDelivery: subscription.startDate,
                mealPlanId:
                  subscription.mealPlanId?._id || subscription.mealPlanId,
              });
            } else if (
              subscriptionState?.screen === "SubscriptionPausedScreen"
            ) {
              console.log("⏸️ Subscription is paused, showing pause screen...");
              // TODO: Create SubscriptionPausedScreen
              console.log(
                "⚠️ SubscriptionPausedScreen not implemented yet, staying on Home"
              );
              setCheckingSubscription(false);
            } else {
              console.log(
                `ℹ️ Subscription state: ${subscriptionState?.reason}, staying on Home screen`
              );
              setCheckingSubscription(false);
            }
          } else {
            console.log(
              "ℹ️ No active subscription in dashboard, staying on Home screen"
            );
            setUserHasActiveSubscription(false);
            setSubscriptionData(null);
            setCheckingSubscription(false);
          }
        } else {
          console.log("⚠️ Dashboard API returned no data");
          setCheckingSubscription(false);
        }
      } catch (error) {
        console.error("❌ Error checking subscription:", error);
        console.error("❌ Error details:", error.message);
        setCheckingSubscription(false);
      } finally {
        setHasCheckedSubscription(true);
      }
    };

    // Only check if user is logged in
    console.log("👤 User check:", user ? "Logged in" : "Not logged in");
    if (user) {
      checkActiveSubscription();
    } else {
      console.log("⏩ No user, skipping subscription check");
      setCheckingSubscription(false);
    }
  }, [user, navigation, hasCheckedSubscription, skipSubscriptionCheck]);

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

  const handleCheckMyPlan = () => {
    if (!subscriptionData || !subscriptionData.activeSubscription) {
      console.log("❌ No subscription data available");
      return;
    }

    const subscription = subscriptionData.activeSubscription;
    const subscriptionState = subscriptionData.subscriptionState;

    console.log("🔘 Check my Plan button pressed");
    console.log("📋 Subscription state:", subscriptionState);

    // Navigate to the appropriate screen based on subscription state
    if (
      subscriptionState?.screen === "TodayMealScreen" &&
      subscriptionState?.canAccessTodayMeals
    ) {
      console.log("🚀 Navigating to TodayMeal screen...");
      navigation.navigate("TodayMeal", {
        subscription: subscription,
        subscriptionId: subscription.id,
      });
    } else if (subscriptionState?.screen === "AwaitingFirstDeliveryScreen") {
      console.log("⏳ Navigating to AwaitingFirstDelivery screen...");
      navigation.navigate("AwaitingFirstDelivery", {
        subscription: subscription,
        subscriptionId: subscription.id || subscription._id,
        estimatedDelivery: subscription.startDate,
        mealPlanId: subscription.mealPlanId?._id || subscription.mealPlanId,
      });
    } else {
      console.log("ℹ️ Unknown subscription state, staying on Home");
    }
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

          // Lazy load: prefetch only first visible item and neighbors (only URLs)
          const visibleRange = 3; // Current + 1 left + 1 right
          tagsData.slice(0, visibleRange).forEach((tag) => {
            if (tag?.image && typeof tag.image === "string") {
              Image.prefetch(tag.image).catch(() => {});
            }
            if (
              tag?.bigPreviewImage &&
              typeof tag.bigPreviewImage === "string"
            ) {
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

  // Track current focused tag for hero image
  const [focusedTag, setFocusedTag] = useState(null);
  const [currentCarouselIndex, setCurrentCarouselIndex] = useState(0);
  const lastCenteredIndex = useRef(-1); // Track last centered index for haptic
  const [heroImageKey, setHeroImageKey] = useState(0); // Force image remount for smooth transitions

  // Update focused tag when tagData changes
  useEffect(() => {
    if (tagData && tagData.length > 0) {
      // CRITICAL FIX: Always update focused tag when tagData changes from placeholder to real data
      // Check if current focused tag is a placeholder (has number for image)
      const isPlaceholder = focusedTag && typeof focusedTag.image === "number";
      const hasRealData = tagData[0] && typeof tagData[0].image === "string";

      if (!focusedTag || (isPlaceholder && hasRealData)) {
        console.log("🎯 Setting/updating focused tag:", tagData[0].name);
        console.log(
          "   - bigPreviewImage:",
          tagData[0].bigPreviewImage || "NOT SET"
        );
        console.log("   - image:", tagData[0].image || "NOT SET");
        console.log("   - Is real data:", hasRealData);
        setFocusedTag(tagData[0]);
      }
    }
  }, [tagData]);

  // Lazy load images for carousel items near current position
  const prefetchNearbyImages = useCallback(
    (centerIndex) => {
      const range = 2; // Prefetch 2 items before and after
      const startIndex = Math.max(0, centerIndex - range);
      const endIndex = Math.min(tagData.length - 1, centerIndex + range);

      for (let i = startIndex; i <= endIndex; i++) {
        const tag = tagData[i];
        // Only prefetch URLs, not local images (which are numbers from require())
        if (tag?.image && typeof tag.image === "string") {
          Image.prefetch(tag.image).catch(() => {});
        }
        if (tag?.bigPreviewImage && typeof tag.bigPreviewImage === "string") {
          Image.prefetch(tag.bigPreviewImage).catch(() => {});
        }
      }
    },
    [tagData]
  );

  // Reference circular carousel implementation - clean and simple
  const CircularCarouselListItem = React.memo(({ tag, index }) => {
    // Optimized: Simplified to 3-point interpolation for better performance
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
        accessibilityLabel={`Select ${tag?.name || "category"} meal plan`}
        accessibilityHint="Double tap to view this meal plan category"
      >
        <Animated.View
          style={[
            {
              width: ListItemWidth,
              height: ListItemWidth,
              justifyContent: "center",
              alignItems: "center",
              elevation: 5,
              shadowOpacity: 0.2,
              shadowOffset: { width: 0, height: 0 },
              shadowRadius: 20,
              minWidth: 54, // Minimum touch target
              minHeight: 54,
            },
            rStyle,
          ]}
        >
          {/* Tag disk background image */}
          <Image
            source={require("../../../assets/tag-disk.png")}
            style={{
              position: "absolute",
              width: ListItemWidth,
              height: ListItemWidth,
            }}
            resizeMode="contain"
          />

          {/* Tag image overlay */}
          <View
            style={{
              width: ListItemWidth * 0.8, // Make tag image smaller than disk
              height: ListItemWidth * 0.8,
              borderRadius: (ListItemWidth * 0.6) / 2,
              overflow: "hidden",
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <Image
              source={getTagImage(tag, false)}
              style={{
                width: "100%",
                height: "100%",
              }}
              resizeMode="cover"
            />
          </View>
        </Animated.View>
      </TouchableOpacity>
    );
  });

  const getTagImage = useCallback((tag, useBigPreview = false) => {
    try {
      if (!tag) {
        console.log("⚠️ No tag provided to getTagImage");
        return require("../../../assets/authImage.png");
      }

      // Use bigPreviewImage for hero display, regular image for carousel
      const imageSource = useBigPreview
        ? tag.bigPreviewImage || tag.image
        : tag.image;

      // Handle string URLs (remote images)
      if (typeof imageSource === "string" && imageSource.trim()) {
        return { uri: imageSource };
      }

      // Handle local images (require statements) - check if it's a number (the return value of require())
      if (typeof imageSource === "number") {
        return imageSource;
      }

      console.log("⚠️ No valid image source, using placeholder");
      return require("../../../assets/authImage.png");
    } catch (error) {
      console.warn("❌ Image loading error:", error.message);
      return require("../../../assets/authImage.png");
    }
  }, []);

  const getTagName = (tag) => tag?.name || "FitFam";

  const getTagDescription = (tag) =>
    tag?.description || "Perfect for healthy eating";

  // Pre-fetch duration options for a tag
  const prefetchDurationsForTag = useCallback(
    async (tag) => {
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
          setPrefetchedDurations((prev) => ({
            ...prev,
            [tag._id]: formattedOptions,
          }));
        }
      } catch (error) {
        console.error("Error prefetching durations:", error);
      }
    },
    [prefetchedDurations]
  );

  const onSelectTag = (index) => {
    if (!tagData[index]) return;

    const targetOffset = index * ListItemWidth;
    const currentOffset = contentOffset.value;
    const distanceFromCenter = Math.abs(currentOffset - targetOffset);
    const isAtCenter = distanceFromCenter < 5; // Within 5 pixels of exact center

    if (isAtCenter) {
      // Item is already centered - navigate to duration selection
      navigation.navigate("DurationSelectionScreen", {
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

  // Optimized: Update focused tag only when scroll ends (not during scroll)
  const updateFocusedTag = useCallback(
    (index, isSnapped = false) => {
      const newTag = tagData[index];

      // CRITICAL FIX: Compare by index to ensure we always update on carousel change
      const isDifferentTag = currentCarouselIndex !== index;

      if (newTag && isDifferentTag) {
        console.log(
          "🔄 Updating focused tag from carousel scroll:",
          newTag.name,
          "at index:",
          index
        );

        // Update index immediately before animations to prevent race conditions
        setCurrentCarouselIndex(index);

        // Animate OUT (fade + scale down)
        heroImageOpacity.value = withTiming(0, { duration: 100 });
        heroImageScale.value = withTiming(0.95, { duration: 100 });
        badgeOpacity.value = withTiming(0, { duration: 100 });
        badgeScale.value = withTiming(0.9, { duration: 100 });
        descriptionOpacity.value = withTiming(0, { duration: 100 });
        descriptionTranslateY.value = withTiming(10, { duration: 100 });

        // Update state after shorter fade out to reduce delay
        setTimeout(() => {
          setFocusedTag(newTag);
          setHeroImageKey((prev) => prev + 1); // Force image remount

          // Animate IN (fade + scale up with spring for badge)
          heroImageOpacity.value = withTiming(1, { duration: 150 });
          heroImageScale.value = withSpring(1, {
            damping: 15,
            stiffness: 150,
          });
          badgeOpacity.value = withTiming(1, { duration: 150 });
          badgeScale.value = withSpring(1, {
            damping: 12,
            stiffness: 200,
          });
          descriptionOpacity.value = withTiming(1, { duration: 150 });
          descriptionTranslateY.value = withSpring(0, {
            damping: 15,
            stiffness: 150,
          });
        }, 100);

        // FIXED: Only trigger haptic when snapped to center AND index changed
        if (isSnapped && lastCenteredIndex.current !== index) {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          lastCenteredIndex.current = index;
        }

        prefetchNearbyImages(index);
        prefetchDurationsForTag(newTag);
      }
    },
    [
      tagData,
      currentCarouselIndex,
      prefetchNearbyImages,
      prefetchDurationsForTag,
      heroImageOpacity,
      heroImageScale,
      badgeOpacity,
      badgeScale,
      descriptionOpacity,
      descriptionTranslateY,
    ]
  );

  // Optimized scroll handler - updates during scroll for instant feedback
  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      contentOffset.value = event.contentOffset.x;
    },
    onScrollEndDrag: (event) => {
      // Update when user stops dragging - item has snapped to center
      const index = Math.round(event.contentOffset.x / ListItemWidth);
      const clampedIndex = Math.max(0, Math.min(index, tagData.length - 1));
      console.log("📍 Drag ended at index:", clampedIndex);
      runOnJS(updateFocusedTag)(clampedIndex, true); // Pass true for isSnapped
    },
    onMomentumScrollEnd: (event) => {
      // Update after momentum scrolling ends - item has snapped to center
      const index = Math.round(event.contentOffset.x / ListItemWidth);
      const clampedIndex = Math.max(0, Math.min(index, tagData.length - 1));
      console.log("📍 Momentum ended at index:", clampedIndex);
      runOnJS(updateFocusedTag)(clampedIndex, true); // Pass true for isSnapped
    },
  });

  useEffect(() => {
    setPreviousDescription(getTagDescription(focusedTag));
  }, [focusedTag]);

  // Optimized: Pre-load initial focused tag image immediately
  useEffect(() => {
    if (focusedTag) {
      // Prefetch the current focused tag's images immediately (only if they're URLs)
      if (focusedTag.image && typeof focusedTag.image === "string") {
        Image.prefetch(focusedTag.image).catch(() => {});
      }
      if (
        focusedTag.bigPreviewImage &&
        typeof focusedTag.bigPreviewImage === "string"
      ) {
        Image.prefetch(focusedTag.bigPreviewImage).catch(() => {});
      }
    }
  }, [focusedTag]);

  // Optimized: Pre-load ALL images on mount instead of during scroll
  useEffect(() => {
    if (tagData && tagData.length > 0) {
      tagData.forEach((tag) => {
        // Only prefetch URLs, not local images (which are numbers from require())
        if (tag?.image && typeof tag.image === "string") {
          Image.prefetch(tag.image).catch(() => {});
        }
        if (tag?.bigPreviewImage && typeof tag.bigPreviewImage === "string") {
          Image.prefetch(tag.bigPreviewImage).catch(() => {});
        }
      });
    }
  }, [tagData]);

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

  // Animated style for hero image
  const heroImageAnimatedStyle = useAnimatedStyle(() => {
    return {
      opacity: heroImageOpacity.value,
      transform: [{ scale: heroImageScale.value }],
    };
  });

  // Animated style for badge
  const badgeAnimatedStyle = useAnimatedStyle(() => {
    return {
      opacity: badgeOpacity.value,
      transform: [{ scale: badgeScale.value }],
    };
  });

  // Animated style for description
  const descriptionAnimatedStyle = useAnimatedStyle(() => {
    return {
      opacity: descriptionOpacity.value,
      transform: [{ translateY: descriptionTranslateY.value }],
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

  // Show loading screen while checking for active subscription
  if (checkingSubscription) {
    return (
      <SafeAreaView style={styles(colors).container} edges={["top"]}>
        <StatusBar
          barStyle={
            colors.background === "#FFFFFF" ? "dark-content" : "light-content"
          }
          backgroundColor={colors.primary2}
        />
        <View style={styles(colors).loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles(colors).loadingText}>Loading your meals...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles(colors).container} edges={["top"]}>
      <StatusBar
        barStyle={
          colors.background === "#FFFFFF" ? "dark-content" : "light-content"
        }
        backgroundColor={colors.primary2}
      />
      <ScrollView
        style={styles(colors).scrollContainer}
        contentContainerStyle={styles(colors).scrollContent}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        <View style={styles(colors).mainContent}>
          <LinearGradient
            colors={[colors.primary2, "#003C2A", "#003527", "#002E22"]}
            locations={[0, 0.4, 0.7, 1]}
            style={styles(colors).heroBackground}
          >
            <View style={styles(colors).heroWrapper}>
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
                    {isLoadingLocation
                      ? "Getting location..."
                      : currentLocation}
                  </Text>
                  {isLoadingLocation ? (
                    <ActivityIndicator size="small" color={colors.white} />
                  ) : (
                    <CustomIcon
                      name="chevron-down"
                      size={12}
                      color={colors.white}
                    />
                  )}
                </TouchableOpacity>

                {/* Check my Plan Button - Conditional */}
                {userHasActiveSubscription && (
                  <TouchableOpacity
                    style={styles(colors).checkPlanButton}
                    onPress={handleCheckMyPlan}
                    activeOpacity={0.7}
                    accessible={true}
                    accessibilityRole="button"
                    accessibilityLabel="Check my plan"
                    accessibilityHint="Double tap to view your active meal plan"
                  >
                    <CustomIcon
                      name="calendar-filled"
                      size={16}
                      color={colors.primary}
                    />
                    <Text style={styles(colors).checkPlanButtonText}>
                      My Plan
                    </Text>
                  </TouchableOpacity>
                )}
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
                {/* Hero image with organic circle border */}
                <View style={styles(colors).heroImageWrapper}>
                  <MaskedView
                    style={{ width: heroImageSize, height: heroImageSize }}
                    maskElement={
                      <Svg
                        width={heroImageSize}
                        height={heroImageSize}
                        viewBox="0 0 375 375"
                      >
                        <Path
                          d="M188.67,.63c27.65,1.13,54.8,6.39,80.03,17.7,25.57,11.46,49.48,26.89,67.38,48.37,18.05,21.65,30.03,47.81,35.76,75.35,5.68,27.29,3.07,55.29-2.88,82.53-5.99,27.4-13.84,55.25-31.92,76.76-17.96,21.36-44.86,31.93-69.92,44.35-25.31,12.55-50.2,27.93-78.45,29.21-28.62,1.29-56.26-9.35-81.94-21.98-25.54-12.56-48.89-29.24-66.87-51.21-18.07-22.08-31.62-47.9-37.12-75.84-5.43-27.6-2.41-56.21,5.87-83.1,8-25.99,24.92-47.46,41.09-69.36,16.67-22.58,30.79-48.71,55.71-61.76C130.49-1.5,160.34-.54,188.67,.63Z"
                          fill="white"
                        />
                      </Svg>
                    }
                  >
                    <Animated.Image
                      key={heroImageKey}
                      source={getTagImage(focusedTag, true)}
                      style={[
                        {
                          width: heroImageSize,
                          height: heroImageSize,
                        },
                        heroImageAnimatedStyle,
                      ]}
                      resizeMode="cover"
                      onError={(error) => {
                        console.error(
                          "❌ Hero image failed to load:",
                          error.nativeEvent
                        );
                        console.error("   - Tag:", focusedTag?.name);
                        console.error(
                          "   - bigPreviewImage:",
                          focusedTag?.bigPreviewImage
                        );
                        console.error("   - image:", focusedTag?.image);
                      }}
                      onLoad={() => {
                        console.log(
                          "✅ Hero image loaded successfully for:",
                          focusedTag?.name
                        );
                      }}
                    />
                  </MaskedView>

                  {/* SVG stroke border on top - stays static */}
                  <Svg
                    width={heroImageSize}
                    height={heroImageSize}
                    viewBox="0 0 375 375"
                    style={{ position: "absolute", top: 0, left: 0 }}
                  >
                    <Path
                      d="M188.67,.63c27.65,1.13,54.8,6.39,80.03,17.7,25.57,11.46,49.48,26.89,67.38,48.37,18.05,21.65,30.03,47.81,35.76,75.35,5.68,27.29,3.07,55.29-2.88,82.53-5.99,27.4-13.84,55.25-31.92,76.76-17.96,21.36-44.86,31.93-69.92,44.35-25.31,12.55-50.2,27.93-78.45,29.21-28.62,1.29-56.26-9.35-81.94-21.98-25.54-12.56-48.89-29.24-66.87-51.21-18.07-22.08-31.62-47.9-37.12-75.84-5.43-27.6-2.41-56.21,5.87-83.1,8-25.99,24.92-47.46,41.09-69.36,16.67-22.58,30.79-48.71,55.71-61.76C130.49-1.5,160.34-.54,188.67,.63Z"
                      fill="none"
                      stroke={colors.primary}
                      strokeWidth="5"
                    />
                  </Svg>
                </View>
              </View>

              {focusedTag && (
                <Animated.View
                  style={[styles(colors).planBadge, badgeAnimatedStyle]}
                >
                  <TouchableOpacity
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
                    accessibilityLabel={`${
                      focusedTag?.name || "Selected"
                    } meal plan`}
                    accessibilityHint="Double tap to view this meal plan"
                  >
                    <Text style={styles(colors).planBadgeText}>
                      {getTagName(focusedTag)}
                    </Text>
                  </TouchableOpacity>
                </Animated.View>
              )}
              <Text style={styles(colors).chooseHeading}>
                Choose a Meal Plan
              </Text>

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
                  // onLoad={() => }
                  onError={(error) =>
                    console.log("Spin dish image error:", error)
                  }
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
                onMomentumScrollEnd={(event) => {
                  // Regular React Native handler as fallback
                  const index = Math.round(
                    event.nativeEvent.contentOffset.x / ListItemWidth
                  );
                  const clampedIndex = Math.max(
                    0,
                    Math.min(index, tagData.length - 1)
                  );
                  console.log("📍 [RN] Momentum ended at index:", clampedIndex);
                  updateFocusedTag(clampedIndex, true);
                }}
                onScrollEndDrag={(event) => {
                  // Regular React Native handler as fallback
                  const index = Math.round(
                    event.nativeEvent.contentOffset.x / ListItemWidth
                  );
                  const clampedIndex = Math.max(
                    0,
                    Math.min(index, tagData.length - 1)
                  );
                  console.log("📍 [RN] Drag ended at index:", clampedIndex);
                  updateFocusedTag(clampedIndex, true);
                }}
                pagingEnabled
                snapToInterval={ListItemWidth}
                showsHorizontalScrollIndicator={false}
                initialNumToRender={5}
                maxToRenderPerBatch={3}
                windowSize={7}
                removeClippedSubviews={true}
                style={{
                  position: "absolute",
                  // top: "50%",
                  marginTop: -140, // Pushed down from -170
                  height: 300,
                  left: 0,
                  right: 0,
                }}
                contentContainerStyle={{
                  justifyContent: "center",
                  alignItems: "center",
                  paddingHorizontal: (width - ListItemWidth) / 2,
                }}
                horizontal
                renderItem={({ item, index }) => {
                  return <CircularCarouselListItem tag={item} index={index} />;
                }}
              />

              <View style={styles(colors).planInfoContainer}>
                <Animated.Text
                  style={[
                    styles(colors).planDescription,
                    descriptionAnimatedStyle,
                  ]}
                  numberOfLines={2}
                  ellipsizeMode="tail"
                >
                  {getTagDescription(focusedTag)}
                </Animated.Text>
              </View>

              {/* Custom Meal Plan Button
            <View style={styles(colors).customPlanContainer}>
              <TouchableOpacity
                style={styles(colors).customPlanCard}
                onPress={() => navigation.navigate('CustomMealPlan')}
                activeOpacity={0.85}
                accessible={true}
                accessibilityRole="button"
                accessibilityLabel="Create custom meal plan"
                accessibilityHint="Double tap to create a personalized meal plan"
              >
                <LinearGradient
                  colors={[colors.primary, colors.primary2]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles(colors).customPlanGradient}
                >
                  <View style={styles(colors).customPlanContent}>
                    <CustomIcon
                      name="magic"
                      size={24}
                      color={colors.white}
                    />
                    <View style={styles(colors).customPlanTextContainer}>
                      <Text style={styles(colors).customPlanTitle}>
                        Create Custom Plan
                      </Text>
                      <Text style={styles(colors).customPlanSubtitle}>
                        Build your perfect meal plan
                      </Text>
                    </View>
                    <CustomIcon
                      name="chevron-right"
                      size={20}
                      color={colors.white}
                    />
                  </View>
                </LinearGradient>
              </TouchableOpacity>
            </View> */}
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
          </LinearGradient>
        </View>
      </ScrollView>
      <SafeAreaView style={styles(colors).bottomSafeArea} edges={["bottom"]}>
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
        
        <TouchableOpacity
          style={[
            styles(colors).learnMoreButton,
            !focusedTag && styles(colors).learnMoreButtonDisabled,
          ]}
          onPress={() =>
            navigation.navigate("TagScreen", {
              tagId: focusedTag?._id,
              tagName: focusedTag?.name,
            })
          }
          activeOpacity={0.7}
          accessible={true}
          accessibilityRole="button"
          accessibilityLabel="Browse meal plans"
          accessibilityHint="Double tap to browse meal plans"
        >
          <Text style={styles(colors).learnMoreText}>Explore meals</Text>
        </TouchableOpacity>
      </SafeAreaView>
    </SafeAreaView>
  );
};

const styles = (colors) =>
  createStylesWithDMSans({
    container: {
      flex: 1,
      backgroundColor: colors.primary2,
    },
    scrollContainer: {
      flex: 1,
    },
    scrollContent: {
      flexGrow: 1,
      // minHeight: height, // Ensure minimum height equals screen height
      paddingTop: 0,
      paddingBottom: 0,
    },
    bottomSafeArea: {
      backgroundColor: colors.background,
      paddingHorizontal: 16,
      paddingTop: 8,
    },
    mainContent: {
      flex: 1,
      // minHeight: height - statusBarHeight, // Minimum height for fixed layout
    },
    contentSection: {
      // height: 380,
      position: "relative",
      marginTop: verticalScale(40),
    },
    heroWrapper: {
      position: "relative",
      paddingHorizontal: scale(50),
    },
    heroBackground: {
      paddingTop: verticalScale(15),
      paddingBottom: verticalScale(isSmallScreen ? 60 : 80),
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between", // Space between location and plan button
      paddingHorizontal: scale(10),
    },
    locationPill: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: "rgba(255, 255, 255, 0.25)",
      paddingHorizontal: scale(16),
      paddingVertical: verticalScale(9),
      borderRadius: moderateScale(20),
      flex: 1,
      maxWidth: width * 0.55, // Reduced width to make room for plan button
    },
    checkPlanButton: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: "rgba(255, 255, 255, 0.25)",
      paddingHorizontal: scale(14),
      paddingVertical: verticalScale(9),
      borderRadius: moderateScale(20),
      marginLeft: scale(8),
      gap: scale(6),
    },
    checkPlanButtonText: {
      fontSize: moderateScale(14),
      color: colors.white,
      fontWeight: "600",
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
      // padding: scale(10),
      alignItems: "center",
      justifyContent: "center",
    },
    heroImageWrapper: {
      width: heroImageSize,
      height: heroImageSize,
      // padding: scale(10),
      alignItems: "center",
      justifyContent: "center",
      ...getShadowStyle({
        shadowColor: colors.shadow,
        shadowOffset: { width: 10, height: 8 },
        shadowOpacity: 0.7,
        shadowRadius: 0,
      }),
    },
    chooseHeading: {
      position: "relative",
      bottom: verticalScale(getResponsiveValue(20, 40, 60, 90)),
      fontSize: moderateScale(getResponsiveValue(12, 14, 16, 18)),
      fontWeight: "700",
      color: colors.white,
      textAlign: "center",
      marginBottom: verticalScale(42),
    },
    planBadge: {
      position: "relative",
      bottom: verticalScale(getResponsiveValue(20, 40, 60, 90)),
      alignSelf: "center",
      backgroundColor: colors.white,
      // 
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
      paddingHorizontal: scale(18),
      paddingVertical: verticalScale(12),
      fontWeight: "700",
      color: colors.primary2,
    },
    spinDishBackground: {
      position: "absolute",
      // top: verticalScale(0),
      left: "50%",
      marginLeft: -scale(300), // Half of responsive width to center
      width: scale(600), // Responsive size
      height: scale(600),
      zIndex: 0, // Behind all content
    },
    planInfoContainer: {
      // position: "absolute",
      top: verticalScale(30), // Position at top
      left: 0,
      right: 0,
      alignItems: "center",
      paddingHorizontal: scale(20),
      // paddingBottom: verticalScale(15),
    },
    planDescription: {
      fontSize: moderateScale(14),
      color: colors.text,
      textAlign: "center",
      lineHeight: moderateScale(20),
      fontWeight: "500",
      // marginBottom: verticalScale(10), // Changed to bottom margin
    },
    learnMoreButton: {
      backgroundColor: colors.primary,
      paddingVertical: 16,
      borderRadius: 32,
      alignItems: "center",
      justifyContent: "center",
      shadowColor: "#000",
      shadowOffset: {
        width: 0,
        height: 2,
      },
      shadowOpacity: 0.25,
      shadowRadius: 3.84,
      elevation: 5,
    },
    learnMoreButtonDisabled: {
      opacity: 0.5,
    },
    learnMoreText: {
      fontSize: 16,
      color: colors.primary2,
      fontWeight: "600",
    },
    searchContainer: {
      position: "absolute",
      top: verticalScale(85), // Position higher below description
      left: 0,
      right: 0,
      paddingHorizontal: scale(20),
      paddingVertical: verticalScale(15),
      // paddingBottom:
      //   Platform.OS === "android" ? verticalScale(5) : verticalScale(5), // Extra bottom padding for Android navigation
    },
    searchInputContainer: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.cardBackground,
      borderRadius: moderateScale(30),
      paddingHorizontal: scale(15),
      paddingVertical: verticalScale(12),
      borderWidth: scale(1.5),
      borderColor: colors.border,
      ...getShadowStyle({
        shadowColor: colors.shadow,
        shadowOffset: { width: 10, height: 12 },
        shadowOpacity: 0.1,
        shadowRadius: 14,
        elevation: 3,
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
      // bottom: Platform.OS === "android" ? verticalScale(12) : verticalScale(2), // Higher position on Android
      paddingVertical: verticalScale(8),
      paddingBottom:
        Platform.OS === "android" ? verticalScale(15) : verticalScale(8), // Extra padding for navigation buttons
    },
    paginationDot: {
      width: scale(6),
      height: scale(6),
      borderRadius: scale(3),
      backgroundColor: colors.textMuted,
      marginHorizontal: scale(3),
      opacity: 0.5,
    },
    paginationDotActive: {
      width: scale(8),
      height: scale(8),
      borderRadius: scale(4),
      backgroundColor: colors.primary,
      opacity: 1,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: colors.background,
    },
    loadingText: {
      marginTop: 16,
      fontSize: 16,
      color: colors.textSecondary,
      fontWeight: "500",
    },
    // Custom Meal Plan Styles
    customPlanContainer: {
      position: "absolute",
      top: verticalScale(145), // Position below search bar
      left: 0,
      right: 0,
      paddingHorizontal: scale(20),
      paddingVertical: verticalScale(10),
    },
    customPlanCard: {
      borderRadius: moderateScale(16),
      overflow: "hidden",
      ...getShadowStyle({
        shadowColor: colors.shadow,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        elevation: 4,
      }),
    },
    customPlanGradient: {
      padding: scale(16),
    },
    customPlanContent: {
      flexDirection: "row",
      alignItems: "center",
      gap: scale(12),
    },
    customPlanTextContainer: {
      flex: 1,
    },
    customPlanTitle: {
      fontSize: moderateScale(16),
      fontWeight: "700",
      color: colors.white,
      marginBottom: verticalScale(2),
    },
    customPlanSubtitle: {
      fontSize: moderateScale(12),
      color: "rgba(255, 255, 255, 0.85)",
      fontWeight: "500",
    },
  });

export default HomeScreen;
