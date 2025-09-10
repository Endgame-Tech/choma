import React, { useState } from 'react';
import { useCachedApi } from '../../hooks/useCachedApi';
import { CACHE_DURATIONS } from '../../services/cacheService';
import { api } from '../../services/api';

interface SubscriptionMetrics {
  totalSubscriptions: number;
  activeSubscriptions: number;
  pausedSubscriptions: number;
  cancelledSubscriptions: number;
  newSubscriptionsThisMonth: number;
  churnRate: number;
  averageSubscriptionDuration: number;
  reactivationRate: number;
  totalRecurringRevenue: number;
  averageRevenuePerSubscription: number;
  customerLifetimeValue: number;
}

interface MealPlanPopularity {
  planId: string;
  planName: string;
  planImage: string;
  activeSubscriptions: number;
  totalRevenue: number;
  averageRating: number;
  completionRate: number;
  popularityScore: number;
  churnRate: number;
}

interface ChefPerformance {
  chefId: string;
  chefName: string;
  chefImage: string;
  activeSubscriptions: number;
  totalDeliveries: number;
  onTimeDeliveryRate: number;
  averageRating: number;
  customerRetentionRate: number;
  revenueGenerated: number;
  consistencyScore: number;
}

interface SubscriptionTrends {
  date: string;
  newSubscriptions: number;
  cancellations: number;
  reactivations: number;
  pausedSubscriptions: number;
  netGrowth: number;
}

