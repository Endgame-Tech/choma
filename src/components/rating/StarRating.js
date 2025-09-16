import React, { useState, useCallback } from "react";
import { View, TouchableOpacity, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { createStylesWithDMSans } from "../../utils/fontUtils";

const StarRating = ({
  value = 0,
  onChange,
  onHover,
  size = 24,
  color = "#fbbf24",
  hoverColor = "#f59e0b",
  disabled = false,
  allowHalf = true,
  readOnly = false,
  showValue = false,
  style,
  starStyle,
  textStyle,
  onPress, // For React Native, we use onPress instead of onChange
}) => {
  const [hoverValue, setHoverValue] = useState(null);
  const [isHovering, setIsHovering] = useState(false);

  const handlePress = useCallback(
    (starIndex, isHalf = false) => {
      if (disabled || readOnly) return;

      const rating = isHalf ? starIndex + 0.5 : starIndex + 1;
      onChange?.(rating);
      onPress?.(rating);
    },
    [disabled, readOnly, onChange, onPress]
  );

  const handlePressIn = useCallback(
    (starIndex, isHalf = false) => {
      if (disabled || readOnly) return;

      const rating = isHalf ? starIndex + 0.5 : starIndex + 1;
      setHoverValue(rating);
      setIsHovering(true);
      onHover?.(rating);
    },
    [disabled, readOnly, onHover]
  );

  const handlePressOut = useCallback(() => {
    if (disabled || readOnly) return;

    setHoverValue(null);
    setIsHovering(false);
    onHover?.(null);
  }, [disabled, readOnly, onHover]);

  const displayValue = hoverValue !== null ? hoverValue : value;
  const currentColor = isHovering ? hoverColor : color;

  const renderStar = (index) => {
    const starValue = index + 1;
    const halfStarValue = index + 0.5;

    const isFullyFilled = displayValue >= starValue;
    const isHalfFilled =
      allowHalf && displayValue >= halfStarValue && displayValue < starValue;
    const isEmpty = displayValue < halfStarValue;

    const starColor = isFullyFilled || isHalfFilled ? currentColor : "#d1d5db";
    const iconName = isFullyFilled
      ? "star"
      : isHalfFilled
        ? "star-half"
        : "star-outline";

    if (!readOnly && !disabled) {
      return (
        <TouchableOpacity
          key={index}
          onPress={() => handlePress(index, false)}
          onPressIn={() => handlePressIn(index, false)}
          onPressOut={handlePressOut}
          disabled={disabled || readOnly}
          style={[styles.starButton, starStyle]}
          activeOpacity={0.7}
        >
          <Ionicons name={iconName} size={size} color={starColor} />
        </TouchableOpacity>
      );
    }

    return (
      <View key={index} style={[styles.starContainer, starStyle]}>
        <Ionicons name={iconName} size={size} color={starColor} />
      </View>
    );
  };

  return (
    <View style={[styles.container, style]}>
      <View style={styles.starsContainer}>
        {Array.from({ length: 5 }, (_, index) => renderStar(index))}
      </View>

      {showValue && (
        <Text style={[styles.valueText, textStyle]}>
          {displayValue.toFixed(1)}
        </Text>
      )}
    </View>
  );
};

const styles = createStylesWithDMSans({
  container: {
    flexDirection: "row",
    alignItems: "center",
  },
  starsContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  starButton: {
    padding: 2,
  },
  starContainer: {
    padding: 2,
  },
  valueText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: "500",
    color: "#374151",
  },
});

export default StarRating;
