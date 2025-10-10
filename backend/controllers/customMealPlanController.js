// backend/controllers/customMealPlanController.js
const CustomMealPlan = require("../models/CustomMealPlan");
const SystemSettings = require("../models/SystemSettings");
const { generateCustomMealPlan } = require("../utils/mealMatchingAlgorithm");

// @desc    Get all custom meal plans (Admin only)
// @route   GET /api/admin/custom-meal-plans
// @access  Private/Admin
exports.getAllCustomPlans = async (req, res) => {
  try {
    const { status, healthGoal, search, startDate, endDate, page = 1, limit = 50 } = req.query;

    let query = {};

    // Filters
    if (status) query.status = status;
    if (healthGoal) query['preferences.healthGoal'] = healthGoal;

    // Date range filter
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    // Search by plan ID or user info
    if (search) {
      query.$or = [
        { customPlanId: { $regex: search, $options: 'i' } }
      ];
    }

    const skip = (page - 1) * limit;

    const [customPlans, total] = await Promise.all([
      CustomMealPlan.find(query)
        .populate('userId', 'firstName lastName email phoneNumber')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      CustomMealPlan.countDocuments(query)
    ]);

    res.json({
      success: true,
      data: customPlans,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Error fetching all custom plans:', error);
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
};

// @desc    Get custom meal plan by ID (Admin version - no ownership check)
// @route   GET /api/admin/custom-meal-plans/:id
// @access  Private/Admin
exports.getCustomPlanByIdAdmin = async (req, res) => {
  try {
    const { id } = req.params;

    const customPlan = await CustomMealPlan.findOne({
      $or: [
        { _id: id },
        { customPlanId: id }
      ]
    })
      .populate('userId', 'firstName lastName email phoneNumber')
      .populate('mealAssignments.mealId');

    if (!customPlan) {
      return res.status(404).json({
        success: false,
        error: 'Custom meal plan not found'
      });
    }

    res.json({
      success: true,
      data: customPlan
    });

  } catch (error) {
    console.error('Error fetching custom meal plan (admin):', error);
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
};

// @desc    Generate custom meal plan (preview or save as draft)
// @route   POST /api/custom-meal-plans/generate
// @access  Private
exports.generateMealPlan = async (req, res) => {
  try {
    const userId = req.user?._id || req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: "User not authenticated"
      });
    }

    const {
      healthGoal,
      dietaryRestrictions = [],
      allergies = [],
      excludeIngredients = [],
      mealTypes = ['breakfast', 'lunch', 'dinner'],
      durationWeeks = 4,
      chefInstructions = "",
      saveAsDraft = false
    } = req.body;

    // Validation
    if (!healthGoal) {
      return res.status(400).json({
        success: false,
        error: "Health goal is required"
      });
    }

    const validHealthGoals = ['weight_loss', 'muscle_gain', 'maintenance', 'diabetes_management', 'heart_health'];
    if (!validHealthGoals.includes(healthGoal)) {
      return res.status(400).json({
        success: false,
        error: `Invalid health goal. Must be one of: ${validHealthGoals.join(', ')}`
      });
    }

    if (!Array.isArray(mealTypes) || mealTypes.length === 0) {
      return res.status(400).json({
        success: false,
        error: "At least one meal type must be selected"
      });
    }

    // Get system settings for customization fee
    const customizationFeePercent = await SystemSettings.getSetting('CUSTOM_PLAN_FEE_PERCENT') || 15;

    console.log(`🎯 Generating custom meal plan for user ${userId}`);
    console.log(`   Health Goal: ${healthGoal}`);
    console.log(`   Meal Types: ${mealTypes.join(', ')}`);
    console.log(`   Duration: ${durationWeeks} weeks`);

    // Prepare preferences object for algorithm
    const preferences = {
      healthGoal,
      dietaryRestrictions,
      allergies,
      excludeIngredients,
      mealTypes,
      durationWeeks
    };

    // Generate meal plan using algorithm
    const mealAssignments = await generateCustomMealPlan(preferences);

    // Create custom meal plan document
    const customPlan = new CustomMealPlan({
      userId,
      preferences,
      chefInstructions,
      mealAssignments: mealAssignments.map(a => ({
        weekNumber: a.weekNumber,
        dayOfWeek: a.dayOfWeek,
        mealTime: a.mealTime,
        mealId: a.mealId,
        customizations: a.customizations || {}
      })),
      status: saveAsDraft ? 'draft' : 'generated'
    });

    // Calculate pricing
    await customPlan.populate('mealAssignments.mealId');
    await customPlan.calculatePricing(customizationFeePercent);

    // Calculate nutrition summary
    await customPlan.calculateNutritionSummary();

    // Calculate stats
    customPlan.calculateStats();

    // Save if requested
    if (saveAsDraft) {
      await customPlan.save();
      console.log(`✅ Custom plan saved as draft: ${customPlan.customPlanId}`);
    }

    // Prepare response
    const response = {
      success: true,
      data: {
        customPlanId: customPlan.customPlanId,
        mealAssignments: customPlan.mealAssignments,
        pricing: customPlan.pricing,
        nutritionSummary: customPlan.nutritionSummary,
        stats: customPlan.stats,
        preferences: customPlan.preferences,
        chefInstructions: customPlan.chefInstructions,
        status: customPlan.status
      }
    };

    res.json(response);

  } catch (error) {
    console.error("Error generating custom meal plan:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Server error"
    });
  }
};

