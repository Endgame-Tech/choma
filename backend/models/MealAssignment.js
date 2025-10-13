const mongoose = require('mongoose');

const MealAssignmentSchema = new mongoose.Schema({
  subscriptionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Subscription',
    required: true,
  },
  dailyMealId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'DailyMeal',
    required: true,
  },
  dayNumber: {
    type: Number,
    required: true,
  },
  deliveryDate: {
    type: Date,
    required: true,
  },
  status: {
    type: String,
    enum: ['pending', 'delivered', 'skipped'],
    default: 'pending',
  },
}, { timestamps: true });

MealAssignmentSchema.index({ subscriptionId: 1, dayNumber: 1 }, { unique: true });

module.exports = mongoose.model('MealAssignment', MealAssignmentSchema);
