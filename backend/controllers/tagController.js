const Tag = require('../models/Tag');
const MealPlan = require('../models/MealPlan');

// Get all active tags with meal plan counts
exports.getAllTags = async (req, res) => {
  try {
    const tags = await Tag.findActive();
    
    // Add meal plan count to each tag
    const tagsWithCounts = await Promise.all(
      tags.map(async (tag) => {
        const mealPlanCount = await tag.getMealPlanCount();
        return {
          ...tag.toObject(),
          mealPlanCount,
        };
      })
    );

    res.json({
      success: true,
      data: tagsWithCounts,
      count: tagsWithCounts.length,
    });
  } catch (err) {
    console.error('Get all tags error:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch tags',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined,
    });
  }
};

// Get tag by ID
exports.getTagById = async (req, res) => {
  try {
    const { id } = req.params;
    const tag = await Tag.findById(id);

    if (!tag) {
      return res.status(404).json({
        success: false,
        message: 'Tag not found',
      });
    }

    const mealPlanCount = await tag.getMealPlanCount();

    res.json({
      success: true,
      data: {
        ...tag.toObject(),
        mealPlanCount,
      },
    });
  } catch (err) {
    console.error('Get tag by ID error:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch tag',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined,
    });
  }
};

// Create new tag
exports.createTag = async (req, res) => {
  try {
    const { name, image, description, sortOrder } = req.body;

    // Validation
    if (!name || !image) {
      return res.status(400).json({
        success: false,
        message: 'Tag name and image are required',
      });
    }

    // Check if tag name already exists
    const existingTag = await Tag.findOne({ 
      name: { $regex: new RegExp(`^${name}$`, 'i') },
      isActive: true 
    });

    if (existingTag) {
      return res.status(400).json({
        success: false,
        message: 'Tag with this name already exists',
      });
    }

    const tag = await Tag.create({
      name,
      image,
      description: description || '',
      sortOrder: sortOrder || 0,
    });

    console.log(`✅ Created new tag: ${tag.name} (${tag.tagId})`);

    res.status(201).json({
      success: true,
      message: 'Tag created successfully',
      data: tag,
    });
  } catch (err) {
    console.error('Create tag error:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to create tag',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined,
    });
  }
};

// Update tag
exports.updateTag = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Update timestamp
    updates.updatedAt = new Date();

    // Check if name is being updated and if it conflicts
    if (updates.name) {
      const existingTag = await Tag.findOne({
        _id: { $ne: id },
        name: { $regex: new RegExp(`^${updates.name}$`, 'i') },
        isActive: true,
      });

      if (existingTag) {
        return res.status(400).json({
          success: false,
          message: 'Tag with this name already exists',
        });
      }
    }

    const tag = await Tag.findByIdAndUpdate(id, updates, {
      new: true,
      runValidators: true,
    });

    if (!tag) {
      return res.status(404).json({
        success: false,
        message: 'Tag not found',
      });
    }

    console.log(`✅ Updated tag: ${tag.name} (${tag.tagId})`);

    res.json({
      success: true,
      message: 'Tag updated successfully',
      data: tag,
    });
  } catch (err) {
    console.error('Update tag error:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to update tag',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined,
    });
  }
};

// Delete tag (soft delete)
exports.deleteTag = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if tag is being used by any meal plans
    const mealPlansWithTag = await MealPlan.countDocuments({
      tagId: id,
      isActive: true,
    });

    if (mealPlansWithTag > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete tag. It is currently used by ${mealPlansWithTag} meal plan(s). Please remove the tag from all meal plans first.`,
      });
    }

    const tag = await Tag.findByIdAndUpdate(
      id,
      { isActive: false, updatedAt: new Date() },
      { new: true }
    );

    if (!tag) {
      return res.status(404).json({
        success: false,
        message: 'Tag not found',
      });
    }

    console.log(`🗑️ Deleted tag: ${tag.name} (${tag.tagId})`);

    res.json({
      success: true,
      message: 'Tag deleted successfully',
    });
  } catch (err) {
    console.error('Delete tag error:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to delete tag',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined,
    });
  }
};

// Get meal plans by tag
exports.getMealPlansByTag = async (req, res) => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 20 } = req.query;

    // Verify tag exists
    const tag = await Tag.findById(id);
    if (!tag) {
      return res.status(404).json({
        success: false,
        message: 'Tag not found',
      });
    }

    // Get meal plans with this tag (only published for mobile)
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const mealPlans = await MealPlan.find({
      tagId: id,
      isActive: true,
      isPublished: true,
    })
    .populate('tagId', 'name image')
    .sort({ sortOrder: 1, createdDate: -1 })
    .skip(skip)
    .limit(parseInt(limit));

    const totalCount = await MealPlan.countDocuments({
      tagId: id,
      isActive: true,
      isPublished: true,
    });

    // Format meal plans for frontend
    const formattedMealPlans = mealPlans.map(plan => ({
      ...plan.toObject(),
      id: plan._id,
      name: plan.planName,
      price: plan.totalPrice || 0,
      image: plan.coverImage,
      tag: tag.name,
    }));

    res.json({
      success: true,
      data: formattedMealPlans,
      tag: tag,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalCount / parseInt(limit)),
        totalItems: totalCount,
        hasNext: skip + mealPlans.length < totalCount,
        hasPrev: parseInt(page) > 1,
      },
    });
  } catch (err) {
    console.error('Get meal plans by tag error:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch meal plans by tag',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined,
    });
  }
};