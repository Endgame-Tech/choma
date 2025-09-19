
// Vite provides ImportMetaEnv globally, so you do not need to redeclare ImportMeta or ImportMetaEnv here.

import axios from 'axios'
import type {
  ApiResponse,
  Chef,
  Order,
  LoginCredentials,
  RegisterData,
  ChefDashboardStats
} from '../types'

// Create axios instance with base configuration
const api = axios.create({
  baseURL: (import.meta as ImportMeta & { env: { PROD: boolean; VITE_API_BASE_URL: string } }).env.PROD
    ? `${(import.meta as ImportMeta & { env: { VITE_API_BASE_URL: string } }).env.VITE_API_BASE_URL}/api/chef`
    : '/api/chef',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor to add auth token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('chefToken')
  if (token) {
    if (!config.headers) {
      config.headers = {}
    }
    config.headers.Authorization = `Bearer ${token}`
  }
  console.log(`🌐 Chef API Request: ${config.method?.toUpperCase()} ${config.url}`)
  return config
})

// Response interceptor for error handling and token refresh
api.interceptors.response.use(
  (response) => {
    console.log(`✅ Chef API Response: ${response.config.method?.toUpperCase()} ${response.config.url}`)
    return response
  },
  (error) => {
    console.error(`❌ Chef API Error: ${error.config?.method?.toUpperCase()} ${error.config?.url}`, error.message)
    
    // Handle authentication errors
    if (error.response?.status === 401) {
      localStorage.removeItem('chefToken')
      localStorage.removeItem('chefData')
      window.location.href = '/login'
    }
    
    return Promise.reject(error)
  }
)

// Generic API response handler
const handleResponse = <T>(response: { data: ApiResponse<T> }): T => {
  if (response.data.success) {
    return response.data.data
  } else {
    throw new Error(response.data.message || 'API request failed')
  }
}

// Auth API
export const authApi = {
  // Chef login
  async login(credentials: LoginCredentials): Promise<{ chef: Chef; token: string }> {
    const response = await api.post<ApiResponse<{ chef: Chef; token: string }>>('/login', credentials)
    const result = handleResponse<{ chef: Chef; token: string }>(response)
    
    // Store token and chef data
    localStorage.setItem('chefToken', result.token)
    localStorage.setItem('chefData', JSON.stringify(result.chef))
    
    return result
  },

  // Chef registration
  async register(data: RegisterData): Promise<{ chef: Chef; message: string }> {
    const response = await api.post<ApiResponse<{ chef: Chef; message: string }>>('/register', data)
    return handleResponse<{ chef: Chef; message: string }>(response as { data: ApiResponse<{ chef: Chef; message: string }> })
  },

  // Logout
  logout(): void {
    localStorage.removeItem('chefToken')
    localStorage.removeItem('chefData')
  },

  // Get current chef profile
  async getProfile(): Promise<Chef> {
      const response = await api.get<ApiResponse<Chef>>('/profile')
      return handleResponse<Chef>(response)
  },

  // Update chef profile
  async updateProfile(profileData: Partial<Chef>): Promise<Chef> {
    const response = await api.put<ApiResponse<Chef>>('/profile', profileData)
    return handleResponse<Chef>(response as { data: ApiResponse<Chef> })
  }
}

// Dashboard API
export const dashboardApi = {
  // Get dashboard stats
  async getStats(): Promise<ChefDashboardStats> {
    const response = await api.get<ApiResponse<ChefDashboardStats>>('/dashboard/stats')
    return handleResponse<ChefDashboardStats>(response)
  }
}

