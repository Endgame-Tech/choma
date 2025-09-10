import React, { useState, useEffect } from 'react';
import { chefSubscriptionsApi } from '../services/api';
import {
  ChevronLeft,
  ChevronRight,
  Clock,
  Users,
  ChefHat,
  TrendingUp,
  CheckCircle,
  AlertCircle,
  Zap
} from 'lucide-react';

interface WeeklyMeal {
  _id: string;
  scheduledDate: string;
  scheduledTimeSlot: {
    start: string;
    end: string;
  };
  mealTitle: string;
  mealDescription?: string;
  status: string;
  subscriptionId: {
    _id: string;
    frequency: string;
    deliverySchedule: any;
  };
  mealPlanAssignmentId?: {
    preparationTime: number;
    mealTime: string;
  };
}

interface DayPlan {
  date: string;
  dayName: string;
  meals: WeeklyMeal[];
}

interface BatchOpportunity {
  mealName: string;
  count: number;
  meals: Array<{
    assignmentId: string;
    scheduledDate: string;
    subscriptionId: string;
    status: string;
  }>;
  estimatedTimeSaving: number;
}

interface WeeklyPlanData {
  weekStart: string;
  weekEnd: string;
  weeklyPlan: DayPlan[];
  batchOpportunities: BatchOpportunity[];
  statistics: {
    totalMeals: number;
    mealsByStatus: Record<string, number>;
    uniqueSubscriptions: number;
    batchOpportunities: number;
  };
}

interface WeeklyPlanningViewProps {
  onBatchPrepare: (mealIds: string[]) => void;
}

