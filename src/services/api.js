// src/services/api.js - Enhanced MongoDB Backend API Service
import AsyncStorage from '@react-native-async-storage/async-storage';
import { APP_CONFIG } from '../utils/constants';

// Base configuration
const API_BASE_URL = APP_CONFIG.API_BASE_URL;

class ApiService {
  constructor() {
    this.baseURL = API_BASE_URL;
    this.token = null;
    this.isOnline = true;
    this.retryAttempts = 3;
    this.timeout = 10000; // 10 seconds
  }

  // Set authentication token
  setAuthToken(token) {
    this.token = token;
  }

  // Get stored token
  async getStoredToken() {
    try {
      const token = await AsyncStorage.getItem('authToken');
      if (token) {
        this.token = token;
      }
      return token;
    } catch (error) {
      console.error('Error getting stored token:', error);
      return null;
    }
  }

  // Store token
  async storeToken(token) {
    try {
      await AsyncStorage.setItem('authToken', token);
      this.token = token;
    } catch (error) {
      console.error('Error storing token:', error);
    }
  }

  // Remove token
  async removeToken() {
    try {
      await AsyncStorage.removeItem('authToken');
      this.token = null;
    } catch (error) {
      console.error('Error removing token:', error);
    }
  }

  // Check if backend is available
  async checkBackendHealth() {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
      
      const response = await fetch(`${this.baseURL.replace('/api', '')}/health`, {
        signal: controller.signal,
        method: 'GET',
      });
      
      clearTimeout(timeoutId);
      
      if (response.ok) {
        this.isOnline = true;
        return true;
      }
      
      this.isOnline = false;
      return false;
    } catch (error) {
      console.log('Backend health check failed:', error.message);
      this.isOnline = false;
      return false;
    }
  }

  // Generic API request method with retry and fallback
  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    
    // Ensure we have the latest token
    if (!this.token) {
      await this.getStoredToken();
    }
    
    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...(this.token && { Authorization: `Bearer ${this.token}` }),
        ...options.headers,
      },
      ...options,
    };

    if (config.body && typeof config.body === 'object') {
      config.body = JSON.stringify(config.body);
    }

    // Add timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);
    config.signal = controller.signal;

    for (let attempt = 1; attempt <= this.retryAttempts; attempt++) {
      try {
        console.log(`API Request (Attempt ${attempt}): ${config.method || 'GET'} ${url}`);
        
        const response = await fetch(url, config);
        clearTimeout(timeoutId);
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        this.isOnline = true;
        return { success: true, data };

      } catch (error) {
        clearTimeout(timeoutId);
        console.error(`API Error (Attempt ${attempt}):`, error.message);
        
        // If it's the last attempt or not a network error, break
        if (attempt === this.retryAttempts || !this.isNetworkError(error)) {
          this.isOnline = false;
          break;
        }
        
        // Wait before retry (exponential backoff)
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
      }
    }

    // If all retries failed, return error
    return { 
      success: false, 
      error: `Unable to connect to server after ${this.retryAttempts} attempts`,
      offline: true 
    };
  }

  // Check if error is network-related
  isNetworkError(error) {
    return error.name === 'AbortError' || 
           error.message.includes('Network request failed') ||
           error.message.includes('fetch');
  }

  // Authentication methods
  async signup(userData) {
    const result = await this.request('/auth/signup', {
      method: 'POST',
      body: userData,
    });

    if (result.success && result.data.token) {
      await this.storeToken(result.data.token);
    }

    return result;
  }

  async login(credentials) {
    const result = await this.request('/auth/login', {
      method: 'POST',
      body: credentials,
    });

    if (result.success && result.data.token) {
      await this.storeToken(result.data.token);
    }

    return result;
  }

  async logout() {
    // Try to logout from backend first
    const result = await this.request('/auth/logout', { method: 'POST' });
    
    // Always clear local data regardless of backend response
    await this.removeToken();
    await AsyncStorage.removeItem('userData');
    
    return { success: true };
  }

  async getProfile() {
    await this.getStoredToken();
    return await this.request('/auth/profile');
  }

  async getUserStats() {
    await this.getStoredToken();
    return await this.request('/auth/profile/stats');
  }

  async getUserActivity() {
    await this.getStoredToken();
    return await this.request('/auth/profile/activity');
  }

  async getUserAchievements() {
    await this.getStoredToken();
    return await this.request('/auth/profile/achievements');
  }

  async getNotificationPreferences() {
    await this.getStoredToken();
    return await this.request('/auth/profile/notifications');
  }

  async updateNotificationPreferences(preferences) {
    await this.getStoredToken();
    return await this.request('/auth/profile/notifications', {
      method: 'PUT',
      body: preferences,
    });
  }

  // Profile methods
  async updateUserProfile(profileData) {
    await this.getStoredToken();
    return this.request('/auth/profile', {
      method: 'PUT',
      body: profileData,
    });
  }

  async deleteAccount() {
    await this.getStoredToken();
    
    const result = await this.request('/auth/account', {
      method: 'DELETE',
    });
    
    if (result.success) {
      // Clear all local data after successful deletion
      await this.removeToken();
      await AsyncStorage.removeItem('userData');
      await AsyncStorage.removeItem('profileImage');
    }
    
    return result;
  }

  // Dashboard methods
  async getUserDashboard() {
    await this.getStoredToken();
    console.log('🔄 Fetching user dashboard data...');
    const result = await this.request('/auth/dashboard');
    
    if (result.success) {
      console.log('✅ Dashboard data loaded:', result.data?.hasActiveSubscription ? 'Subscribed User' : 'Discovery Mode');
    } else {
      console.error('❌ Failed to load dashboard:', result.error);
    }
    
    return result;
  }

  async pauseSubscription(reason) {
    await this.getStoredToken();
    return await this.request('/auth/subscription/pause', {
      method: 'POST',
      body: { reason },
    });
  }

  async resumeSubscription() {
    await this.getStoredToken();
    return await this.request('/auth/subscription/resume', {
      method: 'POST',
    });
  }

  async getDeliveryTracking(orderId) {
    await this.getStoredToken();
    return await this.request(`/auth/delivery/track/${orderId}`);
  }

  // Meal plans methods - real data only
  async getMealPlans() {
    console.log('🔄 Fetching meal plans from backend...');
    console.log('🌐 API URL:', `${this.baseURL}/mealplans`);
    
    // Test backend health first
    const isHealthy = await this.checkBackendHealth();
    console.log('🏥 Backend health check:', isHealthy ? 'PASS' : 'FAIL');
    
    const result = await this.request('/mealplans');
    
    if (result.success) {
      // Ensure result.data is the backend response and extract the data field
      const backendResponse = result.data;
      const mealPlansData = Array.isArray(backendResponse?.data) ? backendResponse.data : [];
      
      console.log(`✅ Successfully loaded ${mealPlansData.length} meal plans`);
      console.log('📋 Meal plan names:', mealPlansData.map(mp => mp.planName).join(', '));
      
      // Return in consistent format
      return {
        success: true,
        data: mealPlansData,
        count: mealPlansData.length
      };
    } else {
      console.error('❌ Failed to load meal plans:', result.error);
      // Return empty array on error
      return {
        success: false,
        data: [],
        error: result.error
      };
    }
  }

  async getPopularMealPlans() {
    console.log('🔄 Fetching popular meal plans from backend...');
    const result = await this.request('/mealplans/popular');
    
    if (result.success) {
      const backendResponse = result.data;
      const popularPlansData = Array.isArray(backendResponse?.data) ? backendResponse.data : [];

      console.log(`✅ Successfully loaded ${popularPlansData.length} popular meal plans`);
      return {
        success: true,
        data: popularPlansData,
        count: popularPlansData.length
      };
    } else {
      console.error('❌ Failed to load popular meal plans:', result.error);
      return {
        success: false,
        data: [],
        error: result.error
      };
    }
  }

  async getMealPlanById(id) {
    console.log(`🔍 Fetching meal plan details for ID: ${id}`);
    const result = await this.request(`/mealplans/${id}`);
    
    if (result.success) {
      // Ensure result.data is the backend response and extract the data field
      const backendResponse = result.data;
      const mealPlanData = backendResponse?.data || backendResponse;
      
      console.log(`✅ Successfully loaded meal plan: ${mealPlanData?.planName || 'Unknown'}`);
      console.log('📋 Meal plan data:', JSON.stringify(mealPlanData, null, 2));
      
      // Return in consistent format
      return {
        success: true,
        data: mealPlanData
      };
    } else {
      console.error('❌ Failed to load meal plan details:', result.error);
      return {
        success: false,
        data: null,
        error: result.error
      };
    }
  }

  // Get detailed meal plan information
  async getMealPlanDetails(id) {
    console.log(`🔍 Fetching detailed meal plan for ID: ${id}`);
    const result = await this.getMealPlanById(id);
    
    // Match the expected return format in MealPlanDetailScreen
    if (result.success) {
      return {
        success: true,
        mealPlan: result.data,
        message: 'Meal plan details retrieved successfully'
      };
    } else {
      return {
        success: false,
        mealPlan: null,
        message: result.error || 'Failed to retrieve meal plan details'
      };
    }
  }

  // Get meal plan customization options
  async getMealCustomization(mealPlanId) {
    console.log(`🔧 Fetching meal customization for plan ID: ${mealPlanId}`);
    await this.getStoredToken();
    const result = await this.request(`/mealplans/${mealPlanId}/customization`);
    
    if (result.success) {
      console.log('✅ Successfully loaded meal customization options');
      return result;
    } else {
      console.error('❌ Failed to load meal customization:', result.error);
      return {
        success: false,
        data: null,
        error: result.error || 'Failed to retrieve meal customization options'
      };
    }
  }

  // Get available meals for customization
  async getAvailableMeals(filters = {}) {
    console.log('🍽️ Fetching available meals with filters:', filters);
    
    const queryParams = new URLSearchParams();
    if (filters.mealType) queryParams.append('mealType', filters.mealType);
    if (filters.dietaryPreferences) queryParams.append('dietaryPreferences', filters.dietaryPreferences.join(','));
    if (filters.excludeIngredients) queryParams.append('excludeIngredients', filters.excludeIngredients.join(','));
    
    const url = `/mealplans/meals/available${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
    const result = await this.request(url);
    
    if (result.success) {
      console.log(`✅ Successfully loaded ${result.data?.length || 0} available meals`);
    } else {
      console.error('❌ Failed to load available meals:', result.error);
    }
    
    return result;
  }

  // Orders methods
  async createOrder(orderData) {
    await this.getStoredToken();
    return await this.request('/orders', {
      method: 'POST',
      body: orderData,
    });
  }

  async getUserOrders() {
    await this.getStoredToken();
    const result = await this.request('/orders');
    
    // Add detailed logging for debugging
    console.log('🔍 getUserOrders API Response:', JSON.stringify(result, null, 2));
    console.log('📊 result.success:', result.success);
    console.log('📦 result.data type:', typeof result.data);
    console.log('📋 result.data:', result.data);
    
    return result;
  }

  async getOrderById(id) {
    await this.getStoredToken();
    return this.request(`/orders/${id}`);
  }

  async cancelOrder(orderId) {
    await this.getStoredToken();
    return this.request(`/orders/${orderId}/cancel`, {
      method: 'PUT',
    });
  }

  // Subscriptions methods
  async createSubscription(subscriptionData) {
    await this.getStoredToken();
    return this.request('/subscriptions', {
      method: 'POST',
      body: subscriptionData,
    });
  }

  async getUserSubscriptions() {
    await this.getStoredToken();
    return this.request('/subscriptions');
  }

  async getSubscriptionById(id) {
    await this.getStoredToken();
    return this.request(`/subscriptions/${id}`);
  }

  async updateSubscription(id, updates) {
    console.log('API updateSubscription called with ID:', id, 'Updates:', updates);
    await this.getStoredToken();
    return this.request(`/subscriptions/${id}`, {
      method: 'PUT',
      body: updates,
    });
  }

  async cancelSubscription(id) {
    await this.getStoredToken();
    return this.request(`/subscriptions/${id}/cancel`, {
      method: 'PUT',
    });
  }

  // Payment methods
  async initializePayment(paymentData) {
    await this.getStoredToken();
    return this.request('/payments/initialize', {
      method: 'POST',
      body: paymentData,
    });
  }

  async verifyPayment(reference) {
    await this.getStoredToken();
    return this.request(`/payments/verify/${reference}`);
  }

  async getPaymentHistory(page = 1, limit = 10) {
    await this.getStoredToken();
    return this.request(`/payments/history?page=${page}&limit=${limit}`);
  }

  // Notifications methods
  async getUserNotifications(page = 1, limit = 20) {
    await this.getStoredToken();
    return this.request(`/notifications?page=${page}&limit=${limit}`);
  }

  async registerPushToken(token, userId) {
    await this.getStoredToken();
    return this.request('/auth/push-token', {
      method: 'POST',
      body: { token, userId, platform: 'expo' },
    });
  }

  async markNotificationAsRead(notificationId) {
    await this.getStoredToken();
    return this.request(`/notifications/${notificationId}/read`, {
      method: 'PUT',
    });
  }

  async markAllNotificationsAsRead() {
    await this.getStoredToken();
    return this.request('/notifications/mark-all-read', {
      method: 'PUT',
    });
  }

  async deleteNotification(notificationId) {
    await this.getStoredToken();
    return this.request(`/notifications/${notificationId}`, {
      method: 'DELETE',
    });
  }

  // Banners and promotions methods
  async getActiveBanners() {
    return this.request('/banners/active');
  }

  async getPromotions() {
    return this.request('/promotions/active');
  }

  // Delivery tracking methods
  async getDeliveryTracking(trackingId) {
    await this.getStoredToken();
    return this.request(`/delivery/tracking/${trackingId}`);
  }

  async updateDeliveryLocation(trackingId, location) {
    await this.getStoredToken();
    return this.request(`/delivery/tracking/${trackingId}/location`, {
      method: 'PUT',
      body: location,
    });
  }

  async rateDelivery(trackingId, rating, feedback = '') {
    await this.getStoredToken();
    return this.request(`/delivery/tracking/${trackingId}/rate`, {
      method: 'POST',
      body: { rating, feedback },
    });
  }

  // User analytics and statistics
  async getUserAnalytics() {
    await this.getStoredToken();
    return this.request('/users/analytics');
  }

  async getUserOrderStats() {
    await this.getStoredToken();
    return this.request('/users/stats/orders');
  }

  async getUserNutritionScore() {
    await this.getStoredToken();
    return this.request('/users/stats/nutrition');
  }

  // Activity logging
  async logUserActivity(activityData) {
    await this.getStoredToken();
    return this.request('/users/activity/log', {
      method: 'POST',
      body: activityData,
    });
  }

  // Achievement system
  async checkAchievements() {
    await this.getStoredToken();
    return this.request('/users/achievements/check', {
      method: 'POST',
    });
  }

  async claimAchievement(achievementId) {
    await this.getStoredToken();
    return this.request(`/users/achievements/${achievementId}/claim`, {
      method: 'POST',
    });
  }

  async getAvailableAchievements() {
    return this.request('/achievements/available');
  }

  // ============= NEW FILTERING AND SEARCH METHODS =============

  // Get filtered meal plans with advanced filtering
  async getFilteredMealPlans(filters = {}) {
    console.log('🔄 Fetching filtered meal plans...', filters);
    
    const queryParams = new URLSearchParams();
    
    // Add audience filters
    if (filters.audiences && filters.audiences.length > 0) {
      filters.audiences.forEach(audience => {
        queryParams.append('audience', audience);
      });
    }
    
    // Add price range
    if (filters.minPrice !== undefined) queryParams.append('minPrice', filters.minPrice);
    if (filters.maxPrice !== undefined) queryParams.append('maxPrice', filters.maxPrice);
    
    // Add duration filter
    if (filters.duration) queryParams.append('duration', filters.duration);
    
    // Add sorting
    if (filters.sortBy) queryParams.append('sortBy', filters.sortBy);
    
    // Add pagination
    if (filters.page) queryParams.append('page', filters.page);
    if (filters.limit) queryParams.append('limit', filters.limit);
    
    const url = `/mealplans/filtered${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
    const result = await this.request(url);
    
    if (result.success) {
      const backendResponse = result.data;
      const mealPlansData = Array.isArray(backendResponse?.data) ? backendResponse.data : [];
      
      console.log(`✅ Successfully loaded ${mealPlansData.length} filtered meal plans`);
      
      return {
        success: true,
        data: mealPlansData,
        pagination: backendResponse?.pagination || {},
        count: mealPlansData.length
      };
    } else {
      console.error('❌ Failed to load filtered meal plans:', result.error);
      return {
        success: false,
        data: [],
        error: result.error
      };
    }
  }

  // Enhanced search with filtering
  async searchMealPlans(query, filters = {}) {
    console.log('🔍 Searching meal plans...', { query, filters });
    
    const queryParams = new URLSearchParams();
    
    // Add search query
    if (query && query.trim()) queryParams.append('query', query.trim());
    
    // Add audience filters
    if (filters.audiences && filters.audiences.length > 0) {
      filters.audiences.forEach(audience => {
        queryParams.append('audience', audience);
      });
    }
    
    // Add price range
    if (filters.minPrice !== undefined) queryParams.append('minPrice', filters.minPrice);
    if (filters.maxPrice !== undefined) queryParams.append('maxPrice', filters.maxPrice);
    
    // Add sorting
    if (filters.sortBy) queryParams.append('sortBy', filters.sortBy);
    
    // Add pagination
    if (filters.page) queryParams.append('page', filters.page);
    if (filters.limit) queryParams.append('limit', filters.limit);
    
    const url = `/mealplans/search${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
    const result = await this.request(url);
    
    if (result.success) {
      const backendResponse = result.data;
      const searchResults = Array.isArray(backendResponse?.data) ? backendResponse.data : [];
      
      console.log(`✅ Search returned ${searchResults.length} results`);
      
      return {
        success: true,
        data: searchResults,
        searchQuery: backendResponse?.searchQuery || query,
        pagination: backendResponse?.pagination || {},
        count: searchResults.length
      };
    } else {
      console.error('❌ Search failed:', result.error);
      
      // Fallback to local filtering if available
      if (this.fallbackMealPlans && this.fallbackMealPlans.length > 0) {
        console.log('🔄 Falling back to local search...');
        return this.searchMealPlansLocally(query, filters);
      }
      
      return {
        success: false,
        data: [],
        error: result.error
      };
    }
  }

  // Get available target audiences
  async getTargetAudiences() {
    console.log('🔄 Fetching target audiences...');
    
    const result = await this.request('/mealplans/audiences');
    
    if (result.success) {
      const backendResponse = result.data;
      const audiencesData = Array.isArray(backendResponse?.data) ? backendResponse.data : [];
      
      console.log(`✅ Successfully loaded ${audiencesData.length} target audiences`);
      
      return {
        success: true,
        data: audiencesData,
        count: audiencesData.length
      };
    } else {
      console.error('❌ Failed to load target audiences:', result.error);
      
      // Fallback to default audiences
      const defaultAudiences = [
        { name: 'Fitness', count: 0, displayName: 'Fitness', description: 'High-protein meals for active lifestyles' },
        { name: 'Family', count: 0, displayName: 'Family', description: 'Nutritious meals perfect for families' },
        { name: 'Professional', count: 0, displayName: 'Professional', description: 'Quick, convenient meals for busy professionals' },
        { name: 'Wellness', count: 0, displayName: 'Wellness', description: 'Balanced meals focused on overall health' },
        { name: 'Weight Loss', count: 0, displayName: 'Weight Loss', description: 'Calorie-controlled meals for weight management' },
        { name: 'Muscle Gain', count: 0, displayName: 'Muscle Gain', description: 'High-protein, high-calorie meals for muscle building' },
        { name: 'Diabetic Friendly', count: 0, displayName: 'Diabetic Friendly', description: 'Low-sugar, diabetes-friendly meal options' },
        { name: 'Heart Healthy', count: 0, displayName: 'Heart Healthy', description: 'Heart-healthy meals with reduced sodium' }
      ];
      
      return {
        success: true,
        data: defaultAudiences,
        count: defaultAudiences.length
      };
    }
  }

  // Local search fallback method
  searchMealPlansLocally(query, filters = {}) {
    if (!this.fallbackMealPlans) {
      return { success: false, data: [], error: 'No local data available' };
    }

    let results = [...this.fallbackMealPlans];

    // Filter by search query
    if (query && query.trim()) {
      const searchTerm = query.toLowerCase();
      results = results.filter(plan => 
        plan.planName?.toLowerCase().includes(searchTerm) ||
        plan.description?.toLowerCase().includes(searchTerm) ||
        plan.targetAudience?.toLowerCase().includes(searchTerm) ||
        (plan.planFeatures && plan.planFeatures.some(feature => 
          feature.toLowerCase().includes(searchTerm)
        ))
      );
    }

    // Filter by audiences
    if (filters.audiences && filters.audiences.length > 0) {
      results = results.filter(plan => 
        filters.audiences.includes(plan.targetAudience)
      );
    }

    // Filter by price range
    if (filters.minPrice !== undefined || filters.maxPrice !== undefined) {
      results = results.filter(plan => {
        const price = plan.totalPrice || plan.basePrice || 0;
        return (filters.minPrice === undefined || price >= filters.minPrice) &&
               (filters.maxPrice === undefined || price <= filters.maxPrice);
      });
    }

    // Sort results
    if (filters.sortBy) {
      switch (filters.sortBy) {
        case 'price-low':
          results.sort((a, b) => (a.totalPrice || a.basePrice || 0) - (b.totalPrice || b.basePrice || 0));
          break;
        case 'price-high':
          results.sort((a, b) => (b.totalPrice || b.basePrice || 0) - (a.totalPrice || a.basePrice || 0));
          break;
        case 'newest':
          results.sort((a, b) => new Date(b.createdDate || b.createdAt) - new Date(a.createdDate || a.createdAt));
          break;
        case 'rating':
          results.sort((a, b) => (b.avgRating || 0) - (a.avgRating || 0));
          break;
        default: // popularity
          results.sort((a, b) => (b.totalSubscriptions || 0) - (a.totalSubscriptions || 0));
      }
    }

    console.log(`🔍 Local search returned ${results.length} results`);

    return {
      success: true,
      data: results,
      searchQuery: query,
      count: results.length,
      isLocalSearch: true
    };
  }

  // Store meal plans for local fallback
  storeFallbackMealPlans(mealPlans) {
    this.fallbackMealPlans = mealPlans;
    console.log(`💾 Stored ${mealPlans.length} meal plans for offline fallback`);
  }

  // Get popular search terms
  async getPopularSearches() {
    return this.request('/search/popular');
  }

  // Bookmark/Favorites methods
  async getUserBookmarks() {
    await this.getStoredToken();
    return this.request('/users/bookmarks');
  }

  async addBookmark(itemId, itemType = 'mealplan') {
    await this.getStoredToken();
    return this.request('/users/bookmarks', {
      method: 'POST',
      body: { itemId, itemType },
    });
  }

  async removeBookmark(itemId) {
    await this.getStoredToken();
    return this.request(`/users/bookmarks/${itemId}`, {
      method: 'DELETE',
    });
  }

  // Settings and preferences
  async getUserSettings() {
    await this.getStoredToken();
    return this.request('/users/settings');
  }

  async updateUserSettings(settings) {
    await this.getStoredToken();
    return this.request('/users/settings', {
      method: 'PUT',
      body: settings,
    });
  }

  // Privacy and security settings
  async getPrivacySettings() {
    await this.getStoredToken();
    return this.request('/users/privacy-settings');
  }

  async updatePrivacySettings(settings) {
    await this.getStoredToken();
    return this.request('/users/privacy-settings', {
      method: 'PUT',
      body: settings,
    });
  }

  async requestDataExport() {
    await this.getStoredToken();
    return this.request('/users/data-export', {
      method: 'POST',
    });
  }

  // Reviews and ratings
  async submitReview(itemId, itemType, rating, review) {
    await this.getStoredToken();
    return this.request('/reviews', {
      method: 'POST',
      body: { itemId, itemType, rating, review },
    });
  }

  async getReviews(itemId, itemType) {
    return this.request(`/reviews/${itemType}/${itemId}`);
  }

  // Support and help
  async submitSupportTicket(subject, message, category = 'general') {
    await this.getStoredToken();
    return this.request('/support/tickets', {
      method: 'POST',
      body: { subject, message, category },
    });
  }

  async getSupportTickets() {
    await this.getStoredToken();
    return this.request('/support/tickets');
  }

  async getFAQs() {
    return this.request('/support/faqs');
  }

  // Subscription options and plans
  async getSubscriptionOptions() {
    return this.request('/subscription-plans');
  }

  async getSubscriptionPlans() {
    return this.request('/subscription-plans/available');
  }

  // Notification API methods
  async getUserNotifications() {
    console.log('🔔 Fetching user notifications');
    await this.getStoredToken();
    
    const result = await this.request('/notifications');
    
    if (result.success) {
      console.log('✅ Notifications fetched successfully');
    } else {
      console.error('❌ Failed to fetch notifications:', result.error);
    }
    
    return result;
  }

  async registerPushToken(token, userId) {
    console.log('📱 Registering push token for user:', userId);
    await this.getStoredToken();
    
    const result = await this.request('/notifications/register-token', {
      method: 'POST',
      body: { token, userId },
    });
    
    if (result.success) {
      console.log('✅ Push token registered successfully');
    } else {
      console.error('❌ Failed to register push token:', result.error);
    }
    
    return result;
  }

  async markNotificationAsRead(notificationId) {
    console.log('✅ Marking notification as read:', notificationId);
    await this.getStoredToken();
    
    const result = await this.request(`/notifications/${notificationId}/read`, {
      method: 'PUT',
    });
    
    if (result.success) {
      console.log('✅ Notification marked as read');
    } else {
      console.error('❌ Failed to mark notification as read:', result.error);
    }
    
    return result;
  }

  async markAllNotificationsAsRead() {
    console.log('✅ Marking all notifications as read');
    await this.getStoredToken();
    
    const result = await this.request('/notifications/mark-all-read', {
      method: 'PUT',
    });
    
    if (result.success) {
      console.log('✅ All notifications marked as read');
    } else {
      console.error('❌ Failed to mark all notifications as read:', result.error);
    }
    
    return result;
  }

  async deleteNotification(notificationId) {
    console.log('🗑️ Deleting notification:', notificationId);
    await this.getStoredToken();
    
    const result = await this.request(`/notifications/${notificationId}`, {
      method: 'DELETE',
    });
    
    if (result.success) {
      console.log('✅ Notification deleted');
    } else {
      console.error('❌ Failed to delete notification:', result.error);
    }
    
    return result;
  }

  async createNotification(notificationData) {
    await this.getStoredToken();
    return this.request('/notifications', {
      method: 'POST',
      body: notificationData,
    });
  }

  async createAdminNotification(notificationData) {
    await this.getStoredToken();
    return this.request('/admin/notifications', {
      method: 'POST',
      body: notificationData,
    });
  }

  async createChefNotification(notificationData) {
    await this.getStoredToken();
    return this.request('/chef/notifications', {
      method: 'POST',
      body: notificationData,
    });
  }

  // Save meal customization
  async saveMealCustomization(customizationData) {
    console.log('💾 Saving meal customization:', customizationData);
    await this.getStoredToken();
    
    const result = await this.request('/mealplans/customization', {
      method: 'POST',
      body: customizationData,
    });
    
    if (result.success) {
      console.log('✅ Meal customization saved successfully');
    } else {
      console.error('❌ Failed to save meal customization:', result.error);
    }
    
    return result;
  }

  // Update user profile
  async updateProfile(profileData) {
    console.log('👤 Updating user profile:', JSON.stringify(profileData, null, 2));
    await this.getStoredToken();
    
    // Ensure we have the correct data structure
    const sanitizedData = {
      ...profileData,
      // Make sure we don't send null or undefined values
      ...(profileData.profileImage && { profileImage: profileData.profileImage }),
      ...(profileData.fullName && { fullName: profileData.fullName }),
      ...(profileData.email && { email: profileData.email }),
      ...(profileData.phoneNumber && { phoneNumber: profileData.phoneNumber }),
      ...(profileData.deliveryAddress && { deliveryAddress: profileData.deliveryAddress }),
      ...(profileData.city && { city: profileData.city }),
      ...(profileData.state && { state: profileData.state }),
    };
    
    console.log('📤 Sending sanitized profile data:', JSON.stringify(sanitizedData, null, 2));
    
    const result = await this.request('/auth/profile', {
      method: 'PUT',
      body: sanitizedData,
    });
    
    if (result.success) {
      console.log('✅ Profile updated successfully');
    } else {
      console.error('❌ Failed to update profile:', result.error);
      console.error('❌ Response details:', JSON.stringify(result, null, 2));
    }
    
    return result;
  }

  // Get user profile
  async getProfile() {
    console.log('👤 Fetching user profile');
    await this.getStoredToken();
    
    const result = await this.request('/auth/profile');
    
    if (result.success) {
      console.log('✅ Profile fetched successfully');
    } else {
      console.error('❌ Failed to fetch profile:', result.error);
    }
    
    return result;
  }

  // Get popular searches
  async getPopularSearches() {
    console.log('🔍 Fetching popular searches');
    
    const result = await this.request('/search/popular');
    
    if (result.success) {
      console.log('✅ Popular searches fetched successfully');
    } else {
      console.error('❌ Failed to fetch popular searches:', result.error);
    }
    
    return result;
  }


  // Sync pending data for offline functionality
  async syncPendingData() {
    try {
      // This is a placeholder for offline sync functionality
      // In a full implementation, this would sync any pending offline data
      console.log('🔄 Syncing pending data...');
      
      // For now, just return success
      return { success: true, message: 'No pending data to sync' };
    } catch (error) {
      console.error('Sync pending data error:', error);
      return { success: false, error: error.message };
    }
  }

  // Convenience HTTP methods
  async get(endpoint, options = {}) {
    await this.getStoredToken();
    return this.request(endpoint, { ...options, method: 'GET' });
  }

  async post(endpoint, data, options = {}) {
    await this.getStoredToken();
    return this.request(endpoint, { 
      ...options, 
      method: 'POST', 
      body: data 
    });
  }

  async put(endpoint, data, options = {}) {
    await this.getStoredToken();
    return this.request(endpoint, { 
      ...options, 
      method: 'PUT', 
      body: data 
    });
  }

  async delete(endpoint, options = {}) {
    await this.getStoredToken();
    return this.request(endpoint, { ...options, method: 'DELETE' });
  }
}

// Create and export a single instance
const apiService = new ApiService();
export default apiService;
export { apiService as api };