// Orders API
export const ordersApi = {
  // Get chef's assigned orders
  async getMyOrders(filters: any = {}): Promise<{ orders: Order[]; stats: any; pagination: any }> {
    const params = new URLSearchParams()
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== '' && value !== null) {
        params.append(key, value.toString())
      }
    })
    
    const response = await api.get(`/orders?${params.toString()}`)
    const data = response.data as {
      success: boolean
      data: { orders?: Order[]; stats?: any }
      pagination?: any
    }
    if (data.success) {
      return {
        orders: data.data.orders || [],
        stats: data.data.stats || {},
        pagination: data.pagination || {}
      }
    }
    return { orders: [], stats: {}, pagination: {} }
  },

  // Get specific order details
  async getOrder(orderId: string): Promise<Order> {
    const response = await api.get<ApiResponse<Order>>(`/orders/${orderId}`)
    return handleResponse<Order>(response)
  },

  // Accept order assignment
  async acceptOrder(orderId: string): Promise<Order> {
      const response = await api.post<ApiResponse<Order>>(`/orders/${orderId}/accept`)
      return handleResponse<Order>(response)
  },

  // Update order status
  async updateOrderStatus(orderId: string, status: string, notes?: string): Promise<Order> {
    const response = await api.put<ApiResponse<Order>>(`/orders/${orderId}/status`, { 
      status, 
      chefNotes: notes 
    })
    return handleResponse<Order>(response)
  },

  // Update chef status (cooking workflow)
  async updateChefStatus(orderId: string, chefStatus: string): Promise<Order> {
    const response = await api.put<ApiResponse<Order>>(`/orders/${orderId}/chef-status`, { 
      chefStatus 
    })
    return handleResponse<Order>(response)
  },

  // Complete order
  async completeOrder(orderId: string, completionNotes?: string): Promise<Order> {
    const response = await api.post<ApiResponse<Order>>(`/orders/${orderId}/complete`, {
      chefNotes: completionNotes
    })
    return handleResponse(response)
  }
}

// Profile API (alias for auth profile methods)
export const profileApi = {
  // Get current chef profile
  async getProfile(): Promise<Chef> {
    const response = await api.get<ApiResponse<Chef>>('/profile')
    return handleResponse(response)
  },

  // Update chef profile
  async updateProfile(profileData: Partial<Chef>): Promise<Chef> {
    const response = await api.put<ApiResponse<Chef>>('/profile', profileData)
    return handleResponse(response)
  }
}

// Earnings API
export const earningsApi = {
  // Get chef earnings (new integrated endpoint)
  async getEarnings(period: 'current_week' | 'last_week' | 'current_month' = 'current_month'): Promise<any> {
    const response = await api.get<ApiResponse<any>>(`/earnings?period=${period}`)
    return handleResponse(response)
  },

  // Get earnings overview (legacy support)
  async getEarningsOverview(period: 'week' | 'month' | 'year' = 'month'): Promise<any> {
    // Map the period to our new backend format
    let mappedPeriod = 'current_month'
    if (period === 'week') mappedPeriod = 'current_week'
    else if (period === 'month') mappedPeriod = 'current_month'
    
    return this.getEarnings(mappedPeriod as any)
  },

  // Get payment history (using earnings data)
  async getPaymentHistory(): Promise<any> {
    const earningsData = await this.getEarnings('current_month')
    // Transform earnings into payment history format
    const payments = earningsData.earnings?.map((earning: any) => ({
      _id: earning.id,
      chefId: earningsData.chef?.id,
      amount: earning.cookingFee,
      type: 'earning',
      status: earning.status,
      description: `Order completed - ₦${earning.cookingFee.toLocaleString()}`,
      orderId: earning.orderNumber,
      createdAt: earning.completedDate,
      updatedAt: earning.payoutDate || earning.completedDate
    })) || []
    
    return { payments }
  },

  // Request withdrawal (placeholder - not implemented in backend yet)
  async requestWithdrawal(): Promise<any> {
    // Note: This would need to be implemented in the backend
    throw new Error('Withdrawal requests will be available soon. Payouts are processed weekly on Fridays.')
  },

  // Get earnings summary (backward compatibility)
  async getEarningsSummary(): Promise<any> {
    return this.getEarnings('current_month')
  },

  // Get earnings history (backward compatibility)
  async getEarningsHistory(): Promise<any> {
    return this.getEarnings('current_month')
  },

  // Request payout (backward compatibility)
  async requestPayout(): Promise<any> {
    return this.requestWithdrawal()
  },

  // Get detailed meal plan for an order
  async getMealPlan(orderId: string): Promise<any> {
    const response = await api.get<ApiResponse<any>>(`/orders/${orderId}/meal-plan`)
    return handleResponse<any>(response)
  },

  // Get earnings breakdown for an order
  async getOrderEarningsBreakdown(orderId: string): Promise<any> {
    const response = await api.get<ApiResponse<any>>(`/orders/${orderId}/earnings-breakdown`)
    return handleResponse<any>(response)
  }
}

