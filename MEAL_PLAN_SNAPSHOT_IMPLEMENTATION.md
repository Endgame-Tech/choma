# Meal Plan Snapshot Implementation

## Overview

This document describes the new **Meal Plan Snapshot** feature that has been implemented in the Choma meal subscription system. This feature captures a complete snapshot of meal plan data at the time of subscription, ensuring data consistency even if the original meal plan is modified later.

## Problem Solved

### Before Implementation

- Subscription data relied on live queries to meal plans
- If a meal plan was modified, all existing subscriptions would reflect those changes
- Historical pricing, nutritional info, and meal details could be lost
- Performance issues from multiple database queries to construct subscription views
- No way to preserve the exact meal plan details at subscription time

### After Implementation

- Complete meal plan data is captured at subscription time
- Subscriptions maintain their original meal plan details even if the base plan changes
- Single database query to fetch all subscription data
- Better performance and data integrity
- Historical accuracy for pricing disputes, nutritional tracking, and user expectations

---

## Architecture

### 1. Database Schema (`backend/models/Subscription.js`)

Added a new `mealPlanSnapshot` field to the Subscription model with comprehensive meal plan data:

```javascript
mealPlanSnapshot: {
  // Basic plan information
  planId, planName, planDescription, targetAudience, coverImage, tier,

  // Subscription period
  startDate, endDate, durationWeeks,

  // Complete meal schedule (array of meal slots)
  mealSchedule: [{
    assignmentId, weekNumber, dayOfWeek, dayName, mealTime,
    customTitle, customDescription, imageUrl,

    // Individual meals in this slot
    meals: [{
      mealId, name, image, category,
      nutrition: { calories, protein, carbs, fat, fiber, sugar, weight },
      pricing: { cookingCosts, packaging, platformFee, totalPrice, chefEarnings, chomaEarnings },
      dietaryTags, healthGoals, allergens, ingredients, detailedIngredients,
      preparationTime, complexityLevel, preparationMethod, glycemicIndex,
      customizationOptions
    }],

    // Delivery tracking
    scheduledDeliveryDate, deliveryStatus, deliveredAt, skippedReason, notes
  }],

  // Pre-calculated statistics
  stats: {
    totalMeals, totalMealSlots, mealsPerWeek, totalDays, daysWithMeals,
    totalNutrition, avgNutritionPerMeal, avgNutritionPerDay,
    mealTypeDistribution, dietaryDistribution, complexityDistribution
  },

  // Pricing snapshot
  pricing: {
    basePlanPrice, totalMealsCost, frequencyMultiplier, durationMultiplier, subtotal,
    discountApplied, totalPrice, pricePerMeal, pricePerWeek,
    totalChefEarnings, totalChomaEarnings
  },

  // Additional metadata
  features, allergensSummary,
  snapshotCreatedAt, lastSyncedAt, isCustomized
}
```

**File:** `backend/models/Subscription.js` (lines 228-435)

---

### 2. Service Layer (`backend/services/mealPlanSnapshotService.js`)

Created a dedicated service for snapshot operations:

#### Main Functions

**`compileMealPlanSnapshot(mealPlanId, userId, startDate, endDate, selectedMealTypes, discountInfo, pricingOverrides)`**

- Fetches meal plan and all assignments
- Compiles complete meal details with nutrition and pricing
- Calculates aggregated statistics
- Returns comprehensive snapshot object
- **Use:** Called during subscription creation

**`resyncMealPlanSnapshot(existingSnapshot, mealPlanId)`**

- Re-syncs a snapshot with latest meal plan data
- Preserves user customizations and pricing
- Updates `lastSyncedAt` timestamp
- **Use:** For updating subscriptions that haven't started yet

**`updateMealSlotDeliveryStatus(snapshot, weekNumber, dayOfWeek, mealTime, status, deliveredAt)`**

- Updates delivery status for specific meal slots
- Tracks delivery completion
- **Use:** During order fulfillment

**File:** `backend/services/mealPlanSnapshotService.js` (new file, 447 lines)

---

### 3. Controller Integration (`backend/controllers/subscriptionController.js`)

Modified `createSubscription` endpoint to compile and save snapshots:

```javascript
// Before creating subscription
const mealPlanSnapshot = await compileMealPlanSnapshot(
  mealPlan,
  req.user.id,
  subscriptionStartDate,
  tentativeEndDate,
  selectedMealTypes,
  discountInfo,
  pricingOverrides
);

// Add to subscription data
subscriptionData.mealPlanSnapshot = mealPlanSnapshot;

// Create subscription
const subscription = await Subscription.create(subscriptionData);
```

