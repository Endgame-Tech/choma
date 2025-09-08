const mongoose = require("mongoose");
const MealPlan = require("../models/MealPlan");
const DailyMeal = require("../models/DailyMeal");
const Meal = require("../models/DailyMeal"); // Updated model (DailyMeal is now Meal)
const MealPlanAssignment = require("../models/MealPlanAssignment");
const Subscription = require("../models/Subscription");
const {
  uploadMealPlanMainImage,
  uploadMealImages,
  deleteImageFromCloudinary,
  extractPublicIdFromUrl,
} = require("../utils/imageUpload");

// Helper function to process weekly meals into individual DailyMeal documents
async function processDailyMeals(weeklyMeals, mealPlanId, mealImages = {}) {
  const dailyMeals = [];

  for (const [weekKey, weekData] of Object.entries(weeklyMeals)) {
    // Extract week number from weekKey (week1 -> 1, week2 -> 2, etc.)
    const weekNumber = parseInt(weekKey.replace("week", ""));

    for (const [day, dayData] of Object.entries(weekData)) {
      for (const [mealType, mealDescription] of Object.entries(dayData)) {
        if (
          mealType !== "remark" &&
          mealType !== "dailyComment" &&
          mealDescription &&
          mealDescription.trim()
        ) {
          try {
            // Check if this daily meal already exists for this combination
            const existingMeal = await DailyMeal.findOne({
              assignedMealPlan: mealPlanId,
              weekNumber: weekNumber,
              dayOfWeek: day,
              mealType: mealType,
            });

            // Get meal image if available
            const imageKey = `${weekKey}_${day}`;
            const mealImage =
              mealImages[imageKey] && mealImages[imageKey][mealType]
                ? mealImages[imageKey][mealType]
                : "";

            const mealData = {
              mealName: mealDescription.trim(),
              mealType: mealType,
              description: mealDescription.trim(),
              ingredients: mealDescription.trim(), // Could be enhanced to parse ingredients
              mealImage: mealImage,
              mealPlans: [mealPlanId],
              assignedMealPlan: mealPlanId,
              weekNumber: weekNumber,
              dayOfWeek: day,
              remark: dayData.remark || "",
              chefNotes: dayData.remark || "",
              isActive: true,
            };

            let savedMeal;
            if (existingMeal) {
              // Update existing meal
              Object.assign(existingMeal, mealData);
              savedMeal = await existingMeal.save();
            } else {
              // Create new meal
              const dailyMeal = new DailyMeal(mealData);
              savedMeal = await dailyMeal.save();
            }

            dailyMeals.push(savedMeal);
          } catch (error) {
            console.warn(
              `Failed to create/update daily meal for Week ${weekNumber} ${day} ${mealType}:`,
              error.message
            );
          }
        }
      }
    }
  }

  return dailyMeals;
}

