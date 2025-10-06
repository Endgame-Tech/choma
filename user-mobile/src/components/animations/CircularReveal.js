/**
 * Circular Reveal Animation Component
 * Creates a circular reveal effect from a specified position
 */

import React, { useEffect, useRef } from 'react';
import { View, Animated, Dimensions, StyleSheet, Easing } from 'react-native';

const { width, height } = Dimensions.get('window');

const CircularReveal = ({
  isVisible,
  onAnimationComplete,
  startPosition = { x: width / 2, y: height - 100 }, // Default to search bar area
  color = '#F9B87A',
  duration = 400
}) => {
  const animationValue = useRef(new Animated.Value(0)).current;

  // Calculate the maximum radius needed to cover the entire screen
  const maxRadius = Math.sqrt(
    Math.max(
      startPosition.x * startPosition.x + startPosition.y * startPosition.y,
      (width - startPosition.x) * (width - startPosition.x) + startPosition.y * startPosition.y,
      startPosition.x * startPosition.x + (height - startPosition.y) * (height - startPosition.y),
      (width - startPosition.x) * (width - startPosition.x) + (height - startPosition.y) * (height - startPosition.y)
    )
  );

  useEffect(() => {
    if (isVisible) {
      // Start reveal animation with easing for natural feel
      Animated.timing(animationValue, {
        toValue: 1,
        duration: duration,
        easing: Easing.bezier(0.25, 0.46, 0.45, 0.94), // Smooth easing curve
        useNativeDriver: false, // We need to animate width/height
      }).start(() => {
        onAnimationComplete && onAnimationComplete();
      });
    } else {
      // Reset animation
      animationValue.setValue(0);
    }
  }, [isVisible, animationValue, duration, onAnimationComplete]);

  const animatedStyle = {
    width: animationValue.interpolate({
      inputRange: [0, 1],
      outputRange: [0, maxRadius * 2],
    }),
    height: animationValue.interpolate({
      inputRange: [0, 1],
      outputRange: [0, maxRadius * 2],
    }),
    borderRadius: animationValue.interpolate({
      inputRange: [0, 1],
      outputRange: [0, maxRadius],
    }),
    left: startPosition.x - maxRadius,
    top: startPosition.y - maxRadius,
  };

  if (!isVisible) return null;

  return (
    <View style={styles.container}>
      <Animated.View
        style={[
          styles.circle,
          animatedStyle,
          { backgroundColor: color }
        ]}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
    pointerEvents: 'none',
  },
  circle: {
    position: 'absolute',
  },
});

export default CircularReveal;