const WeeklyPlanningView: React.FC<WeeklyPlanningViewProps> = ({ onBatchPrepare }) => {
  const [weeklyData, setWeeklyData] = useState<WeeklyPlanData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(new Date());
  const [selectedMeals, setSelectedMeals] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<'calendar' | 'batch'>('calendar');

  useEffect(() => {
    fetchWeeklyPlan();
  }, [currentWeekStart]);

  const fetchWeeklyPlan = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get start of week (Sunday)
      const weekStart = new Date(currentWeekStart);
      weekStart.setDate(weekStart.getDate() - weekStart.getDay());
      weekStart.setHours(0, 0, 0, 0);

      const data = await chefSubscriptionsApi.getWeeklyMealPlan({
        startDate: weekStart.toISOString()
      });

      setWeeklyData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load weekly plan');
    } finally {
      setLoading(false);
    }
  };

  const navigateWeek = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentWeekStart);
    newDate.setDate(newDate.getDate() + (direction === 'next' ? 7 : -7));
    setCurrentWeekStart(newDate);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      weekday: 'short', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled':
        return 'bg-gray-100 text-gray-700 border-gray-200';
      case 'chef_assigned':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'preparing':
        return 'bg-orange-100 text-orange-700 border-orange-200';
      case 'ready':
        return 'bg-green-100 text-green-700 border-green-200';
      case 'out_for_delivery':
        return 'bg-purple-100 text-purple-700 border-purple-200';
      case 'delivered':
        return 'bg-green-200 text-green-800 border-green-300';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
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

  const toggleMealSelection = (mealId: string) => {
    const newSelection = new Set(selectedMeals);
    if (newSelection.has(mealId)) {
      newSelection.delete(mealId);
    } else {
      newSelection.add(mealId);
    }
    setSelectedMeals(newSelection);
  };

  const handleBatchPrepare = () => {
    if (selectedMeals.size > 0) {
      onBatchPrepare(Array.from(selectedMeals));
      setSelectedMeals(new Set());
    }
  };

  const isToday = (dateString: string) => {
    const today = new Date();
    const date = new Date(dateString);
    return today.toDateString() === date.toDateString();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-300">Loading weekly plan...</p>
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
            <h3 className="text-red-800 dark:text-red-200 font-medium">Error loading weekly plan</h3>
            <p className="text-red-600 dark:text-red-300 mt-1">{error}</p>
          </div>
          <button
            onClick={fetchWeeklyPlan}
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
        <div className="flex items-center gap-4">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
            Weekly Meal Plan
          </h2>
          <div className="flex items-center gap-2 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
            <button
              onClick={() => setViewMode('calendar')}
              className={`px-3 py-2 text-sm font-medium rounded-l-lg transition-colors ${
                viewMode === 'calendar'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              Calendar
            </button>
            <button
              onClick={() => setViewMode('batch')}
              className={`px-3 py-2 text-sm font-medium rounded-r-lg transition-colors ${
                viewMode === 'batch'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              Batch View
            </button>
          </div>
        </div>

        {/* Week Navigation */}
        <div className="flex items-center gap-4">
          {weeklyData && (
            <div className="text-sm text-gray-600 dark:text-gray-300">
              {formatDate(weeklyData.weekStart)} - {formatDate(weeklyData.weekEnd)}
            </div>
          )}
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigateWeek('prev')}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              title="Previous week"
            >
              <ChevronLeft size={20} />
            </button>
            <button
              onClick={() => setCurrentWeekStart(new Date())}
              className="px-3 py-2 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              title="Go to current week"
            >
              Today
            </button>
            <button
              onClick={() => navigateWeek('next')}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              title="Next week"
            >
              <ChevronRight size={20} />
            </button>
          </div>
        </div>
      </div>

      {/* Weekly Statistics */}
      {weeklyData && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2 mb-2">
              <ChefHat size={16} className="text-blue-600" />
              <span className="text-sm font-medium text-gray-600 dark:text-gray-300">Total Meals</span>
            </div>
            <p className="text-2xl font-semibold text-gray-900 dark:text-white">
              {weeklyData.statistics.totalMeals}
            </p>
          </div>

          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2 mb-2">
              <Users size={16} className="text-green-600" />
              <span className="text-sm font-medium text-gray-600 dark:text-gray-300">Subscriptions</span>
            </div>
            <p className="text-2xl font-semibold text-gray-900 dark:text-white">
              {weeklyData.statistics.uniqueSubscriptions}
            </p>
          </div>

          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2 mb-2">
              <Zap size={16} className="text-orange-600" />
              <span className="text-sm font-medium text-gray-600 dark:text-gray-300">Batch Opportunities</span>
            </div>
            <p className="text-2xl font-semibold text-gray-900 dark:text-white">
              {weeklyData.statistics.batchOpportunities}
            </p>
          </div>

          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp size={16} className="text-purple-600" />
              <span className="text-sm font-medium text-gray-600 dark:text-gray-300">Time Savings</span>
            </div>
            <p className="text-2xl font-semibold text-gray-900 dark:text-white">
              {weeklyData.batchOpportunities.reduce((sum, batch) => sum + batch.estimatedTimeSaving, 0)}m
            </p>
          </div>
        </div>
      )}

      {/* Selection Actions */}
      {selectedMeals.size > 0 && (
        <div className="flex items-center justify-between p-4 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 rounded-lg">
          <div className="flex items-center gap-2">
            <CheckCircle size={20} className="text-blue-600" />
            <span className="font-medium text-blue-900 dark:text-blue-100">
              {selectedMeals.size} meals selected
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSelectedMeals(new Set())}
              className="px-3 py-2 text-sm text-blue-700 dark:text-blue-300 hover:text-blue-900 dark:hover:text-blue-100 transition-colors"
            >
              Clear Selection
            </button>
            <button
              onClick={handleBatchPrepare}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Batch Prepare
            </button>
          </div>
        </div>
      )}

      {/* Content based on view mode */}
      {viewMode === 'calendar' && weeklyData && (
        <div className="grid grid-cols-1 lg:grid-cols-7 gap-4">
          {weeklyData.weeklyPlan.map((day) => (
            <div
              key={day.date}
              className={`bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 ${
                isToday(day.date) ? 'ring-2 ring-blue-500' : ''
              }`}
            >
              <div className="text-center mb-4">
                <h3 className={`font-medium ${isToday(day.date) ? 'text-blue-600 dark:text-blue-400' : 'text-gray-900 dark:text-white'}`}>
                  {day.dayName}
                </h3>
                <p className={`text-sm ${isToday(day.date) ? 'text-blue-500' : 'text-gray-600 dark:text-gray-300'}`}>
                  {formatDate(day.date)}
                </p>
              </div>

              <div className="space-y-2">
                {day.meals.length === 0 ? (
                  <div className="text-center py-4 text-gray-400 dark:text-gray-500 text-sm">
                    No meals scheduled
                  </div>
                ) : (
                  day.meals.map((meal) => (
                    <div
                      key={meal._id}
                      className={`p-3 rounded-lg border cursor-pointer transition-all ${
                        selectedMeals.has(meal._id)
                          ? 'ring-2 ring-blue-500 bg-blue-50 dark:bg-blue-900/30'
                          : 'hover:shadow-sm'
                      } ${getStatusColor(meal.status)}`}
                      onClick={() => toggleMealSelection(meal._id)}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">
                            {getMealTimeIcon(meal.mealPlanAssignmentId?.mealTime ?? '')}
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">
                              {meal.mealTitle}
                            </p>
                          </div>
                        </div>
                      </div>

                      {meal.scheduledTimeSlot && (
                        <div className="flex items-center gap-1 text-xs text-gray-600 dark:text-gray-300 mb-1">
                          <Clock size={12} />
                          <span>{meal.scheduledTimeSlot.start} - {meal.scheduledTimeSlot.end}</span>
                        </div>
                      )}

                      <div className="flex items-center justify-between text-xs">
                        <span className="capitalize">
                          {meal.status.replace('_', ' ')}
                        </span>
                        {meal.mealPlanAssignmentId?.preparationTime && (
                          <span className="text-gray-500">
                            {meal.mealPlanAssignmentId.preparationTime}min
                          </span>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {viewMode === 'batch' && weeklyData && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {weeklyData.batchOpportunities.length === 0 ? (
            <div className="lg:col-span-2 text-center py-12 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
              <Zap size={48} className="mx-auto mb-4 text-gray-400 dark:text-gray-500" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                No Batch Opportunities This Week
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                Batch opportunities appear when you have 3 or more similar meals to prepare.
              </p>
            </div>
          ) : (
            weeklyData.batchOpportunities.map((batch, index) => (
              <div
                key={index}
                className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6"
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="font-medium text-gray-900 dark:text-white mb-1">
                      {batch.mealName}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      {batch.count} similar meals
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-semibold text-green-600">
                      {batch.estimatedTimeSaving}m
                    </div>
                    <p className="text-xs text-gray-500">time saved</p>
                  </div>
                </div>

                <div className="space-y-2 mb-4">
                  {batch.meals.slice(0, 3).map((meal) => (
                    <div
                      key={meal.assignmentId}
                      className="flex items-center justify-between text-sm p-2 bg-gray-50 dark:bg-gray-700 rounded"
                    >
                      <span>
                        {formatDate(meal.scheduledDate)}
                      </span>
                      <span className={`px-2 py-1 rounded-full text-xs ${getStatusColor(meal.status)}`}>
                        {meal.status.replace('_', ' ')}
                      </span>
                    </div>
                  ))}
                  {batch.meals.length > 3 && (
                    <p className="text-xs text-gray-500 text-center">
                      +{batch.meals.length - 3} more
                    </p>
                  )}
                </div>

                <button
                  onClick={() => onBatchPrepare(batch.meals.map(m => m.assignmentId))}
                  className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Prepare Batch
                </button>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default WeeklyPlanningView;