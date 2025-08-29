import React, { useState } from 'react';
import { useCachedApi } from '../hooks/useCachedApi';
import { CACHE_DURATIONS } from '../services/cacheService';
import {
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  TruckIcon,
  StarIcon,
  PhoneIcon,
  EnvelopeIcon,
  IdentificationIcon,
} from '@heroicons/react/24/outline';
import { apiRequest } from '../services/api';
import { useToast } from '../hooks/useToast';
import Toast from '../components/Toast';
import { PermissionGate } from '../contexts/PermissionContext';

import { Driver, DriverApiResponse } from '../types/drivers';

const driversApi = {
  getDrivers: async (params?: Record<string, string>): Promise<DriverApiResponse> => {
    const queryString = params ? new URLSearchParams(params as Record<string, string>).toString() : '';
    return apiRequest(`/drivers?${queryString}`);
  },

  updateDriverStatus: async (driverId: string, status: string) => {
    return apiRequest(`/drivers/${driverId}/status`, {
      method: 'PUT',
      body: JSON.stringify({ accountStatus: status }),
    });
  },

  deleteDriver: async (driverId: string) => {
    return apiRequest(`/drivers/${driverId}`, {
      method: 'DELETE',
    });
  },
};

const Drivers: React.FC = () => {
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');
  const [currentPage, _setCurrentPage] = useState(1);
  const [_selectedDriver, setSelectedDriver] = useState<Driver | null>(null);
  // prevent eslint "assigned but never used" for prefixed variables
  void _setCurrentPage;
  void _selectedDriver;
  const [updating, setUpdating] = useState<string | null>(null);

  // Confirmation modal state
  const [confirmationModal, setConfirmationModal] = useState<{
    isOpen: boolean
    action: string
    driver: Driver | null
    title: string
    message: string
    confirmText: string
    cancelText: string
    type: 'warning' | 'danger' | 'success'
  }>({
    isOpen: false,
    action: '',
    driver: null,
    title: '',
    message: '',
    confirmText: '',
    cancelText: 'Cancel',
    type: 'warning'
  });

  const { toasts, removeToast, success, error } = useToast();

  const { data: driversData, loading, error: apiError, refetch } = useCachedApi(
    () => {
      const params: Record<string, string> = { page: String(currentPage) };
      if (statusFilter !== 'all') {
        params.status = statusFilter;
      }
      if (searchTerm) {
        params.search = searchTerm;
      }
      return driversApi.getDrivers(params);
    },
    {
      cacheKey: `drivers-${currentPage}-${statusFilter}-${searchTerm}`,
      cacheDuration: CACHE_DURATIONS.USER_LIST,
      immediate: true
    }
  );

  // Helper function to show confirmation modal
  const showConfirmation = (action: string, driver: Driver) => {
    let title = ''
    let message = ''
    let confirmText = ''
    let type: 'warning' | 'danger' | 'success' = 'warning'

    switch (action) {
      case 'suspended':
        title = 'Suspend Driver Account'
        message = `Are you sure you want to suspend ${driver.fullName}'s account? This action will:\n\n• Immediately disable their ability to accept new deliveries\n• Cancel any active assignments\n• Send them a notification email\n• Log this action for audit purposes\n\nThe driver will be notified via email and in-app notification.`
        confirmText = 'Suspend Account'
        type = 'danger'
        break
      case 'rejected':
        title = 'Reject Driver Application'
        message = `Are you sure you want to reject ${driver.fullName}'s application? This action will:\n\n• Permanently reject their driver application\n• Send them a notification email\n• Remove them from the pending list\n\nThe driver will be notified via email and in-app notification.`
        confirmText = 'Reject Application'
        type = 'danger'
        break
      case 'approved': {
        const previousStatus = driver.accountStatus
        title = previousStatus === 'suspended' ? 'Unsuspend Driver Account' : 'Approve Driver Application'
        message = `Are you sure you want to ${previousStatus === 'suspended' ? 'unsuspend' : 'approve'} ${driver.fullName}? This action will:\n\n• Grant them full access to accept deliveries\n• Allow them to go online and receive assignments\n• Send them a welcome notification\n\nThe driver will be notified via email and in-app notification.`
        confirmText = previousStatus === 'suspended' ? 'Unsuspend Account' : 'Approve Application'
        type = 'success'
        break
      }
      case 'delete':
        title = 'Delete Driver Account'
        message = `Are you sure you want to permanently delete ${driver.fullName}'s account? This action will:\n\n• Permanently remove their account from the system\n• Cancel any active assignments\n• Cannot be undone\n\nThis is a permanent action and cannot be reversed.`
        confirmText = 'Delete Account'
        type = 'danger'
        break
      default:
        return
    }

    setConfirmationModal({
      isOpen: true,
      action,
      driver,
      title,
      message,
      confirmText,
      cancelText: 'Cancel',
      type
    })
  }

  const handleStatusUpdate = async (driver: Driver, newStatus: string) => {
    if (updating) return;

    setUpdating(driver._id);
    try {
      await driversApi.updateDriverStatus(driver._id, newStatus);
      await refetch(); // Refresh data
      setSelectedDriver(null);
      setConfirmationModal(prev => ({ ...prev, isOpen: false }));
      success(`Driver status updated to ${newStatus} successfully`);
    } catch (err: unknown) {
      console.error('Error updating driver status:', err);
      if (err instanceof Error) {
        error(`Failed to update driver status: ${err.message}`);
      } else {
        error('Failed to update driver status: Unknown error');
      }
    } finally {
      setUpdating(null);
    }
  };

  const handleDeleteDriver = async (driverId: string) => {
    if (updating) return;

    setUpdating(driverId);
    try {
      await driversApi.deleteDriver(driverId);
      await refetch(); // Refresh data
      setSelectedDriver(null);
      setConfirmationModal(prev => ({ ...prev, isOpen: false }));
      success('Driver deleted successfully');
    } catch (err: unknown) {
      console.error('Error deleting driver:', err);
      if (err instanceof Error) {
        error(`Failed to delete driver: ${err.message}`);
      } else {
        error('Failed to delete driver: Unknown error');
      }
    } finally {
      setUpdating(null);
    }
  };

  // Perform the action from confirmation modal
  const performAction = async () => {
    if (!confirmationModal.driver || !confirmationModal.action) return

    if (confirmationModal.action === 'delete') {
      await handleDeleteDriver(confirmationModal.driver._id)
    } else {
      await handleStatusUpdate(confirmationModal.driver, confirmationModal.action)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
      case 'pending':
        return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300'
      case 'suspended':
      case 'rejected':
        return 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300'
      default:
        return 'bg-gray-100 dark:bg-neutral-700/30 text-gray-800 dark:text-neutral-300'
    }
  }

  const getOnlineStatusColor = (status: string) => {
    switch (status) {
      case 'online':
        return 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
      case 'busy':
        return 'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300'
      case 'offline':
        return 'bg-gray-100 dark:bg-neutral-700/30 text-gray-800 dark:text-neutral-300'
      default:
        return 'bg-gray-100 dark:bg-neutral-700/30 text-gray-800 dark:text-neutral-300'
    }
  }

  const typedDriversData = driversData as DriverApiResponse | undefined;
  const drivers = typedDriversData?.data || [];
  const summary = typedDriversData?.summary || {};

  if (apiError) {
    return (
      <div className="space-y-6 p-6">
        <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 p-4 rounded-lg">
          <h3 className="text-red-800 dark:text-red-300 font-medium">Error loading drivers</h3>
          <p className="text-red-600 dark:text-red-400">{apiError}</p>
          <button
            onClick={refetch}
            className="mt-2 px-3 py-1 bg-red-100 dark:bg-red-800/30 hover:bg-red-200 dark:hover:bg-red-800/50 text-red-800 dark:text-red-300 rounded text-sm"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6 p-6">
        <div>
          <h1 className="text-3xl font-semibold text-gray-900 dark:text-neutral-100">Drivers</h1>
          <p className="text-gray-600 dark:text-neutral-200">Manage driver accounts and delivery assignments ({summary.total || 0} drivers)</p>
        </div>

        {/* Search and Filter Section */}
        <div className="space-y-4">
          {/* Search Bar and View Toggle */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex-1 max-w-md relative">
                <i className="fi fi-sr-search text-base absolute left-3 top-3 text-gray-400 dark:text-neutral-400"></i>
                <input
                  type="text"
                  placeholder="Search by driver name, email, or phone..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-full px-4 py-2 border border-gray-300 dark:border-neutral-600 bg-white/90 dark:bg-neutral-800/90 text-gray-900 dark:text-neutral-100 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <button
                onClick={refetch}
                className="px-4 py-2 bg-blue-600 dark:bg-blue-700 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-800 transition-colors flex items-center gap-2"
              >
                <i className="fi fi-sr-refresh"></i>
                Refresh
              </button>
            </div>

            {/* View Toggle */}
            <div className="flex items-center bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
              <button
                onClick={() => setViewMode('cards')}
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${viewMode === 'cards'
                  ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                  }`}
              >
                <i className="fi fi-sr-apps mr-1.5"></i>
                Cards
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${viewMode === 'table'
                  ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                  }`}
              >
                <i className="fi fi-sr-list mr-1.5"></i>
                Table
              </button>
            </div>
          </div>

          {/* Filter Tabs */}
          <div className="flex space-x-1 bg-gray-100 dark:bg-neutral-700/30 p-1 rounded-lg w-fit">
            {['all', 'pending', 'approved', 'suspended'].map((filterType) => (
              <button
                key={filterType}
                onClick={() => setStatusFilter(filterType)}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${statusFilter === filterType
                  ? 'bg-white dark:bg-neutral-800 text-gray-900 dark:text-neutral-100 shadow-sm'
                  : 'text-gray-500 dark:text-neutral-300 hover:text-gray-700 dark:hover:text-neutral-100'
                  }`}
              >
                {filterType.charAt(0).toUpperCase() + filterType.slice(1)} Drivers
                {filterType !== 'all' && summary && (
                  <span className="ml-2 px-2 py-1 text-xs bg-gray-200 dark:bg-gray-600 rounded-full">
                    {filterType === 'pending' && summary.pending ||
                      filterType === 'approved' && summary.approved ||
                      filterType === 'suspended' && summary.suspended || 0}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Stats Summary */}
          {summary && (
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="bg-white dark:bg-neutral-800 p-4 rounded-lg border border-gray-200 dark:border-neutral-700">
                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{summary.total || 0}</div>
                <div className="text-sm text-gray-600 dark:text-neutral-400">Total Drivers</div>
              </div>
              <div className="bg-white dark:bg-neutral-800 p-4 rounded-lg border border-gray-200 dark:border-neutral-700">
                <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{summary.pending || 0}</div>
                <div className="text-sm text-gray-600 dark:text-neutral-400">Pending</div>
              </div>
              <div className="bg-white dark:bg-neutral-800 p-4 rounded-lg border border-gray-200 dark:border-neutral-700">
                <div className="text-2xl font-bold text-green-600 dark:text-green-400">{summary.approved || 0}</div>
                <div className="text-sm text-gray-600 dark:text-neutral-400">Approved</div>
              </div>
              <div className="bg-white dark:bg-neutral-800 p-4 rounded-lg border border-gray-200 dark:border-neutral-700">
                <div className="text-2xl font-bold text-green-600 dark:text-green-400">{summary.online || 0}</div>
                <div className="text-sm text-gray-600 dark:text-neutral-400">Online</div>
              </div>
              <div className="bg-white dark:bg-neutral-800 p-4 rounded-lg border border-gray-200 dark:border-neutral-700">
                <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">{summary.busy || 0}</div>
                <div className="text-sm text-gray-600 dark:text-neutral-400">Busy</div>
              </div>
            </div>
          )}
        </div>

        {/* Loading State */}
        {loading && (
          <div className="bg-white/90 dark:bg-neutral-800/90 p-8 rounded-lg shadow-sm border border-gray-200 dark:border-neutral-700 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-neutral-400">Loading drivers...</p>
          </div>
        )}

        {/* Drivers Display */}
        {!loading && drivers.length === 0 ? (
          <div className="bg-white/90 dark:bg-neutral-800/90 p-8 rounded-lg shadow-sm border border-gray-200 dark:border-neutral-700 text-center">
            <div className="text-4xl mb-2"><TruckIcon className="h-16 w-16 mx-auto text-gray-400" /></div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-neutral-100 mb-2">No Drivers Found</h3>
            <p className="text-gray-600 dark:text-neutral-200">No drivers match your current filters.</p>
          </div>
        ) : !loading && viewMode === 'cards' ? (
          /* Card View */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {drivers.map((driver) => (
              <div key={driver._id} className="group bg-white dark:bg-neutral-800 rounded-2xl shadow-lg hover:shadow-xl border border-gray-100 dark:border-neutral-700 overflow-hidden transition-all duration-300 hover:-translate-y-1 relative">
                {/* Status Badges - Floating */}
                <div className="absolute top-4 right-4 z-10 flex flex-col gap-1">
                  <span className={`inline-flex px-3 py-1 text-xs font-bold rounded-full shadow-sm ${getStatusColor(driver.accountStatus)}`}>
                    {driver.accountStatus}
                  </span>
                  {driver.status && (
                    <span className={`inline-flex px-3 py-1 text-xs font-medium rounded-full shadow-sm ${getOnlineStatusColor(driver.status)}`}>
                      {driver.status}
                    </span>
                  )}
                </div>

                {/* Driver Header */}
                <div className="relative p-6 bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-neutral-800 dark:to-neutral-700">
                  <div className="flex items-center space-x-4">
                    {/* Avatar */}
                    <div className="relative">
                      <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 dark:from-blue-600 dark:to-indigo-700 rounded-2xl flex items-center justify-center text-white font-bold text-lg shadow-lg">
                        {driver.fullName?.charAt(0)?.toUpperCase() || 'D'}
                      </div>
                      {driver.status === 'online' && (
                        <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 border-2 border-white dark:border-neutral-800 rounded-full"></div>
                      )}
                    </div>

                    {/* Driver Info */}
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-neutral-100 truncate">
                        {driver.fullName}
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-neutral-300 truncate">
                        ID: {driver.driverId}
                      </p>
                    </div>
                  </div>

                  {/* Vehicle Info */}
                  {driver.vehicleInfo && (
                    <div className="mt-4 p-3 bg-white/50 dark:bg-neutral-800/50 rounded-lg">
                      <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-neutral-300">
                        <TruckIcon className="h-4 w-4" />
                        <span className="capitalize">{driver.vehicleInfo.type}</span>
                        {driver.vehicleInfo.plateNumber && (
                          <>
                            <span>•</span>
                            <span className="font-mono">{driver.vehicleInfo.plateNumber}</span>
                          </>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Driver Details */}
                <div className="p-6 space-y-4">
                  {/* Contact Info */}
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-neutral-300">
                      <EnvelopeIcon className="h-4 w-4" />
                      <span className="truncate">{driver.email}</span>
                    </div>
                    {driver.phone && (
                      <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-neutral-300">
                        <PhoneIcon className="h-4 w-4" />
                        <span>{driver.phone}</span>
                      </div>
                    )}
                    {driver.licenseNumber && (
                      <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-neutral-300">
                        <IdentificationIcon className="h-4 w-4" />
                        <span>License: {driver.licenseNumber}</span>
                      </div>
                    )}
                  </div>

                  {/* Stats */}
                  {driver.stats && (
                    <div className="grid grid-cols-3 gap-3 pt-4 border-t border-gray-200 dark:border-neutral-700">
                      <div className="text-center">
                        <div className="text-lg font-semibold text-gray-900 dark:text-neutral-100">
                          {driver.stats.totalDeliveries || 0}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-neutral-400">Deliveries</div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-semibold text-green-600 dark:text-green-400">
                          ₦{driver.stats.totalEarnings?.toLocaleString() || 0}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-neutral-400">Earnings</div>
                      </div>
                      <div className="text-center">
                        <div className="flex items-center justify-center space-x-1">
                          <span className="text-lg font-semibold text-yellow-500">
                            {driver.stats.rating?.toFixed(1) || 'N/A'}
                          </span>
                          {driver.stats.rating && <StarIcon className="h-4 w-4 text-yellow-500" />}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-neutral-400">Rating</div>
                      </div>
                    </div>
                  )}

                  {/* Active Assignment */}
                  {driver.activeAssignment && (
                    <div className="p-3 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg">
                      <div className="flex items-center space-x-2 text-sm text-orange-800 dark:text-orange-300">
                        <ClockIcon className="h-4 w-4" />
                        <span className="font-medium">Active Delivery</span>
                      </div>
                      <div className="text-xs text-orange-600 dark:text-orange-400 mt-1">
                        Status: {driver.activeAssignment.status}
                      </div>
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <PermissionGate module="drivers" action="manage">
                  <div className="p-6 pt-0 flex flex-wrap gap-2">
                    {driver.accountStatus === 'pending' && (
                      <>
                        <button
                          onClick={() => showConfirmation('approved', driver)}
                          disabled={updating === driver._id}
                          className="flex-1 px-3 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => showConfirmation('rejected', driver)}
                          disabled={updating === driver._id}
                          className="flex-1 px-3 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
                        >
                          Reject
                        </button>
                      </>
                    )}

                    {driver.accountStatus === 'approved' && (
                      <button
                        onClick={() => showConfirmation('suspended', driver)}
                        disabled={updating === driver._id}
                        className="flex-1 px-3 py-2 bg-yellow-600 hover:bg-yellow-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
                      >
                        Suspend
                      </button>
                    )}

                    {driver.accountStatus === 'suspended' && (
                      <button
                        onClick={() => showConfirmation('approved', driver)}
                        disabled={updating === driver._id}
                        className="flex-1 px-3 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
                      >
                        Unsuspend
                      </button>
                    )}

                    <button
                      onClick={() => showConfirmation('delete', driver)}
                      disabled={updating === driver._id}
                      className="px-3 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
                    >
                      Delete
                    </button>
                  </div>
                </PermissionGate>
              </div>
            ))}
          </div>
        ) : !loading && viewMode === 'table' ? (
          /* Table View */
          <div className="bg-white dark:bg-neutral-800 rounded-lg border border-gray-200 dark:border-neutral-700 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-neutral-700">
                <thead className="bg-gray-50 dark:bg-neutral-700/50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-neutral-400 uppercase tracking-wider">
                      Driver
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-neutral-400 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-neutral-400 uppercase tracking-wider">
                      Vehicle
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-neutral-400 uppercase tracking-wider">
                      Stats
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-neutral-400 uppercase tracking-wider">
                      Joined
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-neutral-400 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-neutral-800 divide-y divide-gray-200 dark:divide-neutral-700">
                  {drivers.map((driver) => (
                    <tr key={driver._id} className="hover:bg-gray-50 dark:hover:bg-neutral-700/50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10">
                            <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-semibold">
                              {driver.fullName?.charAt(0)?.toUpperCase() || 'D'}
                            </div>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900 dark:text-neutral-100">
                              {driver.fullName}
                            </div>
                            <div className="text-sm text-gray-500 dark:text-neutral-400">
                              {driver.email}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex flex-col space-y-1">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full w-fit ${getStatusColor(driver.accountStatus)}`}>
                            {driver.accountStatus}
                          </span>
                          {driver.status && (
                            <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full w-fit ${getOnlineStatusColor(driver.status)}`}>
                              {driver.status}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-neutral-400">
                        {driver.vehicleInfo ? (
                          <div>
                            <div className="capitalize">{driver.vehicleInfo.type}</div>
                            {driver.vehicleInfo.plateNumber && (
                              <div className="text-xs font-mono">{driver.vehicleInfo.plateNumber}</div>
                            )}
                          </div>
                        ) : (
                          'N/A'
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-neutral-400">
                        {driver.stats ? (
                          <div>
                            <div>{driver.stats.totalDeliveries || 0} deliveries</div>
                            <div className="text-xs">₦{driver.stats.totalEarnings?.toLocaleString() || 0}</div>
                          </div>
                        ) : (
                          'No stats'
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-neutral-400">
                        {new Date(driver.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <PermissionGate module="drivers" action="manage">
                          <div className="flex items-center justify-end space-x-2">
                            {driver.accountStatus === 'pending' && (
                              <>
                                <button
                                  onClick={() => showConfirmation('approved', driver)}
                                  disabled={updating === driver._id}
                                  className="text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-300 disabled:opacity-50"
                                >
                                  Approve
                                </button>
                                <button
                                  onClick={() => showConfirmation('rejected', driver)}
                                  disabled={updating === driver._id}
                                  className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 disabled:opacity-50"
                                >
                                  Reject
                                </button>
                              </>
                            )}

                            {driver.accountStatus === 'approved' && (
                              <button
                                onClick={() => showConfirmation('suspended', driver)}
                                disabled={updating === driver._id}
                                className="text-yellow-600 hover:text-yellow-900 dark:text-yellow-400 dark:hover:text-yellow-300 disabled:opacity-50"
                              >
                                Suspend
                              </button>
                            )}

                            {driver.accountStatus === 'suspended' && (
                              <button
                                onClick={() => showConfirmation('approved', driver)}
                                disabled={updating === driver._id}
                                className="text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-300 disabled:opacity-50"
                              >
                                Unsuspend
                              </button>
                            )}

                            <button
                              onClick={() => showConfirmation('delete', driver)}
                              disabled={updating === driver._id}
                              className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 disabled:opacity-50"
                            >
                              Delete
                            </button>
                          </div>
                        </PermissionGate>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}
      </div>

      {/* Confirmation Modal */}
      {confirmationModal.isOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-neutral-800 rounded-xl shadow-2xl max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center mb-4">
                <div className={`rounded-full p-2 mr-3 ${confirmationModal.type === 'danger' ? 'bg-red-100 dark:bg-red-900/30' :
                    confirmationModal.type === 'warning' ? 'bg-yellow-100 dark:bg-yellow-900/30' :
                      'bg-green-100 dark:bg-green-900/30'
                  }`}>
                  {confirmationModal.type === 'danger' ? (
                    <XCircleIcon className={`h-6 w-6 ${confirmationModal.type === 'danger' ? 'text-red-600 dark:text-red-400' : 'text-yellow-600 dark:text-yellow-400'}`} />
                  ) : confirmationModal.type === 'warning' ? (
                    <ClockIcon className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
                  ) : (
                    <CheckCircleIcon className="h-6 w-6 text-green-600 dark:text-green-400" />
                  )}
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-neutral-100">
                  {confirmationModal.title}
                </h3>
              </div>
              <div className="mb-6">
                <p className="text-gray-600 dark:text-neutral-300 whitespace-pre-line">
                  {confirmationModal.message}
                </p>
              </div>
              <div className="flex space-x-3">
                <button
                  onClick={() => setConfirmationModal(prev => ({ ...prev, isOpen: false }))}
                  className="flex-1 px-4 py-2 text-gray-700 dark:text-neutral-300 bg-gray-100 dark:bg-neutral-700 hover:bg-gray-200 dark:hover:bg-neutral-600 rounded-lg transition-colors"
                >
                  {confirmationModal.cancelText}
                </button>
                <button
                  onClick={performAction}
                  disabled={updating !== null}
                  className={`flex-1 px-4 py-2 text-white font-medium rounded-lg transition-colors disabled:opacity-50 ${confirmationModal.type === 'danger' ? 'bg-red-600 hover:bg-red-700' :
                      confirmationModal.type === 'warning' ? 'bg-yellow-600 hover:bg-yellow-700' :
                        'bg-green-600 hover:bg-green-700'
                    }`}
                >
                  {updating !== null ? 'Processing...' : confirmationModal.confirmText}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notifications */}
      <div className="fixed bottom-4 right-4 space-y-2 z-50">
        {toasts.map(toast => (
          <Toast
            key={toast.id}
            {...toast}
            onClose={() => removeToast(toast.id)}
          />
        ))}
      </div>
    </>
  );
};

export default Drivers;