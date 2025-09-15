const Rating = require('../models/Rating');
const RatingSummary = require('../models/RatingSummary');
const mongoose = require('mongoose');

class RatingService {
  
  /**
   * Create a new rating
   * @param {Object} ratingData - Rating data
   * @param {String} ratingData.ratingType - Type of rating
   * @param {String} ratingData.ratedBy - ID of user giving rating
   * @param {String} ratingData.ratedByType - Type of user giving rating
   * @param {String} ratingData.ratedEntity - ID of entity being rated
   * @param {String} ratingData.ratedEntityType - Type of entity being rated
   * @param {Number} ratingData.overallRating - Overall rating (1-5)
   * @param {Object} ratingData.aspectRatings - Aspect-specific ratings
   * @param {String} ratingData.comment - Optional comment
   * @param {Object} ratingData.contextData - Context information
   * @returns {Promise<Object>} Created rating
   */
  async createRating(ratingData) {
    try {
      // Validate required fields
      this._validateRatingData(ratingData);
      
      // Check for existing rating in same context
      const existingRating = await this._findExistingRating(ratingData);
      if (existingRating) {
        throw new Error('You have already rated this item in this context');
      }
      
      // Create the rating
      const rating = new Rating(ratingData);
      
      // Auto-verify experience if possible
      await rating.verifyExperience();
      
      // Save the rating
      const savedRating = await rating.save();
      
      // Trigger summary update (handled by post-save hook)
      
      return savedRating;
      
    } catch (error) {
      throw new Error(`Failed to create rating: ${error.message}`);
    }
  }
  
  /**
   * Update an existing rating
   * @param {String} ratingId - Rating ID
   * @param {Object} updateData - Data to update
   * @param {String} userId - ID of user making the update
   * @returns {Promise<Object>} Updated rating
   */
  async updateRating(ratingId, updateData, userId) {
    try {
      const rating = await Rating.findById(ratingId);
      
      if (!rating) {
        throw new Error('Rating not found');
      }
      
      // Check if user owns this rating
      if (rating.ratedBy.toString() !== userId) {
        throw new Error('Not authorized to update this rating');
      }
      
      // Prevent updating after 24 hours
      const dayOld = new Date(Date.now() - 24 * 60 * 60 * 1000);
      if (rating.createdAt < dayOld) {
        throw new Error('Cannot update ratings older than 24 hours');
      }
      
      // Update allowed fields
      const allowedFields = ['overallRating', 'aspectRatings', 'comment', 'tags'];
      allowedFields.forEach(field => {
        if (updateData[field] !== undefined) {
          rating[field] = updateData[field];
        }
      });
      
      const updatedRating = await rating.save();
      
      // Trigger summary update
      await RatingSummary.updateEntitySummary(rating.ratedEntity, rating.ratedEntityType);
      
      return updatedRating;
      
    } catch (error) {
      throw new Error(`Failed to update rating: ${error.message}`);
    }
  }
  
  /**
   * Delete a rating
   * @param {String} ratingId - Rating ID
   * @param {String} userId - ID of user making the deletion
   * @returns {Promise<Boolean>} Success status
   */
  async deleteRating(ratingId, userId) {
    try {
      const rating = await Rating.findById(ratingId);
      
      if (!rating) {
        throw new Error('Rating not found');
      }
      
      // Check if user owns this rating
      if (rating.ratedBy.toString() !== userId) {
        throw new Error('Not authorized to delete this rating');
      }
      
      // Soft delete by setting status
      rating.status = 'deleted';
      await rating.save();
      
      // Trigger summary update
      await RatingSummary.updateEntitySummary(rating.ratedEntity, rating.ratedEntityType);
      
      return true;
      
    } catch (error) {
      throw new Error(`Failed to delete rating: ${error.message}`);
    }
  }
  
  /**
   * Get ratings for an entity
   * @param {String} entityId - Entity ID
   * @param {String} entityType - Entity type
   * @param {Object} options - Query options
   * @returns {Promise<Object>} Ratings and metadata
   */
  async getEntityRatings(entityId, entityType, options = {}) {
    try {
      const {
        page = 1,
        limit = 20,
        sortBy = 'createdAt',
        sortOrder = 'desc',
        ratingType,
        minRating,
        maxRating,
        withComments,
        verified
      } = options;
      
      // Build query
      const query = {
        ratedEntity: new mongoose.Types.ObjectId(entityId),
        ratedEntityType: entityType,
        status: 'active'
      };
      
      if (ratingType) query.ratingType = ratingType;
      if (minRating) query.overallRating = { ...query.overallRating, $gte: minRating };
      if (maxRating) query.overallRating = { ...query.overallRating, $lte: maxRating };
      if (withComments) query.comment = { $exists: true, $ne: '' };
      if (verified !== undefined) query.isVerifiedExperience = verified;
      
      // Build sort
      const sort = {};
      sort[sortBy] = sortOrder === 'desc' ? -1 : 1;
      
      // Execute query
      const skip = (page - 1) * limit;
      
      const [ratings, totalCount, summary] = await Promise.all([
        Rating.find(query)
          .sort(sort)
          .skip(skip)
          .limit(limit)
          .populate('ratedBy', 'name email profilePicture')
          .populate('response.respondedBy', 'name')
          .lean(),
        Rating.countDocuments(query),
        RatingSummary.findOne({ entityId, entityType })
      ]);
      
      return {
        ratings,
        pagination: {
          page,
          limit,
          totalCount,
          totalPages: Math.ceil(totalCount / limit),
          hasNext: page < Math.ceil(totalCount / limit),
          hasPrev: page > 1
        },
        summary: summary || null
      };
      
    } catch (error) {
      throw new Error(`Failed to get entity ratings: ${error.message}`);
    }
  }
  
