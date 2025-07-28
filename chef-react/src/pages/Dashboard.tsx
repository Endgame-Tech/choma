import React, { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { dashboardApi, ordersApi } from '../services/api'
import type { ChefDashboardStats, Order } from '../types'

export default function Dashboard() {
  const { chef } = useAuth()
  const [stats, setStats] = useState<ChefDashboardStats | null>(null)
  const [recentOrders, setRecentOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true)
        setError(null)

        // Fetch dashboard stats and recent orders in parallel
        const [dashboardStats, ordersData] = await Promise.all([
          dashboardApi.getStats().catch(() => null),
          ordersApi.getMyOrders({ limit: 5 }).catch(() => ({ orders: [] }))
        ])

        setStats(dashboardStats)
        setRecentOrders(ordersData.orders || [])
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load dashboard data')
      } finally {
        setLoading(false)
      }
    }

    fetchDashboardData()
  }, [])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0
    }).format(amount)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-center">
          <div className="text-red-400 mr-3">⚠️</div>
          <div>
            <h3 className="text-red-800 font-medium">Error loading dashboard</h3>
            <p className="text-red-600">{error}</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div>
      {/* Welcome Section */}
      <div className="mb-6">
        <h1 className="text-3xl font-semibold text-gray-900">
          Welcome back, {chef?.fullName}! 👋
        </h1>
        <p className="text-gray-600">Here's what's happening with your orders today.</p>
      </div>

      {/* Status Alert */}
      {chef?.status !== 'Active' && (
        <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-center">
            <div className="text-yellow-400 mr-3">⚠️</div>
            <div>
              <h3 className="text-yellow-800 font-medium">Account Status: {chef?.status}</h3>
              <p className="text-yellow-700 text-sm">
                {chef?.status === 'Pending' 
                  ? 'Your application is being reviewed. You\'ll be notified once approved.' 
                  : 'Please contact support for more information about your account status.'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Orders</p>
              <p className="text-3xl font-semibold text-gray-900">
                {stats?.totalOrders?.toLocaleString() || '0'}
              </p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
              <span className="text-2xl">📋</span>
            </div>
          </div>
          <div className="mt-2">
            <span className="text-sm text-gray-600">
              {stats?.completedOrders || 0} completed
            </span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Pending Orders</p>
              <p className="text-3xl font-semibold text-orange-600">
                {stats?.pendingOrders?.toLocaleString() || '0'}
              </p>
            </div>
            <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
              <span className="text-2xl">⏳</span>
            </div>
          </div>
          <div className="mt-2">
            <span className="text-sm text-gray-600">
              {stats?.inProgressOrders || 0} in progress
            </span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Earnings</p>
              <p className="text-3xl font-semibold text-green-600">
                {stats?.totalEarnings ? formatCurrency(stats.totalEarnings) : '₦0'}
              </p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
              <span className="text-2xl">💰</span>
            </div>
          </div>
          <div className="mt-2">
            <span className="text-sm text-gray-600">
              This month: {stats?.currentMonthEarnings ? formatCurrency(stats.currentMonthEarnings) : '₦0'}
            </span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Rating</p>
              <p className="text-3xl font-semibold text-yellow-600">
                {stats?.averageRating?.toFixed(1) || chef?.rating?.toFixed(1) || '0.0'}
              </p>
            </div>
            <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center">
              <span className="text-2xl">⭐</span>
            </div>
          </div>
          <div className="mt-2">
            <span className="text-sm text-gray-600">
              Based on {chef?.totalOrdersCompleted || 0} reviews
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Orders */}
        <div className="lg:col-span-2 bg-white rounded-lg shadow-sm border">
          <div className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Orders</h3>
            {recentOrders.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <div className="text-4xl mb-2">📋</div>
                <p>No recent orders</p>
              </div>
            ) : (
              <div className="space-y-4">
                {recentOrders.map((order) => (
                  <div key={order._id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50">
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium text-gray-900">#{order.orderNumber}</h4>
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                          order.orderStatus === 'Completed' || order.orderStatus === 'Delivered'
                            ? 'bg-green-100 text-green-800'
                            : order.orderStatus === 'InProgress' || order.orderStatus === 'Preparing'
                            ? 'bg-blue-100 text-blue-800'
                            : order.orderStatus === 'Cancelled'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {order.orderStatus}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mb-1">
                        {order.customer?.fullName || 'Unknown Customer'}
                      </p>
                      <p className="text-sm font-medium text-gray-900">
                        {formatCurrency(order.totalAmount)}
                      </p>
                      {order.deliveryDate && (
                        <p className="text-xs text-gray-500 mt-1">
                          Delivery: {new Date(order.deliveryDate).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div className="mt-4 text-center">
              <a
                href="/orders"
                className="text-blue-600 hover:text-blue-800 text-sm font-medium"
              >
                View all orders →
              </a>
            </div>
          </div>
        </div>

        {/* Quick Actions & Info */}
        <div className="space-y-6">
          {/* Capacity Card */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Current Capacity</h3>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm text-gray-600 mb-2">
                  <span>Orders in Progress</span>
                  <span>{stats?.currentCapacity || chef?.currentCapacity || 0}/{stats?.maxCapacity || chef?.maxCapacity || 0}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div 
                    className="bg-blue-500 h-3 rounded-full transition-all"
                    style={{ 
                      width: `${Math.min(((stats?.currentCapacity || chef?.currentCapacity || 0) / (stats?.maxCapacity || chef?.maxCapacity || 1)) * 100, 100)}%` 
                    }}
                  ></div>
                </div>
              </div>
              <div className="text-sm text-gray-600">
                <p>You can take {Math.max((stats?.maxCapacity || chef?.maxCapacity || 0) - (stats?.currentCapacity || chef?.currentCapacity || 0), 0)} more orders</p>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
            <div className="space-y-3">
              <a
                href="/orders"
                className="block w-full text-left px-4 py-3 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
              >
                <span className="font-medium text-blue-700">View My Orders</span>
                <p className="text-sm text-blue-600">Check and update order status</p>
              </a>
              <a
                href="/profile"
                className="block w-full text-left px-4 py-3 bg-green-50 hover:bg-green-100 rounded-lg transition-colors"
              >
                <span className="font-medium text-green-700">Update Profile</span>
                <p className="text-sm text-green-600">Manage your chef profile</p>
              </a>
              <a
                href="/earnings"
                className="block w-full text-left px-4 py-3 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors"
              >
                <span className="font-medium text-purple-700">View Earnings</span>
                <p className="text-sm text-purple-600">Track payments and earnings</p>
              </a>
            </div>
          </div>

          {/* Pending Payments */}
          {stats?.pendingPayments && stats.pendingPayments > 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-center">
                <div className="text-yellow-400 mr-3">💳</div>
                <div>
                  <h4 className="text-yellow-800 font-medium">Pending Payment</h4>
                  <p className="text-yellow-700 text-sm">
                    {formatCurrency(stats.pendingPayments)} waiting to be processed
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}