// ============= MEAL PLAN MANAGEMENT =============
exports.getAllMealPlans = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;

    // Build filter
    let filter = {};
    if (req.query.status) {
      filter.isActive = req.query.status === "active";
    }
    if (req.query.targetAudience) {
      filter.targetAudience = req.query.targetAudience;
    }
    if (req.query.search) {
      filter.$or = [
        { planName: { $regex: req.query.search, $options: "i" } },
        { description: { $regex: req.query.search, $options: "i" } },
        { planId: { $regex: req.query.search, $options: "i" } },
      ];
    }

    const mealPlans = await MealPlan.find(filter)
      .sort({ createdDate: -1 })
      .skip(skip)
      .limit(limit)
      .populate("sampleMeals", "mealName mealType")
      .lean();

    const total = await MealPlan.countDocuments(filter);

    res.json({
      success: true,
      data: mealPlans,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    console.error("Get all meal plans error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve meal plans",
      error: process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  }
};

exports.getMealPlanDetails = async (req, res) => {
  try {
    const { id } = req.params;

    const mealPlan = await MealPlan.findById(id).populate(
      "sampleMeals",
      "mealName mealType description ingredients nutrition"
    );

    if (!mealPlan) {
      return res.status(404).json({
        success: false,
        message: "Meal plan not found",
      });
    }

    res.json({
      success: true,
      data: mealPlan,
    });
  } catch (err) {
    console.error("Get meal plan details error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to get meal plan details",
      error: process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  }
};

exports.createMealPlan = async (req, res) => {
  try {
    const {
      planName,
      description,
      targetAudience,
      basePrice,
      mealsPerWeek,
      planDuration,
      isActive,
      planFeatures,
      nutritionInfo,
      allergens,
      chefNotes,
      weeklyMeals,
      planImageUrl,
      mealImages,
    } = req.body;

    // Ensure weeklyMeals has the proper structure for 4 weeks
    const structuredWeeklyMeals = {
      week1: weeklyMeals?.week1 || weeklyMeals?.["1"] || {},
      week2: weeklyMeals?.week2 || weeklyMeals?.["2"] || {},
      week3: weeklyMeals?.week3 || weeklyMeals?.["3"] || {},
      week4: weeklyMeals?.week4 || weeklyMeals?.["4"] || {},
    };

    // Create the meal plan (planId will be auto-generated by pre-save hook)
    const mealPlan = new MealPlan({
      planName,
      description,
      targetAudience,
      basePrice: Number(basePrice),
      mealsPerWeek: Number(mealsPerWeek),
      planDuration,
      isActive: isActive !== false,
      planFeatures: planFeatures || [],
      nutritionInfo: nutritionInfo || {},
      allergens: allergens || [],
      chefNotes: chefNotes || "",
      weeklyMeals: structuredWeeklyMeals,
      planImageUrl: "", // Will be set after Cloudinary upload
      mealImages: {}, // Will be set after Cloudinary upload
      dailyComments: req.body.dailyComments || {},
    });

    await mealPlan.save();

    // Upload images to Cloudinary after meal plan is created
    let cloudinaryPlanImageUrl = "";
    let cloudinaryMealImages = {};

    try {
      // Upload main plan image if provided
      if (planImageUrl && planImageUrl.startsWith("data:image/")) {
        const uploadResult = await uploadMealPlanMainImage(
          planImageUrl,
          mealPlan.planId
        );
        if (uploadResult) {
          cloudinaryPlanImageUrl = uploadResult.url;
        }
      }

      // Upload meal images if provided
      if (mealImages && Object.keys(mealImages).length > 0) {
        cloudinaryMealImages = await uploadMealImages(
          mealImages,
          mealPlan.planId
        );
      }

      // Update meal plan with Cloudinary URLs
      if (
        cloudinaryPlanImageUrl ||
        Object.keys(cloudinaryMealImages).length > 0
      ) {
        mealPlan.planImageUrl = cloudinaryPlanImageUrl;
        mealPlan.mealImages = cloudinaryMealImages;
        await mealPlan.save();
      }
    } catch (imageError) {
      console.error(
        "⚠️ Image upload error (meal plan saved without images):",
        imageError
      );
      // Don't fail the meal plan creation if image upload fails
    }

    // Process and create individual daily meals if provided
    if (
      structuredWeeklyMeals &&
      Object.keys(structuredWeeklyMeals).some(
        (week) => Object.keys(structuredWeeklyMeals[week]).length > 0
      )
    ) {
      const dailyMeals = await processDailyMeals(
        structuredWeeklyMeals,
        mealPlan._id,
        cloudinaryMealImages
      );
      mealPlan.sampleMeals = dailyMeals.map((meal) => meal._id);
      await mealPlan.save();
    }

    res.status(201).json({
      success: true,
      message: "Meal plan created successfully",
      data: mealPlan,
    });
  } catch (err) {
    console.error("Create meal plan error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to create meal plan",
      error: process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  }
};

exports.updateMealPlan = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Handle image uploads to Cloudinary
    let cloudinaryPlanImageUrl = updates.planImageUrl;
    let cloudinaryMealImages = updates.mealImages || {};

    try {
      // Get current meal plan to check for existing images
      const currentMealPlan = await MealPlan.findById(id);

      // Upload new main plan image if provided as base64
      if (
        updates.planImageUrl &&
        updates.planImageUrl.startsWith("data:image/")
      ) {
        // Delete old image if exists
        if (
          currentMealPlan.planImageUrl &&
          currentMealPlan.planImageUrl.includes("cloudinary.com")
        ) {
          const oldPublicId = extractPublicIdFromUrl(
            currentMealPlan.planImageUrl
          );
          if (oldPublicId) {
            await deleteImageFromCloudinary(oldPublicId);
          }
        }

        const uploadResult = await uploadMealPlanMainImage(
          updates.planImageUrl,
          currentMealPlan.planId
        );
        if (uploadResult) {
          cloudinaryPlanImageUrl = uploadResult.url;
        }
      }

      // Upload new meal images if provided
      if (updates.mealImages && Object.keys(updates.mealImages).length > 0) {
        // Delete old meal images that are being replaced
        for (const [mealKey, newImage] of Object.entries(updates.mealImages)) {
          if (newImage && newImage.startsWith("data:image/")) {
            const oldImage = currentMealPlan.mealImages?.[mealKey];
            if (oldImage && oldImage.includes("cloudinary.com")) {
              const oldPublicId = extractPublicIdFromUrl(oldImage);
              if (oldPublicId) {
                await deleteImageFromCloudinary(oldPublicId);
              }
            }
          }
        }

        cloudinaryMealImages = await uploadMealImages(
          updates.mealImages,
          currentMealPlan.planId
        );
      }
    } catch (imageError) {
      console.error("⚠️ Image upload error during update:", imageError);
      // Continue with update even if image upload fails
    }

    // Update the updates object with Cloudinary URLs
    updates.planImageUrl = cloudinaryPlanImageUrl;
    updates.mealImages = cloudinaryMealImages;

    // Update daily comments if provided
    if (req.body.dailyComments) {
      updates.dailyComments = req.body.dailyComments;
    }

    // Process weekly meals if provided
    if (updates.weeklyMeals) {
      // Ensure weeklyMeals has the proper structure for 4 weeks
      const structuredWeeklyMeals = {
        week1: updates.weeklyMeals?.week1 || updates.weeklyMeals?.["1"] || {},
        week2: updates.weeklyMeals?.week2 || updates.weeklyMeals?.["2"] || {},
        week3: updates.weeklyMeals?.week3 || updates.weeklyMeals?.["3"] || {},
        week4: updates.weeklyMeals?.week4 || updates.weeklyMeals?.["4"] || {},
      };

      updates.weeklyMeals = structuredWeeklyMeals;

      // Remove old daily meals associated with this specific meal plan
      await DailyMeal.deleteMany({ assignedMealPlan: id });

      // Create/update daily meals for the new structure
      const dailyMeals = await processDailyMeals(
        structuredWeeklyMeals,
        id,
        cloudinaryMealImages
      );
      updates.sampleMeals = dailyMeals.map((meal) => meal._id);
    }

    updates.lastModified = new Date();

    const mealPlan = await MealPlan.findByIdAndUpdate(id, updates, {
      new: true,
      runValidators: true,
    });

    if (!mealPlan) {
      return res.status(404).json({
        success: false,
        message: "Meal plan not found",
      });
    }

    // Recalculate totals and nutrition after updates
    await mealPlan.updateCalculatedFields();

    res.json({
      success: true,
      message: "Meal plan updated successfully",
      data: mealPlan,
    });
  } catch (err) {
    console.error("Update meal plan error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to update meal plan",
      error: process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  }
};

exports.deleteMealPlan = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if meal plan is used in any active subscriptions
    const activeSubscriptions = await Subscription.countDocuments({
      mealPlanId: id,
      status: "Active",
    });

    if (activeSubscriptions > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete meal plan. It has ${activeSubscriptions} active subscription(s).`,
      });
    }

    // Get meal plan before deletion to clean up images
    const mealPlan = await MealPlan.findById(id);

    if (!mealPlan) {
      return res.status(404).json({
        success: false,
        message: "Meal plan not found",
      });
    }

    // Clean up Cloudinary images
    try {
      // Delete main plan image
      if (
        mealPlan.planImageUrl &&
        mealPlan.planImageUrl.includes("cloudinary.com")
      ) {
        const publicId = extractPublicIdFromUrl(mealPlan.planImageUrl);
        if (publicId) {
          await deleteImageFromCloudinary(publicId);
        }
      }

      // Delete meal images
      if (mealPlan.mealImages && Object.keys(mealPlan.mealImages).length > 0) {
        for (const [mealKey, imageUrl] of Object.entries(mealPlan.mealImages)) {
          if (imageUrl && imageUrl.includes("cloudinary.com")) {
            const publicId = extractPublicIdFromUrl(imageUrl);
            if (publicId) {
              await deleteImageFromCloudinary(publicId);
            }
          }
        }
      }
    } catch (imageError) {
      console.error("⚠️ Error deleting images from Cloudinary:", imageError);
      // Continue with deletion even if image cleanup fails
    }

    // Delete the meal plan
    await MealPlan.findByIdAndDelete(id);

    res.json({
      success: true,
      message: "Meal plan deleted successfully",
    });
  } catch (err) {
    console.error("Delete meal plan error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to delete meal plan",
      error: process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  }
};

// Bulk create meal plans from template
exports.createMealPlanFromTemplate = async (req, res) => {
  try {
    const { templateData, planVariations } = req.body;

    const createdPlans = [];

    for (const variation of planVariations) {
      const planData = {
        ...templateData,
        ...variation,
        planId: `MP${String((await MealPlan.countDocuments()) + 1).padStart(
          3,
          "0"
        )}`,
      };

      const mealPlan = new MealPlan(planData);
      await mealPlan.save();
      createdPlans.push(mealPlan);
    }

    res.status(201).json({
      success: true,
      message: `${createdPlans.length} meal plans created from template`,
      data: createdPlans,
    });
  } catch (err) {
    console.error("Create meal plans from template error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to create meal plans from template",
      error: process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  }
};

// Get meal plan analytics
exports.getMealPlanAnalytics = async (req, res) => {
  try {
    const analytics = await MealPlan.aggregate([
      {
        $group: {
          _id: "$targetAudience",
          count: { $sum: 1 },
          avgPrice: { $avg: "$basePrice" },
          totalRevenue: { $sum: "$basePrice" },
          activePlans: {
            $sum: { $cond: ["$isActive", 1, 0] },
          },
        },
      },
      {
        $sort: { count: -1 },
      },
    ]);

    // Get popular meal types
    const mealTypeStats = await DailyMeal.aggregate([
      {
        $group: {
          _id: "$mealType",
          count: { $sum: 1 },
        },
      },
      {
        $sort: { count: -1 },
      },
    ]);

    // Get plans by price range
    const priceRanges = await MealPlan.aggregate([
      {
        $bucket: {
          groupBy: "$basePrice",
          boundaries: [0, 5000, 10000, 20000, 50000, 100000],
          default: "Other",
          output: {
            count: { $sum: 1 },
            plans: { $push: "$planName" },
          },
        },
      },
    ]);

    res.json({
      success: true,
      data: {
        audienceAnalytics: analytics,
        mealTypeStats,
        priceRanges,
        totalPlans: await MealPlan.countDocuments(),
        activePlans: await MealPlan.countDocuments({ isActive: true }),
        totalMeals: await DailyMeal.countDocuments(),
      },
    });
  } catch (err) {
    console.error("Get meal plan analytics error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to get analytics",
      error: process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  }
};

// Export meal plan data
exports.exportMealPlanData = async (req, res) => {
  try {
    const { format = "csv", planId } = req.query;

    let query = {};
    if (planId) {
      query._id = planId;
    }

    const mealPlans = await MealPlan.find(query)
      .populate("sampleMeals")
      .sort({ createdDate: -1 });

    if (format === "csv") {
      let csvData =
        "Plan ID,Plan Name,Target Audience,Base Price,Meals Per Week,Status,Features,Created Date\n";

      mealPlans.forEach((plan) => {
        const features = (plan.planFeatures || []).join("; ");
        csvData += `"${plan.planId}","${plan.planName}","${
          plan.targetAudience
        }","${plan.basePrice}","${plan.mealsPerWeek}","${
          plan.isActive ? "Active" : "Inactive"
        }","${features}","${new Date(
          plan.createdDate
        ).toLocaleDateString()}"\n`;
      });

      res.json({
        success: true,
        data: {
          csvData,
          filename: `meal_plans_export_${
            new Date().toISOString().split("T")[0]
          }.csv`,
        },
      });
    } else {
      // JSON export with detailed data
      const detailedData = mealPlans.map((plan) => ({
        ...plan.toObject(),
        exportDate: new Date().toISOString(),
        mealCount: plan.sampleMeals ? plan.sampleMeals.length : 0,
      }));

      res.json({
        success: true,
        data: detailedData,
        exportDate: new Date().toISOString(),
        totalRecords: detailedData.length,
      });
    }
  } catch (err) {
    console.error("Export meal plan data error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to export meal plan data",
      error: process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  }
};

// Duplicate meal plan (V2 with MealPlanAssignment system)
exports.duplicateMealPlan = async (req, res) => {
  try {
    const { id } = req.params;
    const { newPlanName, modifications = {} } = req.body;

    const originalPlan = await MealPlan.findById(id);
    if (!originalPlan) {
      return res.status(404).json({
        success: false,
        message: "Original meal plan not found",
      });
    }

    // Create duplicate with modifications
    const duplicatePlan = new MealPlan({
      ...originalPlan.toObject(),
      _id: undefined,
      planId: undefined, // Let the pre-save hook generate this
      planName: newPlanName || `${originalPlan.planName} (Copy)`,
      createdAt: new Date(),
      updatedAt: new Date(),
      isPublished: false, // Always create duplicates as drafts
      totalPrice: 0, // Will be recalculated after assignments are copied
      ...modifications,
    });

    await duplicatePlan.save();

    // Duplicate meal plan assignments (V2 system)
    const originalAssignments = await MealPlanAssignment.find({ 
      mealPlanId: id 
    });

    if (originalAssignments.length > 0) {
      const duplicatedAssignments = [];
      
      for (const assignment of originalAssignments) {
        const duplicatedAssignment = new MealPlanAssignment({
          ...assignment.toObject(),
          _id: undefined,
          assignmentId: undefined, // Will be auto-generated
          mealPlanId: duplicatePlan._id,
          createdAt: new Date(),
          updatedAt: new Date(),
        });

        const savedAssignment = await duplicatedAssignment.save();
        duplicatedAssignments.push(savedAssignment);
      }

      // Recalculate total price and nutrition info for the duplicate
      await duplicatePlan.updateCalculatedFields();
    }

    // Apply any final modifications after assignments are copied
    if (modifications.isPublished && originalAssignments.length > 0) {
      await duplicatePlan.publish();
    }

    res.status(201).json({
      success: true,
      message: "Meal plan duplicated successfully",
      data: duplicatePlan,
    });
  } catch (err) {
    console.error("Duplicate meal plan error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to duplicate meal plan",
      error: process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  }
};

// Get daily meals for a specific meal plan
exports.getDailyMealsForPlan = async (req, res) => {
  try {
    const { id } = req.params;
    const { week, day, mealType } = req.query;

    let query = { assignedMealPlan: id };

    // Add filters if provided
    if (week) query.weekNumber = parseInt(week);
    if (day) query.dayOfWeek = day;
    if (mealType) query.mealType = mealType;

    const dailyMeals = await DailyMeal.find(query)
      .populate("assignedMealPlan", "planName")
      .sort({ weekNumber: 1, dayOfWeek: 1, mealType: 1 });

    // Organize by week and day for easier frontend consumption
    const organizedMeals = {};
    dailyMeals.forEach((meal) => {
      const weekKey = `week${meal.weekNumber}`;
      if (!organizedMeals[weekKey]) organizedMeals[weekKey] = {};
      if (!organizedMeals[weekKey][meal.dayOfWeek])
        organizedMeals[weekKey][meal.dayOfWeek] = {};

      organizedMeals[weekKey][meal.dayOfWeek][meal.mealType] = {
        _id: meal._id,
        mealId: meal.mealId,
        mealName: meal.mealName,
        description: meal.description,
        mealImage: meal.mealImage,
        remark: meal.remark,
        isActive: meal.isActive,
        createdAt: meal.createdAt,
        updatedAt: meal.updatedAt,
      };

      if (meal.remark) {
        organizedMeals[weekKey][meal.dayOfWeek].remark = meal.remark;
      }
    });

    res.json({
      success: true,
      data: {
        dailyMeals,
        organizedMeals,
        totalMeals: dailyMeals.length,
      },
    });
  } catch (err) {
    console.error("Get daily meals for plan error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to fetch daily meals",
      error: process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  }
};

// Update a specific daily meal
exports.updateDailyMeal = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const dailyMeal = await DailyMeal.findByIdAndUpdate(
      id,
      { ...updates, updatedAt: new Date() },
      { new: true, runValidators: true }
    ).populate("assignedMealPlan", "planName");

    if (!dailyMeal) {
      return res.status(404).json({
        success: false,
        message: "Daily meal not found",
      });
    }

    res.json({
      success: true,
      message: "Daily meal updated successfully",
      data: dailyMeal,
    });
  } catch (err) {
    console.error("Update daily meal error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to update daily meal",
      error: process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  }
};

// Delete a specific daily meal
exports.deleteDailyMeal = async (req, res) => {
  try {
    const { id } = req.params;

    const dailyMeal = await DailyMeal.findByIdAndDelete(id);

    if (!dailyMeal) {
      return res.status(404).json({
        success: false,
        message: "Daily meal not found",
      });
    }

    // Remove reference from meal plan's sampleMeals if exists
    await MealPlan.updateOne(
      { _id: dailyMeal.assignedMealPlan },
      { $pull: { sampleMeals: id } }
    );

    res.json({
      success: true,
      message: "Daily meal deleted successfully",
    });
  } catch (err) {
    console.error("Delete daily meal error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to delete daily meal",
      error: process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  }
};

// Get all daily meals (with pagination and filters)
exports.getAllDailyMeals = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const search = req.query.search || "";
    const mealType = req.query.mealType || "";
    const weekNumber = req.query.weekNumber || "";
    const mealPlanId = req.query.mealPlanId || "";

    const skip = (page - 1) * limit;

    // Build query
    let query = {};
    if (search) {
      query.$or = [
        { mealName: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
        { mealId: { $regex: search, $options: "i" } },
      ];
    }
    if (mealType) query.mealType = mealType;
    if (weekNumber) query.weekNumber = parseInt(weekNumber);
    if (mealPlanId) query.assignedMealPlan = mealPlanId;

    const dailyMeals = await DailyMeal.find(query)
      .populate("assignedMealPlan", "planName")
      .sort({ weekNumber: 1, dayOfWeek: 1, mealType: 1, createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const totalMeals = await DailyMeal.countDocuments(query);

    res.json({
      success: true,
      data: {
        dailyMeals,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(totalMeals / limit),
          totalMeals,
          hasMore: page * limit < totalMeals,
        },
      },
    });
  } catch (err) {
    console.error("Get all daily meals error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to fetch daily meals",
      error: process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  }
};

// ============= INDIVIDUAL MEALS MANAGEMENT =============
exports.getAllMeals = async (req, res) => {
  try {
    const { page = 1, limit = 20, search, category, isAvailable } = req.query;

    // Build filter
    const filter = {};
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
        { category: { $regex: search, $options: "i" } },
      ];
    }
    if (category) {
      filter.category = category;
    }
    if (isAvailable !== undefined) {
      filter.isAvailable = isAvailable === "true";
    }

    const meals = await Meal.find(filter)
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Meal.countDocuments(filter);

    res.json({
      success: true,
      data: {
        meals,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / limit),
          totalMeals: total,
          hasNext: page * limit < total,
          hasPrev: page > 1,
        },
      },
    });
  } catch (error) {
    console.error("Get all meals error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch meals",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

exports.getMealDetails = async (req, res) => {
  try {
    const { id } = req.params;

    const meal = await Meal.findById(id);
    if (!meal) {
      return res.status(404).json({
        success: false,
        message: "Meal not found",
      });
    }

    // Get assignment count
    const assignmentCount = await MealPlanAssignment.countDocuments({
      mealId: id,
    });

    res.json({
      success: true,
      data: {
        meal,
        assignmentCount,
      },
    });
  } catch (error) {
    console.error("Get meal details error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch meal details",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

exports.createMeal = async (req, res) => {
  try {
    const {
      name,
      description,
      image,
      pricing,
      nutrition,
      ingredients,
      preparationTime,
      complexityLevel,
      allergens,
      category,
      tags,
      adminNotes,
      chefNotes,
    } = req.body;

    const meal = new Meal({
      name,
      description,
      image,
      pricing: {
        ingredients: parseFloat(pricing?.ingredients) || 0,
        cookingCosts: parseFloat(pricing?.cookingCosts) || 0,
        packaging: parseFloat(pricing?.packaging) || 0,
        delivery: parseFloat(pricing?.delivery) || 0,
        platformFee: parseFloat(pricing?.platformFee) || 0,
        totalCosts: parseFloat(pricing?.totalCosts) || 0,
        profit: parseFloat(pricing?.profit) || 0,
        totalPrice: parseFloat(pricing?.totalPrice) || 0,
        chefEarnings: parseFloat(pricing?.chefEarnings) || 0,
        chomaEarnings: parseFloat(pricing?.chomaEarnings) || 0,
      },
      nutrition: {
        calories: parseInt(nutrition?.calories) || 0,
        protein: parseFloat(nutrition?.protein) || 0,
        carbs: parseFloat(nutrition?.carbs) || 0,
        fat: parseFloat(nutrition?.fat) || 0,
        fiber: parseFloat(nutrition?.fiber) || 0,
        sugar: parseFloat(nutrition?.sugar) || 0,
        weight: parseFloat(nutrition?.weight) || 0,
      },
      ingredients,
      preparationTime: parseInt(preparationTime) || 0,
      complexityLevel: complexityLevel || "medium",
      allergens: allergens || [],
      category,
      tags: tags || [],
      adminNotes,
      chefNotes,
    });

    await meal.save();

    res.status(201).json({
      success: true,
      message: "Meal created successfully",
      data: meal,
    });
  } catch (error) {
    console.error("Create meal error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create meal",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

exports.updateMeal = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // Handle pricing data updates - no need for manual calculation as model will handle it
    if (updateData.pricing) {
      // Ensure all required pricing fields are present for calculations
      const meal = await Meal.findById(id);
      if (!meal) {
        return res.status(404).json({
          success: false,
          message: "Meal not found",
        });
      }
    }

    const meal = await Meal.findByIdAndUpdate(id, updateData, { new: true });

    if (!meal) {
      return res.status(404).json({
        success: false,
        message: "Meal not found",
      });
    }

    // Update all meal plans that use this meal
    const assignments = await MealPlanAssignment.find({ mealIds: id }).populate(
      "mealPlanId"
    );
    for (const assignment of assignments) {
      if (assignment.mealPlanId) {
        await assignment.mealPlanId.updateCalculatedFields();
      }
    }

    res.json({
      success: true,
      message: "Meal updated successfully",
      data: meal,
    });
  } catch (error) {
    console.error("Update meal error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update meal",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

exports.deleteMeal = async (req, res) => {
  try {
    const { id } = req.params;
    const { force = false } = req.body;

    // Check if meal exists first
    const meal = await Meal.findById(id);
    if (!meal) {
      return res.status(404).json({
        success: false,
        message: "Meal not found",
      });
    }

    // Check if meal is assigned to any meal plans
    const assignmentCount = await MealPlanAssignment.countDocuments({
      mealIds: id,
    });

    if (assignmentCount > 0 && !force) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete meal. It is assigned to ${assignmentCount} meal plan(s). Remove assignments first.`,
      });
    }

    // If force delete is requested, remove meal from all meal plan assignments
    if (force && assignmentCount > 0) {
      console.log(
        `🔄 Force deleting meal ${id}, removing from ${assignmentCount} meal plan assignments...`
      );

      // Remove the meal from all meal plan assignments
      const updateResult = await MealPlanAssignment.updateMany(
        { mealIds: id },
        { $pull: { mealIds: id } }
      );

      // Remove empty assignments (assignments with no meals left)
      await MealPlanAssignment.deleteMany({ mealIds: { $size: 0 } });

      console.log(
        `✅ Removed meal from ${updateResult.modifiedCount} assignments`
      );
    }

    // Now delete the meal
    await Meal.findByIdAndDelete(id);

    // Recalculate the total price of the affected meal plans
    if (force && assignmentCount > 0) {
      const assignments = await MealPlanAssignment.find({ mealIds: id });
      const mealPlanIds = [
        ...new Set(assignments.map((a) => a.mealPlanId.toString())),
      ];

      for (const mealPlanId of mealPlanIds) {
        const mealPlan = await MealPlan.findById(mealPlanId);
        if (mealPlan) {
          await mealPlan.updateCalculatedFields();
        }
      }
    }

    res.json({
      success: true,
      message:
        force && assignmentCount > 0
          ? `Meal deleted successfully. Removed from ${assignmentCount} meal plan assignment(s).`
          : "Meal deleted successfully",
    });
  } catch (error) {
    console.error("Delete meal error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete meal",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

exports.toggleMealAvailability = async (req, res) => {
  try {
    const { id } = req.params;

    const meal = await Meal.findById(id);
    if (!meal) {
      return res.status(404).json({
        success: false,
        message: "Meal not found",
      });
    }

    await meal.toggleAvailability();

    res.json({
      success: true,
      message: `Meal ${meal.isAvailable ? "enabled" : "disabled"} successfully`,
      data: meal,
    });
  } catch (error) {
    console.error("Toggle meal availability error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to toggle meal availability",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

// ============= NEW MEAL PLANS MANAGEMENT (V2) =============
exports.getAllMealPlansV2 = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      search,
      isPublished,
      durationWeeks,
    } = req.query;

    // Build filter
    const filter = { isActive: true };
    if (search) {
      filter.$or = [
        { planName: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
      ];
    }
    if (isPublished !== undefined) {
      filter.isPublished = isPublished === "true";
    }
    if (durationWeeks) {
      filter.durationWeeks = parseInt(durationWeeks);
    }

    const mealPlans = await MealPlan.find(filter)
      .sort({ createdDate: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await MealPlan.countDocuments(filter);

    // Get assignment counts for each meal plan
    const mealPlansWithStats = await Promise.all(
      mealPlans.map(async (plan) => {
        const assignmentCount = await MealPlanAssignment.countDocuments({
          mealPlanId: plan._id,
        });
        return {
          ...plan.toObject(),
          assignmentCount,
        };
      })
    );

    res.json({
      success: true,
      data: {
        mealPlans: mealPlansWithStats,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / limit),
          totalMealPlans: total,
          hasNext: page * limit < total,
          hasPrev: page > 1,
        },
      },
    });
  } catch (error) {
    console.error("Get all meal plans V2 error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch meal plans",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

exports.getMealPlanDetailsV2 = async (req, res) => {
  try {
    const { id } = req.params;

    const mealPlan = await MealPlan.findById(id);
    if (!mealPlan) {
      return res.status(404).json({
        success: false,
        message: "Meal plan not found",
      });
    }

    // Get all assignments for this meal plan
    const assignments = await MealPlanAssignment.find({ mealPlanId: id })
      .populate("mealIds")
      .sort({ weekNumber: 1, dayOfWeek: 1, mealTime: 1 });

    // Group assignments by week and day
    const schedule = {};
    assignments.forEach((assignment) => {
      const week = `week${assignment.weekNumber}`;
      const day = assignment.dayOfWeek;

      if (!schedule[week]) schedule[week] = {};
      if (!schedule[week][day]) schedule[week][day] = {};

      schedule[week][day][assignment.mealTime] = {
        assignment: assignment.toObject(),
        meals: assignment.mealIds,
        customTitle: assignment.customTitle,
        customDescription: assignment.customDescription,
      };
    });

    res.json({
      success: true,
      data: {
        mealPlan,
        schedule,
        assignments: assignments.length,
        totalDays: mealPlan.getTotalDays(),
      },
    });
  } catch (error) {
    console.error("Get meal plan details V2 error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch meal plan details",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

exports.createMealPlanV2 = async (req, res) => {
  try {
    const {
      planName,
      description,
      coverImage,
      durationWeeks,
      targetAudience,
      planFeatures,
      adminNotes,
    } = req.body;

    const mealPlan = new MealPlan({
      planName,
      description,
      coverImage,
      durationWeeks: parseInt(durationWeeks) || 4,
      targetAudience,
      planFeatures: planFeatures || [],
      adminNotes,
      isPublished: false, // Default to unpublished
      totalPrice: 0, // Will be calculated when meals are assigned
      isActive: true,
    });

    await mealPlan.save();

    res.status(201).json({
      success: true,
      message: "Meal plan created successfully",
      data: mealPlan,
    });
  } catch (error) {
    console.error("Create meal plan V2 error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create meal plan",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

exports.updateMealPlanV2 = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // Don't allow direct updates to calculated fields
    delete updateData.totalPrice;
    delete updateData.nutritionInfo;
    delete updateData.stats;

    const mealPlan = await MealPlan.findByIdAndUpdate(id, updateData, {
      new: true,
    });

    if (!mealPlan) {
      return res.status(404).json({
        success: false,
        message: "Meal plan not found",
      });
    }

    // Recalculate totals and nutrition in case assignments or related data changed
    await mealPlan.updateCalculatedFields();

    res.json({
      success: true,
      message: "Meal plan updated successfully",
      data: mealPlan,
    });
  } catch (error) {
    console.error("Update meal plan V2 error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update meal plan",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

exports.deleteMealPlanV2 = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if meal plan has assignments
    const assignmentCount = await MealPlanAssignment.countDocuments({
      mealPlanId: id,
    });
    if (assignmentCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete meal plan. It has ${assignmentCount} meal assignment(s). Remove assignments first.`,
      });
    }

    const mealPlan = await MealPlan.findByIdAndDelete(id);
    if (!mealPlan) {
      return res.status(404).json({
        success: false,
        message: "Meal plan not found",
      });
    }

    res.json({
      success: true,
      message: "Meal plan deleted successfully",
    });
  } catch (error) {
    console.error("Delete meal plan V2 error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete meal plan",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

exports.publishMealPlan = async (req, res) => {
  try {
    const { id } = req.params;

    const mealPlan = await MealPlan.findById(id);
    if (!mealPlan) {
      return res.status(404).json({
        success: false,
        message: "Meal plan not found",
      });
    }

    // Check if meal plan has any assignments
    const assignmentCount = await MealPlanAssignment.countDocuments({
      mealPlanId: id,
    });
    if (assignmentCount === 0) {
      return res.status(400).json({
        success: false,
        message: "Cannot publish meal plan without any meal assignments",
      });
    }

    await mealPlan.publish();

    res.json({
      success: true,
      message: "Meal plan published successfully",
      data: mealPlan,
    });
  } catch (error) {
    console.error("Publish meal plan error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to publish meal plan",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

exports.unpublishMealPlan = async (req, res) => {
  try {
    const { id } = req.params;

    const mealPlan = await MealPlan.findById(id);
    if (!mealPlan) {
      return res.status(404).json({
        success: false,
        message: "Meal plan not found",
      });
    }

    await mealPlan.unpublish();

    res.json({
      success: true,
      message: "Meal plan unpublished successfully",
      data: mealPlan,
    });
  } catch (error) {
    console.error("Unpublish meal plan error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to unpublish meal plan",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

// ============= MEAL ASSIGNMENT SYSTEM =============
exports.getMealPlanAssignments = async (req, res) => {
  try {
    const { id } = req.params;

    // Verify meal plan exists
    const mealPlan = await MealPlan.findById(id);
    if (!mealPlan) {
      return res.status(404).json({
        success: false,
        message: "Meal plan not found",
      });
    }

    const assignments = await MealPlanAssignment.find({ mealPlanId: id })
      .populate("mealIds")
      .sort({ weekNumber: 1, dayOfWeek: 1, mealTime: 1 });

    res.json({
      success: true,
      data: {
        mealPlan: {
          id: mealPlan._id,
          planName: mealPlan.planName,
          durationWeeks: mealPlan.durationWeeks,
        },
        assignments,
      },
    });
  } catch (error) {
    console.error("Get meal plan assignments error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch meal plan assignments",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

exports.assignMealToPlan = async (req, res) => {
  try {
    const { id } = req.params; // meal plan id
    const {
      mealIds,
      customTitle,
      customDescription,
      imageUrl,
      weekNumber,
      dayOfWeek,
      mealTime,
      notes,
    } = req.body;

    // Validate inputs
    if (
      !mealIds ||
      !Array.isArray(mealIds) ||
      mealIds.length === 0 ||
      !customTitle ||
      !weekNumber ||
      !dayOfWeek ||
      !mealTime
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Missing required fields: mealIds (array), customTitle, weekNumber, dayOfWeek, mealTime",
      });
    }

    // Verify meal plan exists
    const mealPlan = await MealPlan.findById(id);
    if (!mealPlan) {
      return res.status(404).json({
        success: false,
        message: "Meal plan not found",
      });
    }

    // Verify all meals exist
    const meals = await Meal.find({ _id: { $in: mealIds } });
    if (meals.length !== mealIds.length) {
      return res.status(404).json({
        success: false,
        message: "One or more meals not found",
      });
    }

    // Validate week number against meal plan duration
    if (weekNumber < 1 || weekNumber > mealPlan.durationWeeks) {
      return res.status(400).json({
        success: false,
        message: `Week number must be between 1 and ${mealPlan.durationWeeks}`,
      });
    }

    // Validate day of week (1-7)
    if (dayOfWeek < 1 || dayOfWeek > 7) {
      return res.status(400).json({
        success: false,
        message: "Day of week must be between 1 (Monday) and 7 (Sunday)",
      });
    }

    // Validate meal time
    if (!["breakfast", "lunch", "dinner"].includes(mealTime)) {
      return res.status(400).json({
        success: false,
        message: "Meal time must be breakfast, lunch, or dinner",
      });
    }

    // Check if slot is already occupied
    const existingAssignment = await MealPlanAssignment.findOne({
      mealPlanId: id,
      weekNumber,
      dayOfWeek,
      mealTime,
    });

    if (existingAssignment) {
      // Replace existing assignment
      await MealPlanAssignment.replaceSlot(
        id,
        weekNumber,
        dayOfWeek,
        mealTime,
        mealIds,
        customTitle,
        customDescription || "",
        imageUrl || "",
        notes || ""
      );
    } else {
      // Create new assignment
      await MealPlanAssignment.create({
        mealPlanId: id,
        mealIds,
        customTitle,
        customDescription: customDescription || "",
        imageUrl: imageUrl || "",
        weekNumber,
        dayOfWeek,
        mealTime,
        notes: notes || "",
      });
    }

    // Recalculate the total price of the meal plan
    if (mealPlan) {
      await mealPlan.updateCalculatedFields();
    }

    res.json({
      success: true,
      message: existingAssignment
        ? "Meal assignment updated successfully"
        : "Meal assigned successfully",
    });
  } catch (error) {
    console.error("Assign meal to plan error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to assign meal to plan",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

exports.updateMealAssignment = async (req, res) => {
  try {
    const { id, assignmentId } = req.params;
    const updateData = req.body;

    const assignment = await MealPlanAssignment.findById(assignmentId);
    if (!assignment) {
      return res.status(404).json({
        success: false,
        message: "Assignment not found",
      });
    }

    // Verify assignment belongs to the meal plan
    if (assignment.mealPlanId.toString() !== id) {
      return res.status(400).json({
        success: false,
        message: "Assignment does not belong to this meal plan",
      });
    }

    // If changing time slot, check for conflicts
    if (updateData.weekNumber || updateData.dayOfWeek || updateData.mealTime) {
      const weekNumber = updateData.weekNumber || assignment.weekNumber;
      const dayOfWeek = updateData.dayOfWeek || assignment.dayOfWeek;
      const mealTime = updateData.mealTime || assignment.mealTime;

      const conflictingAssignment = await MealPlanAssignment.findOne({
        mealPlanId: id,
        weekNumber,
        dayOfWeek,
        mealTime,
        _id: { $ne: assignmentId },
      });

      if (conflictingAssignment) {
        return res.status(400).json({
          success: false,
          message: "Time slot is already occupied by another meal",
        });
      }
    }

    const updatedAssignment = await MealPlanAssignment.findByIdAndUpdate(
      assignmentId,
      updateData,
      { new: true }
    ).populate("mealId");

    // Recalculate the total price of the meal plan
    const mealPlan = await MealPlan.findById(id);
    if (mealPlan) {
      await mealPlan.updateCalculatedFields();
    }

    res.json({
      success: true,
      message: "Assignment updated successfully",
      data: updatedAssignment,
    });
  } catch (error) {
    console.error("Update meal assignment error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update assignment",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

exports.removeMealAssignment = async (req, res) => {
  try {
    const { id, assignmentId } = req.params;

    const assignment = await MealPlanAssignment.findById(assignmentId);
    if (!assignment) {
      return res.status(404).json({
        success: false,
        message: "Assignment not found",
      });
    }

    // Verify assignment belongs to the meal plan
    if (assignment.mealPlanId.toString() !== id) {
      return res.status(400).json({
        success: false,
        message: "Assignment does not belong to this meal plan",
      });
    }

    await MealPlanAssignment.findByIdAndDelete(assignmentId);

    // Recalculate the total price of the meal plan
    const mealPlan = await MealPlan.findById(id);
    if (mealPlan) {
      await mealPlan.updateCalculatedFields();
    }

    res.json({
      success: true,
      message: "Assignment removed successfully",
    });
  } catch (error) {
    console.error("Remove meal assignment error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to remove assignment",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

exports.getMealPlanSchedule = async (req, res) => {
  try {
    const { id } = req.params;
    const { week } = req.query;

    // Verify meal plan exists
    const mealPlan = await MealPlan.findById(id);
    if (!mealPlan) {
      return res.status(404).json({
        success: false,
        message: "Meal plan not found",
      });
    }

    let filter = { mealPlanId: id };
    if (week) {
      filter.weekNumber = parseInt(week);
    }

    const assignments = await MealPlanAssignment.find(filter)
      .populate("mealIds")
      .sort({ weekNumber: 1, dayOfWeek: 1, mealTime: 1 });

    // Group assignments into a schedule format
    const schedule = {};
    const dayNames = [
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
      "Sunday",
    ];
    const mealTimes = ["breakfast", "lunch", "dinner"];

    // Initialize schedule structure
    for (let w = 1; w <= mealPlan.durationWeeks; w++) {
      schedule[`week${w}`] = {};
      for (let d = 1; d <= 7; d++) {
        schedule[`week${w}`][dayNames[d - 1]] = {};
        mealTimes.forEach((time) => {
          schedule[`week${w}`][dayNames[d - 1]][time] = null;
        });
      }
    }

    // Fill in assignments
    assignments.forEach((assignment) => {
      const week = `week${assignment.weekNumber}`;
      const day = dayNames[assignment.dayOfWeek - 1];

      schedule[week][day][assignment.mealTime] = {
        assignmentId: assignment._id,
        meals: assignment.mealIds,
        customTitle: assignment.customTitle,
        customDescription: assignment.customDescription,
        notes: assignment.notes,
      };
    });

    res.json({
      success: true,
      data: {
        mealPlan: {
          id: mealPlan._id,
          planName: mealPlan.planName,
          durationWeeks: mealPlan.durationWeeks,
          totalPrice: mealPlan.totalPrice,
        },
        schedule,
        totalAssignments: assignments.length,
      },
    });
  } catch (error) {
    console.error("Get meal plan schedule error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch meal plan schedule",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

// ============= BULK OPERATIONS =============
exports.bulkCreateMeals = async (req, res) => {
  try {
    const { meals } = req.body;

    if (!Array.isArray(meals) || meals.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Meals array is required and cannot be empty",
      });
    }

    const createdMeals = [];
    const errors = [];

    // Process meals in batches of 10 to avoid timeouts
    const batchSize = 10;
    for (let i = 0; i < meals.length; i += batchSize) {
      const batch = meals.slice(i, i + batchSize);

      const batchPromises = batch.map(async (mealData, batchIndex) => {
        try {
          const meal = new Meal(mealData);
          await meal.save();
          return { success: true, meal, index: i + batchIndex };
        } catch (error) {
          return {
            success: false,
            error: error.message,
            meal: mealData,
            index: i + batchIndex,
          };
        }
      });

      const batchResults = await Promise.allSettled(batchPromises);

      batchResults.forEach((result, batchIndex) => {
        if (result.status === "fulfilled") {
          if (result.value.success) {
            createdMeals.push(result.value.meal);
          } else {
            errors.push({
              index: result.value.index,
              meal: result.value.meal,
              error: result.value.error,
            });
          }
        } else {
          errors.push({
            index: i + batchIndex,
            meal: batch[batchIndex],
            error: result.reason?.message || "Unknown error",
          });
        }
      });
    }

    res.json({
      success: true,
      message: `${createdMeals.length} meals created successfully`,
      data: {
        created: createdMeals,
        errors: errors,
        summary: {
          total: meals.length,
          created: createdMeals.length,
          failed: errors.length,
        },
      },
    });
  } catch (error) {
    console.error("Bulk create meals error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to bulk create meals",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

exports.bulkUpdateMealAvailability = async (req, res) => {
  try {
    const { mealIds, isAvailable } = req.body;

    if (!Array.isArray(mealIds) || mealIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Meal IDs array is required and cannot be empty",
      });
    }

    if (typeof isAvailable !== "boolean") {
      return res.status(400).json({
        success: false,
        message: "isAvailable must be a boolean value",
      });
    }

    const result = await Meal.updateMany(
      { _id: { $in: mealIds } },
      { isAvailable, updatedAt: new Date() }
    );

    res.json({
      success: true,
      message: `${result.modifiedCount} meals updated successfully`,
      data: {
        matched: result.matchedCount,
        modified: result.modifiedCount,
      },
    });
  } catch (error) {
    console.error("Bulk update meal availability error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to bulk update meal availability",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

// Get a simplified list of meal plans for admin UI
exports.getMealPlanListForAdmin = async (req, res) => {
  try {
    const mealPlans = await MealPlan.find({ isActive: true })
      .select("_id planName name")
      .lean();
    res.json({
      success: true,
      data: mealPlans,
    });
  } catch (err) {
    console.error("Get meal plan list for admin error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to fetch meal plan list",
      error: process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  }
};

// Get all unique meal plan categories
exports.getMealPlanCategories = async (req, res) => {
  try {
    const categories = await MealPlan.distinct("category");
    res.json({
      success: true,
      data: categories.filter((c) => c), // Filter out null/empty categories
    });
  } catch (err) {
    console.error("Get meal plan categories error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to fetch meal plan categories",
      error: process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  }
};

// ============= DUPLICATE MANAGEMENT =============
exports.deleteDuplicateMeals = async (req, res) => {
  try {
    console.log("🔍 Starting duplicate meal detection...");

    const duplicateGroups = await Meal.aggregate([
      {
        $group: {
          _id: {
            name: "$name",
            totalPrice: "$pricing.totalPrice",
          },
          meals: { $push: { id: "$_id", createdAt: "$createdAt" } },
          count: { $sum: 1 },
        },
      },
      {
        $match: { count: { $gt: 1 } },
      },
    ]);

    console.log(`📊 Found ${duplicateGroups.length} duplicate groups`);

    if (duplicateGroups.length === 0) {
      return res.json({
        success: true,
        message: "No duplicate meals found",
        data: {
          duplicateGroupsFound: 0,
          mealsDeleted: 0,
          assignmentsUpdated: 0,
        },
      });
    }

    let totalDeleted = 0;
    let totalAssignmentsUpdated = 0;
    const deletionLog = [];

    console.log("🗑️  Starting duplicate deletion process...");

    for (let i = 0; i < duplicateGroups.length; i++) {
      const group = duplicateGroups[i];
      const { meals } = group;

      // Progress logging for large operations
      if (i % 10 === 0) {
        console.log(
          `📈 Processing group ${i + 1}/${duplicateGroups.length} (${Math.round(
            (i / duplicateGroups.length) * 100
          )}%)`
        );
      }

      // Sort by creation date to keep the oldest (first created)
      meals.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

      const keepMeal = meals[0]; // Keep the first/oldest meal
      const duplicatesToDelete = meals.slice(1); // Delete the rest

      for (const duplicate of duplicatesToDelete) {
        try {
          // Update meal plan assignments to reference the kept meal
          const assignmentUpdateResult = await MealPlanAssignment.updateMany(
            { mealIds: duplicate.id },
            { $set: { "mealIds.$": keepMeal.id } }
          );

          // Delete the duplicate meal
          await Meal.findByIdAndDelete(duplicate.id);

          totalDeleted++;
          totalAssignmentsUpdated += assignmentUpdateResult.modifiedCount;

          deletionLog.push({
            deletedMealId: duplicate.id,
            keptMealId: keepMeal.id,
            mealName: group._id.name,
            assignmentsUpdated: assignmentUpdateResult.modifiedCount,
          });
        } catch (deleteError) {
          console.error(
            `❌ Error deleting duplicate meal ${duplicate.id}:`,
            deleteError
          );
          // Continue with next duplicate instead of failing entirely
        }
      }
    }

    console.log(
      `✅ Duplicate deletion completed: ${totalDeleted} meals deleted, ${totalAssignmentsUpdated} assignments updated`
    );

    res.json({
      success: true,
      message: `Successfully deleted ${totalDeleted} duplicate meals and updated ${totalAssignmentsUpdated} meal plan assignments`,
      data: {
        duplicateGroupsFound: duplicateGroups.length,
        mealsDeleted: totalDeleted,
        assignmentsUpdated: totalAssignmentsUpdated,
        deletionLog,
      },
    });
  } catch (error) {
    console.error("Delete duplicate meals error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete duplicate meals",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};
