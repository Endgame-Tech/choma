import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  Modal,
  Platform,
  Animated,
} from "react-native";
import CustomIcon from "../ui/CustomIcon";
import { useTheme } from "../../styles/theme";
import { createStylesWithDMSans } from "../../utils/fontUtils";

// Shadow utility for cross-platform compatibility
const getShadowStyle = (shadowProps) => ({
  ...shadowProps,
  ...(Platform.OS === "android" && {
    elevation: shadowProps.shadowOpacity ? shadowProps.shadowOpacity * 10 : 5,
  }),
});

const MealPlanCard = ({
  plan,
  onPress,
  onBookmarkPress,
  onRatePress,
  isBookmarked,
  discountData = {},
  getPlanDescription,
  showRatingButton = false,
}) => {
  const { colors } = useTheme();
  const [imageError, setImageError] = useState(false);
  const [discountModalVisible, setDiscountModalVisible] = useState(false);
  const heartScale = useRef(new Animated.Value(1)).current;
  const heartRotation = useRef(new Animated.Value(0)).current;

  const animateHeart = () => {
    Animated.parallel([
      Animated.sequence([
        Animated.spring(heartScale, {
          toValue: 1.3,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.spring(heartScale, {
          toValue: 1,
          duration: 100,
          useNativeDriver: true,
        }),
      ]),
      Animated.sequence([
        Animated.spring(heartRotation, {
          toValue: 0.1,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.spring(heartRotation, {
          toValue: 0,
          duration: 100,
          useNativeDriver: true,
        }),
      ]),
    ]).start();
  };

  // Check multiple possible image field names
  const planImage =
    plan.image || plan.coverImage || plan.planImageUrl || plan.imageUrl;

  // Debug logging (remove after testing)
  if (!planImage) {
    console.log(
      `⚠️ No image found for meal plan "${plan.name || plan.planName}":`,
      {
        hasImage: !!plan.image,
        hasCoverImage: !!plan.coverImage,
        hasPlanImageUrl: !!plan.planImageUrl,
        hasImageUrl: !!plan.imageUrl,
        planId: plan.id || plan._id,
      }
    );
  }

  const imageSource =
    imageError || !planImage
      ? require("../../assets/images/meal-plans/fitfuel.jpg")
      : typeof planImage === "string"
      ? { uri: planImage }
      : planImage;

  const handleImageError = () => {
    console.log(
      `Failed to load meal plan image for ${plan.name || plan.planName}:`,
      {
        image: plan.image,
        coverImage: plan.coverImage,
        planImageUrl: plan.planImageUrl,
        imageUrl: plan.imageUrl,
      }
    );
    setImageError(true);
  };

  const planDiscount = discountData[plan.id || plan._id];
  const hasDiscount = planDiscount && planDiscount.discountPercent > 0;

  // Debug: Log plan data to check isPopular field
  console.log(
    `🔍 MealPlan "${plan.name}" - isPopular: ${plan.isPopular}, isNew: ${plan.isNew}`
  );

  return (
    <TouchableOpacity
      style={styles(colors).mealplanCard}
      onPress={onPress}
      activeOpacity={0.9}
    >
      {/* Image Container */}
      <View style={styles(colors).mealplanImageContainer}>
        <Image
          source={imageSource}
          style={styles(colors).mealplanImage}
          defaultSource={require("../../assets/images/meal-plans/fitfuel.jpg")}
          onError={handleImageError}
        />

        {/* Top action row with heart button and rating */}
        <View style={styles(colors).topActionRow}>
          <View style={styles(colors).ratingBadge}>
            <CustomIcon name="star-filled" size={14} color={colors.primary} />
            <Text style={styles(colors).ratingBadgeText}>
              {(
                plan.rating ||
                plan.averageRating ||
                plan.avgRating ||
                4.5
              ).toFixed(1)}
            </Text>
          </View>

          <TouchableOpacity
            style={styles(colors).mealplanHeartButton}
            onPress={() => {
              animateHeart();
              onBookmarkPress();
            }}
            activeOpacity={0.9}
          >
            <Animated.View
              style={{
                transform: [
                  { scale: heartScale },
                  {
                    rotate: heartRotation.interpolate({
                      inputRange: [0, 1],
                      outputRange: ["0deg", "360deg"],
                    }),
                  },
                ],
              }}
            >
              <CustomIcon
                name="heart"
                filled={isBookmarked}
                size={20}
                color={isBookmarked ? colors.error : "#FFF"}
              />
            </Animated.View>
          </TouchableOpacity>
        </View>

        {/* New Badge positioned on top-left of image - only show for new meals */}
        {plan.isNew && (
          <View style={styles(colors).newBadge}>
            <Text style={styles(colors).newBadgeText}>New</Text>
          </View>
        )}

        {/* Popular Badge positioned on left side - only show for popular meals */}
        {plan.isPopular && (
          <View style={styles(colors).popularBadge}>
            <Text style={styles(colors).popularBadgeText}>popular</Text>
          </View>
        )}

        {/* Discount Pill - Bottom Right */}
        {hasDiscount && (
          <View style={styles(colors).homeDiscountPill}>
            <CustomIcon name="gift" size={14} color="#333" />
            <Text style={styles(colors).homeDiscountPillText}>
              Up to {planDiscount.discountPercent}% Off
            </Text>
          </View>
        )}
      </View>

      {/* Text Content Below Image */}
      <View style={styles(colors).mealplanTextContent}>
        <Text style={styles(colors).mealplanTitle} numberOfLines={1}>
          {plan.name}
        </Text>
        <Text style={styles(colors).mealplanDescription} numberOfLines={2}>
          {getPlanDescription(plan) ||
            "Satisfy your junk food cravings with fast, delicious, and effortless delivery."}
        </Text>

        {/* Rating, Duration, and Meal Type Row */}
        <View style={styles(colors).mealplanMetaRow}>
          {/* Duration */}
          {(plan.duration || plan.durationDays || plan.durationWeeks) && (
            <View style={styles(colors).mealplanMetaItem}>
              <CustomIcon
                name="clock-filled"
                size={12}
                color={colors.text}
                opacity={0.8}
              />
              <Text style={styles(colors).mealplanMetaText}>
                {plan.duration ||
                  (plan.durationWeeks && plan.isFiveWorkingDays
                    ? `${plan.durationWeeks * 5} Days Plan`
                    : plan.durationWeeks
                    ? `${plan.durationWeeks} week(s)`
                    : plan.durationDays
                    ? `${plan.durationDays} days`
                    : "1 week")}
              </Text>
            </View>
          )}

          {/* Meal Type */}
          {(plan.mealType || plan.category || plan.tags?.[0]?.name) && (
            <View style={styles(colors).mealplanMetaItem}>
              <CustomIcon
                name="list-filled"
                size={12}
                color={colors.text}
                opacity={0.8}
              />
              <Text style={styles(colors).mealplanMetaText}>
                {plan.mealType ||
                  plan.category ||
                  plan.tags?.[0]?.name ||
                  "All Meals"}
              </Text>
            </View>
          )}
        </View>

        {/* Custom Dashed Divider */}
        <View style={styles(colors).dividerContainer}>
          {[...Array(20)].map((_, i) => (
            <View key={i} style={styles(colors).dashItem} />
          ))}
        </View>

        <View style={styles(colors).mealplanBottomRow}>
          <View style={styles(colors).mealplanPriceContainer}>
            {hasDiscount ? (
              <View style={styles(colors).priceWithDiscountContainer}>
                {planDiscount.discountType === "ad" ? (
                  // Ad Discount: Show counter value struck through, original price as current
                  <>
                    <View style={styles(colors).priceRow}>
                      <Text style={styles(colors).strikethroughPrice}>
                        ₦
                        {planDiscount.counterValue?.toLocaleString() ||
                          plan.price?.toLocaleString()}
                      </Text>
                      <TouchableOpacity
                        onPress={() => setDiscountModalVisible(true)}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                      >
                        <CustomIcon
                          name="info-circle"
                          size={14}
                          color={colors.primary}
                        />
                      </TouchableOpacity>
                    </View>
                    <View style={styles(colors).priceRatingRow}>
                      <Text style={styles(colors).mealplanPrice}>
                        ₦
                        {planDiscount.originalPrice?.toLocaleString() ||
                          plan.price?.toLocaleString()}
                      </Text>
                    </View>
                  </>
                ) : (
                  // Promo Discount: Show original price struck through, discounted price as current
                  <>
                    <View style={styles(colors).priceRow}>
                      <Text style={styles(colors).strikethroughPrice}>
                        ₦
                        {planDiscount.originalPrice?.toLocaleString() ||
                          plan.price?.toLocaleString()}
                      </Text>
                      <TouchableOpacity
                        onPress={() => setDiscountModalVisible(true)}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                      >
                        <CustomIcon
                          name="info-circle"
                          size={14}
                          color={colors.primary}
                        />
                      </TouchableOpacity>
                    </View>
                    <View style={styles(colors).priceRatingRow}>
                      <Text style={styles(colors).mealplanPrice}>
                        ₦
                        {planDiscount.discountedPrice?.toLocaleString() ||
                          plan.price?.toLocaleString()}
                      </Text>
                      <View style={styles(colors).ratingDisplay}>
                        <CustomIcon
                          name="star-filled"
                          size={12}
                          color={colors.rating || colors.primary}
                        />
                        <Text style={styles(colors).ratingText}>
                          {(
                            plan.rating ||
                            plan.averageRating ||
                            plan.avgRating ||
                            4.5
                          ).toFixed(1)}
                        </Text>
                      </View>
                    </View>
                  </>
                )}
              </View>
            ) : (
              <View style={styles(colors).priceRatingRow}>
                <Text style={styles(colors).mealplanPrice}>
                  ₦{plan.price?.toLocaleString()}
                </Text>
              </View>
            )}
          </View>

          {/* Rating Button */}
          {showRatingButton && onRatePress && (
            <TouchableOpacity
              style={styles(colors).rateButton}
              onPress={() => onRatePress(plan)}
              activeOpacity={0.9}
            >
              <CustomIcon name="star" size={14} color={colors.primary} />
              <Text style={styles(colors).rateButtonText}>Rate</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Discount Info Modal */}
        {hasDiscount && (
          <Modal
            visible={discountModalVisible}
            transparent
            animationType="fade"
            onRequestClose={() => setDiscountModalVisible(false)}
          >
            <TouchableOpacity
              style={styles(colors).modalOverlay}
              activeOpacity={1}
              onPress={() => setDiscountModalVisible(false)}
            >
              <View style={styles(colors).modalContent}>
                <View style={styles(colors).modalHeader}>
                  <CustomIcon name="gift" size={24} color={colors.primary} />
                  <Text style={styles(colors).modalTitle}>
                    Discount Details
                  </Text>
                </View>
                <View style={styles(colors).modalBody}>
                  <Text style={styles(colors).modalDiscountName}>
                    {planDiscount.reason || "Special Offer"}
                  </Text>
                  {planDiscount.eligibilityReason && (
                    <Text style={styles(colors).modalDescription}>
                      {planDiscount.eligibilityReason}
                    </Text>
                  )}
                  <View style={styles(colors).modalDiscountBadge}>
                    <Text style={styles(colors).modalDiscountText}>
                      {planDiscount.discountPercent}% OFF
                    </Text>
                  </View>
                </View>
                <TouchableOpacity
                  style={styles(colors).modalCloseButton}
                  onPress={() => setDiscountModalVisible(false)}
                >
                  <Text style={styles(colors).modalCloseText}>Close</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          </Modal>
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = (colors) =>
  createStylesWithDMSans({
    mealplanCard: {
      width: "100%",
      borderRadius: 17,
      overflow: "hidden",
      marginBottom: 10,
      padding: 5,
      backgroundColor: colors.cardBackground,
      ...getShadowStyle({
        shadowColor: colors.shadow,
        shadowOffset: { width: 10, height: 12 },
        shadowOpacity: 0.4,
        shadowRadius: 0,
      }),
    },
    mealplanImageContainer: {
      position: "relative",
      height: 140, // Much larger image height
      width: "100%",
      borderRadius: 7.5,
      overflow: "hidden",
      marginBottom: 4,
    },
    mealplanImage: {
      width: "100%",
      height: "100%",
      resizeMode: "cover",
      borderRadius: 15,
    },
    topActionRow: {
      position: "absolute",
      top: 5,
      right: 5,
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      zIndex: 2,
    },
    mealplanHeartButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.primary2,
      justifyContent: "center",
      alignItems: "center",
    },
    ratingBadge: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.primary2,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 20,
      gap: 4,
    },
    ratingBadgeText: {
      fontSize: 14,
      fontWeight: "700",
      color: colors.white,
    },
    newBadge: {
      position: "absolute",
      top: 16,
      left: 16,
      backgroundColor: colors.error,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 20,
    },
    newBadgeText: {
      color: colors.white,
      fontSize: 12,
      fontWeight: "bold",
    },
    popularBadge: {
      position: "absolute",
      top: "50%",
      left: -5,
      transform: [{ translateY: -20 }],
      backgroundColor: "#0F5C4C", // Dark green color from the image
      paddingHorizontal: 20,
      paddingVertical: 10,
      borderRadius: 50,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 3.84,
      elevation: 5,
      zIndex: 5,
    },
    popularBadgeText: {
      color: colors.white,
      fontSize: 14,
      fontWeight: "bold",
      letterSpacing: 0.5,
    },
    // Home Screen Discount Pill
    homeDiscountPill: {
      position: "absolute",
      bottom: 8,
      right: 8,
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: "#EFFFFB",
      paddingHorizontal: 8,
      paddingVertical: 7,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: "#1b1b1b",
      zIndex: 10,
    },
    homeDiscountPillText: {
      fontSize: 15,
      fontWeight: "550",
      color: "#333",
      marginLeft: 3,
    },
    mealplanTextContent: {
      paddingHorizontal: 10,
      paddingTop: 5,
      paddingBottom: 5,
    },
    mealplanTitle: {
      fontSize: 18,
      fontWeight: 600,
      color: colors.text,
      marginBottom: 1,
    },
    mealplanDescription: {
      fontSize: 14,
      color: colors.textSecondary,
      marginBottom: 4,
      lineHeight: 20,
    },
    mealplanBottomRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-end",
    },
    mealplanPriceContainer: {
      flex: 1,
      alignItems: "flex-end",
    },
    priceRatingRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "flex-end",
      gap: 8,
    },
    mealplanPrice: {
      fontSize: 17,
      fontWeight: "bold",
      color: colors.text,
    },
    ratingDisplay: {
      flexDirection: "row",
      alignItems: "center",
      gap: 2,
    },
    ratingText: {
      fontSize: 15,
      fontWeight: "800",
      color: colors.text,
    },
    rateButton: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.primary + "15",
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 12,
      gap: 4,
    },
    rateButtonText: {
      fontSize: 12,
      fontWeight: "500",
      color: colors.primary,
    },
    // Meta information styles for meal plan cards
    mealplanMetaRow: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 2,
      gap: 12,
    },
    mealplanMetaItem: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
    },
    mealplanMetaText: {
      fontSize: 12,
      opacity: 0.8,
      color: colors.text,
      fontWeight: "700",
    },
    priceWithDiscountContainer: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "flex-end",
      // gap: 4,
    },
    priceRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
    },
    strikethroughPrice: {
      fontSize: 13,
      color: colors.textSecondary,
      textDecorationLine: "line-through",
      fontWeight: "500",
      marginRight: 4,
    },
    // Modal styles
    modalOverlay: {
      flex: 1,
      backgroundColor: "rgba(0, 0, 0, 0.5)",
      justifyContent: "center",
      alignItems: "center",
      padding: 20,
    },
    modalContent: {
      backgroundColor: colors.background,
      borderRadius: 20,
      padding: 24,
      width: "100%",
      maxWidth: 400,
      borderWidth: 1,
      borderColor: colors.border,
    },
    modalHeader: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      marginBottom: 16,
    },
    modalTitle: {
      fontSize: 20,
      fontWeight: "bold",
      color: colors.text,
    },
    modalBody: {
      gap: 12,
    },
    modalDiscountName: {
      fontSize: 18,
      fontWeight: "600",
      color: colors.text,
    },
    modalDescription: {
      fontSize: 14,
      color: colors.textSecondary,
      lineHeight: 20,
    },
    modalDiscountBadge: {
      backgroundColor: colors.primary + "15",
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 12,
      alignSelf: "flex-start",
    },
    modalDiscountText: {
      fontSize: 16,
      fontWeight: "bold",
      color: colors.primary,
    },
    modalCloseButton: {
      backgroundColor: colors.primary,
      paddingVertical: 12,
      borderRadius: 12,
      marginTop: 20,
      alignItems: "center",
    },
    modalCloseText: {
      fontSize: 16,
      fontWeight: "600",
      color: colors.white,
    },
    dividerContainer: {
      flexDirection: "row",
      alignItems: "center",
      marginVertical: 8,
      marginHorizontal: -15, // Negative margin to counteract card padding
      justifyContent: "space-between",
    },
    dashItem: {
      width: 8,
      height: 1,
      backgroundColor: colors.border,
    },
  });
export default MealPlanCard;
