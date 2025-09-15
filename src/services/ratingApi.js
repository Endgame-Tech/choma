import { apiRequest } from './api';

class RatingApiService {
  
  // User rating operations
  
  /**
   * Create a new rating
   */
  async createRating(ratingData) {
    return await apiRequest('/api/ratings', {
      method: 'POST',
      body: JSON.stringify(ratingData),
    });
  }

  /**
   * Update an existing rating
   */
  async updateRating(ratingId, updateData) {
    return await apiRequest(`/api/ratings/${ratingId}`, {
      method: 'PUT',
      body: JSON.stringify(updateData),
    });
  }

  /**
   * Delete a rating
   */
  async deleteRating(ratingId) {
    return await apiRequest(`/api/ratings/${ratingId}`, {
      method: 'DELETE',
    });
  }

  /**
   * Get current user's ratings
   */
  async getMyRatings(filters = {}) {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined) {
        params.append(key, value.toString());
      }
    });

    return await apiRequest(`/api/ratings/my-ratings?${params.toString()}`);
  }

  /**
   * Get ratings for a specific entity
   */
  async getEntityRatings(entityType, entityId, filters = {}) {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined) {
        params.append(key, value.toString());
      }
    });

    return await apiRequest(`/api/ratings/entity/${entityType}/${entityId}?${params.toString()}`);
  }

  /**
   * Get rating statistics for a specific entity
   */
  async getEntityStats(entityType, entityId) {
    return await apiRequest(`/api/ratings/entity/${entityType}/${entityId}/stats`);
  }

  /**
   * Vote on rating helpfulness
   */
  async voteHelpful(ratingId, isHelpful) {
    return await apiRequest(`/api/ratings/${ratingId}/helpful`, {
      method: 'POST',
      body: JSON.stringify({ isHelpful }),
    });
  }

  /**
   * Respond to a rating (for chefs/drivers)
   */
  async respondToRating(ratingId, responseText) {
    return await apiRequest(`/api/ratings/${ratingId}/respond`, {
      method: 'POST',
      body: JSON.stringify({ responseText }),
    });
  }

  /**
   * Flag a rating for moderation
   */
  async flagRating(ratingId, flag, reason) {
    return await apiRequest(`/api/ratings/${ratingId}/flag`, {
      method: 'POST',
      body: JSON.stringify({ flag, reason }),
    });
  }

  /**
   * Get top-rated entities
   */
  async getTopRated(entityType, options = {}) {
    const params = new URLSearchParams();
    Object.entries(options).forEach(([key, value]) => {
      if (value !== undefined) {
        params.append(key, value.toString());
      }
    });

    return await apiRequest(`/api/ratings/top-rated/${entityType}?${params.toString()}`);
  }

  /**
   * Get trending entities
   */
  async getTrending(entityType, trendType = 'improving') {
    return await apiRequest(`/api/ratings/trending/${entityType}?trendType=${trendType}`);
  }

  /**
   * Get entities needing improvement
   */
  async getNeedingImprovement(entityType, threshold = 3.0) {
    return await apiRequest(`/api/ratings/needs-improvement/${entityType}?threshold=${threshold}`);
  }

  // Utility methods

  /**
   * Get aspect configurations for different rating types
   */
  getAspectConfig(ratingType) {
    const configs = {
      meal_plan: [
        { key: 'taste', label: 'Taste', description: 'How did the food taste?' },
        { key: 'presentation', label: 'Presentation', description: 'How was the visual presentation?' },
        { key: 'portionSize', label: 'Portion Size', description: 'Was the portion size appropriate?' },
        { key: 'valueForMoney', label: 'Value for Money', description: 'Was it worth the price?' },
        { key: 'healthiness', label: 'Healthiness', description: 'How healthy was the meal?' }
      ],
      chef_performance: [
        { key: 'cookingQuality', label: 'Cooking Quality', description: 'How well was the food prepared?' },
        { key: 'consistency', label: 'Consistency', description: 'How consistent is the chef?' },
        { key: 'communication', label: 'Communication', description: 'How was the communication?' },
        { key: 'punctuality', label: 'Punctuality', description: 'Was the chef on time?' },
        { key: 'professionalism', label: 'Professionalism', description: 'How professional was the chef?' }
      ],
      driver_service: [
        { key: 'timeliness', label: 'Timeliness', description: 'Was the delivery on time?' },
        { key: 'courteous', label: 'Courtesy', description: 'How courteous was the driver?' },
        { key: 'packaging', label: 'Packaging', description: 'How was the food packaged?' },
        { key: 'tracking', label: 'Tracking', description: 'How accurate was the tracking?' }
      ],
      delivery_experience: [
        { key: 'temperature', label: 'Temperature', description: 'Was the food at the right temperature?' },
        { key: 'condition', label: 'Condition', description: 'What condition was the food in?' },
        { key: 'accuracy', label: 'Accuracy', description: 'Was the order accurate?' }
      ],
      app_experience: [
        { key: 'easeOfUse', label: 'Ease of Use', description: 'How easy was the app to use?' },
        { key: 'performance', label: 'Performance', description: 'How well did the app perform?' },
        { key: 'design', label: 'Design', description: 'How was the app design?' },
        { key: 'features', label: 'Features', description: 'How useful were the features?' }
      ]
    };

    return configs[ratingType] || [];
  }

  /**
   * Validate rating data before submission
   */
  validateRatingData(data) {
    const errors = [];

    if (!data.ratingType) errors.push('Rating type is required');
    if (!data.ratedEntity) errors.push('Rated entity is required');
    if (!data.ratedEntityType) errors.push('Rated entity type is required');
    if (!data.overallRating || data.overallRating < 1 || data.overallRating > 5) {
      errors.push('Overall rating must be between 1 and 5');
    }

    if (data.aspectRatings) {
      Object.entries(data.aspectRatings).forEach(([aspect, rating]) => {
        if (rating < 1 || rating > 5) {
          errors.push(`Aspect rating for ${aspect} must be between 1 and 5`);
        }
      });
    }

    if (data.comment && data.comment.length > 1000) {
      errors.push('Comment must be 1000 characters or less');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Format rating data for display
   */
  formatRatingDisplay(rating) {
    return {
      ...rating,
      formattedDate: new Date(rating.createdAt).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      }),
      aspectCount: rating.aspectRatings ? Object.keys(rating.aspectRatings).length : 0,
      hasComment: !!(rating.comment && rating.comment.trim().length > 0),
      helpfulnessRatio: rating.helpfulVotes ? 
        rating.helpfulVotes.positive / (rating.helpfulVotes.positive + rating.helpfulVotes.negative) : 0
    };
  }

  /**
   * Calculate rating confidence level
   */
  calculateConfidence(totalRatings, recentRatings) {
    if (totalRatings >= 50 && recentRatings >= 10) return 'high';
    if (totalRatings >= 20 && recentRatings >= 5) return 'medium';
    if (totalRatings >= 5) return 'low';
    return 'very_low';
  }

  /**
   * Generate rating summary text
   */
  generateSummaryText(summary) {
    if (!summary || !summary.overallStats) return 'No ratings yet';

    const { totalRatings, averageRating } = summary.overallStats;
    
    if (totalRatings === 0) return 'No ratings yet';
    if (totalRatings === 1) return `${averageRating.toFixed(1)} star (1 rating)`;
    
    return `${averageRating.toFixed(1)} stars (${totalRatings} ratings)`;
  }

  /**
   * Get rating prompts for different contexts
   */
  getRatingPrompts(ratingType, entityType) {
    const prompts = {
      meal_plan: {
        title: 'Rate this Meal Plan',
        description: 'How was your experience with this meal plan?',
        placeholder: 'Tell others about your experience...'
      },
      chef_performance: {
        title: 'Rate the Chef',
        description: 'How was your experience with this chef?',
        placeholder: 'Share your thoughts about the chef\'s performance...'
      },
      driver_service: {
        title: 'Rate the Driver',
        description: 'How was your delivery experience?',
        placeholder: 'How was your delivery experience with this driver?'
      },
      delivery_experience: {
        title: 'Rate this Delivery',
        description: 'How was your overall delivery experience?',
        placeholder: 'Tell us about your delivery experience...'
      },
      order_satisfaction: {
        title: 'Rate this Order',
        description: 'How satisfied were you with this order?',
        placeholder: 'Share your overall experience with this order...'
      },
      app_experience: {
        title: 'Rate the App',
        description: 'How was your experience using our app?',
        placeholder: 'Let us know how we can improve the app...'
      }
    };

    return prompts[ratingType] || {
      title: `Rate this ${entityType}`,
      description: `Share your experience with this ${entityType}`,
      placeholder: 'Tell us about your experience...'
    };
  }

  /**
   * Check if user can rate an entity
   */
  async canUserRate(entityType, entityId, contextData = {}) {
    try {
      // For meal plans, check if user has an active subscription or completed order
      if (entityType === 'meal_plan') {
        // This would need to be implemented based on your business logic
        return true; // Placeholder
      }

      // For chefs, check if user has received meals from this chef
      if (entityType === 'chef') {
        // This would need to be implemented based on your business logic
        return true; // Placeholder
      }

      // For drivers, check if user has received deliveries from this driver
      if (entityType === 'driver') {
        // This would need to be implemented based on your business logic
        return true; // Placeholder
      }

      return true;
    } catch (error) {
      console.error('Error checking rating eligibility:', error);
      return false;
    }
  }

  /**
   * Get suggested tags for rating types
   */
  getSuggestedTags(ratingType) {
    const tags = {
      meal_plan: ['delicious', 'healthy', 'filling', 'fresh', 'creative', 'authentic', 'spicy', 'mild', 'vegetarian', 'gluten-free'],
      chef_performance: ['professional', 'responsive', 'creative', 'consistent', 'punctual', 'friendly', 'skilled', 'accommodating'],
      driver_service: ['fast', 'careful', 'friendly', 'professional', 'accurate', 'reliable', 'polite'],
      delivery_experience: ['hot', 'fresh', 'on-time', 'well-packaged', 'careful-handling', 'quick'],
      app_experience: ['easy-to-use', 'fast', 'intuitive', 'helpful', 'buggy', 'slow', 'confusing']
    };

    return tags[ratingType] || [];
  }
}

export const ratingApi = new RatingApiService();