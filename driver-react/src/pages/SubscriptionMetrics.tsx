import React, { useState, useEffect } from 'react';
import { subscriptionService } from '../services/subscriptionService';
import { SubscriptionMetrics } from '../types';
import {
  ChartBarIcon,
  TruckIcon,
  ClockIcon,
  // StarIcon,
  CurrencyDollarIcon,
  ArrowPathIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  UserIcon,
  LightBulbIcon
} from '@heroicons/react/24/outline';

const SubscriptionMetricsPage: React.FC = () => {
  const [metricsData, setMetricsData] = useState<SubscriptionMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState('30d');
  const [refreshing, setRefreshing] = useState(false);

  const fetchMetrics = async (period: string = selectedPeriod) => {
    try {
      setError(null);
      const data = await subscriptionService.getSubscriptionMetrics(period);
      setMetricsData(data);
    } catch (err: any) {
      setError(err.message);
      console.error('Error fetching subscription metrics:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
  }, [selectedPeriod]);

  const handlePeriodChange = (period: string) => {
    setSelectedPeriod(period);
    setLoading(true);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchMetrics();
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'text-red-600 bg-red-100 border-red-200';
      case 'medium':
        return 'text-yellow-600 bg-yellow-100 border-yellow-200';
      default:
        return 'text-blue-600 bg-blue-100 border-blue-200';
    }
  };

  const getRetentionColor = (level: string) => {
    switch (level) {
      case 'excellent':
        return 'text-green-600 bg-green-100';
      case 'good':
        return 'text-blue-600 bg-blue-100';
      default:
        return 'text-yellow-600 bg-yellow-100';
    }
  };

  if (loading) {
    return (
      <div className="choma-card">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin p-4 bg-choma-orange/10 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
              <ChartBarIcon className="h-8 w-8 text-choma-orange" />
            </div>
            <div className="text-lg text-gray-600 font-medium">Loading performance metrics...</div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="choma-card p-6">
        <div className="text-center">
          <div className="p-4 bg-red-100 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
            <ChartBarIcon className="h-8 w-8 text-red-600" />
          </div>
          <h3 className="text-red-800 font-semibold text-lg mb-2">Error loading metrics</h3>
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={handleRefresh}
            className="px-6 py-3 bg-red-500 hover:bg-red-600 text-white font-semibold rounded-xl transition-all duration-300 transform hover:scale-105"
          >
            <ArrowPathIcon className="h-5 w-5 inline mr-2" />
            Retry
          </button>
        </div>
      </div>
    );
  }

  const { metrics, insights } = metricsData || { 
    metrics: {
      subscription: {
        totalDeliveries: 0,
        deliveredOrders: 0,
        onTimeRate: 0,
        totalEarnings: 0,
        avgDeliveryTimeMinutes: 0,
        uniqueCustomers: 0
      },
      oneTime: {
        totalDeliveries: 0,
        deliveredOrders: 0,
        onTimeRate: 0,
        totalEarnings: 0
      },
      comparison: {
        subscriptionEarningsPercentage: 0,
        subscriptionDeliveryPercentage: 0
      }
    },
    insights: {
      customerRetention: 'developing' as const,
      performanceVsOneTime: 'needs_improvement' as const,
      earningsComparison: 'lower' as const,
      strengths: [],
      improvementAreas: [],
      recommendations: []
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="choma-card p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center space-x-3">
              <ChartBarIcon className="h-8 w-8 text-choma-orange" />
              <span>Subscription Performance</span>
            </h1>
            <p className="text-gray-600 mt-2">Track your subscription delivery performance and growth</p>
          </div>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="px-6 py-3 bg-choma-brown text-choma-white text-sm font-semibold rounded-xl hover:shadow-lg hover:shadow-choma-orange/25 transition-all duration-300 transform hover:scale-105 disabled:opacity-50"
          >
            <ArrowPathIcon className={`h-5 w-5 inline mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* Period Selector */}
      <div className="choma-card p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Time Period</h3>
        <div className="flex flex-wrap gap-3">
          {[
            { key: '7d', label: 'Last 7 days' },
            { key: '30d', label: 'Last 30 days' },
            { key: '90d', label: 'Last 90 days' },
            { key: '1y', label: 'Last year' }
          ].map((period) => (
            <button
              key={period.key}
              onClick={() => handlePeriodChange(period.key)}
              className={`px-4 py-3 text-sm font-semibold rounded-xl transition-all duration-300 transform hover:scale-105 ${
                selectedPeriod === period.key
                  ? 'bg-choma-brown text-choma-white shadow-lg'
                  : 'bg-gray-100 text-gray-700 hover:bg-choma-orange/10 hover:text-choma-brown'
              }`}
            >
              {period.label}
            </button>
          ))}
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="choma-card p-6 bg-gradient-to-br from-choma-orange/10 to-choma-brown/5">
          <div className="flex items-center justify-between">
            <div>
              <TruckIcon className="h-8 w-8 text-choma-orange mb-2" />
              <div className="text-2xl font-bold text-choma-brown">{metrics.subscription.totalDeliveries}</div>
              <div className="text-sm text-gray-600">Subscription Deliveries</div>
            </div>
            <div className="text-right">
              <div className="text-lg font-semibold text-choma-orange">{metrics.subscription.onTimeRate}%</div>
              <div className="text-xs text-gray-600">On-time rate</div>
            </div>
          </div>
        </div>

        <div className="choma-card p-6 bg-gradient-to-br from-green-50 to-emerald-50">
          <div className="flex items-center justify-between">
            <div>
              <CurrencyDollarIcon className="h-8 w-8 text-green-600 mb-2" />
              <div className="text-2xl font-bold text-green-600">{formatCurrency(metrics.subscription.totalEarnings)}</div>
              <div className="text-sm text-gray-600">Subscription Earnings</div>
            </div>
            <div className="text-right">
              <div className="text-lg font-semibold text-green-600">{metrics.comparison.subscriptionEarningsPercentage}%</div>
              <div className="text-xs text-gray-600">of total earnings</div>
            </div>
          </div>
        </div>

        <div className="choma-card p-6 bg-gradient-to-br from-purple-50 to-indigo-50">
          <div className="flex items-center justify-between">
            <div>
              <UserIcon className="h-8 w-8 text-purple-600 mb-2" />
              <div className="text-2xl font-bold text-purple-600">{metrics.subscription.uniqueCustomers}</div>
              <div className="text-sm text-gray-600">Unique Customers</div>
            </div>
            <div className="text-right">
              <div className={`px-2 py-1 rounded-full text-xs font-semibold ${getRetentionColor(insights.customerRetention)}`}>
                {insights.customerRetention}
              </div>
            </div>
          </div>
        </div>

        <div className="choma-card p-6 bg-gradient-to-br from-blue-50 to-cyan-50">
          <div className="flex items-center justify-between">
            <div>
              <ClockIcon className="h-8 w-8 text-blue-600 mb-2" />
              <div className="text-2xl font-bold text-blue-600">{metrics.subscription.avgDeliveryTimeMinutes}</div>
              <div className="text-sm text-gray-600">Avg Delay (minutes)</div>
            </div>
            <div className="text-right">
              <div className={`flex items-center ${
                insights.performanceVsOneTime === 'better' 
                  ? 'text-green-600' 
                  : 'text-red-600'
              }`}>
                {insights.performanceVsOneTime === 'better' ? (
                  <ArrowTrendingUpIcon className="h-4 w-4 mr-1" />
                ) : (
                  <ArrowTrendingDownIcon className="h-4 w-4 mr-1" />
                )}
                <span className="text-sm font-semibold">
                  vs One-time
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Performance Comparison */}
      <div className="choma-card p-6">
        <h3 className="text-xl font-semibold text-gray-900 mb-6">Subscription vs One-time Deliveries</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="font-semibold text-purple-600 mb-4 flex items-center">
              <UserIcon className="h-5 w-5 mr-2" />
              Subscription Deliveries
            </h4>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Total Deliveries</span>
                <span className="font-semibold">{metrics.subscription.totalDeliveries}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Completed</span>
                <span className="font-semibold text-green-600">{metrics.subscription.deliveredOrders}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">On-time Rate</span>
                <span className="font-semibold">{metrics.subscription.onTimeRate}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Total Earnings</span>
                <span className="font-semibold text-green-600">{formatCurrency(metrics.subscription.totalEarnings)}</span>
              </div>
            </div>
          </div>

          <div>
            <h4 className="font-semibold text-gray-600 mb-4 flex items-center">
              <TruckIcon className="h-5 w-5 mr-2" />
              One-time Deliveries
            </h4>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Total Deliveries</span>
                <span className="font-semibold">{metrics.oneTime.totalDeliveries}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Completed</span>
                <span className="font-semibold text-green-600">{metrics.oneTime.deliveredOrders}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">On-time Rate</span>
                <span className="font-semibold">{metrics.oneTime.onTimeRate}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Total Earnings</span>
                <span className="font-semibold text-green-600">{formatCurrency(metrics.oneTime.totalEarnings)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Strengths and Improvements */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Strengths */}
        <div className="choma-card p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <CheckCircleIcon className="h-6 w-6 text-green-600 mr-2" />
            Your Strengths
          </h3>
          {insights.strengths.length === 0 ? (
            <p className="text-gray-500 text-sm">Keep working to build your strengths in subscription deliveries!</p>
          ) : (
            <div className="space-y-2">
              {insights.strengths.map((strength, index) => (
                <div key={index} className="flex items-center p-3 bg-green-50 rounded-lg">
                  <CheckCircleIcon className="h-5 w-5 text-green-600 mr-3 flex-shrink-0" />
                  <span className="text-sm text-gray-700">
                    {strength.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Improvement Areas */}
        <div className="choma-card p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <ExclamationTriangleIcon className="h-6 w-6 text-yellow-600 mr-2" />
            Areas for Improvement
          </h3>
          {insights.improvementAreas.length === 0 ? (
            <p className="text-gray-500 text-sm">Great job! No specific improvement areas identified.</p>
          ) : (
            <div className="space-y-2">
              {insights.improvementAreas.map((area, index) => (
                <div key={index} className="flex items-center p-3 bg-yellow-50 rounded-lg">
                  <ExclamationTriangleIcon className="h-5 w-5 text-yellow-600 mr-3 flex-shrink-0" />
                  <span className="text-sm text-gray-700">
                    {area.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recommendations */}
      {insights.recommendations.length > 0 && (
        <div className="choma-card p-6">
          <h3 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
            <LightBulbIcon className="h-6 w-6 text-choma-orange mr-2" />
            Personalized Recommendations
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {insights.recommendations.map((rec, index) => (
              <div key={index} className={`p-4 rounded-xl border-2 ${getPriorityColor(rec.priority)}`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold text-sm uppercase">
                    {rec.category}
                  </span>
                  <span className={`px-2 py-1 rounded-full text-xs font-bold ${getPriorityColor(rec.priority)}`}>
                    {rec.priority} priority
                  </span>
                </div>
                <p className="text-sm text-gray-700 mb-2">{rec.action}</p>
                <p className="text-xs text-gray-600">
                  <strong>Expected Impact:</strong> {rec.expectedImpact}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default SubscriptionMetricsPage;