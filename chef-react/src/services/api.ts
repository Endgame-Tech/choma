import axios, { AxiosResponse } from 'axios'
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
  baseURL: '/api/chef',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor to add auth token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('chefToken')
  if (token) {
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
const handleResponse = <T>(response: AxiosResponse<ApiResponse<T>>): T => {
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
    const result = handleResponse(response)
    
    // Store token and chef data
    localStorage.setItem('chefToken', result.token)
    localStorage.setItem('chefData', JSON.stringify(result.chef))
    
    return result
  },

  // Chef registration
  async register(data: RegisterData): Promise<{ chef: Chef; message: string }> {
    const response = await api.post<ApiResponse<{ chef: Chef; message: string }>>('/register', data)
    return handleResponse(response)
  },

  // Logout
  logout(): void {
    localStorage.removeItem('chefToken')
    localStorage.removeItem('chefData')
  },

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

// Dashboard API
export const dashboardApi = {
  // Get dashboard stats
  async getStats(): Promise<ChefDashboardStats> {
    const response = await api.get<ApiResponse<ChefDashboardStats>>('/dashboard/stats')
    return handleResponse(response)
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
    if (response.data.success) {
      return {
        orders: response.data.data.orders || [],
        stats: response.data.data.stats || {},
        pagination: response.data.pagination || {}
      }
    }
    return { orders: [], stats: {}, pagination: {} }
  },

  // Get specific order details
  async getOrder(orderId: string): Promise<Order> {
    const response = await api.get<ApiResponse<Order>>(`/orders/${orderId}`)
    return handleResponse(response)
  },

  // Accept order assignment
  async acceptOrder(orderId: string): Promise<Order> {
    const response = await api.post<ApiResponse<Order>>(`/orders/${orderId}/accept`)
    return handleResponse(response)
  },

  // Update order status
  async updateOrderStatus(orderId: string, status: string, notes?: string): Promise<Order> {
    const response = await api.put<ApiResponse<Order>>(`/orders/${orderId}/status`, { 
      status, 
      chefNotes: notes 
    })
    return handleResponse(response)
  },

  // Update chef status (cooking workflow)
  async updateChefStatus(orderId: string, chefStatus: string): Promise<Order> {
    const response = await api.put<ApiResponse<Order>>(`/orders/${orderId}/chef-status`, { 
      chefStatus 
    })
    return handleResponse(response)
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
    
    const response = await api.get(`/earnings/payments?${params.toString()}`)
    return handleResponse(response)
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
    
    const response = await api.get(`/earnings/history?${params.toString()}`)
    return handleResponse(response)
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
    const response = await api.get<ApiResponse<any[]>>('/notifications')
    return handleResponse(response)
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