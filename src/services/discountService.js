// src/services/discountService.js - Dynamic Discount System
import apiService from './api';

class DiscountService {
  constructor() {
    this.userActivityCache = new Map();
    this.discountRulesCache = new Map();
  }

  /**
   * Calculate discount for a user and meal plan
   * @param {Object} user - User data
   * @param {Object} mealPlan - Meal plan data
   * @returns {Object} Discount information
   */
  async calculateDiscount(user, mealPlan) {
    try {
      
      if (!user || !mealPlan) {
        console.log("❌ DISCOUNT SERVICE: Missing user or meal plan data");
        return { discountPercent: 0, discountAmount: 0, reason: 'No user or meal plan data' };
      }

      const mealPlanId = mealPlan.id || mealPlan._id;
      const userId = user.id || user._id;
      

      const discountRulesResponse = await this.getMealPlanDiscountRules(mealPlanId);
      
      // Extract the actual rules array from the response
      const discountRules = discountRulesResponse?.data || discountRulesResponse || [];
      
      if (!discountRules || discountRules.length === 0) {
        return { discountPercent: 0, discountAmount: 0, reason: 'No discount rules configured' };
      }

      const applicableDiscounts = [];
      
      for (const rule of discountRules) {
        
        // First check if this rule applies to this meal plan
        const mealPlanEligibility = this.checkMealPlanEligibility(mealPlan, rule);
        if (!mealPlanEligibility.eligible) {
          console.log(`❌ Rule "${rule.name}" not applicable to meal plan: ${mealPlanEligibility.reason}`);
          continue;
        }
        
        console.log(`✅ Rule "${rule.name}" applicable to meal plan`);

        // Handle universal discounts without user activity
        if (rule.targetSegment === 'all_users') {
          applicableDiscounts.push({
            ...rule,
            eligibilityReason: 'Universal discount',
            mealPlanEligibilityReason: mealPlanEligibility.reason
          });
          continue;
        }
        
        // For user-specific discounts, try to get user activity but don't fail if it doesn't work
        try {
          console.log("📊 DISCOUNT SERVICE: Fetching user activity for user-specific discount:", userId);
          const userActivity = await this.getUserActivity(userId);
          console.log("📊 DISCOUNT SERVICE: Retrieved user activity:", userActivity);
          
          // Then check user eligibility
          const eligibility = await this.checkDiscountEligibility(user, userActivity, rule);
          if (eligibility.eligible) {
            console.log(`🎉 User-specific discount found: ${rule.name}`);
            applicableDiscounts.push({
              ...rule,
              eligibilityReason: eligibility.reason,
              mealPlanEligibilityReason: mealPlanEligibility.reason
            });
          } else {
            console.log(`❌ User not eligible for ${rule.name}: ${eligibility.reason}`);
          }
        } catch (error) {
          console.error(`❌ Failed to evaluate user-specific rule ${rule.name}:`, error);
          // Don't fail the entire discount calculation, just skip this rule
          continue;
        }
      }

      if (applicableDiscounts.length === 0) {
        return { discountPercent: 0, discountAmount: 0, reason: 'User not eligible for any discounts' };
      }

      // Apply the highest discount if multiple are applicable
      const bestDiscount = applicableDiscounts.reduce((best, current) => 
        current.discountPercent > best.discountPercent ? current : best
      );

      const basePrice = mealPlan.totalPrice || mealPlan.basePrice || mealPlan.price || 0;
      const discountAmount = Math.round((basePrice * bestDiscount.discountPercent) / 100);

      return {
        discountPercent: bestDiscount.discountPercent,
        discountAmount,
        discountedPrice: basePrice - discountAmount,
        originalPrice: basePrice,
        reason: bestDiscount.name,
        eligibilityReason: bestDiscount.eligibilityReason,
        validUntil: bestDiscount.validUntil,
        isLimitedTime: !!bestDiscount.validUntil
      };

    } catch (error) {
      console.error('Error calculating discount:', error);
      return { discountPercent: 0, discountAmount: 0, reason: 'Error calculating discount' };
    }
  }

  /**
   * Get discount rules for a specific meal plan
   * @param {string} mealPlanId - Meal plan ID
   * @returns {Array} Discount rules
   */
  async getMealPlanDiscountRules(mealPlanId) {
    const cacheKey = `rules_${mealPlanId}`;
    
    if (this.discountRulesCache.has(cacheKey)) {
      const cached = this.discountRulesCache.get(cacheKey);
      if (Date.now() - cached.timestamp < 300000) { // 5 minutes cache
        return cached.data;
      }
    }

    try {
      const result = await apiService.getMealPlanDiscountRules(mealPlanId);
      console.log("🔍 getMealPlanDiscountRules API result:", result);
      
      if (result.success && result.data) {
        this.discountRulesCache.set(cacheKey, {
          data: result.data,
          timestamp: Date.now()
        });
        return result.data; // Return just the data array
      }

      // Fallback: get global discount rules if meal plan specific rules not found
      console.log("🔍 Falling back to global discount rules");
      const globalResult = await apiService.getGlobalDiscountRules();
      console.log("🔍 Global discount rules result:", globalResult);
      
      if (globalResult.success && globalResult.data) {
        return globalResult.data; // Return just the data array
      }

      return [];
    } catch (error) {
      console.error('Error fetching discount rules:', error);
      return [];
    }
  }

  /**
   * Get user activity data for discount calculation
   * @param {string} userId - User ID
   * @returns {Object} User activity data
   */
  async getUserActivity(userId) {
    const cacheKey = `activity_${userId}`;
    
    if (this.userActivityCache.has(cacheKey)) {
      const cached = this.userActivityCache.get(cacheKey);
      if (Date.now() - cached.timestamp < 60000) { // 1 minute cache
        return cached.data;
      }
    }

    try {
      const result = await apiService.getUserActivity(userId);
      
      const activityData = result.success && result.data ? result.data : {
        isFirstTime: true,
        lastOrderDate: null,
        totalOrders: 0,
        totalSpent: 0,
        subscriptionStreak: 0,
        daysSinceLastOrder: null,
        monthsSinceLastOrder: null,
        isConsistentUser: false,
        registrationDate: null,
        daysSinceRegistration: 0
      };

      this.userActivityCache.set(cacheKey, {
        data: activityData,
        timestamp: Date.now()
      });

      return activityData;
    } catch (error) {
      console.error('Error fetching user activity:', error);
      return {
        isFirstTime: true,
        lastOrderDate: null,
        totalOrders: 0,
        totalSpent: 0,
        subscriptionStreak: 0,
        daysSinceLastOrder: null,
        monthsSinceLastOrder: null,
        isConsistentUser: false,
        registrationDate: null,
        daysSinceRegistration: 0
      };
    }
  }

  /**
   * Check if a meal plan is eligible for a discount rule
   * @param {Object} mealPlan - Meal plan data
   * @param {Object} discountRule - Discount rule to check
   * @returns {Object} Eligibility result
   */
  checkMealPlanEligibility(mealPlan, discountRule) {
    console.log("🔍 MEAL PLAN ELIGIBILITY CHECK:");
    console.log("🔍 Meal Plan ID:", mealPlan.id || mealPlan._id);
    console.log("🔍 Rule applicable meal plans:", discountRule.applicableMealPlans);
    console.log("🔍 Rule applicable categories:", discountRule.applicableCategories);
    
    // If no meal plan restrictions specified, rule applies to all meal plans
    if (!discountRule.applicableMealPlans || discountRule.applicableMealPlans.length === 0) {
      console.log("✅ ELIGIBILITY: Applies to all meal plans (empty restrictions)");
      return { eligible: true, reason: 'Applies to all meal plans' };
    }

    const mealPlanId = mealPlan.id || mealPlan._id;
    
    // Check if meal plan is in the allowed list
    if (discountRule.applicableMealPlans.includes(mealPlanId)) {
      console.log("✅ ELIGIBILITY: Meal plan specifically included");
      return { eligible: true, reason: `Specifically configured for this meal plan` };
    }

    // Check for category-based rules
    if (discountRule.applicableCategories && discountRule.applicableCategories.length > 0) {
      const mealPlanCategory = mealPlan.category || mealPlan.planCategory;
      if (mealPlanCategory && discountRule.applicableCategories.includes(mealPlanCategory)) {
        return { eligible: true, reason: `Applies to ${mealPlanCategory} category` };
      }
    }

    // Check for tag-based rules
    if (discountRule.applicableTags && discountRule.applicableTags.length > 0) {
      const mealPlanTags = mealPlan.tags || [];
      const hasMatchingTag = mealPlanTags.some(tag => 
        discountRule.applicableTags.includes(tag)
      );
      if (hasMatchingTag) {
        return { eligible: true, reason: 'Matches meal plan tags' };
      }
    }

    return { 
      eligible: false, 
      reason: 'Meal plan not included in discount rule scope' 
    };
  }

