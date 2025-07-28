// src/utils/constants.js - Simplified for MVP
import { Platform } from 'react-native';

// App Constants for MVP (No backend required initially)
export const APP_CONFIG = {
  // App Info
  APP_NAME: 'MyChef',
  VERSION: '1.0.0',
  
  // For future backend integration
  API_BASE_URL: __DEV__ 
    ? (Platform.OS === 'android' ? 'http://192.168.236.28:5001/api' : 'http://localhost:5001/api')
    : 'https://your-production-api.com/api',
  
  // Payment Configuration
  PAYSTACK_PUBLIC_KEY: __DEV__
    ? 'pk_test_c90af10dcc748a6c4e3cf481230abadd819037c1' // Test key
    : 'pk_live_your_live_public_key_here', // Live key for production
  
  // App Settings
  CURRENCY: 'NGN',
  CURRENCY_SYMBOL: '₦',
  TAX_RATE: 0.1, // 10%
  FREE_DELIVERY_THRESHOLD: 10000, // Free delivery above ₦10,000
  
  // Demo Mode Settings (for MVP testing)
  DEMO_MODE: false,
  USE_MOCK_DATA: false,
};

// Meal Plan Types
export const MEAL_PLAN_TYPES = {
  FITFUEL: {
    id: 'fitfuel',
    name: 'FitFuel',
    description: 'High-protein meals for fitness enthusiasts',
    basePrice: 15000,
    mealsPerWeek: 21,
    targetAudience: 'Fitness',
    color: ['#FF6B6B', '#FF8E53'],
    icon: 'fitness',
  },
  RECHARGE: {
    id: 'recharge',
    name: 'Recharge',
    description: 'Quick, nutritious meals for busy professionals',
    basePrice: 12000,
    mealsPerWeek: 14,
    targetAudience: 'Professional',
    color: ['#4ECDC4', '#44A08D'],
    icon: 'business',
  },
  HEALTHYFAM: {
    id: 'healthyfam',
    name: 'HealthyFam',
    description: 'Family-sized healthy meal portions',
    basePrice: 25000,
    mealsPerWeek: 42,
    targetAudience: 'Family',
    color: ['#A8E6CF', '#88D8A3'],
    icon: 'people',
  },
  WELLNESSPACK: {
    id: 'wellnesspack',
    name: 'WellnessPack',
    description: 'Specially curated for health-conscious individuals',
    basePrice: 18000,
    mealsPerWeek: 21,
    targetAudience: 'Wellness',
    color: ['#FFB347', '#FF8C42'],
    icon: 'leaf',
  },
};

// Order Statuses
export const ORDER_STATUSES = {
  PENDING: 'pending',
  CONFIRMED: 'confirmed',
  PREPARING: 'preparing',
  READY: 'ready',
  DELIVERING: 'delivering',
  DELIVERED: 'delivered',
  CANCELLED: 'cancelled'
};

// Subscription Frequencies
export const SUBSCRIPTION_FREQUENCIES = {
  DAILY: { value: 'daily', label: 'Daily (1x/day)', multiplier: 1 },
  TWICE_DAILY: { value: 'twice_daily', label: 'Twice Daily (2x/day)', multiplier: 2 },
  THRICE_DAILY: { value: 'thrice_daily', label: 'Thrice Daily (3x/day)', multiplier: 3 },
};

// Subscription Durations
export const SUBSCRIPTION_DURATIONS = {
  WEEKLY: { value: 'weekly', label: 'Weekly', multiplier: 1 },
  MONTHLY: { value: 'monthly', label: 'Monthly', multiplier: 4, savings: '15% off' },
};

// Payment Methods
export const PAYMENT_METHODS = {
  CARD: 'card',
  BANK_TRANSFER: 'bank_transfer',
  CASH_ON_DELIVERY: 'cash_on_delivery',
  USSD: 'ussd'
};

// Delivery Time Slots
export const DELIVERY_SLOTS = [
  { label: 'Morning (8AM - 12PM)', value: 'morning' },
  { label: 'Afternoon (12PM - 4PM)', value: 'afternoon' },
  { label: 'Evening (4PM - 8PM)', value: 'evening' }
];

// App theme colors
export const COLORS = {
  primary: '#4ECDC4',
  secondary: '#45B7AF',
  accent: '#96CEB4',
  background: '#FFFFFF',
  surface: '#F8F9FA',
  text: '#333333',
  textSecondary: '#666666',
  error: '#e17055',
  success: '#00b894',
  warning: '#fdcb6e',
  info: '#74b9ff'
};

// Demo Users (for testing)
export const DEMO_USERS = [
  {
    email: 'demo@MyChef.ng',
    password: 'password123',
    name: 'Demo User',
    phone: '+234 800 000 0000'
  },
  {
    email: 'admin@MyChef.ng',
    password: 'admin123',
    name: 'Admin User',
    phone: '+234 800 000 0001'
  },
  {
    email: 'test@MyChef.ng',
    password: 'test123',
    name: 'Test User',
    phone: '+234 800 000 0002'
  }
];

// Mock meal plans data (for MVP testing)
export const MOCK_MEAL_PLANS = [
  {
    ...MEAL_PLAN_TYPES.FITFUEL,
    image: 'https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=400&h=300&fit=crop',
    isBookmarked: true,
    tag: 'Most Popular',
    features: ['25g+ protein per meal', 'Post-workout nutrition', 'Muscle building focus'],
    rating: 4.9,
  },
  {
    ...MEAL_PLAN_TYPES.RECHARGE,
    image: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400&h=300&fit=crop',
    isBookmarked: false,
    tag: 'Best Value',
    features: ['Ready in 3 minutes', 'Balanced nutrition', 'Energy boosting'],
    rating: 4.8,
  },
  {
    ...MEAL_PLAN_TYPES.HEALTHYFAM,
    image: 'https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=400&h=300&fit=crop',
    isBookmarked: false,
    tag: 'Family Size',
    features: ['Serves 4-6 people', 'Kid-friendly options', 'Family nutrition'],
    rating: 4.7,
  },
  {
    ...MEAL_PLAN_TYPES.WELLNESSPACK,
    image: 'https://images.unsplash.com/photo-1511690743698-d9d85f2fbf38?w=400&h=300&fit=crop',
    isBookmarked: true,
    tag: 'Premium',
    features: ['Organic ingredients', 'Anti-inflammatory', 'Superfood rich'],
    rating: 4.9,
  },
];

export default {
  APP_CONFIG,
  MEAL_PLAN_TYPES,
  ORDER_STATUSES,
  SUBSCRIPTION_FREQUENCIES,
  SUBSCRIPTION_DURATIONS,
  PAYMENT_METHODS,
  DELIVERY_SLOTS,
  COLORS,
  DEMO_USERS,
  MOCK_MEAL_PLANS,
};