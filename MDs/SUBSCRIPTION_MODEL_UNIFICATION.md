# Subscription Model Unification

## Overview

Consolidated `RecurringSubscription` and `Subscription` models into a single unified `Subscription` model to eliminate data fragmentation and improve system consistency.

## Problem Statement

The system had **two separate subscription collections**:

1. **`subscriptions`** - Main subscription model with `mealPlanSnapshot`
2. **`recurringsubscriptions`** - Secondary model used by some controllers

This caused:

- Data inconsistency
- Confusion about which model to use
- Duplicate code and logic
- Chef dashboard showing incorrect data

## Solution

**Merged all fields and methods from `RecurringSubscription` into the unified `Subscription` model.**

## Fields Added to Subscription Model

### 1. Enhanced Delivery Schedule

```javascript
deliverySchedule: {
  timeSlot: { start: String, end: String },
  address: String,
  coordinates: { lat: Number, lng: Number },
  area: String,
  specialInstructions: String
}
```

### 2. Unified Next Delivery Date

```javascript
nextDeliveryDate: Date; // Now available alongside nextDelivery for compatibility
```

### 3. Root-Level Meal Preferences

```javascript
dietaryPreferences: [String];
allergens: [String];
spiceLevel: String; // 'mild', 'medium', 'hot'
portionSize: String; // 'small', 'medium', 'large'
```

### 4. Enhanced Metrics

```javascript
metrics: {
  totalMealsDelivered: Number,
  totalMealsMissed: Number,
  totalMealsSkipped: Number,  // NEW
  averageRating: Number,
  totalRatings: Number,  // NEW
  onTimeDeliveries: Number,  // NEW
  lateDeliveries: Number,  // NEW
  consecutiveDays: Number,
  consecutiveDeliveryDays: Number,  // NEW
  lastDeliveryDate: Date,  // NEW
  customerSatisfactionScore: Number,  // NEW
  totalSpent: Number
}
```

### 5. Comprehensive Skip Tracking

```javascript
skippedDeliveries: [
  {
    date: Date,
    reason: String,
    skippedBy: String, // 'customer', 'chef', 'admin', 'system'
    createdAt: Date,
  },
];
```

### 6. Notification Settings

```javascript
notificationSettings: {
  smsReminders: Boolean,
  whatsappReminders: Boolean,
  emailNotifications: Boolean,
  deliveryUpdates: Boolean,
  reminderMinutesBeforeDelivery: Number
}
```

### 7. Admin Notes

```javascript
adminNotes: [{
  date: Date,
  note: String,
  addedBy: ObjectId (ref: 'Admin'),
  category: String  // 'general', 'complaint', 'compliment', etc.
}]
```

### 8. Enhanced Feedback

```javascript
feedback: [
  {
    date: Date,
    rating: Number,
    comment: String,
    mealPlanId: ObjectId,
    deliveryId: ObjectId, // NEW
    responseToFeedback: String, // NEW
    respondedAt: Date, // NEW
  },
];
```

### 9. Customer ID Compatibility

```javascript
customerId: ObjectId (ref: 'Customer')  // Alias for userId
```

## Methods Added

### Instance Methods

```javascript
// From RecurringSubscription
cancel(reason); // Cancel subscription with reason
skipNextDelivery(reason, skippedBy); // Skip next delivery
calculateNextDeliveryDate(); // Auto-calculate next delivery
addFeedback(rating, comment, deliveryId); // Add customer feedback
updateDeliveryMetrics(delivered, onTime); // Update delivery stats
```

### Static Methods

```javascript
findActiveSubscriptions(filters); // Find active subscriptions
findDueForDelivery(date); // Find subscriptions due today
findByArea(area); // Find subscriptions in specific area
```

### Virtuals

```javascript
subscriptionDuration; // Total subscription duration in days
daysActive; // Days since subscription started
completionRate; // Percentage of meals successfully delivered
```

## New Indexes

