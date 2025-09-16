// src/components/meal-plans/MealCardSkeleton.js
import React from "react";
import { View, StyleSheet, Dimensions } from "react-native";
import Skeleton from "../ui/Skeleton";
import { useTheme } from "../../styles/theme";
import { createStylesWithDMSans } from "../../utils/fontUtils";

const { width } = Dimensions.get("window");

const MealCardSkeleton = () => {
  const { colors } = useTheme();
  return (
    <View style={styles(colors).mealplanCard}>
      <Skeleton
        height={200}
        style={{ borderBottomLeftRadius: 0, borderBottomRightRadius: 0 }}
      />
      <View style={{ padding: 15 }}>
        <Skeleton height={20} width={"80%"} style={{ marginBottom: 10 }} />
        <Skeleton height={16} width={"50%"} style={{ marginBottom: 15 }} />
        <Skeleton height={24} width={"30%"} />
      </View>
    </View>
  );
};

const styles = (colors) =>
  createStylesWithDMSans({
    mealplanCard: {
      width: "100%",
      backgroundColor: colors.cardBackground,
      borderRadius: 20,
      overflow: "hidden",
      marginBottom: 20,
      borderWidth: 1,
      borderColor: colors.border,
    },
  });

export default MealCardSkeleton;
