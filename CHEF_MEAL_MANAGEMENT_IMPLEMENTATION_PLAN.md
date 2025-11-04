# 🍽️ CHEF MEAL MANAGEMENT - COMPLETE IMPLEMENTATION PLAN

**Project:** Choma Food Delivery Platform
**Feature:** Chef Subscription Meal Timeline Management
**Date:** 2025-10-29
**Status:** Ready for Implementation

---

## 📋 TABLE OF CONTENTS

1. [Executive Summary](#executive-summary)]
2. [Current State Analysis](#current-state-analysis)
3. [Requirements & User Stories](#requirements--user-stories)
4. [Technical Architecture](#technical-architecture)
5. [Implementation Phases](#implementation-phases)
6. [API Specifications](#api-specifications)
7. [Database Schema](#database-schema)
8. [Frontend Components](#frontend-components)
9. [Testing Strategy](#testing-strategy)
10. [Deployment Plan](#deployment-plan)

---

## 1. EXECUTIVE SUMMARY

### 🎯 Objective

Enable chefs to manage subscription meal preparation with granular control over individual meal types (breakfast, lunch, dinner) while supporting batch updates for efficiency.

### 🔑 Key Features

- **Individual Meal Type Updates**: Update breakfast, lunch, dinner independently
- **Batch Day Updates**: Update all meal types for a day at once
- **Status Progression Validation**: Enforce workflow (scheduled → preparing → prepared → ready)
- **Delivery Readiness Detection**: Automatically detect when all meals are ready for delivery
- **Day-Based Grouping**: Group meals by day for better chef workflow

### 📊 Success Metrics

- Chef can update individual meal status in < 3 clicks
- Status progression errors prevented 100%
- All meals for a day can be updated in 1 click
- Timeline grouped by day (not linear list)

---

## 2. CURRENT STATE ANALYSIS

### ✅ What Exists

#### **Backend (Node.js/Express)**

| Component | Location | Status | Notes |
|-----------|----------|--------|-------|
| Daily Meals Update API | `backend/routes/chefSubscriptions.js` Line 88-114 | ✅ Working | Updates ALL meals for a date |
| Controller Method | `backend/controllers/chefSubscriptionController.js` Line 866-994 | ✅ Working | `updateDailyMealsStatus()` |
| Data Structure | `backend/models/Subscription.js` | ✅ Correct | `mealPlanSnapshot.mealSchedule[]` |
| Chef Authentication | `backend/middleware/chefAuth.js` | ✅ Working | JWT-based auth |

#### **Frontend (React/TypeScript - Chef App)**

| Component | Location | Status | Notes |
|-----------|----------|--------|-------|
| Timeline View | `chef-react/src/components/SubscriptionTimelineView.tsx` | ✅ Partial | Shows linear timeline |
| Update Modal | `chef-react/src/components/SubscriptionTimelineView.tsx` Line 111-167 | ✅ Working | Status selection modal |
| API Service | `chef-react/src/services/api.ts` | ✅ Working | API client |

#### **User App Reference**

| Component | Location | Purpose |
|-----------|----------|---------|
| Meal Grouping Logic | `user-mobile/src/screens/subscription/MyPlanScreen.js` Line 87-221 | ✅ **Reference Implementation** |

### ❌ What's Missing

| Feature | Priority | Impact |
|---------|----------|--------|
| Individual meal type update API | 🔴 Critical | Can't update breakfast separately from lunch |
| Day-based grouping in UI | 🔴 Critical | Chef sees messy linear list |
| "Update All" button | 🟡 High | Chef must click each meal individually |
| Status progression validation | 🟡 High | Chef can skip from "scheduled" to "delivered" |
| All-ready detection | 🟠 Medium | No trigger for delivery readiness |

---

## 3. REQUIREMENTS & USER STORIES

### 👨‍🍳 User Story 1: Individual Meal Updates

```Tab
AS A chef
I WANT TO update the status of breakfast independently from lunch and dinner
SO THAT I can reflect the actual preparation progress of each meal type
```

**Acceptance Criteria:**

- ✅ Chef can click "Edit" on breakfast and update only breakfast status
- ✅ Updating breakfast does NOT change lunch or dinner status
- ✅ Each meal type shows its own current status badge

---

### 👨‍🍳 User Story 2: Batch Day Updates

```Tab
AS A chef
I WANT TO update all meal types for a day at once
SO THAT I can quickly mark a complete day as ready when all meals are prepared
```

**Acceptance Criteria:**

- ✅ "Update All" button visible for each day
- ✅ Clicking "Update All" updates breakfast, lunch, AND dinner to same status
- ✅ Confirmation modal shows before batch update

---

### 👨‍🍳 User Story 3: Day-Based Grouping

```Tab
AS A chef
I WANT TO see meals grouped by day (Monday: breakfast, lunch, dinner)
SO THAT I can understand my daily workload at a glance
```

**Acceptance Criteria:**

- ✅ Timeline shows "Day 1 - Monday" header
- ✅ All meals for Monday appear under that header
- ✅ Days are sorted chronologically (Week 1 Day 1, Week 1 Day 2, etc.)
- ✅ Meal types sorted within each day (breakfast → lunch → dinner)

---

### 👨‍🍳 User Story 4: Status Progression Rules

```Tab
AS A chef
I CANNOT skip preparation steps in the workflow
SO THAT the system enforces proper meal preparation process
```

**Acceptance Criteria:**

- ✅ Cannot update from "scheduled" to "ready" (must go through "preparing")
- ✅ Error message shown if invalid transition attempted
- ✅ Valid next statuses highlighted in dropdown

**Status Flow:**

```Tab
scheduled → preparing → prepared → ready → [driver: out_for_delivery → delivered]
```

---

### 👨‍🍳 User Story 5: Delivery Readiness

```Tab
AS THE SYSTEM
I WANT TO detect when all meal types for a day are marked "ready"
SO THAT delivery can be triggered (future: notify driver)
```

**Acceptance Criteria:**

- ✅ System checks if ALL meal types (breakfast, lunch, dinner) = "ready"
- ✅ Console log / flag set when all ready
- ✅ (Future) Delivery driver notification triggered

---

## 4. TECHNICAL ARCHITECTURE

### 🏗️ System Architecture

```Tab
┌─────────────────────────────────────────────────────────────┐
│                     CHEF REACT APP                          │
│  ┌────────────────────────────────────────────────────┐    │
│  │  SubscriptionTimelineView.tsx                      │    │
│  │  ┌──────────────────────────────────────────────┐ │    │
│  │  │  groupTimelineByDay()                        │ │    │
│  │  │  - Group by weekNumber + dayOfWeek           │ │    │
│  │  │  - Sort by meal time order                   │ │    │
│  │  └──────────────────────────────────────────────┘ │    │
│  │  ┌──────────────────────────────────────────────┐ │    │
│  │  │  DayCard Component (per day)                 │ │    │
│  │  │  ├─ MealRow (breakfast) [Edit]               │ │    │
│  │  │  ├─ MealRow (lunch)     [Edit]               │ │    │
│  │  │  ├─ MealRow (dinner)    [Edit]               │ │    │
│  │  │  └─ [Update All] Button                      │ │    │
│  │  └──────────────────────────────────────────────┘ │    │
│  └────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
                          │
                          │ API Calls
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                   BACKEND API (Node.js)                     │
│  ┌────────────────────────────────────────────────────┐    │
│  │  chefSubscriptions Routes                          │    │
│  │  ├─ PUT /meal-type/update (NEW - Individual)      │    │
│  │  └─ PUT /daily-meals/update (EXISTING - Batch)    │    │
│  └────────────────────────────────────────────────────┘    │
│  ┌────────────────────────────────────────────────────┐    │
│  │  chefSubscriptionController.js                     │    │
│  │  ├─ updateMealTypeStatus() (NEW)                  │    │
│  │  ├─ updateDailyMealsStatus() (EXISTING)           │    │
│  │  └─ validateStatusTransition() (NEW)              │    │
│  └────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
                          │
                          │ Database Operations
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                   MongoDB Database                          │
│  ┌────────────────────────────────────────────────────┐    │
│  │  Subscription Collection                           │    │
│  │  {                                                 │    │
│  │    mealPlanSnapshot: {                            │    │
│  │      mealSchedule: [                              │    │
│  │        {                                           │    │
│  │          weekNumber: 1,                           │    │
│  │          dayOfWeek: 1,                            │    │
│  │          mealTime: "breakfast",                   │    │
│  │          deliveryStatus: "preparing",             │    │
│  │          scheduledDeliveryDate: "2025-10-28"      │    │
│  │        },                                          │    │
│  │        { ... lunch ... },                         │    │
│  │        { ... dinner ... }                         │    │
│  │      ]                                             │    │
│  │    }                                               │    │
│  │  }                                                 │    │
│  └────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

---

## 5. IMPLEMENTATION PHASES

### 🚀 Phase 1: Backend API Development (Day 1)

#### **Task 1.1: Create Individual Meal Type Update Endpoint**

- **File:** `backend/routes/chefSubscriptions.js`
- **Action:** Add new route
- **Estimated Time:** 30 minutes

```javascript
// NEW ROUTE
router.put(
  "/:subscriptionId/meal-type/update",
  [
    param("subscriptionId").isMongoId().withMessage("Invalid subscription ID"),
    body("date").isISO8601().withMessage("Valid date is required"),
    body("mealType")
      .isIn(["breakfast", "lunch", "dinner"])
      .withMessage("Invalid meal type"),
    body("status")
      .isIn([
        "scheduled",
        "chef_assigned",
        "preparing",
        "prepared",
        "ready",
        "out_for_delivery",
        "delivered",
        "cancelled",
        "skipped",
      ])
      .withMessage("Invalid status"),
    body("notes")
      .optional()
      .isString()
      .trim()
      .isLength({ max: 500 })
      .withMessage("Notes must be a string with max 500 characters"),
  ],
  handleValidationErrors,
  chefSubscriptionController.updateMealTypeStatus
);
```

---

#### **Task 1.2: Implement Controller Method**

- **File:** `backend/controllers/chefSubscriptionController.js`
- **Action:** Add `updateMealTypeStatus()` method
- **Estimated Time:** 1 hour

```javascript
/**
 * Update status for a SPECIFIC meal type on a SPECIFIC day
 * Allows chef to update breakfast, lunch, dinner independently
 */
async updateMealTypeStatus(req, res) {
  try {
    const chefId = req.chef.chefId;
    const { subscriptionId } = req.params;
    const { date, mealType, status, notes } = req.body;

    console.log("🍳 Updating individual meal type:", {
      chefId,
      subscriptionId,
      date,
      mealType,
      status,
    });

    // Validate chef is assigned to this subscription
    const chefAssignment = await SubscriptionChefAssignment.findOne({
      chefId,
      subscriptionId,
      assignmentStatus: "active",
    });

    if (!chefAssignment) {
      return res.status(403).json({
        success: false,
        message: "You are not assigned to this subscription",
      });
    }

    // Get the subscription
    const subscription = await Subscription.findById(subscriptionId);

    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: "Subscription not found",
      });
    }

    if (!subscription.mealPlanSnapshot?.mealSchedule) {
      return res.status(400).json({
        success: false,
        message: "No meal schedule found for this subscription",
      });
    }

    // Parse the target date
    const targetDate = new Date(date);
    targetDate.setHours(0, 0, 0, 0);
    const targetDateStr = targetDate.toISOString().split("T")[0];

    // Find the SPECIFIC meal slot (date + mealType)
    const targetSlot = subscription.mealPlanSnapshot.mealSchedule.find((slot) => {
      if (!slot.scheduledDeliveryDate) return false;

      const slotDate = new Date(slot.scheduledDeliveryDate);
      if (isNaN(slotDate.getTime())) return false;

      slotDate.setHours(0, 0, 0, 0);
      const slotDateStr = slotDate.toISOString().split("T")[0];

      return slotDateStr === targetDateStr && slot.mealTime === mealType;
    });

    if (!targetSlot) {
      return res.status(404).json({
        success: false,
        message: `No ${mealType} meal found for date: ${targetDateStr}`,
      });
    }

    // Validate status transition (prevent skipping steps)
    const currentStatus = targetSlot.deliveryStatus || "scheduled";
    const isValidTransition = this.isValidStatusTransition(currentStatus, status);

    if (!isValidTransition) {
      return res.status(400).json({
        success: false,
        message: `Invalid status transition from "${currentStatus}" to "${status}"`,
        validNextStatuses: this.getValidNextStatuses(currentStatus),
      });
    }

    // Update the slot
    targetSlot.deliveryStatus = status;

    // Update delivered timestamp if status is delivered
    if (status === "delivered") {
      targetSlot.deliveredAt = new Date();
    }

    // Add notes if provided
    if (notes) {
      targetSlot.notes = notes;
    }

    // Save the subscription
    await subscription.save();

    // Check if ALL meals for this day are "ready"
    const allDaySlots = subscription.mealPlanSnapshot.mealSchedule.filter((slot) => {
      if (!slot.scheduledDeliveryDate) return false;
      const slotDate = new Date(slot.scheduledDeliveryDate);
      if (isNaN(slotDate.getTime())) return false;
      slotDate.setHours(0, 0, 0, 0);
      const slotDateStr = slotDate.toISOString().split("T")[0];
      return slotDateStr === targetDateStr;
    });

    const allReady = allDaySlots.every((slot) => slot.deliveryStatus === "ready");

    console.log(`✅ Updated ${mealType} to ${status} for ${targetDateStr}`);
    console.log(`📦 All meals ready for ${targetDateStr}:`, allReady);

    // TODO: In future, notify delivery driver if allReady === true
    if (allReady) {
      console.log("🚚 Ready for delivery notification (feature pending)");
    }

    res.json({
      success: true,
      message: `Successfully updated ${mealType} to ${status}`,
      data: {
        date: targetDateStr,
        mealType,
        status,
        allMealsReady: allReady,
        dayMealStatuses: allDaySlots.map((s) => ({
          mealTime: s.mealTime,
          status: s.deliveryStatus,
        })),
      },
    });
  } catch (error) {
    console.error("❌ Update meal type status error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update meal type status",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
}

/**
 * Validate if a status transition is allowed
 * Prevents chefs from skipping preparation steps
 */
isValidStatusTransition(currentStatus, newStatus) {
  const allowedTransitions = {
    scheduled: ["chef_assigned", "preparing", "cancelled", "skipped"],
    chef_assigned: ["preparing", "cancelled", "skipped"],
    preparing: ["prepared", "ready", "cancelled"],
    prepared: ["ready", "cancelled"],
    ready: ["out_for_delivery", "cancelled"],
    // Driver-controlled statuses (chef cannot set these)
    out_for_delivery: ["delivered", "cancelled"],
    delivered: [], // Final state
    cancelled: [], // Final state
    skipped: [], // Final state
  };

  return allowedTransitions[currentStatus]?.includes(newStatus) || false;
}

/**
 * Get list of valid next statuses for current status
 */
getValidNextStatuses(currentStatus) {
  const allowedTransitions = {
    scheduled: ["chef_assigned", "preparing", "cancelled", "skipped"],
    chef_assigned: ["preparing", "cancelled", "skipped"],
    preparing: ["prepared", "ready", "cancelled"],
    prepared: ["ready", "cancelled"],
    ready: ["out_for_delivery", "cancelled"],
    out_for_delivery: ["delivered", "cancelled"],
    delivered: [],
    cancelled: [],
    skipped: [],
  };

  return allowedTransitions[currentStatus] || [];
}
```

---

#### **Task 1.3: Update Existing Daily Meals Update**

- **File:** `backend/controllers/chefSubscriptionController.js`
- **Action:** Add status validation to existing `updateDailyMealsStatus()` method
- **Estimated Time:** 30 minutes

```javascript
// In updateDailyMealsStatus() method, add validation before Line 930:
// Before: meal.deliveryStatus = status;

// Add validation:
const currentStatus = meal.deliveryStatus || "scheduled";
const isValidTransition = this.isValidStatusTransition(currentStatus, status);

if (!isValidTransition) {
  console.warn(`⚠️ Skipping ${meal.mealTime} - Invalid transition from ${currentStatus} to ${status}`);
  return; // Skip this meal
}

meal.deliveryStatus = status;
```

---

### 🎨 Phase 2: Frontend UI Development (Day 2)

#### **Task 2.1: Create Day Grouping Logic**

- **File:** `chef-react/src/components/SubscriptionTimelineView.tsx`
- **Action:** Add grouping function
- **Estimated Time:** 45 minutes

```typescript
// Add interface for grouped day
interface DayGroup {
  weekNumber: number;
  dayOfWeek: number;
  dayName: string;
  scheduledDate?: string;
  mealSlots: TimelineStep[];
}

// Add grouping function (reference: MyPlanScreen.js lines 87-221)
const groupTimelineByDay = (timeline: TimelineStep[]): DayGroup[] => {
  const grouped: Record<string, DayGroup> = {};

  timeline.forEach((step) => {
    const key = `${step.weekNumber}-${step.dayOfWeek}`;

    if (!grouped[key]) {
      grouped[key] = {
        weekNumber: step.weekNumber,
        dayOfWeek: step.dayOfWeek,
        dayName: step.dayName,
        scheduledDate: step.scheduledDate,
        mealSlots: []
      };
    }

    grouped[key].mealSlots.push(step);
  });

  // Sort meal slots by meal time order (breakfast → lunch → dinner)
  const mealTimeOrder = { breakfast: 1, lunch: 2, dinner: 3 };

  Object.values(grouped).forEach(day => {
    day.mealSlots.sort((a, b) => {
      const timeA = a.mealTime?.toLowerCase() || "";
      const timeB = b.mealTime?.toLowerCase() || "";
      return (mealTimeOrder[timeA] || 999) - (mealTimeOrder[timeB] || 999);
    });
  });

  // Sort days chronologically
  return Object.values(grouped).sort((a, b) => {
    if (a.weekNumber !== b.weekNumber) {
      return a.weekNumber - b.weekNumber;
    }
    return a.dayOfWeek - b.dayOfWeek;
  });
};
```

---

#### **Task 2.2: Update Timeline Rendering**

- **File:** `chef-react/src/components/SubscriptionTimelineView.tsx`
- **Action:** Replace linear timeline with grouped day cards
- **Estimated Time:** 1.5 hours

```tsx
// Replace existing timeline rendering (around line 250+)
const renderTimeline = () => {
  if (!timelineData) return null;

  const groupedTimeline = groupTimelineByDay(timelineData.timeline);

  return (
    <div className="space-y-6">
      {groupedTimeline.map((day) => (
        <DayCard
          key={`${day.weekNumber}-${day.dayOfWeek}`}
          day={day}
          onEditMeal={handleOpenStatusModal}
          onUpdateAll={handleUpdateAllForDay}
        />
      ))}
    </div>
  );
};
```

---

#### **Task 2.3: Create DayCard Component**

- **File:** `chef-react/src/components/SubscriptionTimelineView.tsx`
- **Action:** Add new component
- **Estimated Time:** 1 hour

```tsx
interface DayCardProps {
  day: DayGroup;
  onEditMeal: (meal: TimelineStep) => void;
  onUpdateAll: (day: DayGroup) => void;
}

const DayCard: React.FC<DayCardProps> = ({ day, onEditMeal, onUpdateAll }) => {
  // Check if all meals are same status
  const allStatuses = day.mealSlots.map(s => s.status);
  const allSameStatus = allStatuses.every(s => s === allStatuses[0]);
  const allReady = day.mealSlots.every(s => s.status === 'ready');

  // Get meal type icon
  const getMealIcon = (mealTime: string) => {
    switch (mealTime.toLowerCase()) {
      case 'breakfast':
        return '🍳';
      case 'lunch':
        return '🍱';
      case 'dinner':
        return '🍽️';
      default:
        return '🍴';
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
      {/* Day Header */}
      <div className="bg-gradient-to-r from-orange-500 to-orange-600 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xl font-bold text-white">
              {day.dayName}
            </h3>
            <p className="text-orange-100 text-sm">
              Week {day.weekNumber} • Day {day.dayOfWeek}
            </p>
            {day.scheduledDate && (
              <p className="text-orange-100 text-sm">
                {formatDate(day.scheduledDate)}
              </p>
            )}
          </div>
          {allReady && (
            <div className="bg-green-500 text-white px-3 py-1 rounded-full text-sm font-semibold">
              ✅ Ready for Delivery
            </div>
          )}
        </div>
      </div>

      {/* Meal Slots */}
      <div className="divide-y divide-gray-200 dark:divide-gray-700">
        {day.mealSlots.map((meal) => (
          <div
            key={meal.mealTime}
            className="px-6 py-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4 flex-1">
                {/* Meal Icon */}
                <span className="text-3xl">{getMealIcon(meal.mealTime)}</span>

                {/* Meal Info */}
                <div className="flex-1">
                  <h4 className="font-semibold text-gray-900 dark:text-white capitalize">
                    {meal.mealTime}
                  </h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {meal.mealTitle || 'No title'}
                  </p>
                </div>

                {/* Status Badge */}
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(meal.status)}`}>
                  {meal.status.replace('_', ' ').toUpperCase()}
                </span>

                {/* Edit Button */}
                <button
                  onClick={() => onEditMeal(meal)}
                  className="flex items-center space-x-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
                >
                  <Edit3 size={16} />
                  <span>Edit</span>
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Update All Button */}
      <div className="px-6 py-4 bg-gray-50 dark:bg-gray-900">
        <button
          onClick={() => onUpdateAll(day)}
          className="w-full flex items-center justify-center space-x-2 px-6 py-3 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white rounded-lg font-semibold transition-all transform hover:scale-[1.02]"
        >
          <ChefHat size={20} />
          <span>Update All Meals for {day.dayName}</span>
        </button>
      </div>
    </div>
  );
};
```

---

#### **Task 2.4: Update Individual Meal Status Handler**

- **File:** `chef-react/src/components/SubscriptionTimelineView.tsx`
- **Action:** Update `handleUpdateMealStatus()` to call new API
- **Estimated Time:** 30 minutes

```typescript
const handleUpdateMealStatus = async () => {
  if (!selectedMeal) {
    console.log('No meal selected');
    return;
  }

  // Extract date and meal type
  const mealDate = selectedMeal.scheduledDate;
  if (!mealDate) {
    setError('This meal does not have a scheduled date yet.');
    return;
  }

  const dateOnly = new Date(mealDate).toISOString().split('T')[0];
  const mealType = selectedMeal.mealTime; // breakfast, lunch, or dinner

  console.log('Updating individual meal status:', {
    subscriptionId,
    date: dateOnly,
    mealType,
    newStatus: selectedStatus,
  });

  setUpdating(true);
  try {
    // Call NEW individual update API
    const result = await chefSubscriptionsApi.updateMealTypeStatus(
      subscriptionId,
      dateOnly,
      mealType,
      selectedStatus
    );

    console.log('Update successful:', result);

    // Refresh timeline data
    await fetchTimelineData();
    handleCloseStatusModal();
  } catch (err) {
    console.error('Failed to update meal status:', err);
    setError(err instanceof Error ? err.message : 'Failed to update meal status');
  } finally {
    setUpdating(false);
  }
};
```

---

#### **Task 2.5: Add "Update All" Handler**

- **File:** `chef-react/src/components/SubscriptionTimelineView.tsx`
- **Action:** Add new handler for batch updates
- **Estimated Time:** 30 minutes

```typescript
const [updateAllModalOpen, setUpdateAllModalOpen] = useState(false);
const [selectedDay, setSelectedDay] = useState<DayGroup | null>(null);
const [updateAllStatus, setUpdateAllStatus] = useState('');

const handleUpdateAllForDay = (day: DayGroup) => {
  setSelectedDay(day);
  setUpdateAllStatus('ready'); // Default to "ready"
  setUpdateAllModalOpen(true);
};

const confirmUpdateAll = async () => {
  if (!selectedDay) return;

  const dateOnly = new Date(selectedDay.scheduledDate!).toISOString().split('T')[0];

  console.log('Updating all meals for day:', {
    subscriptionId,
    date: dateOnly,
    status: updateAllStatus,
  });

  setUpdating(true);
  try {
    // Call existing batch update API
    const result = await chefSubscriptionsApi.updateDailyMealsStatus(
      subscriptionId,
      dateOnly,
      updateAllStatus
    );

    console.log('Batch update successful:', result);

    // Refresh timeline data
    await fetchTimelineData();
    setUpdateAllModalOpen(false);
    setSelectedDay(null);
  } catch (err) {
    console.error('Failed to update all meals:', err);
    setError(err instanceof Error ? err.message : 'Failed to update all meals');
  } finally {
    setUpdating(false);
  }
};
```

---

#### **Task 2.6: Update API Service**

- **File:** `chef-react/src/services/api.ts`
- **Action:** Add new API method
- **Estimated Time:** 15 minutes

```typescript
export const chefSubscriptionsApi = {
  // ... existing methods ...

  // NEW: Update individual meal type status
  async updateMealTypeStatus(
    subscriptionId: string,
    date: string,
    mealType: 'breakfast' | 'lunch' | 'dinner',
    status: string,
    notes?: string
  ) {
    const response = await fetch(
      `${API_BASE_URL}/api/chef/subscriptions/${subscriptionId}/meal-type/update`,
      {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({ date, mealType, status, notes }),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to update meal type status');
    }

    return response.json();
  },

  // EXISTING: Update all meals for a day (keep this)
  async updateDailyMealsStatus(
    subscriptionId: string,
    date: string,
    status: string,
    notes?: string
  ) {
    const response = await fetch(
      `${API_BASE_URL}/api/chef/subscriptions/${subscriptionId}/daily-meals/update`,
      {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({ date, status, notes }),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to update daily meals status');
    }

    return response.json();
  },
};
```

---

### 🧪 Phase 3: Testing & Validation (Day 3)

#### **Task 3.1: Backend API Testing**

- **Tool:** Postman / Thunder Client
- **Estimated Time:** 1 hour

**Test Cases:**

```json
// TEST 1: Update individual meal type (breakfast)
PUT /api/chef/subscriptions/:subscriptionId/meal-type/update
{
  "date": "2025-10-28",
  "mealType": "breakfast",
  "status": "preparing"
}
// Expected: Only breakfast updated, lunch/dinner unchanged

// TEST 2: Invalid status transition
PUT /api/chef/subscriptions/:subscriptionId/meal-type/update
{
  "date": "2025-10-28",
  "mealType": "lunch",
  "status": "delivered" // Current status: "scheduled"
}
// Expected: Error - invalid transition

// TEST 3: Update all meals for a day
PUT /api/chef/subscriptions/:subscriptionId/daily-meals/update
{
  "date": "2025-10-28",
  "status": "ready"
}
// Expected: All meal types (breakfast, lunch, dinner) updated

// TEST 4: All meals ready detection
PUT /api/chef/subscriptions/:subscriptionId/meal-type/update
{
  "date": "2025-10-28",
  "mealType": "dinner",
  "status": "ready" // Last meal to be marked ready
}
// Expected: allMealsReady = true in response
```

---

#### **Task 3.2: Frontend UI Testing**

- **Browser:** Chrome DevTools
- **Estimated Time:** 1 hour

**Test Scenarios:**

1. ✅ Timeline displays grouped by day
2. ✅ Each day shows all meal types (breakfast, lunch, dinner)
3. ✅ Meal types sorted in correct order
4. ✅ Individual "Edit" button opens modal for that meal only
5. ✅ "Update All" button updates all meals for that day
6. ✅ Status badges update in real-time
7. ✅ "Ready for Delivery" badge appears when all meals ready
8. ✅ Invalid status transitions show error message

---

### 🚀 Phase 4: Deployment (Day 3)

#### **Task 4.1: Backend Deployment**

1. Merge feature branch to `main`
2. Run database migration (if needed)
3. Deploy to staging environment
4. Test on staging
5. Deploy to production

#### **Task 4.2: Frontend Deployment**

1. Build production bundle
2. Deploy to hosting (Vercel/Netlify)
3. Clear CDN cache
4. Verify production deployment

---

## 6. API SPECIFICATIONS

### 📡 NEW API Endpoint

#### **Update Individual Meal Type Status**

```Tab
PUT /api/chef/subscriptions/:subscriptionId/meal-type/update
```

**Headers:**

```Tab
Authorization: Bearer <chef_jwt_token>
Content-Type: application/json
```

**Request Body:**

```json
{
  "date": "2025-10-28",
  "mealType": "breakfast",
  "status": "preparing",
  "notes": "Started cooking at 8:00 AM" // Optional
}
```

**Response (Success - 200):**

```json
{
  "success": true,
  "message": "Successfully updated breakfast to preparing",
  "data": {
    "date": "2025-10-28",
    "mealType": "breakfast",
    "status": "preparing",
    "allMealsReady": false,
    "dayMealStatuses": [
      { "mealTime": "breakfast", "status": "preparing" },
      { "mealTime": "lunch", "status": "scheduled" },
      { "mealTime": "dinner", "status": "scheduled" }
    ]
  }
}
```

**Response (Error - 400):**

```json
{
  "success": false,
  "message": "Invalid status transition from \"scheduled\" to \"delivered\"",
  "validNextStatuses": ["chef_assigned", "preparing", "cancelled", "skipped"]
}
```

**Response (Error - 404):**

```json
{
  "success": false,
  "message": "No breakfast meal found for date: 2025-10-28"
}
```

**Response (Error - 403):**

```json
{
  "success": false,
  "message": "You are not assigned to this subscription"
}
```

---

### 📡 EXISTING API Endpoint (Enhanced)

#### **Update All Meals for a Day**

```Tab
PUT /api/chef/subscriptions/:subscriptionId/daily-meals/update
```

**Headers:**

```Tab
Authorization: Bearer <chef_jwt_token>
Content-Type: application/json
```

**Request Body:**

```json
{
  "date": "2025-10-28",
  "status": "ready",
  "notes": "All meals completed and ready for pickup" // Optional
}
```

**Response (Success - 200):**

```json
{
  "success": true,
  "message": "Successfully updated 3 meal(s) for 2025-10-28",
  "data": {
    "date": "2025-10-28",
    "updatedCount": 3,
    "status": "ready",
    "updatedMeals": [
      { "mealTitle": "Pancakes", "mealType": "breakfast", "status": "ready" },
      { "mealTitle": "Pasta", "mealType": "lunch", "status": "ready" },
      { "mealTitle": "Steak", "mealType": "dinner", "status": "ready" }
    ]
  }
}
```

---

## 7. DATABASE SCHEMA

### 📊 Subscription Collection

**Relevant Fields:**

```javascript
{
  _id: ObjectId,
  subscriptionId: "SUB-1761693952534-7051",
  userId: ObjectId,
  mealPlanId: ObjectId,

  // ✅ THIS IS THE KEY STRUCTURE
  mealPlanSnapshot: {
    mealSchedule: [
      {
        weekNumber: 1,          // Week 1
        dayOfWeek: 1,           // Monday (1-7)
        dayName: "Monday",
        mealTime: "breakfast",  // ← MEAL TYPE
        customTitle: "Healthy Breakfast",
        deliveryStatus: "preparing", // ← STATUS
        scheduledDeliveryDate: "2025-10-28T00:00:00.000Z",
        deliveredAt: null,
        notes: "Started at 8:00 AM",
        meals: [
          {
            mealId: ObjectId,
            name: "Pancakes with Syrup",
            image: "https://...",
            nutrition: { calories: 450, protein: 12, carbs: 65, fat: 15 },
            pricing: { totalPrice: 2500 }
          }
        ]
      },
      {
        weekNumber: 1,          // SAME Week
        dayOfWeek: 1,           // SAME Monday
        dayName: "Monday",
        mealTime: "lunch",      // ← DIFFERENT MEAL TYPE
        customTitle: "Power Lunch",
        deliveryStatus: "scheduled", // ← DIFFERENT STATUS
        scheduledDeliveryDate: "2025-10-28T00:00:00.000Z",
        deliveredAt: null,
        notes: "",
        meals: [
          {
            mealId: ObjectId,
            name: "Pasta Carbonara",
            image: "https://...",
            nutrition: { calories: 650, protein: 25, carbs: 75, fat: 20 },
            pricing: { totalPrice: 3500 }
          }
        ]
      },
      {
        weekNumber: 1,
        dayOfWeek: 1,
        dayName: "Monday",
        mealTime: "dinner",     // ← THIRD MEAL TYPE
        customTitle: "Dinner Delight",
        deliveryStatus: "scheduled",
        scheduledDeliveryDate: "2025-10-28T00:00:00.000Z",
        deliveredAt: null,
        notes: "",
        meals: [
          {
            mealId: ObjectId,
            name: "Grilled Steak",
            image: "https://...",
            nutrition: { calories: 800, protein: 45, carbs: 30, fat: 35 },
            pricing: { totalPrice: 5000 }
          }
        ]
      }
    ]
  }
}
```

---

## 8. FRONTEND COMPONENTS

### 🎨 Component Hierarchy

```Tab
SubscriptionTimelineView
├── LoadingSpinner (if loading)
├── ErrorMessage (if error)
└── TimelineContent
    ├── ProgressBar (shows overall completion)
    ├── groupedTimeline.map → DayCard[]
    │   ├── DayHeader
    │   │   ├── Day Name & Date
    │   │   └── "Ready for Delivery" Badge (if all ready)
    │   ├── MealSlots
    │   │   ├── MealRow (Breakfast)
    │   │   │   ├── Icon 🍳
    │   │   │   ├── Title
    │   │   │   ├── StatusBadge
    │   │   │   └── Edit Button
    │   │   ├── MealRow (Lunch)
    │   │   │   ├── Icon 🍱
    │   │   │   ├── Title
    │   │   │   ├── StatusBadge
    │   │   │   └── Edit Button
    │   │   └── MealRow (Dinner)
    │   │       ├── Icon 🍽️
    │   │       ├── Title
    │   │       ├── StatusBadge
    │   │       └── Edit Button
    │   └── UpdateAllButton
    ├── StatusModal (for individual meal edit)
    └── UpdateAllModal (for batch day update)
```

---

## 9. TESTING STRATEGY

### 🧪 Test Coverage

#### **Backend Tests**

**File:** `backend/tests/controllers/chefSubscriptionController.test.js`

```javascript
describe('Chef Subscription Controller', () => {
  describe('updateMealTypeStatus', () => {
    test('should update individual meal type status', async () => {
      // Test implementation
    });

    test('should prevent invalid status transitions', async () => {
      // Test implementation
    });

    test('should detect when all meals ready', async () => {
      // Test implementation
    });

    test('should return 403 if chef not assigned', async () => {
      // Test implementation
    });

    test('should return 404 if meal not found', async () => {
      // Test implementation
    });
  });
});
```

#### **Frontend Tests**

**File:** `chef-react/src/components/__tests__/SubscriptionTimelineView.test.tsx`

```typescript
describe('SubscriptionTimelineView', () => {
  test('should group timeline by day', () => {
    // Test grouping logic
  });

  test('should sort meals by time order', () => {
    // Test sorting (breakfast → lunch → dinner)
  });

  test('should show "Ready for Delivery" badge when all meals ready', () => {
    // Test badge visibility
  });

  test('should call individual update API when editing single meal', () => {
    // Test API call
  });

  test('should call batch update API when clicking "Update All"', () => {
    // Test batch API call
  });
});
```

---

## 10. DEPLOYMENT PLAN

### 🚀 Deployment Checklist

#### **Pre-Deployment**

- [ ] All unit tests passing
- [ ] Integration tests passing
- [ ] Code review completed
- [ ] Documentation updated
- [ ] API documentation generated (Swagger/Postman)

#### **Staging Deployment**

- [ ] Deploy backend to staging
- [ ] Deploy frontend to staging
- [ ] Run smoke tests
- [ ] Test with sample data
- [ ] Get stakeholder approval

#### **Production Deployment**

- [ ] Create backup of production database
- [ ] Deploy backend (with zero downtime)
- [ ] Deploy frontend
- [ ] Monitor error logs for 24 hours
- [ ] Notify chefs of new feature

#### **Post-Deployment**

- [ ] Monitor API response times
- [ ] Check for any error spikes
- [ ] Gather chef feedback
- [ ] Plan iteration based on feedback

---

## 📊 APPENDIX A: Status Progression Flow

```Tab
┌──────────────┐
│  scheduled   │  ← Initial state (system creates)
└──────┬───────┘
       │
       ▼
┌──────────────┐
│chef_assigned │  ← Admin assigns chef (optional)
└──────┬───────┘
       │
       ▼
┌──────────────┐
│  preparing   │  ← Chef starts cooking
└──────┬───────┘
       │
       ▼
┌──────────────┐
│   prepared   │  ← Meal cooked (optional intermediate)
└──────┬───────┘
       │
       ▼
┌──────────────┐
│    ready     │  ← Ready for pickup
└──────┬───────┘
       │
       │  ← When ALL meals (breakfast, lunch, dinner) = "ready"
       │     System marks day as ready for delivery
       │
       ▼
┌──────────────┐
│out_for_delivery│ ← Driver picks up (driver updates)
└──────┬───────┘
       │
       ▼
┌──────────────┐
│  delivered   │  ← User confirms receipt (final state)
└──────────────┘
```

**Chef Can Update:**

- scheduled → preparing
- preparing → prepared
- prepared → ready

**Chef CANNOT Update:**

- ready → out_for_delivery (driver only)
- out_for_delivery → delivered (driver only)

---

## 📊 APPENDIX B: Example Grouping Logic

**Input (mealSchedule array):**

```javascript
[
  { weekNumber: 1, dayOfWeek: 1, mealTime: "breakfast", status: "preparing" },
  { weekNumber: 1, dayOfWeek: 1, mealTime: "lunch", status: "scheduled" },
  { weekNumber: 1, dayOfWeek: 1, mealTime: "dinner", status: "scheduled" },
  { weekNumber: 1, dayOfWeek: 2, mealTime: "breakfast", status: "scheduled" },
  { weekNumber: 1, dayOfWeek: 2, mealTime: "lunch", status: "scheduled" },
]
```

**Output (grouped by day):**

```javascript
[
  {
    weekNumber: 1,
    dayOfWeek: 1,
    dayName: "Monday",
    mealSlots: [
      { mealTime: "breakfast", status: "preparing" },
      { mealTime: "lunch", status: "scheduled" },
      { mealTime: "dinner", status: "scheduled" }
    ]
  },
  {
    weekNumber: 1,
    dayOfWeek: 2,
    dayName: "Tuesday",
    mealSlots: [
      { mealTime: "breakfast", status: "scheduled" },
      { mealTime: "lunch", status: "scheduled" }
    ]
  }
]
```

---

## 📝 APPENDIX C: Key Files Modified

| File | Type | Changes | Lines |
|------|------|---------|-------|
| `backend/routes/chefSubscriptions.js` | Backend | Add new route | +25 |
| `backend/controllers/chefSubscriptionController.js` | Backend | Add new methods | +200 |
| `chef-react/src/components/SubscriptionTimelineView.tsx` | Frontend | Refactor UI | +300 |
| `chef-react/src/services/api.ts` | Frontend | Add API method | +25 |

**Total LOC:** ~550 lines

---

## 🎯 SUCCESS CRITERIA

### ✅ Feature is Complete When:/

1. ✅ Chef can update breakfast status without affecting lunch/dinner
2. ✅ Chef can update all meals for a day in one click
3. ✅ Timeline shows meals grouped by day (not linear)
4. ✅ Status progression is enforced (can't skip steps)
5. ✅ System detects when all meals ready for delivery
6. ✅ All tests passing (backend + frontend)
7. ✅ Deployed to production without errors
8. ✅ Chefs successfully using the feature

---

## 📞 CONTACT & SUPPORT

**Project Lead:** [Your Name]
**Backend Developer:** [Name]
**Frontend Developer:** [Name]
**QA Lead:** [Name]

**Questions?** Open an issue in the project repo or Slack channel.

---

**Document Version:** 1.0
**Last Updated:** 2025-10-29
**Status:** ✅ Ready for Implementation

---

# 🚀 LET'S BUILD THIS!/
