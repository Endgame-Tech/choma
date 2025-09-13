const mongoose = require('mongoose');

// Junction table for assigning meals to meal plans with scheduling info
const MealPlanAssignmentSchema = new mongoose.Schema({
  assignmentId: { 
    type: String, 
    unique: true 
  },
  
  // References
  mealPlanId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'MealPlan', 
    required: true 
  },
  mealIds: [{ 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Meal', 
    required: true 
  }],
  
  // Custom title and description for this meal combination
  customTitle: {
    type: String,
    required: true
  },
  customDescription: {
    type: String,
    default: ''
  },
  imageUrl: {
    type: String,
    default: ''
  },
  
  // Scheduling information
  weekNumber: { 
    type: Number, 
    min: 1, 
    max: 4, 
    required: true 
  },
  dayOfWeek: { 
    type: Number, 
    min: 1, 
    max: 7, // 1=Monday, 7=Sunday
    required: true 
  },
  mealTime: { 
    type: String, 
    enum: ['breakfast', 'lunch', 'dinner'], 
    required: true 
  },
  
  // Additional assignment info
  notes: {
    type: String,
    default: ''
  },
  
  // Assignment metadata
  assignedBy: {
    type: String,
    default: 'admin'
  },
  
  // Timestamps
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Auto-generate assignmentId before saving
MealPlanAssignmentSchema.pre('save', async function(next) {
  if (!this.assignmentId) {
    // Use timestamp + random suffix to avoid collisions
    const timestamp = Date.now();
    const randomSuffix = Math.random().toString(36).substr(2, 4);
    this.assignmentId = `MPA-${timestamp}-${randomSuffix}`;
  }
  
  // Update timestamp
  this.updatedAt = new Date();
  
  next();
});

// Post-save middleware to update meal plan calculated fields
MealPlanAssignmentSchema.post('save', async function() {
  const MealPlan = mongoose.model('MealPlan');
  const mealPlan = await MealPlan.findById(this.mealPlanId);
  if (mealPlan) {
    await mealPlan.updateCalculatedFields();
  }
});

// Post-remove middleware to update meal plan calculated fields
MealPlanAssignmentSchema.post('remove', async function() {
  const MealPlan = mongoose.model('MealPlan');
  const mealPlan = await MealPlan.findById(this.mealPlanId);
  if (mealPlan) {
    await mealPlan.updateCalculatedFields();
  }
});

// Static method to get meal plan schedule
MealPlanAssignmentSchema.statics.getMealPlanSchedule = function(mealPlanId) {
  return this.find({ mealPlanId })
    .populate('mealIds')
    .sort({ weekNumber: 1, dayOfWeek: 1, mealTime: 1 });
};

// Static method to get assignments for specific week
MealPlanAssignmentSchema.statics.getWeekSchedule = function(mealPlanId, weekNumber) {
  return this.find({ mealPlanId, weekNumber })
    .populate('mealIds')
    .sort({ dayOfWeek: 1, mealTime: 1 });
};

// Static method to check if slot is occupied
MealPlanAssignmentSchema.statics.isSlotOccupied = function(mealPlanId, weekNumber, dayOfWeek, mealTime) {
  return this.findOne({ mealPlanId, weekNumber, dayOfWeek, mealTime });
};

// Static method to replace meal in slot
MealPlanAssignmentSchema.statics.replaceSlot = async function(mealPlanId, weekNumber, dayOfWeek, mealTime, mealIds, customTitle, customDescription = '', imageUrl = '', notes = '') {
  // Remove existing assignment if any
  await this.deleteOne({ mealPlanId, weekNumber, dayOfWeek, mealTime });
  
  // Create new assignment
  return this.create({
    mealPlanId,
    mealIds,
    customTitle,
    customDescription,
    imageUrl,
    weekNumber,
    dayOfWeek,
    mealTime,
    notes
  });
};

// Method to get day name from day number
MealPlanAssignmentSchema.methods.getDayName = function() {
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  return days[this.dayOfWeek - 1];
};

// Method to get formatted meal time
MealPlanAssignmentSchema.methods.getFormattedMealTime = function() {
  return this.mealTime.charAt(0).toUpperCase() + this.mealTime.slice(1);
};

// Compound indexes for efficient querying
MealPlanAssignmentSchema.index({ mealPlanId: 1, weekNumber: 1, dayOfWeek: 1, mealTime: 1 }, { unique: true });
MealPlanAssignmentSchema.index({ mealId: 1 });
MealPlanAssignmentSchema.index({ mealPlanId: 1, createdAt: -1 });

module.exports = mongoose.model('MealPlanAssignment', MealPlanAssignmentSchema);