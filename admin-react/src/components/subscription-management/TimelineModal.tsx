import React, { useState, useEffect } from 'react';
import { 
  X, 
  Calendar, 
  Clock, 
  CheckCircle, 
  AlertTriangle, 
  Pause, 
  SkipForward,
  ChefHat,
  Truck,
  Star,
  MessageSquare,
  Edit3,
  RotateCcw
} from 'lucide-react';
import { subscriptionManagementApi } from '../../services/subscriptionManagementApi';

interface SubscriptionOverview {
  _id: string;
  subscriptionId: string;
  userId: {
    _id: string;
    fullName: string;
    email: string;
    phone: string;
  };
  mealPlanId: {
    _id: string;
    planName: string;
    durationWeeks: number;
    mealsPerWeek: number;
  };
  status: 'active' | 'paused' | 'cancelled' | 'pending';
  startDate: string;
  endDate?: string;
  nextDelivery: string;
  totalPrice: number;
  deliveryAddress: string;
  chefAssignment?: {
    chefId: {
      _id: string;
      fullName: string;
      email: string;
      phone: string;
      rating: number;
    };
    assignedAt: string;
    performance: {
      averageRating: number;
      completedDeliveries: number;
      onTimePercentage: number;
    };
  };
  metrics: {
    completedMeals: number;
    totalMeals: number;
    consecutiveDays: number;
    progressPercentage: number;
  };
}

interface MealTimelineItem {
  date: string;
  mealType: string;
  mealName: string;
  status: 'scheduled' | 'preparing' | 'ready' | 'delivered' | 'skipped' | 'rescheduled';
  chefId?: string;
  chefName?: string;
  estimatedTime?: string;
  actualTime?: string;
  customerRating?: number;
  customerFeedback?: string;
  adminNotes?: string;
  canModify: boolean;
}

interface TimelineModalProps {
  subscription: SubscriptionOverview;
  onClose: () => void;
}

