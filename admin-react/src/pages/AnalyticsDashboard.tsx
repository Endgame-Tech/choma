import React from 'react'
import { useState, useEffect, useCallback } from 'react'
import { Line, Bar, Doughnut } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  Filler
} from 'chart.js'
import { analyticsApi } from '../services/analyticsApi'
import { dashboardApi } from '../services/api'
import { useCachedApi } from '../hooks/useCachedApi'
import { CACHE_DURATIONS } from '../services/cacheService'
// import AnalyticsCard from '../components/analytics/AnalyticsCard' // Replaced with Dashboard-style cards

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  Filler
)

interface KPIData {
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

interface ChartData {
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

interface BusinessInsights {
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

type DashboardPeriod = 'today' | 'week' | 'month' | 'quarter' | 'year'

const AnalyticsDashboard: React.FC = () => {
  const [chartData, setChartData] = useState<ChartData | null>(null)
  const [insights, setInsights] = useState<BusinessInsights | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedPeriod, setSelectedPeriod] = useState<DashboardPeriod>('month')
  const [refreshing, setRefreshing] = useState(false)

  // Get time range string for API calls
  const getTimeRange = useCallback((period: DashboardPeriod) => {
    return period === 'today' ? '1d' :
      period === 'week' ? '7d' :
        period === 'month' ? '30d' :
          period === 'quarter' ? '90d' : '1y'
  }, [])

  // Cached KPI data with fallback to dashboard stats
  const { 
    data: kpiData, 
    loading: kpiLoading,
    refetch: refetchKpiData 
  } = useCachedApi(
    async () => {
      const timeRange = getTimeRange(selectedPeriod)
      try {
        const kpis = await analyticsApi.getKPIData(timeRange)
        if (kpis && kpis.overview) {
          return kpis
        } else {
          throw new Error('Invalid KPI data')
        }
      } catch (analyticsError) {
        console.log('Advanced KPI analytics not available, falling back to basic dashboard data')
        const dashboardStats = await dashboardApi.getStats()

        if (dashboardStats && dashboardStats.overview) {
          const basicKpiData: KPIData = {
            overview: {
              totalRevenue: dashboardStats.overview.totalRevenue || 0,
              totalOrders: dashboardStats.overview.totalOrders || 0,
              activeCustomers: dashboardStats.overview.activeUsers || 0,
              totalChefs: 0,
              avgOrderValue: dashboardStats.overview.totalRevenue / Math.max(dashboardStats.overview.totalOrders, 1) || 0,
              revenueToday: 0,
              ordersToday: 0,
              newCustomersToday: 0,
              chefsOnline: 0
            },
            growth: { revenueGrowth: 0, orderGrowth: 0, customerGrowth: 0, chefGrowth: 0 },
            realTime: { ordersInProgress: 0, pendingOrders: 0, activeDeliveries: 0, completedOrdersToday: 0 }
          }
          return basicKpiData
        }
        throw new Error('Failed to load analytics data')
      }
    },
    {
      cacheKey: `analytics-kpi-${selectedPeriod}`,
      cacheDuration: CACHE_DURATIONS.ANALYTICS,
      immediate: true,
      onError: (err) => setError(err instanceof Error ? err.message : 'Failed to load KPI data')
    }
  )

  // Debug state
  console.log('Analytics Dashboard State:', { loading, error, kpiData: !!kpiData, chartData: !!chartData, insights: !!insights })

  // Cached charts data
  const {
    loading: chartsLoading,
    refetch: refetchChartData
  } = useCachedApi(
    async () => {
      const timeRange = getTimeRange(selectedPeriod)
      try {
        const charts = await analyticsApi.getChartsData(timeRange)
        if (charts) {
          return charts
        } else {
          throw new Error('Invalid charts data')
        }
      } catch (error) {
        console.log('Charts data not available')
        return null
      }
    },
    {
      cacheKey: `analytics-charts-${selectedPeriod}`,
      cacheDuration: CACHE_DURATIONS.ANALYTICS,
      immediate: true,
      onSuccess: (data) => setChartData(data),
      onError: () => setChartData(null)
    }
  )

