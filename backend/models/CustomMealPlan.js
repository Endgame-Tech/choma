const mongoose = require("mongoose");

const CustomMealPlanSchema = new mongoose.Schema({
  customPlanId: {
    type: String,
    unique: true,
    index: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer',
    required: true,
    index: true
  },

  // User preferences
  preferences: {
    healthGoal: {
      type: String,
      enum: ['weight_loss', 'muscle_gain', 'maintenance', 'diabetes_management', 'heart_health'],
      required: true
    },
    dietaryRestrictions: {
      type: [String],
      enum: ['vegan', 'vegetarian', 'pescatarian', 'halal', 'kosher', 'gluten-free', 'dairy-free', 'nut-free', 'low-carb', 'keto', 'paleo'],
      default: []
    },
    allergies: {
      type: [String],
      enum: ['dairy', 'gluten', 'nuts', 'shellfish', 'eggs', 'soy', 'fish', 'sesame'],
      default: []
    },
    excludeIngredients: {
      type: [String],
      default: []
    },
    mealTypes: {
      type: [String],
      enum: ['breakfast', 'lunch', 'dinner'],
      default: ['breakfast', 'lunch', 'dinner']
    },
    durationWeeks: {
      type: Number,
      min: 4,
      max: 4,
      default: 4,
      required: true
    }
  },

  // Chef instructions
  chefInstructions: {
    type: String,
    maxlength: 500
  },

  // Generated meal assignments
  mealAssignments: [{
    weekNumber: {
      type: Number,
      required: true,
      min: 1,
      max: 4
    },
    dayOfWeek: {
      type: Number,
      required: true,
      min: 1,
      max: 7
    },
    mealTime: {
      type: String,
      enum: ['breakfast', 'lunch', 'dinner'],
      required: true
    },
    mealId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Meal',
      required: true
    },
    customizations: {
      reducePepper: { type: Boolean, default: false },
      reduceOil: { type: Boolean, default: false },
      removeOnions: { type: Boolean, default: false },
      specialInstructions: String
    }
  }],

  // Pricing
  pricing: {
    baseMealCost: {
      type: Number,
      required: true,
      default: 0
    },
    customizationFeePercent: {
      type: Number,
      required: true,
      default: 15
    },
    customizationFeeAmount: {
      type: Number,
      required: true,
      default: 0
    },
    totalPrice: {
      type: Number,
      required: true,
      default: 0
    }
  },

  // Nutritional summary
  nutritionSummary: {
    totalCalories: { type: Number, default: 0 },
    avgCaloriesPerDay: { type: Number, default: 0 },
    avgProteinPerDay: { type: Number, default: 0 },
    avgCarbsPerDay: { type: Number, default: 0 },
    avgFatPerDay: { type: Number, default: 0 },
    totalProtein: { type: Number, default: 0 },
    totalCarbs: { type: Number, default: 0 },
    totalFat: { type: Number, default: 0 },
    totalFiber: { type: Number, default: 0 }
  },

  // Meal breakdown stats
  stats: {
    totalMeals: { type: Number, default: 0 },
    breakfastCount: { type: Number, default: 0 },
    lunchCount: { type: Number, default: 0 },
    dinnerCount: { type: Number, default: 0 }
  },

  // Status
  status: {
    type: String,
    enum: ['draft', 'generated', 'purchased', 'active', 'completed', 'cancelled'],
    default: 'draft',
    index: true
  },

  // Link to subscription (after purchase)
  subscriptionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Subscription'
  },

  // Link to order (after purchase)
  orderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order'
  },

  // Generation metadata
  generatedAt: {
    type: Date,
    default: Date.now
  },
  purchasedAt: Date,

  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Pre-save middleware to generate customPlanId
CustomMealPlanSchema.pre("save", async function (next) {
  if (!this.customPlanId) {
    const count = await mongoose.model("CustomMealPlan").countDocuments();
    this.customPlanId = `CUSTOM-${String(count + 1).padStart(4, "0")}`;
  }

  this.updatedAt = new Date();
  next();
});

