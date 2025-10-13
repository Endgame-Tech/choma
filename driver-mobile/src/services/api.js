// src/services/api.js - Enhanced MongoDB Backend API Service
import AsyncStorage from "@react-native-async-storage/async-storage";
import { APP_CONFIG } from "../utils/constants";
import rateLimitService from "./rateLimitService";
import cacheService from "./cacheService";

// Base configuration
const API_BASE_URL = APP_CONFIG.API_BASE_URL;

class ApiService {
  constructor() {
    this.baseURL = API_BASE_URL;
    this.token = null;
    this.isOnline = true;
    this.retryAttempts = 3;
    this.timeout = 30000; // 30 seconds

    // Token caching for faster auth
    this.cachedToken = null;
    this.tokenLastChecked = 0;
    this.tokenCacheTimeout = 5 * 60 * 1000; // Cache token for 5 minutes

    // Rate limiting state
    this.requestQueue = new Map(); // Track pending requests
    this.lastRequestTime = 0;
    this.minRequestInterval = 200; // Minimum 200ms between requests
    this.backoffMultiplier = 1.5;
    this.maxBackoffDelay = 10000; // 10 seconds max delay

    // Request deduplication
    this.pendingRequests = new Map();
  }

  // Get user ID for rate limiting (extract from token or use default)
  getUserId() {
    try {
      if (this.token) {
        // Simple extraction - in production you'd decode the JWT properly
        const payload = this.token.split(".")[1];
        if (payload) {
          const decoded = JSON.parse(atob(payload));
          return decoded.userId || decoded.id || "authenticated";
        }
      }
      return "anonymous";
    } catch (error) {
      return "anonymous";
    }
  }

  // Set authentication token
  setAuthToken(token) {
    this.token = token;
  }

  // Get stored token with memory caching for faster auth
  async getStoredToken() {
    try {
      const now = Date.now();

      // Return cached token if it's still valid
      if (
        this.cachedToken &&
        now - this.tokenLastChecked < this.tokenCacheTimeout
      ) {
        this.token = this.cachedToken;
        return this.cachedToken;
      }

      // Fetch from AsyncStorage if cache is expired or empty
      const token = await AsyncStorage.getItem("authToken");
      if (token) {
        this.token = token;
        this.cachedToken = token;
        this.tokenLastChecked = now;
      } else {
        // Clear cache if no token found
        this.cachedToken = null;
        this.tokenLastChecked = 0;
      }
      return token;
    } catch (error) {
      console.error("Error getting stored token:", error);
      return null;
    }
  }

  // Store token
  async storeToken(token) {
    try {
      await AsyncStorage.setItem("authToken", token);
      this.token = token;
      // Update cache immediately
      this.cachedToken = token;
      this.tokenLastChecked = Date.now();
    } catch (error) {
      console.error("Error storing token:", error);
    }
  }

  // Remove token
  async removeToken() {
    try {
      await AsyncStorage.removeItem("authToken");
      this.token = null;
      // Clear cache immediately
      this.cachedToken = null;
      this.tokenLastChecked = 0;
    } catch (error) {
      console.error("Error removing token:", error);
    }
  }

  // Initialize API service - load token on app startup
  async initialize() {
    try {
      console.log("🚀 Initializing API service...");
      const token = await this.getStoredToken();
      if (token) {
        console.log("✅ API service initialized with stored token");
      } else {
        console.log(
          "ℹ️ API service initialized without token (unauthenticated)"
        );
      }
      return true;
    } catch (error) {
      console.error("❌ Failed to initialize API service:", error);
      return false;
    }
  }

  // Debug method to check current authentication status
  debugAuthStatus() {
    console.log("🔍 API Service Auth Debug:");
    console.log("  - Has token:", !!this.token);
    console.log(
      "  - Token preview:",
      this.token ? this.token.substring(0, 20) + "..." : "none"
    );
    console.log("  - User ID:", this.getUserId());
    return {
      hasToken: !!this.token,
      tokenPreview: this.token ? this.token.substring(0, 20) + "..." : "none",
      userId: this.getUserId(),
    };
  }

