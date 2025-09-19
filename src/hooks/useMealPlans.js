// src/hooks/useMealPlans.js
import { useState, useEffect, useCallback } from "react";
import apiService from "../services/api";

export const useMealPlans = () => {
  const [mealPlans, setMealPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [progressiveLoading, setProgressiveLoading] = useState(false);

  // Progressive rendering function - adds meal plans one by one
  const addMealPlanProgressively = useCallback((newPlan) => {
    setMealPlans(prev => {
      // Check if plan already exists to avoid duplicates
      const exists = prev.some(plan => plan.id === newPlan.id);
      if (exists) return prev;
      
      return [...prev, newPlan];
    });
  }, []);

  // Transform all plans first, then set them all at once (no progressive loading glitch)
  const processPlansProgressively = useCallback((plans) => {
    if (!Array.isArray(plans)) {
      console.warn("❌ processPlansProgressively called with non-array:", plans);
      setMealPlans([]);
      setProgressiveLoading(false);
      setLoading(false);
      return;
    }
    
    setProgressiveLoading(true);
    
    // Transform all plans synchronously
    const transformedPlans = plans.map(plan => ({
      id: plan._id || plan.planId,
      planId: plan.planId,
      name: plan.name || plan.planName,
      subtitle: plan.subtitle,
      description: plan.description,
      price: plan.price || plan.totalPrice,
      originalPrice: Math.round((plan.price || plan.totalPrice) * 1.2),
      duration: plan.duration || `${plan.durationWeeks || 1} week(s)`,
      meals: plan.meals,
      targetAudience: plan.targetAudience,
      rating: plan.avgRating || plan.averageRating || null,
      averageRating: plan.avgRating || plan.averageRating || null,
      mealType: plan.mealTypes ? plan.mealTypes.join(', ') : null,
      category: plan.targetAudience,
      image: plan.image || plan.coverImage || plan.planImageUrl || null,
      gradient: getGradientByAudience(plan.targetAudience),
      tag: getTagByAudience(plan.targetAudience),
      features: plan.features || plan.planFeatures || [],
      nutrition: plan.nutrition || plan.nutritionInfo || {},
      weeklyMeals: plan.weeklyMeals || {},
      mealImages: plan.mealImages || {},
      isActive: plan.isActive,
      createdAt: plan.createdAt,
      durationWeeks: plan.durationWeeks,
    }));
    
    // Set all plans at once - no glitching
    setMealPlans(transformedPlans);
    setProgressiveLoading(false);
    setLoading(false);
  }, [addMealPlanProgressively]);

  const fetchMealPlans = useCallback(
    async (showRefreshing = false, forceRefresh = false) => {
      try {
        if (showRefreshing) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }
        setError(null);

        console.log(
          "🍽️ Fetching all meal plans from backend...",
          forceRefresh ? "(forced refresh)" : ""
        );
        const response = await apiService.getMealPlans(forceRefresh);

        if (response.success) {
          console.log(`📦 Received ${response.data.length} meal plans, starting progressive rendering...`);
          
          // Use progressive rendering instead of setting all at once
          processPlansProgressively(response.data);
          
          console.log(`✅ Started progressive loading of ${response.data.length} meal plans`);

          if (response.offline) {
            console.log("📱 Using offline meal plans data");
          }
        } else {
          setError(response.error || "Failed to load meal plans");
          console.error("❌ Failed to fetch meal plans:", response.error);
        }
      } catch (err) {
        const errorMessage =
          "Failed to load meal plans. Please check your connection.";
        setError(errorMessage);
        console.error("❌ Meal plans fetch error:", err);
      } finally {
        // Only set loading to false if progressive loading isn't active
        if (!progressiveLoading) {
          setLoading(false);
        }
        setRefreshing(false);
      }
    },
    [processPlansProgressively, progressiveLoading]
  );

  const refreshMealPlans = useCallback(
    (forceRefresh = true) => {
      fetchMealPlans(true, forceRefresh);
    },
    [fetchMealPlans]
  );

  const getMealPlanById = useCallback(async (id) => {
    try {
      console.log(`🔍 Fetching meal plan details for ID: ${id}`);
      const response = await apiService.getMealPlanById(id);

      if (response.success) {
        const plan = response.data;
        return {
          id: plan._id || plan.planId,
          planId: plan.planId, // Keep original planId for API calls
          name: plan.planName,
          subtitle: plan.description,
          description: plan.description, // Include description field
          price: plan.basePrice,
          originalPrice: Math.round(plan.basePrice * 1.2),
          duration: plan.planDuration || "7 days",
          meals: `${plan.mealsPerWeek || 14} meals`,
          targetAudience: plan.targetAudience,
          image: plan.planImageUrl || null,
          gradient: getGradientByAudience(plan.targetAudience),
          tag: getTagByAudience(plan.targetAudience),
          features: plan.features || [],
          nutrition: plan.nutrition || {},
          weeklyMeals: plan.weeklyMeals || {},
          mealImages: plan.mealImages || {}, // Add meal images
          isActive: plan.isActive,
          createdAt: plan.createdAt,
        };
      } else {
        console.error("❌ Failed to fetch meal plan details:", response.error);
        return null;
      }
    } catch (err) {
      console.error("❌ Get meal plan by ID error:", err);
      return null;
    }
  }, []);

  useEffect(() => {
    fetchMealPlans();
  }, [fetchMealPlans]);

  return {
    mealPlans,
    loading,
    error,
    refreshing,
    progressiveLoading,
    refreshMealPlans,
    getMealPlanById,
    refetch: fetchMealPlans,
    forceRefresh: () => fetchMealPlans(false, true),
  };
};

// Helper functions to assign gradients and tags based on target audience
const getGradientByAudience = (audience) => {
  const gradients = {
    Fitness: ["#FF6B6B", "#FF8E53"],
    Professional: ["#4ECDC4", "#44A08D"],
    Family: ["#A8E6CF", "#88D8A3"],
    Wellness: ["#FFB347", "#FF8C42"],
  };
  return gradients[audience] || ["#667eea", "#764ba2"];
};

const getTagByAudience = (audience) => {
  const tags = {
    Fitness: "Most Popular",
    Professional: "Best Value",
    Family: "Family Size",
    Wellness: "Premium",
  };
  return tags[audience] || "New";
};

export default useMealPlans;
