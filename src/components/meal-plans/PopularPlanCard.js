import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  StyleSheet,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import CustomIcon from "../ui/CustomIcon";
import { useTheme } from "../../styles/theme";
import { createStylesWithDMSans } from "../../utils/fontUtils";

const PopularPlanCard = ({
  plan,
  onPress,
  onBookmarkPress,
  isBookmarked,
  discountData,
  getPlanDescription,
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
      key={plan.id || plan._id}
      style={styles(colors).popularPlanCard}
      onPress={onPress}
      activeOpacity={0.9}
    >
      <View style={styles(colors).popularCardImageContainer}>
        <Image
          source={imageSource}
          style={styles(colors).popularCardImage}
          defaultSource={require("../../assets/images/meal-plans/fitfuel.jpg")}
        />
        {/* Discount Pill */}
        {hasDiscount && (
          <View style={styles(colors).homeDiscountPill}>
            <CustomIcon name="gift" size={14} color="#333" />
            <Text style={styles(colors).homeDiscountPillText}>
              Up to {planDiscount.discountPercent}% Off
            </Text>
          </View>
        )}
      </View>

      {/* Content Overlay with Gradient */}
      <LinearGradient
        colors={["rgba(0, 0, 0, 0)", "rgba(0, 0, 0, 0.5)", "rgba(0, 0, 0, 1)"]}
        locations={[0, 0.6, 1]}
        style={styles(colors).popularCardContent}
      >
        {/* Heart Button positioned above title */}
        <TouchableOpacity
          style={styles(colors).popularHeartButton}
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

        <Text style={styles(colors).popularCardTitle} numberOfLines={1}>
          {plan.name}
        </Text>
        <Text style={styles(colors).popularCardDescription} numberOfLines={2}>
          {getPlanDescription(plan) ||
            "Delicious and nutritious meal plan crafted for your healthy lifestyle"}
        </Text>

        {/* Divider Stroke */}
        <View style={styles(colors).popularCardDivider} />

        {/* Rating, Duration, and Meal Type Row */}
        <View style={styles(colors).popularCardMetaRow}>
          {/* Rating */}
          {(plan.rating || plan.averageRating) && (
            <View style={styles(colors).popularCardMetaItem}>
              <CustomIcon name="star-filled" size={18} color="#FFD700" />
              <Text style={styles(colors).popularCardMetaText2}>
                {plan.rating || plan.averageRating || "4.5"}
              </Text>
            </View>
          )}

          {/* Duration */}
          {(plan.duration || plan.durationDays || plan.durationWeeks) && (
            <View style={styles(colors).popularCardMetaItem}>
              <CustomIcon
                name="clock-filled"
                size={12}
                color="rgba(255, 255, 255, 0.8)"
              />
              <Text style={styles(colors).popularCardMetaText}>
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
            <View style={styles(colors).popularCardMetaItem}>
              <CustomIcon
                name="list-filled"
                size={12}
                color="rgba(255, 255, 255, 0.8)"
              />
              <Text style={styles(colors).popularCardMetaText}>
                {plan.mealType ||
                  plan.category ||
                  plan.tags?.[0]?.name ||
                  "All Meals"}
              </Text>
            </View>
          )}
        </View>

        <Text style={styles(colors).popularCardPrice}>
          ₦{plan.price?.toLocaleString()}
        </Text>
      </LinearGradient>
    </TouchableOpacity>
  );
};

const styles = (colors) =>
  createStylesWithDMSans({
    popularPlanCard: {
      width: 300,
      height: 400,
      marginRight: 20,
      borderRadius: 24,
      borderWidth: 1,
      borderColor: colors.white,
      overflow: "hidden",
      backgroundColor: colors.surface,
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.15,
      shadowRadius: 16,
      elevation: 8,
    },
    popularCardImageContainer: {
      position: "relative",
      width: "100%",
      height: "100%",
    },
    popularCardImage: {
      width: "100%",
      height: "100%",
      resizeMode: "cover",
    },
    homeDiscountPill: {
      position: "absolute",
      top: 16,
      right: 16,
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: "#FFD700",
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 20,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.2,
      shadowRadius: 4,
      elevation: 4,
      zIndex: 10,
    },
    homeDiscountPillText: {
      fontSize: 12,
      fontWeight: "600",
      color: "#333",
      marginLeft: 4,
    },
    popularCardContent: {
      position: "absolute",
      bottom: 0,
      left: 0,
      right: 0,
      padding: 20,
      justifyContent: "flex-end",
    },
    popularHeartButton: {
      position: "absolute",
      top: 20,
      right: 20,
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: "rgba(255, 255, 255, 0.2)",
      justifyContent: "center",
      alignItems: "center",
      backdropFilter: "blur(10px)",
    },
    popularCardTitle: {
      fontSize: 20,
      fontWeight: "700",
      color: "#FFFFFF",
      marginBottom: 8,
      textShadowColor: "rgba(0, 0, 0, 0.3)",
      textShadowOffset: { width: 0, height: 1 },
      textShadowRadius: 2,
    },
    popularCardDescription: {
      fontSize: 14,
      color: "rgba(255, 255, 255, 0.9)",
      lineHeight: 20,
      marginBottom: 16,
    },
    popularCardDivider: {
      height: 1,
      backgroundColor: "rgba(255, 255, 255, 0.5)",
      marginBottom: 12,
    },
    popularCardMetaRow: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 16,
      flexWrap: "wrap",
    },
    popularCardMetaItem: {
      flexDirection: "row",
      alignItems: "center",
      marginRight: 16,
      marginBottom: 4,
    },
    popularCardMetaText: {
      fontSize: 12,
      color: "rgba(255, 255, 255, 0.8)",
      marginLeft: 4,
      fontWeight: "500",
    },
    popularCardMetaText2: {
      fontSize: 14,
      color: "#FFD700",
      marginLeft: 4,
      fontWeight: "600",
    },
    popularCardPrice: {
      fontSize: 24,
      fontWeight: "800",
      color: "#FFFFFF",
      textShadowColor: "rgba(0, 0, 0, 0.3)",
      textShadowOffset: { width: 0, height: 1 },
      textShadowRadius: 2,
    },
  });

export default PopularPlanCard;