// @desc    Get custom meal plan by ID
// @route   GET /api/custom-meal-plans/:id
// @access  Private
exports.getCustomMealPlan = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?._id || req.user?.id;

    const customPlan = await CustomMealPlan.findOne({
      $or: [
        { _id: id },
        { customPlanId: id }
      ]
    }).populate('mealAssignments.mealId');

    if (!customPlan) {
      return res.status(404).json({
        success: false,
        error: "Custom meal plan not found"
      });
    }

    // Check ownership
    if (customPlan.userId.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        error: "Not authorized to view this meal plan"
      });
    }

    res.json({
      success: true,
      data: customPlan
    });

  } catch (error) {
    console.error("Error fetching custom meal plan:", error);
    res.status(500).json({
      success: false,
      error: "Server error"
    });
  }
};

// @desc    Get user's custom meal plans
// @route   GET /api/custom-meal-plans/my-plans
// @access  Private
exports.getMyCustomPlans = async (req, res) => {
  try {
    const userId = req.user?._id || req.user?.id;
    const { status } = req.query;

    let query = { userId };

    if (status) {
      query.status = status;
    }

    const customPlans = await CustomMealPlan.find(query)
      .sort({ createdAt: -1 })
      .select('-mealAssignments') // Don't include full meal assignments in list view
      .limit(50);

    res.json({
      success: true,
      data: customPlans
    });

  } catch (error) {
    console.error("Error fetching user's custom plans:", error);
    res.status(500).json({
      success: false,
      error: "Server error"
    });
  }
};

// @desc    Purchase custom meal plan (convert to subscription/order)
// @route   POST /api/custom-meal-plans/:id/purchase
// @access  Private
exports.purchaseCustomPlan = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?._id || req.user?.id;

    const customPlan = await CustomMealPlan.findOne({
      $or: [
        { _id: id },
        { customPlanId: id }
      ]
    }).populate('mealAssignments.mealId');

    if (!customPlan) {
      return res.status(404).json({
        success: false,
        error: "Custom meal plan not found"
      });
    }

    // Check ownership
    if (customPlan.userId.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        error: "Not authorized to purchase this meal plan"
      });
    }

    // Check if already purchased
    if (customPlan.status === 'purchased' || customPlan.status === 'active') {
      return res.status(400).json({
        success: false,
        error: "This meal plan has already been purchased"
      });
    }

    // TODO: Integrate with existing subscription/order system
    // For now, just mark as purchased
    // In production, you would:
    // 1. Create a new Subscription document
    // 2. Create a new Order document
    // 3. Process payment
    // 4. Notify chefs of custom instructions

    customPlan.status = 'purchased';
    customPlan.purchasedAt = new Date();
    await customPlan.save();

    console.log(`✅ Custom plan purchased: ${customPlan.customPlanId} by user ${userId}`);

    res.json({
      success: true,
      message: "Custom meal plan purchased successfully",
      data: {
        customPlanId: customPlan.customPlanId,
        status: customPlan.status,
        totalPrice: customPlan.pricing.totalPrice
      }
    });

  } catch (error) {
    console.error("Error purchasing custom meal plan:", error);
    res.status(500).json({
      success: false,
      error: "Server error"
    });
  }
};

