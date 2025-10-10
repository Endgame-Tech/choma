# Custom Meal Plan Architecture - Implementation Summary

## Overview

Successfully implemented the **corrected architecture** for the custom meal plan feature based on user clarification. The system now has a clear separation between:

1. **DailyMeal Collection** - Individual meals database (unchanged)
2. **CustomMeal Collection (NEW)** - Admin-curated combo meals
3. **CustomMealPlan Collection** - User-generated meal plans

## Key Architectural Change

### Before (Incorrect)
- Algorithm browsed **DailyMeal** collection directly
- No concept of admin-curated combos

### After (Correct)
- Algorithm browses **CustomMeal** collection ONLY
- DailyMeal remains as source database
- Admin creates combo meals by combining 1+ DailyMeals
- CustomMeal auto-calculates all stats from constituent DailyMeals

## Implementation Details

### 1. Backend Models

#### CustomMeal Model (`backend/models/CustomMeal.js`)
**Purpose**: Admin-curated combo meals that algorithm uses

**Key Features**:
- References array of DailyMeals with quantities
- Auto-calculates combined nutrition, pricing, allergens, dietary tags
- Admin assigns health goals and category
- Availability flags for custom plans vs direct orders

**Key Fields**:
```javascript
{
  customMealId: "CMEAL-00001",
  name: "Protein Power Breakfast Combo",
  category: "breakfast",

  // Constituent DailyMeals
  constituentMeals: [
    { mealId: ObjectId, quantity: 1, notes: "" },
    { mealId: ObjectId, quantity: 2, notes: "extra portion" }
  ],

  // Auto-calculated from constituents
  nutrition: { calories, protein, carbs, fat, fiber, sugar },
  pricing: { baseCost, preparationFee, totalPrice },
  allergens: [], // Union of all constituent allergens
  dietaryTags: [], // Intersection (ALL must have tag)

  // Admin-assigned
  healthGoals: ["weight_loss", "muscle_gain"],

  // Availability
  isAvailableForCustomPlans: true, // Algorithm can select
  isAvailableForDirectOrder: false, // Future feature

  status: "active" // active, inactive, archived
}
```

**Key Method**:
```javascript
calculateFromConstituents() // Auto-calculates all fields from DailyMeals
```

#### CustomMealPlan Model (`backend/models/CustomMealPlan.js`)
**Purpose**: Stores user-generated custom meal plans (unchanged from before)

**Key Fields**:
```javascript
{
  customPlanId: "CUSTOM-00001",
  userId: ObjectId,
  preferences: {
    healthGoal, dietaryRestrictions, allergies,
    excludeIngredients, mealTypes, durationWeeks
  },
  mealAssignments: [
    { weekNumber, dayOfWeek, mealTime, mealId (CustomMeal ref) }
  ],
  pricing: { baseMealCost, customizationFeePercent, totalPrice },
  status: "draft" | "generated" | "purchased" | "active"
}
```

### 2. Algorithm Update

#### File: `backend/utils/mealMatchingAlgorithm.js`

**CRITICAL CHANGE**: Now queries **CustomMeal** collection instead of DailyMeal

```javascript
// Before
const Meal = require("../models/DailyMeal");
let meals = await Meal.find(query);

// After
const CustomMeal = require("../models/CustomMeal");
let meals = await CustomMeal.find({
  status: 'active',
  isAvailableForCustomPlans: true,
  ...constraints
});
```

Algorithm still follows same 6-step process:
1. Calculate nutritional targets
2. Filter by constraints (allergies, dietary restrictions)
3. Score meals by health goal
4. Generate balanced plan
5. Ensure variety
6. Validate and adjust

### 3. Backend Controllers

#### CustomMeal Controller (`backend/controllers/customMealController.js`)
**Purpose**: CRUD operations for admin to manage combo meals

**Endpoints**:
```javascript
GET    /api/admin/custom-meals              // List all custom meals
GET    /api/admin/custom-meals/:id          // Get specific custom meal
POST   /api/admin/custom-meals              // Create custom meal
PUT    /api/admin/custom-meals/:id          // Update custom meal
DELETE /api/admin/custom-meals/:id          // Delete custom meal
POST   /api/admin/custom-meals/:id/recalculate // Recalculate stats
GET    /api/admin/custom-meals/stats/overview // Get statistics
```

**Create Flow**:
1. Admin selects 1+ DailyMeals
2. Assigns health goals, category
3. System calls `calculateFromConstituents()`
4. Auto-generates nutrition, pricing, allergens, tags
5. Saves to database

#### CustomMealPlan Controller Updates (`backend/controllers/customMealPlanController.js`)

**NEW Admin Endpoints**:
```javascript
GET /api/admin/custom-meal-plans     // Get all user plans (admin view)
GET /api/admin/custom-meal-plans/:id // Get plan details (no ownership check)
```

