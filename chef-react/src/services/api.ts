
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
  // Get earnings overview
  async getEarningsOverview(period: 'week' | 'month' | 'year' = 'month'): Promise<any> {
    const response = await api.get<ApiResponse<any>>(`/earnings/overview?period=${period}`)
    return handleResponse(response)
  },

  // Get payment history
  async getPaymentHistory(filters: any = {}): Promise<any> {
    const params = new URLSearchParams()
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== '' && value !== null) {
        params.append(key, value.toString())
      }
    })
    
    const response = await api.get<ApiResponse<any>>(`/earnings/payments?${params.toString()}`)
    return handleResponse<any>(response)
  },

  // Request withdrawal
  async requestWithdrawal(amount: number): Promise<any> {
    const response = await api.post<ApiResponse<any>>('/earnings/withdraw', { amount })
    return handleResponse(response)
  },

  // Get earnings summary (backward compatibility)
  async getEarningsSummary(): Promise<any> {
    const response = await api.get<ApiResponse<any>>('/earnings/summary')
    return handleResponse(response)
  },

  // Get earnings history (backward compatibility)
  async getEarningsHistory(filters: any = {}): Promise<any> {
    const params = new URLSearchParams()
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== '' && value !== null) {
        params.append(key, value.toString())
      }
    })
    
    const response = await api.get<ApiResponse<any>>(`/earnings/history?${params.toString()}`)
    return handleResponse<any>(response)
  },

  // Request payout (backward compatibility)
  async requestPayout(amount: number): Promise<any> {
    const response = await api.post<ApiResponse<any>>('/earnings/payout', { amount })
    return handleResponse(response)
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