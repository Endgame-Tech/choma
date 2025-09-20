// Navigation Helper - Prevents navigation errors
// This helper ensures proper navigation to nested screens

/**
 * Navigation structure reference:
 * 
 * App (Stack Navigator)
 * ├── Auth (when not authenticated)
 * │   ├── Login
 * │   ├── Signup  
 * │   ├── ForgotPassword
 * │   └── Welcome
 * └── Main (Tab Navigator - when authenticated)
 *     ├── Home (Tab)
 *     ├── Search (Tab)
 *     ├── Orders (Tab)
 *     └── Profile (Tab)
 *     
 * Plus Stack screens:
 * ├── MealPlanDetail
 * ├── BundleDetail
 * ├── Customize
 * ├── Subscription
 * ├── Checkout
 * ├── Payment
 * ├── SubscriptionSuccess
 * ├── SubscriptionDetails
 * ├── Dashboard
 * ├── OrderDetail
 * ├── Notifications
 * ├── NotificationDetail
 * ├── Settings
 * └── HelpCenter
 */

// Available tab names in Main navigator
export const TAB_SCREENS = {
  HOME: 'Home',
  SEARCH: 'Search', 
  ORDERS: 'Orders',
  PROFILE: 'Profile'
};

// Available stack screens (not tabs)
export const STACK_SCREENS = {
  MEAL_PLAN_DETAIL: 'MealPlanDetail',
  BUNDLE_DETAIL: 'BundleDetail',
  CUSTOMIZE: 'Customize',
  SUBSCRIPTION: 'Subscription',
  CHECKOUT: 'Checkout',
  PAYMENT: 'Payment',
  SUBSCRIPTION_SUCCESS: 'SubscriptionSuccess',
  SUBSCRIPTION_DETAILS: 'SubscriptionDetails',
  DASHBOARD: 'Dashboard',
  ORDER_DETAIL: 'OrderDetail',
  NOTIFICATIONS: 'Notifications',
  NOTIFICATION_DETAIL: 'NotificationDetail',
  SETTINGS: 'Settings',
  HELP_CENTER: 'HelpCenter'
};

/**
 * Navigate to a tab within the Main navigator
 * @param {object} navigation - Navigation object
 * @param {string} tabName - Name of the tab (use TAB_SCREENS constants)
 * @param {object} params - Optional parameters
 */
export const navigateToTab = (navigation, tabName, params = {}) => {
  if (!Object.values(TAB_SCREENS).includes(tabName)) {
    console.error(`Invalid tab name: ${tabName}. Valid tabs:`, Object.values(TAB_SCREENS));
    return;
  }
  
  navigation.navigate('Main', { 
    screen: tabName,
    params 
  });
};

/**
 * Navigate to a stack screen (not a tab)
 * @param {object} navigation - Navigation object  
 * @param {string} screenName - Name of the screen (use STACK_SCREENS constants)
 * @param {object} params - Optional parameters
 */
export const navigateToScreen = (navigation, screenName, params = {}) => {
  if (!Object.values(STACK_SCREENS).includes(screenName)) {
    console.error(`Invalid screen name: ${screenName}. Valid screens:`, Object.values(STACK_SCREENS));
    return;
  }
  
  navigation.navigate(screenName, params);
};

/**
 * Navigate to Home tab (most common navigation)
 * @param {object} navigation - Navigation object
 */
export const navigateToHome = (navigation) => {
  navigateToTab(navigation, TAB_SCREENS.HOME);
};

/**
 * Navigate to Orders tab
 * @param {object} navigation - Navigation object
 */
export const navigateToOrders = (navigation) => {
  navigateToTab(navigation, TAB_SCREENS.ORDERS);
};

/**
 * Navigate to Profile tab
 * @param {object} navigation - Navigation object  
 */
export const navigateToProfile = (navigation) => {
  navigateToTab(navigation, TAB_SCREENS.PROFILE);
};

/**
 * Navigate to Search tab
 * @param {object} navigation - Navigation object
 */
export const navigateToSearch = (navigation) => {
  navigateToTab(navigation, TAB_SCREENS.SEARCH);
};

/**
 * Common navigation flows
 */
export const navigationFlows = {
  // After successful order
  goToOrdersAfterPurchase: (navigation) => {
    navigateToTab(navigation, TAB_SCREENS.ORDERS);
  },
  
  // After login/signup
  goToMainApp: (navigation) => {
    navigation.navigate('Main');
  },
  
  // For meal browsing
  goToMealPlans: (navigation) => {
    // Since there's no MealPlans tab, go to Home where meal plans are displayed
    navigateToTab(navigation, TAB_SCREENS.HOME);
  },
  
  // For settings
  goToSettings: (navigation) => {
    navigateToScreen(navigation, STACK_SCREENS.SETTINGS);
  },
  
  // For help
  goToHelp: (navigation) => {
    navigateToScreen(navigation, STACK_SCREENS.HELP_CENTER);
  }
};

/**
 * Reset navigation stack and go to specific tab
 * Useful after login or when you want to clear the navigation history
 */
export const resetToTab = (navigation, tabName) => {
  navigation.reset({
    index: 0,
    routes: [{ 
      name: 'Main', 
      state: {
        routes: [{ name: tabName }],
        index: 0
      }
    }]
  });
};

export default {
  TAB_SCREENS,
  STACK_SCREENS,
  navigateToTab,
  navigateToScreen,
  navigateToHome,
  navigateToOrders,
  navigateToProfile,
  navigateToSearch,
  navigationFlows,
  resetToTab
};