// @desc    Delete custom meal plan (draft only)
// @route   DELETE /api/custom-meal-plans/:id
// @access  Private
exports.deleteCustomPlan = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?._id || req.user?.id;

    const customPlan = await CustomMealPlan.findOne({
      $or: [
        { _id: id },
        { customPlanId: id }
      ]
    });

    if (!customPlan) {
      return res.status(404).json({
        success: false,
        error: "Custom meal plan not found"
      });
    }

    // Check ownership
    if (customPlan.userId.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        error: "Not authorized to delete this meal plan"
      });
    }

    // Only allow deletion of draft plans
    if (customPlan.status !== 'draft' && customPlan.status !== 'generated') {
      return res.status(400).json({
        success: false,
        error: "Cannot delete purchased or active meal plans"
      });
    }

    await customPlan.deleteOne();

    res.json({
      success: true,
      message: "Custom meal plan deleted successfully"
    });

  } catch (error) {
    console.error("Error deleting custom meal plan:", error);
    res.status(500).json({
      success: false,
      error: "Server error"
    });
  }
};

// @desc    Regenerate custom meal plan with same preferences
// @route   POST /api/custom-meal-plans/:id/regenerate
// @access  Private
exports.regenerateCustomPlan = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?._id || req.user?.id;

    const existingPlan = await CustomMealPlan.findOne({
      $or: [
        { _id: id },
        { customPlanId: id }
      ]
    });

    if (!existingPlan) {
      return res.status(404).json({
        success: false,
        error: "Custom meal plan not found"
      });
    }

    // Check ownership
    if (existingPlan.userId.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        error: "Not authorized to regenerate this meal plan"
      });
    }

    // Get system settings
    const customizationFeePercent = await SystemSettings.getSetting('CUSTOM_PLAN_FEE_PERCENT') || 15;

    console.log(`🔄 Regenerating custom meal plan: ${existingPlan.customPlanId}`);

    // Generate new meal plan using same preferences
    const mealAssignments = await generateCustomMealPlan(existingPlan.preferences);

    // Update existing plan with new assignments
    existingPlan.mealAssignments = mealAssignments.map(a => ({
      weekNumber: a.weekNumber,
      dayOfWeek: a.dayOfWeek,
      mealTime: a.mealTime,
      mealId: a.mealId,
      customizations: a.customizations || {}
    }));

    existingPlan.status = 'generated';
    existingPlan.generatedAt = new Date();

    // Recalculate pricing and nutrition
    await existingPlan.populate('mealAssignments.mealId');
    await existingPlan.calculatePricing(customizationFeePercent);
    await existingPlan.calculateNutritionSummary();
    existingPlan.calculateStats();

    await existingPlan.save();

    res.json({
      success: true,
      message: "Custom meal plan regenerated successfully",
      data: {
        customPlanId: existingPlan.customPlanId,
        mealAssignments: existingPlan.mealAssignments,
        pricing: existingPlan.pricing,
        nutritionSummary: existingPlan.nutritionSummary,
        stats: existingPlan.stats
      }
    });

  } catch (error) {
    console.error("Error regenerating custom meal plan:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Server error"
    });
  }
};
