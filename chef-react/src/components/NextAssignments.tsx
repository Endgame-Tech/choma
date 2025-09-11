import React, { useState, useEffect } from 'react';
import {
  User,
  MapPin,
  ChefHat,
  AlertTriangle,
  CheckCircle,
  Timer,
  RefreshCw,
  Star
} from 'lucide-react';

interface MealAssignment {
  assignmentId: string;
  weekNumber: number;
  dayOfWeek: number;
  mealTime: 'breakfast' | 'lunch' | 'dinner';
  customTitle: string;
  meals: string[];
}

interface UpcomingDelivery {
  _id: string;
  scheduledDate: string;
  status: string;
  mealAssignment: MealAssignment;
  mealDetails?: {
    title: string;
    description: string;
    imageUrl: string;
  };
  priority: number;
  estimatedPrepTime: number;
}

interface Assignment {
  _id: string;
  subscriptionId: {
    _id: string;
    status: string;
    frequency: string;
    nextDeliveryDate: string;
  };
  customerId: {
    fullName: string;
    phone: string;
    email: string;
    address: string;
  };
  mealPlanId: {
    planName: string;
    mealsPerWeek: number;
  };
  upcomingDeliveries: UpcomingDelivery[];
  nextDeliveryDate: string;
  totalUpcomingMeals: number;
  performance: {
    averageRating: number;
    consistencyScore: number;
  };
}

interface ApiResponse {
  success: boolean;
  data: {
    assignments: Assignment[];
    totalAssignments: number;
    totalUpcomingDeliveries: number;
  };
}

