import { Platform } from 'react-native';

// API Configuration
export const API_BASE_URL = __DEV__
  ? Platform.OS === "android"
    ? "http://10.0.2.2:5001/api" // Android emulator localhost
    : "http://localhost:5001/api" // iOS simulator localhost
  : "https://your-production-api.com/api"; // Replace with your production API URL

// WebSocket Configuration
export const WS_BASE_URL = __DEV__
  ? Platform.OS === "android"
    ? "ws://10.0.2.2:5001" // Android emulator localhost
    : "ws://localhost:5001" // iOS simulator localhost  
  : "wss://your-production-api.com"; // Replace with your production WebSocket URL

// API Endpoints
export const API_ENDPOINTS = {
  // Authentication
  AUTH: {
    LOGIN: '/auth/login',
    SIGNUP: '/auth/signup',
    LOGOUT: '/auth/logout',
    PROFILE: '/auth/profile',
    FORGOT_PASSWORD: '/auth/forgot-password',
    RESET_PASSWORD: '/auth/reset-password',
  },

  // Driver Tracking
  DRIVER_TRACKING: {
    WEBSOCKET: '/driver-tracking',
    LOCATION: (orderId) => `/api/driver-tracking/${orderId}/location`,
    DRIVER: (orderId) => `/api/driver-tracking/${orderId}/driver`,
    ETA: (orderId) => `/api/driver-tracking/${orderId}/eta`,
    STATUS: (orderId) => `/api/driver-tracking/${orderId}/status`,
  },

  // Orders
  ORDERS: {
    LIST: '/orders',
    DETAIL: (id) => `/orders/${id}`,
    CREATE: '/orders',
    CANCEL: (id) => `/orders/${id}/cancel`,
    TRACK: (id) => `/orders/${id}/track`,
  },

  // Meal Plans
  MEAL_PLANS: {
    LIST: '/mealplans',
    DETAIL: (id) => `/mealplans/${id}`,
    POPULAR: '/mealplans/popular',
  },

  // Subscriptions
  SUBSCRIPTIONS: {
    LIST: '/subscriptions',
    DETAIL: (id) => `/subscriptions/${id}`,
    CREATE: '/subscriptions',
    UPDATE: (id) => `/subscriptions/${id}`,
    TIMELINE: (id) => `/subscriptions/${id}/timeline`,
  },

  // Notifications
  NOTIFICATIONS: {
    LIST: '/notifications',
    MARK_READ: (id) => `/notifications/${id}/read`,
  },
};

export default {
  API_BASE_URL,
  WS_BASE_URL,
  API_ENDPOINTS,
};