**File:** `backend/controllers/subscriptionController.js` (lines 218-255)

---

### 4. Migration Script (`backend/scripts/migrateMealPlanSnapshots.js`)

Created a script to backfill snapshots for existing subscriptions:

#### Features

- Processes subscriptions without snapshots
- Dry-run mode for testing (`--dry-run`)
- Limit processing (`--limit=N`)
- Status filtering (`--status=active`)
- Progress tracking and error reporting

#### Usage

```bash
# Dry run (preview changes)
node scripts/migrateMealPlanSnapshots.js --dry-run

# Process first 10 subscriptions (testing)
node scripts/migrateMealPlanSnapshots.js --limit=10

# Process only active subscriptions
node scripts/migrateMealPlanSnapshots.js --status=active

# Full migration
node scripts/migrateMealPlanSnapshots.js
```

**File:** `backend/scripts/migrateMealPlanSnapshots.js` (new file, 219 lines)

---

## Benefits

### 1. **Data Integrity**

- ✅ Subscriptions preserve exact meal plan state at subscription time
- ✅ Changes to base meal plans don't affect existing subscriptions
- ✅ Historical accuracy for pricing, nutrition, and meal details

### 2. **Performance**

- ✅ Single database query instead of multiple joins
- ✅ Pre-calculated statistics (nutrition, pricing, distribution)
- ✅ Faster frontend rendering

### 3. **Business Value**

- ✅ Accurate billing and dispute resolution
- ✅ Better analytics and reporting
- ✅ User expectations management (they see exactly what they paid for)
- ✅ Chef/driver earnings tracking

### 4. **Developer Experience**

- ✅ Simpler frontend data consumption
- ✅ Complete data in one field
- ✅ Reduced prop drilling
- ✅ Type-safe data structures

---

## Frontend Integration Guide

### Accessing Snapshot Data

Instead of fetching meal plan details separately, you can now use the snapshot:

```javascript
// OLD WAY (multiple queries, potential inconsistency)
const subscription = await api.getSubscription(id);
const mealPlan = await api.getMealPlan(subscription.mealPlanId);
const assignments = await api.getMealAssignments(subscription.mealPlanId);
// ... more queries for nutrition, pricing, etc.

// NEW WAY (single query, guaranteed consistency)
const subscription = await api.getSubscription(id);
const snapshot = subscription.mealPlanSnapshot;

// All data available immediately:
console.log(snapshot.planName);  // "FitFuel Pro"
console.log(snapshot.stats.totalMeals);  // 42
console.log(snapshot.pricing.totalPrice);  // 45000
console.log(snapshot.mealSchedule);  // Complete meal schedule
```

### Example: Displaying Subscription Details

```javascript
// In MyPlanScreen.js or similar
const { mealPlanSnapshot } = subscription;

return (
  <View>
    <Text>{mealPlanSnapshot.planName}</Text>
    <Text>{mealPlanSnapshot.planDescription}</Text>
    <Image source={{ uri: mealPlanSnapshot.coverImage }} />

    {/* Nutrition Summary */}
    <Text>Avg Calories/Day: {mealPlanSnapshot.stats.avgNutritionPerDay.calories}</Text>
    <Text>Avg Protein/Day: {mealPlanSnapshot.stats.avgNutritionPerDay.protein}g</Text>

    {/* Pricing */}
    <Text>Total: ₦{mealPlanSnapshot.pricing.totalPrice.toLocaleString()}</Text>
    <Text>Per Meal: ₦{mealPlanSnapshot.pricing.pricePerMeal.toLocaleString()}</Text>

    {/* Meal Schedule */}
    {mealPlanSnapshot.mealSchedule.map(slot => (
      <MealSlot
        key={`${slot.weekNumber}-${slot.dayOfWeek}-${slot.mealTime}`}
        weekNumber={slot.weekNumber}
        dayName={slot.dayName}
        mealTime={slot.mealTime}
        title={slot.customTitle}
        meals={slot.meals}
        deliveryStatus={slot.deliveryStatus}
        scheduledDate={slot.scheduledDeliveryDate}
      />
    ))}
  </View>
);
```

### Example: Nutrition Tracking

