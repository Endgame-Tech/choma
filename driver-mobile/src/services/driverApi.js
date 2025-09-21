// src/services/driverApi.js - Driver-specific API service
import AsyncStorage from "@react-native-async-storage/async-storage";
import { APP_CONFIG } from "../utils/constants";

// Base configuration for driver API
const DRIVER_API_BASE_URL = APP_CONFIG.API_BASE_URL;

class DriverApiService {
  constructor() {
    this.baseURL = DRIVER_API_BASE_URL;
    this.token = null;
    this.timeout = 30000; // 30 seconds
    this.retryAttempts = 3;
  }

  // Get authorization header
  async getAuthHeader() {
    if (!this.token) {
      this.token = await AsyncStorage.getItem('@driver_token');
    }
    return this.token ? { Authorization: `Bearer ${this.token}` } : {};
  }

  // Base request method
  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const authHeader = await this.getAuthHeader();

    const config = {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...authHeader,
        ...options.headers,
      },
      timeout: this.timeout,
      ...options,
    };

    if (config.body && typeof config.body === 'object') {
      config.body = JSON.stringify(config.body);
    }

    try {
      console.log(`🌐 Driver API Request: ${config.method} ${url}`);
      
      const response = await fetch(url, config);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || `HTTP ${response.status}`);
      }

      console.log(`✅ Driver API Response: ${config.method} ${endpoint}`);
      return data;
    } catch (error) {
      console.error(`❌ Driver API Error: ${config.method} ${endpoint}`, error.message);
      throw error;
    }
  }

  // Authentication methods
  async login(credentials) {
    return this.request('/auth/login', {
      method: 'POST',
      body: credentials,
    });
  }

  async register(driverData) {
    return this.request('/auth/register', {
      method: 'POST',
      body: driverData,
    });
  }

  async logout() {
    const result = await this.request('/auth/logout', {
      method: 'POST',
    });
    this.token = null;
    await AsyncStorage.removeItem('@driver_token');
    return result;
  }

  async refreshToken() {
    const refreshToken = await AsyncStorage.getItem('@driver_refresh_token');
    if (!refreshToken) throw new Error('No refresh token available');

    return this.request('/auth/refresh', {
      method: 'POST',
      body: { refreshToken },
    });
  }

  // Driver profile methods
  async getProfile() {
    return this.request('/profile');
  }

  async updateProfile(profileData) {
    return this.request('/profile', {
      method: 'PUT',
      body: profileData,
    });
  }

  async updateStatus(status) {
    return this.request('/status', {
      method: 'PUT',
      body: { status },
    });
  }

  async updateLocation(locationData) {
    return this.request('/location', {
      method: 'PUT',
      body: locationData,
    });
  }

  // Vehicle methods
  async getVehicleInfo() {
    return this.request('/vehicle');
  }

  async updateVehicleInfo(vehicleData) {
    return this.request('/vehicle', {
      method: 'PUT',
      body: vehicleData,
    });
  }

  // Delivery methods
  async getAvailableDeliveries() {
    return this.request('/assignments'); // Use existing assignments endpoint
  }

  async getActiveDeliveries() {
    return this.request('/assignments'); // Use same endpoint, filter client-side
  }

  async getDeliveryHistory(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    return this.request(`/history?${queryString}`); // Use existing history endpoint
  }

  async acceptDelivery(deliveryId) {
    return this.request(`/deliveries/${deliveryId}/accept`, {
      method: 'POST',
    });
  }

  async startDelivery(deliveryId) {
    return this.request(`/deliveries/${deliveryId}/start`, {
      method: 'POST',
    });
  }

  async completeDelivery(deliveryId, completionData) {
    return this.request(`/deliveries/${deliveryId}/complete`, {
      method: 'POST',
      body: completionData,
    });
  }

  async cancelDelivery(deliveryId, reason) {
    return this.request(`/deliveries/${deliveryId}/cancel`, {
      method: 'POST',
      body: { reason },
    });
  }

  async updateDeliveryStatus(deliveryId, status, additionalData = {}) {
    return this.request(`/deliveries/${deliveryId}/status`, {
      method: 'PUT',
      body: { status, ...additionalData },
    });
  }

  // Earnings methods - Use existing stats endpoint which provides earnings data
  async getEarnings(period = 'today') {
    return this.request(`/stats/daily?period=${period}`);
  }

  async getEarningsHistory(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    return this.request(`/history?${queryString}`);
  }

  async requestPayout(amount) {
    return this.request('/earnings/payout', {
      method: 'POST',
      body: { amount },
    });
  }

  // Document methods
  async uploadDocument(documentType, formData) {
    const authHeader = await this.getAuthHeader();
    
    return fetch(`${this.baseURL}/documents/upload`, {
      method: 'POST',
      headers: {
        ...authHeader,
        // Don't set Content-Type for FormData, let browser set it with boundary
      },
      body: formData,
    }).then(response => response.json());
  }

  async getDocuments() {
    return this.request('/documents');
  }

  async updateDocumentStatus(documentId, status) {
    return this.request(`/documents/${documentId}`, {
      method: 'PUT',
      body: { status },
    });
  }

  // Notification methods
  async getNotifications(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    return this.request(`/notifications?${queryString}`);
  }

  async markNotificationRead(notificationId) {
    return this.request(`/notifications/${notificationId}/read`, {
      method: 'PUT',
    });
  }

  async updateNotificationSettings(settings) {
    return this.request('/notifications/settings', {
      method: 'PUT',
      body: settings,
    });
  }

  // Performance metrics - Use existing stats endpoint which provides performance data  
  async getPerformanceMetrics(period = 'week') {
    return this.request(`/stats/daily?period=${period}`);
  }

  // Support methods
  async reportIssue(issueData) {
    return this.request('/support/issue', {
      method: 'POST',
      body: issueData,
    });
  }

  async getSupportTickets() {
    return this.request('/support/tickets');
  }

  // Set auth token
  setAuthToken(token) {
    this.token = token;
  }

  // Clear auth token
  clearAuthToken() {
    this.token = null;
  }
}

// Create and export singleton instance
const driverApiService = new DriverApiService();
export default driverApiService;