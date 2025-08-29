import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWebSocket } from '../hooks/useWebSocket';
import { useDelivery } from '../contexts/DeliveryContext';
import { DeliveryAssignment, Driver, DailyStats } from '../types';
import { driverApi } from '../services/api';
import {
  TruckIcon,
  MapPinIcon,
  ClockIcon,
  CurrencyDollarIcon,
  BellIcon,
  SignalIcon,
  SignalSlashIcon
} from '@heroicons/react/24/outline';
import AssignmentDetailsModal from '../components/AssignmentDetailsModal';

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const {
    isConnected,
    updateDriverStatus,

  } = useWebSocket();

  const [driver, setDriver] = useState<Driver | null>(null);
  const { assignments, refreshAssignments } = useDelivery();
  const [dailyStats, setDailyStats] = useState<DailyStats | null>(null);
  const [isOnline, setIsOnline] = useState(false);
  const [loading, setLoading] = useState(true);
  const [notifications] = useState<any[]>([]);
  const [selectedAssignment, setSelectedAssignment] = useState<DeliveryAssignment | null>(null);
  const [showAssignmentModal, setShowAssignmentModal] = useState(false);

  // Load initial data
  useEffect(() => {
    loadDashboardData();
  }, []);



  const loadDashboardData = async () => {
    try {
      setLoading(true);

      const profileResponse = await driverApi.getProfile();
      if (profileResponse.success && profileResponse.data) {
        setDriver(profileResponse.data);
        setIsOnline(profileResponse.data.status === 'online');
      }

      const assignmentsResponse = await driverApi.getAssignments();
      if (assignmentsResponse.success && assignmentsResponse.data) {
        // Use the delivery context refresher rather than a local setter (setAssignments
        // is not defined in this component). This keeps assignments state centralized
        // in the DeliveryContext provider.
        await refreshAssignments();
      }

      const statsResponse = await driverApi.getDailyStats();
      if (statsResponse.success && statsResponse.data) {
        setDailyStats(statsResponse.data);
      }

    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusToggle = async () => {
    try {
      if (isOnline) {
        await driverApi.goOffline();
        updateDriverStatus('offline');
        setIsOnline(false);
      } else {
        await driverApi.goOnline();
        updateDriverStatus('online');
        setIsOnline(true);
      }
    } catch (error) {
      console.error('Error toggling status:', error);
      alert('Failed to update status. Please try again.');
    }
  };

  const handleAvailabilityToggle = async () => {
    if (!driver) return;

    try {
      const newAvailability = !driver.isAvailable;
      const response = await driverApi.updateProfile({ isAvailable: newAvailability });

      if (response.success && response.data) {
        setDriver(response.data);
      } else {
        alert(response.message || 'Failed to update availability.');
      }
    } catch (error) {
      console.error('Error toggling availability:', error);
      alert('Failed to update availability. Please try again.');
    }
  };

  const handleAcceptAssignment = async (assignmentId: string) => {
    try {
      const response = await driverApi.acceptAssignment(assignmentId);
      if (response.success) {
        navigate(`/assignment/${assignmentId}`);
      } else {
        alert(response.message || 'Failed to accept assignment');
      }
    } catch (error) {
      console.error('Error accepting assignment:', error);
      alert('Failed to accept assignment. Please try again.');
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

  // Modal handlers
  const handleCloseAssignmentModal = () => {
    setShowAssignmentModal(false);
    setSelectedAssignment(null);
  };

  const handleAssignmentUpdate = async (updatedAssignment: DeliveryAssignment) => {
    // Refresh assignments from context
    await refreshAssignments();
    setSelectedAssignment(updatedAssignment);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg text-gray-600">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="choma-card p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Welcome back, {driver?.fullName?.split(' ')[0]}! 👋
            </h1>
            <p className="text-gray-600 mt-1">Driver ID: {driver?.driverId}</p>
          </div>

          <div className="flex items-center space-x-4">
            <div className={`flex items-center space-x-2 px-4 py-2 rounded-xl font-medium ${isConnected ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
              {isConnected ? (
                <SignalIcon className="h-5 w-5" />
              ) : (
                <SignalSlashIcon className="h-5 w-5" />
              )}
              <span className="text-sm">
                {isConnected ? 'Connected' : 'Offline'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Status Controls */}
      <div className="choma-card p-6">
        <h3 className="text-xl font-semibold text-gray-900 flex items-center space-x-2 mb-4">
          <TruckIcon className="h-6 w-6 text-choma-orange" />
          <span>Driver Controls</span>
        </h3>
        <div className="space-y-4">
          {/* Online/Offline Toggle */}
          <div className="flex items-center justify-between p-4 rounded-lg bg-gray-50">
            <div>
              <p className="font-medium text-gray-800">Network Status</p>
              <p className="text-sm text-gray-600">
                {isOnline ? 'You are connected to the server.' : 'You are disconnected.'}
              </p>
            </div>
            <button
              onClick={handleStatusToggle}
              className={`px-6 py-2 rounded-xl font-semibold transition-all duration-300 text-sm ${isOnline
                ? 'bg-red-100 text-red-700 hover:bg-red-200'
                : 'bg-green-100 text-green-700 hover:bg-green-200'
                }`}
            >
              {isOnline ? 'Go Offline' : 'Go Online'}
            </button>
          </div>
          {/* Availability Toggle */}
          <div className={`flex items-center justify-between p-4 rounded-lg ${isOnline ? 'bg-gray-50' : 'bg-gray-100 opacity-60'}`}>
            <div>
              <p className="font-medium text-gray-800">Accepting New Orders</p>
              <p className="text-sm text-gray-600">
                {driver?.isAvailable ? 'You will receive new assignments.' : 'You are not accepting new assignments.'}
              </p>
            </div>
            <button
              onClick={handleAvailabilityToggle}
              disabled={!isOnline}
              className={`px-6 py-2 rounded-xl font-semibold transition-all duration-300 text-sm disabled:cursor-not-allowed ${driver?.isAvailable
                ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
                : 'bg-green-100 text-green-700 hover:bg-green-200'
                }`}
            >
              {driver?.isAvailable ? 'Set Unavailable' : 'Set Available'}
            </button>
          </div>
        </div>
      </div>

      {/* Daily Stats */}
      {dailyStats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Completed Deliveries */}
          <div className="bg-white/95 dark:bg-neutral-800/95 backdrop-blur-sm p-6 rounded-xl shadow-lg border border-gray-200/50 dark:border-neutral-700/50 hover:shadow-xl transition-all duration-300 group">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-600 dark:text-neutral-300 mb-2">Completed Deliveries</p>
                <p className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-neutral-100">
                  {dailyStats.completedDeliveries}
                </p>
              </div>
              <div className="w-14 h-14 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                <TruckIcon className="h-8 w-8 text-white" />
              </div>
            </div>
          </div>

          {/* Earnings Today */}
          <div className="bg-white/95 dark:bg-neutral-800/95 backdrop-blur-sm p-6 rounded-xl shadow-lg border border-gray-200/50 dark:border-neutral-700/50 hover:shadow-xl transition-all duration-300 group">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-600 dark:text-neutral-300 mb-2">Earnings Today</p>
                <p className="text-2xl lg:text-3xl font-bold text-green-600 dark:text-green-400">
                  {formatCurrency(dailyStats.earnings)}
                </p>
              </div>
              <div className="w-14 h-14 bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                <CurrencyDollarIcon className="h-8 w-8 text-white" />
              </div>
            </div>
          </div>

          {/* Distance Covered */}
          <div className="bg-white/95 dark:bg-neutral-800/95 backdrop-blur-sm p-6 rounded-xl shadow-lg border border-gray-200/50 dark:border-neutral-700/50 hover:shadow-xl transition-all duration-300 group">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-600 dark:text-neutral-300 mb-2">Distance Covered</p>
                <p className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-neutral-100">
                  {dailyStats.distance.toFixed(1)} km
                </p>
              </div>
              <div className="w-14 h-14 bg-gradient-to-r from-purple-500 to-pink-600 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                <MapPinIcon className="h-8 w-8 text-white" />
              </div>
            </div>
          </div>

          {/* Total Assigned */}
          <div className="bg-white/95 dark:bg-neutral-800/95 backdrop-blur-sm p-6 rounded-xl shadow-lg border border-gray-200/50 dark:border-neutral-700/50 hover:shadow-xl transition-all duration-300 group">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-600 dark:text-neutral-300 mb-2">Total Assigned</p>
                <p className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-neutral-100">
                  {dailyStats.totalDeliveries}
                </p>
              </div>
              <div className="w-14 h-14 bg-gradient-to-r from-orange-500 to-red-600 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                <ClockIcon className="h-8 w-8 text-white" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Recent Notifications */}
      {notifications.length > 0 && (
        <div className="choma-card p-6">
          <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center space-x-2">
            <BellIcon className="h-6 w-6 text-choma-orange" />
            <span>Recent Notifications</span>
          </h3>
          <div className="space-y-3">
            {notifications.slice(0, 3).map((notification, index) => (
              <div key={index} className="flex items-start space-x-3 p-4 bg-gradient-to-r from-choma-orange/5 to-choma-brown/5 rounded-xl border-l-4 border-choma-orange">
                <div className="p-2 bg-choma-orange/20 rounded-lg">
                  <BellIcon className="h-5 w-5 text-choma-orange" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-gray-900">{notification.title}</p>
                  <p className="text-sm text-gray-600 mt-1">{notification.body}</p>
                  <p className="text-xs text-gray-400 mt-2">
                    {new Date(notification.timestamp).toLocaleTimeString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Available Assignments */}
      <div className="choma-card">
        <div className="px-6 py-4 border-b border-gray-100">
          <h3 className="text-xl font-semibold text-gray-900 flex items-center space-x-2">
            <TruckIcon className="h-6 w-6 text-choma-orange" />
            <span>
              {assignments.filter(a => a.status === 'available').length > 0
                ? 'Available Deliveries'
                : 'Your Current Assignments'}
            </span>
          </h3>
        </div>

        <div className="p-6">
          {assignments.length === 0 ? (
            <div className="text-center py-12">
              <div className="p-4 bg-choma-orange/10 rounded-full w-20 h-20 mx-auto mb-4 flex items-center justify-center">
                <TruckIcon className="h-10 w-10 text-choma-orange" />
              </div>
              <p className="text-gray-600 text-lg font-medium">No assignments available right now.</p>
              <p className="text-sm text-gray-500 mt-2">
                {isOnline ? '✅ Stay online to receive new delivery requests!' : '⚠️ Go online to start receiving delivery requests.'}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {assignments.map((assignment) => (
                <div key={assignment._id} className="border border-gray-100 rounded-xl p-6 hover:shadow-lg transition-all duration-300 bg-gradient-to-r from-white to-gray-50">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <span className={`px-3 py-1 text-xs font-bold rounded-full ${assignment.status === 'available' ? 'bg-green-100 text-green-800' :
                        assignment.status === 'assigned' ? 'bg-choma-orange/20 text-choma-brown' :
                          assignment.status === 'picked_up' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-gray-100 text-gray-800'
                        }`}>
                        {assignment.status.replace('_', ' ').toUpperCase()}
                      </span>
                      <span className="font-bold text-green-600 text-lg">
                        {formatCurrency(assignment.totalEarning)}
                      </span>
                    </div>
                    {assignment.priority === 'urgent' && (
                      <span className="px-3 py-1 text-xs font-bold bg-red-100 text-red-800 rounded-full animate-pulse">
                        🚨 URGENT
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <p className="text-sm font-medium text-gray-700">Pickup</p>
                      <p className="text-sm text-gray-600">{assignment.pickupLocation.chefName}</p>
                      <p className="text-sm text-gray-500">{assignment.pickupLocation.address}</p>
                      <p className="text-xs text-gray-400">
                        {formatTime(assignment.estimatedPickupTime)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-700">Delivery</p>
                      <p className="text-sm text-gray-600">{assignment.deliveryLocation.area}</p>
                      <p className="text-sm text-gray-500">{assignment.deliveryLocation.address}</p>
                      <p className="text-xs text-gray-400">
                        {formatTime(assignment.estimatedDeliveryTime)}
                      </p>
                    </div>
                  </div>

                  {assignment.specialInstructions && (
                    <div className="mb-4">
                      <p className="text-sm font-medium text-gray-700">Special Instructions</p>
                      <p className="text-sm text-gray-600">{assignment.specialInstructions}</p>
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <div className="text-sm text-gray-500 font-medium">
                      📍 {assignment.totalDistance.toFixed(1)} km • ⏱️ {assignment.estimatedDuration} min
                    </div>

                    {assignment.status === 'available' && (
                      <button
                        onClick={() => handleAcceptAssignment(assignment._id)}
                        className="px-6 py-2 choma-gradient text-choma-white text-sm font-bold rounded-xl hover:shadow-lg hover:shadow-choma-orange/25 transition-all duration-300 transform hover:scale-105"
                      >
                        Accept Delivery
                      </button>
                    )}

                    {(assignment.status === 'assigned' || assignment.status === 'picked_up') && (
                      <button
                        onClick={() => {
                          setSelectedAssignment(assignment);
                          setShowAssignmentModal(true);
                        }}
                        className="px-6 py-2 bg-choma-brown text-choma-white text-sm font-bold rounded-xl hover:bg-choma-brown/80 transition-all duration-300 transform hover:scale-105"
                      >
                        View Details
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Assignment Details Modal */}
      <AssignmentDetailsModal
        isOpen={showAssignmentModal}
        onClose={handleCloseAssignmentModal}
        assignment={selectedAssignment}
        onAssignmentUpdate={handleAssignmentUpdate}
      />
    </div>
  );
};

export default Dashboard;
