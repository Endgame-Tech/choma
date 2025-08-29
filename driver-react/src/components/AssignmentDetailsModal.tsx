import React, { useState } from 'react';
import {
  MapPinIcon,
  PhoneIcon,
  CheckCircleIcon,
  XMarkIcon,
  ClockIcon,
} from '@heroicons/react/24/outline';
import { DeliveryAssignment, DeliveryConfirmationData, PickupConfirmationData } from '../types';
import { driverApi } from '../services/api';

interface AssignmentDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  assignment: DeliveryAssignment | null;
  onAssignmentUpdate?: (updatedAssignment: DeliveryAssignment) => void;
}

const AssignmentDetailsModal: React.FC<AssignmentDetailsModalProps> = ({
  isOpen,
  onClose,
  assignment,
  onAssignmentUpdate
}) => {
  const [showConfirmationModal, setShowConfirmationModal] = useState(false);
  const [confirmationCode, setConfirmationCode] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen || !assignment) return null;

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
        const updatedAssignment = { ...assignment, status: 'picked_up' as const };
        onAssignmentUpdate?.(updatedAssignment);
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
        const updatedAssignment = { ...assignment, status: 'delivered' as const };
        onAssignmentUpdate?.(updatedAssignment);
        setShowConfirmationModal(false);
        onClose(); // Close the main modal after successful delivery
        alert('Delivery confirmed successfully! 🎉');
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

  return (
    <>
      {/* Main Assignment Details Modal */}
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-gray-900">Assignment Details</h2>
              <p className="text-sm text-gray-600">ID: {assignment._id.slice(-8)}</p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
              title="Close modal"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>

          <div className="px-6 py-4 space-y-6">
            {/* Status and Progress */}
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">Status</h3>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                  assignment.status === 'assigned' ? 'bg-blue-100 text-blue-800' :
                  assignment.status === 'picked_up' ? 'bg-yellow-100 text-yellow-800' :
                  assignment.status === 'delivered' ? 'bg-green-100 text-green-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {assignment.status.replace('_', ' ').toUpperCase()}
                </span>
              </div>

              {/* Progress Timeline */}
              <div className="flex items-center justify-between">
                <div className={`flex flex-col items-center ${
                  ['assigned', 'picked_up', 'delivered'].includes(assignment.status)
                    ? 'text-choma-brown' : 'text-gray-400'
                }`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    ['assigned', 'picked_up', 'delivered'].includes(assignment.status)
                      ? 'bg-choma-brown text-white' : 'bg-gray-200'
                  }`}>
                    1
                  </div>
                  <span className="text-xs mt-1">Assigned</span>
                </div>

                <div className={`flex-1 h-1 mx-4 ${
                  ['picked_up', 'delivered'].includes(assignment.status) ? 'bg-choma-brown' : 'bg-gray-200'
                }`}></div>

                <div className={`flex flex-col items-center ${
                  ['picked_up', 'delivered'].includes(assignment.status)
                    ? 'text-choma-brown' : 'text-gray-400'
                }`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    ['picked_up', 'delivered'].includes(assignment.status)
                      ? 'bg-choma-brown text-white' : 'bg-gray-200'
                  }`}>
                    2
                  </div>
                  <span className="text-xs mt-1">Picked Up</span>
                </div>

                <div className={`flex-1 h-1 mx-4 ${
                  assignment.status === 'delivered' ? 'bg-choma-brown' : 'bg-gray-200'
                }`}></div>

                <div className={`flex flex-col items-center ${
                  assignment.status === 'delivered' ? 'text-choma-brown' : 'text-gray-400'
                }`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    assignment.status === 'delivered'
                      ? 'bg-choma-brown text-white' : 'bg-gray-200'
                  }`}>
                    3
                  </div>
                  <span className="text-xs mt-1">Delivered</span>
                </div>
              </div>

              {/* Earning Display */}
              <div className="text-center py-4 bg-choma-brown/10 rounded-lg mt-4">
                <p className="text-sm text-gray-600">You'll earn</p>
                <p className="text-2xl font-bold text-choma-brown">
                  {formatCurrency(assignment.totalEarning)}
                </p>
              </div>
            </div>

            {/* Pickup Location */}
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
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
                      className="text-choma-brown hover:text-choma-brown/80"
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-choma-brown focus:border-choma-brown"
                  />

                  <button
                    onClick={handleConfirmPickup}
                    disabled={submitting}
                    className="w-full px-4 py-3 bg-choma-brown text-white font-medium rounded-lg hover:bg-choma-brown/90 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {submitting ? 'Confirming...' : 'Confirm Pickup'}
                  </button>
                </div>
              )}
            </div>

            {/* Delivery Location */}
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
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
            <div className="bg-white border border-gray-200 rounded-lg p-4">
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
                  <p className={`font-medium capitalize ${
                    assignment.priority === 'urgent' ? 'text-red-600' :
                    assignment.priority === 'high' ? 'text-orange-600' :
                    'text-gray-900'
                  }`}>
                    {assignment.priority}
                  </p>
                </div>
                <div>
                  <p className="text-gray-600">Earning</p>
                  <p className="font-medium text-choma-brown">
                    {formatCurrency(assignment.totalEarning)}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="sticky bottom-0 bg-white border-t border-gray-200 px-6 py-4">
            <button
              onClick={onClose}
              className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
            >
              Close
            </button>
          </div>
        </div>
      </div>

      {/* Delivery Confirmation Modal */}
      {showConfirmationModal && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-[60]">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Confirm Delivery</h3>
              <button
                onClick={() => setShowConfirmationModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>

            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-2">
                Enter the confirmation code provided by the customer:
              </p>
              <input
                type="text"
                value={confirmationCode}
                onChange={(e) => setConfirmationCode(e.target.value.toUpperCase())}
                placeholder="Enter 6-digit code"
                maxLength={6}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-choma-brown focus:border-choma-brown text-center text-lg font-mono tracking-wider"
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
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-choma-brown focus:border-choma-brown"
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
    </>
  );
};

export default AssignmentDetailsModal;