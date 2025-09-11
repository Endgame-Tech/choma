// src/hooks/useMealPlans.js
import { useState, useEffect, useCallback } from 'react';
import apiService from '../services/api';

export const useMealPlans = () => {
  const [mealPlans, setMealPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchMealPlans = useCallback(async (showRefreshing = false, forceRefresh = false) => {
    try {
      if (showRefreshing) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      console.log('🍽️ Fetching popular meal plans from backend...', forceRefresh ? '(forced refresh)' : '');
      const response = await apiService.getPopularMealPlans(forceRefresh);

      if (response.success) {
        // Transform backend data to match frontend expectations
        const transformedPlans = response.data.map(plan => ({
          id: plan._id || plan.planId,
          planId: plan.planId,
          name: plan.name,
          subtitle: plan.subtitle,
          price: plan.price,
          originalPrice: Math.round(plan.price * 1.2),
          duration: plan.duration,
          meals: plan.meals,
          targetAudience: plan.targetAudience,
          image: plan.image || null,
          gradient: getGradientByAudience(plan.targetAudience),
          tag: getTagByAudience(plan.targetAudience),
          features: plan.features || [],
          nutrition: plan.nutrition || {},
          weeklyMeals: plan.weeklyMeals || {},
          mealImages: plan.mealImages || {},
          isActive: plan.isActive,
          createdAt: plan.createdAt
        }));

        setMealPlans(transformedPlans);
        console.log(`✅ Loaded ${transformedPlans.length} meal plans`);
        
        if (response.offline) {
          console.log('📱 Using offline meal plans data');
        }
      } else {
        setError(response.error || 'Failed to load meal plans');
        console.error('❌ Failed to fetch meal plans:', response.error);
      }
    } catch (err) {
      const errorMessage = 'Failed to load meal plans. Please check your connection.';
      setError(errorMessage);
      console.error('❌ Meal plans fetch error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const refreshMealPlans = useCallback((forceRefresh = true) => {
    fetchMealPlans(true, forceRefresh);
  }, [fetchMealPlans]);

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
          price: plan.basePrice,
          originalPrice: Math.round(plan.basePrice * 1.2),
          duration: plan.planDuration || '7 days',
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
          createdAt: plan.createdAt
        };
      } else {
        console.error('❌ Failed to fetch meal plan details:', response.error);
        return null;
      }
    } catch (err) {
      console.error('❌ Get meal plan by ID error:', err);
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
    refreshMealPlans,
    getMealPlanById,
    refetch: fetchMealPlans,
    forceRefresh: () => fetchMealPlans(false, true)
  };
};

// Helper functions to assign gradients and tags based on target audience
const getGradientByAudience = (audience) => {
  const gradients = {
    'Fitness': ['#FF6B6B', '#FF8E53'],
    'Professional': ['#4ECDC4', '#44A08D'],
    'Family': ['#A8E6CF', '#88D8A3'],
    'Wellness': ['#FFB347', '#FF8C42']
  };
  return gradients[audience] || ['#667eea', '#764ba2'];
};

const getTagByAudience = (audience) => {
  const tags = {
    'Fitness': 'Most Popular',
    'Professional': 'Best Value',
    'Family': 'Family Size',
    'Wellness': 'Premium'
  };
  return tags[audience] || 'New';
};

export default useMealPlans;
