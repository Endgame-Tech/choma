const mongoose = require('mongoose');

// This is now the Meal model for individual food items
const MealSchema = new mongoose.Schema({
  mealId: { type: String, unique: true },
  name: { type: String, required: true },
  image: { type: String, default: '' },
  
  // Updated pricing structure with auto-calculated cooking costs
  pricing: {
    ingredients: { type: Number, required: true },
    cookingCosts: { type: Number, required: true },
    packaging: { type: Number, required: true },
    delivery: { type: Number, required: true },
    platformFee: { type: Number, required: true },
    totalCosts: { type: Number, required: true },
    profit: { type: Number, required: true },
    totalPrice: { type: Number, required: true },
    chefEarnings: { type: Number, required: true },
    chomaEarnings: { type: Number, required: true }
  },
  
  // Nutritional information
  nutrition: {
    calories: { type: Number, default: 0 },
    protein: { type: Number, default: 0 },
    carbs: { type: Number, default: 0 },
    fat: { type: Number, default: 0 },
    fiber: { type: Number, default: 0 },
    sugar: { type: Number, default: 0 },
    weight: { type: Number, default: 0 } // in grams
  },
  
  // Additional meal information
  ingredients: String,
  preparationTime: Number,
  complexityLevel: { 
    type: String, 
    enum: ['low', 'medium', 'high'],
    required: true
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
    enum: ['Breakfast', 'Lunch', 'Dinner', 'Snack', 'Dessert', 'Beverage'],
    default: 'Lunch'
  },
  
  // Tags for easy searching
  tags: [String],
  
  // Timestamps
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Auto-generate mealId before saving
MealSchema.pre('save', async function(next) {
  if (!this.mealId) {
    const count = await mongoose.model('Meal').countDocuments();
    this.mealId = `MEAL-${String(count + 1).padStart(4, '0')}`;
  }
  
  // Calculate derived pricing fields if components are provided
  if (this.pricing && this.pricing.ingredients && this.pricing.cookingCosts && this.pricing.packaging && this.pricing.delivery) {
    this.pricing.totalCosts = this.pricing.ingredients + this.pricing.cookingCosts + this.pricing.packaging + this.pricing.delivery;
    this.pricing.profit = this.pricing.totalCosts * 0.4; // 40% profit margin
    this.pricing.totalPrice = this.pricing.totalCosts + this.pricing.profit;
    this.pricing.chefEarnings = this.pricing.profit / 2; // 50% of profit to chef
    this.pricing.chomaEarnings = this.pricing.profit / 2; // 50% of profit to choma
  }
  
  // Update the updatedAt timestamp
  this.updatedAt = new Date();
  
  next();
});

// Method to update pricing
MealSchema.methods.updatePricing = function(ingredients, cookingCosts, packaging, delivery, platformFee) {
  const totalCosts = ingredients + cookingCosts + packaging + delivery;
  const profit = totalCosts * 0.4;
  const totalPrice = totalCosts + profit;
  
  this.pricing = {
    ingredients,
    cookingCosts,
    packaging,
    delivery,
    platformFee,
    totalCosts,
    profit,
    totalPrice,
    chefEarnings: profit / 2,
    chomaEarnings: profit / 2
  };
  return this.save();
};

// Method to toggle availability
MealSchema.methods.toggleAvailability = function() {
  this.isAvailable = !this.isAvailable;
  return this.save();
};

// Static method to find available meals
MealSchema.statics.findAvailable = function() {
  return this.find({ isAvailable: true });
};

// Static method to find meals by category
MealSchema.statics.findByCategory = function(category) {
  return this.find({ category, isAvailable: true });
};

// Index for efficient searching
MealSchema.index({ name: 'text', tags: 'text' });
MealSchema.index({ isAvailable: 1, category: 1 });
MealSchema.index({ 'pricing.totalPrice': 1 });

module.exports = mongoose.model('Meal', MealSchema);
