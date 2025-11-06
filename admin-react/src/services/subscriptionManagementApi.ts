import axios from 'axios';

// Types
interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

interface SubscriptionOverview {
  _id: string;
  subscriptionId: string;
  userId: {
    _id: string;
    fullName: string;
    email: string;
    phone: string;
  };
  mealPlanId: {
    _id: string;
    planName: string;
    durationWeeks: number;
    mealsPerWeek: number;
  };
  status: 'active' | 'paused' | 'cancelled' | 'pending';
  startDate: string;
  endDate?: string;
  nextDelivery: string;
  totalPrice: number;
  deliveryAddress: string;
  chefAssignment?: {
    chefId: {
      _id: string;
      fullName: string;
      email: string;
      phone: string;
      rating: number;
    };
    assignedAt: string;
    performance: {
      averageRating: number;
      completedDeliveries: number;
      onTimePercentage: number;
    };
  };
  metrics: {
    completedMeals: number;
    totalMeals: number;
    consecutiveDays: number;
    progressPercentage: number;
  };
  issues?: {
    pendingReassignmentRequests: number;
    skippedMeals: number;
    customerComplaints: number;
  };
}

interface ChefReassignmentRequest {
  _id: string;
  subscriptionId: string;
  customerId: string;
  customerName: string;
  currentChefId: string;
  currentChefName: string;
  reason: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  requestedAt: string;
  status: 'pending' | 'approved' | 'rejected' | 'completed';
  adminNotes?: string;
}

interface SubscriptionStats {
  totalSubscriptions: number;
  activeSubscriptions: number;
  pausedSubscriptions: number;
  pendingRequests: number;
  issuesRequiringAttention: number;
  revenueMetrics: {
    monthlyRecurringRevenue: number;
    averageSubscriptionValue: number;
    churnRate: number;
  };
}

interface MealTimelineItem {
  date: string;
  mealType: string;
  mealName: string;
  status: 'scheduled' | 'preparing' | 'ready' | 'delivered' | 'skipped';
  chefId?: string;
  chefName?: string;
  estimatedTime?: string;
  actualTime?: string;
  customerRating?: number;
}

interface AvailableChef {
  _id: string;
  fullName: string;
  email: string;
  phone: string;
  rating: number;
  specialties: string[];
  currentWorkload: number;
  maxCapacity: number;
  availability: {
    daysOfWeek: string[];
    timeSlots: string[];
  };
  performance: {
    averageRating: number;
    completedOrders: number;
    onTimePercentage: number;
    customerSatisfaction: number;
  };
}

// Create axios instance for subscription management
const api = axios.create({
  baseURL: `${import.meta.env.VITE_API_URL}/api/admin/subscription-management`,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor for authentication
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('choma-admin-token');
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('Subscription Management API Error:', error);
    throw error;
  }
);

