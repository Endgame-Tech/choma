import { ratingApi } from './ratingApi';
import apiService from './api';

class RatingPromptManager {
  constructor() {
    this.currentPrompt = null;
    this.promptQueue = [];
    this.isProcessing = false;
    this.listeners = new Set();
  }

  /**
   * Initialize the rating prompt manager
   */
  initialize() {
    console.log('🎯 Rating Prompt Manager initialized');
    
    // Check for pending prompts on app start
    this.checkPendingPrompts();
    
    // Set up periodic check for scheduled prompts
    this.startPromptChecker();
  }

  /**
   * Add a listener for prompt events
   */
  addListener(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Notify all listeners of prompt events
   */
  notifyListeners(event, data) {
    this.listeners.forEach(listener => {
      try {
        listener(event, data);
      } catch (error) {
        console.error('Error in prompt listener:', error);
      }
    });
  }

  /**
   * Trigger a rating prompt for a specific event
   */
  async triggerPrompt(eventData) {
    try {
      console.log('🎯 Triggering rating prompt:', eventData);
      
      const response = await apiService.makeRequest('/api/rating-prompts/trigger', {
        method: 'POST',
        body: JSON.stringify(eventData)
      });

      if (response.success) {
        if (response.data.action === 'scheduled') {
          console.log('📅 Rating prompt scheduled for later');
        } else if (response.data.action === 'immediate') {
          await this.showPrompt(response.data.promptData);
        } else {
          console.log('⏭️ Rating prompt skipped:', response.data.reason);
        }
      }

      return response;
    } catch (error) {
      console.error('Error triggering rating prompt:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Show a rating prompt to the user
   */
  async showPrompt(promptData) {
    if (this.currentPrompt) {
      // Queue the prompt if one is already showing
      this.promptQueue.push(promptData);
      return;
    }

    this.currentPrompt = promptData;
    
    console.log('🎯 Showing rating prompt:', promptData.triggerType);
    
    // Notify listeners that a prompt should be shown
    this.notifyListeners('show_prompt', promptData);
  }

  /**
   * Handle user response to a rating prompt
   */
  async handlePromptResponse(response, triggerId, ratingId = null) {
    try {
      console.log('📝 Recording prompt response:', { response, triggerId, ratingId });
      
      // Record the response on the backend
      await apiService.makeRequest('/api/rating-prompts/response', {
        method: 'POST',
        body: JSON.stringify({
          triggerId,
          response,
          ratingId
        })
      });

      // Clear current prompt
      this.currentPrompt = null;
      
      // Notify listeners
      this.notifyListeners('prompt_responded', { response, triggerId, ratingId });
      
      // Process next prompt in queue
      this.processQueue();
      
    } catch (error) {
      console.error('Error recording prompt response:', error);
    }
  }

  /**
   * Dismiss the current prompt
   */
  dismissPrompt() {
    if (this.currentPrompt) {
      this.handlePromptResponse('dismissed', this.currentPrompt.triggerId);
    }
  }

  /**
   * Process the next prompt in queue
   */
  async processQueue() {
    if (this.promptQueue.length > 0 && !this.currentPrompt) {
      const nextPrompt = this.promptQueue.shift();
      await this.showPrompt(nextPrompt);
    }
  }

  /**
   * Check for pending prompts from backend
   */
  async checkPendingPrompts() {
    try {
      const response = await apiService.makeRequest('/api/rating-prompts/pending');
      
      if (response.success && response.data.length > 0) {
        console.log('📥 Found pending prompts:', response.data.length);
        
        for (const promptData of response.data) {
          await this.showPrompt(promptData);
        }
      }
    } catch (error) {
      console.error('Error checking pending prompts:', error);
    }
  }

  /**
   * Start periodic checker for scheduled prompts
   */
  startPromptChecker() {
    // Check every 30 seconds for scheduled prompts
    setInterval(() => {
      if (!this.isProcessing) {
        this.checkPendingPrompts();
      }
    }, 30000);
  }

  /**
   * Update user rating preferences
   */
  async updateUserPreferences(preferences) {
    try {
      console.log('⚙️ Updating rating preferences:', preferences);
      
      const response = await apiService.makeRequest('/api/rating-prompts/preferences', {
        method: 'PUT',
        body: JSON.stringify(preferences)
      });

      if (response.success) {
        console.log('✅ Rating preferences updated');
        this.notifyListeners('preferences_updated', preferences);
      }

      return response;
    } catch (error) {
      console.error('Error updating rating preferences:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get user rating history and preferences
   */
  async getUserRatingHistory() {
    try {
      const response = await apiService.makeRequest('/api/rating-prompts/history');
      return response;
    } catch (error) {
      console.error('Error getting rating history:', error);
      return { success: false, error: error.message };
    }
  }

  // Convenience methods for common trigger scenarios

  /**
   * Trigger prompt for order completion
   */
  async triggerOrderCompletion(orderData) {
    return await this.triggerPrompt({
      triggerType: 'order_completion',
      userId: orderData.userId,
      relatedOrderId: orderData._id,
      triggerContext: {
        orderValue: orderData.total || orderData.amount,
        isFirstOrder: orderData.isFirstOrder || false,
        isRecurringOrder: orderData.isRecurringOrder || false,
        orderRating: orderData.existingRating
      }
    });
  }

  /**
   * Trigger prompt for delivery completion
   */
  async triggerDeliveryCompletion(deliveryData) {
    return await this.triggerPrompt({
      triggerType: 'delivery_completion',
      userId: deliveryData.userId,
      relatedOrderId: deliveryData.orderId,
      relatedDriverId: deliveryData.driverId,
      triggerContext: {
        deliveryDate: deliveryData.deliveredAt || new Date(),
        wasOnTime: deliveryData.wasOnTime || false,
        deliveryIssues: deliveryData.issues || [],
        deliveryRating: deliveryData.existingRating
      }
    });
  }

  /**
   * Trigger prompt for subscription milestone
   */
  async triggerSubscriptionMilestone(subscriptionData) {
    const milestones = [1, 7, 14, 30, 60, 90];
    const isMilestone = milestones.includes(subscriptionData.subscriptionDay);

    return await this.triggerPrompt({
      triggerType: 'subscription_milestone',
      userId: subscriptionData.userId,
      relatedSubscriptionId: subscriptionData._id,
      triggerContext: {
        subscriptionDay: subscriptionData.subscriptionDay,
        subscriptionWeek: Math.ceil(subscriptionData.subscriptionDay / 7),
        isMilestone,
        totalMealsReceived: subscriptionData.totalMealsReceived || subscriptionData.subscriptionDay
      }
    });
  }

  /**
   * Trigger prompt for app session end
   */
  async triggerAppSessionEnd(sessionData) {
    return await this.triggerPrompt({
      triggerType: 'app_session_end',
      userId: sessionData.userId,
      triggerContext: {
        sessionDuration: sessionData.duration, // in minutes
        actionsPerformed: sessionData.actions || [],
        screenViews: sessionData.screens || []
      }
    });
  }

  /**
   * Trigger prompt for chef interaction
   */
  async triggerChefInteraction(interactionData) {
    return await this.triggerPrompt({
      triggerType: 'chef_interaction',
      userId: interactionData.userId,
      relatedChefId: interactionData.chefId,
      relatedOrderId: interactionData.orderId,
      triggerContext: {
        interactionType: interactionData.type || 'meal_delivery',
        interactionRating: interactionData.existingRating,
        issueResolved: interactionData.issueResolved || false
      }
    });
  }

  /**
   * Trigger prompt for driver interaction
   */
  async triggerDriverInteraction(interactionData) {
    return await this.triggerPrompt({
      triggerType: 'driver_interaction',
      userId: interactionData.userId,
      relatedDriverId: interactionData.driverId,
      relatedOrderId: interactionData.orderId,
      triggerContext: {
        interactionType: interactionData.type || 'delivery',
        interactionRating: interactionData.existingRating,
        issueResolved: interactionData.issueResolved || false
      }
    });
  }

  /**
   * Check if user should be prompted for specific context
   */
  async checkEligibility(context) {
    try {
      const response = await apiService.makeRequest(`/api/rating-prompts/eligibility?context=${context}`);
      return response;
    } catch (error) {
      console.error('Error checking prompt eligibility:', error);
      return { success: false, shouldPrompt: false, reason: 'error' };
    }
  }

  /**
   * Get current prompt data
   */
  getCurrentPrompt() {
    return this.currentPrompt;
  }

  /**
   * Get prompt queue length
   */
  getQueueLength() {
    return this.promptQueue.length;
  }

  /**
   * Clear all queued prompts
   */
  clearQueue() {
    this.promptQueue = [];
    console.log('🧹 Cleared rating prompt queue');
  }
}

// Export singleton instance
export const ratingPromptManager = new RatingPromptManager();
export default ratingPromptManager;