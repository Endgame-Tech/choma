/**
 * Performance Optimizations for Custom Transitions
 * Following React Navigation and Reanimated best practices
 */

import { Platform, LayoutAnimation, UIManager } from 'react-native';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android') {
  UIManager.setLayoutAnimationEnabledExperimental?.(true);
}

/**
 * Hardware acceleration utilities
 */
export const HardwareAcceleration = {
  // Force hardware acceleration for Android views
  getAndroidHardwareProps: () => ({
    renderToHardwareTextureAndroid: true,
    collapsable: false,
  }),

  // iOS acceleration properties
  getIOSOptimizationProps: () => ({
    shouldRasterizeIOS: true,
    rasterizationScale: Platform.select({
      ios: require('react-native').PixelRatio.get(),
      default: 1,
    }),
  }),

  // Cross-platform optimization props
  getOptimizationProps: () => ({
    ...HardwareAcceleration.getAndroidHardwareProps(),
    ...HardwareAcceleration.getIOSOptimizationProps(),
  }),
};

/**
 * Performance monitoring utilities
 */
export const PerformanceMonitor = {
  // Log transition performance
  logTransitionPerformance: (screenName, startTime) => {
    const endTime = Date.now();
    const duration = endTime - startTime;

    if (__DEV__) {
      console.log(`🔄 Transition to ${screenName}: ${duration}ms`);

      // Warn about slow transitions
      if (duration > 300) {
        console.warn(`⚠️ Slow transition detected: ${screenName} (${duration}ms)`);
      }
    }
  },

  // Performance measurement wrapper
  measureTransition: (screenName, transitionFn) => {
    const startTime = Date.now();
    const result = transitionFn();

    // Use requestAnimationFrame to measure after transition completes
    requestAnimationFrame(() => {
      PerformanceMonitor.logTransitionPerformance(screenName, startTime);
    });

    return result;
  },
};

/**
 * Native driver configurations
 * Following official React Navigation documentation
 */
export const NativeDriverConfig = {
  // Use native driver for transform animations
  transform: {
    useNativeDriver: true,
    enableNativeDriver: true,
  },

  // Use native driver for opacity animations
  opacity: {
    useNativeDriver: true,
    enableNativeDriver: true,
  },

  // JavaScript driver for layout properties (width, height, etc.)
  layout: {
    useNativeDriver: false,
    enableNativeDriver: false,
  },
};

/**
 * Memory optimization utilities
 */
export const MemoryOptimizations = {
  // Cleanup function for screen unmount
  cleanup: () => {
    // Clear any animation timers
    // Release heavy resources
    if (__DEV__) {
      console.log('🧹 Cleaning up transition resources');
    }
  },

  // Image optimization for transitions
  getImageOptimizationProps: () => ({
    // Reduce memory usage during transitions
    fadeDuration: Platform.OS === 'android' ? 200 : 0,
    progressiveRenderingEnabled: Platform.OS === 'android',
    ...(Platform.OS === 'android' && {
      cache: 'force-cache',
    }),
  }),
};

/**
 * Gesture optimization configurations
 */
export const GestureOptimizations = {
  // High-performance gesture config
  highPerformance: {
    gestureVelocityImpact: 0.3,
    gestureResponseDistance: 100,
    gestureDirection: 'horizontal',
  },

  // Reduced performance for complex screens
  standard: {
    gestureVelocityImpact: 0.5,
    gestureResponseDistance: 150,
    gestureDirection: 'horizontal',
  },

  // Minimal gestures for heavy screens
  minimal: {
    gestureVelocityImpact: 0.7,
    gestureResponseDistance: 200,
    gestureDirection: 'horizontal',
  },
};

/**
 * Screen-specific performance configs
 */
export const ScreenPerformanceConfigs = {
  // High-performance screens (lightweight)
  light: {
    ...GestureOptimizations.highPerformance,
    ...NativeDriverConfig.transform,
    removeClippedSubviews: true,
  },

  // Standard performance screens
  standard: {
    ...GestureOptimizations.standard,
    ...NativeDriverConfig.transform,
    removeClippedSubviews: false,
  },

  // Heavy screens (complex UI)
  heavy: {
    ...GestureOptimizations.minimal,
    ...NativeDriverConfig.layout,
    removeClippedSubviews: true,
    // Reduce animation frequency
    lazy: true,
  },
};

/**
 * Transition performance presets
 */
export const PerformancePresets = {
  // For screens with simple UI (Search, Notifications)
  fast: {
    ...ScreenPerformanceConfigs.light,
    transitionSpec: {
      open: {
        animation: 'timing',
        config: {
          duration: 200,
          useNativeDriver: true,
        },
      },
      close: {
        animation: 'timing',
        config: {
          duration: 150,
          useNativeDriver: true,
        },
      },
    },
  },

  // For screens with moderate complexity (Home, Profile)
  balanced: {
    ...ScreenPerformanceConfigs.standard,
    transitionSpec: {
      open: {
        animation: 'spring',
        config: {
          stiffness: 300,
          damping: 30,
          mass: 1,
          useNativeDriver: true,
        },
      },
      close: {
        animation: 'timing',
        config: {
          duration: 250,
          useNativeDriver: true,
        },
      },
    },
  },

  // For complex screens (TagScreen with carousel, MealPlanDetail)
  smooth: {
    ...ScreenPerformanceConfigs.heavy,
    transitionSpec: {
      open: {
        animation: 'spring',
        config: {
          stiffness: 200,
          damping: 25,
          mass: 1,
          useNativeDriver: false, // Some complex animations may need JS driver
        },
      },
      close: {
        animation: 'timing',
        config: {
          duration: 300,
          useNativeDriver: true,
        },
      },
    },
  },
};

/**
 * Development helpers
 */
export const DevHelpers = {
  // Enable performance debugging in development
  enablePerformanceDebugging: () => {
    if (__DEV__) {
      // Enable Reanimated performance monitoring
      if (global._setGlobalConsole) {
        global._setGlobalConsole({
          log: (...args) => {
            if (args[0]?.includes?.('Reanimated')) {
              console.log('🔄 Reanimated:', ...args);
            }
          },
        });
      }
    }
  },

  // Log memory usage
  logMemoryUsage: () => {
    if (__DEV__ && global.performance?.memory) {
      const memory = global.performance.memory;
      console.log('📊 Memory Usage:', {
        used: Math.round(memory.usedJSHeapSize / 1048576) + ' MB',
        total: Math.round(memory.totalJSHeapSize / 1048576) + ' MB',
        limit: Math.round(memory.jsHeapSizeLimit / 1048576) + ' MB',
      });
    }
  },
};

/**
 * Initialize performance optimizations
 */
export const initializePerformanceOptimizations = () => {
  // Enable Android LayoutAnimation
  if (Platform.OS === 'android') {
    UIManager.setLayoutAnimationEnabledExperimental?.(true);
  }

  // Enable development helpers
  if (__DEV__) {
    DevHelpers.enablePerformanceDebugging();
  }

  console.log('🚀 Navigation performance optimizations initialized');
};