const mongoose = require('mongoose');

const discountRuleSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  description: {
    type: String,
    trim: true,
  },
  discountPercent: {
    type: Number,
    required: true,
    min: 0,
    max: 100,
  },
  targetSegment: {
    type: String,
    required: true,
    enum: [
      'first_time',
      'inactive_6_months',
      'inactive_1_year',
      'loyal_consistent',
      'high_value',
      'long_streak',
      'new_registrant',
      'seasonal',
      'all_users',
    ],
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  validFrom: {
    type: Date,
  },
  validUntil: {
    type: Date,
  },
  criteria: {
    minSpent: { type: Number },
    minStreak: { type: Number },
    withinDays: { type: Number },
    seasonName: { type: String },
    seasonStart: { type: Date },
    seasonEnd: { type: Date },
  },
  applyToAllMealPlans: {
    type: Boolean,
    default: true,
  },
  applicableMealPlans: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'MealPlan',
  }],
  applicableCategories: [{
    type: String,
  }],
  applicableTags: [{
    type: String,
  }],
}, { timestamps: true });

module.exports = mongoose.model('DiscountRule', discountRuleSchema);
