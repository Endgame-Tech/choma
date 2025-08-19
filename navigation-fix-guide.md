# 🧭 Navigation Error Fix Guide

## ❌ The Problem
You're getting this error:
```
Do you have a screen named 'Main'?
If you're trying to navigate to a screen in a nested navigator, see https://reactnavigation.org/docs/nesting-navigators#navigating-to-a-screen-in-a-nested-navigator.
```

## ✅ The Solution

### **Root Cause**
The error occurs because some navigation calls are trying to navigate to screens that don't exist in your 'Main' tab navigator.

### **Your Navigation Structure**
```
App Navigator (Stack)
├── Main Navigator (Tabs) 
│   ├── Home ✅
│   ├── Search ✅ 
│   ├── Orders ✅
│   └── Profile ✅
├── MealPlanDetail (Stack Screen)
├── BundleDetail (Stack Screen)
├── Customize (Stack Screen)
└── ... other stack screens
```

### **Fixed Navigation Calls**

#### ❌ Wrong Way:
```javascript
// This is INCORRECT - 'MealPlans' is not a tab
navigation.navigate('Main', { screen: 'MealPlans' })
```

#### ✅ Correct Way:
```javascript
// Navigate to Home tab (where meal plans are displayed)
navigation.navigate('Main', { screen: 'Home' })

// Or use the helper
import { navigateToHome } from '../utils/navigationHelper';
navigateToHome(navigation);
```

## 🛠️ Quick Fixes Applied

### 1. Fixed DeliveryManagementScreen
**File:** `src/screens/delivery/DeliveryManagementScreen.js:327`
- **Before:** `navigation.navigate('Main', { screen: 'MealPlans' })`
- **After:** `navigation.navigate('Main', { screen: 'Home' })`

### 2. Created Navigation Helper
**File:** `src/utils/navigationHelper.js`
- Provides safe navigation functions
- Prevents navigation errors
- Includes validation and error handling

## 🔧 Using the Navigation Helper

### Import the helper:
```javascript
import { 
  navigateToHome,
  navigateToOrders, 
  navigateToProfile,
  navigateToSearch,
  navigationFlows
} from '../utils/navigationHelper';
```

### Use safe navigation:
```javascript
// Navigate to tabs
navigateToHome(navigation);
navigateToOrders(navigation);
navigateToProfile(navigation);
navigateToSearch(navigation);

// Common flows
navigationFlows.goToMealPlans(navigation); // Goes to Home tab
navigationFlows.goToOrdersAfterPurchase(navigation);
navigationFlows.goToMainApp(navigation);
```

## 🔍 Check These Files

If you're still getting the error, check these files for incorrect navigation:

1. **Deep Linking Service** ✅ (Already correct)
   - `src/services/deepLinking.js`

2. **Order Screens** ✅ (Looks correct)
   - `src/screens/dashboard/OrdersScreen.js:225`

3. **Delivery Screens** ✅ (Fixed)
   - `src/screens/delivery/DeliveryManagementScreen.js:327`
   - `src/screens/delivery/DeliveryConfirmScreen.js:57`

## 🚨 Common Navigation Mistakes

### ❌ Don't Do This:
```javascript
// These screens don't exist as tabs
navigation.navigate('Main', { screen: 'MealPlans' });
navigation.navigate('Main', { screen: 'Dashboard' });
navigation.navigate('Main', { screen: 'Settings' });
```

### ✅ Do This Instead:
```javascript
// For meal plans - go to Home tab
navigation.navigate('Main', { screen: 'Home' });

// For dashboard - it's a separate stack screen
navigation.navigate('Dashboard');

// For settings - it's a separate stack screen  
navigation.navigate('Settings');
```

## 🐛 Debugging Navigation Issues

### 1. Check Available Screens
Look at your `AppNavigator.js` to see what screens are actually defined:
- Tab screens are inside the `TabNavigator` 
- Stack screens are direct children of the main `Stack.Navigator`

### 2. Enable Navigation Logging
Add this to see navigation actions:
```javascript
// In App.js or AppNavigator.js
import { NavigationContainer } from '@react-navigation/native';

<NavigationContainer 
  onStateChange={(state) => console.log('Navigation state:', state)}
>
```

### 3. Use Navigation Helper
The helper includes validation and will warn you about invalid navigation attempts.

## ✅ Status: Fixed

The navigation error should be resolved after:
- [x] Fixed `DeliveryManagementScreen.js`
- [x] Created navigation helper
- [x] Identified all navigation calls

Use the navigation helper going forward to prevent these errors!