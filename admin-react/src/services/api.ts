import axios from 'axios'
import type {
  ApiResponse,
  Order,
  OrdersResponse,
  OrderFilters,
  Pagination,
  DashboardStats,
  Chef,
  ChefAssignmentData,
  BulkAssignmentData
} from '../types'

// Create axios instance with base configuration
const api = axios.create({
  baseURL: import.meta.env.PROD 
    ? `${import.meta.env.VITE_API_BASE_URL}/api/admin`
    : '/api/admin',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor for authentication and logging
api.interceptors.request.use((config) => {
  console.log(`🌐 API Request: ${config.method?.toUpperCase()} ${config.url}`)
  
  // Add authentication token if available
  const token = localStorage.getItem('choma-admin-token')
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`
  }
  
  return config
})

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => {
    console.log(`✅ API Response: ${response.config.method?.toUpperCase()} ${response.config.url}`)
    return response
  },
  (error) => {
    console.error(`❌ API Error: ${error.config?.method?.toUpperCase()} ${error.config?.url}`, error.message)
    
    // Handle authentication errors
    if (error.response?.status === 401) {
      console.warn('🔒 Authentication failed - clearing stored credentials')
      localStorage.removeItem('choma-admin-token')
      localStorage.removeItem('choma-admin-data')
      // You might want to redirect to login page here
      if (window.location.pathname !== '/login') {
        window.location.reload() // This will trigger the auth check and redirect to login
      }
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

// Generic API request function
export const apiRequest = async (endpoint: string, options: RequestInit = {}) => {
  try {
    const config = {
      url: endpoint,
      method: options.method || 'GET',
      data: options.body ? JSON.parse(options.body as string) : undefined,
      headers: {
        ...options.headers,
      }
    }

    const response = await api(config)
    return response.data
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'response' in error) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return (error as any).response?.data
    }
    throw error
  }
}

// Orders API
export const ordersApi = {
  // Get all orders with filters
  async getOrders(filters: OrderFilters = {}): Promise<{ data: OrdersResponse; pagination: Pagination }> {
    const params = new URLSearchParams()
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== '' && value !== null) {
        params.append(key, value.toString())
      }
    })
    const response = await api.get(`/orders?${params.toString()}`)
    const data = response.data as ApiResponse<OrdersResponse> & { pagination?: Pagination }
    if (data.success && data.data) {
      return {
        data: {
          orders: data.data.orders,
          stats: data.data.stats
        },
        pagination: data.pagination as Pagination
      }
    }
    return { data: { orders: [], stats: { orderStatus: {}, paymentStatus: {} } }, pagination: {} as Pagination }
  },

  // Get single order
  async getOrder(orderId: string): Promise<Order> {
    const response = await api.get<ApiResponse<Order>>(`/orders/${orderId}`)
    return handleResponse(response)
  },

  // Update order
  async updateOrder(orderId: string, updateData: Partial<Order>): Promise<Order> {
    const response = await api.put<ApiResponse<Order>>(`/orders/${orderId}`, updateData)
    return handleResponse(response)
  },

  // Update order status
  async updateOrderStatus(orderId: string, status: string, reason?: string): Promise<Order> {
    const response = await api.put<ApiResponse<Order>>(`/orders/${orderId}/status`, { 
      status, 
      reason 
    })
    return handleResponse(response)
  },

  // Bulk update orders
  async bulkUpdateOrders(orderIds: string[], updateData: Partial<Order>): Promise<{ modifiedCount: number; matchedCount: number }> {
    const response = await api.put<ApiResponse<{ modifiedCount: number; matchedCount: number }>>(
      '/orders/bulk', 
      { orderIds, ...updateData }
    )
    return handleResponse(response)
  },

  // Cancel order
  async cancelOrder(orderId: string, reason?: string): Promise<Order> {
    const response = await api.put<ApiResponse<Order>>(`/orders/${orderId}/cancel`, { reason })
    return handleResponse(response)
  },

  // Export orders
  async exportOrders(filters: OrderFilters = {}): Promise<Blob> {
    const params = new URLSearchParams()
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== '' && value !== null) {
        params.append(key, value.toString())
      }
    })
    
    const response = await api.get(`/orders/export?${params.toString()}`, {
      responseType: 'blob'
    })
    // Ensure type safety for response.data
    return response.data as Blob
  }
}

// Chefs API
export const chefsApi = {
  // Get all chefs
  async getChefs(filters: Record<string, string | number | boolean | undefined> = {}): Promise<Chef[]> {
    const params = new URLSearchParams()
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== '' && value !== null) {
        params.append(key, value.toString())
      }
    })
    const response = await api.get(`/chefs?${params.toString()}`)
    const data = response.data as ApiResponse<{ chefs: Chef[] }>
    if (data.success && data.data && Array.isArray(data.data.chefs)) {
      return data.data.chefs
    }
    return []
  },

  // Get available chefs (active chefs with capacity)
  async getAvailableChefs(): Promise<Chef[]> {
    try {
      const response = await api.get<ApiResponse<{ chefs: Chef[] }>>('/chefs?status=Active')
      
      // Handle the nested response structure
      let allChefs: Chef[] = []
      if (response.data.success && response.data.data && Array.isArray(response.data.data.chefs)) {
        allChefs = response.data.data.chefs
      } else {
        console.error('Unexpected chef response structure:', response.data)
        return []
      }
      
      // Filter for chefs with available capacity (if capacity fields exist)
      return allChefs.filter(chef => {
        // If capacity fields don't exist, include the chef anyway
        if (typeof chef.currentCapacity !== 'number' || typeof chef.maxCapacity !== 'number') {
          return true
        }
        return chef.currentCapacity < chef.maxCapacity
      })
    } catch (error) {
      console.error('Error in getAvailableChefs:', error)
      return []
    }
  },

  // Get chef details
  async getChef(chefId: string): Promise<Chef> {
    const response = await api.get<ApiResponse<Chef>>(`/chefs/${chefId}`)
    return handleResponse(response)
  },

  // Update chef status
  async updateChefStatus(chefId: string, status: string): Promise<Chef> {
    const response = await api.put<ApiResponse<Chef>>(`/chefs/${chefId}/status`, { status })
    return handleResponse(response)
  },

  // Approve chef
  async approveChef(chefId: string): Promise<Chef> {
    const response = await api.put<ApiResponse<Chef>>(`/chefs/${chefId}/approve`, {
      sendEmail: true // Flag to backend to send email notification
    })
    return handleResponse(response)
  },

  // Reject chef
  async rejectChef(chefId: string, reason?: string): Promise<Chef> {
    const response = await api.put<ApiResponse<Chef>>(`/chefs/${chefId}/reject`, { reason })
    return handleResponse(response)
  }
}

// Delegation API
export const delegationApi = {
  // Assign order to chef
  async assignOrder(data: ChefAssignmentData): Promise<void> {
    const response = await api.post<ApiResponse<void>>(
      `/delegation/assign/${data.orderId}/${data.chefId}`, 
      { notes: data.notes }
    )
    return handleResponse(response)
  },

  // Bulk assign orders to chef
  async bulkAssignOrders(data: BulkAssignmentData): Promise<{ success: boolean; assignedCount: number; message?: string }> {
    const response = await api.post<ApiResponse<{ assignedCount: number; message?: string }>>('/delegation/bulk-assign', data)
    return {
      success: response.data.success,
      assignedCount: response.data.data?.assignedCount ?? 0,
      message: response.data.data?.message ?? response.data.message
    }
  },

  // Get available chefs for order
  async getAvailableChefsForOrder(orderId: string): Promise<Chef[]> {
    const response = await api.get<ApiResponse<Chef[]>>(`/delegation/available-chefs/${orderId}`)
    return handleResponse(response)
  }
}

// Dashboard API
export const dashboardApi = {
  // Get dashboard stats
  async getStats(): Promise<DashboardStats> {
    const response = await api.get<ApiResponse<DashboardStats>>('/dashboard/stats')
    console.log('🐛 Dashboard Response Data:', response.data)
    console.log('🐛 Dashboard Response Success:', response.data.success)
    if (response.data.message) {
      console.log('🐛 Dashboard Response Message:', response.data.message)
    }
    return handleResponse(response)
  }
}

// Health check
// Users (Customers) API
export const usersApi = {
  // Get all users with filters
  async getUsers(
    filters: Record<string, string | number | boolean | undefined> = {}
  ): Promise<{ users: unknown[]; pagination: Record<string, unknown> }> {
    const params = new URLSearchParams()
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== '' && value !== null) {
        params.append(key, value.toString())
      }
    })
    const response = await api.get(`/users?${params.toString()}`)
    const data = response.data as ApiResponse<{ users: unknown[] }> & { pagination?: Record<string, unknown> }
    if (data.success && data.data) {
      return {
        users: data.data.users || [],
        pagination: data.pagination || {}
      }
    }
    return { users: [], pagination: {} }
  },

  // Update user status
  async updateUserStatus(userId: string, status: string): Promise<{ success: boolean; message: string }> {
    const response = await api.put<ApiResponse<null>>(`/users/${userId}/status`, { status })
    return { success: response.data.success, message: response.data.message ?? '' }
  },

  // Export users
  async exportUsers(filters: Record<string, string | number | boolean | undefined> = {}): Promise<Blob> {
    const params = new URLSearchParams()
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== '' && value !== null) {
        params.append(key, value.toString())
      }
    })
    
    const response = await api.get(`/export/users?${params.toString()}`, {
      responseType: 'blob'
    })
    // Ensure type safety for response.data
    return response.data as Blob
  }
}

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

// Admin Management API
export const adminManagementApi = {
  // Get all admins
  async getAllAdmins(): Promise<{ admins: unknown[]; pagination?: Record<string, unknown> }> {
    try {
      const response = await api.get('/admins')
      const data = response.data as ApiResponse<{ admins: unknown[] }> & { pagination?: Record<string, unknown> }
      if (data.success && data.data) {
        return {
          admins: data.data.admins || [],
          pagination: data.pagination || {}
        }
      }
      return { admins: [] }
    } catch (error) {
      console.error('Error fetching admins:', error)
      return { admins: [] }
    }
  },

  // Create new admin
  async createAdmin(adminData: Record<string, unknown>): Promise<{ success: boolean; message: string; admin?: unknown }> {
    try {
      const response = await api.post<ApiResponse<{ admin: unknown }>>('/admins', adminData)
      return {
        success: response.data.success,
        message: response.data.message || 'Admin created successfully',
        admin: response.data.data?.admin
      }
    } catch (error) {
      console.error('Error creating admin:', error)
      return {
        success: false,
        message: 'Failed to create admin'
      }
    }
  },

  // Update admin
  async updateAdmin(adminId: string, adminData: Record<string, unknown>): Promise<{ success: boolean; message: string; admin?: unknown }> {
    try {
      const response = await api.put<ApiResponse<{ admin: unknown }>>(`/admins/${adminId}`, adminData)
      return {
        success: response.data.success,
        message: response.data.message || 'Admin updated successfully',
        admin: response.data.data?.admin
      }
    } catch (error) {
      console.error('Error updating admin:', error)
      return {
        success: false,
        message: 'Failed to update admin'
      }
    }
  },

  // Delete admin
  async deleteAdmin(adminId: string): Promise<{ success: boolean; message: string }> {
    try {
      const response = await api.delete<ApiResponse<null>>(`/admins/${adminId}`)
      return {
        success: response.data.success,
        message: response.data.message || 'Admin deleted successfully'
      }
    } catch (error) {
      console.error('Error deleting admin:', error)
      return {
        success: false,
        message: 'Failed to delete admin'
      }
    }
  },

  // Toggle admin status
  async toggleAdminStatus(adminId: string): Promise<{ success: boolean; message: string; admin?: unknown }> {
    try {
      const response = await api.patch<ApiResponse<{ admin: unknown }>>(`/admins/${adminId}/toggle-status`)
      return {
        success: response.data.success,
        message: response.data.message || 'Admin status updated successfully',
        admin: response.data.data?.admin
      }
    } catch (error) {
      console.error('Error toggling admin status:', error)
      return {
        success: false,
        message: 'Failed to update admin status'
      }
    }
  },

  // Create custom role
  async createRole(roleData: Record<string, unknown>): Promise<{ success: boolean; message: string; role?: unknown }> {
    try {
      const response = await api.post<ApiResponse<{ role: unknown }>>('/roles', roleData)
      return {
        success: response.data.success,
        message: response.data.message || 'Role created successfully',
        role: response.data.data?.role
      }
    } catch (error) {
      console.error('Error creating role:', error)
      return {
        success: false,
        message: 'Failed to create role'
      }
    }
  }
}