```javascript
{ status: 1, nextDeliveryDate: 1 }
{ mealPlanId: 1, status: 1 }
{ createdAt: -1 }
{ 'deliverySchedule.area': 1 }
```

## Pre-Save Middleware

### 1. Field Synchronization

- Automatically syncs `userId` ↔ `customerId`
- Syncs `nextDelivery` ↔ `nextDeliveryDate`

### 2. Next Delivery Calculation

- Auto-calculates `nextDeliveryDate` on creation
- Updates based on frequency changes

### 3. Area Extraction

- Extracts area from delivery address automatically
- Populates `deliverySchedule.area` for location-based queries

## Controller Updates

### chefSubscriptionController.js

**Changed:**

```javascript
// Before
const RecurringSubscription = require('../models/RecurringSubscription');
const subscriptions = await RecurringSubscription.find(...)

// After
const Subscription = require('../models/Subscription');
const subscriptions = await Subscription.find(...)
```

**Enhanced Query:**

```javascript
.find({
  _id: { $in: subscriptionIds },
  status: { $in: ['active', 'pending', 'pending_first_delivery'] }
})
.populate('customerId', 'fullName phone email profileImage')
.populate('userId', 'fullName phone email profileImage')  // Both fields
```

**Customer ID Handling:**

```javascript
customerId: subscription.customerId || subscription.userId; // Fallback
```

## Benefits

### 1. **Single Source of Truth**

- One model for all subscription data
- No confusion about which model to use
- Consistent data structure everywhere

### 2. **Better Data Quality**

- `mealPlanSnapshot` contains complete meal schedule
- All meal details (title, ingredients, status) in one place
- No need for separate `MealAssignment` queries

### 3. **Improved Performance**

- Fewer database queries
- Better indexing for location-based searches
- Optimized population paths

### 4. **Enhanced Tracking**

- Comprehensive skip tracking
- Detailed delivery metrics
- Admin notes for customer management

### 5. **Flexibility**

- Notification preferences per subscription
- Customizable meal preferences
- Area-based filtering and assignment

## Migration Notes

### Backward Compatibility

- `customerId` and `userId` are synced automatically
- `nextDelivery` and `nextDeliveryDate` maintained in parallel
- Both `customization.dietaryPreferences` and root-level `dietaryPreferences` available

### Data Migration

If you have existing data in `recurringsubscriptions` collection, you should:

1. Export data from `recurringsubscriptions`
2. Transform to match unified `Subscription` schema
3. Import into `subscriptions` collection
4. Update `SubscriptionChefAssignment` references if needed

### Testing Checklist

- ✅ Chef dashboard displays subscriptions correctly
- ✅ Meal details show proper titles and ingredients
- ✅ Customer information populates correctly
- ✅ Delivery status tracking works
- ✅ Skip functionality operational
- ✅ Metrics calculation accurate
- ⏳ Weekly meal plan view (needs update)
- ⏳ Batch opportunities detection (needs update)

## Next Steps

1. **Update Remaining Controllers:**

   - `getWeeklyMealPlan` - Update to use Subscription's mealPlanSnapshot
   - `getBatchOpportunities` - Query from Subscription instead of MealAssignment

2. **Update Admin Controllers:**

   - Ensure admin assignment creates `SubscriptionChefAssignment` properly
   - Update subscription management to use unified model

3. **Data Migration Script:**

   - Create script to migrate existing `recurringsubscriptions` data
   - Ensure all references updated

4. **Remove Old Model:**
   - After successful migration, deprecate `RecurringSubscription.js`
   - Update all imports across codebase

## Files Modified

- ✅ `/backend/models/Subscription.js` - Added all RecurringSubscription fields
- ✅ `/backend/controllers/chefSubscriptionController.js` - Updated to use Subscription
- ⏳ Other controllers referencing RecurringSubscription (need updates)

---

**Status:** Core unification complete. Testing in progress.
**Date:** October 29, 2025
