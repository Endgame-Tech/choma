const RatingTrigger = require('../models/RatingTrigger');
const UserRatingHistory = require('../models/UserRatingHistory');
const Rating = require('../models/Rating');

class RatingPromptService {
  
  /**
   * Main entry point for triggering rating prompts
   * @param {Object} eventData - Event data containing trigger information
   * @returns {Promise<Object>} Result of trigger processing
   */
  async triggerRatingPrompt(eventData) {
    try {
      console.log('📊 Rating prompt triggered:', eventData.triggerType, 'for user:', eventData.userId);
      
      // Create rating trigger record
      const trigger = await RatingTrigger.createFromEvent(eventData);
      
      // Evaluate if prompt should be shown
      await trigger.evaluate();
      
      // If should prompt, schedule or show immediately
      if (trigger.shouldPrompt) {
        console.log('✅ Rating prompt scheduled:', {
          triggerId: trigger._id,
          scheduledTime: trigger.scheduledPromptTime,
          delay: trigger.promptDelay
        });
        
        // If immediate prompt (delay = 0), process now
        if (trigger.promptDelay === 0) {
          return await this.processPrompt(trigger._id);
        }
        
        return {
          success: true,
          action: 'scheduled',
          triggerId: trigger._id,
          scheduledTime: trigger.scheduledPromptTime,
          delay: trigger.promptDelay
        };
      } else {
        console.log('❌ Rating prompt not eligible:', trigger.promptDecisionReason);
        
        return {
          success: true,
          action: 'skipped',
          reason: trigger.promptDecisionReason,
          triggerId: trigger._id
        };
      }
      
    } catch (error) {
      console.error('Error triggering rating prompt:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  /**
   * Process a scheduled prompt (called by cron job or immediate triggers)
   * @param {String} triggerId - ID of the rating trigger
   * @returns {Promise<Object>} Prompt data for frontend
   */
  async processPrompt(triggerId) {
    try {
      const trigger = await RatingTrigger.findById(triggerId)
        .populate('relatedOrderId')
        .populate('relatedSubscriptionId')
        .populate('relatedChefId')
        .populate('relatedDriverId');
      
      if (!trigger) {
        throw new Error('Rating trigger not found');
      }
      
      if (trigger.status !== 'evaluated' || !trigger.shouldPrompt) {
        console.log('⚠️ Trigger not eligible for prompt:', trigger._id);
        return null;
      }
      
      // Mark as prompted
      await trigger.recordPromptShown();
      
      // Generate prompt data for frontend
      const promptData = this.generatePromptData(trigger);
      
      console.log('🎯 Rating prompt ready for display:', {
        triggerId: trigger._id,
        type: trigger.triggerType,
        userId: trigger.userId
      });
      
      return promptData;
      
    } catch (error) {
      console.error('Error processing rating prompt:', error);
      throw error;
    }
  }
  
  /**
   * Process all pending prompts (called by cron job)
   * @returns {Promise<Array>} Array of processed prompts
   */
  async processPendingPrompts() {
    try {
      const pendingTriggers = await RatingTrigger.getPendingPrompts();
      const processedPrompts = [];
      
      for (const trigger of pendingTriggers) {
        try {
          const promptData = await this.processPrompt(trigger._id);
          if (promptData) {
            processedPrompts.push(promptData);
          }
        } catch (error) {
          console.error('Error processing trigger:', trigger._id, error);
        }
      }
      
      console.log('📊 Processed pending prompts:', processedPrompts.length);
      return processedPrompts;
      
    } catch (error) {
      console.error('Error processing pending prompts:', error);
      return [];
    }
  }
  
  /**
   * Record user response to rating prompt
   * @param {String} triggerId - ID of the rating trigger
   * @param {String} response - User response ('completed', 'dismissed', 'postponed')
   * @param {String} ratingId - ID of created rating (if completed)
   * @returns {Promise<Object>} Updated trigger
   */
  async recordPromptResponse(triggerId, response, ratingId = null) {
    try {
      const trigger = await RatingTrigger.findById(triggerId);
      
      if (!trigger) {
        throw new Error('Rating trigger not found');
      }
      
      await trigger.recordResponse(response, ratingId);
      
      // If rating was created, update user history
      if (ratingId && response === 'completed') {
        const rating = await Rating.findById(ratingId);
        if (rating) {
          const userHistory = await UserRatingHistory.getOrCreate(trigger.userId);
          await userHistory.recordRatingGiven(rating);
        }
      }
      
      console.log('📝 Recorded prompt response:', {
        triggerId,
        response,
        ratingId
      });
      
      return trigger;
      
    } catch (error) {
      console.error('Error recording prompt response:', error);
      throw error;
    }
  }
  
  /**
   * Update user rating preferences
   * @param {String} userId - User ID
   * @param {Object} preferences - User preferences
   * @returns {Promise<Object>} Updated user history
   */
  async updateUserPreferences(userId, preferences) {
    try {
      const userHistory = await UserRatingHistory.getOrCreate(userId);
      await userHistory.updatePreferences(preferences);
      
      console.log('⚙️ Updated user rating preferences:', {
        userId,
        preferences
      });
      
      return userHistory;
      
    } catch (error) {
      console.error('Error updating user preferences:', error);
      throw error;
    }
  }
  
  /**
   * Generate prompt data for frontend
   * @param {Object} trigger - Rating trigger object
   * @returns {Object} Prompt data
   */
  generatePromptData(trigger) {
    const baseData = {
      triggerId: trigger._id,
      triggerType: trigger.triggerType,
      userId: trigger.userId,
      triggerScore: trigger.triggerScore,
      triggerReason: trigger.triggerReason,
      contextData: trigger.triggerContext
    };
    
    // Customize prompt based on trigger type
    switch (trigger.triggerType) {
      case 'order_completion':
        return {
          ...baseData,
          ratingType: 'order_satisfaction',
          entityType: 'order',
          entityId: trigger.relatedOrderId?._id,
          title: trigger.triggerContext.isFirstOrder ? 
            'How was your first order?' : 'How was your order?',
          description: 'Help us improve by rating your experience',
          contextData: {
            orderId: trigger.relatedOrderId?._id,
            orderValue: trigger.triggerContext.orderValue,
            isFirstOrder: trigger.triggerContext.isFirstOrder
          }
        };
        
      case 'delivery_completion':
        return {
          ...baseData,
          ratingType: 'delivery_experience',
          entityType: 'delivery',
          entityId: trigger.relatedOrderId?._id,
          title: 'How was your delivery?',
          description: 'Rate your delivery experience',
          contextData: {
            orderId: trigger.relatedOrderId?._id,
            deliveryDate: trigger.triggerContext.deliveryDate,
            wasOnTime: trigger.triggerContext.wasOnTime
          }
        };
        
      case 'subscription_milestone':
        let title = 'How is your meal plan experience?';
        if (trigger.triggerContext.subscriptionDay === 1) {
          title = 'How was your first meal?';
        } else if (trigger.triggerContext.subscriptionDay === 7) {
          title = 'How has your first week been?';
        } else if (trigger.triggerContext.subscriptionDay === 30) {
          title = 'How has your first month been?';
        }
        
        return {
          ...baseData,
          ratingType: 'subscription_service',
          entityType: 'subscription',
          entityId: trigger.relatedSubscriptionId?._id,
          title,
          description: 'Your feedback helps us serve you better',
          contextData: {
            subscriptionId: trigger.relatedSubscriptionId?._id,
            subscriptionDay: trigger.triggerContext.subscriptionDay,
            isMilestone: trigger.triggerContext.isMilestone
          }
        };
        
      case 'chef_interaction':
        return {
          ...baseData,
          ratingType: 'chef_performance',
          entityType: 'chef',
          entityId: trigger.relatedChefId?._id,
          title: 'Rate your chef',
          description: 'How was your experience with this chef?',
          contextData: {
            chefId: trigger.relatedChefId?._id,
            interactionType: trigger.triggerContext.interactionType
          }
        };
        
      case 'driver_interaction':
        return {
          ...baseData,
          ratingType: 'driver_service',
          entityType: 'driver',
          entityId: trigger.relatedDriverId?._id,
          title: 'Rate your driver',
          description: 'How was your experience with this driver?',
          contextData: {
            driverId: trigger.relatedDriverId?._id,
            interactionType: trigger.triggerContext.interactionType
          }
        };
        
      case 'app_session_end':
        return {
          ...baseData,
          ratingType: 'app_experience',
          entityType: 'app',
          entityId: 'choma_app',
          title: 'How is the app working for you?',
          description: 'Help us improve your app experience',
          contextData: {
            sessionDuration: trigger.triggerContext.sessionDuration,
            actionsPerformed: trigger.triggerContext.actionsPerformed
          }
        };
        
      default:
        return {
          ...baseData,
          ratingType: 'order_satisfaction',
          entityType: 'order',
          entityId: trigger.relatedOrderId?._id || trigger.relatedSubscriptionId?._id,
          title: 'Rate your experience',
          description: 'Your feedback is valuable to us'
        };
    }
  }
  
  /**
   * Get user rating history and preferences
   * @param {String} userId - User ID
   * @returns {Promise<Object>} User rating history
   */
  async getUserRatingHistory(userId) {
    try {
      return await UserRatingHistory.getOrCreate(userId);
    } catch (error) {
      console.error('Error getting user rating history:', error);
      throw error;
    }
  }
  
  /**
   * Get rating prompt analytics
   * @param {String} timeframe - Timeframe for analytics (e.g., '30d')
   * @returns {Promise<Object>} Analytics data
   */
  async getAnalytics(timeframe = '30d') {
    try {
      const triggerAnalytics = await RatingTrigger.getAnalytics(timeframe);
      
      // Get overall metrics
      const daysAgo = parseInt(timeframe.replace('d', ''));
      const startDate = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);
      
      const overallMetrics = await UserRatingHistory.aggregate([
        {
          $match: {
            $or: [
              { lastPromptDate: { $gte: startDate } },
              { lastRatingDate: { $gte: startDate } }
            ]
          }
        },
        {
          $group: {
            _id: null,
            totalUsers: { $sum: 1 },
            avgResponseRate: { $avg: '$responseRate' },
            totalOptedOut: { $sum: { $cond: ['$hasOptedOut', 1, 0] } },
            avgRatingGiven: { $avg: '$avgRatingGiven' },
            highEngagementUsers: { 
              $sum: { 
                $cond: [
                  { $gte: ['$responseRate', 75] }, 
                  1, 
                  0
                ] 
              } 
            }
          }
        }
      ]);
      
      return {
        triggerAnalytics,
        overallMetrics: overallMetrics[0] || {},
        timeframe
      };
      
    } catch (error) {
      console.error('Error getting rating prompt analytics:', error);
      throw error;
    }
  }
  
  /**
   * Check if user should be prompted for specific context
   * @param {String} userId - User ID
   * @param {String} context - Rating context
   * @returns {Promise<Object>} Eligibility result
   */
  async checkPromptEligibility(userId, context) {
    try {
      const userHistory = await UserRatingHistory.getOrCreate(userId);
      return userHistory.shouldPrompt(context);
    } catch (error) {
      console.error('Error checking prompt eligibility:', error);
      throw error;
    }
  }
}

// Export singleton instance
module.exports = new RatingPromptService();