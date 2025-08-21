const mongoose = require('mongoose');

const PromoBannerSchema = new mongoose.Schema({
  bannerId: {
    type: String,
    unique: true
  },
  title: {
    type: String,
    required: true,
    maxlength: 100
  },
  subtitle: {
    type: String,
    maxlength: 200
  },
  imageUrl: {
    type: String,
    required: true
  },
  ctaText: {
    type: String,
    required: true,
    maxlength: 50
  },
  ctaDestination: {
    type: String,
    required: true,
    enum: [
      'Search',
      'MealPlans', 
      'MealPlanDetail',
      'Profile',
      'Orders',
      'Support',
      'External'
    ]
  },
  ctaParams: {
    type: mongoose.Schema.Types.Mixed,
    default: null
  },
  externalUrl: {
    type: String,
    default: null
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isPublished: {
    type: Boolean,
    default: false,
    index: true
  },
  priority: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  startDate: {
    type: Date,
    default: Date.now
  },
  endDate: {
    type: Date,
    default: null
  },
  targetAudience: {
    type: String,
    enum: ['all', 'new_users', 'existing_users', 'subscribers', 'non_subscribers'],
    default: 'all'
  },
  impressions: {
    type: Number,
    default: 0
  },
  clicks: {
    type: Number,
    default: 0
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Pre-save middleware to generate bannerId and update timestamps
PromoBannerSchema.pre('save', async function(next) {
  if (!this.bannerId) {
    const lastBanner = await mongoose.model('PromoBanner')
      .findOne({}, { bannerId: 1 })
      .sort({ bannerId: -1 })
      .exec();
    
    let nextNumber = 1;
    if (lastBanner && lastBanner.bannerId) {
      const match = lastBanner.bannerId.match(/PB(\d+)/);
      if (match) {
        nextNumber = parseInt(match[1]) + 1;
      }
    }
    
    this.bannerId = `PB${String(nextNumber).padStart(3, '0')}`;
  }
  
  this.updatedAt = new Date();
  next();
});

// Virtual for click-through rate
PromoBannerSchema.virtual('ctr').get(function() {
  if (this.impressions === 0) return 0;
  return Math.round((this.clicks / this.impressions) * 100 * 100) / 100;
});

// Method to check if banner is currently active
PromoBannerSchema.methods.isCurrentlyActive = function() {
  if (!this.isActive) return false;
  
  const now = new Date();
  if (this.startDate && now < this.startDate) return false;
  if (this.endDate && now > this.endDate) return false;
  
  return true;
};

// Method to increment impressions
PromoBannerSchema.methods.trackImpression = function() {
  this.impressions += 1;
  return this.save();
};

// Method to increment clicks
PromoBannerSchema.methods.trackClick = function() {
  this.clicks += 1;
  return this.save();
};

// Static method to get active banners
PromoBannerSchema.statics.getActiveBanners = function(targetAudience = 'all') {
  const now = new Date();
  
  const query = {
    isActive: true,
    isPublished: true, // Only show published banners in mobile app
    $and: [
      {
        $or: [
          { startDate: { $lte: now } },
          { startDate: null }
        ]
      },
      {
        $or: [
          { endDate: { $gte: now } },
          { endDate: null }
        ]
      }
    ]
  };

  if (targetAudience !== 'all') {
    query.$and.push({
      $or: [
        { targetAudience: 'all' },
        { targetAudience: targetAudience }
      ]
    });
  }

  return this.find(query).sort({ priority: -1, createdAt: -1 });
};

// Ensure virtuals are included in JSON output
PromoBannerSchema.set('toJSON', { virtuals: true });
PromoBannerSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('PromoBanner', PromoBannerSchema);