export const subscriptionManagementApi = {
  // ==========================================
  // SUBSCRIPTION OVERVIEW AND MANAGEMENT
  // ==========================================

  // Get all subscriptions with filtering and pagination
  async getAllSubscriptions(filters?: {
    status?: string;
    searchTerm?: string;
    page?: number;
    limit?: number;
  }): Promise<ApiResponse<SubscriptionOverview[]>> {
    const params = new URLSearchParams();
    if (filters?.status) params.append('status', filters.status);
    if (filters?.searchTerm) params.append('search', filters.searchTerm);
    if (filters?.page) params.append('page', filters.page.toString());
    if (filters?.limit) params.append('limit', filters.limit.toString());

    const response = await api.get(`/subscriptions?${params.toString()}`);
    return response.data as ApiResponse<SubscriptionOverview[]>;
  },

  // Get subscription statistics
  async getSubscriptionStats(): Promise<ApiResponse<SubscriptionStats>> {
    const response = await api.get('/subscriptions/stats');
    return response.data as ApiResponse<SubscriptionStats>;
  },

  // Get detailed subscription information
  async getSubscriptionDetails(subscriptionId: string): Promise<ApiResponse<SubscriptionOverview>> {
    const response = await api.get(`/subscriptions/${subscriptionId}`);
    return response.data as ApiResponse<SubscriptionOverview>;
  },

  // Admin pause subscription with reason
  async adminPauseSubscription(subscriptionId: string, reason: string): Promise<ApiResponse> {
    const response = await api.put(`/subscriptions/${subscriptionId}/pause`, { reason, pausedBy: 'admin' });
    return response.data as ApiResponse;
  },

  // Admin resume subscription
  async adminResumeSubscription(subscriptionId: string): Promise<ApiResponse> {
    const response = await api.put(`/subscriptions/${subscriptionId}/resume`, { resumedBy: 'admin' });
    return response.data as ApiResponse;
  },

  // Admin cancel subscription with reason
  async adminCancelSubscription(subscriptionId: string, reason: string): Promise<ApiResponse> {
    const response = await api.put(`/subscriptions/${subscriptionId}/cancel`, { reason, cancelledBy: 'admin' });
    return response.data as ApiResponse;
  },

  // Update subscription delivery preferences (admin override)
  async adminUpdateDeliveryPreferences(subscriptionId: string, preferences: {
    frequency?: string;
    timeSlot?: string;
    daysOfWeek?: string[];
    specialInstructions?: string;
  }): Promise<ApiResponse> {
    const response = await api.put(`/subscriptions/${subscriptionId}/delivery-preferences`, {
      ...preferences,
      updatedBy: 'admin'
    });
    return response.data as ApiResponse;
  },

  // ==========================================
  // CHEF REASSIGNMENT MANAGEMENT
  // ==========================================

  // Get all chef reassignment requests
  async getChefReassignmentRequests(filters?: {
    status?: string;
    priority?: string;
    page?: number;
    limit?: number;
  }): Promise<ApiResponse<ChefReassignmentRequest[]>> {
    const params = new URLSearchParams();
    if (filters?.status) params.append('status', filters.status);
    if (filters?.priority) params.append('priority', filters.priority);
    if (filters?.page) params.append('page', filters.page.toString());
    if (filters?.limit) params.append('limit', filters.limit.toString());

    const response = await api.get(`/chef-reassignment-requests?${params.toString()}`);
    return response.data as ApiResponse<ChefReassignmentRequest[]>;
  },

  // Get available chefs for reassignment
  async getAvailableChefs(subscriptionId: string): Promise<ApiResponse<AvailableChef[]>> {
    const response = await api.get(`/subscriptions/${subscriptionId}/available-chefs`);
    return response.data as ApiResponse<AvailableChef[]>;
  },

  // Approve chef reassignment request
  async approveChefReassignment(requestId: string, newChefId: string, adminNotes?: string): Promise<ApiResponse> {
    const response = await api.put(`/chef-reassignment-requests/${requestId}/approve`, {
      newChefId,
      adminNotes,
      approvedBy: 'admin'
    });
    return response.data as ApiResponse;
  },

  // Reject chef reassignment request
  async rejectChefReassignment(requestId: string, reason: string): Promise<ApiResponse> {
    const response = await api.put(`/chef-reassignment-requests/${requestId}/reject`, {
      reason,
      rejectedBy: 'admin'
    });
    return response.data as ApiResponse;
  },

  // Manually assign chef to subscription (admin override)
  async manuallyAssignChef(subscriptionId: string, chefId: string, reason: string): Promise<ApiResponse> {
    const response = await api.put(`/subscriptions/${subscriptionId}/assign-chef`, {
      chefId,
      reason,
      assignedBy: 'admin'
    });
    return response.data as ApiResponse;
  },

  // ==========================================
  // MEAL TIMELINE AND MONITORING
  // ==========================================

  // Get subscription meal timeline
  async getSubscriptionTimeline(subscriptionId: string, options?: {
    startDate?: string;
    endDate?: string;
    daysAhead?: number;
  }): Promise<ApiResponse<MealTimelineItem[]>> {
    const params = new URLSearchParams();
    if (options?.startDate) params.append('startDate', options.startDate);
    if (options?.endDate) params.append('endDate', options.endDate);
    if (options?.daysAhead) params.append('daysAhead', options.daysAhead.toString());

    const response = await api.get(`/subscriptions/${subscriptionId}/timeline?${params.toString()}`);
    return response.data as ApiResponse<MealTimelineItem[]>;
  },

  // Admin skip meal delivery
  async adminSkipMealDelivery(subscriptionId: string, skipDate: string, reason: string): Promise<ApiResponse> {
    const response = await api.post(`/subscriptions/${subscriptionId}/skip-meal`, {
      skipDate,
      reason,
      skippedBy: 'admin'
    });
    return response.data as ApiResponse;
  },

  // Reschedule meal delivery
  async rescheduleMealDelivery(subscriptionId: string, currentDate: string, newDate: string, reason: string): Promise<ApiResponse> {
    const response = await api.put(`/subscriptions/${subscriptionId}/reschedule-meal`, {
      currentDate,
      newDate,
      reason,
      rescheduledBy: 'admin'
    });
    return response.data as ApiResponse;
  },

  // ==========================================
  // ANALYTICS AND REPORTING
  // ==========================================

  // Get subscription performance analytics
  async getSubscriptionAnalytics(period?: 'week' | 'month' | 'quarter' | 'year'): Promise<ApiResponse> {
    const params = period ? `?period=${period}` : '';
    const response = await api.get(`/analytics/subscription-performance${params}`);
    return response.data as ApiResponse;
  },

  // Get chef performance analytics
  async getChefPerformanceAnalytics(chefId?: string): Promise<ApiResponse> {
    const params = chefId ? `?chefId=${chefId}` : '';
    const response = await api.get(`/analytics/chef-performance${params}`);
    return response.data as ApiResponse;
  },

  // Get customer satisfaction metrics
  async getCustomerSatisfactionMetrics(): Promise<ApiResponse> {
    const response = await api.get('/analytics/customer-satisfaction');
    return response.data as ApiResponse;
  },

  // ==========================================
  // CUSTOMER COMMUNICATION
  // ==========================================

  // Send notification to customer
  async sendCustomerNotification(subscriptionId: string, notification: {
    type: 'chef_change' | 'schedule_update' | 'pause_notice' | 'general';
    title: string;
    message: string;
    urgent?: boolean;
  }): Promise<ApiResponse> {
    const response = await api.post(`/subscriptions/${subscriptionId}/notify-customer`, notification);
    return response.data as ApiResponse;
  },

  // Get customer communication history
  async getCustomerCommunicationHistory(subscriptionId: string): Promise<ApiResponse> {
    const response = await api.get(`/subscriptions/${subscriptionId}/communication-history`);
    return response.data as ApiResponse;
  },

  // ==========================================
  // SUBSCRIPTION HEALTH MONITORING
  // ==========================================

  // Get subscriptions requiring attention
  async getSubscriptionsRequiringAttention(): Promise<ApiResponse<SubscriptionOverview[]>> {
    const response = await api.get('/subscriptions/requiring-attention');
    return response.data as ApiResponse<SubscriptionOverview[]>;
  },

  // Get subscription health score
  async getSubscriptionHealthScore(subscriptionId: string): Promise<ApiResponse> {
    const response = await api.get(`/subscriptions/${subscriptionId}/health-score`);
    return response.data as ApiResponse;
  },

  // Flag subscription for review
  async flagSubscriptionForReview(subscriptionId: string, reason: string, priority: 'low' | 'medium' | 'high'): Promise<ApiResponse> {
    const response = await api.post(`/subscriptions/${subscriptionId}/flag-review`, {
      reason,
      priority,
      flaggedBy: 'admin'
    });
    return response.data as ApiResponse;
  }
};

export default subscriptionManagementApi;