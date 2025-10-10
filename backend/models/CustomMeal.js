// backend/models/CustomMeal.js
// CustomMeal (MealCombo) - Admin-curated combo meals made from DailyMeals
// This is the collection that the custom meal plan algorithm browses

const mongoose = require("mongoose");

const CustomMealSchema = new mongoose.Schema(
  {
    // Unique identifier
    customMealId: {
      type: String,
      unique: true,
      required: true,
    },

    // Basic Info
    name: {
      type: String,
      required: true,
      trim: true,
    },

    description: {
      type: String,
      trim: true,
    },

    category: {
      type: String,
      required: true,
      enum: ["breakfast", "lunch", "dinner", "snack"],
    },

    // Constituent DailyMeals
    constituentMeals: [
      {
        mealId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "DailyMeal",
          required: true,
        },
        quantity: {
          type: Number,
          default: 1,
          min: 1,
        },
        // Optional notes for this component (e.g., "extra portion", "side dish")
        notes: String,
      },
    ],

    // Auto-calculated fields (computed from constituent meals)
    nutrition: {
      calories: { type: Number, default: 0 },
      protein: { type: Number, default: 0 },
      carbs: { type: Number, default: 0 },
      fat: { type: Number, default: 0 },
      fiber: { type: Number, default: 0 },
      sugar: { type: Number, default: 0 },
      sodium: { type: Number, default: 0 },
    },

    pricing: {
      baseCost: { type: Number, default: 0 },
      preparationFee: { type: Number, default: 0 },
      totalPrice: { type: Number, default: 0 },
    },

    // Aggregated allergens from all constituent meals
    allergens: {
      type: [String],
      enum: [
        "dairy",
        "eggs",
        "fish",
        "shellfish",
        "tree_nuts",
        "peanuts",
        "wheat",
        "soy",
        "sesame",
      ],
      default: [],
    },

    // Aggregated dietary tags (intersection - must be true for ALL meals)
    dietaryTags: {
      type: [String],
      enum: [
        "vegan",
        "vegetarian",
        "pescatarian",
        "halal",
        "kosher",
        "gluten-free",
        "dairy-free",
        "nut-free",
        "low-carb",
        "keto",
        "paleo",
      ],
      default: [],
    },

    // Admin-assigned health goals
    healthGoals: {
      type: [String],
      enum: [
        "weight_loss",
        "muscle_gain",
        "maintenance",
        "diabetes_management",
        "heart_health",
      ],
      default: [],
      required: true,
    },

    // Most restrictive preparation method among constituent meals
    preparationMethod: {
      type: String,
      enum: ["grilled", "steamed", "fried", "baked", "boiled", "raw", "roasted", "mixed"],
      default: "mixed",
    },

    // Highest glycemic index among constituent meals
    glycemicIndex: {
      type: String,
      enum: ["low", "medium", "high"],
      default: "medium",
    },

    // Aggregated detailed ingredients
    detailedIngredients: [
      {
        name: { type: String, required: true },
        category: {
          type: String,
          enum: [
            "protein",
            "vegetable",
            "grain",
            "spice",
            "dairy",
            "oil",
            "sauce",
            "other",
          ],
        },
        canOmit: { type: Boolean, default: false },
      },
    ],

    // Image for this combo meal
    image: {
      type: String,
      default: "",
    },

    // Availability flags
    isAvailableForCustomPlans: {
      type: Boolean,
      default: true, // Algorithm can select this
    },

    isAvailableForDirectOrder: {
      type: Boolean,
      default: false, // Can be ordered directly (optional future feature)
    },

    // Status
    status: {
      type: String,
      enum: ["active", "inactive", "archived"],
      default: "active",
    },

    // Admin notes
    adminNotes: {
      type: String,
      trim: true,
    },

    // Tracking
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
    },

    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
    },
  },
  {
    timestamps: true,
  }
);

// ============================================================================
// METHODS - Auto-calculation from constituent meals
// ============================================================================

