/**
 * Custom Navigation Transitions
 * Following React Navigation 6+ best practices and official documentation
 * Using CardStyleInterpolators for optimal performance
 */

import { Easing } from "react-native";

// Animation configurations based on official documentation
export const TransitionSpecs = {
  // iOS-style spring animation for natural feel
  spring: {
    animation: "spring",
    config: {
      stiffness: 300,
      damping: 30,
      mass: 1,
      overshootClamping: false,
      restDisplacementThreshold: 0.01,
      restSpeedThreshold: 0.01,
    },
  },

  // Fast timing animation for quick transitions
  timing: {
    animation: "timing",
    config: {
      duration: 250,
      easing: Easing.bezier(0.25, 0.46, 0.45, 0.94), // Custom easing curve
    },
  },

  // Slow timing for special transitions
  slowTiming: {
    animation: "timing",
    config: {
      duration: 400,
      easing: Easing.bezier(0.4, 0.0, 0.2, 1.0), // Material Design easing
    },
  },
};

// Custom CardStyleInterpolators following official patterns
export const CustomCardStyleInterpolators = {
  /**
   * Enhanced horizontal slide with scale and shadow
   * Perfect for main navigation flow (Home -> Tag -> MealPlan)
   */
  forEnhancedHorizontalSlide: ({ current, next, layouts }) => {
    return {
      cardStyle: {
        transform: [
          {
            translateX: current.progress.interpolate({
              inputRange: [0, 1],
              outputRange: [layouts.screen.width, 0],
              extrapolate: "clamp",
            }),
          },
          {
            // Subtle scale animation for depth
            scale: current.progress.interpolate({
              inputRange: [0, 0.5, 1],
              outputRange: [0.9, 0.95, 1],
              extrapolate: "clamp",
            }),
          },
        ],
        opacity: current.progress.interpolate({
          inputRange: [0, 0.3, 1],
          outputRange: [0, 0.5, 1],
          extrapolate: "clamp",
        }),
      },
      overlayStyle: {
        opacity: current.progress.interpolate({
          inputRange: [0, 1],
          outputRange: [0, 0.2],
          extrapolate: "clamp",
        }),
        backgroundColor: "black",
      },
    };
  },

  /**
   * Fade transition for modal-style screens
   * Perfect for overlays and secondary screens
   */
  forFade: ({ current }) => {
    return {
      cardStyle: {
        opacity: current.progress.interpolate({
          inputRange: [0, 1],
          outputRange: [0, 1],
          extrapolate: "clamp",
        }),
      },
    };
  },

  /**
   * Modal slide from bottom
   * Perfect for sheets, forms, and settings
   */
  forModalSlideFromBottom: ({ current, layouts }) => {
    return {
      cardStyle: {
        transform: [
          {
            translateY: current.progress.interpolate({
              inputRange: [0, 1],
              outputRange: [layouts.screen.height, 0],
              extrapolate: "clamp",
            }),
          },
        ],
      },
      overlayStyle: {
        opacity: current.progress.interpolate({
          inputRange: [0, 1],
          outputRange: [0, 0.4],
          extrapolate: "clamp",
        }),
        backgroundColor: "black",
      },
    };
  },

  /**
   * Circular reveal animation
   * Perfect for image-focused screens matching your circular carousel
   */
  forCircularReveal: ({ current, layouts }) => {
    return {
      cardStyle: {
        transform: [
          {
            scale: current.progress.interpolate({
              inputRange: [0, 0.7, 1],
              outputRange: [0.1, 0.8, 1],
              extrapolate: "clamp",
            }),
          },
        ],
        opacity: current.progress.interpolate({
          inputRange: [0, 0.5, 1],
          outputRange: [0, 0.7, 1],
          extrapolate: "clamp",
        }),
        borderRadius: current.progress.interpolate({
          inputRange: [0, 0.7, 1],
          outputRange: [layouts.screen.width / 2, 40, 0],
          extrapolate: "clamp",
        }),
      },
      overlayStyle: {
        opacity: current.progress.interpolate({
          inputRange: [0, 1],
          outputRange: [0, 0.3],
          extrapolate: "clamp",
        }),
        backgroundColor: "#F7AE1A", // Use primary color for consistency
      },
    };
  },

  /**
   * Scale from center
   * Perfect for quick popups and alerts
   */
  forScaleFromCenter: ({ current }) => {
    return {
      cardStyle: {
        transform: [
          {
            scale: current.progress.interpolate({
              inputRange: [0, 1],
              outputRange: [0.8, 1],
              extrapolate: "clamp",
            }),
          },
        ],
        opacity: current.progress.interpolate({
          inputRange: [0, 1],
          outputRange: [0, 1],
          extrapolate: "clamp",
        }),
      },
      overlayStyle: {
        opacity: current.progress.interpolate({
          inputRange: [0, 1],
          outputRange: [0, 0.5],
          extrapolate: "clamp",
        }),
        backgroundColor: "black",
      },
    };
  },

  /**
   * Parallax slide for depth effect
   * Perfect for hierarchical navigation
   */
  forParallaxSlide: ({ current, next, layouts }) => {
    return {
      cardStyle: {
        transform: [
          {
            translateX: current.progress.interpolate({
              inputRange: [0, 1],
              outputRange: [layouts.screen.width, 0],
              extrapolate: "clamp",
            }),
          },
        ],
      },
      // Previous screen slides back slowly (parallax effect)
      ...(next && {
        overlayStyle: {
          backgroundColor: "transparent",
        },
        cardStyle: {
          transform: [
            {
              translateX: next.progress.interpolate({
                inputRange: [0, 1],
                outputRange: [0, -layouts.screen.width * 0.3],
                extrapolate: "clamp",
              }),
            },
          ],
          opacity: next.progress.interpolate({
            inputRange: [0, 1],
            outputRange: [1, 0.8],
            extrapolate: "clamp",
          }),
        },
      }),
    };
  },

  /**
   * Circular reveal animation for search
   * Expands from search bar position to reveal the search screen
   */
  forSearchCircularReveal: ({ current, layouts }) => {
    const screenDiagonal = Math.sqrt(
      layouts.screen.width * layouts.screen.width +
        layouts.screen.height * layouts.screen.height
    );

    return {
      cardStyle: {
        transform: [
          {
            scale: current.progress.interpolate({
              inputRange: [0, 0.5, 1],
              outputRange: [0, 0.3, 1],
              extrapolate: "clamp",
            }),
          },
        ],
        opacity: current.progress.interpolate({
          inputRange: [0, 0.3, 1],
          outputRange: [0, 0.8, 1],
          extrapolate: "clamp",
        }),
        // Start reveal from search bar area (bottom of screen, centered)
        transformOrigin: "bottom center",
      },
      overlayStyle: {
        opacity: current.progress.interpolate({
          inputRange: [0, 1],
          outputRange: [0, 0.2],
          extrapolate: "clamp",
        }),
        backgroundColor: "#F7AE1A", // Use primary color for consistency
      },
    };
  },

  /**
   * Slide from top transition (backup)
   * Perfect for search screens and quick access overlays
   */
  forSearchSlideFromTop: ({ current, layouts }) => {
    console.log("🔄 Search transition called with progress:", current.progress);
    return {
      cardStyle: {
        transform: [
          {
            translateY: current.progress.interpolate({
              inputRange: [0, 1],
              outputRange: [-layouts.screen.height, 0],
              extrapolate: "clamp",
            }),
          },
        ],
      },
      overlayStyle: {
        opacity: current.progress.interpolate({
          inputRange: [0, 1],
          outputRange: [0, 0.3],
          extrapolate: "clamp",
        }),
        backgroundColor: "black",
      },
    };
  },
};

