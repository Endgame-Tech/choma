import { apiRequest } from './api';

export interface CreateRatingData {
  ratingType: string;
  ratedEntity: string;
  ratedEntityType: string;
  overallRating: number;
  aspectRatings?: { [key: string]: number };
  comment?: string;
  tags?: string[];
  contextData?: any;
}

export interface UpdateRatingData {
  overallRating?: number;
  aspectRatings?: { [key: string]: number };
  comment?: string;
  tags?: string[];
}

export interface RatingFilters {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  ratingType?: string;
  minRating?: number;
  maxRating?: number;
  withComments?: boolean;
  verified?: boolean;
  entityType?: string;
}

export interface AdminRatingFilters extends RatingFilters {
  ratedBy?: string;
  status?: string;
  query?: string;
}

export interface TopRatedOptions {
  limit?: number;
  minRatings?: number;
  timeframe?: 'all' | 'month' | 'week';
}

class RatingApiService {
  
  // User rating operations
  
  /**
   * Create a new rating
   */
  async createRating(ratingData: CreateRatingData) {
    return await apiRequest('/api/ratings', {
      method: 'POST',
      body: JSON.stringify(ratingData),
    });
  }

  /**
   * Update an existing rating
   */
  async updateRating(ratingId: string, updateData: UpdateRatingData) {
    return await apiRequest(`/api/ratings/${ratingId}`, {
      method: 'PUT',
      body: JSON.stringify(updateData),
    });
  }

  /**
   * Delete a rating
   */
  async deleteRating(ratingId: string) {
    return await apiRequest(`/api/ratings/${ratingId}`, {
      method: 'DELETE',
    });
  }

  /**
   * Get current user's ratings
   */
  async getMyRatings(filters: RatingFilters = {}) {
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
  async getEntityRatings(entityType: string, entityId: string, filters: RatingFilters = {}) {
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
  async getEntityStats(entityType: string, entityId: string) {
    return await apiRequest(`/api/ratings/entity/${entityType}/${entityId}/stats`);
  }

  /**
   * Vote on rating helpfulness
   */
  async voteHelpful(ratingId: string, isHelpful: boolean) {
    return await apiRequest(`/api/ratings/${ratingId}/helpful`, {
      method: 'POST',
      body: JSON.stringify({ isHelpful }),
    });
  }

  /**
   * Respond to a rating (for chefs/drivers)
   */
  async respondToRating(ratingId: string, responseText: string) {
    return await apiRequest(`/api/ratings/${ratingId}/respond`, {
      method: 'POST',
      body: JSON.stringify({ responseText }),
    });
  }

  /**
   * Flag a rating for moderation
   */
  async flagRating(ratingId: string, flag: string, reason: string) {
    return await apiRequest(`/api/ratings/${ratingId}/flag`, {
      method: 'POST',
      body: JSON.stringify({ flag, reason }),
    });
  }

  /**
   * Get top-rated entities
   */
  async getTopRated(entityType: string, options: TopRatedOptions = {}) {
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
  async getTrending(entityType: string, trendType: 'improving' | 'declining' | 'stable' = 'improving') {
    return await apiRequest(`/api/ratings/trending/${entityType}?trendType=${trendType}`);
  }

  /**
   * Get entities needing improvement
   */
  async getNeedingImprovement(entityType: string, threshold: number = 3.0) {
    return await apiRequest(`/api/ratings/needs-improvement/${entityType}?threshold=${threshold}`);
  }

  // Admin-specific operations

  /**
   * Get rating system overview (admin)
   */
  async getOverview() {
    return await apiRequest('/api/admin/ratings/overview');
  }

  /**
   * Get flagged ratings for moderation (admin)
   */
  async getFlaggedRatings(filters: { page?: number; limit?: number; flag?: string; status?: string } = {}) {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined) {
        params.append(key, value.toString());
      }
    });

    return await apiRequest(`/api/admin/ratings/flagged?${params.toString()}`);
  }

  /**
   * Moderate a flagged rating (admin)
   */
  async moderateRating(ratingId: string, action: 'approve' | 'hide' | 'delete', moderationNotes?: string) {
    return await apiRequest(`/api/admin/ratings/${ratingId}/moderate`, {
      method: 'PUT',
      body: JSON.stringify({ action, moderationNotes }),
    });
  }

  /**
   * Get detailed analytics for entity type (admin)
   */
  async getAnalytics(entityType: string, timeframe: '7d' | '30d' | '90d' | '1y' = '30d') {
    return await apiRequest(`/api/admin/ratings/analytics/${entityType}?timeframe=${timeframe}`);
  }

  /**
   * Recalculate rating summaries (admin)
   */
  async recalculateSummaries(entityType?: string) {
    return await apiRequest('/api/admin/ratings/recalculate', {
      method: 'POST',
      body: JSON.stringify({ entityType }),
    });
  }

  /**
   * Get detailed rating information for a specific entity (admin)
   */
  async getEntityDetails(entityType: string, entityId: string) {
    return await apiRequest(`/api/admin/ratings/entity/${entityType}/${entityId}/details`);
  }

  /**
   * Search ratings by various criteria (admin)
   */
  async searchRatings(filters: AdminRatingFilters = {}) {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined) {
        params.append(key, value.toString());
      }
    });

    return await apiRequest(`/api/admin/ratings/search?${params.toString()}`);
  }

  /**
   * Export ratings data (admin)
   */
  async exportRatings(entityType: string, options: { 
    startDate?: string; 
    endDate?: string; 
    format?: 'json' | 'csv' 
  } = {}) {
    const params = new URLSearchParams();
    Object.entries(options).forEach(([key, value]) => {
      if (value !== undefined) {
        params.append(key, value.toString());
      }
    });

    const response = await fetch(`/api/admin/ratings/export/${entityType}?${params.toString()}`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
      },
    });

    if (!response.ok) {
      throw new Error('Export failed');
    }

    if (options.format === 'csv') {
      const blob = await response.blob();
      return blob;
    } else {
      return await response.json();
    }
  }

  // Utility methods

  /**
   * Get aspect configurations for different rating types
   */
  getAspectConfig(ratingType: string) {
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

    return configs[ratingType as keyof typeof configs] || [];
  }

  /**
   * Validate rating data before submission
   */
  validateRatingData(data: CreateRatingData): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

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
  formatRatingDisplay(rating: any) {
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
  calculateConfidence(totalRatings: number, recentRatings: number): 'high' | 'medium' | 'low' | 'very_low' {
    if (totalRatings >= 50 && recentRatings >= 10) return 'high';
    if (totalRatings >= 20 && recentRatings >= 5) return 'medium';
    if (totalRatings >= 5) return 'low';
    return 'very_low';
  }
}

export const ratingApi = new RatingApiService();