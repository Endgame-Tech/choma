import { Platform } from 'react-native';

// API Configuration
export const API_BASE_URL = __DEV__
  ? Platform.OS === "android"
    ? "http://10.226.105.28:5001/api" // Your local development IP
    : "http://10.226.105.28:5001/api" // Your local development IP
  : "https://choma.onrender.com/api"; // Production API URL

// WebSocket Configuration
export const WS_BASE_URL = __DEV__
  ? Platform.OS === "android"
    ? "ws://10.226.105.28:5001" // Your local development IP
    : "ws://10.226.105.28:5001" // Your local development IP  
  : "wss://choma.onrender.com"; // Production WebSocket URL

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