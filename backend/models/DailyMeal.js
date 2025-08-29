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
    delivery: { type: Number, default: 0 },
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
  if (this.pricing && this.pricing.ingredients && this.pricing.cookingCosts && this.pricing.packaging) {
    // Total cost = ingredients + cooking + packaging (delivery calculated at checkout)
    this.pricing.totalCosts = this.pricing.ingredients + this.pricing.cookingCosts + this.pricing.packaging;
    
    // Profit = 40% of total cost
    this.pricing.profit = this.pricing.totalCosts * 0.4;
    
    // Final price = total cost + profit + platform fee
    this.pricing.totalPrice = this.pricing.totalCosts + this.pricing.profit + (this.pricing.platformFee || 0);
    
    // Chef gets: ingredients + cooking cost + 50% of profit
    this.pricing.chefEarnings = this.pricing.ingredients + this.pricing.cookingCosts + (this.pricing.profit * 0.5);
    
    // Choma gets: platform fee + packaging + 50% of profit (delivery added at checkout)
    this.pricing.chomaEarnings = (this.pricing.platformFee || 0) + this.pricing.packaging + (this.pricing.profit * 0.5);
  }
  
  // Update the updatedAt timestamp
  this.updatedAt = new Date();
  
  next();
});

// Method to update pricing
MealSchema.methods.updatePricing = function(ingredients, cookingCosts, packaging, platformFee) {
  // Total cost = ingredients + cooking + packaging (delivery calculated at checkout)
  const totalCosts = ingredients + cookingCosts + packaging;
  
  // Profit = 40% of total cost
  const profit = totalCosts * 0.4;
  
  // Final price = total cost + profit + platform fee
  const totalPrice = totalCosts + profit + platformFee;
  
  // Chef gets: ingredients + cooking cost + 50% of profit
  const chefEarnings = ingredients + cookingCosts + (profit * 0.5);
  
  // Choma gets: platform fee + packaging + 50% of profit
  const chomaEarnings = platformFee + packaging + (profit * 0.5);
  
  this.pricing = {
    ingredients,
    cookingCosts,
    packaging,
    platformFee,
    totalCosts,
    profit,
    totalPrice,
    chefEarnings,
    chomaEarnings
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
