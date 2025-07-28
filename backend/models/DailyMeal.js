const mongoose = require('mongoose');

// This is now the Meal model for individual food items
const MealSchema = new mongoose.Schema({
  mealId: { type: String, unique: true },
  name: { type: String, required: true },
  image: { type: String, default: '' },
  
  // New pricing structure
  pricing: {
    basePrice: { type: Number, required: true },
    platformFee: { type: Number, required: true },
    chefFee: { type: Number, required: true },
    totalPrice: { type: Number, required: true }
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
  
  // Calculate total price if components are provided
  if (this.pricing && this.pricing.basePrice && this.pricing.platformFee && this.pricing.chefFee) {
    this.pricing.totalPrice = this.pricing.basePrice + this.pricing.platformFee + this.pricing.chefFee;
  }
  
  // Update the updatedAt timestamp
  this.updatedAt = new Date();
  
  next();
});

// Method to update pricing
MealSchema.methods.updatePricing = function(basePrice, platformFee, chefFee) {
  this.pricing = {
    basePrice,
    platformFee,
    chefFee,
    totalPrice: basePrice + platformFee + chefFee
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