const NextAssignments: React.FC = () => {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTimeframe, setSelectedTimeframe] = useState(7); // days

  useEffect(() => {
    fetchNextAssignments();
  }, [selectedTimeframe]);

  const fetchNextAssignments = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/unified-subscriptions/chef/next-assignments?days=${selectedTimeframe}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('chefToken')}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: ApiResponse = await response.json();

      if (data.success) {
        setAssignments(data.data.assignments);
      } else {
        throw new Error('Failed to fetch next assignments');
      }

    } catch (err: any) {
      console.error('Error fetching next assignments:', err);
      setError(err.message || 'Failed to load assignment data');
    } finally {
      setLoading(false);
    }
  };

  const updateCookingStatus = async (deliveryId: string, status: string, notes: string = '') => {
    try {
      const response = await fetch(`/api/unified-subscriptions/chef/cooking-status/${deliveryId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('chefToken')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status, notes })
      });

      if (response.ok) {
        // Refresh data
        await fetchNextAssignments();
      } else {
        throw new Error('Failed to update cooking status');
      }
    } catch (err: any) {
      console.error('Error updating cooking status:', err);
      // Show error toast
    }
  };

  const getPriorityColor = (priority: number) => {
    if (priority >= 80) return 'text-red-600 bg-red-50 border-red-200';
    if (priority >= 60) return 'text-orange-600 bg-orange-50 border-orange-200';
    return 'text-green-600 bg-green-50 border-green-200';
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'preparing':
        return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'ready':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'scheduled':
        return 'text-gray-600 bg-gray-50 border-gray-200';
      case 'chef_assigned':
        return 'text-purple-600 bg-purple-50 border-purple-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getMealTypeIcon = (mealTime: string) => {
    switch (mealTime) {
      case 'breakfast':
        return '🌅';
      case 'lunch':
        return '☀️';
      case 'dinner':
        return '🌙';
      default:
        return '🍽️';
    }
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (date.toDateString() === today.toDateString()) {
      return `Today at ${date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`;
    } else if (date.toDateString() === tomorrow.toDateString()) {
      return `Tomorrow at ${date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`;
    } else {
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    }
  };

  const getTimeUntilDelivery = (dateString: string) => {
    const delivery = new Date(dateString);
    const now = new Date();
    const diffMs = delivery.getTime() - now.getTime();
    const diffHours = Math.round(diffMs / (1000 * 60 * 60));

    if (diffHours < 1) return 'Due now';
    if (diffHours < 24) return `${diffHours}h remaining`;
    const diffDays = Math.round(diffHours / 24);
    return `${diffDays}d ${diffHours % 24}h remaining`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin text-blue-500 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-300">Loading your next assignments...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
        <div className="flex items-center">
          <AlertTriangle className="h-5 w-5 text-red-500 mr-2" />
          <p className="text-red-700 dark:text-red-400">{error}</p>
          <button
            onClick={() => fetchNextAssignments()}
            className="ml-auto text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
            title="Retry loading assignments"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Next Cooking Assignments</h2>
          <p className="text-gray-600 dark:text-gray-300">
            {assignments.length} active subscription{assignments.length !== 1 ? 's' : ''} •
            {assignments.reduce((sum, a) => sum + a.totalUpcomingMeals, 0)} upcoming deliveries
          </p>
        </div>

        <div className="flex items-center space-x-4">
          <select
            value={selectedTimeframe}
            onChange={(e) => setSelectedTimeframe(parseInt(e.target.value))}
            className="border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value={1}>Next 1 day</option>
            <option value={3}>Next 3 days</option>
            <option value={7}>Next 7 days</option>
            <option value={14}>Next 14 days</option>
          </select>

          <button
            onClick={() => fetchNextAssignments()}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </button>
        </div>
      </div>

      {assignments.length === 0 ? (
        <div className="text-center py-12">
          <ChefHat className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No upcoming assignments</h3>
          <p className="text-gray-600 dark:text-gray-300">
            You don't have any cooking assignments scheduled for the selected timeframe.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {assignments.map((assignment) => (
            <div key={assignment._id} className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
              {/* Assignment Header */}
              <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="flex-shrink-0">
                      <User className="h-8 w-8 text-gray-400" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        {assignment.customerId.fullName}
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {assignment.mealPlanId.planName} • {assignment.mealPlanId.mealsPerWeek} meals/week
                      </p>
                      <div className="flex items-center mt-1">
                        <MapPin className="h-3 w-3 text-gray-400 mr-1" />
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {assignment.customerId.address}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="flex items-center space-x-2 mb-2">
                      <Star className="h-4 w-4 text-yellow-500" />
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {assignment.performance.averageRating.toFixed(1)}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Performance: {assignment.performance.consistencyScore}%
                    </p>
                  </div>
                </div>
              </div>

              {/* Upcoming Deliveries */}
              <div className="p-6">
                <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-4">
                  Upcoming Deliveries ({assignment.upcomingDeliveries.length})
                </h4>

                <div className="space-y-3">
                  {assignment.upcomingDeliveries.map((delivery) => (
                    <div
                      key={delivery._id}
                      className={`p-4 rounded-lg border ${getPriorityColor(delivery.priority)}`}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center space-x-3">
                          <span className="text-lg">
                            {getMealTypeIcon(delivery.mealAssignment.mealTime)}
                          </span>
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white">
                              {delivery.mealAssignment.customTitle ||
                                `${delivery.mealAssignment.mealTime.charAt(0).toUpperCase() + delivery.mealAssignment.mealTime.slice(1)}`}
                            </p>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              Week {delivery.mealAssignment.weekNumber}, Day {delivery.mealAssignment.dayOfWeek}
                            </p>
                          </div>
                        </div>

                        <div className="text-right">
                          <p className="text-sm font-medium text-gray-900 dark:text-white">
                            {formatDateTime(delivery.scheduledDate)}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {getTimeUntilDelivery(delivery.scheduledDate)}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div className="flex items-center space-x-1">
                            <Timer className="h-4 w-4 text-gray-400" />
                            <span className="text-sm text-gray-600 dark:text-gray-400">
                              ~{delivery.estimatedPrepTime}min prep
                            </span>
                          </div>

                          <span className={`px-2 py-1 text-xs rounded-full border ${getStatusColor(delivery.status)}`}>
                            {delivery.status.replace('_', ' ')}
                          </span>
                        </div>

                        <div className="flex items-center space-x-2">
                          {delivery.status === 'scheduled' || delivery.status === 'chef_assigned' ? (
                            <button
                              onClick={() => updateCookingStatus(delivery._id, 'preparing', 'Started cooking')}
                              className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
                              title="Start Cooking"
                            >
                              Start Cooking
                            </button>
                          ) : null}

                          {delivery.status === 'preparing' ? (
                            <button
                              onClick={() => updateCookingStatus(delivery._id, 'ready', 'Food is ready for pickup')}
                              className="px-3 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700"
                              title="Mark Ready"
                            >
                              Mark Ready
                            </button>
                          ) : null}

                          {delivery.status === 'ready' ? (
                            <div className="flex items-center space-x-1">
                              <CheckCircle className="h-4 w-4 text-green-500" />
                              <span className="text-xs text-green-600">Ready for pickup</span>
                            </div>
                          ) : null}
                        </div>
                      </div>

                      {delivery.mealDetails && (
                        <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-600">
                          <div className="flex items-center space-x-3">
                            {delivery.mealDetails.imageUrl && (
                              <img
                                src={delivery.mealDetails.imageUrl}
                                alt={delivery.mealDetails.title}
                                className="h-12 w-12 rounded object-cover"
                              />
                            )}
                            <div>
                              <p className="text-sm font-medium text-gray-900 dark:text-white">
                                {delivery.mealDetails.title}
                              </p>
                              {delivery.mealDetails.description && (
                                <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2">
                                  {delivery.mealDetails.description}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default NextAssignments;