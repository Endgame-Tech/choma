import React from 'react';
import { dashboardApi } from '../services/api';
import { useCachedApi } from '../hooks/useCachedApi';
import { CACHE_DURATIONS } from '../services/cacheService';
import UserActivityDashboard from '../components/UserActivityDashboard';

const Dashboard: React.FC = () => {
  const {
    data: stats,
    loading,
    error,
    refetch
  } = useCachedApi(
    () => dashboardApi.getStats().then(data => ({ data })),
    {
      cacheKey: 'dashboard-stats',
      cacheDuration: CACHE_DURATIONS.DASHBOARD_STATS,
      immediate: true
    }
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg text-gray-600 dark:text-neutral-200">Loading dashboard...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 p-4 rounded-lg">
        <h3 className="text-red-800 font-medium">Error loading dashboard</h3>
        <p className="text-red-600">{error}</p>
        <button
          onClick={refetch}
          className="mt-2 px-3 py-1 bg-red-100 hover:bg-red-200 text-red-800 rounded text-sm"
        >
          Retry
        </button>
      </div>
    );
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-semibold text-gray-900 dark:text-choma-white">Dashboard</h1>
        <p className="text-gray-600 dark:text-choma-white/70">Welcome to choma Admin Dashboard</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-6 mb-6 sm:mb-8">
        <div className="bg-white dark:bg-choma-dark-card p-6 rounded-xl shadow-sm border border-gray-200 dark:border-choma-brown/20 hover:shadow-md dark:hover:shadow-choma-orange/10 transition-all duration-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-choma-white/70">Total Orders</p>
              <p className="text-3xl font-semibold text-gray-900 dark:text-choma-white">
                {stats?.overview?.totalOrders?.toLocaleString() || '0'}
              </p>
            </div>
            <div className="w-12 h-12 bg-choma-orange/10 dark:bg-choma-orange/20 rounded-xl flex items-center justify-center">
              <i className="fi fi-sr-clipboard-list text-2xl text-choma-orange"></i>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-choma-dark-card p-6 rounded-xl shadow-sm border border-gray-200 dark:border-choma-brown/20 hover:shadow-md dark:hover:shadow-choma-orange/10 transition-all duration-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-choma-white/70">Active Users</p>
              <p className="text-3xl font-semibold text-gray-900 dark:text-choma-white">
                {stats?.overview?.activeUsers?.toLocaleString() || '0'}
              </p>
            </div>
            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-500/20 rounded-xl flex items-center justify-center">
              <i className="fi fi-sr-users-alt text-2xl text-blue-600 dark:text-blue-400"></i>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-choma-dark-card p-6 rounded-xl shadow-sm border border-gray-200 dark:border-choma-brown/20 hover:shadow-md dark:hover:shadow-choma-orange/10 transition-all duration-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-choma-white/70">Total Revenue</p>
              <p className="text-3xl font-semibold text-gray-900 dark:text-choma-white">
                {stats?.overview?.totalRevenue ? formatCurrency(stats.overview.totalRevenue) : '₦0'}
              </p>
            </div>
            <div className="w-12 h-12 bg-green-100 dark:bg-green-500/20 rounded-xl flex items-center justify-center">
              <i className="fi fi-sr-usd-circle text-2xl text-green-600 dark:text-green-400"></i>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-choma-dark-card p-6 rounded-xl shadow-sm border border-gray-200 dark:border-choma-brown/20 hover:shadow-md dark:hover:shadow-choma-orange/10 transition-all duration-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-choma-white/70">Total Subscriptions</p>
              <p className="text-3xl font-semibold text-gray-900 dark:text-choma-white">
                {stats?.overview?.totalSubscriptions?.toLocaleString() || '0'}
              </p>
            </div>
            <div className="w-12 h-12 bg-purple-100 dark:bg-purple-500/20 rounded-xl flex items-center justify-center">
              <i className="fi fi-sr-calendar text-2xl text-purple-600 dark:text-purple-400"></i>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        <div className="bg-white dark:bg-choma-dark-card p-4 sm:p-6 rounded-xl shadow-sm border border-gray-200 dark:border-choma-brown/20">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-choma-white mb-4">Recent Orders</h3>
          <div className="space-y-3">
            {stats?.recentOrders && stats.recentOrders.length > 0 ? (
              stats.recentOrders.slice(0, 5).map((order) => (
                <div key={order._id} className="flex items-center justify-between py-2">
                  <div>
                    <p className="font-medium text-gray-900 dark:text-choma-white">{order.orderNumber}</p>
                    <p className="text-sm text-gray-500 dark:text-choma-white/60">
                      {order.customer?.fullName || 'Unknown Customer'} - {order.subscription?.mealPlanId?.planName || 'No Plan'}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-gray-900 dark:text-choma-white">
                      {formatCurrency(order.totalAmount)}
                    </p>
                    <span
                      className={`inline-block px-2 py-1 text-xs rounded-full font-medium ${order.orderStatus === 'Completed' || order.orderStatus === 'Delivered'
                        ? 'bg-green-100 text-green-800 dark:bg-green-500/20 dark:text-green-400'
                        : order.orderStatus === 'Confirmed'
                          ? 'bg-blue-100 text-blue-800 dark:bg-blue-500/20 dark:text-blue-400'
                          : order.orderStatus === 'Cancelled'
                            ? 'bg-red-100 text-red-800 dark:bg-red-500/20 dark:text-red-400'
                            : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-500/20 dark:text-yellow-400'
                        }`}
                    >
                      {order.orderStatus}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-4 text-gray-500 dark:text-choma-white/60">No recent orders</div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        <div className="lg:col-span-2">
          <UserActivityDashboard />
        </div>
        <div className="bg-white dark:bg-choma-dark-card p-4 sm:p-6 rounded-xl shadow-sm border border-gray-200 dark:border-choma-brown/20">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-choma-white mb-4">Quick Actions</h3>
          <div className="space-y-3">
            <button className="w-full text-left px-4 py-3 bg-blue-50 dark:bg-blue-500/10 hover:bg-blue-100 dark:hover:bg-blue-500/20 rounded-lg transition-colors border border-blue-200 dark:border-blue-500/20">
              <span className="font-medium text-blue-700 dark:text-blue-400">View Pending Orders</span>
              <p className="text-sm text-blue-600 dark:text-blue-300/80">
                {stats?.overview?.pendingPayments || 0} orders with pending payments
              </p>
            </button>
            <button className="w-full text-left px-4 py-3 bg-yellow-50 dark:bg-yellow-500/10 hover:bg-yellow-100 dark:hover:bg-yellow-500/20 rounded-lg transition-colors border border-yellow-200 dark:border-yellow-500/20">
              <span className="font-medium text-yellow-700 dark:text-yellow-400">Failed Payments</span>
              <p className="text-sm text-yellow-600 dark:text-yellow-300/80">
                {stats?.overview?.failedPayments || 0} orders with failed payments
              </p>
            </button>
            <button className="w-full text-left px-4 py-3 bg-green-50 dark:bg-green-500/10 hover:bg-green-100 dark:hover:bg-green-500/20 rounded-lg transition-colors border border-green-200 dark:border-green-500/20">
              <span className="font-medium text-green-700 dark:text-green-400">Paid Orders</span>
              <p className="text-sm text-green-600 dark:text-green-300/80">
                {stats?.overview?.paidOrders || 0} successfully paid orders
              </p>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;