const mongoose = require('mongoose');

const TagSchema = new mongoose.Schema({
  tagId: {
    type: String,
    unique: true,
  },
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 50,
  },
  image: {
    type: String,
    required: true,
  },
  bigPreviewImage: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    required: true,
    maxlength: 200,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  sortOrder: {
    type: Number,
    default: 0,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// Pre-save middleware to generate tagId
TagSchema.pre('save', async function (next) {
  if (!this.tagId) {
    // Find the highest existing tagId number
    const lastTag = await mongoose
      .model('Tag')
      .findOne({}, { tagId: 1 })
      .sort({ tagId: -1 })
      .exec();

    let nextNumber = 1;
    if (lastTag && lastTag.tagId) {
      const match = lastTag.tagId.match(/TAG(\d+)/);
      if (match) {
        nextNumber = parseInt(match[1]) + 1;
      }
    }

    this.tagId = `TAG${String(nextNumber).padStart(3, '0')}`;
  }

  // Update timestamp
  this.updatedAt = new Date();
  next();
});

// Static method to find active tags
TagSchema.statics.findActive = function () {
  return this.find({ isActive: true }).sort({ sortOrder: 1, name: 1 });
};

// Method to get meal plan count for this tag
TagSchema.methods.getMealPlanCount = async function () {
  const MealPlan = mongoose.model('MealPlan');
  return await MealPlan.countDocuments({
    tagId: this._id,
    isActive: true,
    isPublished: true,
  });
};

// Indexes for efficient querying
TagSchema.index({ name: 1 });
TagSchema.index({ isActive: 1, sortOrder: 1 });

module.exports = mongoose.model('Tag', TagSchema);