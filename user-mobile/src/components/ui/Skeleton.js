// src/components/ui/Skeleton.js
import React, { useEffect, useRef } from "react";
import { View, StyleSheet, Animated } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "../../styles/theme";
import { createStylesWithDMSans } from "../../utils/fontUtils";

const Skeleton = ({ width, height, style }) => {
  const { colors } = useTheme();
  const translateX = useRef(new Animated.Value(-width)).current;

  useEffect(() => {
    Animated.loop(
      Animated.timing(translateX, {
        toValue: width,
        useNativeDriver: true,
        duration: 1000,
      })
    ).start();
  }, [width]);

  return (
    <View style={[styles(colors).container, { width, height }, style]}>
      <Animated.View
        style={{
          width: "100%",
          height: "100%",
          transform: [{ translateX: translateX }],
        }}
      >
        <LinearGradient
          style={{ flex: 1 }}
          colors={[colors.cardBackground, colors.border, colors.cardBackground]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
        />
      </Animated.View>
    </View>
  );
};

const styles = (colors) =>
  StyleSheet.create({
    container: {
      backgroundColor: colors.cardBackground,
      overflow: "hidden",
      borderRadius: 8,
    },
  });

export default Skeleton;
