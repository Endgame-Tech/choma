// src/utils/tutorialSteps.js
import { Dimensions } from 'react-native';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

// Updated home screen tutorial with better positioning
export const homeScreenTutorialSteps = [
  {
    x: screenWidth / 2 - 140, // Center horizontally
    y: screenHeight * 0.25,   // Upper portion of screen
    title: '👋 Welcome to Choma!',
    description: 'Your personal meal planning companion. Let\'s show you around!',
  },
  {
    x: 20, // Left side
    y: screenHeight * 0.35,
    title: '🔥 Popular Plans',
    description: 'Check out our most popular meal plans. Swipe horizontally to see more!',
  },
  {
    x: 20, // Left side
    y: screenHeight * 0.55,
    title: '🍽️ All Meal Plans',
    description: 'Browse through our complete collection of healthy meal plans.',
  },
  {
    x: screenWidth / 2 - 140, // Center horizontally
    y: screenHeight * 0.15,   // Top area for navigation tip
    title: '📱 Swipe Navigation',
    description: 'Swipe left and right between screens - just like WhatsApp!',
  },
];

// Better tutorial steps with smart positioning
export const onboardingSteps = [
  {
    title: '👋 Welcome to Choma!',
    description: 'Your personal meal planning companion. Let\'s show you around!',
    x: screenWidth / 2 - 140,
    y: screenHeight * 0.3,
  },
  {
    title: '📱 Swipe Navigation',
    description: 'Swipe left and right to navigate between screens - just like WhatsApp!',
    x: screenWidth / 2 - 140,
    y: screenHeight * 0.2,
  },
  {
    title: '🍽️ Discover Meal Plans',
    description: 'Browse curated meal plans designed by nutrition experts.',
    x: 20,
    y: screenHeight * 0.4,
  },
  {
    title: '🔍 Find Your Perfect Meal',
    description: 'Use search to find meals that match your preferences.',
    x: screenWidth - 300,
    y: screenHeight * 0.4,
  },
  {
    title: '📋 Track Your Orders',
    description: 'Monitor your meal deliveries and subscription status.',
    x: screenWidth / 2 - 140,
    y: screenHeight * 0.6,
  },
  {
    title: '🎉 You\'re All Set!',
    description: 'Start exploring and enjoy your personalized meal planning!',
    x: screenWidth / 2 - 140,
    y: screenHeight * 0.5,
  },
];

// Tutorial steps for meal plan screen (with proper button positioning)
export const mealPlanSteps = [
  {
    title: '🎯 Customize Your Plan',
    description: 'Tap "Customize" to modify meals according to your preferences.',
    x: 20,
    y: screenHeight * 0.7, // Above bottom buttons
  },
  {
    title: '➕ Add to Subscription', 
    description: 'Ready to start? Add this meal plan to your subscription!',
    x: screenWidth - 300,
    y: screenHeight * 0.7, // Above bottom buttons
  },
];

// Helper function to ensure positions are always visible
export const ensureVisiblePosition = (step) => {
  const tooltipWidth = 280;
  const tooltipHeight = 150;
  const margin = 20;
  
  let { x, y } = step;
  
  // Default to center if no position provided
  if (x === undefined) x = screenWidth / 2 - tooltipWidth / 2;
  if (y === undefined) y = screenHeight / 2 - tooltipHeight / 2;
  
  // Keep within bounds
  x = Math.max(margin, Math.min(x, screenWidth - tooltipWidth - margin));
  y = Math.max(margin, Math.min(y, screenHeight - tooltipHeight - margin));
  
  return { ...step, x, y };
};
