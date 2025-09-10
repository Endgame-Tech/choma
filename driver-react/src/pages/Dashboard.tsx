import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWebSocket } from '../hooks/useWebSocket';
import { useDelivery } from '../contexts/DeliveryContext';
import { DeliveryAssignment, Driver, DailyStats } from '../types';
import { driverApi } from '../services/api';
import {
  Truck,
  MapPin,
  Clock,
  DollarSign,
  Bell,
  Signal,
  SignalSlash,
  AlertTriangle
} from 'lucide-react';
import AssignmentDetailsModal from '../components/AssignmentDetailsModal';

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { isConnected, updateDriverStatus } = useWebSocket();
  const { assignments, refreshAssignments } = useDelivery();
  const [driver, setDriver] = useState<Driver | null>(null);
  const [dailyStats, setDailyStats] = useState<DailyStats | null>(null);
  const [isOnline, setIsOnline] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notifications] = useState<any[]>([]);
  const [selectedAssignment, setSelectedAssignment] = useState<DeliveryAssignment | null>(null);
  const [showAssignmentModal, setShowAssignmentModal] = useState(false);

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        setLoading(true);
        setError(null);

        const [profileResponse, assignmentsResponse, statsResponse] = await Promise.all([
          driverApi.getProfile().catch(() => ({ success: false, data: null })),
          driverApi.getAssignments().catch(() => ({ success: false, data: null })),
          driverApi.getDailyStats().catch(() => ({ success: false, data: null }))
        ]);

        if (profileResponse.success && profileResponse.data) {
          setDriver(profileResponse.data);
          setIsOnline(profileResponse.data.status === 'online');
        }

        if (assignmentsResponse.success && assignmentsResponse.data) {
          await refreshAssignments();
        }

        if (statsResponse.success && statsResponse.data) {
          setDailyStats(statsResponse.data);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };

    loadDashboardData();
  }, []);

  const handleStatusToggle = async () => {
    try {
      setError(null); // Clear any previous errors
      
      if (isOnline) {
        const response = await driverApi.goOffline();
        if (response.success) {
          updateDriverStatus('offline');
          setIsOnline(false);
          // Refresh driver profile to ensure consistent state
          const profileResponse = await driverApi.getProfile();
          if (profileResponse.success && profileResponse.data) {
            setDriver(profileResponse.data);
          }
        } else {
          setError(response.message || 'Failed to go offline. Please try again.');
        }
      } else {
        console.log('🟢 Attempting to go online...');
        const response = await driverApi.goOnline();
        console.log('🟢 Go online response:', response);
        
        if (response.success) {
          updateDriverStatus('online');
          setIsOnline(true);
          // Refresh driver profile to ensure consistent state
          const profileResponse = await driverApi.getProfile();
          console.log('🟢 Profile after going online:', profileResponse.data);
          if (profileResponse.success && profileResponse.data) {
            setDriver(profileResponse.data);
          }
        } else {
          console.error('🔴 Failed to go online:', response);
          setError(response.message || 'Failed to go online. Please try again.');
        }
      }
    } catch (error) {
      console.error('Error toggling status:', error);
      const errorMessage = error?.response?.data?.message || error?.message || 'Failed to update status. Please try again.';
      setError(errorMessage);
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
        setError(response.message || 'Failed to update availability.');
      }
    } catch (error) {
      console.error('Error toggling availability:', error);
      setError('Failed to update availability. Please try again.');
    }
  };

  const handleAcceptAssignment = async (assignmentId: string) => {
    try {
      const response = await driverApi.acceptAssignment(assignmentId);
      if (response.success) {
        navigate(`/assignment/${assignmentId}`);
      } else {
        setError(response.message || 'Failed to accept assignment');
      }
    } catch (error) {
      console.error('Error accepting assignment:', error);
      setError('Failed to accept assignment. Please try again.');
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

  const handleCloseAssignmentModal = () => {
    setShowAssignmentModal(false);
    setSelectedAssignment(null);
  };

  const handleAssignmentUpdate = async (updatedAssignment: DeliveryAssignment) => {
    await refreshAssignments();
    setSelectedAssignment(updatedAssignment);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-300">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-center">
          <AlertTriangle size={20} className="text-red-400 mr-3" />
          <div>
            <h3 className="text-red-800 font-medium">Error loading dashboard</h3>
            <p className="text-red-600">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Welcome Section */}
      <div className="mb-6">
        <h1 className="text-3xl font-semibold text-gray-900 dark:text-white">
          Welcome back, {driver?.fullName?.split(' ')[0]}!
        </h1>
        <p className="text-gray-600 dark:text-gray-300">Here's what's happening with your deliveries today.</p>
      </div>

      {/* Account Status Alert */}
      {driver?.accountStatus !== 'approved' && (
        <div className="mb-6 bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-700 rounded-lg p-4">
          <div className="flex items-center">
            <AlertTriangle size={20} className="text-yellow-400 dark:text-yellow-300 mr-3" />
            <div>
              <h3 className="text-yellow-800 dark:text-yellow-200 font-medium">Account Status: {driver?.accountStatus}</h3>
              <p className="text-yellow-700 dark:text-yellow-300 text-sm">
                {driver?.accountStatus === 'pending'
                  ? 'Your application is being reviewed. You\'ll be notified once approved.'
                  : driver?.accountStatus === 'rejected'
                  ? 'Your account has been rejected. Please contact support for more information.'
                  : driver?.accountStatus === 'suspended'
                  ? 'Your account has been suspended. Please contact support immediately.'
                  : 'Please contact support for more information about your account status.'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Driver Status Info (when approved but offline) */}
      {driver?.accountStatus === 'approved' && driver?.status === 'offline' && !isOnline && (
        <div className="mb-6 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 rounded-lg p-4">
          <div className="flex items-center">
            <AlertTriangle size={20} className="text-blue-400 dark:text-blue-300 mr-3" />
            <div>
              <h3 className="text-blue-800 dark:text-blue-200 font-medium">You're Currently Offline</h3>
              <p className="text-blue-700 dark:text-blue-300 text-sm">
                Go online to start receiving delivery assignments and earn money.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Stats Grid */}
      {dailyStats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 transition-colors duration-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Completed Deliveries</p>
                <p className="text-3xl font-semibold text-gray-900 dark:text-white">
                  {dailyStats.completedDeliveries?.toLocaleString() || '0'}
                </p>
              </div>
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-800 rounded-full flex items-center justify-center">
                <Truck size={24} className="text-blue-600 dark:text-blue-300" />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 transition-colors duration-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Earnings Today</p>
                <p className="text-3xl font-semibold text-green-600 dark:text-green-400">
                  {formatCurrency(dailyStats.earnings)}
                </p>
              </div>
              <div className="w-12 h-12 bg-green-100 dark:bg-green-800 rounded-full flex items-center justify-center">
                <DollarSign size={24} className="text-green-600 dark:text-green-300" />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 transition-colors duration-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Distance Covered</p>
                <p className="text-3xl font-semibold text-gray-900 dark:text-white">
                  {dailyStats.distance.toFixed(1)} km
                </p>
              </div>
              <div className="w-12 h-12 bg-purple-100 dark:bg-purple-800 rounded-full flex items-center justify-center">
                <MapPin size={24} className="text-purple-600 dark:text-purple-300" />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 transition-colors duration-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Total Assigned</p>
                <p className="text-3xl font-semibold text-gray-900 dark:text-white">
                  {dailyStats.totalDeliveries?.toLocaleString() || '0'}
                </p>
              </div>
              <div className="w-12 h-12 bg-orange-100 dark:bg-orange-800 rounded-full flex items-center justify-center">
                <Clock size={24} className="text-orange-600 dark:text-orange-300" />
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Assignments */}
        <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 transition-colors duration-200">
          <div className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              {assignments.filter(a => a.status === 'available').length > 0
                ? 'Available Deliveries'
                : 'Your Current Assignments'}
            </h3>
            {assignments.length === 0 ? (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <Truck size={48} className="mx-auto mb-2 text-gray-400 dark:text-gray-500" />
                <p>No assignments available right now.</p>
                <p className="text-sm mt-2">
                  {isOnline ? 'Stay online to receive new delivery requests!' : 'Go online to start receiving delivery requests.'}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {assignments.map((assignment) => (
                  <div
                    key={assignment._id}
                    className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium text-gray-900 dark:text-white">#{assignment._id}</h4>
                        <div className="flex items-center space-x-2">
                          <span
                            className={`px-2 py-1 text-xs font-medium rounded-full ${
                              assignment.status === 'available' ? 'bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100' :
                              assignment.status === 'assigned' ? 'bg-blue-100 text-blue-800 dark:bg-blue-800 dark:text-blue-100' :
                              assignment.status === 'picked_up' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-800 dark:text-yellow-100' :
                              'bg-gray-100 text-gray-800 dark:bg-gray-600 dark:text-gray-100'
                            }`}
                          >
                            {assignment.status.replace('_', ' ').toUpperCase()}
                          </span>
                          {assignment.priority === 'urgent' && (
                            <span className="px-2 py-1 text-xs font-medium bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-100 rounded-full">
                              URGENT
                            </span>
                          )}
                        </div>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-300 mb-1">
                        {assignment.pickupLocation.chefName || 'Unknown Chef'}
                      </p>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {formatCurrency(assignment.totalEarning)}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        Delivery: {formatTime(assignment.estimatedDeliveryTime)}
                      </p>
                    </div>
                    <div>
                      {assignment.status === 'available' && (
                        <button
                          onClick={() => handleAcceptAssignment(assignment._id)}
                          className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
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
                          className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
                        >
                          View Details
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div className="mt-4 text-center">
              <a
                href="/assignments"
                className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 text-sm font-medium transition-colors"
              >
                View all assignments →
              </a>
            </div>
          </div>
        </div>

        {/* Quick Actions & Info */}
        <div className="space-y-6">
          {/* Driver Controls */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 transition-colors duration-200">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Driver Controls</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-lg bg-gray-50 dark:bg-gray-700">
                <div>
                  <p className="font-medium text-gray-800 dark:text-gray-200">Network Status</p>
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    {isOnline ? 'You are connected to the server.' : 'You are disconnected.'}
                  </p>
                </div>
                <button
                  onClick={handleStatusToggle}
                  className={`px-4 py-2 rounded-lg font-medium text-sm ${
                    isOnline
                      ? 'bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-800 dark:text-red-100 dark:hover:bg-red-700'
                      : 'bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-800 dark:text-green-100 dark:hover:bg-green-700'
                  }`}
                >
                  {isOnline ? 'Go Offline' : 'Go Online'}
                </button>
              </div>
              <div className={`flex items-center justify-between p-4 rounded-lg ${isOnline ? 'bg-gray-50 dark:bg-gray-700' : 'bg-gray-100 dark:bg-gray-600 opacity-60'}`}>
                <div>
                  <p className="font-medium text-gray-800 dark:text-gray-200">Accepting New Orders</p>
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    {driver?.isAvailable ? 'You will receive new assignments.' : 'You are not accepting new assignments.'}
                  </p>
                </div>
                <button
                  onClick={handleAvailabilityToggle}
                  disabled={!isOnline}
                  className={`px-4 py-2 rounded-lg font-medium text-sm disabled:cursor-not-allowed ${
                    driver?.isAvailable
                      ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200 dark:bg-yellow-800 dark:text-yellow-100 dark:hover:bg-yellow-700'
                      : 'bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-800 dark:text-green-100 dark:hover:bg-green-700'
                  }`}
                >
                  {driver?.isAvailable ? 'Set Unavailable' : 'Set Available'}
                </button>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 transition-colors duration-200">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Quick Actions</h3>
            <div className="space-y-3">
              <a
                href="/assignments"
                className="block w-full text-left px-4 py-3 bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-900/50 rounded-lg transition-colors"
              >
                <span className="font-medium text-blue-700 dark:text-blue-300">View My Assignments</span>
                <p className="text-sm text-blue-600 dark:text-blue-400">Check and update assignment status</p>
              </a>
              <a
                href="/profile"
                className="block w-full text-left px-4 py-3 bg-green-50 dark:bg-green-900/30 hover:bg-green-100 dark:hover:bg-green-900/50 rounded-lg transition-colors"
              >
                <span className="font-medium text-green-700 dark:text-green-300">Update Profile</span>
                <p className="text-sm text-green-600 dark:text-green-400">Manage your driver profile</p>
              </a>
              <a
                href="/earnings"
                className="block w-full text-left px-4 py-3 bg-purple-50 dark:bg-purple-900/30 hover:bg-purple-100 dark:hover:bg-purple-900/50 rounded-lg transition-colors"
              >
                <span className="font-medium text-purple-700 dark:text-purple-300">View Earnings</span>
                <p className="text-sm text-purple-600 dark:text-purple-400">Track payments and earnings</p>
              </a>
            </div>
          </div>

          {/* Notifications */}
          {notifications.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 transition-colors duration-200">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Recent Notifications</h3>
              <div className="space-y-3">
                {notifications.slice(0, 3).map((notification, index) => (
                  <div key={index} className="flex items-start space-x-3 p-4 border border-gray-200 dark:border-gray-600 rounded-lg">
                    <div className="p-2 bg-blue-100 dark:bg-blue-800 rounded-lg">
                      <Bell size={20} className="text-blue-600 dark:text-blue-300" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-gray-900 dark:text-white">{notification.title}</p>
                      <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">{notification.body}</p>
                      <p className="text-xs text-gray-400 dark:text-gray-400 mt-2">
                        {new Date(notification.timestamp).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
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