  // Check if backend is available
  async checkBackendHealth() {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

      const response = await fetch(
        `${this.baseURL.replace("/api", "")}/health`,
        {
          signal: controller.signal,
          method: "GET",
        }
      );

      clearTimeout(timeoutId);

      if (response.ok) {
        this.isOnline = true;
        return true;
      }

      this.isOnline = false;
      return false;
    } catch (error) {
      console.log("Backend health check failed:", error.message);
      this.isOnline = false;
      return false;
    }
  }

  // Generic API request method with retry and fallback
  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;

    // Always ensure we have the latest token before any request
    await this.getStoredToken();

    // Use request deduplication to prevent simultaneous identical requests
    return await this.deduplicateRequest(url, options);
  }

  // Cached API request with stale-while-revalidate strategy
  async cachedRequest(endpoint, cacheType, options = {}) {
    // Ensure we have the latest token before any request
    await this.getStoredToken();

    const userId = this.getUserId();
    const forceRefresh = options.forceRefresh || false;

    // Always fetch fresh data if force refresh is requested
    if (forceRefresh) {
      console.log(`🔄 Force refresh requested for ${cacheType}`);
      const freshData = await this.request(endpoint, options);
      if (freshData.success) {
        await cacheService.set(cacheType, freshData, userId);
      }
      return freshData;
    }

    // Try to get cached data first
    const cachedResult = await cacheService.get(cacheType, userId);

    if (cachedResult) {
      // Return cached data immediately
      const result = {
        ...cachedResult.data,
        fromCache: true,
        source: cachedResult.source,
      };

      // If data is stale, fetch fresh data in background
      if (cachedResult.isStale) {
        console.log(`🔄 Background refresh for stale ${cacheType}`);
        // Ensure token is available for background refresh
        this.getStoredToken()
          .then(() => {
            return this.request(endpoint, options);
          })
          .then((freshData) => {
            if (freshData.success) {
              cacheService.set(cacheType, freshData, userId);
            }
          })
          .catch((error) => {
            console.log(
              `❌ Background refresh failed for ${cacheType}:`,
              error.message
            );
          });
      }

      return result;
    }

    // No cache available, fetch fresh data
    console.log(`🌐 Fetching fresh ${cacheType}`);
    const freshData = await this.request(endpoint, options);
    if (freshData.success) {
      await cacheService.set(cacheType, freshData, userId);
    }
    return freshData;
  }

  // Cache management methods
  async clearCache(type) {
    const userId = this.getUserId();
    await cacheService.clear(type, userId);
  }

  async clearAllCache() {
    await cacheService.clearAll();
  }

  async getCacheStats() {
    return await cacheService.getStats();
  }

  // Optimistic auth loading methods
  async getCachedUser() {
    const userId = this.getUserId();
    const cachedResult = await cacheService.get("authUser", userId);
    return cachedResult?.data || null;
  }

  async setCachedUser(userData) {
    const userId = this.getUserId();
    await cacheService.set("authUser", userData, userId);
  }

  async clearCachedUser() {
    const userId = this.getUserId();
    await cacheService.clear("authUser", userId);
  }

  // Check if error is network-related
  isNetworkError(error) {
    return (
      error.name === "AbortError" ||
      error.message.includes("Network request failed") ||
      error.message.includes("fetch")
    );
  }

  // Rate limiting helper - enforce minimum delay between requests
  async enforceRateLimit() {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;

    if (timeSinceLastRequest < this.minRequestInterval) {
      const delay = this.minRequestInterval - timeSinceLastRequest;
      console.log(`⏱️ Rate limiting: waiting ${delay}ms before next request`);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }

    this.lastRequestTime = Date.now();
  }

  // Calculate exponential backoff delay for 429 errors
  calculateBackoffDelay(attempt, is429Error = false) {
    if (is429Error) {
      // For 429 errors, use longer delays
      const baseDelay = 2000; // Start with 2 seconds
      const delay = Math.min(
        baseDelay * Math.pow(this.backoffMultiplier, attempt),
        this.maxBackoffDelay
      );
      return delay + Math.random() * 1000; // Add jitter
    } else {
      // For other errors, use normal exponential backoff
      return Math.min(1000 * Math.pow(2, attempt), 5000);
    }
  }

  // Request deduplication - prevent duplicate simultaneous requests
  async deduplicateRequest(url, options = {}) {
    const requestKey = `${options.method || "GET"}:${url}:${JSON.stringify(
      options.body || {}
    )}`;

    // If the same request is already pending, wait for it
    if (this.pendingRequests.has(requestKey)) {
      console.log(`🔄 Deduplicating request: ${requestKey}`);
      return await this.pendingRequests.get(requestKey);
    }

    // Create and store the request promise
    const requestPromise = this.executeRequest(url, options);
    this.pendingRequests.set(requestKey, requestPromise);

    try {
      const result = await requestPromise;
      return result;
    } finally {
      // Clean up the pending request
      this.pendingRequests.delete(requestKey);
    }
  }

  // Execute the actual request with rate limiting
  async executeRequest(url, options = {}) {
    // Extract endpoint for rate limiting
    const endpoint = url.replace(this.baseURL, "");
    const userId = this.getUserId(); // We'll implement this method

    // Check rate limiting before making request
    const rateLimitCheck = rateLimitService.shouldRateLimit(endpoint, userId);
    if (rateLimitCheck.shouldLimit) {
      console.log(`⏱️ Request rate limited: ${endpoint}`);
      throw new Error(
        `Rate limited: Please wait ${Math.ceil(
          rateLimitCheck.remainingDelay / 1000
        )} seconds before trying again`
      );
    }

    // Enforce basic rate limiting
    await this.enforceRateLimit();

    const config = {
      headers: {
        "Content-Type": "application/json",
        ...(this.token && { Authorization: `Bearer ${this.token}` }),
        // Add X-API-Key header for production environment
        ...(!__DEV__ && { "X-API-Key": APP_CONFIG.PRODUCTION_API_KEY }),
        ...options.headers,
      },
      ...options,
    };

    // Debug: Log headers for auth-related requests
    if (url.includes("/auth/")) {
      console.log("🔍 Debug - Request headers for auth endpoint:", {
        url: url,
        hasAuthHeader: !!config.headers.Authorization,
        authHeaderPreview: config.headers.Authorization
          ? config.headers.Authorization.substring(0, 30) + "..."
          : "none",
        hasToken: !!this.token,
      });
    }

    if (config.body && typeof config.body === "object") {
      config.body = JSON.stringify(config.body);
    }

    // Add timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);
    config.signal = controller.signal;

    for (let attempt = 1; attempt <= this.retryAttempts; attempt++) {
      try {
        console.log(
          `API Request (Attempt ${attempt}): ${config.method || "GET"} ${url}`
        );

        const response = await fetch(url, config);
        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          console.error(`HTTP ${response.status} Error Response:`, errorData);

          // Handle 429 (Too Many Requests) specifically
          if (response.status === 429) {
            const retryAfter = response.headers.get("Retry-After");
            const delay = retryAfter
              ? parseInt(retryAfter) * 1000
              : this.calculateBackoffDelay(attempt, true);

            console.warn(
              `⏱️ Rate limited (429), waiting ${delay}ms before retry ${attempt}/${this.retryAttempts}`
            );

            if (attempt < this.retryAttempts) {
              await new Promise((resolve) => setTimeout(resolve, delay));
              continue; // Retry the request
            }
          }

          // Create detailed error message
          let errorMessage =
            errorData.message ||
            errorData.error ||
            `HTTP ${response.status}: ${response.statusText}`;

          // Add validation details if available
          if (errorData.details || errorData.errors) {
            const details = errorData.details || errorData.errors;
            if (Array.isArray(details)) {
              const errorMessages = details.map((detail) => {
                if (typeof detail === "object" && detail.msg) {
                  return detail.msg;
                } else if (typeof detail === "string") {
                  return detail;
                } else {
                  return JSON.stringify(detail);
                }
              });
              errorMessage += ": " + errorMessages.join(", ");
            } else if (typeof details === "object") {
              errorMessage += ": " + Object.values(details).join(", ");
            } else {
              errorMessage += ": " + details;
            }
          }

          // Don't retry authentication errors (401, 403) or client errors (400-499)
          if (response.status >= 400 && response.status < 500) {
            return {
              success: false,
              error: errorMessage,
              status: response.status,
              offline: false,
            };
          }

          throw new Error(errorMessage);
        }

        const data = await response.json();
        this.isOnline = true;

        // Record successful request in rate limiting service
        rateLimitService.recordRequest(endpoint, userId);

        return { success: true, data };
      } catch (error) {
        clearTimeout(timeoutId);
        console.error(`API Error (Attempt ${attempt}):`, error.message);

        // Record failure in rate limiting service
        const is429Error =
          error.message.includes("HTTP 429") ||
          error.message.includes("Too many");
        if (is429Error || error.message.includes("Rate limited")) {
          rateLimitService.recordFailure(endpoint, userId, is429Error);
        }

        // Check if it's an HTTP error with a response (client/server error)
        if (
          error.message.includes("HTTP 4") ||
          error.message.includes("HTTP 5")
        ) {
          // For 429 errors, retry with exponential backoff
          if (is429Error && attempt < this.retryAttempts) {
            const delay = this.calculateBackoffDelay(attempt, true);
            console.warn(
              `⏱️ Retrying after 429 error in ${delay}ms (attempt ${attempt}/${this.retryAttempts})`
            );
            await new Promise((resolve) => setTimeout(resolve, delay));
            continue; // Retry the request
          }

          // For other HTTP errors, return immediately without retrying
          const statusMatch = error.message.match(/HTTP (\d+):/);
          const status = statusMatch ? parseInt(statusMatch[1]) : 500;

          return {
            success: false,
            error: error.message,
            status: status,
            offline: false,
          };
        }

        // If it's the last attempt or not a network error, break
        if (attempt === this.retryAttempts || !this.isNetworkError(error)) {
          this.isOnline = false;
          break;
        }

        // Wait before retry (exponential backoff for network errors)
        const delay = this.calculateBackoffDelay(attempt, false);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    // If all retries failed, return error
    return {
      success: false,
      error: `Unable to connect to server after ${this.retryAttempts} attempts`,
      offline: true,
    };
  }

  // Authentication methods
  async signup(userData) {
    const result = await this.request("/auth/signup", {
      method: "POST",
      body: userData,
    });

    if (result.success && result.data.token) {
      await this.storeToken(result.data.token);

      // Cache user data immediately for faster subsequent auth
      if (result.data.customer) {
        await this.setCachedUser({
          success: true,
          data: { customer: result.data.customer },
        });
        console.log("📋 User data cached after signup for faster auth");
      }
    }

    return result;
  }

  async login(credentials) {
    const result = await this.request("/auth/login", {
      method: "POST",
      body: credentials,
    });

    if (result.success && result.data.token) {
      await this.storeToken(result.data.token);

      // Cache user data immediately for faster subsequent auth
      if (result.data.customer) {
        await this.setCachedUser({
          success: true,
          data: { customer: result.data.customer },
        });
        console.log("📋 User data cached after login for faster auth");
      }
    }

    return result;
  }

  async logout() {
    // Try to logout from backend first
    const result = await this.request("/auth/logout", { method: "POST" });

    // Always clear local data regardless of backend response
    await this.removeToken();
    await AsyncStorage.removeItem("userData");
    await this.clearCachedUser();

    return { success: true };
  }

  async getProfile() {
    await this.getStoredToken();
    return await this.request("/auth/profile");
  }

  // Optimistic profile loading - returns cached data immediately, updates in background
  async getProfileOptimistic() {
    await this.getStoredToken();

    // Get cached user data immediately
    const cachedUser = await this.getCachedUser();

    // If we have cached data, return it immediately and fetch fresh data in background
    if (cachedUser && cachedUser.data && cachedUser.data.customer) {
      console.log("🚀 Optimistic loading: returning cached user data");

      // Fetch fresh data in background (non-blocking)
      this.request("/auth/profile")
        .then((result) => {
          if (result.success && result.data && result.data.customer) {
            // Cache the full result structure for consistency
            const cacheData = {
              success: true,
              data: { customer: result.data.customer },
            };
            this.setCachedUser(cacheData);
            console.log("🔄 Background: updated cached user data");
          }
        })
        .catch((error) => {
          console.log("❌ Background profile update failed:", error.message);
        });

      return { ...cachedUser, fromCache: true };
    }

    // No cached data - fetch fresh data and cache it
    console.log("🌐 No cached data: fetching fresh profile");
    const result = await this.request("/auth/profile");

    if (result.success && result.data && result.data.customer) {
      // Cache the data in the expected format
      const cacheData = {
        success: true,
        data: { customer: result.data.customer },
      };
      await this.setCachedUser(cacheData);
      return cacheData;
    }

    return result;
  }

  async getUserStats() {
    await this.getStoredToken();
    return await this.request("/auth/profile/stats");
  }

  async getUserActivity() {
    await this.getStoredToken();
    return await this.request("/auth/profile/activity");
  }

  async getUserAchievements() {
    await this.getStoredToken();
    return await this.request("/auth/profile/achievements");
  }

  async getNotificationPreferences() {
    await this.getStoredToken();
    return await this.request("/auth/profile/notifications");
  }

  async updateNotificationPreferences(preferences) {
    await this.getStoredToken();
    return await this.request("/auth/profile/notifications", {
      method: "PUT",
      body: preferences,
    });
  }

  // Profile methods
  async updateUserProfile(profileData) {
    await this.getStoredToken();
    return this.request("/auth/profile", {
      method: "PUT",
      body: profileData,
    });
  }

  async deleteAccount() {
    console.log("🗑️ apiService.deleteAccount() called");
    await this.getStoredToken();

    console.log("🗑️ Making DELETE request to /auth/account");
    const result = await this.request("/auth/account", {
      method: "DELETE",
    });

    console.log("🗑️ Delete account API result:", result);

    if (result.success) {
      // Clear all local data after successful deletion
      await this.removeToken();
      await AsyncStorage.removeItem("userData");
      await AsyncStorage.removeItem("profileImage");
    }

    return result;
  }

  // Dashboard methods
  async getUserDashboard() {
    await this.getStoredToken();
    console.log("🔄 Fetching user dashboard data...");
    const result = await this.request("/auth/dashboard");

    if (result.success) {
      console.log(
        "✅ Dashboard data loaded:",
        result.data?.hasActiveSubscription
          ? "Subscribed User"
          : "Discovery Mode"
      );
    } else {
      console.error("❌ Failed to load dashboard:", result.error);
    }

    return result;
  }

  async pauseSubscription(reason) {
    await this.getStoredToken();
    return await this.request("/auth/subscription/pause", {
      method: "POST",
      body: { reason },
    });
  }

  async resumeSubscription() {
    await this.getStoredToken();
    return await this.request("/auth/subscription/resume", {
      method: "POST",
    });
  }

  async getDeliveryTracking(orderId) {
    await this.getStoredToken();
    return await this.request(`/auth/delivery/track/${orderId}`);
  }

  async getDeliveryPrice(
    address,
    deliveryCount = 1,
    consolidatedDeliveries = false
  ) {
    await this.getStoredToken();
    const params = new URLSearchParams({
      address: address,
      deliveryCount: deliveryCount.toString(),
      consolidatedDeliveries: consolidatedDeliveries.toString(),
    });
    return await this.request(`/delivery/price?${params.toString()}`);
  }

  // Meal plans methods - real data only
  async getMealPlans(forceRefresh = false) {
    console.log(
      "🔄 Fetching meal plans from backend...",
      forceRefresh ? "(forced refresh)" : ""
    );
    console.log("🌐 API URL:", `${this.baseURL}/mealplans`);

    // Test backend health first
    const isHealthy = await this.checkBackendHealth();
    console.log("🏥 Backend health check:", isHealthy ? "PASS" : "FAIL");

    // Add cache-busting parameter if force refresh
    const endpoint = forceRefresh
      ? `/mealplans?_t=${Date.now()}`
      : "/mealplans";
    const result = await this.cachedRequest(endpoint, "mealPlans", {
      forceRefresh,
      headers: forceRefresh ? { "Cache-Control": "no-cache" } : {},
    });

    if (result.success) {
      // Ensure result.data is the backend response and extract the data field
      const backendResponse = result.data;
      const mealPlansData = Array.isArray(backendResponse?.data)
        ? backendResponse.data
        : [];

      console.log(`✅ Successfully loaded ${mealPlansData.length} meal plans`);
      console.log(
        "📋 Meal plan names:",
        mealPlansData.map((mp) => mp.planName).join(", ")
      );

      // Return in consistent format
      return {
        success: true,
        data: mealPlansData,
        count: mealPlansData.length,
      };
    } else {
      console.error("❌ Failed to load meal plans:", result.error);
      // Return empty array on error
      return {
        success: false,
        data: [],
        error: result.error,
      };
    }
  }

  async getPopularMealPlans(forceRefresh = false) {
    console.log(
      "🔄 Fetching popular meal plans from backend...",
      forceRefresh ? "(forced refresh)" : ""
    );

    // Add cache-busting parameter if force refresh
    const endpoint = forceRefresh
      ? `/mealplans/popular?_t=${Date.now()}`
      : "/mealplans/popular";
    const result = await this.request(endpoint, {
      headers: forceRefresh ? { "Cache-Control": "no-cache" } : {},
    });

    if (result.success) {
      const backendResponse = result.data;
      const popularPlansData = Array.isArray(backendResponse?.data)
        ? backendResponse.data
        : [];

      console.log(
        `✅ Successfully loaded ${popularPlansData.length} popular meal plans`
      );
      return {
        success: true,
        data: popularPlansData,
        count: popularPlansData.length,
      };
    } else {
      console.error("❌ Failed to load popular meal plans:", result.error);
      return {
        success: false,
        data: [],
        error: result.error,
      };
    }
  }

  async getMealPlanById(id) {
    const result = await this.request(`/mealplans/${id}`);

    if (result.success) {
      // Ensure result.data is the backend response and extract the data field
      const backendResponse = result.data;
      const mealPlanData = backendResponse?.data || backendResponse;


      // Return in consistent format
      return {
        success: true,
        data: mealPlanData,
      };
    } else {
      console.error("❌ Failed to load meal plan details:", result.error);
      return {
        success: false,
        data: null,
        error: result.error,
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
        message: "Meal plan details retrieved successfully",
      };
    } else {
      return {
        success: false,
        mealPlan: null,
        message: result.error || "Failed to retrieve meal plan details",
      };
    }
  }

  // Get meal plan customization options
  async getMealCustomization(mealPlanId) {
    await this.getStoredToken();
    const result = await this.request(`/mealplans/${mealPlanId}/customization`);

    if (result.success) {
      console.log("✅ Successfully loaded meal customization options");
      return result;
    } else {
      console.error("❌ Failed to load meal customization:", result.error);
      return {
        success: false,
        data: null,
        error: result.error || "Failed to retrieve meal customization options",
      };
    }
  }

  // Get available meals for customization
  async getAvailableMeals(filters = {}) {
    const queryParams = new URLSearchParams();
    if (filters.mealType) queryParams.append("mealType", filters.mealType);
    if (filters.dietaryPreferences)
      queryParams.append(
        "dietaryPreferences",
        filters.dietaryPreferences.join(",")
      );
    if (filters.excludeIngredients)
      queryParams.append(
        "excludeIngredients",
        filters.excludeIngredients.join(",")
      );

    const url = `/mealplans/meals/available${
      queryParams.toString() ? "?" + queryParams.toString() : ""
    }`;
    const result = await this.request(url);

    if (result.success) {
      console.log(
        `✅ Successfully loaded ${result.data?.length || 0} available meals`
      );
    } else {
      console.error("❌ Failed to load available meals:", result.error);
    }

    return result;
  }

  // Orders methods
  async createOrder(orderData) {
    await this.getStoredToken();
    return await this.request("/orders", {
      method: "POST",
      body: orderData,
    });
  }

  async getUserOrders(forceRefresh = false) {
    await this.getStoredToken();
    const result = await this.cachedRequest("/orders", "userOrders", {
      forceRefresh,
    });

    return result;
  }

  // Clear orders cache when order status changes
  async clearOrdersCache() {
    await this.clearCache("userOrders");
    console.log("🗑️ Orders cache cleared due to status change");
  }

  // Update order status and clear cache
  async updateOrderStatus(orderId, status) {
    await this.getStoredToken();
    const result = await this.request(`/orders/${orderId}/status`, {
      method: "PUT",
      body: { status },
    });

    // Clear cache to ensure fresh data on next fetch
    if (result.success) {
      await this.clearOrdersCache();
    }

    return result;
  }

  async getOrderById(id) {
    await this.getStoredToken();
    return this.request(`/orders/${id}`);
  }

  // Get detailed order information (real-time)
  async getOrderDetails(id) {
    console.log(`🔍 Fetching detailed order for ID: ${id}`);
    const result = await this.getOrderById(id);

    // Match the expected return format similar to MealPlanDetailScreen
    if (result.success) {
      return {
        success: true,
        order: result.data,
        message: "Order details retrieved successfully",
      };
    } else {
      return {
        success: false,
        order: null,
        message: result.error || "Failed to retrieve order details",
      };
    }
  }

  async cancelOrder(orderId) {
    await this.getStoredToken();
    return this.request(`/orders/${orderId}/cancel`, {
      method: "PUT",
    });
  }

  // Subscriptions methods
  async createSubscription(subscriptionData) {
    await this.getStoredToken();
    return this.request("/subscriptions", {
      method: "POST",
      body: subscriptionData,
    });
  }

  async getUserSubscriptions() {
    await this.getStoredToken();
    return await this.cachedRequest("/subscriptions", "userSubscriptions");
  }

  async getSubscriptionById(id) {
    await this.getStoredToken();
    return this.request(`/subscriptions/${id}`);
  }

  // Alias for compatibility with SubscriptionCard
  async getSubscription(id) {
    return this.getSubscriptionById(id);
  }

  async updateSubscription(id, updates) {
    console.log(
      "API updateSubscription called with ID:",
      id,
      "Updates:",
      updates
    );
    await this.getStoredToken();
    return this.request(`/subscriptions/${id}`, {
      method: "PUT",
      body: updates,
    });
  }

  async cancelSubscription(id) {
    await this.getStoredToken();
    return this.request(`/subscriptions/${id}/cancel`, {
      method: "PUT",
    });
  }

  // Payment methods
  async initializePayment(paymentData) {
    await this.getStoredToken();
    return this.request("/payments/initialize", {
      method: "POST",
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
    return this.request("/auth/push-token", {
      method: "POST",
      body: { token, userId, platform: "expo" },
    });
  }

  async markNotificationAsRead(notificationId) {
    await this.getStoredToken();
    return this.request(`/notifications/${notificationId}/read`, {
      method: "PUT",
    });
  }

  async markAllNotificationsAsRead() {
    await this.getStoredToken();
    return this.request("/notifications/mark-all-read", {
      method: "PUT",
    });
  }

  async deleteNotification(notificationId) {
    await this.getStoredToken();
    return this.request(`/notifications/${notificationId}`, {
      method: "DELETE",
    });
  }

  // Dashboard batched API call - combines multiple endpoints for better performance
  async getDashboardData(forceRefresh = false) {
    const endpoint = forceRefresh
      ? `/dashboard?_t=${Date.now()}`
      : "/dashboard";

    return await this.cachedRequest(endpoint, "dashboard", {
      forceRefresh,
      headers: forceRefresh ? { "Cache-Control": "no-cache" } : {},
    });
  }

  // Public dashboard data (no authentication required)
  async getPublicDashboardData(forceRefresh = false) {
    const endpoint = forceRefresh
      ? `/dashboard/public?_t=${Date.now()}`
      : "/dashboard/public";

    return await this.cachedRequest(endpoint, "publicDashboard", {
      forceRefresh,
      headers: forceRefresh ? { "Cache-Control": "no-cache" } : {},
    });
  }

  // User-specific dashboard data (requires authentication)
  async getUserDashboardData(forceRefresh = false) {
    // Use the auth/dashboard endpoint instead of dashboard/user since it's working
    await this.getStoredToken();
    console.log("🔄 Fetching user dashboard data...");

    // Add cache-busting parameter if force refresh
    const endpoint = forceRefresh
      ? `/auth/dashboard?_t=${Date.now()}`
      : "/auth/dashboard";
    const result = await this.request(endpoint, {
      headers: forceRefresh ? { "Cache-Control": "no-cache" } : {},
    });

    if (result.success) {
      console.log("✅ User dashboard data loaded successfully");

      // Handle both single subscription object and subscriptions array
      const orders = result.data?.recentOrders || result.data?.orders || [];
      let subscriptions = result.data?.subscriptions || [];

      // If there's a single subscription object, convert to array
      if (result.data?.subscription && !subscriptions.length) {
        subscriptions = [result.data.subscription];
        console.log("📋 Converted single subscription to array:", {
          subscriptionId: result.data.subscription.id,
          planName: result.data.subscription.planName,
          status: result.data.subscription.status,
        });
      }

      // Transform the response to match expected format
      return {
        success: true,
        data: {
          orders: orders,
          subscriptions: subscriptions,
          subscription: result.data?.subscription, // Also include the original single object
          timestamp: new Date().toISOString(),
        },
      };
    } else {
      console.error("❌ Failed to load user dashboard data:", result.error);
    }

    return result;
  }

  // Banners and promotions methods
  async getActiveBanners(forceRefresh = false) {
    // Add cache-busting parameter if force refresh
    const endpoint = forceRefresh
      ? `/banners/active?_t=${Date.now()}`
      : "/banners/active";
    const result = await this.request(endpoint, {
      headers: forceRefresh ? { "Cache-Control": "no-cache" } : {},
    });

    return result;
  }

  async trackBannerImpression(bannerId) {
    try {
      // Respect user's privacy settings (cached locally) if present
      const cached = await AsyncStorage.getItem("privacy_settings");
      if (cached) {
        const settings = JSON.parse(cached);
        if (!settings?.allowDataCollection) {
          console.log(
            "Analytics disabled by user: skipping trackBannerImpression"
          );
          return {
            success: false,
            skipped: true,
            reason: "data_collection_disabled",
          };
        }
      }
    } catch (err) {
      // If reading cache fails, continue and try to send the event (fail-open)
      console.warn(
        "Could not read privacy settings before tracking banner impression:",
        err.message
      );
    }

    return this.request(`/banners/${bannerId}/impression`, {
      method: "POST",
    });
  }

  async trackBannerClick(bannerId) {
    return this.request(`/banners/${bannerId}/click`, {
      method: "POST",
    });
  }

  async getPromotions() {
    return this.request("/promotions/active");
  }

  // Delivery tracking methods
  async getDeliveryTracking(trackingId) {
    await this.getStoredToken();
    return this.request(`/delivery/tracking/${trackingId}`);
  }

  async updateDeliveryLocation(trackingId, location) {
    await this.getStoredToken();
    return this.request(`/delivery/tracking/${trackingId}/location`, {
      method: "PUT",
      body: location,
    });
  }

  async rateDelivery(trackingId, rating, feedback = "") {
    await this.getStoredToken();
    return this.request(`/delivery/tracking/${trackingId}/rate`, {
      method: "POST",
      body: { rating, feedback },
    });
  }

  // User analytics and statistics
  async getUserAnalytics() {
    await this.getStoredToken();
    return this.request("/users/analytics");
  }

  async getUserOrderStats() {
    await this.getStoredToken();
    return this.request("/users/stats/orders");
  }

  async getUserNutritionScore() {
    await this.getStoredToken();
    return this.request("/users/stats/nutrition");
  }

  // Activity logging
  async logUserActivity(activityData) {
    await this.getStoredToken();

    try {
      // Respect user's privacy settings (cached locally) if present
      const cached = await AsyncStorage.getItem("privacy_settings");
      if (cached) {
        const settings = JSON.parse(cached);
        if (!settings?.allowDataCollection) {
          console.log("Analytics disabled by user: skipping logUserActivity");
          return {
            success: false,
            skipped: true,
            reason: "data_collection_disabled",
          };
        }
      }
    } catch (err) {
      // If reading cache fails, continue and try to send the event (fail-open)
      console.warn(
        "Could not read privacy settings before logging user activity:",
        err.message
      );
    }

    return this.request("/auth/activity/log", {
      method: "POST",
      body: activityData,
    });
  }

  // Achievement system
  async checkAchievements() {
    await this.getStoredToken();
    return this.request("/users/achievements/check", {
      method: "POST",
    });
  }

  async claimAchievement(achievementId) {
    await this.getStoredToken();
    return this.request(`/users/achievements/${achievementId}/claim`, {
      method: "POST",
    });
  }

  async getAvailableAchievements() {
    return this.request("/achievements/available");
  }

  // ============= NEW FILTERING AND SEARCH METHODS =============

  // Get filtered meal plans with advanced filtering
  async getFilteredMealPlans(filters = {}) {
    console.log("🔄 Fetching filtered meal plans...", filters);

    const queryParams = new URLSearchParams();

    // Add audience filters
    if (filters.audiences && filters.audiences.length > 0) {
      filters.audiences.forEach((audience) => {
        queryParams.append("audience", audience);
      });
    }

    // Add price range
    if (filters.minPrice !== undefined)
      queryParams.append("minPrice", filters.minPrice);
    if (filters.maxPrice !== undefined)
      queryParams.append("maxPrice", filters.maxPrice);

    // Add duration filter
    if (filters.duration) queryParams.append("duration", filters.duration);

    // Add sorting
    if (filters.sortBy) queryParams.append("sortBy", filters.sortBy);

    // Add pagination
    if (filters.page) queryParams.append("page", filters.page);
    if (filters.limit) queryParams.append("limit", filters.limit);

    const url = `/mealplans/filtered${
      queryParams.toString() ? "?" + queryParams.toString() : ""
    }`;
    const result = await this.request(url);

    if (result.success) {
      const backendResponse = result.data;
      const mealPlansData = Array.isArray(backendResponse?.data)
        ? backendResponse.data
        : [];

      console.log(
        `✅ Successfully loaded ${mealPlansData.length} filtered meal plans`
      );

      return {
        success: true,
        data: mealPlansData,
        pagination: backendResponse?.pagination || {},
        count: mealPlansData.length,
      };
    } else {
      console.error("❌ Failed to load filtered meal plans:", result.error);
      return {
        success: false,
        data: [],
        error: result.error,
      };
    }
  }

  // Enhanced search with filtering
  async searchMealPlans(query, filters = {}) {
    console.log("🔍 Searching meal plans...", { query, filters });

    const queryParams = new URLSearchParams();

    // Add search query
    if (query && query.trim()) queryParams.append("query", query.trim());

    // Add audience filters
    if (filters.audiences && filters.audiences.length > 0) {
      filters.audiences.forEach((audience) => {
        queryParams.append("audience", audience);
      });
    }

    // Add price range
    if (filters.minPrice !== undefined)
      queryParams.append("minPrice", filters.minPrice);
    if (filters.maxPrice !== undefined)
      queryParams.append("maxPrice", filters.maxPrice);

    // Add sorting
    if (filters.sortBy) queryParams.append("sortBy", filters.sortBy);

    // Add pagination
    if (filters.page) queryParams.append("page", filters.page);
    if (filters.limit) queryParams.append("limit", filters.limit);

    const url = `/mealplans/search${
      queryParams.toString() ? "?" + queryParams.toString() : ""
    }`;
    const result = await this.request(url);

    if (result.success) {
      const backendResponse = result.data;
      const searchResults = Array.isArray(backendResponse?.data)
        ? backendResponse.data
        : [];

      console.log(`✅ Search returned ${searchResults.length} results`);

      return {
        success: true,
        data: searchResults,
        searchQuery: backendResponse?.searchQuery || query,
        pagination: backendResponse?.pagination || {},
        count: searchResults.length,
      };
    } else {
      console.error("❌ Search failed:", result.error);

      // Fallback to local filtering if available
      if (this.fallbackMealPlans && this.fallbackMealPlans.length > 0) {
        console.log("🔄 Falling back to local search...");
        return this.searchMealPlansLocally(query, filters);
      }

      return {
        success: false,
        data: [],
        error: result.error,
      };
    }
  }

  // Get available target audiences
  async getTargetAudiences() {
    console.log("🔄 Fetching target audiences...");

    const result = await this.request("/mealplans/audiences");

    if (result.success) {
      const backendResponse = result.data;
      const audiencesData = Array.isArray(backendResponse?.data)
        ? backendResponse.data
        : [];

      console.log(
        `✅ Successfully loaded ${audiencesData.length} target audiences`
      );

      return {
        success: true,
        data: audiencesData,
        count: audiencesData.length,
      };
    } else {
      console.error("❌ Failed to load target audiences:", result.error);

      // Fallback to default audiences
      const defaultAudiences = [
        {
          name: "Fitness",
          count: 0,
          displayName: "Fitness",
          description: "High-protein meals for active lifestyles",
        },
        {
          name: "Family",
          count: 0,
          displayName: "Family",
          description: "Nutritious meals perfect for families",
        },
        {
          name: "Professional",
          count: 0,
          displayName: "Professional",
          description: "Quick, convenient meals for busy professionals",
        },
        {
          name: "Wellness",
          count: 0,
          displayName: "Wellness",
          description: "Balanced meals focused on overall health",
        },
        {
          name: "Weight Loss",
          count: 0,
          displayName: "Weight Loss",
          description: "Calorie-controlled meals for weight management",
        },
        {
          name: "Muscle Gain",
          count: 0,
          displayName: "Muscle Gain",
          description: "High-protein, high-calorie meals for muscle building",
        },
        {
          name: "Diabetic Friendly",
          count: 0,
          displayName: "Diabetic Friendly",
          description: "Low-sugar, diabetes-friendly meal options",
        },
        {
          name: "Heart Healthy",
          count: 0,
          displayName: "Heart Healthy",
          description: "Heart-healthy meals with reduced sodium",
        },
      ];

      return {
        success: true,
        data: defaultAudiences,
        count: defaultAudiences.length,
      };
    }
  }

  // Local search fallback method
  searchMealPlansLocally(query, filters = {}) {
    if (!this.fallbackMealPlans) {
      return { success: false, data: [], error: "No local data available" };
    }

    let results = [...this.fallbackMealPlans];

    // Filter by search query
    if (query && query.trim()) {
      const searchTerm = query.toLowerCase();
      results = results.filter(
        (plan) =>
          plan.planName?.toLowerCase().includes(searchTerm) ||
          plan.description?.toLowerCase().includes(searchTerm) ||
          plan.targetAudience?.toLowerCase().includes(searchTerm) ||
          (plan.planFeatures &&
            plan.planFeatures.some((feature) =>
              feature.toLowerCase().includes(searchTerm)
            ))
      );
    }

    // Filter by audiences
    if (filters.audiences && filters.audiences.length > 0) {
      results = results.filter((plan) =>
        filters.audiences.includes(plan.targetAudience)
      );
    }

    // Filter by price range
    if (filters.minPrice !== undefined || filters.maxPrice !== undefined) {
      results = results.filter((plan) => {
        const price = plan.totalPrice || plan.basePrice || 0;
        return (
          (filters.minPrice === undefined || price >= filters.minPrice) &&
          (filters.maxPrice === undefined || price <= filters.maxPrice)
        );
      });
    }

    // Sort results
    if (filters.sortBy) {
      switch (filters.sortBy) {
        case "price-low":
          results.sort(
            (a, b) =>
              (a.totalPrice || a.basePrice || 0) -
              (b.totalPrice || b.basePrice || 0)
          );
          break;
        case "price-high":
          results.sort(
            (a, b) =>
              (b.totalPrice || b.basePrice || 0) -
              (a.totalPrice || a.basePrice || 0)
          );
          break;
        case "newest":
          results.sort(
            (a, b) =>
              new Date(b.createdDate || b.createdAt) -
              new Date(a.createdDate || a.createdAt)
          );
          break;
        case "rating":
          results.sort((a, b) => (b.avgRating || 0) - (a.avgRating || 0));
          break;
        default: // popularity
          results.sort(
            (a, b) => (b.totalSubscriptions || 0) - (a.totalSubscriptions || 0)
          );
      }
    }

    console.log(`🔍 Local search returned ${results.length} results`);

    return {
      success: true,
      data: results,
      searchQuery: query,
      count: results.length,
      isLocalSearch: true,
    };
  }

  // Store meal plans for local fallback
  storeFallbackMealPlans(mealPlans) {
    this.fallbackMealPlans = mealPlans;
    console.log(
      `💾 Stored ${mealPlans.length} meal plans for offline fallback`
    );
  }

  // Get popular search terms
  async getPopularSearches() {
    return this.request("/search/popular");
  }

  // Bookmark/Favorites methods
  async getUserBookmarks() {
    await this.getStoredToken();
    return this.request("/users/bookmarks");
  }

  async addBookmark(itemId, itemType = "mealplan") {
    await this.getStoredToken();
    return this.request("/users/bookmarks", {
      method: "POST",
      body: { itemId, itemType },
    });
  }

  async removeBookmark(itemId) {
    await this.getStoredToken();
    return this.request(`/users/bookmarks/${itemId}`, {
      method: "DELETE",
    });
  }

  // Settings and preferences
  async getUserSettings() {
    await this.getStoredToken();
    return this.request("/users/settings");
  }

  async updateUserSettings(settings) {
    await this.getStoredToken();
    return this.request("/users/settings", {
      method: "PUT",
      body: settings,
    });
  }

  // Privacy and security settings
  async getPrivacySettings() {
    await this.getStoredToken();
    return this.request("/users/privacy-settings");
  }

  async updatePrivacySettings(settings) {
    await this.getStoredToken();
    return this.request("/users/privacy-settings", {
      method: "PUT",
      body: settings,
    });
  }

  async requestDataExport() {
    await this.getStoredToken();
    return this.request("/users/data-export", {
      method: "POST",
    });
  }

  // Reviews and ratings
  async submitReview(itemId, itemType, rating, review) {
    await this.getStoredToken();
    return this.request("/reviews", {
      method: "POST",
      body: { itemId, itemType, rating, review },
    });
  }

  async getReviews(itemId, itemType) {
    return this.request(`/reviews/${itemType}/${itemId}`);
  }

  // Support and help
  async submitSupportTicket(subject, message, category = "general") {
    await this.getStoredToken();
    return this.request("/support/tickets", {
      method: "POST",
      body: { subject, message, category },
    });
  }

  async getSupportTickets() {
    await this.getStoredToken();
    return this.request("/support/tickets");
  }

  async getFAQs() {
    return this.request("/support/faqs");
  }

  // Subscription options and plans
  async getSubscriptionOptions() {
    return this.request("/subscription-plans");
  }

  async getSubscriptionPlans() {
    return this.request("/subscription-plans/available");
  }

  // Notification API methods
  async getUserNotifications() {
    console.log("🔔 Fetching user notifications");
    await this.getStoredToken();

    const result = await this.request("/notifications");

    if (result.success) {
      console.log("✅ Notifications fetched successfully");
    } else {
      console.error("❌ Failed to fetch notifications:", result.error);
    }

    return result;
  }

  async registerPushToken(token, userId) {
    console.log("📱 Registering push token for user:", userId);
    await this.getStoredToken();

    const result = await this.request("/notifications/register-token", {
      method: "POST",
      body: { token, userId },
    });

    if (result.success) {
      console.log("✅ Push token registered successfully");
    } else {
      console.error("❌ Failed to register push token:", result.error);
    }

    return result;
  }

  async markNotificationAsRead(notificationId) {
    console.log("✅ Marking notification as read:", notificationId);
    await this.getStoredToken();

    const result = await this.request(`/notifications/${notificationId}/read`, {
      method: "PUT",
    });

    if (result.success) {
      console.log("✅ Notification marked as read");
    } else {
      console.error("❌ Failed to mark notification as read:", result.error);
    }

    return result;
  }

  async markAllNotificationsAsRead() {
    console.log("✅ Marking all notifications as read");
    await this.getStoredToken();

    const result = await this.request("/notifications/mark-all-read", {
      method: "PUT",
    });

    if (result.success) {
      console.log("✅ All notifications marked as read");
    } else {
      console.error(
        "❌ Failed to mark all notifications as read:",
        result.error
      );
    }

    return result;
  }

  async deleteNotification(notificationId) {
    console.log("🗑️ Deleting notification:", notificationId);
    await this.getStoredToken();

    const result = await this.request(`/notifications/${notificationId}`, {
      method: "DELETE",
    });

    if (result.success) {
      console.log("✅ Notification deleted");
    } else {
      console.error("❌ Failed to delete notification:", result.error);
    }

    return result;
  }

  async createNotification(notificationData) {
    await this.getStoredToken();
    return this.request("/notifications", {
      method: "POST",
      body: notificationData,
    });
  }

  async createAdminNotification(notificationData) {
    await this.getStoredToken();
    return this.request("/admin/notifications", {
      method: "POST",
      body: notificationData,
    });
  }

  async createChefNotification(notificationData) {
    await this.getStoredToken();
    return this.request("/chef/notifications", {
      method: "POST",
      body: notificationData,
    });
  }

  // Save meal customization
  async saveMealCustomization(customizationData) {
    console.log("💾 Saving meal customization:", customizationData);
    await this.getStoredToken();

    const result = await this.request("/mealplans/customization", {
      method: "POST",
      body: customizationData,
    });

    if (result.success) {
      console.log("✅ Meal customization saved successfully");
    } else {
      console.error("❌ Failed to save meal customization:", result.error);
    }

    return result;
  }

  // Update user profile
  async updateProfile(profileData) {
    console.log(
      "👤 Updating user profile:",
      JSON.stringify(profileData, null, 2)
    );
    await this.getStoredToken();

    // Ensure we have the correct data structure that matches backend expectations
    const sanitizedData = {
      fullName: profileData.fullName,
      address: profileData.address || "",
      city: profileData.city || "",
      dietaryPreferences: profileData.dietaryPreferences || [],
      allergies: profileData.allergies || "",
      ...(profileData.profileImage !== undefined && {
        profileImage: profileData.profileImage,
      }),
      // Include IDs if provided (some backends require them)
      ...(profileData.id && { id: profileData.id }),
      ...(profileData.customerId && { customerId: profileData.customerId }),
    };

    // Only include phone if it's a valid phone number (not empty string)
    if (profileData.phone && profileData.phone.trim().length > 0) {
      // Basic phone validation - must contain digits and be at least 10 characters
      const phoneDigits = profileData.phone.replace(/\D/g, "");
      if (phoneDigits.length >= 10) {
        sanitizedData.phone = profileData.phone;
      }
    }

    console.log(
      "📤 Sending sanitized profile data:",
      JSON.stringify(sanitizedData, null, 2)
    );

    const result = await this.request("/auth/profile", {
      method: "PUT",
      body: sanitizedData,
    });

    if (result.success) {
      console.log("✅ Profile updated successfully");
    } else {
      console.error("❌ Failed to update profile:", result.error);
      console.error("❌ Response details:", JSON.stringify(result, null, 2));
      console.error("❌ Full response status:", result.status);
      console.error("❌ Full response data:", result.data);
    }

    return result;
  }

  // Get user profile
  async getProfile() {
    console.log("👤 Fetching user profile");
    await this.getStoredToken();

    const result = await this.request("/auth/profile");

    if (result.success) {
      console.log("✅ Profile fetched successfully");
    } else {
      console.error("❌ Failed to fetch profile:", result.error);
    }

    return result;
  }

  // Get user stats
  async getUserStats() {
    console.log("📊 Fetching user stats");
    await this.getStoredToken();

    const result = await this.request("/auth/profile/stats");

    if (result.success) {
      console.log("✅ User stats fetched successfully");
    } else {
      console.error("❌ Failed to fetch user stats:", result.error);
    }

    return result;
  }

  // Get user activity
  async getUserActivity() {
    console.log("📋 Fetching user activity");
    await this.getStoredToken();

    const result = await this.request("/auth/profile/activity");

    if (result.success) {
      console.log("✅ User activity fetched successfully");
    } else {
      console.error("❌ Failed to fetch user activity:", result.error);
    }

    return result;
  }

  // Get user achievements
  async getUserAchievements() {
    console.log("🏆 Fetching user achievements");
    await this.getStoredToken();

    const result = await this.request("/auth/profile/achievements");

    if (result.success) {
      console.log("✅ User achievements fetched successfully");
    } else {
      console.error("❌ Failed to fetch user achievements:", result.error);
    }

    return result;
  }

  // Get user subscriptions
  async getUserSubscriptions() {
    console.log("📋 Fetching user subscriptions");
    await this.getStoredToken();

    // Debug: Check if token is properly set
    console.log("🔍 Debug - Token status before request:", {
      hasToken: !!this.token,
      tokenLength: this.token ? this.token.length : 0,
      tokenPreview: this.token ? this.token.substring(0, 20) + "..." : "none",
    });

    const result = await this.request("/auth/dashboard");

    if (result.success) {
      console.log("✅ User subscriptions fetched successfully");
      // Extract subscriptions from dashboard data
      return {
        success: true,
        data: result.data?.subscriptions || [],
      };
    } else {
      console.error("❌ Failed to fetch user subscriptions:", result.error);
    }

    return result;
  }

  // Get notification preferences
  async getNotificationPreferences() {
    console.log("🔔 Fetching notification preferences");
    await this.getStoredToken();

    const result = await this.request("/auth/profile/notifications");

    if (result.success) {
      console.log("✅ Notification preferences fetched successfully");
    } else {
      console.error(
        "❌ Failed to fetch notification preferences:",
        result.error
      );
    }

    return result;
  }

  // Update notification preferences
  async updateNotificationPreferences(preferences) {
    console.log("🔔 Updating notification preferences");
    await this.getStoredToken();

    const result = await this.request("/auth/profile/notifications", {
      method: "PUT",
      body: preferences,
    });

    if (result.success) {
      console.log("✅ Notification preferences updated successfully");
    } else {
      console.error(
        "❌ Failed to update notification preferences:",
        result.error
      );
    }

    return result;
  }

  // Get popular searches
  async getPopularSearches() {
    console.log("🔍 Fetching popular searches");

    const result = await this.request("/search/popular");

    if (result.success) {
      console.log("✅ Popular searches fetched successfully");
    } else {
      console.error("❌ Failed to fetch popular searches:", result.error);
    }

    return result;
  }

  // Sync pending data for offline functionality
  async syncPendingData() {
    try {
      // This is a placeholder for offline sync functionality
      // In a full implementation, this would sync any pending offline data
      console.log("🔄 Syncing pending data...");

      // For now, just return success
      return { success: true, message: "No pending data to sync" };
    } catch (error) {
      console.error("Sync pending data error:", error);
      return { success: false, error: error.message };
    }
  }

  // ==================== DISCOUNT SYSTEM METHODS ====================

  // Get discount rules for a specific meal plan
  async getMealPlanDiscountRules(mealPlanId) {
    console.log("💰 Fetching meal plan discount rules for:", mealPlanId);
    await this.getStoredToken();

    const result = await this.request(
      `/meal-plans/${mealPlanId}/discount-rules`
    );

    if (result.success) {
      console.log("✅ Meal plan discount rules fetched successfully");
    } else {
      console.error(
        "❌ Failed to fetch meal plan discount rules:",
        result.error
      );
    }

    return result;
  }

  // Get global discount rules
  async getGlobalDiscountRules() {
    console.log("💰 Fetching global discount rules");
    await this.getStoredToken();

    const result = await this.request("/discount-rules/global");

    if (result.success) {
      console.log("✅ Global discount rules fetched successfully");
    } else {
      console.error("❌ Failed to fetch global discount rules:", result.error);
    }

    return result;
  }

  // Get user activity data for discount calculation
  async getUserActivity(userId) {
    console.log("📊 Fetching user activity for discount calculation:", userId);
    await this.getStoredToken();

    const result = await this.request(`/users/${userId}/activity`);

    if (result.success) {
      console.log("✅ User activity fetched successfully");

      // Enhance the activity data with calculated fields
      const activityData = result.data;
      const now = new Date();

      if (activityData.lastOrderDate) {
        const lastOrder = new Date(activityData.lastOrderDate);
        const daysDiff = Math.floor((now - lastOrder) / (1000 * 60 * 60 * 24));
        activityData.daysSinceLastOrder = daysDiff;
        activityData.monthsSinceLastOrder = Math.floor(daysDiff / 30);
      }

      if (activityData.registrationDate) {
        const registration = new Date(activityData.registrationDate);
        const daysDiff = Math.floor(
          (now - registration) / (1000 * 60 * 60 * 24)
        );
        activityData.daysSinceRegistration = daysDiff;
      }

      // Determine if user is consistent (has ordered at least once every 2 months)
      activityData.isConsistentUser =
        activityData.totalOrders >= 3 && activityData.monthsSinceLastOrder <= 2;

      result.data = activityData;
    } else {
      console.error("❌ Failed to fetch user activity:", result.error);
    }

    return result;
  }

  // Calculate discount for user and meal plan
  async calculateUserDiscount(userId, mealPlanId) {
    console.log(
      "🧮 Calculating discount for user:",
      userId,
      "meal plan:",
      mealPlanId
    );
    await this.getStoredToken();

    const result = await this.request("/discounts/calculate", {
      method: "POST",
      body: { userId, mealPlanId },
    });

    if (result.success) {
      console.log("✅ Discount calculated successfully:", result.data);
    } else {
      console.error("❌ Failed to calculate discount:", result.error);
    }

    return result;
  }

  // ==================== ADMIN DISCOUNT MANAGEMENT ====================

  // Create discount rule (Admin only)
  async createDiscountRule(discountRuleData) {
    console.log("➕ Creating discount rule");
    await this.getStoredToken();

    const result = await this.request("/admin/discount-rules", {
      method: "POST",
      body: discountRuleData,
    });

    if (result.success) {
      console.log("✅ Discount rule created successfully");
    } else {
      console.error("❌ Failed to create discount rule:", result.error);
    }

    return result;
  }

  // Update discount rule (Admin only)
  async updateDiscountRule(ruleId, discountRuleData) {
    console.log("📝 Updating discount rule:", ruleId);
    await this.getStoredToken();

    const result = await this.request(`/admin/discount-rules/${ruleId}`, {
      method: "PUT",
      body: discountRuleData,
    });

    if (result.success) {
      console.log("✅ Discount rule updated successfully");
    } else {
      console.error("❌ Failed to update discount rule:", result.error);
    }

    return result;
  }

  // Get all discount rules (Admin only)
  async getAllDiscountRules() {
    console.log("📋 Fetching all discount rules");
    await this.getStoredToken();

    const result = await this.request("/admin/discount-rules");

    if (result.success) {
      console.log("✅ All discount rules fetched successfully");
    } else {
      console.error("❌ Failed to fetch discount rules:", result.error);
    }

    return result;
  }

  // Delete discount rule (Admin only)
  async deleteDiscountRule(ruleId) {
    console.log("🗑️ Deleting discount rule:", ruleId);
    await this.getStoredToken();

    const result = await this.request(`/admin/discount-rules/${ruleId}`, {
      method: "DELETE",
    });

    if (result.success) {
      console.log("✅ Discount rule deleted successfully");
    } else {
      console.error("❌ Failed to delete discount rule:", result.error);
    }

    return result;
  }

  // Convenience HTTP methods
  async get(endpoint, options = {}) {
    await this.getStoredToken();
    return this.request(endpoint, { ...options, method: "GET" });
  }

  async post(endpoint, data, options = {}) {
    await this.getStoredToken();
    return this.request(endpoint, {
      ...options,
      method: "POST",
      body: data,
    });
  }

  async put(endpoint, data, options = {}) {
    await this.getStoredToken();
    return this.request(endpoint, {
      ...options,
      method: "PUT",
      body: data,
    });
  }

  async delete(endpoint, options = {}) {
    await this.getStoredToken();
    return this.request(endpoint, { ...options, method: "DELETE" });
  }

  // Get all meal plans for admin discount configuration
  async getAllMealPlansForAdmin() {
    console.log("📋 Fetching all meal plans for admin");
    await this.getStoredToken();

    const result = await this.request("/admin/meal-plans/list");

    if (result.success) {
      console.log("✅ All meal plans fetched successfully");
    } else {
      console.error("❌ Failed to fetch meal plans:", result.error);
    }

    return result;
  }

  // Get meal plan categories for filtering
  async getMealPlanCategories() {
    console.log("📂 Fetching meal plan categories");
    await this.getStoredToken();

    const result = await this.request("/meal-plans/categories");

    if (result.success) {
      console.log("✅ Meal plan categories fetched successfully");
    } else {
      console.error("❌ Failed to fetch categories:", result.error);
    }

    return result;
  }

  // Email Verification Methods

  // Send verification code to email
  async sendVerificationCode({ email, purpose = "customer_registration" }) {
    console.log("📧 Sending verification code to:", email, "for:", purpose);

    const result = await this.request("/auth/send-verification", {
      method: "POST",
      body: { email, purpose },
    });

    if (result.success) {
      console.log("✅ Verification code sent successfully");
    } else {
      console.error("❌ Failed to send verification code:", result.error);
    }

    return result;
  }

  // Verify email with code
  async verifyEmail({
    email,
    verificationCode,
    purpose = "customer_registration",
  }) {
    console.log("✅ Verifying email:", email, "with code:", verificationCode);

    const result = await this.request("/auth/verify-email", {
      method: "POST",
      body: { email, verificationCode, purpose },
    });

    if (result.success) {
      console.log("✅ Email verified successfully");
    } else {
      console.error("❌ Email verification failed:", result.error);
    }

    return result;
  }

  // Resend verification code
  async resendVerificationCode({ email, purpose = "customer_registration" }) {
    console.log("🔄 Resending verification code to:", email);

    const result = await this.request("/auth/resend-verification", {
      method: "POST",
      body: { email, purpose },
    });

    if (result.success) {
      console.log("✅ Verification code resent successfully");
    } else {
      console.error("❌ Failed to resend verification code:", result.error);
    }

    return result;
  }

  // Check verification status
  async checkVerificationStatus(email, purpose = "customer_registration") {
    console.log("🔍 Checking verification status for:", email);

    const result = await this.request(
      `/auth/verification-status/${encodeURIComponent(
        email
      )}?purpose=${purpose}`,
      {
        method: "GET",
      }
    );

    if (result.success) {
      console.log("✅ Verification status retrieved successfully");
    } else {
      console.error("❌ Failed to check verification status:", result.error);
    }

    return result;
  }

  // ==========================================
  // RECURRING DELIVERY API METHODS
  // ==========================================

  // Get current meal for subscription
  async getSubscriptionCurrentMeal(subscriptionId) {
    console.log("🍽️ Fetching current meal for subscription:", subscriptionId);
    await this.getStoredToken();
    return this.request(`/subscriptions/${subscriptionId}/current-meal`);
  }

  // Get chef preparation status for subscription
  async getSubscriptionChefStatus(subscriptionId) {
    console.log("👨‍🍳 Fetching chef status for subscription:", subscriptionId);
    await this.getStoredToken();
    return this.request(`/subscriptions/${subscriptionId}/chef-status`);
  }

  // Get next delivery information
  async getSubscriptionNextDelivery(subscriptionId) {
    console.log("🚚 Fetching next delivery for subscription:", subscriptionId);
    await this.getStoredToken();
    return this.request(`/subscriptions/${subscriptionId}/next-delivery`);
  }

  // Get meal progression timeline
  async getSubscriptionMealTimeline(subscriptionId, daysAhead = 7) {
    console.log("📅 Fetching meal timeline for subscription:", subscriptionId);
    await this.getStoredToken();
    return this.request(
      `/subscriptions/${subscriptionId}/meal-timeline?days=${daysAhead}`
    );
  }

  // Skip a meal delivery
  async skipMealDelivery(
    subscriptionId,
    skipDate,
    reason = "Customer request"
  ) {
    console.log("⏭️ Skipping meal delivery:", {
      subscriptionId,
      skipDate,
      reason,
    });
    await this.getStoredToken();
    return this.request(`/subscriptions/${subscriptionId}/skip-meal`, {
      method: "POST",
      body: { skipDate, reason },
    });
  }

  // Update subscription delivery preferences
  async updateDeliveryPreferences(subscriptionId, preferences) {
    console.log("⚙️ Updating delivery preferences:", subscriptionId);
    await this.getStoredToken();
    return this.request(
      `/subscriptions/${subscriptionId}/delivery-preferences`,
      {
        method: "PUT",
        body: preferences,
      }
    );
  }

  // Get subscription delivery history
  async getSubscriptionDeliveryHistory(subscriptionId, limit = 30) {
    console.log(
      "📜 Fetching delivery history for subscription:",
      subscriptionId
    );
    await this.getStoredToken();
    return this.request(
      `/subscriptions/${subscriptionId}/deliveries?limit=${limit}`
    );
  }

  // Request chef reassignment
  async requestChefReassignment(subscriptionId, reason) {
    console.log("🔄 Requesting chef reassignment:", { subscriptionId, reason });
    await this.getStoredToken();
    return this.request(`/subscriptions/${subscriptionId}/reassign-chef`, {
      method: "POST",
      body: { reason },
    });
  }

  // Rate completed delivery
  async rateDelivery(deliveryId, rating, feedback = "") {
    console.log("⭐ Rating delivery:", { deliveryId, rating });
    await this.getStoredToken();
    return this.request(`/deliveries/${deliveryId}/rate`, {
      method: "POST",
      body: { rating, feedback },
    });
  }

  // Maps and Geocoding services
  async reverseGeocode(latitude, longitude, language = "en") {
    console.log("🗺️ Reverse geocoding coordinates:", { latitude, longitude });
    const params = new URLSearchParams({
      lat: latitude.toString(),
      lng: longitude.toString(),
      language,
    });

    return this.request(`/maps/geocode/reverse?${params}`, {
      method: "GET",
    });
  }

  async placesAutocomplete(
    input,
    sessionToken = null,
    components = "country:ng",
    language = "en"
  ) {
    console.log("🔍 Places autocomplete for:", input);
    const params = new URLSearchParams({
      input,
      components,
      language,
    });

    if (sessionToken) {
      params.append("sessionToken", sessionToken);
    }

    return this.request(`/maps/places-autocomplete?${params}`, {
      method: "GET",
    });
  }

  async placeDetails(
    placeId,
    sessionToken = null,
    fields = "formatted_address,geometry,address_components,name,vicinity,types"
  ) {
    console.log("📍 Getting place details for:", placeId);
    const params = new URLSearchParams({
      placeId,
      fields,
    });

    if (sessionToken) {
      params.append("sessionToken", sessionToken);
    }

    return this.request(`/maps/place-details?${params}`, {
      method: "GET",
    });
  }
}

// Create and export a single instance
const apiService = new ApiService();
export default apiService;
export { apiService as api };
