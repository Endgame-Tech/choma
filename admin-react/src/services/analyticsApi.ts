import axios from 'axios'

// Types for the analytics API
interface ExportFilters {
  startDate?: string
  endDate?: string
  format?: 'csv' | 'xlsx' | 'pdf'
  [key: string]: unknown
}

interface UserSegmentData {
  segment: string
  count: number
  percentage: number
}

interface RevenueStreamData {
  source: string
  amount: number
  percentage: number
}

interface PerformanceMetric {
  metric: string
  value: number
  change: number
}

interface CustomerInsight {
  type: string
  value: string | number
  description: string
}

interface DateRange {
  period: string
  startDate?: string
  endDate?: string
}

// Create axios instance for analytics API
const api = axios.create({
  baseURL: import.meta.env.PROD 
    ? `${import.meta.env.VITE_API_BASE_URL}/api/admin/analytics`
    : '/api/admin/analytics',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Real Analytics API Service
export const analyticsApi = {
  // Get KPI Data (Key Performance Indicators)
  async getKPIData(timeRange: string = '30d') {
    try {
      const response = await api.get(`/kpis?timeRange=${timeRange}`)
      return (response.data as any).data
    } catch (error) {
      console.error('Error fetching KPI data:', error)
      throw error
    }
  },

  // Get Charts Data for visualizations
  async getChartsData(timeRange: string = '30d') {
    try {
      const response = await api.get(`/charts?timeRange=${timeRange}`)
      return (response.data as any).data
    } catch (error) {
      console.error('Error fetching charts data:', error)
      throw error
    }
  },

  // Get Business Intelligence insights
  async getBusinessIntelligence(timeRange: string = '30d') {
    try {
      const response = await api.get(`/business-intelligence?timeRange=${timeRange}`)
      return (response.data as any).data
    } catch (error) {
      console.error('Error fetching business intelligence:', error)
      throw error
    }
  },

  // Get User Engagement Metrics
  async getUserEngagement(timeRange: string = '30d') {
    try {
      const response = await api.get(`/user-engagement?timeRange=${timeRange}`)
      return (response.data as any).data
    } catch (error) {
      console.error('Error fetching user engagement:', error)
      throw error
    }
  },

  // Get specific chart data
  async getChartData(chartId: string, timeRange: string = '30d') {
    try {
      const response = await api.get(`/chart/${chartId}?timeRange=${timeRange}`)
      return (response.data as any).data
    } catch (error) {
      console.error('Error fetching chart data:', error)
      throw error
    }
  },

  // Export analytics report
  async exportReport(filters: ExportFilters = {}) {
    try {
      const response = await api.post('/export', filters, {
        responseType: 'blob'
      })
      return response.data
    } catch (error) {
      console.error('Error exporting report:', error)
      throw error
    }
  },

  // Get enhanced dashboard stats
  async getEnhancedDashboardStats(timeRange: string = '30d') {
    try {
      const [kpis, insights] = await Promise.all([
        this.getKPIData(timeRange),
        this.getBusinessIntelligence(timeRange)
      ])
      
      return {
        overview: kpis.overview,
        growth: kpis.growth,
        realTime: kpis.realTime,
        insights: insights.insights || []
      }
    } catch (error) {
      console.error('Error fetching enhanced dashboard stats:', error)
      throw error
    }
  },

  // Get revenue analytics
  async getRevenueAnalytics(dateRange: DateRange) {
    try {
      const response = await api.get(`/revenue?timeRange=${dateRange.period}`)
      return (response.data as any).data
    } catch (error) {
      console.error('Error fetching revenue analytics:', error)
      throw error
    }
  },

  // Get customer analytics
  async getCustomerAnalytics(dateRange: DateRange) {
    try {
      const response = await api.get(`/customers?timeRange=${dateRange.period}`)
      return (response.data as any).data
    } catch (error) {
      console.error('Error fetching customer analytics:', error)
      throw error
    }
  },

  // Get chef analytics
  async getChefAnalytics(dateRange: DateRange) {
    try {
      const response = await api.get(`/chefs?timeRange=${dateRange.period}`)
      return (response.data as any).data
    } catch (error) {
      console.error('Error fetching chef analytics:', error)
      throw error
    }
  },

  // Get operational analytics
  async getOperationalAnalytics(dateRange: DateRange) {
    try {
      const response = await api.get(`/operations?timeRange=${dateRange.period}`)
      return (response.data as any).data
    } catch (error) {
      console.error('Error fetching operational analytics:', error)
      throw error
    }
  }
}

// Utility function to generate date ranges
export const generateDateRange = (period: string) => {
  const endDate = new Date()
  const startDate = new Date()

  switch (period) {
    case 'today':
      startDate.setHours(0, 0, 0, 0)
      return { startDate: startDate.toISOString(), endDate: endDate.toISOString(), period: '1d' }
    
    case 'week':
      startDate.setDate(endDate.getDate() - 7)
      return { startDate: startDate.toISOString(), endDate: endDate.toISOString(), period: '7d' }
    
    case 'month':
      startDate.setDate(endDate.getDate() - 30)
      return { startDate: startDate.toISOString(), endDate: endDate.toISOString(), period: '30d' }
    
    case 'quarter':
      startDate.setDate(endDate.getDate() - 90)
      return { startDate: startDate.toISOString(), endDate: endDate.toISOString(), period: '90d' }
    
    case 'year':
      startDate.setFullYear(endDate.getFullYear() - 1)
      return { startDate: startDate.toISOString(), endDate: endDate.toISOString(), period: '1y' }
    
    default:
      startDate.setDate(endDate.getDate() - 30)
      return { startDate: startDate.toISOString(), endDate: endDate.toISOString(), period: '30d' }
  }
}

// Types for better TypeScript support
export interface KPIData {
  overview: {
    totalRevenue: number
    totalOrders: number
    activeCustomers: number
    totalChefs: number
    avgOrderValue: number
    revenueToday: number
    ordersToday: number
    newCustomersToday: number
    chefsOnline: number
  }
  growth: {
    revenueGrowth: number
    orderGrowth: number
    customerGrowth: number
    chefGrowth: number
  }
  realTime: {
    ordersInProgress: number
    pendingOrders: number
    activeDeliveries: number
    completedOrdersToday: number
  }
}

export interface ChartData {
  revenueChart: {
    labels: string[]
    data: number[]
    previousPeriod: number[]
  }
  ordersByStatus: {
    labels: string[]
    data: number[]
    colors: string[]
  }
  customerSegments: {
    labels: string[]
    data: number[]
    colors: string[]
  }
  chefPerformance: {
    labels: string[]
    completionRate: number[]
    satisfaction: number[]
  }
  dailyTrends: {
    labels: string[]
    orders: number[]
    revenue: number[]
  }
  popularMeals: {
    labels: string[]
    orders: number[]
    revenue: number[]
  }
}

export interface BusinessInsights {
  insights: Array<{
    type: 'positive' | 'negative' | 'neutral'
    title: string
    message: string
    value: string
    trend?: number
  }>
  predictions: Array<{
    metric: string
    prediction: number
    confidence: number
    timeframe: string
  }>
}

export default analyticsApi