  /**
   * Get rating statistics for an entity
   * @param {String} entityId - Entity ID
   * @param {String} entityType - Entity type
   * @returns {Promise<Object>} Rating statistics
   */
  async getEntityStats(entityId, entityType) {
    try {
      const summary = await RatingSummary.findOne({ entityId, entityType });
      
      if (!summary) {
        // Calculate fresh if no summary exists
        await RatingSummary.updateEntitySummary(entityId, entityType);
        return await RatingSummary.findOne({ entityId, entityType });
      }
      
      // Check if summary is stale (older than 1 hour)
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      if (summary.lastCalculated < oneHourAgo) {
        // Refresh in background
        setImmediate(() => {
          RatingSummary.updateEntitySummary(entityId, entityType);
        });
      }
      
      return summary;
      
    } catch (error) {
      throw new Error(`Failed to get entity stats: ${error.message}`);
    }
  }
  
  /**
   * Get user's ratings
   * @param {String} userId - User ID
   * @param {Object} options - Query options
   * @returns {Promise<Object>} User's ratings
   */
  async getUserRatings(userId, options = {}) {
    try {
      const {
        page = 1,
        limit = 20,
        entityType,
        ratingType,
        sortBy = 'createdAt',
        sortOrder = 'desc'
      } = options;
      
      const query = {
        ratedBy: new mongoose.Types.ObjectId(userId),
        status: 'active'
      };
      
      if (entityType) query.ratedEntityType = entityType;
      if (ratingType) query.ratingType = ratingType;
      
      const sort = {};
      sort[sortBy] = sortOrder === 'desc' ? -1 : 1;
      
      const skip = (page - 1) * limit;
      
      const [ratings, totalCount] = await Promise.all([
        Rating.find(query)
          .sort(sort)
          .skip(skip)
          .limit(limit)
          .populate('ratedEntity')
          .lean(),
        Rating.countDocuments(query)
      ]);
      
      return {
        ratings,
        pagination: {
          page,
          limit,
          totalCount,
          totalPages: Math.ceil(totalCount / limit),
          hasNext: page < Math.ceil(totalCount / limit),
          hasPrev: page > 1
        }
      };
      
    } catch (error) {
      throw new Error(`Failed to get user ratings: ${error.message}`);
    }
  }
  
  /**
   * Add helpful vote to a rating
   * @param {String} ratingId - Rating ID
   * @param {String} userId - User ID voting
   * @param {Boolean} isHelpful - True for helpful, false for not helpful
   * @returns {Promise<Object>} Updated rating
   */
  async voteHelpful(ratingId, userId, isHelpful) {
    try {
      const rating = await Rating.findById(ratingId);
      
      if (!rating) {
        throw new Error('Rating not found');
      }
      
      // Prevent self-voting
      if (rating.ratedBy.toString() === userId) {
        throw new Error('Cannot vote on your own rating');
      }
      
      // TODO: Track who voted to prevent multiple votes
      // For now, just increment the counters
      
      if (isHelpful) {
        rating.helpfulVotes.positive += 1;
      } else {
        rating.helpfulVotes.negative += 1;
      }
      
      await rating.save();
      
      return rating;
      
    } catch (error) {
      throw new Error(`Failed to vote on rating: ${error.message}`);
    }
  }
  
  /**
   * Respond to a rating (for chefs/drivers)
   * @param {String} ratingId - Rating ID
   * @param {String} responseText - Response text
   * @param {String} responderId - ID of responder
   * @returns {Promise<Object>} Updated rating
   */
  async respondToRating(ratingId, responseText, responderId) {
    try {
      const rating = await Rating.findById(ratingId);
      
      if (!rating) {
        throw new Error('Rating not found');
      }
      
      // Check if responder is the rated entity (chef/driver)
      if (rating.ratedEntity.toString() !== responderId) {
        throw new Error('Not authorized to respond to this rating');
      }
      
      // Check if already responded
      if (rating.response && rating.response.text) {
        throw new Error('You have already responded to this rating');
      }
      
      rating.response = {
        text: responseText.trim(),
        respondedBy: responderId,
        respondedAt: new Date()
      };
      
      await rating.save();
      
      return rating;
      
    } catch (error) {
      throw new Error(`Failed to respond to rating: ${error.message}`);
    }
  }
  
