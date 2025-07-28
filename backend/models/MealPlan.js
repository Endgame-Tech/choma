const mongoose = require('mongoose');

const MealPlanSchema = new mongoose.Schema({
  planId: { 
    type: String, 
    unique: true 
  },
  planName: { 
    type: String, 
    required: true 
  },
  description: String,
  targetAudience: { 
    type: String, 
    enum: ['Fitness', 'Professional', 'Family', 'Wellness'] 
  },
  
  // New pricing system - calculated from assigned meals
  totalPrice: {
    type: Number,
    default: 0
  },
  
  // New duration system - configurable weeks
  durationWeeks: {
    type: Number,
    min: 1,
    max: 4,
    required: true,
    default: 4
  },
  
  // Publishing system
  isPublished: {
    type: Boolean,
    default: false
  },
  
  // Cover image for meal plan
  coverImage: {
    type: String,
    default: ''
  },
  
  isActive: { 
    type: Boolean, 
    default: true 
  },
  sortOrder: Number,
  createdDate: { 
    type: Date, 
    default: Date.now 
  },
  lastModified: { 
    type: Date, 
    default: Date.now 
  },
  
  // Enhanced fields for comprehensive meal planning
  planFeatures: [String],
  planImage: String, // Legacy field for compatibility
  planImageUrl: String, // Legacy field - use coverImage instead
  galleryImages: [String],
  
  // Nutrition information - calculated from assigned meals
  nutritionInfo: {
    totalCalories: { type: Number, default: 0 },
    avgCaloriesPerDay: { type: Number, default: 0 },
    avgCaloriesPerMeal: { type: Number, default: 0 },
    totalProtein: { type: Number, default: 0 },
    totalCarbs: { type: Number, default: 0 },
    totalFat: { type: Number, default: 0 },
    totalFiber: { type: Number, default: 0 }
  },
  
  // Common allergens in the plan
  allergens: [String],
  
  // Chef notes and special instructions
  chefNotes: String,
  
  // Admin notes for this meal plan
  adminNotes: {
    type: String,
    default: ''
  },
  
  // Statistics - calculated fields
  stats: {
    totalMealsAssigned: { type: Number, default: 0 },
    totalDays: { type: Number, default: 0 },
    avgMealsPerDay: { type: Number, default: 0 }
  },
  
  // Business metrics
  totalSubscriptions: {
    type: Number,
    default: 0
  },
  avgRating: {
    type: Number,
    default: 0,
    min: 0,
    max: 5
  },
  totalReviews: {
    type: Number,
    default: 0
  }
});

// Pre-save middleware to generate planId
MealPlanSchema.pre('save', async function(next) {
  if (!this.planId) {
    // Find the highest existing planId number
    const lastPlan = await mongoose.model('MealPlan')
      .findOne({}, { planId: 1 })
      .sort({ planId: -1 })
      .exec();
    
    let nextNumber = 1;
    if (lastPlan && lastPlan.planId) {
      const match = lastPlan.planId.match(/MP(\d+)/);
      if (match) {
        nextNumber = parseInt(match[1]) + 1;
      }
    }
    
    this.planId = `MP${String(nextNumber).padStart(3, '0')}`;
  }
  
  // Update lastModified on save
  this.lastModified = new Date();
  next();
});

// Virtual for price per meal
MealPlanSchema.virtual('pricePerMeal').get(function() {
  if (this.basePrice && this.mealsPerWeek) {
    return Math.round(this.basePrice / this.mealsPerWeek);
  }
  return 0;
});

// Method to calculate total days in plan
MealPlanSchema.methods.getTotalDays = function() {
  return this.durationWeeks * 7;
};

// Method to publish/unpublish plan
MealPlanSchema.methods.publish = function() {
  this.isPublished = true;
  return this.save();
};

MealPlanSchema.methods.unpublish = function() {
  this.isPublished = false;
  return this.save();
};

// Method to update calculated fields (will be called when meals are assigned)
MealPlanSchema.methods.updateCalculatedFields = async function() {
  const MealPlanAssignment = mongoose.model('MealPlanAssignment');
  
  // Get all assignments for this meal plan
  const assignments = await MealPlanAssignment.find({ mealPlanId: this._id })
    .populate('mealIds');
  
  // Calculate totals
  let totalPrice = 0;
  let totalCalories = 0;
  let totalMeals = assignments.length;
  
  assignments.forEach(assignment => {
    if (assignment.mealIds && assignment.mealIds.length > 0) {
      assignment.mealIds.forEach(meal => {
        if (meal && meal.pricing) {
          totalPrice += meal.pricing.totalPrice || 0;
          totalCalories += meal.nutrition?.calories || 0;
        }
      });
    }
  });
  
  // Update calculated fields
  this.totalPrice = totalPrice;
  this.nutritionInfo.totalCalories = totalCalories;
  this.nutritionInfo.avgCaloriesPerMeal = totalMeals > 0 ? Math.round(totalCalories / totalMeals) : 0;
  this.nutritionInfo.avgCaloriesPerDay = Math.round(totalCalories / this.getTotalDays());
  
  this.stats.totalMealsAssigned = totalMeals;
  this.stats.totalDays = this.getTotalDays();
  this.stats.avgMealsPerDay = totalMeals > 0 ? Math.round(totalMeals / this.getTotalDays()) : 0;
  
  return this.save();
};

// Static method to find plans by target audience
MealPlanSchema.statics.findByAudience = function(audience) {
  return this.find({ targetAudience: audience, isActive: true });
};

// Static method to find plans within price range
MealPlanSchema.statics.findByPriceRange = function(minPrice, maxPrice) {
  return this.find({ 
    basePrice: { $gte: minPrice, $lte: maxPrice }, 
    isActive: true 
  });
};

// Ensure virtuals are included in JSON output
MealPlanSchema.set('toJSON', { virtuals: true });
MealPlanSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('MealPlan', MealPlanSchema);