const TimelineModal: React.FC<TimelineModalProps> = ({ subscription, onClose }) => {
  const [timeline, setTimeline] = useState<MealTimelineItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'upcoming' | 'all' | 'past'>('upcoming');
  const [selectedMeal, setSelectedMeal] = useState<MealTimelineItem | null>(null);
  const [showSkipModal, setShowSkipModal] = useState(false);
  const [showRescheduleModal, setShowRescheduleModal] = useState(false);
  const [skipReason, setSkipReason] = useState('');
  const [newDate, setNewDate] = useState('');
  const [rescheduleReason, setRescheduleReason] = useState('');

  useEffect(() => {
    loadTimeline();
  }, [subscription._id, viewMode]);

  const loadTimeline = async () => {
    try {
      setLoading(true);
      
      const options: any = { daysAhead: 30 };
      
      if (viewMode === 'past') {
        options.startDate = new Date(subscription.startDate).toISOString();
        options.endDate = new Date().toISOString();
      } else if (viewMode === 'upcoming') {
        options.startDate = new Date().toISOString();
        options.daysAhead = 14;
      }

      const response = await subscriptionManagementApi.getSubscriptionTimeline(
        subscription._id,
        options
      );
      
      if (response.success) {
        setTimeline(response.data || []);
      }
    } catch (error) {
      console.error('Failed to load timeline:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSkipMeal = async () => {
    if (!selectedMeal || !skipReason.trim()) return;

    try {
      setLoading(true);
      const response = await subscriptionManagementApi.adminSkipMealDelivery(
        subscription._id,
        selectedMeal.date,
        skipReason
      );
      
      if (response.success) {
        alert('Meal skipped successfully');
        loadTimeline();
        setShowSkipModal(false);
        setSelectedMeal(null);
        setSkipReason('');
      }
    } catch (error) {
      console.error('Failed to skip meal:', error);
      alert('Failed to skip meal');
    } finally {
      setLoading(false);
    }
  };

  const handleRescheduleMeal = async () => {
    if (!selectedMeal || !newDate || !rescheduleReason.trim()) return;

    try {
      setLoading(true);
      const response = await subscriptionManagementApi.rescheduleMealDelivery(
        subscription._id,
        selectedMeal.date,
        newDate,
        rescheduleReason
      );
      
      if (response.success) {
        alert('Meal rescheduled successfully');
        loadTimeline();
        setShowRescheduleModal(false);
        setSelectedMeal(null);
        setNewDate('');
        setRescheduleReason('');
      }
    } catch (error) {
      console.error('Failed to reschedule meal:', error);
      alert('Failed to reschedule meal');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'delivered': return 'text-green-600 bg-green-100 border-green-200';
      case 'ready': return 'text-blue-600 bg-blue-100 border-blue-200';
      case 'preparing': return 'text-orange-600 bg-orange-100 border-orange-200';
      case 'scheduled': return 'text-gray-600 bg-gray-100 border-gray-200';
      case 'skipped': return 'text-red-600 bg-red-100 border-red-200';
      case 'rescheduled': return 'text-purple-600 bg-purple-100 border-purple-200';
      default: return 'text-gray-600 bg-gray-100 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'delivered': return <CheckCircle className="w-4 h-4" />;
      case 'ready': return <Clock className="w-4 h-4" />;
      case 'preparing': return <ChefHat className="w-4 h-4" />;
      case 'scheduled': return <Calendar className="w-4 h-4" />;
      case 'skipped': return <X className="w-4 h-4" />;
      case 'rescheduled': return <RotateCcw className="w-4 h-4" />;
      default: return null;
    }
  };

  const filteredTimeline = timeline.filter(item => {
    const itemDate = new Date(item.date);
    const now = new Date();
    
    switch (viewMode) {
      case 'upcoming':
        return itemDate >= now;
      case 'past':
        return itemDate < now;
      case 'all':
      default:
        return true;
    }
  });

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <Calendar className="w-6 h-6 text-primary-600" />
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                Meal Timeline
              </h2>
              <p className="text-sm text-gray-500">
                {subscription.userId.fullName} • {subscription.mealPlanId.planName}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* View Mode Selector */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setViewMode('upcoming')}
              className={`px-4 py-2 rounded-lg text-sm font-medium ${
                viewMode === 'upcoming'
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Upcoming
            </button>
            <button
              onClick={() => setViewMode('all')}
              className={`px-4 py-2 rounded-lg text-sm font-medium ${
                viewMode === 'all'
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setViewMode('past')}
              className={`px-4 py-2 rounded-lg text-sm font-medium ${
                viewMode === 'past'
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Past
            </button>
          </div>

          <div className="text-sm text-gray-500">
            {filteredTimeline.length} meal(s) found
          </div>
        </div>

        {/* Timeline Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            </div>
          ) : filteredTimeline.length === 0 ? (
            <div className="text-center py-8">
              <Calendar className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No meals found</h3>
              <p className="mt-1 text-sm text-gray-500">
                No meals scheduled for the selected time period.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredTimeline.map((item, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors">
                  <div className="flex items-start justify-between">
                    {/* Meal Information */}
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(item.status)}`}>
                          {getStatusIcon(item.status)}
                          <span className="ml-1">{item.status}</span>
                        </span>
                        
                        <span className="text-sm font-medium text-gray-900">
                          {new Date(item.date).toLocaleDateString('en-US', {
                            weekday: 'long',
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-3">
                        <div>
                          <h4 className="text-sm font-medium text-gray-900">{item.mealName}</h4>
                          <p className="text-xs text-gray-600">{item.mealType}</p>
                        </div>
                        
                        {item.chefName && (
                          <div className="flex items-center space-x-2">
                            <ChefHat className="w-3 h-3 text-gray-400" />
                            <span className="text-sm text-gray-700">{item.chefName}</span>
                          </div>
                        )}
                        
                        {item.estimatedTime && (
                          <div className="flex items-center space-x-2">
                            <Clock className="w-3 h-3 text-gray-400" />
                            <span className="text-sm text-gray-700">
                              {item.actualTime ? `Delivered at ${item.actualTime}` : `Est. ${item.estimatedTime}`}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Customer Rating */}
                      {item.customerRating && (
                        <div className="flex items-center space-x-2 mb-2">
                          <Star className="w-4 h-4 text-yellow-400" />
                          <span className="text-sm text-gray-700">{item.customerRating}/5</span>
                          {item.customerFeedback && (
                            <MessageSquare className="w-3 h-3 text-gray-400 ml-2" />
                          )}
                        </div>
                      )}

                      {/* Customer Feedback */}
                      {item.customerFeedback && (
                        <div className="bg-gray-50 rounded-lg p-3 mb-2">
                          <p className="text-sm text-gray-700 italic">"{item.customerFeedback}"</p>
                        </div>
                      )}

                      {/* Admin Notes */}
                      {item.adminNotes && (
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                          <p className="text-sm text-blue-800">
                            <strong>Admin Note:</strong> {item.adminNotes}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    {item.canModify && item.status === 'scheduled' && (
                      <div className="flex items-center space-x-2 ml-4">
                        <button
                          onClick={() => {
                            setSelectedMeal(item);
                            setShowSkipModal(true);
                          }}
                          className="text-red-600 hover:text-red-700"
                          title="Skip Meal"
                        >
                          <SkipForward className="w-4 h-4" />
                        </button>
                        
                        <button
                          onClick={() => {
                            setSelectedMeal(item);
                            setShowRescheduleModal(true);
                          }}
                          className="text-blue-600 hover:text-blue-700"
                          title="Reschedule Meal"
                        >
                          <RotateCcw className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end p-6 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
          >
            Close
          </button>
        </div>
      </div>

      {/* Skip Meal Modal */}
      {showSkipModal && selectedMeal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-60">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Skip Meal</h3>
              <button
                onClick={() => setShowSkipModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6">
              <p className="text-sm text-gray-600 mb-4">
                Skip meal for {new Date(selectedMeal.date).toLocaleDateString()} - {selectedMeal.mealName}
              </p>

              <label className="block text-sm font-medium text-gray-700 mb-2">
                Reason for Skipping *
              </label>
              <textarea
                value={skipReason}
                onChange={(e) => setSkipReason(e.target.value)}
                rows={3}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="Enter reason for skipping this meal..."
                required
              />
            </div>

            <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200">
              <button
                onClick={() => setShowSkipModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSkipMeal}
                disabled={!skipReason.trim() || loading}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Processing...' : 'Skip Meal'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reschedule Meal Modal */}
      {showRescheduleModal && selectedMeal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-60">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Reschedule Meal</h3>
              <button
                onClick={() => setShowRescheduleModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6">
              <p className="text-sm text-gray-600 mb-4">
                Reschedule meal from {new Date(selectedMeal.date).toLocaleDateString()} - {selectedMeal.mealName}
              </p>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    New Date *
                  </label>
                  <input
                    type="date"
                    value={newDate}
                    onChange={(e) => setNewDate(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Reason for Rescheduling *
                  </label>
                  <textarea
                    value={rescheduleReason}
                    onChange={(e) => setRescheduleReason(e.target.value)}
                    rows={3}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="Enter reason for rescheduling..."
                    required
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200">
              <button
                onClick={() => setShowRescheduleModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleRescheduleMeal}
                disabled={!newDate || !rescheduleReason.trim() || loading}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Processing...' : 'Reschedule'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TimelineModal;