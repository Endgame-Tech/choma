import React from "react";
import {
  View,
  ScrollView,
  Image,
  Dimensions,
} from "react-native";
import { useTheme } from "../../styles/theme";
import { createStylesWithDMSans } from "../../utils/fontUtils";
import CustomText from "../ui/CustomText";
import MealPlanCard from "./MealPlanCard";

const { width: screenWidth } = Dimensions.get("window");

const TagMealPlanCard = ({
  tagData,
  mealPlans,
  onMealPlanPress,
  onBookmarkPress,
  isBookmarked,
  discountData,
  getPlanDescription,
  onRefresh,
}) => {
  const { colors } = useTheme();

  if (!tagData || !mealPlans || mealPlans.length === 0) {
    console.log("🚫 TagMealPlanCard not rendering:", { hasTagData: !!tagData, mealPlansLength: mealPlans?.length });
    return null; // Don't render anything if no data
  }

  console.log("🎨 TagMealPlanCard rendering:", { 
    tagName: tagData.name, 
    mealPlansCount: mealPlans.length
  });

  return (
    <View style={styles(colors).container}>
      {/* Header */}
      <View style={styles(colors).header}>
        <View style={styles(colors).tagInfo}>
          {tagData.image ? (
            <Image
              source={{ uri: tagData.image }}
              style={styles(colors).tagImage}
              resizeMode="cover"
            />
          ) : (
            <View style={styles(colors).tagImagePlaceholder}>
              <CustomText style={styles(colors).tagImageText}>🏷️</CustomText>
            </View>
          )}
          <View style={styles(colors).tagTextContainer}>
            <CustomText style={styles(colors).tagName}>
              {tagData.name}
            </CustomText>
          </View>
        </View>
      </View>

      {/* Horizontal Meal Plans */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles(colors).scrollContainer}
        decelerationRate="fast"
        snapToInterval={screenWidth * 0.7 + 8} // Card width + margin
        snapToAlignment="start"
      >
        {mealPlans.map((plan, index) => (
          <View key={plan.id || plan._id} style={styles(colors).cardWrapper}>
            <MealPlanCard
              plan={plan}
              onPress={() => onMealPlanPress(plan)}
              onBookmarkPress={() => onBookmarkPress(plan.id || plan._id)}
              isBookmarked={isBookmarked(plan.id || plan._id)}
              discountData={discountData}
              getPlanDescription={getPlanDescription}
              style={styles(colors).horizontalCard}
            />
          </View>
        ))}
        
        {/* End padding */}
        <View style={styles(colors).endPadding} />
      </ScrollView>
    </View>
  );
};

const styles = (colors) =>
  createStylesWithDMSans({
    container: {
      backgroundColor: colors.surface,
      // marginHorizontal: 16,
      marginVertical: 4,
      // paddingVertical: 8,
      paddingHorizontal: 6,
    },
    loadingContainer: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 20,
    },
    loadingText: {
      marginLeft: 8,
      fontSize: 14,
      color: colors.textSecondary,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 8,
    },
    tagInfo: {
      flexDirection: "row",
      alignItems: "center",
      flex: 1,
    },
    tagImage: {
      width: 20,
      height: 20,
      borderRadius: 10,
      marginRight: 6,
    },
    tagImagePlaceholder: {
      width: 20,
      height: 20,
      borderRadius: 10,
      backgroundColor: colors.backgroundSecondary,
      alignItems: "center",
      justifyContent: "center",
      marginRight: 6,
    },
    tagImageText: {
      fontSize: 10,
    },
    tagTextContainer: {
      flex: 1,
    },
    tagName: {
      fontSize: 14,
      fontWeight: "600",
      color: colors.text,
    },
    tagDescription: {
      fontSize: 11,
      color: colors.textSecondary,
    },
    refreshButton: {
      padding: 4,
      backgroundColor: colors.backgroundSecondary,
      borderRadius: 4,
    },
    refreshIcon: {
      fontSize: 12,
    },
    scrollContainer: {
      paddingLeft: 4,
    },
    cardWrapper: {
      marginRight: 8,
      width: screenWidth * 0.6, 
    },
    horizontalCard: {
      flex: 1,
    },
    endPadding: {
      width: 16,
    },
  });

export default TagMealPlanCard;