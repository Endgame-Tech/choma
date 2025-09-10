// src/utils/constants.js - Simplified for MVP
import { Platform } from "react-native";

// App Constants for MVP (No backend required initially)
export const APP_CONFIG = {
  // App Info
  APP_NAME: "Choma",
  VERSION: "1.0.0",

  // For future backend integration
  API_BASE_URL: __DEV__
    ? Platform.OS === "android"
      ? "http://10.226.105.28:5001/api" // Adjust to your local IP
      : "http://localhost:5001/api"
    : "https://choma.onrender.com/api",

  // Payment Configuration
  PAYSTACK_PUBLIC_KEY: __DEV__
    ? "pk_test_c90af10dcc748a6c4e3cf481230abadd819037c1" // Test key
    : "pk_live_your_live_public_key_here", // Live key for production

  // App Settings
  CURRENCY: "NGN",
  CURRENCY_SYMBOL: "₦",
  TAX_RATE: 0, // Tax removed as per user request
  FREE_DELIVERY_THRESHOLD: 10000, // Free delivery above ₦10,000

  // Demo Mode Settings (for MVP testing)
  DEMO_MODE: false,
  USE_MOCK_DATA: false,
};

// Order Statuses
export const ORDER_STATUSES = {
  PENDING: "pending",
  CONFIRMED: "confirmed",
  PREPARING: "preparing",
  READY: "ready",
  DELIVERING: "delivering",
  DELIVERED: "delivered",
  CANCELLED: "cancelled",
};

// Subscription Frequencies
export const SUBSCRIPTION_FREQUENCIES = {
  DAILY: { value: "daily", label: "Daily (1x/day)", multiplier: 1 },
  TWICE_DAILY: {
    value: "twice_daily",
    label: "Twice Daily (2x/day)",
    multiplier: 2,
  },
  THRICE_DAILY: {
    value: "thrice_daily",
    label: "Thrice Daily (3x/day)",
    multiplier: 3,
  },
};

// Subscription Durations
export const SUBSCRIPTION_DURATIONS = {
  WEEKLY: { value: "weekly", label: "Weekly", multiplier: 1 },
  MONTHLY: {
    value: "monthly",
    label: "Monthly",
    multiplier: 4,
    savings: "15% off",
  },
};

// Payment Methods
export const PAYMENT_METHODS = {
  CARD: "card",
  BANK_TRANSFER: "bank_transfer",
  CASH_ON_DELIVERY: "cash_on_delivery",
  USSD: "ussd",
};

// Delivery Time Slots
export const DELIVERY_SLOTS = [
  { label: "Morning (8AM - 12PM)", value: "morning" },
  { label: "Afternoon (12PM - 4PM)", value: "afternoon" },
  { label: "Evening (4PM - 8PM)", value: "evening" },
];

// App theme colors
export const COLORS = {
  primary: "#4ECDC4",
  secondary: "#45B7AF",
  accent: "#96CEB4",
  background: "#FFFFFF",
  surface: "#F8F9FA",
  text: "#333333",
  textSecondary: "#666666",
  error: "#e17055",
  success: "#00b894",
  warning: "#fdcb6e",
  info: "#74b9ff",
};

export default {
  APP_CONFIG,
  // MEAL_PLAN_TYPES,
  ORDER_STATUSES,
  SUBSCRIPTION_FREQUENCIES,
  SUBSCRIPTION_DURATIONS,
  PAYMENT_METHODS,
  DELIVERY_SLOTS,
  COLORS,
  // DEMO_USERS,
};