// Notifications API
export const notificationsApi = {
  // Get chef notifications
  async getNotifications(): Promise<any[]> {
    const response = await api.get<ApiResponse<{notifications: any[], pagination: any}>>('/notifications')
    const responseData = handleResponse(response)
    return responseData.notifications || []
  },

  // Mark notification as read
  async markAsRead(notificationId: string): Promise<void> {
    const response = await api.put<ApiResponse<void>>(`/notifications/${notificationId}/read`)
    return handleResponse(response)
  }
}

// Chef Subscriptions API
export const chefSubscriptionsApi = {
  // Get chef's subscription assignments
  async getMySubscriptionAssignments(): Promise<any> {
    const response = await api.get<ApiResponse<any>>('/subscriptions')
    return handleResponse(response)
  },

  // Get weekly meal planning view
  async getWeeklyMealPlan(params: { startDate: string }): Promise<any> {
    const response = await api.get<ApiResponse<any>>(`/subscriptions/weekly-plan?startDate=${params.startDate}`)
    return handleResponse(response)
  },

  // Get subscription timeline
  async getSubscriptionTimeline(subscriptionId: string): Promise<any> {
    const response = await api.get<ApiResponse<any>>(`/subscriptions/${subscriptionId}/timeline`)
    return handleResponse(response)
  },

  // Update subscription meal status
  async updateSubscriptionMealStatus(data: {
    subscriptionAssignmentId: string;
    mealType: string;
    status: string;
    notes?: string;
  }): Promise<any> {
    const response = await api.put<ApiResponse<any>>('/subscriptions/subscription-meal-status', data)
    return handleResponse(response)
  },

  // Update meal status (batch support)
  async updateMealStatus(assignmentIds: string[], status: string, notes?: string): Promise<any> {
    const response = await api.put<ApiResponse<any>>('/subscriptions/meal-status', {
      assignmentIds,
      status,
      notes
    })
    return handleResponse(response)
  },

  // Get subscription performance metrics
  async getSubscriptionMetrics(params: { period: string }): Promise<any> {
    const response = await api.get<ApiResponse<any>>(`/subscriptions/metrics?period=${params.period}`)
    return handleResponse(response)
  },

  // Get batch preparation opportunities
  async getBatchOpportunities(): Promise<any> {
    const response = await api.get<ApiResponse<any>>('/subscriptions/batch-opportunities')
    return handleResponse(response)
  },

  // Get active batch preparations
  async getActiveBatches(): Promise<any> {
    const response = await api.get<ApiResponse<any>>('/subscriptions/active-batches')
    return handleResponse(response)
  },

  // Start batch preparation
  async startBatchPreparation(batchId: string): Promise<any> {
    const response = await api.post<ApiResponse<any>>(`/subscriptions/batch-preparation/${batchId}/start`)
    return handleResponse(response)
  },

  // Complete batch preparation
  async completeBatchPreparation(batchId: string): Promise<any> {
    const response = await api.post<ApiResponse<any>>(`/subscriptions/batch-preparation/${batchId}/complete`)
    return handleResponse(response)
  },

  // Cancel batch preparation
  async cancelBatchPreparation(batchId: string): Promise<any> {
    const response = await api.post<ApiResponse<any>>(`/subscriptions/batch-preparation/${batchId}/cancel`)
    return handleResponse(response)
  },

  // Send customer communication
  async sendCustomerCommunication(subscriptionId: string, messageType: string, content: any): Promise<any> {
    const response = await api.post<ApiResponse<any>>(`/subscriptions/${subscriptionId}/communicate`, {
      messageType,
      content
    })
    return handleResponse(response)
  }
}

// Health check
export const healthApi = {
  async check(): Promise<boolean> {
    try {
      const response = await api.get('/health')
      return response.status === 200
    } catch (error) {
      return false
    }
  }
}

export default api