// backend/controllers/customMealController.js
// Controller for managing Custom Meals (admin-curated combo meals)

const CustomMeal = require("../models/CustomMeal");
const Meal = require("../models/DailyMeal"); // This is the Meal model
const mongoose = require("mongoose");

// @desc    Get all custom meals (with optional filters)
// @route   GET /api/admin/custom-meals
// @access  Private/Admin
exports.getAllCustomMeals = async (req, res) => {
  try {
    const {
      status,
      category,
      healthGoal,
      isAvailableForCustomPlans,
      search,
      page = 1,
      limit = 50,
    } = req.query;

    let query = {};

    // Filters
    if (status) query.status = status;
    if (category) query.category = category;
    if (healthGoal) query.healthGoals = healthGoal;
    if (isAvailableForCustomPlans !== undefined) {
      query.isAvailableForCustomPlans = isAvailableForCustomPlans === "true";
    }

    // Search by name
    if (search) {
      query.name = { $regex: search, $options: "i" };
    }

    const skip = (page - 1) * limit;

    const [customMeals, total] = await Promise.all([
      CustomMeal.find(query)
        .populate("constituentMeals.mealId", "name category image pricing nutrition")
        .populate("createdBy", "name email")
        .populate("updatedBy", "name email")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      CustomMeal.countDocuments(query),
    ]);

    res.json({
      success: true,
      data: customMeals,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching custom meals:", error);
    res.status(500).json({
      success: false,
      error: "Server error",
    });
  }
};

// @desc    Get single custom meal by ID
// @route   GET /api/admin/custom-meals/:id
// @access  Private/Admin
exports.getCustomMealById = async (req, res) => {
  try {
    const { id } = req.params;

    const customMeal = await CustomMeal.findOne({
      $or: [{ _id: mongoose.isValidObjectId(id) ? id : null }, { customMealId: id }],
    })
      .populate("constituentMeals.mealId")
      .populate("createdBy", "name email")
      .populate("updatedBy", "name email");

    if (!customMeal) {
      return res.status(404).json({
        success: false,
        error: "Custom meal not found",
      });
    }

    res.json({
      success: true,
      data: customMeal,
    });
  } catch (error) {
    console.error("Error fetching custom meal:", error);
    res.status(500).json({
      success: false,
      error: "Server error",
    });
  }
};

// @desc    Create new custom meal
// @route   POST /api/admin/custom-meals
// @access  Private/Admin
exports.createCustomMeal = async (req, res) => {
  try {
    const adminId = req.admin?.adminId;

    if (!adminId) {
      return res.status(401).json({
        success: false,
        error: "Admin not authenticated",
      });
    }

    const {
      name,
      description,
      category,
      constituentMeals, // Array of { mealId, quantity, notes }
      healthGoals,
      image,
      isAvailableForCustomPlans,
      isAvailableForDirectOrder,
      adminNotes,
    } = req.body;

    // Validation
    if (!name || !category || !constituentMeals || constituentMeals.length === 0) {
      return res.status(400).json({
        success: false,
        error: "Name, category, and at least one constituent meal are required",
      });
    }

    if (!healthGoals || healthGoals.length === 0) {
      return res.status(400).json({
        success: false,
        error: "At least one health goal must be selected",
      });
    }

    // Validate constituent meals exist
    const mealIds = constituentMeals.map((cm) => cm.mealId);
    const existingMeals = await Meal.find({ _id: { $in: mealIds } });

    if (existingMeals.length !== mealIds.length) {
      return res.status(400).json({
        success: false,
        error: "One or more constituent meals not found",
      });
    }

    console.log(`🍽️ Creating custom meal: ${name}`);
    console.log(`   Constituent meals: ${constituentMeals.length}`);
    console.log(`   Health goals: ${healthGoals.join(", ")}`);

    // Create custom meal
    const customMeal = new CustomMeal({
      name,
      description,
      category,
      constituentMeals,
      healthGoals,
      image,
      isAvailableForCustomPlans:
        isAvailableForCustomPlans !== undefined ? isAvailableForCustomPlans : true,
      isAvailableForDirectOrder: isAvailableForDirectOrder || false,
      adminNotes,
      createdBy: adminId,
      updatedBy: adminId,
    });

    // Calculate all auto-calculated fields from constituent meals
    await customMeal.calculateFromConstituents();

    // Save
    await customMeal.save();

    // Populate for response
    await customMeal.populate("constituentMeals.mealId");

    console.log(`✅ Custom meal created: ${customMeal.customMealId}`);
    console.log(`   Total price: ₦${customMeal.pricing.totalPrice}`);
    console.log(`   Calories: ${customMeal.nutrition.calories} cal`);

    res.status(201).json({
      success: true,
      message: "Custom meal created successfully",
      data: customMeal,
    });
  } catch (error) {
    console.error("Error creating custom meal:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Server error",
    });
  }
};

// @desc    Update custom meal
// @route   PUT /api/admin/custom-meals/:id
// @access  Private/Admin
exports.updateCustomMeal = async (req, res) => {
  try {
    const { id } = req.params;
    const adminId = req.admin?.adminId;

    if (!adminId) {
      return res.status(401).json({
        success: false,
        error: "Admin not authenticated",
      });
    }

    const customMeal = await CustomMeal.findOne({
      $or: [{ _id: mongoose.isValidObjectId(id) ? id : null }, { customMealId: id }],
    });

    if (!customMeal) {
      return res.status(404).json({
        success: false,
        error: "Custom meal not found",
      });
    }

    const {
      name,
      description,
      category,
      constituentMeals,
      healthGoals,
      image,
      isAvailableForCustomPlans,
      isAvailableForDirectOrder,
      status,
      adminNotes,
    } = req.body;

    console.log(`✏️ Updating custom meal: ${customMeal.customMealId}`);

    // Update fields
    if (name !== undefined) customMeal.name = name;
    if (description !== undefined) customMeal.description = description;
    if (category !== undefined) customMeal.category = category;
    if (healthGoals !== undefined) customMeal.healthGoals = healthGoals;
    if (image !== undefined) customMeal.image = image;
    if (isAvailableForCustomPlans !== undefined)
      customMeal.isAvailableForCustomPlans = isAvailableForCustomPlans;
    if (isAvailableForDirectOrder !== undefined)
      customMeal.isAvailableForDirectOrder = isAvailableForDirectOrder;
    if (status !== undefined) customMeal.status = status;
    if (adminNotes !== undefined) customMeal.adminNotes = adminNotes;

    // If constituent meals changed, validate and update
    if (constituentMeals !== undefined) {
      if (constituentMeals.length === 0) {
        return res.status(400).json({
          success: false,
          error: "At least one constituent meal is required",
        });
      }

      const mealIds = constituentMeals.map((cm) => cm.mealId);
      const existingMeals = await Meal.find({ _id: { $in: mealIds } });

      if (existingMeals.length !== mealIds.length) {
        return res.status(400).json({
          success: false,
          error: "One or more constituent meals not found",
        });
      }

      customMeal.constituentMeals = constituentMeals;
    }

    customMeal.updatedBy = adminId;

    // Recalculate auto-calculated fields
    await customMeal.calculateFromConstituents();

    // Save
    await customMeal.save();

    // Populate for response
    await customMeal.populate("constituentMeals.mealId");

    console.log(`✅ Custom meal updated: ${customMeal.customMealId}`);

    res.json({
      success: true,
      message: "Custom meal updated successfully",
      data: customMeal,
    });
  } catch (error) {
    console.error("Error updating custom meal:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Server error",
    });
  }
};

