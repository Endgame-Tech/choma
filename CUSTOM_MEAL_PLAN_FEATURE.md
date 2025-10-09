# Custom Meal Plan Generator - Technical Documentation

## 📋 Table of Contents

1. [Overview](#overview)
2. [Business Logic](#business-logic)
3. [Database Schema Changes](#database-schema-changes)
4. [API Endpoints](#api-endpoints)
5. [Algorithm Logic](#algorithm-logic)
6. [Pricing Model](#pricing-model)
7. [Admin Configuration](#admin-configuration)
8. [Frontend Implementation](#frontend-implementation)
9. [User Journey](#user-journey)
10. [Implementation Phases](#implementation-phases)
11. [Testing Strategy](#testing-strategy)

---

## 🎯 Overview

### What is Custom Meal Plan Generator?

A feature that allows users to create **personalized meal plans from scratch** based on their health goals, dietary restrictions, allergies, and ingredient preferences. Unlike simple meal swapping, this generates an intelligent, data-driven meal plan tailored to each user.

### Key Differentiator

- **Not Random**: Uses actual meal database with nutritional data
- **Intelligent Matching**: Algorithm filters meals based on health goals
- **Chef Integration**: Special instructions auto-delivered to kitchen
- **Conflict Resolution**: Handles contradictory requirements smartly
- **Premium Service**: 15% surcharge (configurable) for personalization

---

## 💼 Business Logic

### Health Goals (Starting with 5)

#### 1. **Weight Loss** 🏃‍♀️

- **Target Calories**: 1200-1800 cal/day
- **Macro Split**: 40% protein, 30% carbs, 30% fats
- **Meal Criteria**:
  - Calories per meal: < 600
  - High fiber (>5g)
  - Low sugar (<10g)
  - Avoid fried foods
  - Prefer: grilled, steamed, baked

#### 2. **Muscle Gain** 💪

- **Target Calories**: 2200-3000 cal/day
- **Macro Split**: 40% protein, 40% carbs, 20% fats
- **Meal Criteria**:
  - Protein per meal: >30g
  - High carbs for energy
  - Avoid low-calorie meals
  - Include: grilled meats, fish, eggs

#### 3. **Diabetic Friendly** 🩺

- **Target Calories**: 1600-2000 cal/day
- **Macro Split**: 40% protein, 30% carbs, 30% fats
- **Meal Criteria**:
  - Sugar per meal: <10g
  - High fiber (>5g)
  - Complex carbs only
  - Low glycemic index foods
  - Avoid: refined sugars, white bread

#### 4. **Heart Healthy** ❤️

- **Target Calories**: 1800-2200 cal/day
- **Macro Split**: 30% protein, 40% carbs, 30% fats
- **Meal Criteria**:
  - Fat per meal: <15g
  - High fiber
  - Avoid fried foods
  - Prefer: grilled, steamed
  - Low sodium

#### 5. **Maintenance** ⚖️

- **Target Calories**: 2000-2400 cal/day
- **Macro Split**: 30% protein, 40% carbs, 30% fats
- **Meal Criteria**:
  - Balanced selection
  - Variety is priority
  - All preparation methods OK
  - No strict filtering

### Dietary Restrictions

- Vegan
- Vegetarian
- Pescatarian
- Halal
- Kosher
- Gluten-free
- Dairy-free
- Nut-free
- Low-carb
- Keto
- Paleo

### Allergens

- Dairy
- Gluten
- Nuts
- Shellfish
- Eggs
- Soy
- Fish
- Sesame

### Customization Options

- Reduce pepper
- Reduce oil
- No onions
- No fried foods
- Extra protein
- Less carbs
- Steamed only

---

## 🗄️ Database Schema Changes

### 1. **DailyMeal Model Updates**

Add the following fields to `backend/models/DailyMeal.js`:

```javascript
// Dietary classifications
dietaryTags: {
  type: [String],
  enum: [
    'vegan',
    'vegetarian',
    'pescatarian',
    'halal',
    'kosher',
    'gluten-free',
    'dairy-free',
    'nut-free',
    'low-carb',
    'keto',
    'paleo'
  ],
  default: []
},

// Health goal compatibility
healthGoals: {
  type: [String],
  enum: [
    'weight_loss',
    'muscle_gain',
    'maintenance',
    'diabetes_management',
    'heart_health'
  ],
  default: []
},

// Customization options
customizationOptions: {
  canReducePepper: { type: Boolean, default: false },
  canReduceOil: { type: Boolean, default: false },
  canRemoveOnions: { type: Boolean, default: false },
  canMakeVegan: { type: Boolean, default: false },
  canAdjustSpice: { type: Boolean, default: false },
  customizationNotes: String
},

// Detailed ingredients for filtering
detailedIngredients: [{
  name: { type: String, required: true },
  category: {
    type: String,
    enum: ['protein', 'vegetable', 'grain', 'spice', 'dairy', 'oil', 'sauce']
  },
  canOmit: { type: Boolean, default: false }
}],

// Preparation method
preparationMethod: {
  type: String,
  enum: ['grilled', 'steamed', 'fried', 'baked', 'boiled', 'raw', 'roasted'],
  default: 'grilled'
},

// Glycemic index for diabetic filtering
glycemicIndex: {
  type: String,
  enum: ['low', 'medium', 'high'],
  default: 'medium'
}
```

### 2. **New Model: CustomMealPlan**

Create `backend/models/CustomMealPlan.js`:

```javascript
const CustomMealPlanSchema = new mongoose.Schema({
  customPlanId: String,
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Customer",
    required: true,
  },

  // User preferences
  preferences: {
    healthGoal: {
      type: String,
      enum: [
        "weight_loss",
        "muscle_gain",
        "maintenance",
        "diabetes_management",
        "heart_health",
      ],
      required: true,
    },
    dietaryRestrictions: [String],
    allergies: [String],
    excludeIngredients: [String],
    mealTypes: {
      type: [String],
      enum: ["breakfast", "lunch", "dinner"],
      default: ["breakfast", "lunch", "dinner"],
    },
    durationWeeks: {
      type: Number,
      min: 4,
      max: 4,
      default: 4,
    },
  },

  // Chef instructions
  chefInstructions: String,

  // Generated meal assignments
  mealAssignments: [
    {
      weekNumber: Number,
      dayOfWeek: Number,
      mealTime: String,
      mealId: { type: mongoose.Schema.Types.ObjectId, ref: "Meal" },
      customizations: {
        reducePepper: Boolean,
        reduceOil: Boolean,
        removeOnions: Boolean,
        specialInstructions: String,
      },
    },
  ],

  // Pricing
  pricing: {
    baseMealCost: Number,
    customizationFeePercent: Number,
    customizationFeeAmount: Number,
    totalPrice: Number,
  },

  // Nutritional summary
  nutritionSummary: {
    avgCaloriesPerDay: Number,
    avgProteinPerDay: Number,
    avgCarbsPerDay: Number,
    avgFatPerDay: Number,
  },

  // Status
  status: {
    type: String,
    enum: ["draft", "generated", "purchased", "active", "completed"],
    default: "draft",
  },

  // Timestamps
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});
```

### 3. **New Model: SystemSettings**

Create `backend/models/SystemSettings.js`:

```javascript
const SystemSettingsSchema = new mongoose.Schema({
  settingKey: {
    type: String,
    unique: true,
    required: true,
  },
  settingValue: {
    type: mongoose.Schema.Types.Mixed,
    required: true,
  },
  settingType: {
    type: String,
    enum: ["number", "string", "boolean", "object"],
    required: true,
  },
  description: String,
  category: {
    type: String,
    enum: ["pricing", "features", "limits", "general"],
  },
  updatedAt: { type: Date, default: Date.now },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "Admin" },
});

// Default settings
const DEFAULT_SETTINGS = {
  CUSTOM_PLAN_FEE_PERCENT: {
    key: "CUSTOM_PLAN_FEE_PERCENT",
    value: 15,
    type: "number",
    description: "Customization fee percentage for custom meal plans",
    category: "pricing",
  },
  CUSTOM_PLAN_MIN_WEEKS: {
    key: "CUSTOM_PLAN_MIN_WEEKS",
    value: 4,
    type: "number",
    description: "Minimum duration for custom meal plans (weeks)",
    category: "limits",
  },
  CUSTOM_PLAN_MAX_WEEKS: {
    key: "CUSTOM_PLAN_MAX_WEEKS",
    value: 4,
    type: "number",
    description: "Maximum duration for custom meal plans (weeks)",
    category: "limits",
  },
};
```

---

## 🔌 API Endpoints

### 1. **Generate Custom Meal Plan**

```md
POST /api/custom-meal-plans/generate
Authorization: Bearer {token}

Request Body:
{
"healthGoal": "weight_loss",
"dietaryRestrictions": ["halal", "dairy-free"],
"allergies": ["nuts"],
"excludeIngredients": ["pepper", "onions"],
"mealTypes": ["breakfast", "lunch"],
"durationWeeks": 4,
"chefInstructions": "Please reduce oil usage and steam vegetables"
}

Response:
{
"success": true,
"data": {
"customPlanId": "CUSTOM-0001",
"mealAssignments": [...],
"pricing": {
"baseMealCost": 84000,
"customizationFeePercent": 15,
"customizationFeeAmount": 12600,
"totalPrice": 96600
},
"nutritionSummary": {
"avgCaloriesPerDay": 1450,
"avgProteinPerDay": 125,
"avgCarbsPerDay": 140,
"avgFatPerDay": 45
},
"mealBreakdown": {
"totalMeals": 56,
"breakfastCount": 28,
"lunchCount": 28,
"dinnerCount": 0
}
}
}
```

### 2. **Get System Settings**

```md
GET /api/admin/settings/:settingKey
Authorization: Bearer {admin_token}

Response:
{
"success": true,
"data": {
"settingKey": "CUSTOM_PLAN_FEE_PERCENT",
"settingValue": 15,
"settingType": "number",
"description": "Customization fee percentage for custom meal plans"
}
}
```

### 3. **Update System Setting**

```md
PUT /api/admin/settings/:settingKey
Authorization: Bearer {admin_token}

Request Body:
{
"settingValue": 20
}

Response:
{
"success": true,
"message": "Setting updated successfully",
"data": {
"settingKey": "CUSTOM_PLAN_FEE_PERCENT",
"settingValue": 20,
"updatedAt": "2025-01-08T10:30:00Z"
}
}
```

### 4. **Preview Custom Plan (Before Purchase)**

```md
POST /api/custom-meal-plans/preview
Authorization: Bearer {token}

Request Body: (same as generate)

Response: (same as generate, but status: 'draft')
```

### 5. **Purchase Custom Plan**

```md
POST /api/custom-meal-plans/:customPlanId/purchase
Authorization: Bearer {token}

Response:
{
"success": true,
"message": "Custom meal plan purchased successfully",
"subscriptionId": "SUB-12345",
"orderId": "ORD-67890"
}
```

---

## 🧠 Algorithm Logic

### Meal Matching Algorithm Flow

```javascript
function generateCustomMealPlan(preferences) {
  // Step 1: Calculate daily nutritional targets
  const targets = calculateNutritionalTargets(preferences.healthGoal);

  // Step 2: Filter meals by hard constraints
  let eligibleMeals = filterMealsByConstraints(preferences);

  // Step 3: Score meals based on health goal
  let scoredMeals = scoreMealsByGoal(eligibleMeals, preferences.healthGoal);

  // Step 4: Generate balanced meal plan
  let mealPlan = generateBalancedPlan(scoredMeals, preferences, targets);

  // Step 5: Ensure variety (no meal repeated within 7 days)
  mealPlan = ensureVariety(mealPlan);

  // Step 6: Validate nutritional balance
  mealPlan = validateAndAdjust(mealPlan, targets);

  // Step 7: Calculate pricing
  const pricing = calculatePricing(mealPlan);

  return { mealPlan, pricing, nutritionSummary };
}
```

### Detailed Steps

#### Step 1: Calculate Nutritional Targets

```javascript
const HEALTH_GOAL_TARGETS = {
  weight_loss: {
    caloriesPerDay: { min: 1200, max: 1800 },
    proteinPercent: 40,
    carbsPercent: 30,
    fatPercent: 30,
  },
  muscle_gain: {
    caloriesPerDay: { min: 2200, max: 3000 },
    proteinPercent: 40,
    carbsPercent: 40,
    fatPercent: 20,
  },
  // ... other goals
};
```

#### Step 2: Filter by Constraints

```javascript
function filterMealsByConstraints(preferences) {
  let meals = Meal.find({ isAvailable: true });

  // Filter by allergies (HARD constraint - must exclude)
  if (preferences.allergies.length > 0) {
    meals = meals.filter(
      (meal) =>
        !meal.allergens.some((allergen) =>
          preferences.allergies.includes(allergen)
        )
    );
  }

  // Filter by dietary restrictions (HARD constraint)
  if (preferences.dietaryRestrictions.includes("vegan")) {
    meals = meals.filter((meal) => meal.dietaryTags.includes("vegan"));
  }

  // Filter by excluded ingredients
  if (preferences.excludeIngredients.length > 0) {
    meals = meals.filter(
      (meal) =>
        !meal.detailedIngredients.some((ingredient) =>
          preferences.excludeIngredients.includes(ingredient.name.toLowerCase())
        )
    );
  }

  return meals;
}
```

#### Step 3: Score Meals

```javascript
function scoreMealsByGoal(meals, healthGoal) {
  return meals
    .map((meal) => {
      let score = 0;

      if (healthGoal === "weight_loss") {
        // Prefer low-calorie meals
        if (meal.nutrition.calories < 600) score += 10;

        // Prefer high-fiber meals
        if (meal.nutrition.fiber > 5) score += 5;

        // Avoid fried foods
        if (meal.preparationMethod !== "fried") score += 8;

        // Prefer low-sugar meals
        if (meal.nutrition.sugar < 10) score += 5;
      }

      if (healthGoal === "muscle_gain") {
        // Prefer high-protein meals
        if (meal.nutrition.protein > 30) score += 10;

        // Need adequate calories
        if (meal.nutrition.calories > 600) score += 5;

        // Prefer grilled meats
        if (meal.preparationMethod === "grilled") score += 3;
      }

      // ... other goals

      return { ...meal, score };
    })
    .sort((a, b) => b.score - a.score);
}
```

#### Step 4: Generate Balanced Plan

```javascript
function generateBalancedPlan(scoredMeals, preferences, targets) {
  const plan = [];
  const totalDays = preferences.durationWeeks * 7;
  const mealsPerDay = preferences.mealTypes.length;

  for (let week = 1; week <= preferences.durationWeeks; week++) {
    for (let day = 1; day <= 7; day++) {
      let dailyCalories = 0;

      for (let mealType of preferences.mealTypes) {
        // Get category-specific meals
        const categoryMeals = scoredMeals.filter(
          (m) => m.category.toLowerCase() === mealType
        );

        // Select meal that fits daily calorie target
        const targetCaloriesForMeal = targets.caloriesPerDay.max / mealsPerDay;
        const selectedMeal = selectBestMeal(
          categoryMeals,
          targetCaloriesForMeal,
          dailyCalories,
          targets.caloriesPerDay.max
        );

        if (selectedMeal) {
          plan.push({
            weekNumber: week,
            dayOfWeek: day,
            mealTime: mealType,
            mealId: selectedMeal._id,
            meal: selectedMeal,
          });

          dailyCalories += selectedMeal.nutrition.calories;
        }
      }
    }
  }

  return plan;
}
```

#### Step 5: Ensure Variety

```javascript
function ensureVariety(mealPlan) {
  const mealUsageCount = {};
  const adjustedPlan = [];

  mealPlan.forEach((assignment, index) => {
    const mealId = assignment.mealId.toString();

    // Check if meal was used in last 7 days
    const recentAssignments = adjustedPlan.slice(Math.max(0, index - 21)); // 7 days * 3 meals
    const recentlyUsed = recentAssignments.some(
      (a) => a.mealId.toString() === mealId
    );

    if (recentlyUsed) {
      // Find alternative meal with similar nutritional profile
      const alternative = findAlternativeMeal(assignment.meal);
      if (alternative) {
        assignment.mealId = alternative._id;
        assignment.meal = alternative;
      }
    }

    adjustedPlan.push(assignment);
  });

  return adjustedPlan;
}
```

---

## 💰 Pricing Model

### Calculation Formula

```md
Base Meal Cost = Sum of all assigned meal prices
Customization Fee = Base Meal Cost × (Customization Fee Percent / 100)
Total Price = Base Meal Cost + Customization Fee
```

### Example Calculation

```javascript
// User selects: 4 weeks, breakfast + lunch

// Week 1-4: Breakfast (Mon-Sun) = 28 meals
// Week 1-4: Lunch (Mon-Sun) = 28 meals
// Total: 56 meals

// Sample meal prices from database:
Breakfast Day 1: ₦1,200
Lunch Day 1: ₦1,500
Breakfast Day 2: ₦1,100
Lunch Day 2: ₦1,600
... (continue for all 56 meals)

Base Meal Cost = ₦84,000

// Customization fee (configurable, default 15%)
Customization Fee = ₦84,000 × 0.15 = ₦12,600

// Final price
Total Price = ₦84,000 + ₦12,600 = ₦96,600
```

### Why 15% Premium?

1. **Extra Chef Coordination**: Custom instructions require more attention
2. **Meal Selection Time**: Algorithm needs to run complex filtering
3. **Quality Assurance**: Each custom plan reviewed before delivery
4. **Modification Handling**: Kitchen processes special requests
5. **Premium Service**: Personalized experience vs standard plans

---

## ⚙️ Admin Configuration

### Settings Page UI

Location: `admin-react/src/pages/SystemSettings.tsx`

```md
System Settings
├── Pricing
│ └── Custom Plan Customization Fee: [15] %
├── Limits
│ ├── Custom Plan Min Duration: [4] weeks
│ └── Custom Plan Max Duration: [4] weeks
└── Features
└── Enable Custom Plans: [✓]
```

### Admin Controls

- **Adjust Fee Percentage**: Change customization premium (0-100%)
- **Duration Limits**: Set min/max weeks for custom plans
- **Enable/Disable**: Toggle custom plan feature on/off
- **Audit Log**: Track all setting changes with admin name and timestamp

---

## 🎨 Frontend Implementation

### User Journey Flow

```md
CustomizeScreen (Existing)
├── [Swap Meals Button] (existing feature)
└── [Create Custom Plan Button] (NEW)
↓
CustomPlanWizard (NEW)
├── Step 1: Health Goal Selection
├── Step 2: Dietary Restrictions
├── Step 3: Allergies
├── Step 4: Foods to Avoid
├── Step 5: Meal Types & Frequency
├── Step 6: Duration (locked to 4 weeks)
├── Step 7: Chef Instructions
└── Step 8: Preview & Pricing
↓
CustomPlanPreview (NEW)
├── Meal Calendar View
├── Nutritional Summary
├── Price Breakdown
├── [Regenerate Plan Button]
└── [Proceed to Checkout Button]
↓
Checkout Flow (existing)
```

### Key Components

#### 1. **CustomPlanWizard.js**

Multi-step form with progress indicator

#### 2. **HealthGoalSelector.js**

Visual cards for selecting primary health goal

#### 3. **DietaryRestrictionsSelector.js**

Multi-select checkboxes with descriptions

#### 4. **FoodExclusionInput.js**

Search + add ingredients to exclude

#### 5. **CustomPlanPreview.js**

Calendar view with meal details and nutrition

#### 6. **PricingBreakdown.js**

Show base cost + customization fee clearly

---

## 👤 User Journey

### Step-by-Step Experience

#### Step 1: Discover Feature

- User navigates to existing "Customize" screen
- Sees two options:
  - "Swap Meals" (existing)
  - "Create Custom Plan" (NEW) - with badge "NEW"

#### Step 2: Health Goal Selection

```md
What's your primary health goal?

[Weight Loss] [Muscle Gain] [Maintenance]
[Diabetic Friendly] [Heart Healthy]
```

#### Step 3: Dietary Restrictions

```md
Do you follow any dietary restrictions? (Select all that apply)

☐ Vegan
☐ Vegetarian
☐ Halal
☐ Kosher
☐ Gluten-free
☐ Dairy-free
```

#### Step 4: Allergies

```md
Do you have any food allergies?

☐ Dairy
☐ Gluten
☐ Nuts
☐ Shellfish
☐ Eggs
```

#### Step 5: Food Preferences

```md
Any foods you'd like to avoid?

[Search ingredients...] [+ Add]

Added: Pepper ✕, Onions ✕
```

#### Step 6: Meal Types

```md
Which meals do you want included?

☑ Breakfast
☑ Lunch
☐ Dinner

Duration: 4 weeks (minimum)
```

#### Step 7: Chef Instructions

```md
Any special instructions for our chefs?

[Text area]
Examples:

- "Please reduce oil usage"
- "Steam vegetables instead of frying"
- "Extra protein portions"
```

#### Step 8: Preview & Confirm

```md
Your Custom Meal Plan

Week 1
─────
Mon: 🍳 Grilled Eggs | 🍗 Chicken Salad
Tue: 🥞 Oatmeal | 🐟 Grilled Fish
...

Nutrition Summary
─────────────────
Avg Calories/Day: 1,450 cal
Avg Protein/Day: 125g
Avg Carbs/Day: 140g
Avg Fat/Day: 45g

Pricing
───────
Base Meal Cost: ₦84,000
Customization Fee (15%): ₦12,600
───────────────────────────
Total: ₦96,600

[Regenerate Plan] [Proceed to Checkout]
```

---

## 🏗️ Implementation Phases

### Phase 1: Foundation (Week 1)

**Backend**

- [ ] Update DailyMeal model with new fields
- [ ] Create SystemSettings model
- [ ] Create CustomMealPlan model
- [ ] Seed default system settings
- [ ] Create admin API for settings management

**Frontend (Admin)**

- [ ] Build System Settings page
- [ ] Add customization fee configuration UI
- [ ] Add duration limits configuration

**Database**

- [ ] Migration script for existing meals
- [ ] Manual tagging UI for admin to classify meals

### Phase 2: Core Algorithm (Week 2)

**Backend**

- [ ] Implement meal filtering logic
- [ ] Implement meal scoring algorithm
- [ ] Implement balanced plan generation
- [ ] Implement variety optimizer
- [ ] Implement nutritional validation
- [ ] Create `/api/custom-meal-plans/generate` endpoint
- [ ] Create `/api/custom-meal-plans/preview` endpoint

**Testing**

- [ ] Unit tests for filtering logic
- [ ] Unit tests for scoring algorithm
- [ ] Integration tests for full generation

### Phase 3: Frontend Wizard (Week 3)

**User Mobile App**

- [ ] Create CustomPlanWizard component
- [ ] Create HealthGoalSelector component
- [ ] Create DietaryRestrictionsSelector component
- [ ] Create AllergiesSelector component
- [ ] Create FoodExclusionInput component
- [ ] Create MealTypesSelector component
- [ ] Create ChefInstructionsInput component
- [ ] Implement form state management
- [ ] Implement multi-step navigation

### Phase 4: Preview & Purchase (Week 4)

**User Mobile App**

- [ ] Create CustomPlanPreview component
- [ ] Create MealCalendarView component
- [ ] Create NutritionSummary component
- [ ] Create PricingBreakdown component
- [ ] Implement "Regenerate Plan" functionality
- [ ] Integrate with existing checkout flow

**Backend**

- [ ] Create `/api/custom-meal-plans/:id/purchase` endpoint
- [ ] Integrate with existing subscription system
- [ ] Create orders from custom plans
- [ ] Notify chefs of custom instructions

### Phase 5: Polish & Launch (Week 5)

**All Platforms**

- [ ] End-to-end testing
- [ ] Performance optimization
- [ ] Error handling and edge cases
- [ ] User feedback collection
- [ ] Analytics integration
- [ ] Documentation updates

---

## 🧪 Testing Strategy

### Unit Tests

- Meal filtering by allergies
- Meal filtering by dietary restrictions
- Meal scoring for each health goal
- Variety algorithm (no repeats)
- Pricing calculations
- Nutritional target calculations

### Integration Tests

- Full meal plan generation flow
- Preview → Purchase flow
- Admin settings update flow
- Chef instruction delivery

### User Acceptance Tests

1. **Weight Loss Plan**: User with dairy allergy, no pepper
2. **Muscle Gain Plan**: Vegan user, extra protein
3. **Diabetic Plan**: User avoiding fried foods
4. **Edge Case**: User with 5+ allergies (limited options)
5. **Conflict Resolution**: Weight loss + high carb request

### Performance Tests

- Generate plan for 100 concurrent users
- Filter 1000+ meals in <2 seconds
- Load preview screen in <1 second

---

## 🚀 Success Metrics

### Business Metrics

- **Adoption Rate**: % of users trying custom plans
- **Conversion Rate**: Preview → Purchase
- **Revenue Impact**: Total custom plan revenue
- **Average Order Value**: Custom vs. standard plans
- **Retention**: Do custom plan users stay longer?

### User Experience Metrics

- **Time to Complete Wizard**: Target < 3 minutes
- **Regeneration Rate**: How often users regenerate?
- **Chef Instruction Usage**: % of users adding instructions
- **Satisfaction Score**: Post-purchase survey

### Operational Metrics

- **Kitchen Compliance**: % of custom instructions followed
- **Generation Time**: API response time for generation
- **Error Rate**: Failed plan generations
- **Support Tickets**: Issues related to custom plans

---

## 📝 Notes & Considerations

### Medical Disclaimer

⚠️ **Important**: Include clear disclaimer that meal plans are for general wellness and not medical advice. Users with medical conditions should consult healthcare providers.

### Data Privacy

- Store user preferences securely
- Allow users to delete custom plan history
- Don't share health goal data with third parties

### Chef Training

- Train kitchen staff on custom instructions
- Create standardized modification procedures
- Quality control for customized meals

### Future Enhancements

- AI learning from user feedback
- Meal recommendations based on past preferences
- Integration with fitness apps (step tracking, etc.)
- Nutritionist consultation (premium add-on)
- Budget-optimized custom plans

---

## 📞 Support & Documentation

### User Documentation

- Create help center article: "How to Create a Custom Meal Plan"
- Video tutorial for wizard flow
- FAQ section addressing common questions

### Admin Documentation

- System settings configuration guide
- Meal tagging best practices
- Troubleshooting common issues

### Developer Documentation

- API endpoint documentation
- Algorithm logic documentation
- Database schema reference

---

**Last Updated**: January 8, 2025
**Version**: 1.0.0
**Author**: Choma Development Team
