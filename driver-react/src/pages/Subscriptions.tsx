import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { subscriptionService } from '../services/subscriptionService';
import { SubscriptionGroup, SubscriptionDeliveriesResponse } from '../types';
import {
  Truck,
  Users,
  BarChart3,
  MapPin,
  Phone,
  RefreshCw,
  AlertCircle,
  CalendarDays,
  ChevronRight
} from 'lucide-react';

// Placeholder components for each view
const WeeklyScheduleView = () => (
  <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700 mt-6">
    <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Weekly Schedule</h2>
    <p className="text-gray-600 dark:text-gray-300">View and manage your weekly delivery schedule here. This is a placeholder for the weekly planning view.</p>
  </div>
);

const PerformanceView = () => (
  <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700 mt-6">
    <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Performance</h2>
    <p className="text-gray-600 dark:text-gray-300">View your delivery performance metrics and insights here. This is a placeholder for the performance view.</p>
  </div>
);

const RoutePlanningView = () => (
  <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700 mt-6">
    <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Route Planning</h2>
    <p className="text-gray-600 dark:text-gray-300">Optimize your delivery routes here. This is a placeholder for the route planning view.</p>
  </div>
);

const Subscriptions: React.FC = () => {
  const [subscriptionData, setSubscriptionData] = useState<SubscriptionDeliveriesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [viewMode, setViewMode] = useState<'schedule' | 'performance' | 'routes' | 'subscriptions'>('subscriptions');

  const fetchSubscriptionDeliveries = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await subscriptionService.getMySubscriptionDeliveries();
      setSubscriptionData(data);
    } catch (err: any) {
      setError(err.message);
      console.error('Error fetching subscription deliveries:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchSubscriptionDeliveries();
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchSubscriptionDeliveries();
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-NG', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-NG', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getRelationshipColor = (score: number) => {
    if (score >= 80) return 'text-green-600 bg-green-100 dark:bg-green-800 dark:text-green-100';
    if (score >= 60) return 'text-yellow-600 bg-yellow-100 dark:bg-yellow-800 dark:text-yellow-100';
    return 'text-red-600 bg-red-100 dark:bg-red-800 dark:text-red-100';
  };

  const getRelationshipLabel = (score: number) => {
    if (score >= 80) return 'Excellent';
    if (score >= 60) return 'Good';
    return 'Developing';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-300">Loading subscription deliveries...</p>
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
            <h3 className="text-red-800 dark:text-red-200 font-medium">Error loading subscription deliveries</h3>
            <p className="text-red-600 dark:text-red-300 mt-1">{error}</p>
          </div>
          <button
            onClick={handleRefresh}
            className="ml-4 px-4 py-2 bg-red-100 dark:bg-red-800 text-red-700 dark:text-red-200 rounded-lg hover:bg-red-200 dark:hover:bg-red-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const { subscriptionGroups, summary } = subscriptionData || { subscriptionGroups: [], summary: { totalActiveSubscriptions: 0, totalDeliveriesToday: 0, avgRelationshipScore: 0 } };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-gray-900 dark:text-white">
            Subscription Deliveries
          </h1>
          <p className="text-gray-600 dark:text-gray-300 mt-1">
            Manage your recurring delivery responsibilities efficiently
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

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 transition-colors duration-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Active Subscriptions</p>
              <p className="text-3xl font-semibold text-gray-900 dark:text-white">
                {summary.totalActiveSubscriptions}
              </p>
            </div>
            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-800 rounded-full flex items-center justify-center">
              <Users size={24} className="text-blue-600 dark:text-blue-300" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 transition-colors duration-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Deliveries Today</p>
              <p className="text-3xl font-semibold text-orange-600 dark:text-orange-400">
                {summary.totalDeliveriesToday}
              </p>
            </div>
            <div className="w-12 h-12 bg-orange-100 dark:bg-orange-800 rounded-full flex items-center justify-center">
              <CalendarDays size={24} className="text-orange-600 dark:text-orange-300" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 transition-colors duration-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Relationship Score</p>
              <p className="text-3xl font-semibold text-green-600 dark:text-green-400">
                {summary.avgRelationshipScore}%
              </p>
            </div>
            <div className="w-12 h-12 bg-green-100 dark:bg-green-800 rounded-full flex items-center justify-center">
              <BarChart3 size={24} className="text-green-600 dark:text-green-300" />
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white dark:bg-gray-800 p-1 rounded-lg border border-gray-200 dark:border-gray-700 inline-flex space-x-1">
        <button
          onClick={() => setViewMode('subscriptions')}
          className={`flex items-center px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            viewMode === 'subscriptions'
              ? 'bg-blue-600 text-white'
              : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700'
          }`}
        >
          <Users size={20} />
          <span className="ml-2">Subscriptions</span>
        </button>
        <button
          onClick={() => setViewMode('schedule')}
          className={`flex items-center px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            viewMode === 'schedule'
              ? 'bg-blue-600 text-white'
              : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700'
          }`}
        >
          <CalendarDays size={20} />
          <span className="ml-2">Weekly Schedule</span>
        </button>
        <button
          onClick={() => setViewMode('performance')}
          className={`flex items-center px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            viewMode === 'performance'
              ? 'bg-blue-600 text-white'
              : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700'
          }`}
        >
          <BarChart3 size={20} />
          <span className="ml-2">Performance</span>
        </button>
        <button
          onClick={() => setViewMode('routes')}
          className={`flex items-center px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            viewMode === 'routes'
              ? 'bg-blue-600 text-white'
              : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700'
          }`}
        >
          <MapPin size={20} />
          <span className="ml-2">Route Planning</span>
        </button>
      </div>

      {/* View Mode Content */}
      <div className="transition-all duration-300">
        {viewMode === 'subscriptions' && subscriptionGroups.length > 0 && (
          <div className="space-y-6">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 transition-colors duration-200">
              <div className="p-6 border-b border-gray-200 dark:border-gray-600">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Your Subscription Customers</h3>
                <p className="text-gray-600 dark:text-gray-300 mt-1">Build lasting relationships with your regular customers</p>
              </div>
              <div className="divide-y divide-gray-200 dark:divide-gray-600">
                {subscriptionGroups.map((group: SubscriptionGroup) => (
                  <div key={group.subscriptionId._id} className="p-6 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200">
                    {/* Customer Info */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-start space-x-4">
                        <div className="w-12 h-12 bg-blue-100 dark:bg-blue-800 rounded-full flex items-center justify-center flex-shrink-0">
                          {group.customer.profilePicture ? (
                            <img
                              src={group.customer.profilePicture}
                              alt={group.customer.fullName}
                              className="w-12 h-12 rounded-full object-cover"
                            />
                          ) : (
                            <Users size={24} className="text-blue-600 dark:text-blue-300" />
                          )}
                        </div>
                        <div>
                          <h4 className="text-lg font-semibold text-gray-900 dark:text-white">{group.customer.fullName}</h4>
                          <p className="text-sm text-gray-600 dark:text-gray-300 flex items-center space-x-4">
                            <span className="flex items-center space-x-1">
                              <Phone size={16} className="text-gray-600 dark:text-gray-300" />
                              <span>{group.customer.phone}</span>
                            </span>
                            <span className="flex items-center space-x-1">
                              <Truck size={16} className="text-gray-600 dark:text-gray-300" />
                              <span>{group.totalDeliveries} deliveries</span>
                            </span>
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={`px-2 py-1 text-xs font-medium rounded-full ${getRelationshipColor(group.relationshipScore)}`}>
                          {getRelationshipLabel(group.relationshipScore)}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">{group.relationshipScore}% score</div>
                      </div>
                    </div>

                    {/* Meal Plan Info */}
                    <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 mb-4">
                      <div className="flex items-center justify-between mb-2">
                        <h5 className="font-medium text-gray-900 dark:text-white">{group.mealPlan.planName}</h5>
                        <span className="text-sm text-gray-600 dark:text-gray-300">{group.mealPlan.durationWeeks} weeks</span>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">{group.mealPlan.planDescription}</p>
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center space-x-4">
                          <span className="text-gray-600 dark:text-gray-300">
                            <strong>Frequency:</strong> {group.subscriptionId.frequency}
                          </span>
                          <span className="text-gray-600 dark:text-gray-300">
                            <strong>Status:</strong>
                            <span className={`ml-1 px-2 py-1 rounded-full text-xs font-medium ${
                              group.subscriptionId.status === 'active'
                                ? 'bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100'
                                : 'bg-gray-100 text-gray-800 dark:bg-gray-600 dark:text-gray-100'
                            }`}>
                              {group.subscriptionId.status}
                            </span>
                          </span>
                        </div>
                        <span className="text-gray-600 dark:text-gray-300">
                          <strong>Next:</strong> {formatDate(group.subscriptionId.nextDeliveryDate)}
                        </span>
                      </div>
                    </div>

                    {/* Recent Assignments */}
                    {group.assignments.length > 0 && (
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <h6 className="font-medium text-gray-900 dark:text-white">Upcoming Deliveries</h6>
                          <Link
                            to={`/subscriptions/customer/${group.customer._id}/timeline/${group.subscriptionId._id}`}
                            className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 text-sm font-medium transition-colors"
                          >
                            View Timeline →
                          </Link>
                        </div>
                        <div className="space-y-2">
                          {group.assignments.slice(0, 3).map((assignment) => (
                            <Link
                              key={assignment._id}
                              to={`/deliveries/${assignment._id}`}
                              className="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                            >
                              <div className="flex items-center space-x-3">
                                <div className={`w-3 h-3 rounded-full ${
                                  assignment.status === 'delivered' ? 'bg-green-500' :
                                  assignment.status === 'picked_up' ? 'bg-yellow-500' :
                                  assignment.status === 'assigned' ? 'bg-blue-500' :
                                  'bg-gray-400'
                                }`} />
                                <div>
                                  <div className="text-sm font-medium text-gray-900 dark:text-white">
                                    {assignment.deliveryLocation.area}
                                  </div>
                                  <div className="text-xs text-gray-500 dark:text-gray-400">
                                    {formatDate(assignment.estimatedDeliveryTime)} at {formatTime(assignment.estimatedDeliveryTime)}
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center space-x-2">
                                <span className="text-sm font-semibold text-green-600 dark:text-green-400">
                                  ₦{assignment.totalEarning.toLocaleString()}
                                </span>
                                <ChevronRight size={16} className="text-gray-400 dark:text-gray-300" />
                              </div>
                            </Link>
                          ))}
                          {group.assignments.length > 3 && (
                            <div className="text-center pt-2">
                              <Link
                                to={`/subscriptions/customer/${group.customer._id}/deliveries`}
                                className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 text-sm font-medium transition-colors"
                              >
                                View all {group.assignments.length} assignments →
                              </Link>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
        {viewMode === 'schedule' && <WeeklyScheduleView />}
        {viewMode === 'performance' && <PerformanceView />}
        {viewMode === 'routes' && <RoutePlanningView />}
        {subscriptionGroups.length === 0 && viewMode === 'subscriptions' && (
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 text-center mt-6">
            <Users size={48} className="mx-auto mb-4 text-gray-400 dark:text-gray-500" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              No Subscription Deliveries
            </h3>
            <p className="text-gray-600 dark:text-gray-300">
              You'll see your recurring delivery assignments here when you're assigned to subscription customers.
            </p>
          </div>
        )}
      </div>
    </div>
);
};

export default Subscriptions;