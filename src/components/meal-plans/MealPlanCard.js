import React from "react";
import { View, Text, TouchableOpacity, Image } from "react-native";
import CustomIcon from "../ui/CustomIcon";
import { useTheme } from "../../styles/theme";
import { createStylesWithDMSans } from "../../utils/fontUtils";

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

  const imageSource = plan.image
    ? typeof plan.image === "string"
      ? { uri: plan.image }
      : plan.image
    : require("../../assets/images/meal-plans/fitfuel.jpg");

  const planDiscount = discountData[plan.id || plan._id];
  const hasDiscount = planDiscount && planDiscount.discountPercent > 0;

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
        />

        {/* Heart Button positioned on top-right of image */}
        <TouchableOpacity
          style={styles(colors).mealplanHeartButton}
          onPress={onBookmarkPress}
          activeOpacity={0.9}
        >
          <CustomIcon
            name="heart"
            filled={isBookmarked}
            size={20}
            color={isBookmarked ? colors.error : "#FF9A3F"}
          />
        </TouchableOpacity>

        {/* New Badge positioned on top-left of image - only show for new meals */}
        {plan.isNew && (
          <View style={styles(colors).newBadge}>
            <Text style={styles(colors).newBadgeText}>New</Text>
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
          {/* Rating */}
          {(plan.rating || plan.averageRating) && (
            <View style={styles(colors).mealplanMetaItem}>
              <CustomIcon name="star-filled" size={12} color={colors.primary} />
              <Text style={styles(colors).mealplanMetaText}>
                {plan.rating || plan.averageRating || "4.5"}
              </Text>
            </View>
          )}

          {/* Duration */}
          {(plan.duration || plan.durationDays || plan.durationWeeks) && (
            <View style={styles(colors).mealplanMetaItem}>
              <CustomIcon name="time" size={12} color={colors.text} />
              <Text style={styles(colors).mealplanMetaText}>
                {plan.duration ||
                  (plan.durationWeeks
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
              <CustomIcon name="food" size={12} color={colors.text} />
              <Text style={styles(colors).mealplanMetaText}>
                {plan.mealType ||
                  plan.category ||
                  plan.tags?.[0]?.name ||
                  "All Meals"}
              </Text>
            </View>
          )}
        </View>

        <View style={styles(colors).mealplanBottomRow}>
          <View style={styles(colors).mealplanPriceContainer}>
            <Text style={styles(colors).mealplanPrice}>
              ₦{plan.price?.toLocaleString()}
            </Text>

            {/* Show average rating if available */}
            {(plan.rating || plan.averageRating || plan.avgRating) && (
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
                    plan.avgRating
                  ).toFixed(1)}
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
      </View>
    </TouchableOpacity>
  );
};

const styles = (colors) =>
  createStylesWithDMSans({
    mealplanCard: {
      width: "100%",
      borderRadius: 20,
      overflow: "hidden",
      marginBottom: 0, // Remove margin as gap handles spacing
    },
    mealplanImageContainer: {
      position: "relative",
      height: 150, // Much larger image height
      width: "100%",
      borderRadius: 20,
      overflow: "hidden",
    },
    mealplanImage: {
      width: "100%",
      height: "100%",
      resizeMode: "cover",
      borderRadius: 15,
    },
    mealplanHeartButton: {
      position: "absolute",
      top: 16,
      right: 16,
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.black,
      justifyContent: "center",
      alignItems: "center",
      borderWidth: 1,
      borderColor: "#1b1b1b",
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
    // Home Screen Discount Pill
    homeDiscountPill: {
      position: "absolute",
      bottom: 8,
      right: 8,
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: "#F3E9DF",
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
      padding: 16,
    },
    mealplanTitle: {
      fontSize: 18,
      fontWeight: 600,
      color: colors.text,
      marginBottom: 6,
    },
    mealplanDescription: {
      fontSize: 14,
      color: colors.textSecondary,
      marginBottom: 8,
      lineHeight: 20,
    },
    mealplanBottomRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-end",
    },
    mealplanPriceContainer: {
      flex: 1,
    },
    mealplanPrice: {
      fontSize: 20,
      fontWeight: "bold",
      color: colors.text,
    },
    ratingDisplay: {
      flexDirection: "row",
      alignItems: "center",
      gap: 2,
      marginTop: 2,
    },
    ratingText: {
      fontSize: 11,
      fontWeight: "600",
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
      marginBottom: 8,
      gap: 12,
    },
    mealplanMetaItem: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
    },
    mealplanMetaText: {
      fontSize: 12,
      color: colors.text,
      fontWeight: "500",
    },
  });
export default MealPlanCard;
