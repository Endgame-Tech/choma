import React, { useState, useEffect } from 'react';
// import { useAuth } from '../context/AuthContext';
import { chefSubscriptionsApi } from '../services/api';
import SubscriptionCard from '../components/SubscriptionCard';
import WeeklyPlanningView from '../components/WeeklyPlanningView';
import BatchPreparationPanel from '../components/BatchPreparationPanel';
import SubscriptionMetrics from '../components/SubscriptionMetrics';
import SubscriptionTimelineView from '../components/SubscriptionTimelineView';
import {
  CalendarDays,
  ChefHat,
  Clock,
  TrendingUp,
  Users,
  AlertCircle,
  RefreshCw,
  BarChart3
} from 'lucide-react';

interface SubscriptionAssignment {
  _id: string;
  subscriptionId: {
    _id: string;
    status: string;
    frequency: string;
    nextDeliveryDate: string;
    dietaryPreferences: string[];
    allergens: string[];
  };
  customerId: {
    _id: string;
    fullName: string;
    phone?: string;
    email: string;
  };
  mealPlanId: {
    _id: string;
    planName: string;
    durationWeeks: number;
    planDescription?: string;
  };
  assignmentStatus: string;
  assignedAt: string;
  performance: {
    totalDeliveries: number;
    onTimeDeliveries: number;
    averageRating: number;
    consistencyScore: number;
  };
  todaysMeals: any[];
  upcomingMeals: any[];
  metrics: {
    totalDeliveries: number;
    onTimeRate: number;
    avgRating: number;
    consistencyScore: number;
  };
}

interface SubscriptionSummary {
  totalActiveSubscriptions: number;
  totalTodaysMeals: number;
  avgPerformanceScore: number;
}

interface DashboardData {
  assignments: SubscriptionAssignment[];
  summary: SubscriptionSummary;
}

type ViewMode = 'dashboard' | 'weekly' | 'batch' | 'metrics' | 'timeline';

const SubscriptionDashboard: React.FC = () => {
  // const { chef } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('dashboard');
  const [selectedSubscriptionId, setSelectedSubscriptionId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchSubscriptionData();
  }, []);

  const fetchSubscriptionData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const data = await chefSubscriptionsApi.getMySubscriptionAssignments();
      setData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load subscription data');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchSubscriptionData();
    setRefreshing(false);
  };

  const getViewModeIcon = (mode: ViewMode) => {
    switch (mode) {
      case 'dashboard': return <Users size={20} />;
      case 'weekly': return <CalendarDays size={20} />;
      case 'batch': return <ChefHat size={20} />;
      case 'metrics': return <BarChart3 size={20} />;
    }
  };

  const getViewModeLabel = (mode: ViewMode) => {
    switch (mode) {
      case 'dashboard': return 'Subscriptions';
      case 'weekly': return 'Weekly Plan';
      case 'batch': return 'Batch Prep';
      case 'metrics': return 'Metrics';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-300">Loading subscription data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 rounded-lg p-6">
        <div className="flex items-center">
          <AlertCircle size={20} className="text-red-400 mr-3" />
          <div className="flex-1">
            <h3 className="text-red-800 dark:text-red-200 font-medium">Error loading subscription data</h3>
            <p className="text-red-600 dark:text-red-300 mt-1">{error}</p>
          </div>
          <button
            onClick={fetchSubscriptionData}
            className="ml-4 px-4 py-2 bg-red-100 dark:bg-red-800 text-red-700 dark:text-red-200 rounded-lg hover:bg-red-200 dark:hover:bg-red-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-gray-900 dark:text-white">
            Subscription Management
          </h1>
          <p className="text-gray-600 dark:text-gray-300 mt-1">
            Manage your recurring cooking responsibilities efficiently
          </p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="flex items-center px-4 py-2 bg-blue-600 dark:bg-blue-700 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-800 disabled:opacity-50 transition-colors"
        >
          <RefreshCw size={20} className={`mr-2 ${refreshing ? 'animate-spin' : ''}`} />
          {refreshing ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {/* Quick Stats */}
      {data && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Active Subscriptions</p>
                <p className="text-3xl font-semibold text-gray-900 dark:text-white">
                  {data.summary.totalActiveSubscriptions}
                </p>
              </div>
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-800 rounded-full flex items-center justify-center">
                <Users size={24} className="text-blue-600 dark:text-blue-300" />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Today's Meals</p>
                <p className="text-3xl font-semibold text-orange-600 dark:text-orange-400">
                  {data.summary.totalTodaysMeals}
                </p>
              </div>
              <div className="w-12 h-12 bg-orange-100 dark:bg-orange-800 rounded-full flex items-center justify-center">
                <Clock size={24} className="text-orange-600 dark:text-orange-300" />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Performance Score</p>
                <p className="text-3xl font-semibold text-green-600 dark:text-green-400">
                  {data.summary.avgPerformanceScore}%
                </p>
              </div>
              <div className="w-12 h-12 bg-green-100 dark:bg-green-800 rounded-full flex items-center justify-center">
                <TrendingUp size={24} className="text-green-600 dark:text-green-300" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* View Mode Selector */}
      <div className="bg-white dark:bg-gray-800 p-1 rounded-lg border border-gray-200 dark:border-gray-700 inline-flex">
        {(['dashboard', 'weekly', 'batch', 'metrics'] as ViewMode[]).map((mode) => (
          <button
            key={mode}
            onClick={() => setViewMode(mode)}
            className={`flex items-center px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              viewMode === mode
                ? 'bg-blue-600 text-white'
                : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
          >
            {getViewModeIcon(mode)}
            <span className="ml-2">{getViewModeLabel(mode)}</span>
          </button>
        ))}
      </div>

      {/* View Mode Content */}
      <div className="transition-all duration-300">
        {viewMode === 'dashboard' && data && (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Your Active Subscriptions
            </h2>
            {data.assignments.length === 0 ? (
              <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                <ChefHat size={48} className="mx-auto mb-4 text-gray-400 dark:text-gray-500" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  No Active Subscriptions
                </h3>
                <p className="text-gray-600 dark:text-gray-300">
                  You don't have any active subscription assignments yet.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {data.assignments.map((assignment) => (
                  <SubscriptionCard
                    key={assignment._id}
                    assignment={assignment}
                    onViewTimeline={(subscriptionId) => {
                      setSelectedSubscriptionId(subscriptionId);
                      setViewMode('timeline');
                    }}
                    onUpdateMealStatus={(assignmentIds, status) => {
                      // Handle meal status update
                      console.log('Update meal status:', assignmentIds, status);
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {viewMode === 'weekly' && (
          <WeeklyPlanningView
            onBatchPrepare={(mealIds) => {
              console.log('Batch prepare meals:', mealIds);
              setViewMode('batch');
            }}
          />
        )}

        {viewMode === 'batch' && (
          <BatchPreparationPanel
            onScheduleBatch={(batchData) => {
              console.log('Schedule batch:', batchData);
            }}
          />
        )}

        {viewMode === 'metrics' && (
          <SubscriptionMetrics />
        )}

        {viewMode === 'timeline' && selectedSubscriptionId && (
          <SubscriptionTimelineView
            subscriptionId={selectedSubscriptionId}
            onBack={() => {
              setViewMode('dashboard');
              setSelectedSubscriptionId(null);
            }}
          />
        )}
      </div>
    </div>
  );
};

export default SubscriptionDashboard;