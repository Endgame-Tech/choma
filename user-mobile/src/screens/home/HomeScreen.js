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
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "../../styles/theme";
import CustomIcon from "../../components/ui/CustomIcon";
import { createStylesWithDMSans } from "../../utils/fontUtils";
import { useAuth } from "../../hooks/useAuth";
import { useMealPlans } from "../../hooks/useMealPlans";
import tagService from "../../services/tagService";
import { LinearGradient } from "expo-linear-gradient";
import * as Location from "expo-location";

const { width, height } = Dimensions.get("window");

// Circular carousel constants (from reference implementation)
const ListItemWidth = width / 4;

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
  const { colors } = useTheme();
  const { user } = useAuth();
  const { mealPlans } = useMealPlans();

  const flatListRef = useRef(null);
  const [tags, setTags] = useState(cachedTags || []);
  const [loading, setLoading] = useState((cachedTags || []).length === 0);
  const [currentLocation, setCurrentLocation] = useState(
    user?.address || "My Current Location"
  );
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);

  // Infinite scroll state
  const [displayedTags, setDisplayedTags] = useState([]);
  const [currentTagIndex, setCurrentTagIndex] = useState(0);
  const [hasMoreTags, setHasMoreTags] = useState(true);

  // Shared values for all animations (eliminate state-based race conditions)
  const contentOffset = useSharedValue(0);
  const selectedIndex = useSharedValue(0);
  const spinValue = useSharedValue(0);
  const textAnimationValue = useSharedValue(0);

  // Text rotation messages
  const heroMessages = [
    "Eat healthy!",
    "Save Money!",
    "Stay Fresh!",
    "Live Better!",
  ];

  const [currentMessageIndex, setCurrentMessageIndex] = useState(0);

  // Carousel physics constants
  const ITEM_SIZE = ListItemWidth;
  const PADDING = 1.5 * ITEM_SIZE;
  const SNAP_THRESHOLD = ITEM_SIZE * 0.6;

  // Physics-based calculations for smooth animations

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
      selectedIndex.value = 0;
      textAnimationValue.value = 0;
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
        interval = setInterval(rotateMessage, 4000); // Slightly faster rotation
      }
    }, 2000);

    // Comprehensive cleanup
    return () => {
      isActive = false;
      if (timeout) clearTimeout(timeout);
      if (interval) clearInterval(interval);
      // Cancel any pending animations
      textAnimationValue.value = 0;
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

          // Prefetch images with error handling
          tagsData.slice(0, 5).forEach((tag) => {
            // Limit prefetch to first 5
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
  const baseTagData = hasRealTags ? tags : PLACEHOLDER_PLANS; // Fallback to placeholder for now

  // console.log(
  //   "🏠 HomeScreen render - hasRealTags:",
  //   hasRealTags,
  //   "tags length:",
  //   tags?.length,
  //   "baseTagData length:",
  //   baseTagData.length
  // );

  // Infinite scroll implementation with proper pagination
  const ITEMS_PER_BATCH = 10; // Number of items to load per batch

  const tagData = useMemo(() => {
    if ((baseTagData || []).length === 0) return [];

    // Ultra-minimal circular data for maximum performance
    const baseLength = (baseTagData || []).length;
    // Reduced to 2x base data for minimal memory usage
    const totalItems = Math.min(baseLength * 2, 10); // Max 10 items total
    const circularData = [];

    for (let i = 0; i < totalItems; i++) {
      const sourceIndex = i % baseLength;
      // Shallow copy only essential properties
      const baseItem = (baseTagData || [])[sourceIndex];
      circularData.push({
        _id: baseItem._id,
        name: baseItem.name,
        image: baseItem.image,
        bigPreviewImage: baseItem.bigPreviewImage,
        description: baseItem.description,
        infiniteIndex: i,
        sourceIndex,
      });
    }

    return circularData;
  }, [(baseTagData || []).length]);

  // Performance-optimized carousel rendering
  const CarouselItem = React.memo(({ tag, index }) => {
    return <CircularCarouselListItem tag={tag} index={index} />;
  });

  // Initialize carousel to start position
  useEffect(() => {
    if ((baseTagData || []).length > 0 && tagData.length > 0) {
      // Start from a position that allows smooth infinite scroll
      const startIndex = Math.floor(tagData.length / 3); // Start at 1/3 position

      selectedIndex.value = startIndex;
      setCurrentTagIndex(startIndex);

      setTimeout(() => {
        if (flatListRef.current) {
          const startOffset = startIndex * ITEM_SIZE;

          flatListRef.current.scrollToOffset({
            offset: startOffset,
            animated: false,
          });

          contentOffset.value = startOffset;
        }
      }, 100);
    }
  }, [tagData.length]);

  // Get the actual tag from the infinite scroll data
  const getActualTag = (index) => {
    if (!tagData || tagData.length === 0) return null;
    const clampedIndex = Math.max(0, Math.min(index, tagData.length - 1));
    return tagData[clampedIndex] || null;
  };

  // Get current hero tag based on scroll position
  const getCurrentTag = () => {
    const clampedIndex = Math.max(
      0,
      Math.min(currentTagIndex, tagData.length - 1)
    );
    return tagData[clampedIndex] || (baseTagData || [])[0] || null;
  };

  const heroTag = getCurrentTag();
  const selectedTag = hasRealTags ? heroTag : null;

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

  const onSelectTag = (index) => {
    if (!(tagData || [])[index]) {
      return;
    }

    // Update shared value immediately for synchronization
    selectedIndex.value = index;

    // Calculate proper centered offset with physics-based positioning
    const targetOffset = index * ITEM_SIZE;

    if (flatListRef.current) {
      flatListRef.current.scrollToOffset({
        offset: targetOffset,
        animated: true,
      });
    }

    // Smooth animation to target with spring physics
    contentOffset.value = withSpring(targetOffset, {
      damping: 15,
      stiffness: 150,
      mass: 1,
    });

    // Log manual selection
    const actualTag = getActualTag(index);
    if (actualTag) {
      const actualIndex = index % (baseTagData || []).length;
      console.log(
        "Manually selected tag:",
        actualTag.name,
        "at index:",
        actualIndex
      );
    }
  };

  // Highly optimized scroll handler - minimal calculations
  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      "worklet";
      contentOffset.value = event.contentOffset.x;

      // Reduce calculations - only update selectedIndex without runOnJS
      if (tagData.length > 0) {
        const centerIndex = Math.round(event.contentOffset.x / ITEM_SIZE);
        selectedIndex.value = Math.max(0, Math.min(centerIndex, tagData.length - 1));
      }
    },
    onMomentumEnd: (event) => {
      "worklet";
      // Simplified boundary handling - minimal operations
      if (tagData.length === 0) return;

      const currentIndex = Math.round(event.contentOffset.x / ITEM_SIZE);
      const threshold = 2; // Simple threshold

      // Only reset if truly at boundaries to reduce operations
      if (currentIndex < threshold || currentIndex >= tagData.length - threshold) {
        const newIndex = Math.floor(tagData.length / 2);
        const newOffset = newIndex * ITEM_SIZE;

        // Single runOnJS call instead of multiple
        runOnJS(() => {
          flatListRef.current?.scrollToOffset({
            offset: newOffset,
            animated: false,
          });
        })();
      }
    },
  });

  // Optimized Circular Carousel with performance improvements
  const CircularCarouselListItem = React.memo(
    ({ tag, index }) => {
      // Safety check
      if (!tag || index < 0) {
        return null;
      }

      const actualTag = getActualTag(index);

      const rStyle = useAnimatedStyle(() => {
        "worklet";
        // Ultra-simplified animation for maximum performance
        const distanceFromCenter = contentOffset.value / ITEM_SIZE - index;
        const absDistance = Math.abs(distanceFromCenter);

        // Aggressive early exit to reduce calculations
        if (absDistance > 2) {
          return {
            opacity: 0.4,
            transform: [{ scale: 0.7 }],
          };
        }

        // Minimal calculations - removed Math.pow and complex formulas
        const isCenter = absDistance < 0.5;
        const scale = isCenter ? 1.1 : 0.8 + (1 - absDistance) * 0.3;
        const opacity = isCenter ? 1 : 0.6 + (1 - absDistance) * 0.4;
        const translateY = isCenter ? -20 : 0;

        return {
          opacity,
          transform: [{ translateY }, { scale }],
        };
      }, []);

      return (
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => onSelectTag(index)}
        >
          <Animated.View
            style={[
              {
                width: ListItemWidth,
                aspectRatio: 1,
                elevation: 5,
                shadowOpacity: 0.2,
                shadowOffset: {
                  width: 0,
                  height: 0,
                },
                shadowRadius: 20,
              },
              rStyle,
            ]}
          >
            <Image
              source={getTagImage(actualTag, false)}
              style={{
                height: ListItemWidth,
                width: ListItemWidth,
                borderRadius: ListItemWidth / 2, // Perfect circle
                borderWidth: 3,
                borderColor: "white",
              }}
              resizeMode="cover"
              fadeDuration={0}
              loadingIndicatorSource={null}
              progressiveRenderingEnabled={false} // Disable progressive rendering
              defaultSource={require("../../../assets/authImage.png")} // Fallback
            />
          </Animated.View>
        </TouchableOpacity>
      );
    },
    (prevProps, nextProps) => {
      // Custom equality check for better performance
      return (
        prevProps.index === nextProps.index &&
        prevProps.tag?._id === nextProps.tag?._id &&
        prevProps.tag?.image === nextProps.tag?.image &&
        prevProps.tag?.name === nextProps.tag?.name
      );
    }
  );

  // Real-time tag information updates
  const selectedTagName = getTagName(heroTag);
  const selectedTagDescription = getTagDescription(heroTag);

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

  // Animated style for hero text rotation
  const heroTextAnimatedStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      textAnimationValue.value,
      [0, 0.5, 1],
      [1, 0.3, 1], // Subtle fade, not complete disappearance
      Extrapolate.CLAMP
    );

    const translateY = interpolate(
      textAnimationValue.value,
      [0, 0.5, 1],
      [0, -5, 0], // Subtle upward movement
      Extrapolate.CLAMP
    );

    const scale = interpolate(
      textAnimationValue.value,
      [0, 0.5, 1],
      [1, 0.98, 1], // Very subtle scale change
      Extrapolate.CLAMP
    );

    return {
      opacity,
      transform: [{ translateY }, { scale }],
    };
  });

  // Smooth preview image animation synchronized with carousel
  const previewImageAnimatedStyle = useAnimatedStyle(() => {
    const previewImageWidth = 334;
    const baseDataLength = (baseTagData || []).length;

    if (baseDataLength === 0) {
      return { transform: [{ translateX: 0 }] };
    }

    // Use the actual source index for preview synchronization
    const currentScrollIndex = contentOffset.value / ITEM_SIZE;
    const sourceIndex = currentScrollIndex % baseDataLength;

    // Smooth interpolation for preview image translation
    const previewTranslateX = interpolate(
      sourceIndex,
      [0, baseDataLength],
      [0, -baseDataLength * previewImageWidth],
      Extrapolate.CLAMP
    );

    return {
      transform: [{ translateX: previewTranslateX }],
    };
  });

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
              <TouchableOpacity
                style={styles(colors).locationPill}
                onPress={handleLocationPress}
                activeOpacity={0.7}
                disabled={isLoadingLocation}
              >
                <CustomIcon
                  name="location-filled"
                  size={14}
                  color={colors.primary || "#F9B87A"}
                />
                <Text style={styles(colors).locationText} numberOfLines={1}>
                  {isLoadingLocation ? "Getting location..." : currentLocation}
                </Text>
                {isLoadingLocation ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <CustomIcon name="chevron-down" size={12} color="#FFFFFF" />
                )}
              </TouchableOpacity>
            </View>

            <View style={styles(colors).heroTextContainer}>
              <Text style={styles(colors).heroTitle}>
                {heroMessages[currentMessageIndex]}
              </Text>
              <Text style={styles(colors).heroSubtitle}>getChoma</Text>
            </View>

            <View style={styles(colors).heroImageContainer}>
              {/* Static circle border */}
              <View style={styles(colors).heroImageCircle}>
                {/* Animated carousel of preview images */}
                <Animated.View
                  style={[
                    styles(colors).previewCarousel,
                    previewImageAnimatedStyle,
                  ]}
                >
                  {(baseTagData || []).map((tag, index) => {
                    return (
                      <Image
                        key={tag._id || index}
                        source={getTagImage(tag, true)}
                        style={styles(colors).previewImageItem}
                        resizeMode="cover"
                      />
                    );
                  })}
                </Animated.View>
              </View>
            </View>

            {heroTag && (
              <TouchableOpacity
                style={styles(colors).planBadge}
                onPress={() =>
                  selectedTag &&
                  navigation.navigate("TagScreen", {
                    tagId: selectedTag._id,
                    tagName: selectedTag.name,
                  })
                }
                activeOpacity={0.8}
              >
                <Text style={styles(colors).planBadgeText}>
                  {selectedTagName}
                </Text>
              </TouchableOpacity>
            )}
            <Text style={styles(colors).chooseHeading}>Choose a category</Text>
          </LinearGradient>

          <View style={styles(colors).heroCurve}>
            {/* Spinning Dish Background */}
            <Animated.Image
              source={require("../../../assets/spin-dish.png")}
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
            keyExtractor={(item, index) => {
              // Safer key extraction with fallbacks
              if (item?.infiniteIndex !== undefined) {
                return `infinite-${item.infiniteIndex}`;
              }
              if (item?._id) {
                return `id-${item._id}-${index}`;
              }
              if (item?.id) {
                return `item-${item.id}-${index}`;
              }
              return `index-${index}`;
            }}
            scrollEventThrottle={32} // Increased to reduce scroll calculations
            onScroll={scrollHandler}
            snapToInterval={ITEM_SIZE}
            decelerationRate="fast"
            snapToAlignment="center"
            disableIntervalMomentum={true} // Reduce momentum calculations
            style={{
              position: "absolute",
              bottom: 20, // Lift up slightly from bottom
              height: 320, // More height for the arc
            }}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{
              justifyContent: "center",
              alignItems: "center",
              paddingHorizontal: PADDING,
            }}
            horizontal
            getItemLayout={(data, index) => ({
              length: ITEM_SIZE,
              offset: ITEM_SIZE * index,
              index,
            })}
            initialNumToRender={3}
            maxToRenderPerBatch={1} // Reduced to 1 for very low memory usage
            windowSize={3}
            removeClippedSubviews={true}
            updateCellsBatchingPeriod={200} // Increased to reduce update frequency
            legacyImplementation={false}
            maintainVisibleContentPosition={null} // Disable for performance
            renderItem={({ item, index }) => {
              return <CarouselItem tag={item} index={index} />;
            }}
          />

          <View style={styles(colors).planInfoContainer}>
            <Text style={styles(colors).planDescription}>
              {selectedTagDescription}
            </Text>

            <TouchableOpacity
              style={[
                styles(colors).learnMoreButton,
                !selectedTag && styles(colors).learnMoreButtonDisabled,
              ]}
              onPress={() =>
                selectedTag &&
                navigation.navigate("TagScreen", {
                  tagId: selectedTag._id,
                  tagName: selectedTag.name,
                })
              }
              activeOpacity={0.7}
              disabled={!selectedTag}
            >
              <Text style={styles(colors).learnMoreText}>Explore meals</Text>
            </TouchableOpacity>
          </View>

          {/* Search Bar - Copy from SearchScreen */}
          <View style={styles(colors).searchContainer}>
            <TouchableOpacity
              style={styles(colors).searchInputContainer}
              onPress={() => navigation.navigate("Search")}
              activeOpacity={0.85}
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
    contentSection: {
      height: 400, // Provide enough space for the arched carousel
      position: "relative",
      marginTop: 20,
    },
    heroWrapper: {
      position: "relative",
      backgroundColor: "#652815",
    },
    heroBackground: {
      paddingHorizontal: 20,
      paddingTop: 20,
      paddingBottom: 140,
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
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 20,
      maxWidth: width * 0.8, // Allow more width for centered location
      minWidth: width * 0.4, // Ensure minimum width
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
    heroImageCircle: {
      width: 340,
      height: 340,
      borderRadius: 320,
      borderWidth: 3,
      borderColor: "#FFFFFF",
      overflow: "hidden",
      justifyContent: "center",
      alignItems: "center",
    },
    previewCarousel: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "flex-start",
    },
    previewImageItem: {
      width: 334, // Slightly smaller than circle (340 - 6px for border)
      height: 334,
      borderRadius: 167, // Perfect circle (334/2)
      marginRight: 0, // No spacing between images
    },
    chooseHeading: {
      fontSize: 22,
      fontWeight: "700",
      color: "#652815",
      textAlign: "center",
      paddingTop: 16,
    },
    planBadge: {
      position: "absolute",
      bottom: 150,
      alignSelf: "center",
      backgroundColor: "#FFFFFF",
      paddingHorizontal: 20,
      paddingVertical: 15,
      marginBottom: 10,
      borderRadius: 22,
      shadowColor: "#000000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 8,
      elevation: 6,
    },
    planBadgeText: {
      fontSize: 20,
      fontWeight: "700",
      color: "#652815",
    },

    planScrollContainer: {
      position: "relative",
      marginTop: 24,
      height: 150,
      justifyContent: "center",
    },
    spinDishBackground: {
      position: "absolute",
      top: -50,
      left: "50%",
      marginLeft: -300, // Half of width to center
      width: 600, // Extra large to overflow beyond screen
      height: 600,
      zIndex: 0, // Behind all content
      // opacity: 0.2,
    },
    planScroller: {
      paddingHorizontal: 1.5 * ListItemWidth,
      alignItems: "center",
      zIndex: 15, // Ensure ScrollView content is above fixed circle
    },
    planChip: {
      width: 70,
      height: 70,
      borderRadius: 35,
      marginHorizontal: 6,
      borderWidth: 2,
      borderColor: "transparent",
      overflow: "hidden",
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: "#F5F1EE",
      shadowColor: "#000000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.08,
      shadowRadius: 4,
      elevation: 4,
      zIndex: 20, // Higher z-index to be on top
    },
    planChipSelected: {
      borderColor: "#F9B87A",
      shadowOpacity: 0.25,
      elevation: 5,
    },
    planChipCentered: {
      borderWidth: 3,
      borderColor: "#FFFFFF",
      shadowColor: "#1b1b1b",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 8,
      zIndex: 25, // Highest z-index for centered plan
    },
    planChipImage: {
      width: "100%",
      height: "100%",
      borderRadius: 35,
    },
    planInfoContainer: {
      marginTop: 16, // Reduce top margin to accommodate carousel
      alignItems: "center",
      paddingHorizontal: 20,
      paddingBottom: 20,
    },
    planTitle: {
      fontSize: 20,
      fontWeight: "600",
      color: "#652815",
    },
    planDescription: {
      // marginTop: 10,
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
    searchContainer: {
      paddingHorizontal: 20,
      paddingVertical: 15,
      marginTop: 10,
    },
    searchInputContainer: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.cardBackground,
      borderRadius: 30,
      paddingHorizontal: 15,
      paddingVertical: 12,
      borderWidth: 1,
      borderColor: colors.border,
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    },
    searchIcon: {
      marginRight: 10,
    },
    searchPlaceholder: {
      flex: 1,
      fontSize: 16,
      color: colors.textMuted,
    },
  });

export default HomeScreen;
