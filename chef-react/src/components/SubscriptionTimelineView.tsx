import React, { useState, useEffect } from 'react';
import { chefSubscriptionsApi } from '../services/api';
import {
  Calendar,
  CheckCircle,
  Circle,
  PlayCircle,
  ChefHat,
  User,
  TrendingUp,
  Phone,
  Mail,
  ArrowLeft,
  AlertTriangle,
  Award
} from 'lucide-react';

interface TimelineStep {
  stepNumber: number;
  weekNumber: number;
  dayOfWeek: number;
  dayName: string;
  mealTime: string;
  mealTitle: string;
  mealDescription?: string;
  isCompleted: boolean;
  isInProgress: boolean;
  isUpcoming: boolean;
  scheduledDate?: string;
  actualDate?: string;
  status: string;
}

interface SubscriptionTimelineData {
  subscription: {
    _id: string;
    status: string;
    frequency: string;
    nextDeliveryDate: string;
  };
  customer: {
    _id: string;
    fullName: string;
    email: string;
    phone?: string;
  };
  mealPlan: {
    _id: string;
    planName: string;
    durationWeeks: number;
    planDescription?: string;
  };
  timeline: TimelineStep[];
  progression: {
    totalSteps: number;
    completedSteps: number;
    inProgressSteps: number;
    progressPercentage: number;
    currentPhase: string;
    estimatedCompletion: string;
  };
}

interface SubscriptionTimelineViewProps {
  subscriptionId: string;
  onBack: () => void;
}

