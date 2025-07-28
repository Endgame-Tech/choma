import axios from 'axios'

// Create axios instance for analytics API
const analyticsApi = axios.create({
  baseURL: '/api/admin/analytics',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Types for analytics data
export interface AnalyticsDateRange {
  startDate: string
  endDate: string
  period: 'daily' | 'weekly' | 'monthly'
}

export interface RevenueAnalytics {
  totalRevenue: number
  previousPeriodRevenue: number
  revenueGrowth: number
  averageOrderValue: number
  revenueByPeriod: Array<{
    date: string
    revenue: number
    orders: number
  }>
  revenueByCategory: Array<{
    category: string
    revenue: number
    percentage: number
  }>
  revenueByPaymentMethod: Array<{
    method: string
    revenue: number
    count: number
  }>
}

export interface CustomerAnalytics {
  totalCustomers: number
  newCustomers: number
  activeCustomers: number
  customerGrowth: number
  customerRetention: number
  customerLifetimeValue: number
  customerSegments: Array<{
    name: string
    users: number
    percentage: number
    color: string
    avgOrderValue: number
    totalRevenue: number
  }>
  customersByLocation: Array<{
    location: string
    customers: number
    revenue: number
  }>
  churnRate: number
}

export interface ChefAnalytics {
  totalChefs: number
  activeChefs: number
  averageRating: number
  totalCapacity: number
  currentUtilization: number
  topPerformingChefs: Array<{
    _id: string
    chefId: string
    fullName: string
    email: string
    phone: string
    status: string
    rating: number
    totalOrdersCompleted: number
    currentCapacity: number
    maxCapacity: number
    availability: string
    location: {
      city: string
      area?: string
    }
    profileImage?: string
    joinDate: string
    completionRate: number
    avgDeliveryTime: number
    ordersThisMonth: number
    earningsThisMonth: number
    customerSatisfaction: number
  }>
  chefPerformanceMetrics: {
    averageCompletionRate: number
    averageDeliveryTime: number
    averageCustomerRating: number
  }
}

export interface OperationalAnalytics {
  averageOrderValue: number
  averageDeliveryTime: number  
  chefUtilization: number
  customerSatisfaction: number
  orderFulfillmentRate: number
  cancellationRate: number
  peakHours: Array<{
    hour: string
    orders: number
  }>
  popularMeals: Array<{
    name: string
    orders: number
    revenue: number
  }>
  ordersByStatus: Array<{
    status: string
    count: number
    percentage: number
  }>
  dailyOrderTrends: Array<{
    date: string
    orders: number
    completedOrders: number
    cancelledOrders: number
  }>
}

export interface EnhancedDashboardStats {
  // Current overview
  overview: {
    totalUsers: number
    activeUsers: number
    newUsersToday: number
    totalOrders: number
    ordersToday: number
    totalRevenue: number
    revenueToday: number
    totalChefs: number
    activeChefs: number
    totalMealPlans: number
    avgOrderValue: number
    customerSatisfaction: number
  }

  // Growth metrics
  growth: {
    userGrowth: number
    orderGrowth: number
    revenueGrowth: number
    chefGrowth: number
  }

  // Real-time metrics
  realTime: {
    ordersInProgress: number
    chefsOnline: number
    pendingOrders: number
    activeDeliveries: number
  }

  // Quick insights
  insights: Array<{
    type: 'positive' | 'negative' | 'neutral'
    title: string
    message: string
    value?: string
  }>
}

// Analytics API functions
export const analytics = {
  // Enhanced Dashboard Stats
  async getEnhancedDashboardStats(): Promise<EnhancedDashboardStats> {
    const response = await analyticsApi.get('/dashboard')
    return response.data.data
  },

  // Revenue Analytics
  async getRevenueAnalytics(dateRange: AnalyticsDateRange): Promise<RevenueAnalytics> {
    const response = await analyticsApi.get('/revenue', { params: dateRange })
    return response.data.data
  },

  // Customer Analytics  
  async getCustomerAnalytics(dateRange: AnalyticsDateRange): Promise<CustomerAnalytics> {
    const response = await analyticsApi.get('/customers', { params: dateRange })
    return response.data.data
  },

  // Chef Analytics
  async getChefAnalytics(dateRange?: AnalyticsDateRange): Promise<ChefAnalytics> {
    const response = await analyticsApi.get('/chefs', { params: dateRange })
    return response.data.data
  },

  // Operational Analytics
  async getOperationalAnalytics(dateRange: AnalyticsDateRange): Promise<OperationalAnalytics> {
    const response = await analyticsApi.get('/operations', { params: dateRange })
    return response.data.data
  },

  // Get analytics summary for multiple periods
  async getAnalyticsSummary(periods: string[] = ['today', 'week', 'month']) {
    const response = await analyticsApi.get('/summary', { params: { periods: periods.join(',') } })
    return response.data.data
  },

  // Export analytics data
  async exportAnalytics(type: 'revenue' | 'customers' | 'chefs' | 'operations', dateRange: AnalyticsDateRange): Promise<Blob> {
    const response = await analyticsApi.get(`/export/${type}`, {
      params: dateRange,
      responseType: 'blob'
    })
    return response.data
  }
}

// Helper function to generate date ranges
export const generateDateRange = (period: 'today' | 'week' | 'month' | 'quarter' | 'year'): AnalyticsDateRange => {
  const now = new Date()
  const startDate = new Date()
  
  switch (period) {
    case 'today':
      startDate.setHours(0, 0, 0, 0)
      return {
        startDate: startDate.toISOString(),
        endDate: now.toISOString(),
        period: 'daily'
      }
    
    case 'week':
      startDate.setDate(now.getDate() - 7)
      return {
        startDate: startDate.toISOString(),
        endDate: now.toISOString(),
        period: 'daily'
      }
    
    case 'month':
      startDate.setMonth(now.getMonth() - 1)
      return {
        startDate: startDate.toISOString(),
        endDate: now.toISOString(),
        period: 'weekly'
      }
    
    case 'quarter':
      startDate.setMonth(now.getMonth() - 3)
      return {
        startDate: startDate.toISOString(),
        endDate: now.toISOString(),
        period: 'monthly'
      }
    
    case 'year':
      startDate.setFullYear(now.getFullYear() - 1)
      return {
        startDate: startDate.toISOString(),
        endDate: now.toISOString(),
        period: 'monthly'
      }
    
    default:
      return generateDateRange('month')
  }
}

export default analytics