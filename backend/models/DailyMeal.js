const mongoose = require("mongoose");

// This is now the Meal model for individual food items
const MealSchema = new mongoose.Schema({
  mealId: { type: String, unique: true },
  name: { type: String, required: true },
  image: { type: String, default: "" },

  // Updated pricing structure with auto-calculated cooking costs
  pricing: {
    ingredients: { type: Number, required: true },
    cookingCosts: { type: Number, required: true },
    packaging: { type: Number, required: true },
    delivery: { type: Number, default: 0 },
    platformFee: { type: Number, required: true },
    totalCosts: { type: Number, required: true },
    profit: { type: Number, required: true },
    totalPrice: { type: Number, required: true },
    chefEarnings: { type: Number, required: true },
    chomaEarnings: { type: Number, required: true },
  },

  // Nutritional information
  nutrition: {
    calories: { type: Number, default: 0 },
    protein: { type: Number, default: 0 },
    carbs: { type: Number, default: 0 },
    fat: { type: Number, default: 0 },
    fiber: { type: Number, default: 0 },
    sugar: { type: Number, default: 0 },
    weight: { type: Number, default: 0 }, // in grams
  },

  // Additional meal information
  ingredients: String,
  preparationTime: Number,
  complexityLevel: {
    type: String,
    enum: ["low", "medium", "high"],
    required: true,
  },
  allergens: [String],

  // Availability control
  isAvailable: { type: Boolean, default: true },

  // Admin and chef notes
  adminNotes: String,
  chefNotes: String,

  // Meal category/type (optional)
  category: {
    type: String,
    enum: ["Breakfast", "Lunch", "Dinner", "Snack", "Dessert", "Beverage"],
    default: "Lunch",
  },

  // Tags for easy searching
  tags: [String],

  // ========================================
  // CUSTOM MEAL PLAN FEATURES - NEW
  // ========================================

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
      enum: ['protein', 'vegetable', 'grain', 'spice', 'dairy', 'oil', 'sauce', 'other']
    },
    canOmit: { type: Boolean, default: false }
  }],

  // Preparation method (enhanced)
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
  },

  // Timestamps
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

// Auto-generate mealId before saving
MealSchema.pre("save", async function (next) {
  if (!this.mealId) {
    const count = await mongoose.model("Meal").countDocuments();
    this.mealId = `MEAL-${String(count + 1).padStart(4, "0")}`;
  }

  // Calculate derived pricing fields if components are provided
  if (this.pricing && this.pricing.cookingCosts && this.pricing.packaging) {
    // Platform fee = 20% of cooking cost
    this.pricing.platformFee = this.pricing.cookingCosts * 0.2;

    // Total cost = cooking cost + packaging
    this.pricing.totalCosts =
      this.pricing.cookingCosts + this.pricing.packaging;

    // No separate profit calculation
    this.pricing.profit = 0;

    // Final price = cooking cost + packaging + platform fee
    this.pricing.totalPrice =
      this.pricing.cookingCosts +
      this.pricing.packaging +
      this.pricing.platformFee;

    // Chef gets: cooking cost only
    this.pricing.chefEarnings = this.pricing.cookingCosts;

    // Choma gets: platform fee + packaging
    this.pricing.chomaEarnings =
      this.pricing.platformFee + this.pricing.packaging;
  }

  // Update the updatedAt timestamp
  this.updatedAt = new Date();

  next();
});

// Method to update pricing
MealSchema.methods.updatePricing = function (cookingCosts, packaging) {
  // Platform fee = 20% of cooking cost
  const platformFee = cookingCosts * 0.2;

  // Total cost = cooking cost + packaging
  const totalCosts = cookingCosts + packaging;

  // No separate profit calculation
  const profit = 0;

  // Final price = cooking cost + packaging + platform fee
  const totalPrice = cookingCosts + packaging + platformFee;

  // Chef gets: cooking cost only
  const chefEarnings = cookingCosts;

  // Choma gets: platform fee + packaging
  const chomaEarnings = platformFee + packaging;

  this.pricing = {
    ingredients: 0, // No longer used
    cookingCosts,
    packaging,
    platformFee,
    totalCosts,
    profit,
    totalPrice,
    chefEarnings,
    chomaEarnings,
  };
  return this.save();
};

// Method to toggle availability
MealSchema.methods.toggleAvailability = function () {
  this.isAvailable = !this.isAvailable;
  return this.save();
};

// Static method to find available meals
MealSchema.statics.findAvailable = function () {
  return this.find({ isAvailable: true });
};

// Static method to find meals by category
MealSchema.statics.findByCategory = function (category) {
  return this.find({ category, isAvailable: true });
};

// Index for efficient searching
MealSchema.index({ name: "text", tags: "text" });
MealSchema.index({ isAvailable: 1, category: 1 });
MealSchema.index({ "pricing.totalPrice": 1 });

// Custom meal plan indexes
MealSchema.index({ healthGoals: 1 });
MealSchema.index({ dietaryTags: 1 });
MealSchema.index({ allergens: 1 });
MealSchema.index({ preparationMethod: 1 });
MealSchema.index({ glycemicIndex: 1 });
MealSchema.index({ "nutrition.calories": 1 });
MealSchema.index({ "nutrition.protein": 1 });
MealSchema.index({ "nutrition.sugar": 1 });

module.exports = mongoose.model("Meal", MealSchema);
