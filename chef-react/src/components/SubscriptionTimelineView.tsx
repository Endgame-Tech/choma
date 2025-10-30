import React, { useState, useEffect } from 'react';
import { chefSubscriptionsApi } from '../services/api';
import {
  Calendar,
  ChefHat,
  User,
  TrendingUp,
  Phone,
  Mail,
  ArrowLeft,
  AlertTriangle,
  Award,
  Edit3,
  X
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
    isFiveWorkingDays?: boolean;
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

interface DayGroup {
  weekNumber: number;
  dayOfWeek: number;
  dayName: string;
  scheduledDate?: string;
  mealSlots: TimelineStep[];
}

const SubscriptionTimelineView: React.FC<SubscriptionTimelineViewProps> = ({
  subscriptionId,
  onBack
}) => {
  const [timelineData, setTimelineData] = useState<SubscriptionTimelineData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [selectedMeal, setSelectedMeal] = useState<TimelineStep | null>(null);
  const [selectedStatus, setSelectedStatus] = useState('');
  const [updating, setUpdating] = useState(false);
  const [showUpdateAllModal, setShowUpdateAllModal] = useState(false);
  const [selectedDay, setSelectedDay] = useState<DayGroup | null>(null);
  const [updateAllStatus, setUpdateAllStatus] = useState('');

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

  const handleOpenStatusModal = (step: TimelineStep) => {
    setSelectedMeal(step);
    setSelectedStatus(step.status);
    setShowStatusModal(true);
  };

  const handleCloseStatusModal = () => {
    setShowStatusModal(false);
    setSelectedMeal(null);
    setSelectedStatus('');
  };

  const handleUpdateMealStatus = async () => {
    if (!selectedMeal) {
      console.log('No meal selected');
      return;
    }

    // Use the scheduledDate if available
    let mealDate = selectedMeal.scheduledDate;

    if (!mealDate) {
      console.warn('Missing scheduledDate for meal:', selectedMeal);
      setError('This meal does not have a scheduled date yet. Please ensure the subscription has meal schedules set up.');
      return;
    }

    // Extract just the date part (YYYY-MM-DD) from the ISO string
    const dateOnly = new Date(mealDate).toISOString().split('T')[0];
    const mealType = selectedMeal.mealTime as 'breakfast' | 'lunch' | 'dinner';

    console.log('Updating individual meal status:', {
      subscriptionId,
      date: dateOnly,
      mealType,
      newStatus: selectedStatus,
      currentStatus: selectedMeal.status,
    });

    setUpdating(true);
    try {
      // Call NEW individual meal type update API
      const result = await chefSubscriptionsApi.updateMealTypeStatus(
        subscriptionId,
        dateOnly,
        mealType,
        selectedStatus
      );

      console.log('Update successful:', result);

      // Refresh timeline data
      await fetchTimelineData();
      handleCloseStatusModal();
    } catch (err) {
      console.error('Failed to update meal status:', err);
      setError(err instanceof Error ? err.message : 'Failed to update meal status');
    } finally {
      setUpdating(false);
    }
  };

  // Group timeline by day (weekNumber + dayOfWeek)
  // Reference: user-mobile/src/screens/subscription/MyPlanScreen.js
  const groupTimelineByDay = (timeline: TimelineStep[]): DayGroup[] => {
    const grouped: Record<string, DayGroup> = {};

    timeline.forEach((step) => {
      const key = `${step.weekNumber}-${step.dayOfWeek}`;

      if (!grouped[key]) {
        grouped[key] = {
          weekNumber: step.weekNumber,
          dayOfWeek: step.dayOfWeek,
          dayName: step.dayName,
          scheduledDate: step.scheduledDate,
          mealSlots: []
        };
      }

      grouped[key].mealSlots.push(step);
    });

    // Sort meal slots by meal time order (breakfast → lunch → dinner)
    const mealTimeOrder: Record<string, number> = { breakfast: 1, lunch: 2, dinner: 3 };

    Object.values(grouped).forEach(day => {
      day.mealSlots.sort((a, b) => {
        const timeA = a.mealTime?.toLowerCase() || '';
        const timeB = b.mealTime?.toLowerCase() || '';
        return (mealTimeOrder[timeA] || 999) - (mealTimeOrder[timeB] || 999);
      });
    });

    // Sort days chronologically (by week then day)
    return Object.values(grouped).sort((a, b) => {
      if (a.weekNumber !== b.weekNumber) {
        return a.weekNumber - b.weekNumber;
      }
      return a.dayOfWeek - b.dayOfWeek;
    });
  };

  // Handle "Update All" button click for a day
  const handleUpdateAllForDay = (day: DayGroup) => {
    setSelectedDay(day);
    setUpdateAllStatus('ready'); // Default to "ready"
    setShowUpdateAllModal(true);
  };

  // Confirm and execute "Update All" for a day
  const confirmUpdateAll = async () => {
    if (!selectedDay || !selectedDay.scheduledDate) return;

    const dateOnly = new Date(selectedDay.scheduledDate).toISOString().split('T')[0];

    console.log('Updating all meals for day:', {
      subscriptionId,
      date: dateOnly,
      status: updateAllStatus,
    });

    setUpdating(true);
    try {
      // Call existing batch update API
      const result = await chefSubscriptionsApi.updateDailyMealsStatus(
        subscriptionId,
        dateOnly,
        updateAllStatus
      );

      console.log('Batch update successful:', result);

      // Refresh timeline data
      await fetchTimelineData();
      setShowUpdateAllModal(false);
      setSelectedDay(null);
    } catch (err) {
      console.error('Failed to update all meals:', err);
      setError(err instanceof Error ? err.message : 'Failed to update all meals');
    } finally {
      setUpdating(false);
    }
  };

  const statusOptions = [
    { value: 'scheduled', label: 'Scheduled', color: 'text-gray-600 bg-gray-100' },
    { value: 'chef_assigned', label: 'Chef Assigned', color: 'text-blue-600 bg-blue-100' },
    { value: 'preparing', label: 'Preparing', color: 'text-orange-600 bg-orange-100' },
    { value: 'ready', label: 'Ready', color: 'text-green-600 bg-green-100' }
    // Note: 'out_for_delivery' and 'delivered' are handled automatically by the driver system
  ];

  // Helper to check if a status button should be disabled (already passed)
  const isStatusPassed = (currentStatus: string, targetStatus: string) => {
    const statusOrder = ['scheduled', 'chef_assigned', 'preparing', 'ready', 'out_for_delivery', 'delivered'];
    const currentIndex = statusOrder.indexOf(currentStatus);
    const targetIndex = statusOrder.indexOf(targetStatus);

    // Disable if target status is before current status (going backwards)
    return targetIndex < currentIndex;
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
                Duration: {timelineData.mealPlan.isFiveWorkingDays
                  ? `${timelineData.mealPlan.durationWeeks * 5} Days Plan • 5/week`
                  : `${timelineData.mealPlan.durationWeeks} week(s)`}
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

      {/* Timeline - Grouped by Day */}
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <Calendar size={24} />
          Meal Plan Timeline
        </h2>

        {groupTimelineByDay(timelineData.timeline).map((day) => {
          // Check if all meals for this day are ready
          const allReady = day.mealSlots.every(slot => slot.status === 'ready');

          return (
            <div
              key={`${day.weekNumber}-${day.dayOfWeek}`}
              className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden border border-gray-200 dark:border-gray-700"
            >
              {/* Day Header */}
              <div className="bg-gradient-to-r from-orange-500 to-orange-600 px-6 py-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xl font-bold text-white">
                      {day.dayName}
                    </h3>
                    <p className="text-orange-100 text-sm">
                      Week {day.weekNumber} • Day {day.dayOfWeek}
                    </p>
                    {day.scheduledDate && (
                      <p className="text-orange-100 text-sm">
                        {formatDate(day.scheduledDate)}
                      </p>
                    )}
                  </div>
                  {allReady && (
                    <div className="bg-green-500 text-white px-3 py-1 rounded-full text-sm font-semibold">
                      ✅ Ready for Delivery
                    </div>
                  )}
                </div>
              </div>

              {/* Meal Slots */}
              <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {day.mealSlots.map((meal) => (
                  <div
                    key={meal.mealTime}
                    className="px-6 py-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4 flex-1">
                        {/* Meal Icon */}
                        <span className="text-3xl">{getMealTimeIcon(meal.mealTime)}</span>

                        {/* Meal Info */}
                        <div className="flex-1">
                          <h4 className="font-semibold text-gray-900 dark:text-white capitalize">
                            {meal.mealTime}
                          </h4>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {meal.mealTitle || 'No title'}
                          </p>
                        </div>

                        {/* Status Badge */}
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(meal.status)}`}>
                          {meal.status.replace('_', ' ').toUpperCase()}
                        </span>

                        {/* Edit Button */}
                        <button
                          onClick={() => handleOpenStatusModal(meal)}
                          className="flex items-center space-x-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
                        >
                          <Edit3 size={16} />
                          <span>Edit</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Update All Button */}
              <div className="px-6 py-4 bg-gray-50 dark:bg-gray-900">
                <button
                  onClick={() => handleUpdateAllForDay(day)}
                  className="w-full flex items-center justify-center space-x-2 px-6 py-3 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white rounded-lg font-semibold transition-all transform hover:scale-[1.02]"
                >
                  <ChefHat size={20} />
                  <span>Update All Meals for {day.dayName}</span>
                </button>
              </div>
            </div>
          );
        })}

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

      {/* Status Update Modal */}
      {showStatusModal && selectedMeal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full p-6">
            {/* Modal Header */}
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Update Meal Status
              </h3>
              <button
                onClick={handleCloseStatusModal}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                title="Close"
                aria-label="Close"
              >
                <X size={20} />
              </button>
            </div>

            {/* Meal Info */}
            <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-lg">{getMealTimeIcon(selectedMeal.mealTime)}</span>
                <h4 className="font-semibold text-gray-900 dark:text-white">
                  {selectedMeal.mealTitle}
                </h4>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                Week {selectedMeal.weekNumber} • {selectedMeal.dayName} • {selectedMeal.mealTime}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {formatDate(selectedMeal.scheduledDate)}
              </p>
            </div>

            {/* Status Options */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Select Status
              </label>
              <div className="space-y-2">
                {statusOptions.map((option) => {
                  const isPassed = isStatusPassed(selectedMeal.status, option.value);
                  const isCurrent = selectedMeal.status === option.value;

                  return (
                    <button
                      key={option.value}
                      onClick={() => setSelectedStatus(option.value)}
                      disabled={isPassed || isCurrent}
                      className={`w-full text-left px-4 py-3 rounded-lg border-2 transition-all ${selectedStatus === option.value
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30'
                        : isPassed || isCurrent
                          ? 'border-gray-200 dark:border-gray-600 bg-gray-100 dark:bg-gray-700 opacity-50 cursor-not-allowed'
                          : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                        }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className={`font-medium ${isPassed || isCurrent ? 'text-gray-400 dark:text-gray-500' : 'text-gray-900 dark:text-white'}`}>
                          {option.label}
                          {isCurrent && <span className="ml-2 text-xs">(Current)</span>}
                          {isPassed && !isCurrent && <span className="ml-2 text-xs">(Passed)</span>}
                        </span>
                        <span className={`px-2 py-1 text-xs rounded-full ${option.color} ${isPassed || isCurrent ? 'opacity-50' : ''}`}>
                          {option.label}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <button
                onClick={handleCloseStatusModal}
                className="flex-1 px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                disabled={updating}
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateMealStatus}
                disabled={updating || selectedStatus === selectedMeal.status}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
              >
                {updating ? 'Updating...' : 'Update Status'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Update All Meals Modal */}
      {showUpdateAllModal && selectedDay !== null && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6">
            {/* Modal Header */}
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Update All Meals for {selectedDay!.dayName}
              </h3>
              <button
                onClick={() => setShowUpdateAllModal(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                title="Close"
                aria-label="Close"
              >
                <X size={20} />
                <span className="sr-only">Close</span>
              </button>
            </div>

            {/* Day Info */}
            <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
              <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
                Week {selectedDay!.weekNumber} • {selectedDay!.dayName}
              </h4>
              <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">
                {selectedDay!.scheduledDate && formatDate(selectedDay!.scheduledDate)}
              </p>
              <div className="space-y-1">
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  This will update the status for:
                </p>
                {selectedDay!.mealSlots.map((slot) => (
                  <div key={slot.mealTime} className="flex items-center gap-2 text-sm">
                    <span>{getMealTimeIcon(slot.mealTime)}</span>
                    <span className="text-gray-700 dark:text-gray-300">
                      {slot.mealTime?.charAt(0).toUpperCase() + slot.mealTime?.slice(1)}
                    </span>
                    <span className="text-gray-500 dark:text-gray-400">
                      (currently: {slot.status})
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Status Options */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Select New Status for All Meals
              </label>
              <div className="space-y-2">
                {statusOptions.map((option) => {
                  // Get the most advanced status among all meals for this day
                  const statusOrder = ['scheduled', 'chef_assigned', 'preparing', 'ready', 'out_for_delivery', 'delivered'];
                  const mealStatuses = selectedDay!.mealSlots.map(slot => slot.status);
                  const maxStatusIndex = Math.max(...mealStatuses.map(s => statusOrder.indexOf(s)));
                  const mostAdvancedStatus = statusOrder[maxStatusIndex];

                  const isPassed = isStatusPassed(mostAdvancedStatus, option.value);

                  return (
                    <button
                      key={option.value}
                      onClick={() => setUpdateAllStatus(option.value)}
                      disabled={isPassed}
                      className={`w-full text-left px-4 py-3 rounded-lg border-2 transition-all ${updateAllStatus === option.value
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30'
                        : isPassed
                          ? 'border-gray-200 dark:border-gray-600 bg-gray-100 dark:bg-gray-700 opacity-50 cursor-not-allowed'
                          : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                        }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className={`font-medium ${isPassed ? 'text-gray-400 dark:text-gray-500' : 'text-gray-900 dark:text-white'}`}>
                          {option.label}
                          {isPassed && <span className="ml-2 text-xs">(Passed)</span>}
                        </span>
                        <span className={`px-2 py-1 text-xs rounded-full ${option.color} ${isPassed ? 'opacity-50' : ''}`}>
                          {option.label}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <button
                onClick={() => setShowUpdateAllModal(false)}
                className="flex-1 px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                disabled={updating}
              >
                Cancel
              </button>
              <button
                onClick={confirmUpdateAll}
                disabled={updating || !updateAllStatus}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
              >
                {updating ? 'Updating...' : `Update All (${selectedDay!.mealSlots.length} meals)`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SubscriptionTimelineView;