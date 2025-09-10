import React, { useState, useEffect } from 'react';
import { chefSubscriptionsApi } from '../services/api';
import {
  TrendingUp,
  TrendingDown,
  Clock,
  Star,
  CheckCircle,
  AlertTriangle,
  DollarSign,
  Users,
  Calendar,
  Target,
  Award,
  BarChart3,
  PieChart,
  Activity
} from 'lucide-react';

interface MetricsData {
  period: string;
  metrics: {
    totalSubscriptions: number;
    activeSubscriptions: number;
    totalMealsDelivered: number;
    totalOnTimeMeals: number;
    avgPreparationTime: number;
    avgRating: number;
    totalEarnings: number;
    avgConsistencyScore: number;
  };
  insights: {
    performanceScore: number;
    improvementAreas: string[];
    strengths: string[];
    recommendations: Array<{
      category: string;
      priority: string;
      action: string;
      expectedImpact: string;
    }>;
    trends: {
      performanceChange: string;
      earningsChange: string;
      efficiencyChange: string;
      customerSatisfactionChange: string;
    };
  };
}

const SubscriptionMetrics: React.FC = () => {
  const [metricsData, setMetricsData] = useState<MetricsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<string>('30d');
  const [activeTab, setActiveTab] = useState<'overview' | 'performance' | 'insights'>('overview');

  const periods = [
    { value: '7d', label: '7 Days' },
    { value: '30d', label: '30 Days' },
    { value: '90d', label: '90 Days' },
    { value: '1y', label: '1 Year' }
  ];

  useEffect(() => {
    fetchMetrics();
  }, [selectedPeriod]);

  const fetchMetrics = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const data = await chefSubscriptionsApi.getSubscriptionMetrics({
        period: selectedPeriod
      });
      
      setMetricsData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load metrics');
    } finally {
      setLoading(false);
    }
  };

  const getPerformanceColor = (score: number) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 75) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getTrendIcon = (trend: string) => {
    if (trend.startsWith('+')) return <TrendingUp size={16} className="text-green-500" />;
    if (trend.startsWith('-')) return <TrendingDown size={16} className="text-red-500" />;
    return <Activity size={16} className="text-gray-500" />;
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-700 dark:bg-red-800 dark:text-red-200';
      case 'medium': return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-800 dark:text-yellow-200';
      case 'low': return 'bg-green-100 text-green-700 dark:bg-green-800 dark:text-green-200';
      default: return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-200';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'timing': return <Clock size={16} />;
      case 'quality': return <Star size={16} />;
      case 'consistency': return <CheckCircle size={16} />;
      case 'efficiency': return <TrendingUp size={16} />;
      default: return <Target size={16} />;
    }
  };

  const formatMetricValue = (key: string, value: number) => {
    switch (key) {
      case 'avgRating':
        return `${value.toFixed(1)}/5.0`;
      case 'avgPreparationTime':
        return `${Math.round(value)}min`;
      case 'totalEarnings':
        return `$${value.toFixed(2)}`;
      case 'avgConsistencyScore':
        return `${Math.round(value)}%`;
      default:
        return value.toString();
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-300">Loading performance metrics...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 rounded-lg p-6">
        <div className="flex items-center">
          <AlertTriangle size={20} className="text-red-400 mr-3" />
          <div className="flex-1">
            <h3 className="text-red-800 dark:text-red-200 font-medium">Error loading metrics</h3>
            <p className="text-red-600 dark:text-red-300 mt-1">{error}</p>
          </div>
          <button
            onClick={fetchMetrics}
            className="ml-4 px-4 py-2 bg-red-100 dark:bg-red-800 text-red-700 dark:text-red-200 rounded-lg hover:bg-red-200 dark:hover:bg-red-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!metricsData) return null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
            Performance Metrics
          </h2>
          <p className="text-gray-600 dark:text-gray-300 mt-1">
            Track your subscription management performance
          </p>
        </div>
        
        {/* Period Selector */}
        <div className="flex items-center gap-2">
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
            className="px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
          >
            {periods.map((period) => (
              <option key={period.value} value={period.value}>
                {period.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white dark:bg-gray-800 p-1 rounded-lg border border-gray-200 dark:border-gray-700 inline-flex">
        {[
          { key: 'overview', label: 'Overview', icon: <BarChart3 size={16} /> },
          { key: 'performance', label: 'Performance', icon: <TrendingUp size={16} /> },
          { key: 'insights', label: 'Insights', icon: <Award size={16} /> }
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            className={`flex items-center px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === tab.key
                ? 'bg-blue-600 text-white'
                : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
          >
            {tab.icon}
            <span className="ml-2">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Content based on active tab */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Key Metrics Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Performance Score</p>
                  <p className={`text-3xl font-bold ${getPerformanceColor(metricsData.insights.performanceScore)}`}>
                    {metricsData.insights.performanceScore}%
                  </p>
                </div>
                <div className="w-12 h-12 bg-blue-100 dark:bg-blue-800 rounded-full flex items-center justify-center">
                  <Award size={24} className="text-blue-600 dark:text-blue-300" />
                </div>
              </div>
              <div className="flex items-center mt-2">
                {getTrendIcon(metricsData.insights.trends.performanceChange)}
                <span className="ml-1 text-sm text-gray-600 dark:text-gray-300">
                  {metricsData.insights.trends.performanceChange} from last period
                </span>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Active Subscriptions</p>
                  <p className="text-3xl font-bold text-gray-900 dark:text-white">
                    {metricsData.metrics.activeSubscriptions}
                  </p>
                </div>
                <div className="w-12 h-12 bg-green-100 dark:bg-green-800 rounded-full flex items-center justify-center">
                  <Users size={24} className="text-green-600 dark:text-green-300" />
                </div>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-300 mt-2">
                of {metricsData.metrics.totalSubscriptions} total
              </p>
            </div>

            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-300">On-Time Rate</p>
                  <p className="text-3xl font-bold text-green-600 dark:text-green-400">
                    {metricsData.metrics.totalMealsDelivered > 0 
                      ? Math.round((metricsData.metrics.totalOnTimeMeals / metricsData.metrics.totalMealsDelivered) * 100)
                      : 100}%
                  </p>
                </div>
                <div className="w-12 h-12 bg-orange-100 dark:bg-orange-800 rounded-full flex items-center justify-center">
                  <Clock size={24} className="text-orange-600 dark:text-orange-300" />
                </div>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-300 mt-2">
                {metricsData.metrics.totalOnTimeMeals} of {metricsData.metrics.totalMealsDelivered} meals
              </p>
            </div>

            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Total Earnings</p>
                  <p className="text-3xl font-bold text-purple-600 dark:text-purple-400">
                    ${metricsData.metrics.totalEarnings.toFixed(0)}
                  </p>
                </div>
                <div className="w-12 h-12 bg-purple-100 dark:bg-purple-800 rounded-full flex items-center justify-center">
                  <DollarSign size={24} className="text-purple-600 dark:text-purple-300" />
                </div>
              </div>
              <div className="flex items-center mt-2">
                {getTrendIcon(metricsData.insights.trends.earningsChange)}
                <span className="ml-1 text-sm text-gray-600 dark:text-gray-300">
                  {metricsData.insights.trends.earningsChange} from last period
                </span>
              </div>
            </div>
          </div>

          {/* Additional Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Quality Metrics</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-300">Average Rating</span>
                  <span className="font-semibold text-gray-900 dark:text-white">
                    {formatMetricValue('avgRating', metricsData.metrics.avgRating)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-300">Consistency Score</span>
                  <span className="font-semibold text-gray-900 dark:text-white">
                    {formatMetricValue('avgConsistencyScore', metricsData.metrics.avgConsistencyScore)}
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Efficiency Metrics</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-300">Avg Prep Time</span>
                  <span className="font-semibold text-gray-900 dark:text-white">
                    {formatMetricValue('avgPreparationTime', metricsData.metrics.avgPreparationTime)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-300">Efficiency Change</span>
                  <div className="flex items-center">
                    {getTrendIcon(metricsData.insights.trends.efficiencyChange)}
                    <span className="ml-1 font-semibold text-gray-900 dark:text-white">
                      {metricsData.insights.trends.efficiencyChange}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Customer Satisfaction</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-300">Satisfaction Change</span>
                  <div className="flex items-center">
                    {getTrendIcon(metricsData.insights.trends.customerSatisfactionChange)}
                    <span className="ml-1 font-semibold text-gray-900 dark:text-white">
                      {metricsData.insights.trends.customerSatisfactionChange}
                    </span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-300">Total Meals</span>
                  <span className="font-semibold text-gray-900 dark:text-white">
                    {metricsData.metrics.totalMealsDelivered}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'performance' && (
        <div className="space-y-6">
          {/* Strengths and Improvement Areas */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-2 mb-4">
                <CheckCircle size={20} className="text-green-500" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Your Strengths</h3>
              </div>
              
              {metricsData.insights.strengths.length === 0 ? (
                <p className="text-gray-600 dark:text-gray-300">
                  Keep working to develop your strengths!
                </p>
              ) : (
                <div className="space-y-2">
                  {metricsData.insights.strengths.map((strength, index) => (
                    <div key={index} className="flex items-center gap-2 p-2 bg-green-50 dark:bg-green-900/30 rounded-lg">
                      <CheckCircle size={16} className="text-green-600" />
                      <span className="text-sm text-green-800 dark:text-green-200 capitalize">
                        {strength.replace('_', ' ')}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-2 mb-4">
                <AlertTriangle size={20} className="text-orange-500" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Improvement Areas</h3>
              </div>
              
              {metricsData.insights.improvementAreas.length === 0 ? (
                <p className="text-gray-600 dark:text-gray-300">
                  Great job! No major improvement areas identified.
                </p>
              ) : (
                <div className="space-y-2">
                  {metricsData.insights.improvementAreas.map((area, index) => (
                    <div key={index} className="flex items-center gap-2 p-2 bg-orange-50 dark:bg-orange-900/30 rounded-lg">
                      <AlertTriangle size={16} className="text-orange-600" />
                      <span className="text-sm text-orange-800 dark:text-orange-200 capitalize">
                        {area.replace('_', ' ')}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'insights' && (
        <div className="space-y-6">
          {/* Recommendations */}
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Personalized Recommendations
            </h3>
            
            {metricsData.insights.recommendations.length === 0 ? (
              <p className="text-gray-600 dark:text-gray-300">
                Excellent work! No specific recommendations at this time.
              </p>
            ) : (
              <div className="space-y-4">
                {metricsData.insights.recommendations.map((rec, index) => (
                  <div key={index} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0">
                        {getCategoryIcon(rec.category)}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className="font-medium text-gray-900 dark:text-white">
                            {rec.action}
                          </h4>
                          <span className={`px-2 py-1 text-xs rounded-full ${getPriorityColor(rec.priority)}`}>
                            {rec.priority} priority
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">
                          Expected Impact: {rec.expectedImpact}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                          Category: {rec.category}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default SubscriptionMetrics;