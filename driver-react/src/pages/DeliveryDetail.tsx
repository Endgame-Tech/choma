import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useWebSocket } from '../hooks/useWebSocket';
import {
  MapPinIcon,
  PhoneIcon,
  CheckCircleIcon,
  XMarkIcon,
  ClockIcon,
} from '@heroicons/react/24/outline';
import { driverApi } from '../services/api';
import { DeliveryAssignment, DeliveryConfirmationData, PickupConfirmationData } from '../types';
import LocationTracker from '../components/LocationTracker';

const DeliveryDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { updateAssignmentStatus } = useWebSocket();

  const [assignment, setAssignment] = useState<DeliveryAssignment | null>(null);
  const [loading, setLoading] = useState(true);
  const [showConfirmationModal, setShowConfirmationModal] = useState(false);
  const [confirmationCode, setConfirmationCode] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Load assignment data
  useEffect(() => {
    if (!id) {
      navigate('/dashboard');
      return;
    }
    loadAssignment();
  }, [id, navigate]);

  const loadAssignment = async () => {
    try {
      setLoading(true);
      // For now, we'll get assignments from the general assignments endpoint
      // In the future, you might want a specific endpoint for single assignment
      const response = await driverApi.getAssignments();
      if (response.success && Array.isArray(response.data)) {
        const foundAssignment = response.data.find(a => a._id === id);
        if (foundAssignment) {
          setAssignment(foundAssignment);
        } else {
          console.error('Assignment not found');
          navigate('/dashboard');
        }
      }
    } catch (error) {
      console.error('Error loading assignment:', error);
      navigate('/dashboard');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatTime = (timeString: string) => {
    return new Date(timeString).toLocaleTimeString('en-NG', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleConfirmPickup = async () => {
    if (!assignment || submitting) return;

    try {
      setSubmitting(true);
      const data: PickupConfirmationData = {
        notes
      };

      const response = await driverApi.confirmPickup(assignment._id, data);
      if (response.success) {
        setAssignment({ ...assignment, status: 'picked_up' });
        updateAssignmentStatus(assignment._id, 'picked_up');
        setNotes('');
      } else {
        alert(response.message || 'Failed to confirm pickup');
      }
    } catch (error) {
      console.error('Error confirming pickup:', error);
      alert('Failed to confirm pickup. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeliveryConfirmation = async () => {
    if (!assignment || submitting || !confirmationCode.trim()) return;

    try {
      setSubmitting(true);
      const data: DeliveryConfirmationData = {
        confirmationCode: confirmationCode.trim().toUpperCase(),
        notes: notes,
        photo: '' // You can add photo capture functionality
      };

      const response = await driverApi.confirmDelivery(assignment._id, data);
      if (response.success) {
        setAssignment({ ...assignment, status: 'delivered' });
        updateAssignmentStatus(assignment._id, 'delivered');
        setShowConfirmationModal(false);

        // Show success message and redirect after delay
        alert('Delivery confirmed successfully! 🎉');
        setTimeout(() => {
          navigate('/dashboard');
        }, 2000);
      } else {
        alert(response.message || 'Invalid confirmation code. Please check with the customer.');
      }
    } catch (error) {
      console.error('Error confirming delivery:', error);
      alert('Failed to confirm delivery. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg text-gray-600">Loading assignment details...</div>
      </div>
    );
  }

  if (!assignment) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-600">Assignment not found.</p>
        <button
          onClick={() => navigate('/dashboard')}
          className="mt-4 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
        >
          Back to Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('/dashboard')}
          className="flex items-center space-x-2 text-primary-600 hover:text-primary-700"
        >
          <span>←</span>
          <span>Back to Dashboard</span>
        </button>

        <div className="text-right">
          <p className="text-sm text-gray-600">Assignment ID</p>
          <p className="font-mono text-sm text-gray-900">{assignment._id.slice(-8)}</p>
          {assignment.packageLabelId && (
            <>
              <p className="text-sm text-blue-600 mt-2">Package Label</p>
              <p className="font-mono text-sm font-bold text-blue-800 bg-blue-50 px-2 py-1 rounded border">
                📦 {assignment.packageLabelId}
              </p>
            </>
          )}
        </div>
      </div>

      {/* Status and Progress */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-bold text-gray-900">Delivery Assignment</h1>
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${assignment.status === 'assigned' ? 'bg-blue-100 text-blue-800' :
            assignment.status === 'picked_up' ? 'bg-yellow-100 text-yellow-800' :
              assignment.status === 'delivered' ? 'bg-green-100 text-green-800' :
                'bg-gray-100 text-gray-800'
            }`}>
            {assignment.status.replace('_', ' ').toUpperCase()}
          </span>
        </div>

        {/* Progress Timeline */}
        <div className="flex items-center justify-between mb-6">
          <div className={`flex flex-col items-center ${['assigned', 'picked_up', 'delivered'].includes(assignment.status)
            ? 'text-primary-600' : 'text-gray-400'
            }`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${['assigned', 'picked_up', 'delivered'].includes(assignment.status)
              ? 'bg-primary-600 text-white' : 'bg-gray-200'
              }`}>
              1
            </div>
            <span className="text-xs mt-1">Assigned</span>
          </div>

          <div className={`flex-1 h-1 mx-4 ${['picked_up', 'delivered'].includes(assignment.status) ? 'bg-primary-600' : 'bg-gray-200'
            }`}></div>

          <div className={`flex flex-col items-center ${['picked_up', 'delivered'].includes(assignment.status)
            ? 'text-primary-600' : 'text-gray-400'
            }`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${['picked_up', 'delivered'].includes(assignment.status)
              ? 'bg-primary-600 text-white' : 'bg-gray-200'
              }`}>
              2
            </div>
            <span className="text-xs mt-1">Picked Up</span>
          </div>

          <div className={`flex-1 h-1 mx-4 ${assignment.status === 'delivered' ? 'bg-primary-600' : 'bg-gray-200'
            }`}></div>

          <div className={`flex flex-col items-center ${assignment.status === 'delivered' ? 'text-primary-600' : 'text-gray-400'
            }`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${assignment.status === 'delivered'
              ? 'bg-primary-600 text-white' : 'bg-gray-200'
              }`}>
              3
            </div>
            <span className="text-xs mt-1">Delivered</span>
          </div>
        </div>

        {/* Earning Display */}
        <div className="text-center py-4 bg-primary-50 rounded-lg">
          <p className="text-sm text-gray-600">You'll earn</p>
          <p className="text-2xl font-bold text-primary-600">
            {formatCurrency(assignment.totalEarning)}
          </p>
        </div>
      </div>

      {/* Location Tracker */}
      <LocationTracker isActive={assignment.status !== 'delivered'} />

      {/* Pickup Location */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900">Pickup Location</h3>
          {assignment.status === 'assigned' && (
            <ClockIcon className="h-5 w-5 text-orange-500" />
          )}
          {assignment.status !== 'assigned' && (
            <CheckCircleIcon className="h-5 w-5 text-green-500" />
          )}
        </div>

        <div className="space-y-3">
          <div className="flex items-start space-x-3">
            <MapPinIcon className="h-5 w-5 text-gray-400 mt-0.5" />
            <div>
              <p className="font-medium text-gray-900">{assignment.pickupLocation.chefName}</p>
              <p className="text-gray-600">{assignment.pickupLocation.address}</p>
            </div>
          </div>

          {assignment.pickupLocation.chefPhone && (
            <div className="flex items-center space-x-3">
              <PhoneIcon className="h-5 w-5 text-gray-400" />
              <a
                href={`tel:${assignment.pickupLocation.chefPhone}`}
                className="text-primary-600 hover:text-primary-700"
              >
                {assignment.pickupLocation.chefPhone}
              </a>
            </div>
          )}

          <div className="flex items-center space-x-3">
            <ClockIcon className="h-5 w-5 text-gray-400" />
            <span className="text-gray-600">
              Expected: {formatTime(assignment.estimatedPickupTime)}
            </span>
          </div>
        </div>

        {assignment.pickupLocation.instructions && (
          <div className="mt-4 p-3 bg-blue-50 rounded-lg">
            <p className="text-sm font-medium text-blue-900">Pickup Instructions</p>
            <p className="text-sm text-blue-700">{assignment.pickupLocation.instructions}</p>
          </div>
        )}

        {assignment.status === 'assigned' && (
          <div className="mt-4 space-y-3">
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Pickup notes (optional)"
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />

            <button
              onClick={handleConfirmPickup}
              disabled={submitting}
              className="w-full px-4 py-3 bg-primary-600 text-white font-medium rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? 'Confirming...' : 'Confirm Pickup'}
            </button>
          </div>
        )}
      </div>

      {/* Delivery Location */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900">Delivery Location</h3>
          {assignment.status === 'delivered' && (
            <CheckCircleIcon className="h-5 w-5 text-green-500" />
          )}
        </div>

        <div className="space-y-3">
          <div className="flex items-start space-x-3">
            <MapPinIcon className="h-5 w-5 text-gray-400 mt-0.5" />
            <div>
              <p className="font-medium text-gray-900">{assignment.deliveryLocation.area}</p>
              <p className="text-gray-600">{assignment.deliveryLocation.address}</p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <ClockIcon className="h-5 w-5 text-gray-400" />
            <span className="text-gray-600">
              Expected: {formatTime(assignment.estimatedDeliveryTime)}
            </span>
          </div>
        </div>

        {assignment.customerInfo && (
          <div className="mt-4 p-3 bg-blue-50 rounded-lg">
            <p className="text-sm font-medium text-blue-900">Customer Contact</p>
            <div className="mt-2 space-y-1">
              <p className="text-sm text-blue-700 font-medium">{assignment.customerInfo.fullName}</p>
              {assignment.customerInfo.phone && (
                <div className="flex items-center space-x-2">
                  <PhoneIcon className="h-4 w-4 text-blue-600" />
                  <a
                    href={`tel:${assignment.customerInfo.phone}`}
                    className="text-sm text-blue-600 hover:text-blue-800 underline"
                  >
                    {assignment.customerInfo.phone}
                  </a>
                </div>
              )}
            </div>
          </div>
        )}

        {assignment.deliveryLocation.instructions && (
          <div className="mt-4 p-3 bg-green-50 rounded-lg">
            <p className="text-sm font-medium text-green-900">Delivery Instructions</p>
            <p className="text-sm text-green-700">{assignment.deliveryLocation.instructions}</p>
          </div>
        )}

        {assignment.specialInstructions && (
          <div className="mt-4 p-3 bg-yellow-50 rounded-lg">
            <p className="text-sm font-medium text-yellow-900">Special Instructions</p>
            <p className="text-sm text-yellow-700">{assignment.specialInstructions}</p>
          </div>
        )}

        {assignment.status === 'picked_up' && (
          <div className="mt-4">
            <button
              onClick={() => setShowConfirmationModal(true)}
              className="w-full px-4 py-3 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700"
            >
              Confirm Delivery
            </button>
          </div>
        )}
      </div>

      {/* Assignment Details */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Assignment Details</h3>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-gray-600">Distance</p>
            <p className="font-medium">{assignment.totalDistance.toFixed(1)} km</p>
          </div>
          <div>
            <p className="text-gray-600">Duration</p>
            <p className="font-medium">{assignment.estimatedDuration} min</p>
          </div>
          <div>
            <p className="text-gray-600">Priority</p>
            <p className={`font-medium capitalize ${assignment.priority === 'urgent' ? 'text-red-600' :
              assignment.priority === 'high' ? 'text-orange-600' :
                'text-gray-900'
              }`}>
              {assignment.priority}
            </p>
          </div>
          <div>
            <p className="text-gray-600">Earning</p>
            <p className="font-medium text-primary-600">
              {formatCurrency(assignment.totalEarning)}
            </p>
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      {showConfirmationModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Confirm Delivery</h3>
              <button
                onClick={() => setShowConfirmationModal(false)}
                className="text-gray-400 hover:text-gray-600"
                title="Close confirmation modal"
                aria-label="Close confirmation modal"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>

            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-2">
                Enter the confirmation code provided by the customer:
              </p>
              <p className="text-xs text-blue-600 mb-2">
                💡 For first deliveries, you can also use the last 6 digits of the order number
              </p>
              <input
                type="text"
                value={confirmationCode}
                onChange={(e) => setConfirmationCode(e.target.value.toUpperCase())}
                placeholder="Enter 6-digit code"
                maxLength={6}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-center text-lg font-mono tracking-wider"
              />
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Delivery Notes (optional)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                placeholder="Any additional notes about the delivery..."
              />
            </div>

            <div className="flex space-x-3">
              <button
                onClick={() => setShowConfirmationModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDeliveryConfirmation}
                disabled={!confirmationCode.trim() || submitting}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? 'Confirming...' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DeliveryDetail;