```javascript
// Calculate user's daily nutrition from snapshot
const getDailyNutrition = (snapshot, dayNumber) => {
  const weekNumber = Math.ceil(dayNumber / 7);
  const dayOfWeek = ((dayNumber - 1) % 7) + 1;

  const dayMeals = snapshot.mealSchedule.filter(
    slot => slot.weekNumber === weekNumber && slot.dayOfWeek === dayOfWeek
  );

  const totalNutrition = dayMeals.reduce((acc, slot) => {
    slot.meals.forEach(meal => {
      acc.calories += meal.nutrition.calories;
      acc.protein += meal.nutrition.protein;
      acc.carbs += meal.nutrition.carbs;
      acc.fat += meal.nutrition.fat;
    });
    return acc;
  }, { calories: 0, protein: 0, carbs: 0, fat: 0 });

  return totalNutrition;
};
```

---

## Testing

### 1. Test Snapshot Creation

```bash
# Create a new subscription via API
# Check if mealPlanSnapshot field is populated
```

### 2. Test Migration Script

```bash
# Run dry-run first
node scripts/migrateMealPlanSnapshots.js --dry-run --limit=5

# Review output, then run actual migration
node scripts/migrateMealPlanSnapshots.js --limit=5

# Verify in database
```

### 3. Test Data Consistency

```javascript
// Modify base meal plan
await MealPlan.findByIdAndUpdate(planId, {
  totalPrice: 99999  // Change price
});

// Fetch existing subscription
const subscription = await Subscription.findById(subId);

// Verify snapshot still has original price
console.log(subscription.mealPlanSnapshot.pricing.totalPrice);  // Should be original price
```

---

## Next Steps

### Frontend Updates (TODO)

1. **Update Subscription Screens**
   - `MyPlanScreen.js` - Use snapshot for plan details
   - `AwaitingFirstDeliveryScreen.js` - Display snapshot meal schedule
   - `CustomMealPlanDetailScreen.js` - Show nutrition from snapshot

2. **Update Hooks**
   - `useSubscription.js` - Return snapshot data
   - `useMealPlans.js` - Consider snapshot when displaying plan history

3. **Update Components**
   - Meal cards to handle snapshot meal data
   - Nutrition displays to use snapshot statistics
   - Pricing displays to show snapshot pricing

### Analytics & Reporting

Use snapshots for:

- User nutrition tracking over time
- Historical pricing analysis
- Meal popularity tracking
- Chef performance based on snapshot meal complexity

---

## Maintenance

### When to Re-sync Snapshots

Only re-sync if:

- Subscription hasn't started yet (no deliveries)
- User explicitly requests meal plan update
- Critical bug fix in meal plan (rare)

**Never re-sync:**

- After first delivery
- For active subscriptions
- For completed subscriptions

### Monitoring

Watch for:

- Subscriptions created without snapshots (indicates service failure)
- Snapshot compilation errors in logs
- Large snapshot sizes (>1MB could indicate data bloat)

---

## Technical Decisions

### Why Snapshot Instead of References?

**Considered Alternatives:**

1. **Keep references only** ❌ - Data integrity issues
2. **Version meal plans** ❌ - Complex, requires versioning all related entities
3. **Snapshot approach** ✅ - Simple, reliable, performant

### Why Include Full Meal Details?

- Enables offline-first frontend
- Faster loading times
- Complete historical record
- Supports future analytics

### Storage Impact

**Typical Snapshot Size:**

- ~50-100KB per subscription
- 1000 subscriptions = ~50-100MB
- Negligible compared to images/logs
- Massive performance gain justifies storage cost

---

## Files Modified/Created

### Created

1. `backend/services/mealPlanSnapshotService.js` (447 lines)
2. `backend/scripts/migrateMealPlanSnapshots.js` (219 lines)
3. `MEAL_PLAN_SNAPSHOT_IMPLEMENTATION.md` (this file)

### Modified

1. `backend/models/Subscription.js` (added mealPlanSnapshot field, lines 228-435)
2. `backend/controllers/subscriptionController.js` (integrated snapshot compilation, lines 218-255)

---

## Support & Troubleshooting

### Common Issues

**Issue:** Snapshot not created for new subscription
**Solution:** Check logs for compilation errors, verify meal plan has assignments

**Issue:** Migration script fails
**Solution:** Run with `--dry-run --limit=1` to test single subscription first

**Issue:** Large snapshot size
**Solution:** Normal for plans with many meals. Consider pagination in frontend.

---

## Questions?

Contact the development team or refer to:

- Service file: `backend/services/mealPlanSnapshotService.js`
- Migration script: `backend/scripts/migrateMealPlanSnapshots.js`
- Subscription model: `backend/models/Subscription.js`