// Gesture configurations for different transition types
export const GestureConfigs = {
  default: {
    gestureEnabled: true,
    gestureDirection: "horizontal",
    gestureResponseDistance: 150,
  },

  modal: {
    gestureEnabled: true,
    gestureDirection: "vertical",
    gestureResponseDistance: 200,
  },

  disabled: {
    gestureEnabled: false,
  },
};

// Pre-configured transition sets for different use cases
export const TransitionPresets = {
  // For main app navigation (Home -> Tag -> Detail)
  main: {
    transitionSpec: {
      open: TransitionSpecs.spring,
      close: TransitionSpecs.timing,
    },
    cardStyleInterpolator:
      CustomCardStyleInterpolators.forEnhancedHorizontalSlide,
    ...GestureConfigs.default,
  },

  // For modal-style screens
  modal: {
    transitionSpec: {
      open: TransitionSpecs.timing,
      close: TransitionSpecs.timing,
    },
    cardStyleInterpolator: CustomCardStyleInterpolators.forModalSlideFromBottom,
    ...GestureConfigs.modal,
  },

  // For quick overlays
  fade: {
    transitionSpec: {
      open: TransitionSpecs.timing,
      close: { ...TransitionSpecs.timing, config: { duration: 150 } },
    },
    cardStyleInterpolator: CustomCardStyleInterpolators.forFade,
    ...GestureConfigs.default,
  },

  // For image-focused screens (matches your circular carousel)
  circular: {
    transitionSpec: {
      open: TransitionSpecs.slowTiming,
      close: TransitionSpecs.timing,
    },
    cardStyleInterpolator: CustomCardStyleInterpolators.forCircularReveal,
    ...GestureConfigs.default,
  },

  // For popups and alerts
  scale: {
    transitionSpec: {
      open: TransitionSpecs.spring,
      close: TransitionSpecs.timing,
    },
    cardStyleInterpolator: CustomCardStyleInterpolators.forScaleFromCenter,
    ...GestureConfigs.disabled,
  },

  // For hierarchical navigation
  parallax: {
    transitionSpec: {
      open: TransitionSpecs.spring,
      close: TransitionSpecs.timing,
    },
    cardStyleInterpolator: CustomCardStyleInterpolators.forParallaxSlide,
    ...GestureConfigs.default,
  },

  // For search screens sliding from top
  slideFromTop: {
    transitionSpec: {
      open: TransitionSpecs.timing,
      close: { ...TransitionSpecs.timing, config: { duration: 200 } },
    },
    cardStyleInterpolator: CustomCardStyleInterpolators.forSearchSlideFromTop,
    gestureEnabled: true,
    gestureDirection: "vertical",
    gestureResponseDistance: 200,
  },

  // For search screens with circular reveal
  circularReveal: {
    transitionSpec: {
      open: {
        animation: "timing",
        config: {
          duration: 400,
          easing: Easing.bezier(0.4, 0.0, 0.2, 1.0), // Material Design easing
        },
      },
      close: {
        animation: "timing",
        config: {
          duration: 300,
          easing: Easing.bezier(0.25, 0.46, 0.45, 0.94),
        },
      },
    },
    cardStyleInterpolator: CustomCardStyleInterpolators.forSearchCircularReveal,
    gestureEnabled: true,
    gestureDirection: "vertical",
    gestureResponseDistance: 150,
  },
};

// Screen-specific transition recommendations
export const ScreenTransitions = {
  // Main navigation flow
  Home: TransitionPresets.main,
  TagScreen: TransitionPresets.circular, // Matches your circular carousel theme
  MealPlanDetail: TransitionPresets.main,

  // Modal-style screens
  Settings: TransitionPresets.modal,
  Profile: TransitionPresets.modal,
  Wallet: TransitionPresets.modal,
  AddMoneyScreen: TransitionPresets.modal,
  AddCardScreen: TransitionPresets.modal,

  // Quick overlays
  Search: TransitionPresets.circularReveal,
  Notifications: TransitionPresets.fade,

  // Hierarchical screens
  Orders: TransitionPresets.parallax,
  OrderDetail: TransitionPresets.main,

  // Special screens
  Payment: TransitionPresets.scale,
  Checkout: TransitionPresets.modal,
  SubscriptionSuccess: TransitionPresets.scale,

  // Tracking screens
  TrackingScreen: TransitionPresets.main,
  MapTracking: TransitionPresets.fade,
  EnhancedTracking: TransitionPresets.main,

  // Additional modal screens
  AddMoneyScreen: TransitionPresets.modal,
  AddCardScreen: TransitionPresets.modal,
};
