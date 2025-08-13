const MealPlan = require('../models/MealPlan');
const DailyMeal = require('../models/DailyMeal');
const Subscription = require('../models/Subscription');
const { uploadMealPlanMainImage, uploadMealImages, deleteImageFromCloudinary, extractPublicIdFromUrl } = require('../utils/imageUpload');
const mongoose = require('mongoose');

// ============= ENHANCED MEAL PLAN MANAGEMENT =============

// Get all meal plans with advanced filtering
exports.getAllMealPlans = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const search = req.query.search || '';
    const planType = req.query.planType || '';
    const isActive = req.query.isActive;
    const sortBy = req.query.sortBy || 'createdAt';
    const sortOrder = req.query.sortOrder === 'asc' ? 1 : -1;
    const priceRange = req.query.priceRange; // format: "min,max"

    const skip = (page - 1) * limit;

    // Build query
    let query = {};
    
    // Search functionality
    if (search) {
      query.$or = [
        { planName: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { planType: { $regex: search, $options: 'i' } }
      ];
    }
    
    // Filter by plan type
    if (planType) {
      query.planType = planType;
    }
    
    // Filter by active status
    if (isActive !== undefined) {
      query.isActive = isActive === 'true';
    }
    
    // Price range filter
    if (priceRange) {
      const [min, max] = priceRange.split(',').map(Number);
      if (min !== undefined && max !== undefined) {
        query['pricing.weekly'] = { $gte: min, $lte: max };
      }
    }

    // Build sort object
    const sortObj = {};
    sortObj[sortBy] = sortOrder;

    // Execute query with aggregation for additional stats
    const mealPlans = await MealPlan.aggregate([
      { $match: query },
      {
        $lookup: {
          from: 'subscriptions',
          localField: '_id',
          foreignField: 'mealPlanId',
          as: 'subscriptions'
        }
      },
      {
        $lookup: {
          from: 'dailymeals',
          localField: '_id',
          foreignField: 'mealPlan',
          as: 'dailyMeals'
        }
      },
      {
        $addFields: {
          totalSubscriptions: { $size: '$subscriptions' },
          activeSubscriptions: {
            $size: {
              $filter: {
                input: '$subscriptions',
                as: 'sub',
                cond: { $eq: ['$$sub.status', 'Active'] }
              }
            }
          },
          totalDailyMeals: { $size: '$dailyMeals' },
          revenue: {
            $sum: {
              $map: {
                input: {
                  $filter: {
                    input: '$subscriptions',
                    as: 'sub',
                    cond: { $eq: ['$$sub.paymentStatus', 'Paid'] }
                  }
                },
                as: 'paidSub',
                in: '$$paidSub.amount'
              }
            }
          }
        }
      },
      {
        $project: {
          subscriptions: 0,
          dailyMeals: 0
        }
      },
      { $sort: sortObj },
      { $skip: skip },
      { $limit: limit }
    ]);

    const total = await MealPlan.countDocuments(query);

    // Get meal plan statistics
    const stats = await MealPlan.aggregate([
      {
        $group: {
          _id: null,
          totalPlans: { $sum: 1 },
          activePlans: {
            $sum: { $cond: [{ $eq: ['$isActive', true] }, 1, 0] }
          },
          inactivePlans: {
            $sum: { $cond: [{ $eq: ['$isActive', false] }, 1, 0] }
          },
          averagePrice: { $avg: '$pricing.weekly' }
        }
      }
    ]);

    const planTypeStats = await MealPlan.aggregate([
      {
        $group: {
          _id: '$planType',
          count: { $sum: 1 }
        }
      }
    ]);

    res.json({
      success: true,
      data: {
        mealPlans,
        stats: stats[0] || {},
        planTypeStats: planTypeStats.reduce((acc, stat) => {
          acc[stat._id] = stat.count;
          return acc;
        }, {})
      },
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalPlans: total,
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1,
        limit
      }
    });
  } catch (err) {
    console.error('Get all meal plans error:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch meal plans',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};

// Get single meal plan details
exports.getMealPlanDetails = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid meal plan ID'
      });
    }

    const mealPlan = await MealPlan.findById(id).lean();
    
    if (!mealPlan) {
      return res.status(404).json({
        success: false,
        message: 'Meal plan not found'
      });
    }

    // Get daily meals for this plan
    const dailyMeals = await DailyMeal.find({ mealPlan: id })
      .sort({ day: 1 })
      .lean();

    // Get subscriptions for this plan
    const subscriptions = await Subscription.find({ mealPlanId: id })
      .populate('customer', 'fullName email')
      .sort({ subscriptionDate: -1 })
      .limit(10)
      .lean();

    // Calculate analytics
    const analytics = await Subscription.aggregate([
      { $match: { mealPlanId: mongoose.Types.ObjectId(id) } },
      {
        $group: {
          _id: null,
          totalSubscriptions: { $sum: 1 },
          activeSubscriptions: {
            $sum: { $cond: [{ $eq: ['$status', 'Active'] }, 1, 0] }
          },
          totalRevenue: {
            $sum: { $cond: [{ $eq: ['$paymentStatus', 'Paid'] }, '$amount', 0] }
          },
          averageRating: { $avg: '$rating' }
        }
      }
    ]);

    res.json({
      success: true,
      data: {
        mealPlan,
        dailyMeals,
        recentSubscriptions: subscriptions,
        analytics: analytics[0] || {
          totalSubscriptions: 0,
          activeSubscriptions: 0,
          totalRevenue: 0,
          averageRating: 0
        }
      }
    });
  } catch (err) {
    console.error('Get meal plan details error:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch meal plan details',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};

// Create new meal plan
exports.createMealPlan = async (req, res) => {
  try {
    const {
      planName,
      description,
      targetAudience,
      durationWeeks,
      mealTypes,
      planFeatures,
      adminNotes,
      coverImage,
      isActive = true
    } = req.body;

    // Validate required fields
    if (!planName || !description) {
      return res.status(400).json({
        success: false,
        message: 'Plan name and description are required'
      });
    }

    // Validate mealTypes if provided
    if (mealTypes && mealTypes.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'At least one meal type must be selected'
      });
    }

    // Check if plan name already exists
    const existingPlan = await MealPlan.findOne({ 
      planName: { $regex: new RegExp(`^${planName}$`, 'i') }
    });
    
    if (existingPlan) {
      return res.status(409).json({
        success: false,
        message: 'Meal plan with this name already exists'
      });
    }

    // Handle main image upload
    let mainImageUrl = null;
    if (req.files && req.files.mainImage) {
      const uploadResult = await uploadMealPlanMainImage(req.files.mainImage[0]);
      if (uploadResult.success) {
        mainImageUrl = uploadResult.url;
      }
    }

    // Create meal plan
    const mealPlan = new MealPlan({
      planName: planName.trim(),
      description: description.trim(),
      targetAudience: targetAudience || 'Family',
      durationWeeks: durationWeeks || 4,
      mealTypes: mealTypes || ['breakfast', 'lunch', 'dinner'],
      planFeatures: planFeatures || [],
      adminNotes: adminNotes || '',
      coverImage: coverImage || '',
      isActive
    });

    await mealPlan.save();

    res.status(201).json({
      success: true,
      message: 'Meal plan created successfully',
      data: mealPlan
    });
  } catch (err) {
    console.error('Create meal plan error:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to create meal plan',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};

// Update meal plan
exports.updateMealPlan = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid meal plan ID'
      });
    }

    const existingPlan = await MealPlan.findById(id);
    if (!existingPlan) {
      return res.status(404).json({
        success: false,
        message: 'Meal plan not found'
      });
    }

    // Check if new plan name conflicts with existing plans
    if (updateData.planName && updateData.planName !== existingPlan.planName) {
      const conflictingPlan = await MealPlan.findOne({
        planName: { $regex: new RegExp(`^${updateData.planName}$`, 'i') },
        _id: { $ne: id }
      });
      
      if (conflictingPlan) {
        return res.status(409).json({
          success: false,
          message: 'Another meal plan with this name already exists'
        });
      }
    }

    // Handle main image update
    if (req.files && req.files.mainImage) {
      // Delete old image if exists
      if (existingPlan.mainImageUrl) {
        const publicId = extractPublicIdFromUrl(existingPlan.mainImageUrl);
        if (publicId) {
          await deleteImageFromCloudinary(publicId);
        }
      }
      
      // Upload new image
      const uploadResult = await uploadMealPlanMainImage(req.files.mainImage[0]);
      if (uploadResult.success) {
        updateData.mainImageUrl = uploadResult.url;
      }
    }

    // Update timestamp
    updateData.updatedAt = new Date();

    const updatedPlan = await MealPlan.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    );

    res.json({
      success: true,
      message: 'Meal plan updated successfully',
      data: updatedPlan
    });
  } catch (err) {
    console.error('Update meal plan error:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to update meal plan',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};

// Delete meal plan
exports.deleteMealPlan = async (req, res) => {
  try {
    const { id } = req.params;
    const { force = false } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid meal plan ID'
      });
    }

    const mealPlan = await MealPlan.findById(id);
    if (!mealPlan) {
      return res.status(404).json({
        success: false,
        message: 'Meal plan not found'
      });
    }

    // Check for active subscriptions
    const activeSubscriptions = await Subscription.countDocuments({
      mealPlanId: id,
      status: 'Active'
    });

    if (activeSubscriptions > 0 && !force) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete meal plan with ${activeSubscriptions} active subscriptions. Use force=true to proceed.`
      });
    }

    // Delete associated daily meals
    await DailyMeal.deleteMany({ mealPlan: id });

    // Cancel active subscriptions if force delete
    if (force && activeSubscriptions > 0) {
      await Subscription.updateMany(
        { mealPlanId: id, status: 'Active' },
        { 
          status: 'Cancelled',
          cancelledAt: new Date(),
          cancellationReason: 'Meal plan deleted'
        }
      );
    }

    // Delete main image from Cloudinary
    if (mealPlan.mainImageUrl) {
      const publicId = extractPublicIdFromUrl(mealPlan.mainImageUrl);
      if (publicId) {
        await deleteImageFromCloudinary(publicId);
      }
    }

    // Delete the meal plan
    await MealPlan.findByIdAndDelete(id);

    res.json({
      success: true,
      message: 'Meal plan deleted successfully',
      data: {
        deletedPlanId: id,
        deletedPlanName: mealPlan.planName,
        cancelledSubscriptions: force ? activeSubscriptions : 0
      }
    });
  } catch (err) {
    console.error('Delete meal plan error:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to delete meal plan',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};

// Duplicate meal plan
exports.duplicateMealPlan = async (req, res) => {
  try {
    const { id } = req.params;
    const { newName } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid meal plan ID'
      });
    }

    const originalPlan = await MealPlan.findById(id);
    if (!originalPlan) {
      return res.status(404).json({
        success: false,
        message: 'Meal plan not found'
      });
    }

    // Check if new name conflicts
    const duplicateName = newName || `${originalPlan.planName} (Copy)`;
    const existingPlan = await MealPlan.findOne({
      planName: { $regex: new RegExp(`^${duplicateName}$`, 'i') }
    });
    
    if (existingPlan) {
      return res.status(409).json({
        success: false,
        message: 'Meal plan with this name already exists'
      });
    }

    // Create duplicate
    const duplicatePlan = new MealPlan({
      ...originalPlan.toObject(),
      _id: new mongoose.Types.ObjectId(),
      planName: duplicateName,
      isActive: false, // Start as inactive
      createdAt: new Date(),
      updatedAt: new Date()
    });

    await duplicatePlan.save();

    // Duplicate daily meals
    const originalDailyMeals = await DailyMeal.find({ mealPlan: id });
    if (originalDailyMeals.length > 0) {
      const duplicateDailyMeals = originalDailyMeals.map(meal => ({
        ...meal.toObject(),
        _id: new mongoose.Types.ObjectId(),
        mealPlan: duplicatePlan._id
      }));
      
      await DailyMeal.insertMany(duplicateDailyMeals);
    }

    res.status(201).json({
      success: true,
      message: 'Meal plan duplicated successfully',
      data: duplicatePlan
    });
  } catch (err) {
    console.error('Duplicate meal plan error:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to duplicate meal plan',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};

// Toggle meal plan status
exports.toggleMealPlanStatus = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid meal plan ID'
      });
    }

    const mealPlan = await MealPlan.findById(id);
    if (!mealPlan) {
      return res.status(404).json({
        success: false,
        message: 'Meal plan not found'
      });
    }

    const newStatus = !mealPlan.isActive;
    
    // If deactivating, check for active subscriptions
    if (!newStatus) {
      const activeSubscriptions = await Subscription.countDocuments({
        mealPlanId: id,
        status: 'Active'
      });
      
      if (activeSubscriptions > 0) {
        return res.status(400).json({
          success: false,
          message: `Cannot deactivate meal plan with ${activeSubscriptions} active subscriptions`
        });
      }
    }

    const updatedPlan = await MealPlan.findByIdAndUpdate(
      id,
      { 
        isActive: newStatus,
        updatedAt: new Date()
      },
      { new: true }
    );

    res.json({
      success: true,
      message: `Meal plan ${newStatus ? 'activated' : 'deactivated'} successfully`,
      data: updatedPlan
    });
  } catch (err) {
    console.error('Toggle meal plan status error:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to toggle meal plan status',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};

// Publish meal plan
exports.publishMealPlan = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid meal plan ID'
      });
    }

    const mealPlan = await MealPlan.findById(id);
    if (!mealPlan) {
      return res.status(404).json({
        success: false,
        message: 'Meal plan not found'
      });
    }

    // Check if meal plan has assignments
    const MealPlanAssignment = mongoose.model('MealPlanAssignment');
    const assignmentCount = await MealPlanAssignment.countDocuments({ mealPlanId: id });
    
    if (assignmentCount === 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot publish meal plan without meal assignments'
      });
    }

    const updatedPlan = await MealPlan.findByIdAndUpdate(
      id,
      { isPublished: true },
      { new: true }
    );

    res.json({
      success: true,
      message: 'Meal plan published successfully',
      data: updatedPlan
    });
  } catch (err) {
    console.error('Publish meal plan error:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to publish meal plan',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};

// Unpublish meal plan
exports.unpublishMealPlan = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid meal plan ID'
      });
    }

    const mealPlan = await MealPlan.findById(id);
    if (!mealPlan) {
      return res.status(404).json({
        success: false,
        message: 'Meal plan not found'
      });
    }

    const updatedPlan = await MealPlan.findByIdAndUpdate(
      id,
      { isPublished: false },
      { new: true }
    );

    res.json({
      success: true,
      message: 'Meal plan unpublished successfully',
      data: updatedPlan
    });
  } catch (err) {
    console.error('Unpublish meal plan error:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to unpublish meal plan',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};

// Get meal plan analytics
exports.getMealPlanAnalytics = async (req, res) => {
  try {
    const { period = '30d' } = req.query;
    
    let dateRange = {};
    const now = new Date();
    
    switch (period) {
      case '7d':
        dateRange = { $gte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) };
        break;
      case '30d':
        dateRange = { $gte: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000) };
        break;
      case '90d':
        dateRange = { $gte: new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000) };
        break;
    }

    // Most popular meal plans
    const popularPlans = await Subscription.aggregate([
      { $match: { subscriptionDate: dateRange } },
      {
        $group: {
          _id: '$mealPlanId',
          subscriptions: { $sum: 1 },
          revenue: {
            $sum: { $cond: [{ $eq: ['$paymentStatus', 'Paid'] }, '$amount', 0] }
          }
        }
      },
      {
        $lookup: {
          from: 'mealplans',
          localField: '_id',
          foreignField: '_id',
          as: 'mealPlan'
        }
      },
      { $unwind: '$mealPlan' },
      { $sort: { subscriptions: -1 } },
      { $limit: 10 }
    ]);

    // Plan type distribution
    const planTypeDistribution = await MealPlan.aggregate([
      {
        $group: {
          _id: '$planType',
          count: { $sum: 1 },
          activeCount: {
            $sum: { $cond: [{ $eq: ['$isActive', true] }, 1, 0] }
          }
        }
      }
    ]);

    // Revenue by plan
    const revenueByPlan = await Subscription.aggregate([
      { 
        $match: { 
          subscriptionDate: dateRange,
          paymentStatus: 'Paid'
        }
      },
      {
        $group: {
          _id: '$mealPlanId',
          revenue: { $sum: '$amount' },
          subscriptions: { $sum: 1 }
        }
      },
      {
        $lookup: {
          from: 'mealplans',
          localField: '_id',
          foreignField: '_id',
          as: 'mealPlan'
        }
      },
      { $unwind: '$mealPlan' },
      { $sort: { revenue: -1 } }
    ]);

    res.json({
      success: true,
      data: {
        period,
        popularPlans,
        planTypeDistribution,
        revenueByPlan
      }
    });
  } catch (err) {
    console.error('Get meal plan analytics error:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch meal plan analytics',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};

module.exports = exports;