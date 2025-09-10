import axios from 'axios';
import {
  SubscriptionDeliveriesResponse,
  WeeklyScheduleResponse,
  SubscriptionMetrics,
  CustomerTimelineResponse,
  ApiResponse
} from '../types';

// Extend ImportMeta interface for Vite environment variables
declare global {
  interface ImportMetaEnv {
    readonly VITE_API_URL: string;
  }

  interface ImportMeta {
    readonly env: ImportMetaEnv;
  }
}

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

// Create axios instance with authentication
const subscriptionApi = axios.create({
  baseURL: `${API_BASE_URL}/api/driver/subscription`,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests
subscriptionApi.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('driverToken');
    if (token) {
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor
subscriptionApi.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('Subscription API error:', error.response?.data || error.message);
    if (error.response?.status === 401) {
      localStorage.removeItem('driverToken');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

/**
 * Driver Subscription Service
 * Handles all subscription-related API calls for drivers
 */
export const subscriptionService = {
  /**
   * Get driver's active subscription deliveries
   */
  async getMySubscriptionDeliveries(): Promise<SubscriptionDeliveriesResponse> {
    try {
      console.log('🔍 Fetching driver subscription deliveries...');
      const response = await subscriptionApi.get<ApiResponse<SubscriptionDeliveriesResponse>>('/my-deliveries');
      
      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to fetch subscription deliveries');
      }
      
      return response.data.data!;
    } catch (error: any) {
      console.error('❌ Error fetching subscription deliveries:', error);
      throw new Error(error.response?.data?.message || 'Failed to fetch subscription deliveries');
    }
  },

  /**
   * Get weekly delivery schedule
   */
  async getWeeklySchedule(startDate?: string): Promise<WeeklyScheduleResponse> {
    try {
      console.log('📅 Fetching weekly delivery schedule...');
      const params = startDate ? { startDate } : {};
      const response = await subscriptionApi.get<ApiResponse<WeeklyScheduleResponse>>('/weekly-schedule', { params });
      
      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to fetch weekly schedule');
      }
      
      return response.data.data!;
    } catch (error: any) {
      console.error('❌ Error fetching weekly schedule:', error);
      throw new Error(error.response?.data?.message || 'Failed to fetch weekly schedule');
    }
  },

  /**
   * Get subscription performance metrics
   */
  async getSubscriptionMetrics(period: string = '30d'): Promise<SubscriptionMetrics> {
    try {
      console.log('📊 Fetching subscription metrics...');
      const response = await subscriptionApi.get<ApiResponse<SubscriptionMetrics>>('/metrics', {
        params: { period }
      });
      
      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to fetch subscription metrics');
      }
      
      return response.data.data!;
    } catch (error: any) {
      console.error('❌ Error fetching subscription metrics:', error);
      throw new Error(error.response?.data?.message || 'Failed to fetch subscription metrics');
    }
  },

  /**
   * Get customer subscription timeline
   */
  async getCustomerTimeline(customerId: string, subscriptionId: string): Promise<CustomerTimelineResponse> {
    try {
      console.log('📋 Fetching customer subscription timeline...');
      const response = await subscriptionApi.get<ApiResponse<CustomerTimelineResponse>>(
        `/customer/${customerId}/subscription/${subscriptionId}/timeline`
      );
      
      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to fetch customer timeline');
      }
      
      return response.data.data!;
    } catch (error: any) {
      console.error('❌ Error fetching customer timeline:', error);
      throw new Error(error.response?.data?.message || 'Failed to fetch customer timeline');
    }
  },

  /**
   * Update delivery status with subscription context
   */
  async updateDeliveryStatus(assignmentId: string, status: string, notes?: string): Promise<any> {
    try {
      console.log('📦 Updating delivery status with subscription context...');
      const response = await subscriptionApi.put<ApiResponse>('/delivery/status', {
        assignmentId,
        status,
        notes
      });
      
      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to update delivery status');
      }
      
      return response.data.data;
    } catch (error: any) {
      console.error('❌ Error updating delivery status:', error);
      throw new Error(error.response?.data?.message || 'Failed to update delivery status');
    }
  },

  /**
   * Send customer communication about subscription delivery
   */
  async sendCustomerCommunication(
    assignmentId: string, 
    messageType: 'delivery_update' | 'arrival_notification' | 'delivery_issue',
    content: any
  ): Promise<any> {
    try {
      console.log('💬 Sending customer communication...');
      const response = await subscriptionApi.post<ApiResponse>('/communication', {
        assignmentId,
        messageType,
        content
      });
      
      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to send customer communication');
      }
      
      return response.data.data;
    } catch (error: any) {
      console.error('❌ Error sending customer communication:', error);
      throw new Error(error.response?.data?.message || 'Failed to send customer communication');
    }
  }
};

export default subscriptionService;