const SubscriptionTimelineView: React.FC<SubscriptionTimelineViewProps> = ({ 
  subscriptionId, 
  onBack 
}) => {
  const [timelineData, setTimelineData] = useState<SubscriptionTimelineData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchTimelineData();
  }, [subscriptionId]);

  const fetchTimelineData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const data = await chefSubscriptionsApi.getSubscriptionTimeline(subscriptionId);
      setTimelineData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load subscription timeline');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Not scheduled';
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'delivered':
        return 'text-green-600 bg-green-100 dark:bg-green-800 dark:text-green-200';
      case 'preparing':
        return 'text-orange-600 bg-orange-100 dark:bg-orange-800 dark:text-orange-200';
      case 'ready':
        return 'text-blue-600 bg-blue-100 dark:bg-blue-800 dark:text-blue-200';
      case 'out_for_delivery':
        return 'text-purple-600 bg-purple-100 dark:bg-purple-800 dark:text-purple-200';
      case 'scheduled':
        return 'text-gray-600 bg-gray-100 dark:bg-gray-800 dark:text-gray-200';
      default:
        return 'text-gray-500 bg-gray-50 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  const getStepIcon = (step: TimelineStep) => {
    if (step.isCompleted) {
      return <CheckCircle size={20} className="text-green-500" />;
    } else if (step.isInProgress) {
      return <PlayCircle size={20} className="text-blue-500" />;
    } else {
      return <Circle size={20} className="text-gray-300" />;
    }
  };

  const getMealTimeIcon = (mealTime: string) => {
    switch (mealTime?.toLowerCase()) {
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

  const getPhaseColor = (phase: string) => {
    switch (phase) {
      case 'Completed':
        return 'text-green-600 bg-green-100 dark:bg-green-800 dark:text-green-200';
      case 'In Progress':
        return 'text-blue-600 bg-blue-100 dark:bg-blue-800 dark:text-blue-200';
      case 'Active':
        return 'text-orange-600 bg-orange-100 dark:bg-orange-800 dark:text-orange-200';
      default:
        return 'text-gray-600 bg-gray-100 dark:bg-gray-800 dark:text-gray-200';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-300">Loading subscription timeline...</p>
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
            <h3 className="text-red-800 dark:text-red-200 font-medium">Error loading timeline</h3>
            <p className="text-red-600 dark:text-red-300 mt-1">{error}</p>
          </div>
          <button
            onClick={fetchTimelineData}
            className="ml-4 px-4 py-2 bg-red-100 dark:bg-red-800 text-red-700 dark:text-red-200 rounded-lg hover:bg-red-200 dark:hover:bg-red-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!timelineData) return null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
        >
          <ArrowLeft size={20} />
          <span>Back to Dashboard</span>
        </button>
      </div>

      {/* Subscription Overview */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Customer Info */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <User size={20} />
              Customer Information
            </h3>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <User size={14} className="text-gray-500" />
                <span className="text-gray-900 dark:text-white font-medium">
                  {timelineData.customer.fullName}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Mail size={14} className="text-gray-500" />
                <span className="text-sm text-gray-600 dark:text-gray-300">
                  {timelineData.customer.email}
                </span>
              </div>
              {timelineData.customer.phone && (
                <div className="flex items-center gap-2">
                  <Phone size={14} className="text-gray-500" />
                  <span className="text-sm text-gray-600 dark:text-gray-300">
                    {timelineData.customer.phone}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Meal Plan Info */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <ChefHat size={20} />
              Meal Plan Details
            </h3>
            <div className="space-y-2">
              <div>
                <span className="font-medium text-gray-900 dark:text-white">
                  {timelineData.mealPlan.planName}
                </span>
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-300">
                Duration: {timelineData.mealPlan.durationWeeks} weeks
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-300">
                Frequency: {timelineData.subscription.frequency}
              </div>
            </div>
          </div>

          {/* Progress Summary */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <TrendingUp size={20} />
              Progress Summary
            </h3>
            <div className="space-y-3">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Completion
                  </span>
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    {timelineData.progression.progressPercentage}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div
                    className="bg-green-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${timelineData.progression.progressPercentage}%` }}
                  ></div>
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-300">Status</span>
                <span className={`px-2 py-1 text-xs rounded-full ${getPhaseColor(timelineData.progression.currentPhase)}`}>
                  {timelineData.progression.currentPhase}
                </span>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-300">Steps</span>
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  {timelineData.progression.completedSteps} / {timelineData.progression.totalSteps}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Timeline */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
          <Calendar size={20} />
          Meal Plan Timeline
        </h3>

        <div className="space-y-4">
          {timelineData.timeline.map((step, index) => (
            <div key={index} className="relative">
              {/* Timeline line */}
              {index < timelineData.timeline.length - 1 && (
                <div className="absolute left-10 top-12 w-0.5 h-12 bg-gray-200 dark:bg-gray-700"></div>
              )}
              
              <div className="flex items-start gap-4 p-4 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                {/* Step icon and number */}
                <div className="flex flex-col items-center">
                  {getStepIcon(step)}
                  <span className="text-xs font-medium text-gray-500 dark:text-gray-400 mt-1">
                    {step.stepNumber}
                  </span>
                </div>

                {/* Step details */}
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <span className="text-lg">{getMealTimeIcon(step.mealTime)}</span>
                      <div>
                        <h4 className="font-semibold text-gray-900 dark:text-white">
                          {step.mealTitle}
                        </h4>
                        <p className="text-sm text-gray-600 dark:text-gray-300">
                          Week {step.weekNumber} • {step.dayName} • {step.mealTime}
                        </p>
                      </div>
                    </div>
                    
                    <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(step.status)}`}>
                      {step.status.replace('_', ' ')}
                    </span>
                  </div>

                  {step.mealDescription && (
                    <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">
                      {step.mealDescription}
                    </p>
                  )}

                  <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                    <div className="flex items-center gap-1">
                      <Calendar size={12} />
                      <span>Scheduled: {formatDate(step.scheduledDate)}</span>
                    </div>
                    
                    {step.actualDate && (
                      <div className="flex items-center gap-1">
                        <CheckCircle size={12} />
                        <span>Completed: {formatDate(step.actualDate)}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Completion Message */}
        {timelineData.progression.currentPhase === 'Completed' && (
          <div className="mt-6 p-4 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-700 rounded-lg">
            <div className="flex items-center gap-2">
              <Award size={20} className="text-green-600" />
              <div>
                <h4 className="font-semibold text-green-800 dark:text-green-200">
                  Subscription Completed!
                </h4>
                <p className="text-sm text-green-700 dark:text-green-300">
                  Congratulations on successfully completing this meal plan subscription.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SubscriptionTimelineView;