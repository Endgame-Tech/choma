const MealPlan = require("../models/MealPlan");
const MealPlanAssignment = require("../models/MealPlanAssignment");
const DailyMeal = require("../models/DailyMeal");

// Get all meal plans (for mobile - only published)
exports.getAllMealPlans = async (req, res) => {
  try {
    // Debug: Log all meal plans with their publication status
    const allPlans = await MealPlan.find({ isActive: true });
    console.log("📊 All active meal plans for getAllMealPlans:");
    allPlans.forEach((plan) => {
      console.log(
        `  - ${plan.planName}: isPublished=${plan.isPublished}, createdDate=${plan.createdDate}`
      );
    });

    const mealPlans = await MealPlan.find({
      isActive: true,
      isPublished: true, // Only show published plans
    }).sort({ sortOrder: 1, createdDate: -1 });

    console.log(
      `📱 getAllMealPlans returning ${mealPlans.length} published meal plans out of ${allPlans.length} active plans`
    );

    // For each meal plan, get assignments and format for frontend compatibility
    const formattedMealPlans = await Promise.all(
      mealPlans.map(async (mealPlan) => {
        const assignments = await MealPlanAssignment.find({
          mealPlanId: mealPlan._id,
        })
          .populate({
            path: "mealIds",
            match: { isActive: true },
          })
          .limit(6); // Limit to first 6 assignments for performance

        // Flatten sample meals for frontend compatibility
        const sampleMeals = assignments
          .reduce((meals, assignment) => {
            if (assignment.mealIds && assignment.mealIds.length > 0) {
              return meals.concat(
                assignment.mealIds.filter((meal) => meal !== null)
              );
            }
            return meals;
          }, [])
          .slice(0, 6); // Limit to 6 sample meals

        // Use fallback pricing if totalPrice is 0 or undefined
        const fallbackPrice = 25000; // Default price if no totalPrice set
        const effectivePrice =
          mealPlan.totalPrice && mealPlan.totalPrice > 0
            ? mealPlan.totalPrice
            : fallbackPrice;

        return {
          ...mealPlan.toObject(),
          id: mealPlan._id,
          name: mealPlan.planName,
          subtitle: mealPlan.targetAudience,
          description: mealPlan.description, // Include description field
          price: effectivePrice,
          basePrice: effectivePrice,
          totalPrice: effectivePrice, // Add this field explicitly
          originalPrice: effectivePrice * 1.25, // Add a dummy original price for UI
          meals: `${mealPlan.stats.avgMealsPerDay || 0} meals/day`,
          duration: `${mealPlan.durationWeeks} week(s)`,
          image: mealPlan.coverImage,
          planImageUrl: mealPlan.coverImage,
          features: mealPlan.planFeatures || [],
          gradient: ["#3B82F6", "#8B5CF6"], // Default gradient for card UI
          tag: mealPlan.isPublished ? "Popular" : "Draft",
          sampleMeals: sampleMeals.map((meal) => ({
            ...meal.toObject(),
            image: meal.mainImageUrl || meal.image,
          })),
          totalMealsAssigned: assignments.length,
        };
      })
    );

    res.json({
      success: true,
      data: formattedMealPlans,
      count: formattedMealPlans.length,
    });
  } catch (err) {
    console.error("Get meal plans error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to fetch meal plans",
      error: process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  }
};

// Get popular meal plans (for mobile - only published)
exports.getPopularMealPlans = async (req, res) => {
  try {
    // Debug: Log all meal plans with their publication status
    const allPlans = await MealPlan.find({ isActive: true });
    console.log("📊 All active meal plans:");
    allPlans.forEach((plan) => {
      console.log(
        `  - ${plan.planName}: isPublished=${plan.isPublished}, createdDate=${plan.createdDate}`
      );
    });

    const mealPlans = await MealPlan.find({
      isActive: true,
      isPublished: true, // Only show published plans
    });

    console.log(
      `📱 Returning ${mealPlans.length} published meal plans out of ${allPlans.length} active plans`
    );

    // Calculate popularity score
    const popularMealPlans = mealPlans.map((plan) => {
      const score = plan.totalSubscriptions * 0.7 + plan.avgRating * 0.3;
      return {
        ...plan.toObject(),
        id: plan._id,
        name: plan.planName,
        subtitle: plan.targetAudience,
        description: plan.description, // Include description field
        price: plan.totalPrice || 0,
        originalPrice: (plan.totalPrice || 0) * 1.25,
        meals: `${plan.stats.avgMealsPerDay || 0} meals/day`,
        duration: `${plan.durationWeeks} week(s)`,
        image: plan.coverImage,
        features: plan.planFeatures || [],
        gradient: ["#3B82F6", "#8B5CF6"],
        tag: plan.isPublished ? "Popular" : "Draft",
        score,
      };
    });

    // Sort by score and return top 10
    popularMealPlans.sort((a, b) => b.score - a.score);
    const top10 = popularMealPlans.slice(0, 10);

    res.json({
      success: true,
      data: top10,
      count: top10.length,
    });
  } catch (err) {
    console.error("Get popular meal plans error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to fetch popular meal plans",
      error: process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  }
};

// Get meal plan by ID
exports.getMealPlanById = async (req, res) => {
  try {
    const { id } = req.params;

    let mealPlan;

    // Check if ID is a valid MongoDB ObjectId
    if (/^[0-9a-fA-F]{24}$/.test(id)) {
      // Valid ObjectId format - search by _id
      mealPlan = await MealPlan.findById(id);
    } else {
      // Not a valid ObjectId - search by planId field instead
      mealPlan = await MealPlan.findOne({ planId: id });
    }

    if (!mealPlan) {
      return res.status(404).json({
        success: false,
        message: "Meal plan not found",
      });
    }

    // Get meal assignments and populate with actual meals
    const assignments = await MealPlanAssignment.find({
      mealPlanId: mealPlan._id,
    })
      .populate({
        path: "mealIds",
        match: { isActive: true },
      })
      .sort({ weekNumber: 1, dayOfWeek: 1, mealTime: 1 });

    // Create frontend-compatible format
    // Use fallback pricing if totalPrice is 0 or undefined
    const fallbackPrice = 25000; // Default price if no totalPrice set
    const effectivePrice =
      mealPlan.totalPrice && mealPlan.totalPrice > 0
        ? mealPlan.totalPrice
        : fallbackPrice;

    console.log("🍽️ Meal plan pricing debug:", {
      planName: mealPlan.planName,
      totalPrice: mealPlan.totalPrice,
      effectivePrice,
      durationWeeks: mealPlan.durationWeeks,
      mealTypes: mealPlan.mealTypes,
      assignmentCount: assignments.length,
    });

    const formattedMealPlan = {
      ...mealPlan.toObject(),
      id: mealPlan._id,
      name: mealPlan.planName,
      price: effectivePrice,
      basePrice: effectivePrice,
      totalPrice: effectivePrice, // Add this field explicitly
      duration: `${mealPlan.durationWeeks} weeks`,
      planDuration: `${mealPlan.durationWeeks} weeks`,
      mealsPerWeek: mealPlan.stats.avgMealsPerDay
        ? mealPlan.stats.avgMealsPerDay * 7
        : 0,
      image: mealPlan.coverImage,
      planImageUrl: mealPlan.coverImage,
      features: mealPlan.planFeatures || [],
      weeklyMeals: organizeScheduleByWeek(assignments, true),

      sampleMeals: assignments.reduce((meals, assignment) => {
        if (assignment.mealIds && assignment.mealIds.length > 0) {
          return meals.concat(
            assignment.mealIds.filter((meal) => meal !== null)
          );
        }
        return meals;
      }, []),
      totalMealsAssigned: assignments.length,
      totalUniqueMeals: [
        ...new Set(
          assignments
            .flatMap((a) => a.mealIds.map((m) => m?._id?.toString()))
            .filter(Boolean)
        ),
      ].length,
      assignments: assignments.map((assignment) => ({
        ...assignment.toObject(),
        dayName: assignment.getDayName(),
        formattedMealTime: assignment.getFormattedMealTime(),
      })),
    };

    res.json({
      success: true,
      data: formattedMealPlan,
    });
  } catch (err) {
    console.error("Get meal plan by ID error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to fetch meal plan",
      error: process.env.NODE_ENV === "development" ? err.message : undefined,
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
      basePrice,
      mealsPerWeek,
      planFeatures,
      planImage,
      galleryImages,
      nutritionInfo,
      sampleMeals,
    } = req.body;

    // Validation
    if (!planName || !basePrice) {
      return res.status(400).json({
        success: false,
        message: "Plan name and base price are required",
      });
    }

    const mealPlan = await MealPlan.create({
      planName,
      description,
      targetAudience,
      basePrice,
      mealsPerWeek,
      planFeatures,
      planImage,
      galleryImages,
      nutritionInfo,
      sampleMeals,
    });

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

// Update meal plan
exports.updateMealPlan = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

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

// Delete meal plan
exports.deleteMealPlan = async (req, res) => {
  try {
    const { id } = req.params;

    const mealPlan = await MealPlan.findByIdAndUpdate(
      id,
      { isActive: false },
      { new: true }
    );

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
  } catch (err) {
    console.error("Delete meal plan error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to delete meal plan",
      error: process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  }
};

// Get available daily meals for customization
exports.getAvailableMeals = async (req, res) => {
  try {
    const { mealType, dietaryPreferences, excludeIngredients } = req.query;

    let query = { isActive: true };

    // Filter by meal type if specified
    if (mealType) {
      query.mealType = mealType;
    }

    let meals = await DailyMeal.find(query).sort({ mealName: 1 });

    // Filter by dietary preferences and excluded ingredients
    if (dietaryPreferences || excludeIngredients) {
      const preferences = dietaryPreferences
        ? dietaryPreferences.split(",")
        : [];
      const excluded = excludeIngredients ? excludeIngredients.split(",") : [];

      meals = meals.filter((meal) => {
        // Check dietary preferences
        if (preferences.length > 0) {
          const mealIngredients = meal.ingredients
            ? meal.ingredients.toLowerCase()
            : "";
          const hasRestrictedIngredient = preferences.some((pref) => {
            switch (pref.toLowerCase()) {
              case "vegetarian":
                return (
                  mealIngredients.includes("chicken") ||
                  mealIngredients.includes("beef") ||
                  mealIngredients.includes("pork") ||
                  mealIngredients.includes("fish")
                );
              case "vegan":
                return (
                  mealIngredients.includes("chicken") ||
                  mealIngredients.includes("beef") ||
                  mealIngredients.includes("pork") ||
                  mealIngredients.includes("fish") ||
                  mealIngredients.includes("dairy") ||
                  mealIngredients.includes("egg")
                );
              case "gluten-free":
                return (
                  mealIngredients.includes("wheat") ||
                  mealIngredients.includes("gluten") ||
                  mealIngredients.includes("bread")
                );
              case "dairy-free":
                return (
                  mealIngredients.includes("milk") ||
                  mealIngredients.includes("cheese") ||
                  mealIngredients.includes("dairy")
                );
              case "halal":
                return mealIngredients.includes("pork");
              default:
                return false;
            }
          });
          if (hasRestrictedIngredient) return false;
        }

        // Check excluded ingredients
        if (excluded.length > 0) {
          const mealIngredients = meal.ingredients
            ? meal.ingredients.toLowerCase()
            : "";
          const hasExcludedIngredient = excluded.some((ingredient) =>
            mealIngredients.includes(ingredient.toLowerCase())
          );
          if (hasExcludedIngredient) return false;
        }

        return true;
      });
    }

    res.json({
      success: true,
      data: meals,
      count: meals.length,
    });
  } catch (err) {
    console.error("Get available meals error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to fetch available meals",
      error: process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  }
};

// Save meal customization preferences
exports.saveMealCustomization = async (req, res) => {
  try {
    const { mealPlanId, preferences, selectedMeals, mealSwaps } = req.body;

    const customerId = req.customer.id;

    // This would create a new MealCustomization model/collection
    // For now, we'll store it as a simple object
    const customization = {
      customerId,
      mealPlanId,
      preferences: {
        mealFrequency: preferences.mealFrequency || "daily",
        portionSize: preferences.portionSize || "regular",
        spiceLevel: preferences.spiceLevel || "medium",
        cookingStyle: preferences.cookingStyle || "balanced",
        excludedIngredients: preferences.excludedIngredients || [],
      },
      selectedMeals: selectedMeals || [],
      mealSwaps: mealSwaps || {},
      createdDate: new Date(),
      lastModified: new Date(),
    };

    // In a real implementation, you'd save this to a MealCustomization collection
    console.log("Meal customization saved:", customization);

    res.json({
      success: true,
      message: "Meal customization saved successfully",
      data: customization,
    });
  } catch (err) {
    console.error("Save meal customization error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to save meal customization",
      error: process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  }
};

// Get customer's meal customization preferences
exports.getMealCustomization = async (req, res) => {
  try {
    const { mealPlanId } = req.params;
    const customerId = req.user.id;

    // This would fetch from a MealCustomization collection
    // For now, return default preferences
    const defaultCustomization = {
      customerId,
      mealPlanId,
      preferences: {
        mealFrequency: "daily",
        portionSize: "regular",
        spiceLevel: "medium",
        cookingStyle: "balanced",
        excludedIngredients: [],
      },
      selectedMeals: [],
      mealSwaps: {},
    };

    res.json({
      success: true,
      data: defaultCustomization,
    });
  } catch (err) {
    console.error("Get meal customization error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to fetch meal customization",
      error: process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  }
};

// ============= NEW FILTERING ENDPOINTS =============

// Get filtered meal plans with advanced filtering
exports.getFilteredMealPlans = async (req, res) => {
  try {
    const {
      audience,
      minPrice,
      maxPrice,
      duration,
      sortBy = "popularity",
      page = 1,
      limit = 20,
    } = req.query;

    // Build query for published meal plans only
    const query = {
      isActive: true,
      isPublished: true, // Only show published plans in mobile
    };

    // Filter by target audience
    if (audience) {
      if (Array.isArray(audience)) {
        query.targetAudience = { $in: audience };
      } else {
        query.targetAudience = audience;
      }
    }

    // Filter by price range
    if (minPrice || maxPrice) {
      query.totalPrice = {};
      if (minPrice) query.totalPrice.$gte = parseFloat(minPrice);
      if (maxPrice) query.totalPrice.$lte = parseFloat(maxPrice);
    }

    // Filter by duration (if using duration field)
    if (duration) {
      query.durationWeeks = parseInt(duration);
    }

    // Execute query with pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    let sortQuery = {};

    // Determine sort order
    switch (sortBy) {
      case "price-low":
        sortQuery = { totalPrice: 1 };
        break;
      case "price-high":
        sortQuery = { totalPrice: -1 };
        break;
      case "newest":
        sortQuery = { createdDate: -1 };
        break;
      case "rating":
        sortQuery = { avgRating: -1 };
        break;
      default: // popularity
        sortQuery = { totalSubscriptions: -1, avgRating: -1 };
    }

    const mealPlans = await MealPlan.find(query)
      .populate("sampleMeals")
      .sort(sortQuery)
      .skip(skip)
      .limit(parseInt(limit));

    const totalCount = await MealPlan.countDocuments(query);

    res.json({
      success: true,
      data: mealPlans,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalCount / parseInt(limit)),
        totalItems: totalCount,
        hasNext: skip + mealPlans.length < totalCount,
        hasPrev: parseInt(page) > 1,
      },
    });
  } catch (err) {
    console.error("Get filtered meal plans error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to fetch filtered meal plans",
      error: process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  }
};

// Enhanced search with filtering
exports.searchMealPlans = async (req, res) => {
  try {
    const {
      query: searchQuery = "",
      audience,
      minPrice,
      maxPrice,
      sortBy = "relevance",
      page = 1,
      limit = 20,
    } = req.query;

    // Build base query for published plans
    const baseQuery = {
      isActive: true,
      isPublished: true,
    };

    // Add text search if query provided
    if (searchQuery.trim()) {
      baseQuery.$or = [
        { planName: { $regex: searchQuery, $options: "i" } },
        { description: { $regex: searchQuery, $options: "i" } },
        { targetAudience: { $regex: searchQuery, $options: "i" } },
        { planFeatures: { $in: [new RegExp(searchQuery, "i")] } },
      ];
    }

    // Apply additional filters
    if (audience) {
      if (Array.isArray(audience)) {
        baseQuery.targetAudience = { $in: audience };
      } else {
        baseQuery.targetAudience = audience;
      }
    }

    if (minPrice || maxPrice) {
      baseQuery.totalPrice = {};
      if (minPrice) baseQuery.totalPrice.$gte = parseFloat(minPrice);
      if (maxPrice) baseQuery.totalPrice.$lte = parseFloat(maxPrice);
    }

    // Execute search with pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    let sortQuery = {};

    switch (sortBy) {
      case "price-low":
        sortQuery = { totalPrice: 1 };
        break;
      case "price-high":
        sortQuery = { totalPrice: -1 };
        break;
      case "newest":
        sortQuery = { createdDate: -1 };
        break;
      default: // relevance
        sortQuery = searchQuery.trim() ? {} : { totalSubscriptions: -1 };
    }

    const results = await MealPlan.find(baseQuery)
      .populate("sampleMeals")
      .sort(sortQuery)
      .skip(skip)
      .limit(parseInt(limit));

    const totalCount = await MealPlan.countDocuments(baseQuery);

    res.json({
      success: true,
      data: results,
      searchQuery: searchQuery,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalCount / parseInt(limit)),
        totalItems: totalCount,
        hasNext: skip + results.length < totalCount,
        hasPrev: parseInt(page) > 1,
      },
    });
  } catch (err) {
    console.error("Search meal plans error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to search meal plans",
      error: process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  }
};

// Get available target audiences
exports.getTargetAudiences = async (req, res) => {
  try {
    // Get distinct target audiences from published meal plans
    const audiences = await MealPlan.distinct("targetAudience", {
      isActive: true,
      isPublished: true,
    });

    // Provide additional metadata for each audience
    const audienceData = await Promise.all(
      audiences.map(async (audience) => {
        const count = await MealPlan.countDocuments({
          targetAudience: audience,
          isActive: true,
          isPublished: true,
        });

        return {
          name: audience,
          count,
          // Add display metadata
          displayName: audience,
          description: getAudienceDescription(audience),
        };
      })
    );

    res.json({
      success: true,
      data: audienceData.sort((a, b) => b.count - a.count), // Sort by popularity
    });
  } catch (err) {
    console.error("Get target audiences error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to fetch target audiences",
      error: process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  }
};

// Helper function to organize schedule by week
function organizeScheduleByWeek(assignments, useV2Format = false) {
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

  assignments.forEach((assignment) => {
    const weekKey = `week${assignment.weekNumber}`;
    if (!schedule[weekKey]) {
      schedule[weekKey] = {};
    }

    const dayName = dayNames[assignment.dayOfWeek - 1];
    if (!schedule[weekKey][dayName]) {
      schedule[weekKey][dayName] = {};
    }

    if (useV2Format) {
      // New format for the detail screen
      schedule[weekKey][dayName][assignment.mealTime] = {
        title: assignment.customTitle,
        description:
          assignment.customDescription ||
          (assignment.mealIds[0] ? assignment.mealIds[0].description : ""),
        meals: assignment.mealIds.map((meal) => meal.name).join(", "),
        remark: assignment.notes || "",
        imageUrl:
          assignment.imageUrl ||
          (assignment.mealIds[0] ? assignment.mealIds[0].image : ""),
      };
    } else {
      // Original format for other uses
      schedule[weekKey][dayName] = {
        dayNumber: assignment.dayOfWeek,
        dayName: dayName,
        meals: {
          ...(schedule[weekKey][dayName].meals || {}),
          [assignment.mealTime]: {
            assignmentId: assignment.assignmentId,
            customTitle: assignment.customTitle,
            customDescription: assignment.customDescription,
            imageUrl: assignment.imageUrl,
            notes: assignment.notes,
            meals: assignment.mealIds || [],
            totalMeals: assignment.mealIds ? assignment.mealIds.length : 0,
            totalCalories: assignment.mealIds
              ? assignment.mealIds.reduce(
                  (sum, meal) => sum + (meal?.nutrition?.calories || 0),
                  0
                )
              : 0,
            totalPrice: assignment.mealIds
              ? assignment.mealIds.reduce(
                  (sum, meal) => sum + (meal?.pricing?.totalPrice || 0),
                  0
                )
              : 0,
          },
        },
      };
    }
  });

  return schedule;
}

// Helper function to get audience descriptions
function getAudienceDescription(audience) {
  const descriptions = {
    Fitness: "High-protein meals for active lifestyles",
    Family: "Nutritious meals perfect for families",
    Professional: "Quick, convenient meals for busy professionals",
    Wellness: "Balanced meals focused on overall health",
    "Weight Loss": "Calorie-controlled meals for weight management",
    "Muscle Gain": "High-protein, high-calorie meals for muscle building",
    "Diabetic Friendly": "Low-sugar, diabetes-friendly meal options",
    "Heart Healthy": "Heart-healthy meals with reduced sodium",
  };

  return descriptions[audience] || "Delicious and nutritious meal plans";
}
