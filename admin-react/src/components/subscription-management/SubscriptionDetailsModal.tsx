import React, { useState, useEffect } from 'react';
import {
  X,
  User,
  Package,
  MapPin,
  Phone,
  Mail,
  ChefHat,
  Clock,
  Star,
  Settings,
  Pause,
  Play,
  AlertTriangle,
  CheckCircle,
  Edit3,
  Save
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
  issues?: {
    pendingReassignmentRequests: number;
    skippedMeals: number;
    customerComplaints: number;
  };
}

interface SubscriptionDetailsModalProps {
  subscription: SubscriptionOverview;
  onClose: () => void;
  onUpdate: () => void;
}

const SubscriptionDetailsModal: React.FC<SubscriptionDetailsModalProps> = ({
  subscription,
  onClose,
  onUpdate
}) => {
  const [loading, setLoading] = useState(false);
  const [editingPreferences, setEditingPreferences] = useState(false);
  const [preferences, setPreferences] = useState({
    frequency: '',
    timeSlot: '',
    daysOfWeek: [] as string[],
    specialInstructions: ''
  });

  useEffect(() => {
    // Initialize preferences with current subscription data
    setPreferences({
      frequency: subscription.mealPlanId?.mealsPerWeek?.toString() || '',
      timeSlot: '12:00-14:00', // Default time slot
      daysOfWeek: ['Monday', 'Wednesday', 'Friday'], // Default days
      specialInstructions: ''
    });
  }, [subscription]);

  const handlePauseSubscription = async () => {
    if (!confirm('Are you sure you want to pause this subscription?')) return;

    try {
      setLoading(true);
      const response = await subscriptionManagementApi.adminPauseSubscription(
        subscription._id,
        'Admin override - subscription paused for review'
      );

      if (response.success) {
        alert('Subscription paused successfully');
        onUpdate();
        onClose();
      }
    } catch (error) {
      console.error('Failed to pause subscription:', error);
      alert('Failed to pause subscription');
    } finally {
      setLoading(false);
    }
  };

  const handleResumeSubscription = async () => {
    if (!confirm('Are you sure you want to resume this subscription?')) return;

    try {
      setLoading(true);
      const response = await subscriptionManagementApi.adminResumeSubscription(subscription._id);

      if (response.success) {
        alert('Subscription resumed successfully');
        onUpdate();
        onClose();
      }
    } catch (error) {
      console.error('Failed to resume subscription:', error);
      alert('Failed to resume subscription');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelSubscription = async () => {
    const reason = prompt('Please provide a reason for cancelling this subscription:');
    if (!reason || !reason.trim()) return;

    if (!confirm('Are you sure you want to cancel this subscription? This action cannot be undone.')) return;

    try {
      setLoading(true);
      const response = await subscriptionManagementApi.adminCancelSubscription(
        subscription._id,
        reason.trim()
      );

      if (response.success) {
        alert('Subscription cancelled successfully');
        onUpdate();
        onClose();
      }
    } catch (error) {
      console.error('Failed to cancel subscription:', error);
      alert('Failed to cancel subscription');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePreferences = async () => {
    try {
      setLoading(true);
      const response = await subscriptionManagementApi.adminUpdateDeliveryPreferences(
        subscription._id,
        preferences
      );

      if (response.success) {
        alert('Delivery preferences updated successfully');
        setEditingPreferences(false);
        onUpdate();
      }
    } catch (error) {
      console.error('Failed to update preferences:', error);
      alert('Failed to update preferences');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-green-600 bg-green-100';
      case 'paused': return 'text-yellow-600 bg-yellow-100';
      case 'cancelled': return 'text-red-600 bg-red-100';
      case 'pending': return 'text-blue-600 bg-blue-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return <CheckCircle className="w-4 h-4" />;
      case 'paused': return <Pause className="w-4 h-4" />;
      case 'cancelled': return <X className="w-4 h-4" />;
      case 'pending': return <Clock className="w-4 h-4" />;
      default: return null;
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <Package className="w-6 h-6 text-primary-600" />
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                Subscription Details
              </h2>
              <p className="text-sm text-gray-500">
                {subscription.subscriptionId}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
            aria-label="Close modal"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Customer Information */}
            <div className="bg-gray-50 rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                <User className="w-5 h-5 mr-2" />
                Customer Information
              </h3>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Name:</span>
                  <span className="text-sm font-medium text-gray-900">
                    {subscription.userId.fullName}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Email:</span>
                  <div className="flex items-center space-x-2">
                    <Mail className="w-3 h-3 text-gray-400" />
                    <span className="text-sm text-gray-900">
                      {subscription.userId.email}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Phone:</span>
                  <div className="flex items-center space-x-2">
                    <Phone className="w-3 h-3 text-gray-400" />
                    <span className="text-sm text-gray-900">
                      {subscription.userId.phone || 'Not provided'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Address:</span>
                  <div className="flex items-center space-x-2">
                    <MapPin className="w-3 h-3 text-gray-400" />
                    <span className="text-sm text-gray-900 max-w-48 truncate">
                      {subscription.deliveryAddress}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Subscription Status */}
            <div className="bg-gray-50 rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                <Package className="w-5 h-5 mr-2" />
                Subscription Status
              </h3>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Status:</span>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(subscription.status)}`}>
                    {getStatusIcon(subscription.status)}
                    <span className="ml-1">{subscription.status}</span>
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Start Date:</span>
                  <span className="text-sm text-gray-900">
                    {new Date(subscription.startDate).toLocaleDateString()}
                  </span>
                </div>

                {subscription.endDate && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">End Date:</span>
                    <span className="text-sm text-gray-900">
                      {new Date(subscription.endDate).toLocaleDateString()}
                    </span>
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Next Delivery:</span>
                  <span className="text-sm text-gray-900">
                    {new Date(subscription.nextDelivery).toLocaleDateString()}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Total Price:</span>
                  <span className="text-sm font-medium text-gray-900">
                    ₦{subscription.totalPrice.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            {/* Meal Plan Information */}
            <div className="bg-gray-50 rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                <Package className="w-5 h-5 mr-2" />
                Meal Plan Details
              </h3>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Plan Name:</span>
                  <span className="text-sm font-medium text-gray-900">
                    {subscription.mealPlanId.planName}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Duration:</span>
                  <span className="text-sm text-gray-900">
                    {subscription.mealPlanId.durationWeeks} weeks
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Meals per Week:</span>
                  <span className="text-sm text-gray-900">
                    {subscription.mealPlanId.mealsPerWeek}
                  </span>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="mt-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-600">Progress:</span>
                  <span className="text-sm text-gray-900">
                    {subscription.metrics.completedMeals}/{subscription.metrics.totalMeals} meals
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-primary-600 h-2 rounded-full"
                    style={{ width: `${subscription.metrics.progressPercentage}%` }}
                  ></div>
                </div>
                <div className="text-center mt-1">
                  <span className="text-xs text-gray-500">
                    {subscription.metrics.progressPercentage}% Complete
                  </span>
                </div>
              </div>
            </div>

            {/* Chef Assignment */}
            {subscription.chefAssignment && (
              <div className="bg-gray-50 rounded-lg p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                  <ChefHat className="w-5 h-5 mr-2" />
                  Assigned Chef
                </h3>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Name:</span>
                    <span className="text-sm font-medium text-gray-900">
                      {subscription.chefAssignment.chefId.fullName}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Email:</span>
                    <span className="text-sm text-gray-900">
                      {subscription.chefAssignment.chefId.email}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Phone:</span>
                    <span className="text-sm text-gray-900">
                      {subscription.chefAssignment.chefId.phone}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Rating:</span>
                    <div className="flex items-center space-x-1">
                      <Star className="w-4 h-4 text-yellow-400" />
                      <span className="text-sm text-gray-900">
                        {subscription.chefAssignment.performance.averageRating.toFixed(1)}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Assigned:</span>
                    <span className="text-sm text-gray-900">
                      {new Date(subscription.chefAssignment.assignedAt).toLocaleDateString()}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Completed Deliveries:</span>
                    <span className="text-sm text-gray-900">
                      {subscription.chefAssignment.performance.completedDeliveries}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">On Time %:</span>
                    <span className="text-sm text-gray-900">
                      {subscription.chefAssignment.performance.onTimePercentage}%
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Delivery Preferences */}
            <div className="lg:col-span-2">
              <div className="bg-gray-50 rounded-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-gray-900 flex items-center">
                    <Settings className="w-5 h-5 mr-2" />
                    Delivery Preferences
                  </h3>
                  <button
                    onClick={() => setEditingPreferences(!editingPreferences)}
                    className="text-primary-600 hover:text-primary-700 flex items-center space-x-1"
                  >
                    <Edit3 className="w-4 h-4" />
                    <span>{editingPreferences ? 'Cancel' : 'Edit'}</span>
                  </button>
                </div>

                {editingPreferences ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Frequency (meals per week)
                        </label>
                        <input
                          type="number"
                          value={preferences.frequency}
                          onChange={(e) => setPreferences(prev => ({ ...prev, frequency: e.target.value }))}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Time Slot
                        </label>
                        <select
                          value={preferences.timeSlot}
                          onChange={(e) => setPreferences(prev => ({ ...prev, timeSlot: e.target.value }))}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        >
                          <option value="09:00-11:00">9:00 AM - 11:00 AM</option>
                          <option value="12:00-14:00">12:00 PM - 2:00 PM</option>
                          <option value="15:00-17:00">3:00 PM - 5:00 PM</option>
                          <option value="18:00-20:00">6:00 PM - 8:00 PM</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Special Instructions
                      </label>
                      <textarea
                        value={preferences.specialInstructions}
                        onChange={(e) => setPreferences(prev => ({ ...prev, specialInstructions: e.target.value }))}
                        rows={3}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        placeholder="Any special delivery instructions..."
                      />
                    </div>

                    <div className="flex items-center space-x-3">
                      <button
                        onClick={handleUpdatePreferences}
                        disabled={loading}
                        className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 disabled:opacity-50 flex items-center space-x-2"
                      >
                        <Save className="w-4 h-4" />
                        <span>{loading ? 'Saving...' : 'Save Changes'}</span>
                      </button>
                      <button
                        onClick={() => setEditingPreferences(false)}
                        className="border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <span className="text-sm text-gray-600">Frequency:</span>
                      <p className="text-sm font-medium text-gray-900">
                        {subscription.mealPlanId.mealsPerWeek} meals per week
                      </p>
                    </div>
                    <div>
                      <span className="text-sm text-gray-600">Time Slot:</span>
                      <p className="text-sm font-medium text-gray-900">12:00 PM - 2:00 PM</p>
                    </div>
                    <div>
                      <span className="text-sm text-gray-600">Days:</span>
                      <p className="text-sm font-medium text-gray-900">Mon, Wed, Fri</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Issues & Alerts */}
            {(subscription.issues?.pendingReassignmentRequests || subscription.issues?.customerComplaints || subscription.issues?.skippedMeals) && (
              <div className="lg:col-span-2">
                <div className="bg-red-50 border border-red-200 rounded-lg p-6">
                  <h3 className="text-lg font-medium text-red-900 mb-4 flex items-center">
                    <AlertTriangle className="w-5 h-5 mr-2" />
                    Issues Requiring Attention
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {subscription.issues?.pendingReassignmentRequests && (
                      <div className="bg-white rounded-lg p-4">
                        <div className="text-center">
                          <div className="text-2xl font-bold text-orange-600">
                            {subscription.issues.pendingReassignmentRequests}
                          </div>
                          <div className="text-sm text-gray-600">Chef Reassignment Requests</div>
                        </div>
                      </div>
                    )}

                    {subscription.issues?.customerComplaints && (
                      <div className="bg-white rounded-lg p-4">
                        <div className="text-center">
                          <div className="text-2xl font-bold text-red-600">
                            {subscription.issues.customerComplaints}
                          </div>
                          <div className="text-sm text-gray-600">Customer Complaints</div>
                        </div>
                      </div>
                    )}

                    {subscription.issues?.skippedMeals && (
                      <div className="bg-white rounded-lg p-4">
                        <div className="text-center">
                          <div className="text-2xl font-bold text-yellow-600">
                            {subscription.issues.skippedMeals}
                          </div>
                          <div className="text-sm text-gray-600">Skipped Meals</div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
          >
            Close
          </button>

          {subscription.status === 'active' && (
            <button
              onClick={handlePauseSubscription}
              disabled={loading}
              className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 disabled:opacity-50 flex items-center space-x-2"
            >
              <Pause className="w-4 h-4" />
              <span>{loading ? 'Processing...' : 'Pause Subscription'}</span>
            </button>
          )}

          {subscription.status === 'paused' && (
            <button
              onClick={handleResumeSubscription}
              disabled={loading}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center space-x-2"
            >
              <Play className="w-4 h-4" />
              <span>{loading ? 'Processing...' : 'Resume Subscription'}</span>
            </button>
          )}

          {subscription.status !== 'cancelled' && (
            <button
              onClick={handleCancelSubscription}
              disabled={loading}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center space-x-2"
            >
              <X className="w-4 h-4" />
              <span>{loading ? 'Processing...' : 'Cancel Subscription'}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default SubscriptionDetailsModal;