  // Cached insights data
  const {
    loading: insightsLoading,
    refetch: refetchInsights
  } = useCachedApi(
    async () => {
      const timeRange = getTimeRange(selectedPeriod)
      try {
        const businessInsights = await analyticsApi.getBusinessIntelligence(timeRange)
        if (businessInsights) {
          return businessInsights
        } else {
          throw new Error('Invalid insights data')
        }
      } catch (error) {
        console.log('Insights data not available')
        return null
      }
    },
    {
      cacheKey: `analytics-insights-${selectedPeriod}`,
      cacheDuration: CACHE_DURATIONS.ANALYTICS,
      immediate: true,
      onSuccess: (data) => setInsights(data),
      onError: () => setInsights(null)
    }
  )

  // Refresh function for manual refresh
  const refreshAnalyticsData = useCallback(async () => {
    setRefreshing(true)
    setError(null)
    
    try {
      // Force refresh all cached data
      await Promise.all([
        refetchKpiData(),
        refetchChartData(),
        refetchInsights()
      ])
    } catch (error) {
      console.error('Failed to refresh analytics data:', error)
      setError(error instanceof Error ? error.message : 'Failed to refresh analytics data')
    } finally {
      setRefreshing(false)
    }
  }, [refetchKpiData, refetchChartData, refetchInsights])

