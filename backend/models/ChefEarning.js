const mongoose = require('mongoose');

const ChefEarningSchema = new mongoose.Schema({
  chef: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Chef',
    required: true
  },
  order: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    required: true
  },
  
  // Earnings details
  cookingFee: {
    type: Number,
    required: true,
    min: 0
  },
  orderTotal: {
    type: Number,
    required: true,
    min: 0
  },
  chefPercentage: {
    type: Number,
    default: 85, // 85% goes to chef, 15% platform fee
    min: 0,
    max: 100
  },
  
  // Status tracking
  status: {
    type: String,
    enum: ['pending', 'paid', 'cancelled'],
    default: 'pending'
  },
  
  // Weekly payout tracking
  weekStartDate: {
    type: Date,
    required: true
  },
  weekEndDate: {
    type: Date,
    required: true
  },
  payoutDate: {
    type: Date,
    default: null // Will be set when paid
  },
  payoutReference: {
    type: String,
    default: null // Bank transfer reference
  },
  
  // Timestamps
  earnedDate: {
    type: Date,
    default: Date.now
  },
  completedDate: {
    type: Date,
    required: true // When order was marked as completed
  }
}, {
  timestamps: true
});

// Index for efficient queries
ChefEarningSchema.index({ chef: 1, weekStartDate: 1 });
ChefEarningSchema.index({ chef: 1, status: 1 });
ChefEarningSchema.index({ status: 1, weekStartDate: 1 });

// Helper method to get week start (Monday)
ChefEarningSchema.statics.getWeekStart = function(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
  return new Date(d.setDate(diff));
};

// Helper method to get week end (Sunday)
ChefEarningSchema.statics.getWeekEnd = function(date) {
  const weekStart = this.getWeekStart(date);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  return weekEnd;
};

// Method to calculate next Friday payout date
ChefEarningSchema.statics.getNextFridayPayout = function(date) {
  const d = new Date(date);
  const day = d.getDay();
  const daysUntilFriday = (5 - day + 7) % 7 || 7; // Friday is day 5
  const friday = new Date(d);
  friday.setDate(d.getDate() + daysUntilFriday);
  return friday;
};

module.exports = mongoose.model('ChefEarning', ChefEarningSchema);