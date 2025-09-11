import React, { useState } from 'react';
import {
  User,
  Clock,
  Star,
  ChefHat,
  AlertTriangle,
  Calendar,
  CheckCircle,
  Eye,
  X
} from 'lucide-react';

interface MealComponent {
  type: 'breakfast' | 'lunch' | 'dinner';
  name: string;
  isCompleted: boolean;
  completedAt?: string;
}

interface SubscriptionDelivery {
  _id: string;
  scheduledDate: string;
  status: string;
  mealComponents: MealComponent[];
  consolidatedDays?: number; // For multi-day deliveries
  address: {
    street: string;
    city: string;
    zipCode: string;
  };
}



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
  deliveries?: SubscriptionDelivery[];
  // Driver assignment coordination
  driverAssignmentId?: string;
  packageLabelId?: string;
}

interface SubscriptionCardProps {
  assignment: SubscriptionAssignment;
  onViewTimeline: (subscriptionId: string) => void;
  onUpdateMealStatus: (assignmentIds: string[], status: string) => void;
}

const SubscriptionCard: React.FC<SubscriptionCardProps> = ({
  assignment,
  onUpdateMealStatus
}) => {
  // State for meal status tracking
  const [mealStatuses, setMealStatuses] = useState<{ [key: string]: string }>({});
  const [showFullSchedule, setShowFullSchedule] = useState(false);
  const [loadingMeals, setLoadingMeals] = useState<{ [key: string]: boolean }>({});

  // Debug log to see the data structure
  console.log('SubscriptionCard assignment:', assignment);

  // Safety check - if no assignment data, show loading or error
  if (!assignment) {
    return (
      <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-6">
        <div className="text-center text-gray-500">No assignment data available</div>
      </div>
    );
  }

  // Generate today's expected meal schedule, merging backend data with default schedule
  const generateTodaysSchedule = () => {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    // Always show all three meal types for the day
    const defaultMealTypes = ['breakfast', 'lunch', 'dinner'];

    // Get meals from backend if available
    const backendMeals = assignment.todaysMeals || [];

    // Create a map of backend meals by meal type for easy lookup
    const backendMealsByType: { [key: string]: any } = {};
    backendMeals.forEach(meal => {
      const mealType = meal.mealType || 'breakfast';
      backendMealsByType[mealType] = meal;
    });

    // Generate complete schedule by merging backend data with defaults
    const completeSchedule = defaultMealTypes.map(mealType => {
      const backendMeal = backendMealsByType[mealType];

      if (backendMeal) {
        // Use backend meal data if it exists
        return {
          ...backendMeal,
          mealType,
          status: backendMeal.status || 'scheduled',
          deliveryDate: backendMeal.deliveryDate || todayStr,
          isScheduled: true,
          hasBackendData: true
        };
      } else {
        // Use default meal data if no backend data exists
        return {
          mealType,
          name: `${assignment.mealPlanId.planName} - ${mealType.charAt(0).toUpperCase() + mealType.slice(1)}`,
          deliveryDate: todayStr,
          status: 'scheduled',
          isScheduled: true,
          hasBackendData: false
        };
      }
    });

    return completeSchedule;
  };

  // Always show today's scheduled meals - this is the key change!
  const mealsToPrepareToday = generateTodaysSchedule();

  // Initialize meal statuses from the complete schedule (backend + defaults)
  React.useEffect(() => {
    const initialStatuses: { [key: string]: string } = {};
    const schedule = generateTodaysSchedule();

    schedule.forEach((meal, index) => {
      const mealKey = `${assignment._id}-${index}`;
      initialStatuses[mealKey] = meal.status || 'scheduled';
    });

    setMealStatuses(initialStatuses);
  }, [assignment.todaysMeals, assignment._id]);

  // Calculate total subscription duration and progress
  const calculateSubscriptionProgress = () => {
    const durationWeeks = assignment.mealPlanId.durationWeeks || 4;
    const totalDays = durationWeeks * 7;
    const startDate = new Date(assignment.assignedAt);
    const currentDate = new Date();
    const daysPassed = Math.max(0, Math.floor((currentDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)));
    const daysCompleted = Math.min(daysPassed, totalDays);
    const remainingDays = Math.max(0, totalDays - daysCompleted);

    return {
      completed: daysCompleted,
      total: totalDays,
      remaining: remainingDays,
      progress: totalDays > 0 ? Math.round((daysCompleted / totalDays) * 100) : 0
    };
  };

  const subscriptionProgress = calculateSubscriptionProgress();

  // Functions to handle meal status updates
  const handleMealStatusUpdate = async (mealIndex: number, newStatus: string) => {
    const meal = mealsToPrepareToday[mealIndex];
    const mealKey = `${assignment._id}-${mealIndex}`;

    // Set loading state
    setLoadingMeals(prev => ({
      ...prev,
      [mealKey]: true
    }));

    // Optimistic UI update
    setMealStatuses(prev => ({
      ...prev,
      [mealKey]: newStatus
    }));

    try {
      // Import the API module dynamically or add it to the component imports
      const apiModule = await import('../services/api');

      // Make API call using the configured axios instance
      const data = await apiModule.chefSubscriptionsApi.updateSubscriptionMealStatus({
        subscriptionAssignmentId: assignment._id,
        mealType: meal.mealType,
        status: newStatus,
        notes: `Meal ${newStatus} via chef interface`
      });

      console.log('✅ Meal status updated successfully:', data);

      // Update local state with the actual backend status
      if (data.mealAssignment && data.mealAssignment.status) {
        setMealStatuses(prev => ({
          ...prev,
          [mealKey]: data.mealAssignment.status
        }));
      }

      // Show success message based on completion status
      if (data.dailyWorkloadCompleted) {
        console.log(`🎯 All daily meals completed! Pickup notifications sent.`);
        alert(`🎉 All daily meals completed! Driver and customer have been notified for pickup.`);
      } else if (data.driverAssignment) {
        console.log(`🚚 Meal assigned to driver: ${data.driverAssignment.driverName}`);
        alert(`Meal prepared and assigned to driver: ${data.driverAssignment.driverName}`);
      }

      // Call the parent callback if provided - this should trigger a refresh
      if (onUpdateMealStatus) {
        onUpdateMealStatus([assignment._id], newStatus);
      }

      // Force parent component to refresh subscription data
      window.dispatchEvent(new CustomEvent('refreshSubscriptionData', {
        detail: { assignmentId: assignment._id, newStatus }
      }));

    } catch (error) {
      console.error('❌ Error updating meal status:', error);

      // Revert optimistic update on error
      setMealStatuses(prev => ({
        ...prev,
        [mealKey]: meal.status || 'scheduled'
      }));

      // Show error message to user (you can enhance this with a toast notification)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      alert(`Failed to update meal status: ${errorMessage}`);
    } finally {
      // Clear loading state
      setLoadingMeals(prev => ({
        ...prev,
        [mealKey]: false
      }));
    }
  };

  const getMealStatus = (mealIndex: number, defaultStatus: string) => {
    const mealKey = `${assignment._id}-${mealIndex}`;
    const status = mealStatuses[mealKey] || defaultStatus || 'scheduled';

    // Map backend enum values to frontend display values for consistency
    const backendToFrontendMapping: { [key: string]: string } = {
      'scheduled': 'scheduled',
      'chef_assigned': 'scheduled',
      'preparing': 'in_progress',
      'ready': 'completed',
      'out_for_delivery': 'completed',
      'delivered': 'completed',
      'failed': 'scheduled', // Reset to allow retry
      'cancelled': 'cancelled',
      'skipped': 'cancelled'
    };

    return backendToFrontendMapping[status] || status;
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active': return 'text-green-600 bg-green-100';
      case 'pending': return 'text-yellow-600 bg-yellow-100';
      case 'completed': return 'text-blue-600 bg-blue-100';
      case 'cancelled': return 'text-red-600 bg-red-100';
      case 'paused': return 'text-gray-600 bg-gray-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };



  return (
    <div className="bg-white rounded-lg shadow-lg border border-gray-200 hover:shadow-xl transition-shadow duration-200">
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex justify-between items-start">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
              <User className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h3 className="font-semibold text-lg text-gray-900">
                {assignment.customerId.fullName}
              </h3>
              <p className="text-sm text-gray-600">{assignment.mealPlanId.planName}</p>
              <p className="text-xs text-gray-500 mt-1">Assignment ID: {assignment._id}</p>
              {assignment.packageLabelId && (
                <p className="text-xs text-blue-600 font-mono mt-1 bg-blue-50 px-2 py-1 rounded border">
                  📦 Package Label: {assignment.packageLabelId}
                </p>
              )}
            </div>
          </div>
          <div className="text-right">
            <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(assignment.assignmentStatus)}`}>
              {assignment.assignmentStatus.toUpperCase()}
            </span>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="p-6 border-b border-gray-200">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="flex items-center justify-center space-x-1">
              <Star className="w-4 h-4 text-yellow-500" />
              <span className="font-semibold text-lg">{assignment.performance.averageRating.toFixed(1)}</span>
            </div>
            <p className="text-xs text-gray-600">Performance</p>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center space-x-1">
              <ChefHat className="w-4 h-4 text-green-500" />
              <span className="font-semibold text-lg">
                {subscriptionProgress.completed}/{subscriptionProgress.total}
              </span>
            </div>
            <p className="text-xs text-gray-600">Days ({subscriptionProgress.progress}%)</p>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center space-x-1">
              <Clock className="w-4 h-4 text-orange-500" />
              <span className="font-semibold text-lg">{mealsToPrepareToday.length}</span>
            </div>
            <p className="text-xs text-gray-600">To Prepare</p>
          </div>
          <div className="text-center">
            <span className="font-semibold text-lg">$0</span>
            <p className="text-xs text-gray-600">Earned</p>
          </div>
        </div>
      </div>

      {/* Meals to Prepare Today */}
      <div className="p-6">
        <div className="flex justify-between items-center mb-4">
          <h4 className="font-medium text-gray-900 flex items-center space-x-2">
            <ChefHat className="w-4 h-4" />
            <span>Today's Workload ({mealsToPrepareToday.length})</span>
            <span className="text-xs text-gray-500">(delivery + preparation)</span>
          </h4>
          <button
            onClick={() => setShowFullSchedule(true)}
            className="flex items-center space-x-2 px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm font-medium hover:bg-blue-100 transition-colors"
          >
            <Eye className="w-4 h-4" />
            <span>View Full Schedule</span>
          </button>
        </div>

        <div className="space-y-4">
          {mealsToPrepareToday.map((meal, index) => (
            <div key={index} className="border border-gray-200 rounded-lg p-4 bg-white">
              <div className="flex justify-between items-start">
                <div className="flex items-center space-x-3">
                  <ChefHat className="w-5 h-5 text-blue-500" />
                  <div>
                    <span className="font-medium text-gray-900">
                      {meal?.mealType ? `${meal.mealType.charAt(0).toUpperCase()}${meal.mealType.slice(1)}` : `Meal ${index + 1}`}
                    </span>
                    {meal?.name && (
                      <p className="text-sm text-gray-600">{meal.name}</p>
                    )}
                    {meal?.description && (
                      <p className="text-xs text-gray-500 mt-1">{meal.description}</p>
                    )}
                    <p className="text-xs text-blue-600 mt-1">
                      📅 Delivery: {meal.deliveryDate ? new Date(meal.deliveryDate).toLocaleDateString() : 'Today'}
                      {meal.hasBackendData && (
                        <span className="ml-2 px-1 py-0.5 bg-green-100 text-green-700 rounded text-xs">Tracked</span>
                      )}
                    </p>
                  </div>
                </div>

                <div className="flex flex-col items-end space-y-2">
                  {(() => {
                    const status = getMealStatus(index, meal.status);

                    switch (status) {
                      case 'completed':
                      case 'ready':
                      case 'ready_for_pickup':
                        return (
                          <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                            ✅ COMPLETED
                          </span>
                        );
                      case 'in_progress':
                      case 'preparing':
                        return (
                          <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                            🔄 IN PROGRESS
                          </span>
                        );
                      case 'scheduled':
                      default:
                        return (
                          <span className="px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-700">
                            🚨 URGENT
                          </span>
                        );
                    }
                  })()}
                  <div className="flex items-center space-x-1 text-xs text-gray-500">
                    <Clock className="w-3 h-3" />
                    <span>📦 Deliver today</span>
                  </div>
                </div>
              </div>

              {/* Action buttons for meal preparation */}
              <div className="mt-4 flex space-x-2">
                {(() => {
                  const status = getMealStatus(index, meal.status);
                  const mealKey = `${assignment._id}-${index}`;
                  const isLoading = loadingMeals[mealKey];

                  if (status === 'completed' || status === 'ready' || status === 'ready_for_pickup') {
                    return (
                      <div className={`flex-1 py-2 px-3 rounded-md text-sm font-medium text-center ${isLoading ? 'bg-gray-50 text-gray-700' : 'bg-green-50 text-green-700'}`}>
                        {isLoading ? '🔄 Updating...' : '✅ Completed'}
                      </div>
                    );
                  } else if (status === 'in_progress' || status === 'preparing') {
                    return (
                      <>
                        <button
                          onClick={() => handleMealStatusUpdate(index, 'completed')}
                          disabled={isLoading}
                          className="flex-1 bg-green-50 text-green-700 py-2 px-3 rounded-md text-sm font-medium hover:bg-green-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {isLoading ? 'Updating...' : 'Mark Complete'}
                        </button>
                      </>
                    );
                  } else {
                    // scheduled, pending, etc.
                    return (
                      <>
                        <button
                          onClick={() => handleMealStatusUpdate(index, 'in_progress')}
                          disabled={isLoading}
                          className="flex-1 bg-blue-50 text-blue-700 py-2 px-3 rounded-md text-sm font-medium hover:bg-blue-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {isLoading ? 'Starting...' : 'Start Preparation'}
                        </button>
                        <button
                          onClick={() => handleMealStatusUpdate(index, 'completed')}
                          disabled={isLoading}
                          className="flex-1 bg-green-50 text-green-700 py-2 px-3 rounded-md text-sm font-medium hover:bg-green-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {isLoading ? 'Completing...' : 'Mark Complete'}
                        </button>
                      </>
                    );
                  }
                })()}
              </div>
            </div>
          ))}
        </div>



        {/* Dietary Restrictions & Allergies */}
        {(assignment.subscriptionId.dietaryPreferences?.length || assignment.subscriptionId.allergens?.length) && (
          <div className="mt-6 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
            <div className="flex items-start space-x-2">
              <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5" />
              <div>
                <h5 className="font-medium text-yellow-800">Special Requirements</h5>
                {assignment.subscriptionId.dietaryPreferences?.length && (
                  <p className="text-sm text-yellow-700">
                    <strong>Diet:</strong> {assignment.subscriptionId.dietaryPreferences.join(', ')}
                  </p>
                )}
                {assignment.subscriptionId.allergens?.length && (
                  <p className="text-sm text-yellow-700">
                    <strong>Allergies:</strong> {assignment.subscriptionId.allergens.join(', ')}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modal for Full Schedule View */}
      {showFullSchedule && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div className="flex items-center space-x-2">
                <Calendar className="w-5 h-5 text-blue-600" />
                <h3 className="text-lg font-medium text-gray-900">
                  Full Weekly Schedule - {assignment.customerId.fullName}
                </h3>
              </div>
              <button
                onClick={() => setShowFullSchedule(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
                aria-label="Close schedule modal"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto max-h-[70vh]">
              <div className="space-y-3">
                {/* Generate a 7-day schedule */}
                {Array.from({ length: 7 }, (_, dayIndex) => {
                  const date = new Date();
                  date.setDate(date.getDate() + dayIndex);
                  const isToday = dayIndex === 0;

                  return (
                    <div key={dayIndex} className={`p-4 rounded-lg border ${isToday ? 'bg-blue-50 border-blue-200' : 'bg-gray-50 border-gray-200'}`}>
                      <div className="flex justify-between items-center mb-3">
                        <div className="font-medium text-gray-900">
                          {isToday ? 'Today' : date.toLocaleDateString('en-US', { weekday: 'long' })}
                          <span className="text-sm text-gray-500 ml-2">
                            {date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </span>
                        </div>
                        {isToday && (
                          <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                            Current Day
                          </span>
                        )}
                      </div>

                      <div className="grid grid-cols-3 gap-3">
                        {['breakfast', 'lunch', 'dinner'].map(mealType => {
                          const mealStatus = isToday ? getMealStatus(
                            mealsToPrepareToday.findIndex(m => m.mealType === mealType),
                            'scheduled'
                          ) : 'scheduled';

                          return (
                            <div key={mealType} className="flex items-center space-x-2 p-2 bg-white rounded border border-gray-100">
                              <CheckCircle className={`w-4 h-4 ${mealStatus === 'completed' ? 'text-green-500' :
                                mealStatus === 'in_progress' ? 'text-blue-500' :
                                  'text-gray-300'
                                }`} />
                              <span className={`capitalize text-sm ${mealStatus === 'completed' ? 'text-green-700 line-through' :
                                mealStatus === 'in_progress' ? 'text-blue-700 font-medium' :
                                  'text-gray-600'
                                }`}>
                                {mealType}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Schedule Summary */}
              <div className="mt-6 p-4 bg-gray-100 rounded-lg">
                <h4 className="font-medium text-gray-900 mb-2">Weekly Summary</h4>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div className="text-center">
                    <div className="font-semibold text-green-600">
                      {Array.from({ length: 7 }, (_, dayIndex) => {
                        if (dayIndex === 0) {
                          return ['breakfast', 'lunch', 'dinner'].filter(mealType =>
                            getMealStatus(mealsToPrepareToday.findIndex(m => m.mealType === mealType), 'scheduled') === 'completed'
                          ).length;
                        }
                        return 0;
                      }).reduce((a, b) => a + b, 0)}
                    </div>
                    <div className="text-gray-600">Completed</div>
                  </div>
                  <div className="text-center">
                    <div className="font-semibold text-blue-600">
                      {Array.from({ length: 7 }, (_, dayIndex) => {
                        if (dayIndex === 0) {
                          return ['breakfast', 'lunch', 'dinner'].filter(mealType =>
                            getMealStatus(mealsToPrepareToday.findIndex(m => m.mealType === mealType), 'scheduled') === 'in_progress'
                          ).length;
                        }
                        return 0;
                      }).reduce((a, b) => a + b, 0)}
                    </div>
                    <div className="text-gray-600">In Progress</div>
                  </div>
                  <div className="text-center">
                    <div className="font-semibold text-gray-600">21</div>
                    <div className="text-gray-600">Total Meals</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-6 border-t border-gray-200 bg-gray-50">
              <div className="flex justify-end">
                <button
                  onClick={() => setShowFullSchedule(false)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                >
                  Close Schedule
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SubscriptionCard;