import React, { useRef, useState } from 'react';
import { View, Dimensions, PanResponder, Animated } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';

const { width: screenWidth } = Dimensions.get('window');

const SwipeableTabNavigator = ({ children }) => {
  const navigation = useNavigation();
  const route = useRoute();
  
  // Define tab order
  const tabOrder = ['Home', 'Search', 'Orders', 'Profile'];
  const currentIndex = tabOrder.indexOf(route.name);
  
  const [swipeThreshold] = useState(screenWidth * 0.25); // 25% of screen width - more sensitive
  
  // Animation values
  const translateX = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(1)).current;
  
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (evt, gestureState) => {
        // More responsive swipe detection
        const isHorizontal = Math.abs(gestureState.dx) > Math.abs(gestureState.dy * 2);
        const isSignificant = Math.abs(gestureState.dx) > 15;
        
        // Allow swipes from anywhere on screen, but prioritize horizontal movement
        return isHorizontal && isSignificant;
      },
      onPanResponderGrant: () => {
        // Haptic feedback on swipe start
        try {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        } catch (error) {
          // Haptics not available on this device
        }
      },
      onPanResponderMove: (evt, gestureState) => {
        // Add visual feedback during swipe
        const { dx } = gestureState;
        
        // Limit the translation to reasonable bounds
        const maxTranslation = screenWidth * 0.3;
        const translation = Math.max(-maxTranslation, Math.min(maxTranslation, dx * 0.5));
        
        translateX.setValue(translation);
        
        // Slightly fade during swipe for visual feedback
        const progress = Math.abs(translation) / maxTranslation;
        opacity.setValue(1 - progress * 0.1);
      },
      onPanResponderRelease: (evt, gestureState) => {
        const { dx, vx } = gestureState;
        
        // More lenient swipe detection
        const swipeRight = dx > swipeThreshold || (dx > 60 && vx > 0.2);
        const swipeLeft = dx < -swipeThreshold || (dx < -60 && vx < -0.2);
        
        if (swipeRight && currentIndex > 0) {
          // Animate slide out to the right
          Animated.parallel([
            Animated.timing(translateX, {
              toValue: screenWidth,
              duration: 250,
              useNativeDriver: true,
            }),
            Animated.timing(opacity, {
              toValue: 0,
              duration: 250,
              useNativeDriver: true,
            }),
          ]).start(() => {
            // Navigate after animation
            const previousTab = tabOrder[currentIndex - 1];
            navigation.navigate(previousTab);
            
            // Reset animation values for next screen
            translateX.setValue(-screenWidth);
            opacity.setValue(0);
            
            // Animate in from left
            Animated.parallel([
              Animated.timing(translateX, {
                toValue: 0,
                duration: 250,
                useNativeDriver: true,
              }),
              Animated.timing(opacity, {
                toValue: 1,
                duration: 250,
                useNativeDriver: true,
              }),
            ]).start();
          });
          
          // Success haptic feedback
          try {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          } catch (error) {
            // Haptics not available on this device
          }
        } else if (swipeLeft && currentIndex < tabOrder.length - 1) {
          // Animate slide out to the left
          Animated.parallel([
            Animated.timing(translateX, {
              toValue: -screenWidth,
              duration: 250,
              useNativeDriver: true,
            }),
            Animated.timing(opacity, {
              toValue: 0,
              duration: 250,
              useNativeDriver: true,
            }),
          ]).start(() => {
            // Navigate after animation
            const nextTab = tabOrder[currentIndex + 1];
            navigation.navigate(nextTab);
            
            // Reset animation values for next screen
            translateX.setValue(screenWidth);
            opacity.setValue(0);
            
            // Animate in from right
            Animated.parallel([
              Animated.timing(translateX, {
                toValue: 0,
                duration: 250,
                useNativeDriver: true,
              }),
              Animated.timing(opacity, {
                toValue: 1,
                duration: 250,
                useNativeDriver: true,
              }),
            ]).start();
          });
          
          // Success haptic feedback
          try {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          } catch (error) {
            // Haptics not available on this device
          }
        } else {
          // Reset position if swipe wasn't successful
          Animated.parallel([
            Animated.spring(translateX, {
              toValue: 0,
              useNativeDriver: true,
            }),
            Animated.spring(opacity, {
              toValue: 1,
              useNativeDriver: true,
            }),
          ]).start();
        }
      },
      onPanResponderTerminationRequest: () => true, // Allow other components to handle gestures if needed
    })
  ).current;

  return (
    <View style={{ flex: 1 }} {...panResponder.panHandlers}>
      <Animated.View
        style={{
          flex: 1,
          transform: [{ translateX }],
          opacity,
        }}
      >
        {children}
      </Animated.View>
    </View>
  );
};

export default SwipeableTabNavigator;