  /**
   * Check if user is eligible for a specific discount rule
   * @param {Object} user - User data
   * @param {Object} userActivity - User activity data
   * @param {Object} discountRule - Discount rule to check
   * @returns {Object} Eligibility result
   */
  async checkDiscountEligibility(user, userActivity, discountRule) {
    if (!discountRule.isActive) {
      return { eligible: false, reason: 'Discount rule is not active' };
    }

    // Check if discount has expired
    if (discountRule.validUntil && new Date(discountRule.validUntil) < new Date()) {
      return { eligible: false, reason: 'Discount has expired' };
    }

    // Check user segment eligibility
    switch (discountRule.targetSegment) {
      case 'first_time':
        if (userActivity.isFirstTime || userActivity.totalOrders === 0) {
          return { eligible: true, reason: 'First-time user discount' };
        }
        break;

      case 'inactive_6_months':
        if (userActivity.monthsSinceLastOrder >= 6) {
          return { eligible: true, reason: 'Welcome back! You haven\'t ordered in 6+ months' };
        }
        break;

      case 'inactive_1_year':
        if (userActivity.monthsSinceLastOrder >= 12) {
          return { eligible: true, reason: 'Welcome back! You haven\'t ordered in 1+ year' };
        }
        break;

      case 'loyal_consistent':
        // Users with 5+ orders and consistent ordering (at least 1 order every 2 months)
        if (userActivity.totalOrders >= 5 && userActivity.isConsistentUser) {
          return { eligible: true, reason: 'Loyal customer reward' };
        }
        break;

      case 'high_value':
        // Users who have spent over a threshold amount
        const threshold = discountRule.criteria?.minSpent || 100000; // Default 100k Naira
        if (userActivity.totalSpent >= threshold) {
          return { eligible: true, reason: 'High-value customer discount' };
        }
        break;

      case 'long_streak':
        // Users with consistent subscription streak
        const minStreak = discountRule.criteria?.minStreak || 3;
        if (userActivity.subscriptionStreak >= minStreak) {
          return { eligible: true, reason: `${userActivity.subscriptionStreak}-month streak reward` };
        }
        break;

      case 'new_registrant':
        // Users who registered within a certain timeframe
        const daysThreshold = discountRule.criteria?.withinDays || 30;
        if (userActivity.daysSinceRegistration <= daysThreshold) {
          return { eligible: true, reason: 'New member welcome discount' };
        }
        break;

      case 'seasonal':
        // Time-based discounts (holidays, special events)
        const currentDate = new Date();
        const seasonStart = discountRule.criteria?.seasonStart ? new Date(discountRule.criteria.seasonStart) : null;
        const seasonEnd = discountRule.criteria?.seasonEnd ? new Date(discountRule.criteria.seasonEnd) : null;
        
        if (seasonStart && seasonEnd && currentDate >= seasonStart && currentDate <= seasonEnd) {
          return { eligible: true, reason: discountRule.criteria?.seasonName || 'Seasonal discount' };
        }
        break;

      case 'all_users':
        return { eligible: true, reason: 'Universal discount' };

      default:
        return { eligible: false, reason: 'Unknown discount segment' };
    }

    return { eligible: false, reason: 'User does not meet discount criteria' };
  }

  /**
   * Clear caches (useful for testing or when user data changes)
   */
  clearCaches() {
    this.userActivityCache.clear();
    this.discountRulesCache.clear();
  }

  /**
   * Get formatted discount display text
   * @param {Object} discount - Discount object
   * @returns {Object} Formatted display text
   */
  getDiscountDisplayText(discount) {
    if (!discount || discount.discountPercent === 0) {
      return { hasDiscount: false };
    }

    return {
      hasDiscount: true,
      badgeText: `${discount.discountPercent}% OFF`,
      reasonText: discount.reason,
      eligibilityText: discount.eligibilityReason,
      savingsText: `Save ₦${discount.discountAmount.toLocaleString()}`,
      limitedTimeText: discount.isLimitedTime ? 
        `Valid until ${new Date(discount.validUntil).toLocaleDateString()}` : null
    };
  }
}

// Export singleton instance
export default new DiscountService();