  // Update loading state based on critical data
  useEffect(() => {
    setLoading(kpiLoading)
  }, [kpiLoading])

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0
    }).format(amount)
  }

  // Format percentage
  const formatPercentage = (value: number) => {
    return `${value > 0 ? '+' : ''}${value.toFixed(1)}%`
  }

  // Chart color schemes
  const chartColors = {
    primary: '#3B82F6',
    success: '#10B981',
    warning: '#F59E0B',
    danger: '#EF4444',
    info: '#8B5CF6',
    gradient: ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6']
  }

  // Only show initial loading if all critical data is loading
  if (loading && kpiLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-neutral-200">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  // Show error notification if there's an error, but still display the dashboard
  const showErrorNotification = error !== null

  return (
    <div className="min-h-screen  p-4 lg:p-6 space-y-8">
      {/* Error Notification */}
      {showErrorNotification && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-amber-100 dark:bg-amber-800 rounded-lg flex items-center justify-center">
                  <i className="fi fi-sr-exclamation text-amber-600 dark:text-amber-300"></i>
                </div>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-amber-800 dark:text-amber-300">Analytics Data Notice</h3>
                <p className="text-sm text-amber-700 dark:text-amber-400 mt-1">{error}</p>
              </div>
            </div>
            <button
              onClick={refreshAnalyticsData}
              disabled={refreshing}
              className="inline-flex items-center space-x-1 text-sm font-medium text-amber-700 dark:text-amber-300 hover:text-amber-900 dark:hover:text-amber-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <i className={`fi fi-sr-refresh text-xs ${refreshing ? 'animate-spin' : ''}`}></i>
              <span>{refreshing ? 'Retrying...' : 'Retry'}</span>
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 mb-8">
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
            <i className="fi fi-sr-stats text-white text-xl"></i>
          </div>
          <div>
            <h1 className="text-3xl lg:text-4xl font-bold text-gray-900 dark:text-neutral-100 tracking-tight">
              Advanced Analytics
            </h1>
            <p className="text-gray-600 dark:text-neutral-300 mt-1 flex items-center space-x-2">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
              <span>Real-time business intelligence and performance insights</span>
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          {/* Period Selector */}
          <div className="flex items-center space-x-2">
            <i className="fi fi-sr-calendar text-gray-500 dark:text-neutral-400"></i>
            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value as DashboardPeriod)}
              aria-label="Select time period"
              title="Choose time period for analytics data"
              className="px-4 py-2.5 bg-white/90 dark:bg-neutral-800/90 border border-gray-200 dark:border-neutral-600 rounded-lg text-gray-900 dark:text-neutral-100 font-medium focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 min-w-[140px]"
            >
              <option value="today">Today</option>
              <option value="week">Last 7 Days</option>
              <option value="month">Last 30 Days</option>
              <option value="quarter">Last 3 Months</option>
              <option value="year">Last Year</option>
            </select>
          </div>

          {/* Refresh Button */}
          <button
            onClick={refreshAnalyticsData}
            disabled={refreshing}
            className="inline-flex items-center justify-center space-x-2 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 disabled:from-gray-400 disabled:to-gray-500 text-white font-medium rounded-lg shadow-sm hover:shadow-md transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-70 min-w-[100px]"
          >
            <i className={`fi fi-sr-refresh text-sm ${refreshing ? 'animate-spin' : ''}`}></i>
            <span>{refreshing ? 'Loading...' : 'Refresh'}</span>
          </button>
        </div>
      </div>

      {/* Key Performance Indicators */}
      {kpiLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white/90 dark:bg-neutral-800/90 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-neutral-700 animate-pulse">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="h-4 bg-gray-300 dark:bg-neutral-600 rounded w-20 mb-2"></div>
                  <div className="h-8 bg-gray-300 dark:bg-neutral-600 rounded w-24 mb-2"></div>
                  <div className="h-3 bg-gray-300 dark:bg-neutral-600 rounded w-16"></div>
                </div>
                <div className="w-12 h-12 bg-gray-300 dark:bg-neutral-600 rounded-xl"></div>
              </div>
            </div>
          ))}
        </div>
      ) : kpiData && kpiData.overview && kpiData.growth && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white/95 dark:bg-neutral-800/95 backdrop-blur-sm p-6 rounded-xl shadow-lg border border-gray-200/50 dark:border-neutral-700/50 hover:shadow-xl transition-all duration-300 group">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-600 dark:text-neutral-300 mb-2">Total Revenue</p>
                <p className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-neutral-100 mb-1">
                  {formatCurrency(kpiData.overview.totalRevenue || 0)}
                </p>
                <p className="text-xs text-gray-500 dark:text-neutral-400 flex items-center space-x-1">
                  <i className="fi fi-sr-time-quarter-to text-xs"></i>
                  <span>{formatCurrency(kpiData.overview.revenueToday || 0)} today</span>
                </p>
              </div>
              <div className="w-14 h-14 bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                <i className="fi fi-sr-usd-circle text-2xl text-white"></i>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-gray-100 dark:border-neutral-700">
              <div className="flex items-center space-x-2">
                <i className={`fi fi-sr-arrow-${(kpiData.growth.revenueGrowth || 0) > 0 ? 'up' : 'down'} text-xs ${(kpiData.growth.revenueGrowth || 0) > 0 ? 'text-green-600' : 'text-red-600'}`}></i>
                <span className={`text-sm font-medium ${(kpiData.growth.revenueGrowth || 0) > 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatPercentage(kpiData.growth.revenueGrowth || 0)}
                </span>
                <span className="text-xs text-gray-500 dark:text-neutral-400">vs last period</span>
              </div>
            </div>
          </div>

          <div className="bg-white/95 dark:bg-neutral-800/95 backdrop-blur-sm p-6 rounded-xl shadow-lg border border-gray-200/50 dark:border-neutral-700/50 hover:shadow-xl transition-all duration-300 group">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-600 dark:text-neutral-300 mb-2">Total Orders</p>
                <p className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-neutral-100 mb-1">
                  {(kpiData.overview.totalOrders || 0).toLocaleString()}
                </p>
                <p className="text-xs text-gray-500 dark:text-neutral-400 flex items-center space-x-1">
                  <i className="fi fi-sr-time-quarter-to text-xs"></i>
                  <span>{kpiData.overview.ordersToday || 0} today</span>
                </p>
              </div>
              <div className="w-14 h-14 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                <i className="fi fi-sr-clipboard-list text-2xl text-white"></i>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-gray-100 dark:border-neutral-700">
              <div className="flex items-center space-x-2">
                <i className={`fi fi-sr-arrow-${(kpiData.growth.orderGrowth || 0) > 0 ? 'up' : 'down'} text-xs ${(kpiData.growth.orderGrowth || 0) > 0 ? 'text-green-600' : 'text-red-600'}`}></i>
                <span className={`text-sm font-medium ${(kpiData.growth.orderGrowth || 0) > 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatPercentage(kpiData.growth.orderGrowth || 0)}
                </span>
                <span className="text-xs text-gray-500 dark:text-neutral-400">vs last period</span>
              </div>
            </div>
          </div>

          <div className="bg-white/95 dark:bg-neutral-800/95 backdrop-blur-sm p-6 rounded-xl shadow-lg border border-gray-200/50 dark:border-neutral-700/50 hover:shadow-xl transition-all duration-300 group">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-600 dark:text-neutral-300 mb-2">Active Customers</p>
                <p className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-neutral-100 mb-1">
                  {(kpiData.overview.activeCustomers || 0).toLocaleString()}
                </p>
                <p className="text-xs text-gray-500 dark:text-neutral-400 flex items-center space-x-1">
                  <i className="fi fi-sr-user-add text-xs"></i>
                  <span>{kpiData.overview.newCustomersToday || 0} new today</span>
                </p>
              </div>
              <div className="w-14 h-14 bg-gradient-to-r from-purple-500 to-pink-600 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                <i className="fi fi-sr-users-alt text-2xl text-white"></i>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-gray-100 dark:border-neutral-700">
              <div className="flex items-center space-x-2">
                <i className={`fi fi-sr-arrow-${(kpiData.growth.customerGrowth || 0) > 0 ? 'up' : 'down'} text-xs ${(kpiData.growth.customerGrowth || 0) > 0 ? 'text-green-600' : 'text-red-600'}`}></i>
                <span className={`text-sm font-medium ${(kpiData.growth.customerGrowth || 0) > 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatPercentage(kpiData.growth.customerGrowth || 0)}
                </span>
                <span className="text-xs text-gray-500 dark:text-neutral-400">vs last period</span>
              </div>
            </div>
          </div>

          <div className="bg-white/95 dark:bg-neutral-800/95 backdrop-blur-sm p-6 rounded-xl shadow-lg border border-gray-200/50 dark:border-neutral-700/50 hover:shadow-xl transition-all duration-300 group">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-600 dark:text-neutral-300 mb-2">Avg Order Value</p>
                <p className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-neutral-100 mb-1">
                  {formatCurrency(kpiData.overview.avgOrderValue || 0)}
                </p>
                <p className="text-xs text-gray-500 dark:text-neutral-400 flex items-center space-x-1">
                  <i className="fi fi-sr-user text-xs"></i>
                  <span>{kpiData.overview.totalChefs || 0} active chefs</span>
                </p>
              </div>
              <div className="w-14 h-14 bg-gradient-to-r from-orange-500 to-red-600 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                <i className="fi fi-sr-credit-card text-2xl text-white"></i>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-gray-100 dark:border-neutral-700">
              <div className="flex items-center space-x-2">
                <i className={`fi fi-sr-arrow-${((kpiData.growth.revenueGrowth || 0) - (kpiData.growth.orderGrowth || 0)) > 0 ? 'up' : 'down'} text-xs ${((kpiData.growth.revenueGrowth || 0) - (kpiData.growth.orderGrowth || 0)) > 0 ? 'text-green-600' : 'text-red-600'}`}></i>
                <span className={`text-sm font-medium ${((kpiData.growth.revenueGrowth || 0) - (kpiData.growth.orderGrowth || 0)) > 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatPercentage((kpiData.growth.revenueGrowth || 0) - (kpiData.growth.orderGrowth || 0))}
                </span>
                <span className="text-xs text-gray-500 dark:text-neutral-400">vs last period</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Real-time Metrics */}
      {kpiData && kpiData.realTime && (
        <div className="bg-white/90 dark:bg-neutral-800/90 rounded-lg shadow-sm border border-gray-200 dark:border-neutral-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-neutral-100 mb-4">Real-time Operations</h3>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/30 rounded-lg border border-blue-200 dark:border-blue-700">
              <div className="w-8 h-8 bg-blue-100 dark:bg-blue-800 rounded-lg flex items-center justify-center mx-auto mb-2">
                <i className="fi fi-sr-time-quarter-to text-blue-600 dark:text-blue-300"></i>
              </div>
              <p className="text-3xl font-bold text-blue-600 dark:text-blue-300">{kpiData.realTime.ordersInProgress || 0}</p>
              <p className="text-sm text-gray-600 dark:text-neutral-300">Orders in Progress</p>
            </div>
            <div className="text-center p-4 bg-yellow-50 dark:bg-yellow-900/30 rounded-lg border border-yellow-200 dark:border-yellow-700">
              <div className="w-8 h-8 bg-yellow-100 dark:bg-yellow-800 rounded-lg flex items-center justify-center mx-auto mb-2">
                <i className="fi fi-sr-hourglass text-yellow-600 dark:text-yellow-300"></i>
              </div>
              <p className="text-3xl font-bold text-yellow-600 dark:text-yellow-300">{kpiData.realTime.pendingOrders || 0}</p>
              <p className="text-sm text-gray-600 dark:text-neutral-300">Pending Orders</p>
            </div>
            <div className="text-center p-4 bg-purple-50 dark:bg-purple-900/30 rounded-lg border border-purple-200 dark:border-purple-700">
              <div className="w-8 h-8 bg-purple-100 dark:bg-purple-800 rounded-lg flex items-center justify-center mx-auto mb-2">
                <i className="fi fi-sr-truck-side text-purple-600 dark:text-purple-300"></i>
              </div>
              <p className="text-3xl font-bold text-purple-600 dark:text-purple-300">{kpiData.realTime.activeDeliveries || 0}</p>
              <p className="text-sm text-gray-600 dark:text-neutral-300">Active Deliveries</p>
            </div>
            <div className="text-center p-4 bg-green-50 dark:bg-green-900/30 rounded-lg border border-green-200 dark:border-green-700">
              <div className="w-8 h-8 bg-green-100 dark:bg-green-800 rounded-lg flex items-center justify-center mx-auto mb-2">
                <i className="fi fi-sr-check-circle text-green-600 dark:text-green-300"></i>
              </div>
              <p className="text-3xl font-bold text-green-600 dark:text-green-300">{kpiData.realTime.completedOrdersToday || 0}</p>
              <p className="text-sm text-gray-600 dark:text-neutral-300">Completed Today</p>
            </div>
          </div>
        </div>
      )}

      {/* Charts Grid */}
      {chartsLoading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white/90 dark:bg-neutral-800/90 rounded-lg shadow-sm border border-gray-200 dark:border-neutral-700 p-6 animate-pulse">
              <div className="h-6 bg-gray-300 dark:bg-neutral-600 rounded w-32 mb-4"></div>
              <div className="h-64 bg-gray-300 dark:bg-neutral-600 rounded"></div>
            </div>
          ))}
        </div>
      ) : chartData ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Revenue Trend Chart */}
          {chartData.revenueChart && (
            <div className="bg-white/90 dark:bg-neutral-800/90 rounded-lg shadow-sm border border-gray-200 dark:border-neutral-700 p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Revenue Trend</h3>
              <Line
                data={{
                  labels: chartData.revenueChart.labels || [],
                  datasets: [
                    {
                      label: 'Current Period',
                      data: chartData.revenueChart.data || [],
                      borderColor: chartColors.primary,
                      backgroundColor: `${chartColors.primary}20`,
                      fill: true,
                      tension: 0.4
                    },
                    {
                      label: 'Previous Period',
                      data: chartData.revenueChart.previousPeriod || [],
                      borderColor: chartColors.warning,
                      backgroundColor: `${chartColors.warning}20`,
                      fill: false,
                      borderDash: [5, 5],
                      tension: 0.4
                    }
                  ]
                }}
                options={{
                  responsive: true,
                  plugins: {
                    legend: {
                      position: 'top'
                    }
                  },
                  scales: {
                    y: {
                      beginAtZero: true,
                      ticks: {
                        // Explicitly type value to avoid implicit any (TS7006)
                        callback: (value: string | number) => formatCurrency(Number(value))
                      }
                    }
                  }
                }}
              />
            </div>
          )}

          {/* Orders by Status */}
          {chartData.ordersByStatus && (
            <div className="bg-white/90 dark:bg-neutral-800/90 rounded-lg shadow-sm border border-gray-200 dark:border-neutral-700 p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Orders by Status</h3>
              <Doughnut
                data={{
                  labels: chartData.ordersByStatus.labels || [],
                  datasets: [{
                    data: chartData.ordersByStatus.data || [],
                    backgroundColor: chartData.ordersByStatus.colors || [],
                    borderWidth: 2,
                    borderColor: '#ffffff'
                  }]
                }}
                options={{
                  responsive: true,
                  plugins: {
                    legend: {
                      position: 'bottom'
                    }
                  }
                }}
              />
            </div>
          )}

          {/* Daily Trends */}
          {chartData.dailyTrends && (
            <div className="bg-white/90 dark:bg-neutral-800/90 rounded-lg shadow-sm border border-gray-200 dark:border-neutral-700 p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Daily Performance</h3>
              <Bar
                data={{
                  labels: chartData.dailyTrends.labels || [],
                  datasets: [
                    {
                      label: 'Orders',
                      data: chartData.dailyTrends.orders || [],
                      backgroundColor: chartColors.primary,
                      yAxisID: 'y'
                    },
                    {
                      label: 'Revenue (₦)',
                      data: chartData.dailyTrends.revenue || [],
                      backgroundColor: chartColors.success,
                      yAxisID: 'y1'
                    }
                  ]
                }}
                options={{
                  responsive: true,
                  plugins: {
                    legend: {
                      position: 'top'
                    }
                  },
                  scales: {
                    y: {
                      type: 'linear',
                      display: true,
                      position: 'left'
                    },
                    y1: {
                      type: 'linear',
                      display: true,
                      position: 'right',
                      grid: {
                        drawOnChartArea: false
                      },
                      ticks: {
                        // Explicitly type value to avoid implicit any (TS7006)
                        callback: (value: string | number) => formatCurrency(Number(value))
                      }
                    }
                  }
                }}
              />
            </div>
          )}

          {/* Customer Segments */}
          {chartData.customerSegments && (
            <div className="bg-white/90 dark:bg-neutral-800/90 rounded-lg shadow-sm border border-gray-200 dark:border-neutral-700 p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Customer Segments</h3>
              <Bar
                data={{
                  labels: chartData.customerSegments.labels || [],
                  datasets: [{
                    label: 'Customers',
                    data: chartData.customerSegments.data || [],
                    backgroundColor: chartData.customerSegments.colors || [],
                    borderRadius: 4
                  }]
                }}
                options={{
                  responsive: true,
                  plugins: {
                    legend: {
                      display: false
                    }
                  },
                  scales: {
                    y: {
                      beginAtZero: true
                    }
                  }
                }}
              />
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white/90 dark:bg-neutral-800/90 rounded-lg shadow-sm border border-gray-200 dark:border-neutral-700 p-12 text-center">
          <div className="text-gray-400 dark:text-neutral-500 mb-4">
            <i className="fi fi-sr-chart-histogram text-4xl"></i>
          </div>
          <h3 className="text-lg font-medium text-gray-600 dark:text-neutral-300 mb-2">No Chart Data Available</h3>
          <p className="text-sm text-gray-500 dark:text-neutral-400">Charts will appear here once you have orders and analytics data.</p>
        </div>
      )}

      {/* Chef Performance */}
      {chartData && chartData.chefPerformance && (
        <div className="bg-white/90 dark:bg-neutral-800/90 rounded-lg shadow-sm border border-gray-200 dark:border-neutral-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Chef Performance Analytics</h3>
          <Line
            data={{
              labels: chartData.chefPerformance.labels || [],
              datasets: [
                {
                  label: 'Completion Rate (%)',
                  data: chartData.chefPerformance.completionRate || [],
                  borderColor: chartColors.success,
                  backgroundColor: `${chartColors.success}20`,
                  yAxisID: 'y'
                },
                {
                  label: 'Customer Satisfaction',
                  data: chartData.chefPerformance.satisfaction || [],
                  borderColor: chartColors.info,
                  backgroundColor: `${chartColors.info}20`,
                  yAxisID: 'y1'
                }
              ]
            }}
            options={{
              responsive: true,
              plugins: {
                legend: {
                  position: 'top'
                }
              },
              scales: {
                y: {
                  type: 'linear',
                  display: true,
                  position: 'left',
                  max: 100
                },
                y1: {
                  type: 'linear',
                  display: true,
                  position: 'right',
                  min: 0,
                  max: 5,
                  grid: {
                    drawOnChartArea: false
                  }
                }
              }
            }}
          />
        </div>
      )}

      {/* Popular Meals */}
      {chartData && chartData.popularMeals && chartData.popularMeals.labels && chartData.popularMeals.labels.length > 0 && (
        <div className="bg-white/90 dark:bg-neutral-800/90 rounded-lg shadow-sm border border-gray-200 dark:border-neutral-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Popular Meals Performance</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50 dark:bg-neutral-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-neutral-300 uppercase tracking-wider">Meal</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-neutral-300 uppercase tracking-wider">Orders</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-neutral-300 uppercase tracking-wider">Revenue</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-neutral-300 uppercase tracking-wider">Performance</th>
                </tr>
              </thead>
              <tbody className="bg-white/90 dark:bg-neutral-800/90 divide-y divide-gray-200 dark:divide-neutral-700">
                {chartData.popularMeals.labels.map((meal, index) => (
                  <tr key={meal}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-neutral-100">{meal}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-neutral-300">{chartData.popularMeals.orders?.[index] || 0}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-neutral-300">{formatCurrency(chartData.popularMeals.revenue?.[index] || 0)}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                          style={{
                            width: `${chartData.popularMeals.orders && chartData.popularMeals.orders.length > 0
                              ? ((chartData.popularMeals.orders[index] || 0) / Math.max(...(chartData.popularMeals.orders || [1]))) * 100
                              : 0}%`
                          }}
                        ></div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Business Insights */}
      {insightsLoading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[1, 2].map((i) => (
            <div key={i} className="bg-white/90 dark:bg-neutral-800/90 rounded-lg shadow-sm border border-gray-200 dark:border-neutral-700 p-6 animate-pulse">
              <div className="h-6 bg-gray-300 dark:bg-neutral-600 rounded w-40 mb-4"></div>
              <div className="space-y-4">
                {[1, 2, 3].map((j) => (
                  <div key={j} className="p-4 bg-gray-100 dark:bg-neutral-700 rounded-lg">
                    <div className="h-4 bg-gray-300 dark:bg-neutral-600 rounded w-32 mb-2"></div>
                    <div className="h-3 bg-gray-300 dark:bg-neutral-600 rounded w-full"></div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : insights ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* AI Insights */}
          {insights.insights && insights.insights.length > 0 && (
            <div className="bg-white/90 dark:bg-neutral-800/90 rounded-lg shadow-sm border border-gray-200 dark:border-neutral-700 p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">🧠 AI-Powered Insights</h3>
              <div className="space-y-4">
                {insights.insights.map((insight, index) => (
                  <div
                    key={index}
                    className={`p-4 rounded-lg border-l-4 ${insight.type === 'positive'
                      ? 'bg-green-50 border-green-400'
                      : insight.type === 'negative'
                        ? 'bg-red-50 border-red-400'
                        : 'bg-blue-50 border-blue-400'
                      }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium text-gray-900 flex items-center gap-2">
                          {insight.title}
                          {insight.trend && (
                            <span className={`text-sm ${insight.trend > 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {formatPercentage(insight.trend)}
                            </span>
                          )}
                        </h4>
                        <p className="text-sm text-gray-600 mt-1">{insight.message}</p>
                      </div>
                      {insight.value && (
                        <div className={`text-lg font-bold ${insight.type === 'positive'
                          ? 'text-green-600'
                          : insight.type === 'negative'
                            ? 'text-red-600'
                            : 'text-blue-600'
                          }`}>
                          {insight.value}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Predictions */}
          {insights.predictions && insights.predictions.length > 0 && (
            <div className="bg-white/90 dark:bg-neutral-800/90 rounded-lg shadow-sm border border-gray-200 dark:border-neutral-700 p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">🔮 Predictive Analytics</h3>
              <div className="space-y-4">
                {insights.predictions.map((prediction, index) => (
                  <div key={index} className="p-4 bg-gray-50 dark:bg-neutral-700/50 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium text-gray-900 dark:text-neutral-100">{prediction.metric}</h4>
                      <span className="text-sm text-gray-500 dark:text-neutral-400">{prediction.timeframe}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-lg font-bold text-blue-600">
                        {prediction.metric.includes('Revenue') ? formatCurrency(prediction.prediction) : prediction.prediction.toFixed(0)}
                      </span>
                      <div className="flex items-center">
                        <span className="text-sm text-gray-500 dark:text-neutral-400 mr-2">Confidence:</span>
                        <div className="w-16 bg-gray-200 dark:bg-neutral-600 rounded-full h-2">
                          <div
                            className="bg-green-500 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${prediction.confidence}%` }}
                          ></div>
                        </div>
                        <span className="text-sm text-gray-500 dark:text-neutral-400 ml-2">{prediction.confidence}%</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white/90 dark:bg-neutral-800/90 rounded-lg shadow-sm border border-gray-200 dark:border-neutral-700 p-12 text-center">
          <div className="text-gray-400 dark:text-neutral-500 mb-4">
            <i className="fi fi-sr-brain text-4xl"></i>
          </div>
          <h3 className="text-lg font-medium text-gray-600 dark:text-neutral-300 mb-2">No Insights Available</h3>
          <p className="text-sm text-gray-500 dark:text-neutral-400">Business insights will appear here once you have sufficient data.</p>
        </div>
      )}
    </div>
  )
}

export default AnalyticsDashboard