// Calculate all auto-calculated fields from constituent meals
CustomMealSchema.methods.calculateFromConstituents = async function () {
  if (!this.constituentMeals || this.constituentMeals.length === 0) {
    throw new Error("CustomMeal must have at least one constituent meal");
  }

  // Populate constituent meals if not already populated
  if (!this.constituentMeals[0].mealId.name) {
    await this.populate("constituentMeals.mealId");
  }

  // Initialize aggregators
  let totalCalories = 0;
  let totalProtein = 0;
  let totalCarbs = 0;
  let totalFat = 0;
  let totalFiber = 0;
  let totalSugar = 0;
  let totalSodium = 0;

  let totalBaseCost = 0;
  let totalPreparationFee = 0;

  const allergenSet = new Set();
  const dietaryTagCounts = {};
  const ingredientMap = new Map();

  let highestGI = "low";
  const giOrder = { low: 0, medium: 1, high: 2 };

  const prepMethods = new Set();

  // Aggregate from all constituent meals
  for (const constituent of this.constituentMeals) {
    const meal = constituent.mealId;
    const qty = constituent.quantity || 1;

    // Nutrition
    if (meal.nutrition) {
      totalCalories += (meal.nutrition.calories || 0) * qty;
      totalProtein += (meal.nutrition.protein || 0) * qty;
      totalCarbs += (meal.nutrition.carbs || 0) * qty;
      totalFat += (meal.nutrition.fat || 0) * qty;
      totalFiber += (meal.nutrition.fiber || 0) * qty;
      totalSugar += (meal.nutrition.sugar || 0) * qty;
      totalSodium += (meal.nutrition.sodium || 0) * qty;
    }

    // Pricing
    if (meal.pricing) {
      totalBaseCost += (meal.pricing.baseCost || 0) * qty;
      totalPreparationFee += (meal.pricing.preparationFee || 0) * qty;
    }

    // Allergens (union - if ANY meal has it, combo has it)
    if (meal.allergens && Array.isArray(meal.allergens)) {
      meal.allergens.forEach((allergen) => allergenSet.add(allergen));
    }

    // Dietary tags (intersection - ALL meals must have tag for combo to have it)
    if (meal.dietaryTags && Array.isArray(meal.dietaryTags)) {
      meal.dietaryTags.forEach((tag) => {
        dietaryTagCounts[tag] = (dietaryTagCounts[tag] || 0) + 1;
      });
    }

    // Detailed ingredients (union)
    if (meal.detailedIngredients && Array.isArray(meal.detailedIngredients)) {
      meal.detailedIngredients.forEach((ingredient) => {
        const key = ingredient.name.toLowerCase();
        if (!ingredientMap.has(key)) {
          ingredientMap.set(key, {
            name: ingredient.name,
            category: ingredient.category,
            canOmit: ingredient.canOmit,
          });
        }
      });
    }

    // Glycemic index (take highest)
    if (meal.glycemicIndex) {
      if (giOrder[meal.glycemicIndex] > giOrder[highestGI]) {
        highestGI = meal.glycemicIndex;
      }
    }

    // Preparation method
    if (meal.preparationMethod) {
      prepMethods.add(meal.preparationMethod);
    }
  }

  // Set nutrition
  this.nutrition = {
    calories: Math.round(totalCalories),
    protein: Math.round(totalProtein * 10) / 10,
    carbs: Math.round(totalCarbs * 10) / 10,
    fat: Math.round(totalFat * 10) / 10,
    fiber: Math.round(totalFiber * 10) / 10,
    sugar: Math.round(totalSugar * 10) / 10,
    sodium: Math.round(totalSodium * 10) / 10,
  };

  // Set pricing
  this.pricing = {
    baseCost: Math.round(totalBaseCost),
    preparationFee: Math.round(totalPreparationFee),
    totalPrice: Math.round(totalBaseCost + totalPreparationFee),
  };

  // Set allergens
  this.allergens = Array.from(allergenSet);

  // Set dietary tags (only tags present in ALL meals)
  const totalMeals = this.constituentMeals.length;
  this.dietaryTags = Object.keys(dietaryTagCounts).filter(
    (tag) => dietaryTagCounts[tag] === totalMeals
  );

  // Set detailed ingredients
  this.detailedIngredients = Array.from(ingredientMap.values());

  // Set glycemic index
  this.glycemicIndex = highestGI;

  // Set preparation method
  if (prepMethods.size === 1) {
    this.preparationMethod = Array.from(prepMethods)[0];
  } else {
    this.preparationMethod = "mixed";
  }

  return this;
};

// ============================================================================
// PRE-SAVE HOOKS
// ============================================================================

// Auto-generate customMealId
CustomMealSchema.pre("save", async function (next) {
  if (!this.customMealId) {
    const count = await this.constructor.countDocuments();
    this.customMealId = `CMEAL-${String(count + 1).padStart(5, "0")}`;
  }
  next();
});

// ============================================================================
// INDEXES
// ============================================================================

CustomMealSchema.index({ customMealId: 1 });
CustomMealSchema.index({ category: 1 });
CustomMealSchema.index({ healthGoals: 1 });
CustomMealSchema.index({ dietaryTags: 1 });
CustomMealSchema.index({ allergens: 1 });
CustomMealSchema.index({ isAvailableForCustomPlans: 1 });
CustomMealSchema.index({ status: 1 });
CustomMealSchema.index({ "nutrition.calories": 1 });
CustomMealSchema.index({ "nutrition.protein": 1 });
CustomMealSchema.index({ glycemicIndex: 1 });
CustomMealSchema.index({ preparationMethod: 1 });

// Compound indexes for algorithm queries
CustomMealSchema.index({ isAvailableForCustomPlans: 1, status: 1, category: 1 });
CustomMealSchema.index({ healthGoals: 1, category: 1, status: 1 });

module.exports = mongoose.model("CustomMeal", CustomMealSchema);