const SubscriptionAnalyticsDashboard: React.FC = () => {
  const [selectedPeriod, setSelectedPeriod] = useState<'7d' | '30d' | '90d' | '1y'>('30d');

  // Fetch subscription metrics
  const {
    data: metricsResponse,
    loading: metricsLoading
  } = useCachedApi(
    () => Promise.resolve(api.get<SubscriptionMetrics>(`/analytics/subscription-metrics?period=${selectedPeriod}`)),
    {
      cacheKey: `subscription-metrics-${selectedPeriod}`,
      cacheDuration: CACHE_DURATIONS.ANALYTICS,
      immediate: true
    }
  );

  // Extract data from axios response
  const metrics = metricsResponse?.data;

  // Fetch meal plan popularity
  const {
    data: mealPlanResponse,
    loading: mealPlanLoading
  } = useCachedApi(
    () => Promise.resolve(api.get<MealPlanPopularity[]>(`/analytics/meal-plan-popularity?period=${selectedPeriod}`)),
    {
      cacheKey: `meal-plan-popularity-${selectedPeriod}`,
      cacheDuration: CACHE_DURATIONS.ANALYTICS,
      immediate: true
    }
  );

  // Extract data from axios response
  const mealPlanStats = mealPlanResponse?.data;

  // Fetch chef performance
  const {
    data: chefResponse,
    loading: chefLoading
  } = useCachedApi(
    () => Promise.resolve(api.get<ChefPerformance[]>(`/analytics/chef-performance?period=${selectedPeriod}`)),
    {
      cacheKey: `chef-performance-${selectedPeriod}`,
      cacheDuration: CACHE_DURATIONS.ANALYTICS,
      immediate: true
    }
  );

  // Extract data from axios response
  const chefPerformance = chefResponse?.data;

  // Fetch subscription trends
  const {
    loading: trendsLoading
  } = useCachedApi(
    () => Promise.resolve(api.get<SubscriptionTrends[]>(`/analytics/subscription-trends?period=${selectedPeriod}`)),
    {
      cacheKey: `subscription-trends-${selectedPeriod}`,
      cacheDuration: CACHE_DURATIONS.ANALYTICS,
      immediate: true
    }
  );

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  const formatDuration = (days: number) => {
    if (days < 30) return `${days} days`;
    if (days < 365) return `${Math.round(days / 30)} months`;
    return `${Math.round(days / 365)} years`;
  };

  const getHealthColor = (score: number, reverse: boolean = false) => {
    if (reverse) {
      if (score > 15) return 'text-red-600';
      if (score > 10) return 'text-yellow-600';
      return 'text-green-600';
    }
    if (score > 80) return 'text-green-600';
    if (score > 60) return 'text-yellow-600';
    return 'text-red-600';
  };


  if (metricsLoading && mealPlanLoading && chefLoading && trendsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg text-gray-600 dark:text-neutral-200">Loading analytics...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-neutral-100">
            Subscription Analytics
          </h2>
          <p className="text-gray-600 dark:text-neutral-200">
            Analyze subscription performance, trends, and revenue
          </p>
        </div>

        {/* Period Selector */}
        <div className="flex gap-2">
          {['7d', '30d', '90d', '1y'].map((period) => (
            <button
              key={period}
              onClick={() => setSelectedPeriod(period as '7d' | '30d' | '90d' | '1y')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${selectedPeriod === period
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
            >
              {period.replace('d', ' days').replace('1y', '1 year')}
            </button>
          ))}
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-neutral-800 p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-neutral-200">Active Subscriptions</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-neutral-100">
                {metrics?.activeSubscriptions?.toLocaleString() || '0'}
              </p>
              <p className="text-sm text-green-600">
                +{metrics?.newSubscriptionsThisMonth || 0} this month
              </p>
            </div>
            <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center">
              <i className="fi fi-sr-calendar text-2xl text-blue-600"></i>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-neutral-800 p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-neutral-200">Monthly Recurring Revenue</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-neutral-100">
                {metrics?.totalRecurringRevenue ? formatCurrency(metrics.totalRecurringRevenue) : '₦0'}
              </p>
              <p className="text-sm text-gray-500">
                Avg: {metrics?.averageRevenuePerSubscription ? formatCurrency(metrics.averageRevenuePerSubscription) : '₦0'}
              </p>
            </div>
            <div className="w-12 h-12 bg-green-50 rounded-xl flex items-center justify-center">
              <i className="fi fi-sr-usd-circle text-2xl text-green-600"></i>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-neutral-800 p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-neutral-200">Churn Rate</p>
              <p className={`text-3xl font-bold ${getHealthColor(metrics?.churnRate || 0, true)}`}>
                {metrics?.churnRate ? formatPercentage(metrics.churnRate) : '0%'}
              </p>
              <p className="text-sm text-gray-500">
                Reactivation: {metrics?.reactivationRate ? formatPercentage(metrics.reactivationRate) : '0%'}
              </p>
            </div>
            <div className="w-12 h-12 bg-orange-50 rounded-xl flex items-center justify-center">
              <i className="fi fi-sr-chart-line-down text-2xl text-orange-600"></i>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-neutral-800 p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-neutral-200">Customer LTV</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-neutral-100">
                {metrics?.customerLifetimeValue ? formatCurrency(metrics.customerLifetimeValue) : '₦0'}
              </p>
              <p className="text-sm text-gray-500">
                Avg Duration: {metrics?.averageSubscriptionDuration ? formatDuration(metrics.averageSubscriptionDuration) : '-'}
              </p>
            </div>
            <div className="w-12 h-12 bg-purple-50 rounded-xl flex items-center justify-center">
              <i className="fi fi-sr-user text-2xl text-purple-600"></i>
            </div>
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Subscription Status Breakdown */}
        <div className="bg-white dark:bg-neutral-800 p-6 rounded-lg shadow-sm border">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-neutral-100 mb-4">
            Subscription Status
          </h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-4 h-4 bg-green-500 rounded"></div>
                <span className="text-gray-700 dark:text-neutral-200">Active</span>
              </div>
              <div className="text-right">
                <div className="font-semibold">{metrics?.activeSubscriptions || 0}</div>
                <div className="text-sm text-gray-500">
                  {metrics?.totalSubscriptions ?
                    formatPercentage((metrics.activeSubscriptions / metrics.totalSubscriptions) * 100) :
                    '0%'
                  }
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-4 h-4 bg-yellow-500 rounded"></div>
                <span className="text-gray-700 dark:text-neutral-200">Paused</span>
              </div>
              <div className="text-right">
                <div className="font-semibold">{metrics?.pausedSubscriptions || 0}</div>
                <div className="text-sm text-gray-500">
                  {metrics?.totalSubscriptions ?
                    formatPercentage((metrics.pausedSubscriptions / metrics.totalSubscriptions) * 100) :
                    '0%'
                  }
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-4 h-4 bg-red-500 rounded"></div>
                <span className="text-gray-700 dark:text-neutral-200">Cancelled</span>
              </div>
              <div className="text-right">
                <div className="font-semibold">{metrics?.cancelledSubscriptions || 0}</div>
                <div className="text-sm text-gray-500">
                  {metrics?.totalSubscriptions ?
                    formatPercentage((metrics.cancelledSubscriptions / metrics.totalSubscriptions) * 100) :
                    '0%'
                  }
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Subscription Trends */}
        <div className="bg-white dark:bg-neutral-800 p-6 rounded-lg shadow-sm border">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-neutral-100 mb-4">
            Growth Trends
          </h3>
          <div className="space-y-4">
            <div className="text-center text-gray-500 dark:text-neutral-400">
              [Trends Chart Placeholder]
            </div>
            <div className="text-sm text-gray-600 dark:text-neutral-200">
              Chart showing new subscriptions, cancellations, and net growth over time
            </div>
          </div>
        </div>
      </div>

      {/* Meal Plan Performance */}
      <div className="bg-white dark:bg-neutral-800 rounded-lg shadow-sm border">
        <div className="p-6 border-b border-gray-200 dark:border-neutral-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-neutral-100">
            Meal Plan Performance
          </h3>
          <p className="text-sm text-gray-600 dark:text-neutral-200">
            Compare meal plan popularity and performance metrics
          </p>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.isArray(mealPlanStats) && mealPlanStats.length > 0 ? mealPlanStats.map((plan, index) => (
              <div key={plan?.planId || `plan-${index}`} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center gap-3 mb-3">
                  <img
                    src={plan?.planImage || '/default-plan.jpg'}
                    alt={plan?.planName || 'Meal Plan'}
                    className="w-12 h-12 rounded-lg object-cover"
                  />
                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-neutral-100">
                      {plan?.planName || 'Unknown Plan'}
                    </h4>
                    <p className="text-sm text-gray-500">
                      {plan?.activeSubscriptions || 0} active subscriptions
                    </p>
                  </div>
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Revenue:</span>
                    <span className="font-medium">{formatCurrency(plan?.totalRevenue || 0)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Rating:</span>
                    <span className="font-medium">⭐ {(plan?.averageRating || 0).toFixed(1)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Completion:</span>
                    <span className="font-medium">{formatPercentage(plan?.completionRate || 0)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Churn Rate:</span>
                    <span className={`font-medium ${getHealthColor(plan?.churnRate || 0, true)}`}>
                      {formatPercentage(plan?.churnRate || 0)}
                    </span>
                  </div>
                </div>

                <div className="mt-3 pt-3 border-t">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Popularity Score</span>
                    <span className={`font-medium ${getHealthColor(plan?.popularityScore || 0)}`}>
                      {plan?.popularityScore || 0}/100
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                    <div
                      className="bg-blue-500 h-2 rounded-full"
                      style={{ width: `${plan?.popularityScore || 0}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            )) : (
              <div className="col-span-full flex flex-col items-center justify-center py-12">
                <div className="text-gray-400 text-6xl mb-4">📊</div>
                <p className="text-gray-500 dark:text-neutral-400 text-lg font-medium">
                  No meal plan data available
                </p>
                <p className="text-gray-400 dark:text-neutral-500 text-sm mt-1">
                  {mealPlanLoading ? 'Loading meal plan statistics...' : 'Check back later for insights'}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Top Performing Chefs */}
      <div className="bg-white dark:bg-neutral-800 rounded-lg shadow-sm border">
        <div className="p-6 border-b border-gray-200 dark:border-neutral-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-neutral-100">
            Top Performing Chefs
          </h3>
          <p className="text-sm text-gray-600 dark:text-neutral-200">
            Chefs with highest subscription performance
          </p>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.isArray(chefPerformance) && chefPerformance.length > 0 ? chefPerformance.slice(0, 6).map((chef, index) => (
              <div key={chef?.chefId || `chef-${index}`} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center gap-3 mb-3">
                  <img
                    src={chef?.chefImage || '/default-avatar.png'}
                    alt={chef?.chefName || 'Chef'}
                    className="w-12 h-12 rounded-full object-cover"
                  />
                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-neutral-100">
                      {chef?.chefName || 'Unknown Chef'}
                    </h4>
                    <p className="text-sm text-gray-500">
                      {chef?.activeSubscriptions || 0} subscriptions
                    </p>
                  </div>
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Deliveries:</span>
                    <span className="font-medium">{chef?.totalDeliveries || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">On-time Rate:</span>
                    <span className={`font-medium ${getHealthColor(chef?.onTimeDeliveryRate || 0)}`}>
                      {formatPercentage(chef?.onTimeDeliveryRate || 0)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Rating:</span>
                    <span className="font-medium">⭐ {(chef?.averageRating || 0).toFixed(1)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Revenue:</span>
                    <span className="font-medium">{formatCurrency(chef?.revenueGenerated || 0)}</span>
                  </div>
                </div>
              </div>
            )) : (
              <div className="col-span-full flex flex-col items-center justify-center py-12">
                <div className="text-gray-400 text-6xl mb-4">👨‍🍳</div>
                <p className="text-gray-500 dark:text-neutral-400 text-lg font-medium">
                  No chef performance data available
                </p>
                <p className="text-gray-400 dark:text-neutral-500 text-sm mt-1">
                  {chefLoading ? 'Loading chef statistics...' : 'Check back later for insights'}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SubscriptionAnalyticsDashboard;