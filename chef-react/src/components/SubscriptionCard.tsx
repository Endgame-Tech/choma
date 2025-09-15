import React, { useState } from 'react';
import {
  User,
  Calendar,
  Clock,
  Star,
  TrendingUp,
  ChefHat,
  Mail,
  AlertTriangle,
  ArrowRight,
  MoreVertical
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
  todaysMeals: any[];
  upcomingMeals: any[];
  metrics: {
    totalDeliveries: number;
    onTimeRate: number;
    avgRating: number;
    consistencyScore: number;
  };
}

interface SubscriptionCardProps {
  assignment: SubscriptionAssignment;
  onViewTimeline: (subscriptionId: string) => void;
  onUpdateMealStatus: (assignmentIds: string[], status: string) => void;
}

const SubscriptionCard: React.FC<SubscriptionCardProps> = ({
  assignment,
  onViewTimeline,
  onUpdateMealStatus
}) => {
  const [showActions, setShowActions] = useState(false);
  const [processingAction, setProcessingAction] = useState<string | null>(null);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active':
        return 'text-green-700 bg-green-100 dark:bg-green-800 dark:text-green-100';
      case 'paused':
        return 'text-yellow-700 bg-yellow-100 dark:bg-yellow-800 dark:text-yellow-100';
      case 'completed':
        return 'text-blue-700 bg-blue-100 dark:bg-blue-800 dark:text-blue-100';
      default:
        return 'text-gray-700 bg-gray-100 dark:bg-gray-800 dark:text-gray-100';
    }
  };

  const getMealStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled':
        return 'text-gray-600 bg-gray-100';
      case 'chef_assigned':
        return 'text-blue-600 bg-blue-100';
      case 'preparing':
        return 'text-orange-600 bg-orange-100';
      case 'ready':
        return 'text-green-600 bg-green-100';
      case 'out_for_delivery':
        return 'text-purple-600 bg-purple-100';
      case 'delivered':
        return 'text-green-700 bg-green-200';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getPerformanceScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 75) return 'text-yellow-600';
    return 'text-red-600';
  };

  const handleQuickAction = async (action: string, mealIds: string[]) => {
    setProcessingAction(action);
    try {
      await onUpdateMealStatus(mealIds, action);
      // Add success feedback here if needed
    } catch (error) {
      console.error('Action failed:', error);
      // Add error feedback here if needed
    } finally {
      setProcessingAction(null);
    }
  };

  const pendingMealIds = assignment.todaysMeals
    .filter(meal => ['scheduled', 'chef_assigned'].includes(meal.status))
    .map(meal => meal._id);

  const preparingMealIds = assignment.todaysMeals
    .filter(meal => meal.status === 'preparing')
    .map(meal => meal._id);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 hover:shadow-md transition-shadow">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <div className="flex items-center gap-2">
              <User size={16} className="text-gray-600 dark:text-gray-300" />
              <h3 className="font-semibold text-gray-900 dark:text-white">
                {assignment.customerId.fullName}
              </h3>
            </div>
            <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(assignment.subscriptionId.status)}`}>
              {assignment.subscriptionId.status}
            </span>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-300 mb-1">
            {assignment.mealPlanId.planName} • {assignment.mealPlanId.durationWeeks} weeks
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Frequency: {assignment.subscriptionId.frequency}
          </p>
        </div>

        <div className="relative">
          <button
            onClick={() => setShowActions(!showActions)}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            title="Show actions"
          >
            <MoreVertical size={16} />
          </button>

          {showActions && (
            <div className="absolute right-0 top-full mt-1 w-48 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-10">
              <button
                onClick={() => {
                  onViewTimeline(assignment.subscriptionId._id);
                  setShowActions(false);
                }}
                className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2"
              >
                <Calendar size={14} />
                View Timeline
              </button>
              <button
                onClick={() => {
                  // Handle customer communication
                  setShowActions(false);
                }}
                className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2"
              >
                <Mail size={14} />
                Message Customer
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Performance Metrics */}
      <div className="grid grid-cols-3 gap-4 mb-4 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
        <div className="text-center">
          <div className="flex items-center justify-center gap-1 mb-1">
            <Star size={14} className="text-yellow-500" />
            <span className="text-sm font-medium text-gray-900 dark:text-white">
              {assignment.metrics.avgRating.toFixed(1)}
            </span>
          </div>
          <p className="text-xs text-gray-600 dark:text-gray-300">Rating</p>
        </div>

        <div className="text-center">
          <div className="flex items-center justify-center gap-1 mb-1">
            <Clock size={14} className="text-green-500" />
            <span className="text-sm font-medium text-gray-900 dark:text-white">
              {assignment.metrics.onTimeRate}%
            </span>
          </div>
          <p className="text-xs text-gray-600 dark:text-gray-300">On Time</p>
        </div>

        <div className="text-center">
          <div className="flex items-center justify-center gap-1 mb-1">
            <TrendingUp size={14} className={getPerformanceScoreColor(assignment.metrics.consistencyScore)} />
            <span className={`text-sm font-medium ${getPerformanceScoreColor(assignment.metrics.consistencyScore)}`}>
              {assignment.metrics.consistencyScore}
            </span>
          </div>
          <p className="text-xs text-gray-600 dark:text-gray-300">Score</p>
        </div>
      </div>

      {/* My Today's Meals */}
      {assignment.todaysMeals.length > 0 && (
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-medium text-gray-900 dark:text-white flex items-center gap-2">
              <ChefHat size={14} />
              My Today's Meals ({assignment.todaysMeals.length})
            </h4>

            {/* Quick Actions */}
            <div className="flex gap-1">
              {pendingMealIds.length > 0 && (
                <button
                  onClick={() => handleQuickAction('preparing', pendingMealIds)}
                  disabled={processingAction === 'preparing'}
                  className="px-2 py-1 text-xs bg-orange-100 text-orange-700 rounded hover:bg-orange-200 disabled:opacity-50 transition-colors"
                >
                  Start Prep
                </button>
              )}

              {preparingMealIds.length > 0 && (
                <button
                  onClick={() => handleQuickAction('ready', preparingMealIds)}
                  disabled={processingAction === 'ready'}
                  className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200 disabled:opacity-50 transition-colors"
                >
                  Mark Ready
                </button>
              )}
            </div>
          </div>

          <div className="space-y-2">
            {assignment.todaysMeals.slice(0, 3).map((meal, index) => (
              <div key={index} className="flex items-center justify-between text-sm">
                <div className="flex-1">
                  <span className="text-gray-900 dark:text-white">
                    {meal.mealTitle || 'Meal Assignment'}
                  </span>
                  {meal.scheduledTimeSlot && (
                    <span className="text-gray-500 dark:text-gray-400 ml-2">
                      ({meal.scheduledTimeSlot.start} - {meal.scheduledTimeSlot.end})
                    </span>
                  )}
                </div>
                <span className={`px-2 py-1 text-xs rounded-full ${getMealStatusColor(meal.status)}`}>
                  {meal.status.replace('_', ' ')}
                </span>
              </div>
            ))}

            {assignment.todaysMeals.length > 3 && (
              <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
                +{assignment.todaysMeals.length - 3} more meals
              </p>
            )}
          </div>
        </div>
      )}

      {/* Next Delivery */}
      <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-300 mb-4">
        <div className="flex items-center gap-2">
          <Calendar size={14} />
          <span>Next: {formatDate(assignment.subscriptionId.nextDeliveryDate)}</span>
        </div>
        <div className="flex items-center gap-2">
          <span>{assignment.metrics.totalDeliveries} deliveries</span>
        </div>
      </div>

      {/* Dietary Information */}
      {(assignment.subscriptionId.dietaryPreferences.length > 0 || assignment.subscriptionId.allergens.length > 0) && (
        <div className="border-t border-gray-200 dark:border-gray-700 pt-3">
          <div className="flex flex-wrap gap-1">
            {assignment.subscriptionId.dietaryPreferences.slice(0, 2).map((pref, index) => (
              <span
                key={index}
                className="px-2 py-1 text-xs bg-blue-100 text-blue-700 dark:bg-blue-800 dark:text-blue-200 rounded"
              >
                {pref}
              </span>
            ))}

            {assignment.subscriptionId.allergens.slice(0, 2).map((allergen, index) => (
              <span
                key={index}
                className="px-2 py-1 text-xs bg-red-100 text-red-700 dark:bg-red-800 dark:text-red-200 rounded flex items-center gap-1"
              >
                <AlertTriangle size={10} />
                {allergen}
              </span>
            ))}

            {(assignment.subscriptionId.dietaryPreferences.length > 2 || assignment.subscriptionId.allergens.length > 2) && (
              <span className="px-2 py-1 text-xs bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300 rounded">
                +more
              </span>
            )}
          </div>
        </div>
      )}

      {/* Action Button */}
      <div className="flex justify-end pt-3 border-t border-gray-200 dark:border-gray-700 mt-4">
        <button
          onClick={() => onViewTimeline(assignment.subscriptionId._id)}
          className="flex items-center gap-2 px-4 py-2 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors"
        >
          <span>View Full Timeline</span>
          <ArrowRight size={14} />
        </button>
      </div>
    </div>
  );
};

export default SubscriptionCard;