**Existing User Endpoints** (unchanged):
```javascript
POST   /api/custom-meal-plans/generate    // Generate plan
GET    /api/custom-meal-plans/my-plans    // User's plans
GET    /api/custom-meal-plans/:id         // Get plan (with ownership check)
POST   /api/custom-meal-plans/:id/purchase // Purchase plan
POST   /api/custom-meal-plans/:id/regenerate // Regenerate
DELETE /api/custom-meal-plans/:id         // Delete draft
```

### 4. Backend Routes

#### Routes Registered in `backend/index.js`:
```javascript
// Admin custom meal routes (line 279-284)
app.use("/api/admin/custom-meals", adminLimiter, require("./routes/customMealRoutes"));

// Admin custom meal plan routes (line 286-291)
app.use("/api/admin/custom-meal-plans", adminLimiter, require("./routes/adminCustomMealPlanRoutes"));

// User custom meal plan routes (line 297)
app.use("/api/custom-meal-plans", generalLimiter, require("./routes/customMealPlanRoutes"));
```

### 5. Admin Frontend

#### Custom Meal Library Page (`admin-react/src/pages/CustomMeals.tsx`)
**Purpose**: Admin creates/manages combo meals

**Features**:
- ✅ List all custom meals with filters
- ✅ Stats cards (total, active, by category, by health goal)
- ✅ Create custom meal modal
  - Select constituent DailyMeals from searchable list
  - Set quantities for each meal
  - Assign health goals (multi-select)
  - Set availability flags
- ✅ Edit existing custom meals
- ✅ Delete custom meals
- ✅ Real-time display of selected constituent meals
- ✅ Search and filter DailyMeals when adding

**Key UI Elements**:
- Main table: ID, Name, Category, # Meals, Price, Calories, Health Goals, Status
- Create/Edit modal with constituent meal selection
- DailyMeal selector modal with search

#### Custom Meal Plans Page (`admin-react/src/pages/CustomMealPlans.tsx`)
**Purpose**: Admin views user-generated custom plans

**Features**:
- ✅ List all user custom meal plans
- ✅ Stats cards (total, draft, generated, purchased, active)
- ✅ Filters: status, health goal, search, date range
- ✅ View detailed plan modal
  - User information
  - Preferences & specifications
  - Pricing breakdown
  - Nutrition summary
  - Meal distribution stats
  - Chef instructions

**Key UI Elements**:
- Main table: Plan ID, User, Health Goal, Duration, Meals, Price, Calories, Status, Created
- Details modal with full plan information

#### Routing Updates

**App.tsx**:
```typescript
import CustomMeals from './pages/CustomMeals'
import CustomMealPlans from './pages/CustomMealPlans'

routes: [
  { path: '/custom-meals', element: <ProtectedRoute><CustomMeals /></ProtectedRoute> },
  { path: '/custom-meal-plans', element: <ProtectedRoute><CustomMealPlans /></ProtectedRoute> },
]
```

**Sidebar.tsx**:
```typescript
{ name: 'Custom Meals', href: '/custom-meals', icon: RectangleGroupIcon, permission: 'meals' },
{ name: 'Custom Meal Plans', href: '/custom-meal-plans', icon: ClipboardDocumentCheckIcon, permission: 'orders' },
```

## Data Flow

### Admin Creates Custom Meal
```
1. Admin opens Custom Meals page
2. Clicks "Create Custom Meal"
3. Selects DailyMeals from modal (search/filter)
4. Sets quantities, health goals, category
5. Submits → POST /api/admin/custom-meals
6. Backend calls calculateFromConstituents()
7. Auto-calculates: nutrition, pricing, allergens, tags
8. Saves to CustomMeal collection
9. Now available for algorithm to select
```

### User Generates Custom Plan
```
1. User submits preferences (health goal, allergies, etc.)
2. POST /api/custom-meal-plans/generate
3. Algorithm queries CustomMeal collection (NOT DailyMeal)
4. Filters by constraints, scores by health goal
5. Generates 4-week balanced plan
6. Creates CustomMealPlan document
7. Calculates pricing (base + 15% customization fee)
8. Returns plan to user
```

### Admin Views User Plans
```
1. Admin navigates to Custom Meal Plans page
2. GET /api/admin/custom-meal-plans
3. Lists all user-generated plans
4. Admin clicks "View Details"
5. GET /api/admin/custom-meal-plans/:id
6. Shows full plan: user, preferences, pricing, nutrition, meals
```

## Key Insights from Corrected Architecture

### Why Separate CustomMeal Collection?

1. **Curated Selection**: Algorithm only browses meals admin has specifically prepared for custom plans
2. **Quality Control**: Admin controls which combinations are offered
3. **Combo Meals**: Admin can create strategic combos (e.g., protein + sides)
4. **Pricing Control**: Combo meals have specific pricing independent of components
5. **Nutrition Optimization**: Admin can create meals that hit specific macro targets
6. **Variety Management**: Admin can ensure diverse options for each health goal

### Auto-Calculation Benefits

