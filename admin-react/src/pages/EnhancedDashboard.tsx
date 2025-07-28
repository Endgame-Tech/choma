import React from 'react'
import { useState, useEffect } from 'react'
import { analytics, generateDateRange, type EnhancedDashboardStats, type RevenueAnalytics, type CustomerAnalytics, type ChefAnalytics, type OperationalAnalytics } from '../services/analyticsApi'
import AnalyticsCard from '../components/analytics/AnalyticsCard'
import RevenueChart from '../components/analytics/RevenueChart'
import CustomerInsights from '../components/analytics/CustomerInsights'
import ChefPerformanceCard from '../components/analytics/ChefPerformanceCard'
import OperationalMetrics from '../components/analytics/OperationalMetrics'

type DashboardPeriod = 'today' | 'week' | 'month' | 'quarter' | 'year'

const EnhancedDashboard: React.FC = () => {
  // State management
  const [dashboardStats, setDashboardStats] = useState<EnhancedDashboardStats | null>(null)
  const [revenueData, setRevenueData] = useState<RevenueAnalytics | null>(null)
  const [customerData, setCustomerData] = useState<CustomerAnalytics | null>(null)
  const [chefData, setChefData] = useState<ChefAnalytics | null>(null)
  const [operationalData, setOperationalData] = useState<OperationalAnalytics | null>(null)
  
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedPeriod, setSelectedPeriod] = useState<DashboardPeriod>('month')
  const [refreshing, setRefreshing] = useState(false)

  // Fetch all analytics data
  const fetchAnalyticsData = async (period: DashboardPeriod) => {
    try {
      setRefreshing(true)
      setError(null)
      
      const dateRange = generateDateRange(period)
      
      // Fetch all analytics data in parallel
      const [dashboard, revenue, customers, chefs, operations] = await Promise.all([
        analytics.getEnhancedDashboardStats(),
        analytics.getRevenueAnalytics(dateRange),
        analytics.getCustomerAnalytics(dateRange),
        analytics.getChefAnalytics(dateRange),
        analytics.getOperationalAnalytics(dateRange)
      ])

      setDashboardStats(dashboard)
      setRevenueData(revenue)
      setCustomerData(customers)
      setChefData(chefs)
      setOperationalData(operations)
      
    } catch (err) {
      console.error('Analytics fetch error:', err)
      setError(err instanceof Error ? err.message : 'Failed to load analytics data')
      
      // Fallback to mock data for demonstration
      setMockData()
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  // Mock data for demonstration (remove in production)
  const setMockData = () => {
    setDashboardStats({
      overview: {
        totalUsers: 1245,
        activeUsers: 892,
        newUsersToday: 23,
        totalOrders: 5678,
        ordersToday: 45,
        totalRevenue: 2450000,
        revenueToday: 89500,
        totalChefs: 89,
        activeChefs: 67,
        totalMealPlans: 24,
        avgOrderValue: 3200,
        customerSatisfaction: 4.6
      },
      growth: {
        userGrowth: 12.5,
        orderGrowth: 18.7,
        revenueGrowth: 22.3,
        chefGrowth: 8.9
      },
      realTime: {
        ordersInProgress: 12,
        chefsOnline: 34,
        pendingOrders: 8,
        activeDeliveries: 15
      },
      insights: [
        {
          type: 'positive',
          title: 'Revenue Growth',
          message: 'Revenue increased by 22% compared to last month',
          value: '₦2.45M'
        },
        {
          type: 'neutral',
          title: 'Chef Utilization',
          message: 'Average chef utilization is at 75%',
          value: '75%'
        }
      ]
    })

    setRevenueData({
      totalRevenue: 2450000,
      previousPeriodRevenue: 2000000,
      revenueGrowth: 22.5,
      averageOrderValue: 3200,
      revenueByPeriod: [
        { date: '2024-01-01', revenue: 89000, orders: 28 },
        { date: '2024-01-02', revenue: 92000, orders: 31 },
        { date: '2024-01-03', revenue: 76000, orders: 24 },
        { date: '2024-01-04', revenue: 105000, orders: 35 },
        { date: '2024-01-05', revenue: 98000, orders: 32 }
      ],
      revenueByCategory: [
        { category: 'Lunch', revenue: 1200000, percentage: 49 },
        { category: 'Dinner', revenue: 800000, percentage: 33 },
        { category: 'Breakfast', revenue: 450000, percentage: 18 }
      ],
      revenueByPaymentMethod: [
        { method: 'Card', revenue: 1500000, count: 3200 },
        { method: 'Transfer', revenue: 800000, count: 1800 },
        { method: 'Cash', revenue: 150000, count: 680 }
      ]
    })

    setCustomerData({
      totalCustomers: 1245,
      newCustomers: 156,
      activeCustomers: 892,
      customerGrowth: 12.5,
      customerRetention: 78,
      customerLifetimeValue: 45000,
      customerSegments: [
        { name: 'High Value', users: 187, percentage: 15, color: '#10B981', avgOrderValue: 8500, totalRevenue: 1587500 },
        { name: 'Regular', users: 498, percentage: 40, color: '#3B82F6', avgOrderValue: 3200, totalRevenue: 1593600 },
        { name: 'Occasional', users: 374, percentage: 30, color: '#F59E0B', avgOrderValue: 1800, totalRevenue: 673200 },
        { name: 'New', users: 186, percentage: 15, color: '#8B5CF6', avgOrderValue: 2100, totalRevenue: 390600 }
      ],
      customersByLocation: [
        { location: 'Lagos', customers: 567, revenue: 1800000 },
        { location: 'Abuja', customers: 234, revenue: 750000 },
        { location: 'Port Harcourt', customers: 178, revenue: 580000 }
      ],
      churnRate: 8.5
    })

    setChefData({
      totalChefs: 89,
      activeChefs: 67,
      averageRating: 4.6,
      totalCapacity: 445,
      currentUtilization: 75,
      topPerformingChefs: [
        {
          _id: '1',
          chefId: 'CHEF001',
          fullName: 'Chef Adebayo',
          email: 'adebayo@example.com',
          phone: '+234123456789',
          status: "Active", // Correctly typed as one of the allowed literals
          rating: 4.9,
          totalOrdersCompleted: 234,
          currentCapacity: 4,
          maxCapacity: 5,
          availability: 'Available' as "Available" | "Busy" | "Offline",
          location: { city: 'Lagos', area: 'Victoria Island' },
          joinDate: '2023-01-15',
          completionRate: 98,
          avgDeliveryTime: 38,
          ordersThisMonth: 23,
          earningsThisMonth: 185000,
          customerSatisfaction: 4.9,
          specialties: ['Nigerian Cuisine', 'Continental'],
          experience: 8
        }
      ] as {
        _id: string;
        chefId: string;
        fullName: string;
        email: string;
        phone: string;
        status: "Active" | "Pending" | "Inactive" | "Suspended";
        rating: number;
        totalOrdersCompleted: number;
        currentCapacity: number;
        maxCapacity: number;
        availability: "Available" | "Busy" | "Offline";
        location: { city: string; area: string };
        joinDate: string;
        completionRate: number;
        avgDeliveryTime: number;
        ordersThisMonth: number;
        earningsThisMonth: number;
        customerSatisfaction: number;
        specialties: string[];
        experience: number;
      }[],
      chefPerformanceMetrics: {
        averageCompletionRate: 94,
        averageDeliveryTime: 42,
        averageCustomerRating: 4.6
      }
    })

    setOperationalData({
      averageOrderValue: 3200,
      averageDeliveryTime: 42,
      chefUtilization: 75,
      customerSatisfaction: 4.6,
      orderFulfillmentRate: 94,
      cancellationRate: 6,
      peakHours: [
        { hour: '12:00', orders: 45 },
        { hour: '13:00', orders: 52 },
        { hour: '19:00', orders: 38 },
        { hour: '20:00', orders: 41 }
      ],
      popularMeals: [
        { name: 'Jollof Rice with Chicken', orders: 234, revenue: 748800 },
        { name: 'Egusi Soup with Pounded Yam', orders: 189, revenue: 567000 },
        { name: 'Fried Rice with Plantain', orders: 156, revenue: 374400 }
      ],
      ordersByStatus: [
        { status: 'Completed', count: 4567, percentage: 80 },
        { status: 'In Progress', count: 345, percentage: 6 },
        { status: 'Pending', count: 234, percentage: 4 },
        { status: 'Cancelled', count: 532, percentage: 10 }
      ],
      dailyOrderTrends: [
        { date: '2024-01-01', orders: 45, completedOrders: 42, cancelledOrders: 3 },
        { date: '2024-01-02', orders: 52, completedOrders: 49, cancelledOrders: 3 },
        { date: '2024-01-03', orders: 38, completedOrders: 35, cancelledOrders: 3 }
      ]
    })
  }

  // Initialize data on component mount
  useEffect(() => {
    fetchAnalyticsData(selectedPeriod)
  }, [selectedPeriod])

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0
    }).format(amount)
  }

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading analytics dashboard...</p>
        </div>
      </div>
    )
  }

  // Error state
  if (error && !dashboardStats) {
    return (
      <div className="bg-red-50 border border-red-200 p-4 rounded-lg">
        <h3 className="text-red-800 font-medium">Error loading analytics</h3>
        <p className="text-red-600">{error}</p>
        <button 
          onClick={() => fetchAnalyticsData(selectedPeriod)}
          className="mt-2 text-sm text-red-600 hover:text-red-800 underline"
        >
          Try again
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-semibold text-gray-900">Analytics Dashboard</h1>
          <p className="text-gray-600">Comprehensive insights into your business performance</p>
        </div>
        
        <div className="flex items-center space-x-3">
          {/* Period Selector */}
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value as DashboardPeriod)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="today">Today</option>
            <option value="week">Last 7 Days</option>
            <option value="month">Last 30 Days</option>
            <option value="quarter">Last 3 Months</option>
            <option value="year">Last Year</option>
          </select>
          
          {/* Refresh Button */}
          <button
            onClick={() => fetchAnalyticsData(selectedPeriod)}
            disabled={refreshing}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {refreshing ? '🔄' : '↻'} Refresh
          </button>
        </div>
      </div>

      {/* Key Metrics Cards */}
      {dashboardStats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <AnalyticsCard
            title="Total Revenue"
            value={formatCurrency(dashboardStats.overview.totalRevenue)}
            change={{
              value: dashboardStats.growth.revenueGrowth,
              period: 'last month',
              isPositive: dashboardStats.growth.revenueGrowth > 0
            }}
            icon="💰"
            color="green"
            subtitle={`${formatCurrency(dashboardStats.overview.revenueToday)} today`}
          />
          
          <AnalyticsCard
            title="Total Orders"
            value={dashboardStats.overview.totalOrders}
            change={{
              value: dashboardStats.growth.orderGrowth,
              period: 'last month',
              isPositive: dashboardStats.growth.orderGrowth > 0
            }}
            icon="📋"
            color="blue"
            subtitle={`${dashboardStats.overview.ordersToday} today`}
          />
          
          <AnalyticsCard
            title="Active Customers"
            value={dashboardStats.overview.activeUsers}
            change={{
              value: dashboardStats.growth.userGrowth,
              period: 'last month',
              isPositive: dashboardStats.growth.userGrowth > 0
            }}
            icon="👥"
            color="purple"
            subtitle={`${dashboardStats.overview.newUsersToday} new today`}
          />
          
          <AnalyticsCard
            title="Active Chefs"
            value={`${dashboardStats.overview.activeChefs}/${dashboardStats.overview.totalChefs}`}
            change={{
              value: dashboardStats.growth.chefGrowth,
              period: 'last month',
              isPositive: dashboardStats.growth.chefGrowth > 0
            }}
            icon="👨‍🍳"
            color="yellow"
            subtitle={`${dashboardStats.realTime.chefsOnline} online now`}
          />
        </div>
      )}

      {/* Real-time Status */}
      {dashboardStats && (
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Real-time Status</h3>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="text-center p-3 bg-blue-50 rounded-lg">
              <p className="text-2xl font-bold text-blue-600">{dashboardStats.realTime.ordersInProgress}</p>
              <p className="text-sm text-gray-600">Orders in Progress</p>
            </div>
            <div className="text-center p-3 bg-green-50 rounded-lg">
              <p className="text-2xl font-bold text-green-600">{dashboardStats.realTime.chefsOnline}</p>
              <p className="text-sm text-gray-600">Chefs Online</p>
            </div>
            <div className="text-center p-3 bg-yellow-50 rounded-lg">
              <p className="text-2xl font-bold text-yellow-600">{dashboardStats.realTime.pendingOrders}</p>
              <p className="text-sm text-gray-600">Pending Orders</p>
            </div>
            <div className="text-center p-3 bg-purple-50 rounded-lg">
              <p className="text-2xl font-bold text-purple-600">{dashboardStats.realTime.activeDeliveries}</p>
              <p className="text-sm text-gray-600">Active Deliveries</p>
            </div>
          </div>
        </div>
      )}

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Chart */}
        {revenueData && (
          <RevenueChart
            data={revenueData.revenueByPeriod}
            period={generateDateRange(selectedPeriod).period}
          />
        )}
        
        {/* Customer Insights */}
        {customerData && (
          <CustomerInsights
            segments={customerData.customerSegments}
            totalCustomers={customerData.totalCustomers}
          />
        )}
      </div>

      {/* Operational Metrics */}
      {operationalData && (
        <OperationalMetrics data={operationalData} />
      )}

      {/* Chef Performance */}
      {chefData && chefData.topPerformingChefs.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Top Performing Chefs</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {chefData.topPerformingChefs.slice(0, 6).map((chef) => (
              <ChefPerformanceCard
                key={chef._id}
                chef={{
                  ...chef,
                  status: chef.status as "Active" | "Pending" | "Inactive" | "Suspended",
                  availability: chef.availability as "Available" | "Busy" | "Offline"
                }}
                onClick={() => {
                  // Navigate to chef details
                  console.log('Navigate to chef:', chef._id)
                }}
              />
            ))}
          </div>
        </div>
      )}

      {/* Insights */}
      {dashboardStats && dashboardStats.insights.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Key Insights</h3>
          <div className="space-y-4">
            {dashboardStats.insights.map((insight, index) => (
              <div 
                key={index}
                className={`p-4 rounded-lg border-l-4 ${
                  insight.type === 'positive' 
                    ? 'bg-green-50 border-green-400' 
                    : insight.type === 'negative'
                    ? 'bg-red-50 border-red-400'
                    : 'bg-blue-50 border-blue-400'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium text-gray-900">{insight.title}</h4>
                    <p className="text-sm text-gray-600">{insight.message}</p>
                  </div>
                  {insight.value && (
                    <div className={`text-lg font-bold ${
                      insight.type === 'positive' 
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
    </div>
  )
}

export default EnhancedDashboard;