// Method to calculate pricing
CustomMealPlanSchema.methods.calculatePricing = async function (customizationFeePercent) {
  // Populate meals if not already populated
  if (this.mealAssignments.length > 0 && !this.mealAssignments[0].mealId.pricing) {
    await this.populate('mealAssignments.mealId');
  }

  let baseMealCost = 0;

  this.mealAssignments.forEach(assignment => {
    if (assignment.mealId && assignment.mealId.pricing) {
      baseMealCost += assignment.mealId.pricing.totalPrice || 0;
    }
  });

  const customizationFeeAmount = Math.round((baseMealCost * customizationFeePercent) / 100);
  const totalPrice = baseMealCost + customizationFeeAmount;

  this.pricing = {
    baseMealCost,
    customizationFeePercent,
    customizationFeeAmount,
    totalPrice
  };

  return this.pricing;
};

// Method to calculate nutritional summary
CustomMealPlanSchema.methods.calculateNutritionSummary = async function () {
  // Populate meals if not already populated
  if (this.mealAssignments.length > 0 && !this.mealAssignments[0].mealId.nutrition) {
    await this.populate('mealAssignments.mealId');
  }

  let totalCalories = 0;
  let totalProtein = 0;
  let totalCarbs = 0;
  let totalFat = 0;
  let totalFiber = 0;

  // Track unique days
  const uniqueDays = new Set();

  this.mealAssignments.forEach(assignment => {
    if (assignment.mealId && assignment.mealId.nutrition) {
      totalCalories += assignment.mealId.nutrition.calories || 0;
      totalProtein += assignment.mealId.nutrition.protein || 0;
      totalCarbs += assignment.mealId.nutrition.carbs || 0;
      totalFat += assignment.mealId.nutrition.fat || 0;
      totalFiber += assignment.mealId.nutrition.fiber || 0;

      uniqueDays.add(`${assignment.weekNumber}-${assignment.dayOfWeek}`);
    }
  });

  const totalDays = uniqueDays.size || 1;

  this.nutritionSummary = {
    totalCalories,
    avgCaloriesPerDay: Math.round(totalCalories / totalDays),
    avgProteinPerDay: Math.round(totalProtein / totalDays),
    avgCarbsPerDay: Math.round(totalCarbs / totalDays),
    avgFatPerDay: Math.round(totalFat / totalDays),
    totalProtein,
    totalCarbs,
    totalFat,
    totalFiber
  };

  return this.nutritionSummary;
};

// Method to calculate stats
CustomMealPlanSchema.methods.calculateStats = function () {
  const stats = {
    totalMeals: this.mealAssignments.length,
    breakfastCount: 0,
    lunchCount: 0,
    dinnerCount: 0
  };

  this.mealAssignments.forEach(assignment => {
    if (assignment.mealTime === 'breakfast') stats.breakfastCount++;
    if (assignment.mealTime === 'lunch') stats.lunchCount++;
    if (assignment.mealTime === 'dinner') stats.dinnerCount++;
  });

  this.stats = stats;
  return stats;
};

// Method to mark as purchased
CustomMealPlanSchema.methods.markAsPurchased = function (subscriptionId, orderId) {
  this.status = 'purchased';
  this.subscriptionId = subscriptionId;
  this.orderId = orderId;
  this.purchasedAt = new Date();
  return this.save();
};

// Static method to find plans by user
CustomMealPlanSchema.statics.findByUser = function (userId) {
  return this.find({ userId }).sort({ createdAt: -1 });
};

// Static method to find active plans
CustomMealPlanSchema.statics.findActive = function () {
  return this.find({ status: { $in: ['active', 'purchased'] } });
};

// Indexes for efficient querying
CustomMealPlanSchema.index({ userId: 1, status: 1 });
CustomMealPlanSchema.index({ createdAt: -1 });
CustomMealPlanSchema.index({ 'preferences.healthGoal': 1 });

module.exports = mongoose.model("CustomMealPlan", CustomMealPlanSchema);