  /**
   * Flag a rating for moderation
   * @param {String} ratingId - Rating ID
   * @param {String} flag - Flag type
   * @param {String} reason - Flag reason
   * @param {String} flaggedBy - ID of user flagging
   * @returns {Promise<Object>} Updated rating
   */
  async flagRating(ratingId, flag, reason, flaggedBy) {
    try {
      const rating = await Rating.findById(ratingId);
      
      if (!rating) {
        throw new Error('Rating not found');
      }
      
      // Check if already flagged by this user
      const existingFlag = rating.moderationFlags.find(
        f => f.flaggedBy.toString() === flaggedBy
      );
      
      if (existingFlag) {
        throw new Error('You have already flagged this rating');
      }
      
      rating.moderationFlags.push({
        flag,
        reason,
        flaggedBy,
        flaggedAt: new Date()
      });
      
      // Auto-hide if multiple flags
      if (rating.moderationFlags.length >= 3) {
        rating.status = 'flagged';
      }
      
      await rating.save();
      
      return rating;
      
    } catch (error) {
      throw new Error(`Failed to flag rating: ${error.message}`);
    }
  }
  
  /**
   * Get top-rated entities
   * @param {String} entityType - Entity type
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Top-rated entities
   */
  async getTopRated(entityType, options = {}) {
    try {
      const {
        limit = 10,
        minRatings = 5,
        timeframe = 'all' // 'all', 'month', 'week'
      } = options;
      
      let dateFilter = {};
      if (timeframe === 'month') {
        dateFilter = { 'overallStats.recent30Days.totalRatings': { $gte: minRatings } };
      } else if (timeframe === 'week') {
        // Get ratings from last week
        const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        dateFilter = { lastCalculated: { $gte: weekAgo } };
      }
      
      return await RatingSummary.getTopRated(entityType, { 
        limit, 
        minRatings,
        ...dateFilter 
      });
      
    } catch (error) {
      throw new Error(`Failed to get top-rated entities: ${error.message}`);
    }
  }
  
  /**
   * Get trending entities
   * @param {String} entityType - Entity type
   * @param {String} trendType - Type of trend ('improving', 'declining', 'stable')
   * @returns {Promise<Array>} Trending entities
   */
  async getTrending(entityType, trendType = 'improving') {
    try {
      return await RatingSummary.getTrending(entityType, trendType);
    } catch (error) {
      throw new Error(`Failed to get trending entities: ${error.message}`);
    }
  }
  
  /**
   * Get entities needing improvement
   * @param {String} entityType - Entity type
   * @param {Number} threshold - Rating threshold (default 3.0)
   * @returns {Promise<Array>} Entities needing improvement
   */
  async getNeedingImprovement(entityType, threshold = 3.0) {
    try {
      return await RatingSummary.getNeedingImprovement(entityType, threshold);
    } catch (error) {
      throw new Error(`Failed to get entities needing improvement: ${error.message}`);
    }
  }
  
  /**
   * Bulk recalculate summaries
   * @param {String} entityType - Entity type to recalculate
   * @returns {Promise<Number>} Number of summaries updated
   */
  async recalculateSummaries(entityType) {
    try {
      let count = 0;
      
      if (entityType) {
        // Recalculate for specific entity type
        const entities = await Rating.distinct('ratedEntity', { 
          ratedEntityType: entityType,
          status: 'active'
        });
        
        for (const entityId of entities) {
          await RatingSummary.updateEntitySummary(entityId, entityType);
          count++;
        }
      } else {
        // Recalculate all
        const entityTypes = await Rating.distinct('ratedEntityType', { status: 'active' });
        
        for (const type of entityTypes) {
          const entities = await Rating.distinct('ratedEntity', { 
            ratedEntityType: type,
            status: 'active'
          });
          
          for (const entityId of entities) {
            await RatingSummary.updateEntitySummary(entityId, type);
            count++;
          }
        }
      }
      
      return count;
      
    } catch (error) {
      throw new Error(`Failed to recalculate summaries: ${error.message}`);
    }
  }
  
  // Private helper methods
  
  _validateRatingData(data) {
    const required = ['ratingType', 'ratedBy', 'ratedByType', 'ratedEntity', 'ratedEntityType', 'overallRating'];
    
    for (const field of required) {
      if (!data[field]) {
        throw new Error(`Missing required field: ${field}`);
      }
    }
    
    if (data.overallRating < 1 || data.overallRating > 5) {
      throw new Error('Overall rating must be between 1 and 5');
    }
    
    // Validate aspect ratings if provided
    if (data.aspectRatings) {
      for (const [aspect, rating] of Object.entries(data.aspectRatings)) {
        if (rating !== null && (rating < 1 || rating > 5)) {
          throw new Error(`Aspect rating for ${aspect} must be between 1 and 5`);
        }
      }
    }
  }
  
  async _findExistingRating(data) {
    const query = {
      ratedBy: data.ratedBy,
      ratedEntity: data.ratedEntity,
      ratingType: data.ratingType,
      status: 'active'
    };
    
    // Add context-specific uniqueness
    if (data.contextData?.orderId) {
      query['contextData.orderId'] = data.contextData.orderId;
    }
    
    if (data.contextData?.deliveryId) {
      query['contextData.deliveryId'] = data.contextData.deliveryId;
    }
    
    return await Rating.findOne(query);
  }
}

module.exports = new RatingService();