1. **Consistency**: All stats derived from source DailyMeals
2. **Accuracy**: No manual entry errors
3. **Maintainability**: Update DailyMeal → CustomMeal stats auto-update (with recalculate)
4. **Allergen Safety**: Union of all constituent allergens (if ANY has it, combo has it)
5. **Dietary Tags**: Intersection logic (ALL must have tag for combo to have it)

### Dietary Tag Logic (Important)

**Union (Allergens)**: If ANY constituent has allergen, combo has it
```javascript
allergenSet.add(allergen) // Union
```

**Intersection (Dietary Tags)**: ALL constituents must have tag
```javascript
dietaryTagCounts[tag] === totalMeals // Must appear in all meals
```

Example:
- Meal A: vegan, gluten-free
- Meal B: vegan, halal
- Combo: vegan ONLY (only tag in both)

### Health Goal Assignment

Admin manually assigns which health goals a custom meal supports:
- weight_loss
- muscle_gain
- maintenance
- diabetes_management
- heart_health

Algorithm filters custom meals by these assignments + scoring logic.

## Testing Requirements

### Before Production

1. **Seed Custom Meals**:
   - Create sample custom meals for each category
   - Ensure coverage for all health goals
   - Test various combinations (1 meal, 2 meals, etc.)

2. **Test Algorithm**:
   - Run with different health goals
   - Verify algorithm browses CustomMeal, not DailyMeal
   - Check variety enforcement
   - Validate nutrition targets

3. **Test Auto-Calculation**:
   - Create custom meal with multiple constituents
   - Verify nutrition sums correctly
   - Check pricing calculation
   - Validate allergen union
   - Verify dietary tag intersection

4. **Test Admin UI**:
   - Create custom meal end-to-end
   - Edit existing custom meal
   - Delete custom meal
   - View user plans
   - Filter and search

## Next Steps (Not Implemented Yet)

### Critical for Launch
1. **Seed Script**: Create `seedCustomMeals.js` to populate initial custom meals
2. **Data Migration**: Tag existing DailyMeals with health goals for combo creation
3. **Validation**: Ensure enough custom meals for each health goal × category
4. **Admin Training**: Document how to create effective custom meals

### Future Enhancements
1. **Auto-Combo Suggestions**: AI suggests good DailyMeal combinations
2. **Template System**: Save custom meal templates
3. **Seasonal Combos**: Time-based availability
4. **Direct Order**: Enable `isAvailableForDirectOrder` feature
5. **Analytics**: Track which custom meals are most selected
6. **User Feedback**: Rating system for custom meal combos

## Files Created/Modified

### Created
- `backend/models/CustomMeal.js` (NEW)
- `backend/controllers/customMealController.js` (NEW)
- `backend/routes/customMealRoutes.js` (NEW)
- `backend/routes/adminCustomMealPlanRoutes.js` (NEW)
- `admin-react/src/pages/CustomMeals.tsx` (NEW)
- `admin-react/src/pages/CustomMealPlans.tsx` (NEW)

### Modified
- `backend/utils/mealMatchingAlgorithm.js` (Changed to use CustomMeal)
- `backend/controllers/customMealPlanController.js` (Added admin endpoints)
- `backend/index.js` (Registered new routes)
- `admin-react/src/App.tsx` (Added routes)
- `admin-react/src/components/Sidebar.tsx` (Added nav items)

### Existing (Unchanged)
- `backend/models/DailyMeal.js` (Enhanced earlier, now source for combos)
- `backend/models/CustomMealPlan.js` (Created earlier, still valid)
- `backend/models/SystemSettings.js` (Created earlier, still valid)

## Database Collections Summary

```
┌─────────────┐
│  DailyMeal  │ ← Individual meals (pizza, rice, chicken, etc.)
└─────────────┘
       │
       │ Admin selects 1+ meals
       │
       ▼
┌─────────────┐
│ CustomMeal  │ ← Admin-curated combos
└─────────────┘
       │
       │ Algorithm browses
       │
       ▼
┌──────────────────┐
│ CustomMealPlan   │ ← User-generated plans
└──────────────────┘
```

## Success Metrics

- ✅ Algorithm browses CustomMeal collection ONLY
- ✅ DailyMeal collection remains unchanged
- ✅ Admin can create combos from DailyMeals
- ✅ Stats auto-calculate from constituents
- ✅ Two admin pages functional (Custom Meals, Custom Meal Plans)
- ✅ All CRUD operations implemented
- ✅ Routes registered and protected
- ✅ UI integrated into admin panel

## Conclusion

The corrected architecture is now fully implemented! The system properly separates:
- **DailyMeal** = source database
- **CustomMeal** = curated combos for algorithm
- **CustomMealPlan** = user-generated plans

Admin has full control over which meals the algorithm can select, enabling quality control and strategic meal combinations.

---

**Status**: ✅ COMPLETE - Ready for data seeding and testing
**Next Action**: Create seed script for sample custom meals