// @desc    Delete custom meal
// @route   DELETE /api/admin/custom-meals/:id
// @access  Private/Admin
exports.deleteCustomMeal = async (req, res) => {
  try {
    const { id } = req.params;

    const customMeal = await CustomMeal.findOne({
      $or: [{ _id: mongoose.isValidObjectId(id) ? id : null }, { customMealId: id }],
    });

    if (!customMeal) {
      return res.status(404).json({
        success: false,
        error: "Custom meal not found",
      });
    }

    // Check if custom meal is being used in any active custom meal plans
    // TODO: Add this check when integrating with CustomMealPlan

    console.log(`🗑️ Deleting custom meal: ${customMeal.customMealId}`);

    await customMeal.deleteOne();

    res.json({
      success: true,
      message: "Custom meal deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting custom meal:", error);
    res.status(500).json({
      success: false,
      error: "Server error",
    });
  }
};

// @desc    Recalculate custom meal stats
// @route   POST /api/admin/custom-meals/:id/recalculate
// @access  Private/Admin
exports.recalculateCustomMeal = async (req, res) => {
  try {
    const { id } = req.params;

    const customMeal = await CustomMeal.findOne({
      $or: [{ _id: mongoose.isValidObjectId(id) ? id : null }, { customMealId: id }],
    });

    if (!customMeal) {
      return res.status(404).json({
        success: false,
        error: "Custom meal not found",
      });
    }

    console.log(`🔄 Recalculating custom meal: ${customMeal.customMealId}`);

    // Recalculate
    await customMeal.calculateFromConstituents();
    await customMeal.save();

    // Populate for response
    await customMeal.populate("constituentMeals.mealId");

    console.log(`✅ Recalculation complete`);

    res.json({
      success: true,
      message: "Custom meal recalculated successfully",
      data: customMeal,
    });
  } catch (error) {
    console.error("Error recalculating custom meal:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Server error",
    });
  }
};

// @desc    Get custom meal statistics
// @route   GET /api/admin/custom-meals/stats/overview
// @access  Private/Admin
exports.getCustomMealStats = async (req, res) => {
  try {
    const [total, active, byCategory, byHealthGoal, availableForPlans] =
      await Promise.all([
        CustomMeal.countDocuments(),
        CustomMeal.countDocuments({ status: "active" }),
        CustomMeal.aggregate([
          { $group: { _id: "$category", count: { $sum: 1 } } },
        ]),
        CustomMeal.aggregate([
          { $unwind: "$healthGoals" },
          { $group: { _id: "$healthGoals", count: { $sum: 1 } } },
        ]),
        CustomMeal.countDocuments({
          status: "active",
          isAvailableForCustomPlans: true,
        }),
      ]);

    res.json({
      success: true,
      data: {
        total,
        active,
        byCategory: byCategory.reduce((acc, item) => {
          acc[item._id] = item.count;
          return acc;
        }, {}),
        byHealthGoal: byHealthGoal.reduce((acc, item) => {
          acc[item._id] = item.count;
          return acc;
        }, {}),
        availableForPlans,
      },
    });
  } catch (error) {
    console.error("Error fetching custom meal stats:", error);
    res.status(500).json({
      success: false,
      error: "Server error",
    });
  }
};
