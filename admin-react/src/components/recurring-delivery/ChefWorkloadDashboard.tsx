import React, { useState } from 'react';
import { useCachedApi } from '../../hooks/useCachedApi';
import { CACHE_DURATIONS } from '../../services/cacheService';
import { api } from '../../services/api';
import type { ApiResponse } from '../../types';

// Mock axios response interface for the hook
interface MockAxiosResponse<T> {
  data: T;
}

interface ChefWorkload {
  _id: string;
  fullName: string;
  email: string;
  phone: string;
  profileImage?: string;
  activeAssignments: number;
  totalMealsAssigned: number;
  totalMealsCompleted: number;
  currentWeekMeals: number;
  maxDailyCapacity: number;
  utilizationRate: number;
  averageRating: number;
  onTimeDeliveryRate: number;
  consistencyScore: number;
  workloadScore: number;
  status: 'available' | 'busy' | 'overloaded';
  nextAvailableSlot?: Date;
  specializations: string[];
  location: {
    area: string;
    coordinates: [number, number];
  };
}

interface ChefReassignmentRequest {
  _id: string;
  subscriptionId: string;
  customerName: string;
  currentChefName: string;
  reason: string;
  requestedAt: Date;
  status: 'pending' | 'approved' | 'rejected';
  priority: 'low' | 'normal' | 'high';
}

const ChefWorkloadDashboard: React.FC = () => {
  const [selectedTimeFrame, setSelectedTimeFrame] = useState<'today' | 'week' | 'month'>('today');
  const [selectedArea, setSelectedArea] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'workload' | 'rating' | 'efficiency'>('workload');
  // Fetch chef workload data
  const {
    data: chefsWorkload,
    loading: chefsLoading,
    error: chefsError,
    refetch: refetchChefs
  } = useCachedApi<ChefWorkload[]>(
    async () => {
      const response = await api.get<ApiResponse<ChefWorkload[]>>(`/chefs/workload?timeframe=${selectedTimeFrame}&area=${selectedArea}&sort=${sortBy}`);
      return { data: response.data.data } as MockAxiosResponse<ChefWorkload[]>;
    },
    {
      cacheKey: `chef-workload-${selectedTimeFrame}-${selectedArea}-${sortBy}`,
      cacheDuration: CACHE_DURATIONS.CHEFS,
      immediate: true
    }
  );

  // Fetch chef reassignment requests
  const {
    data: reassignmentRequests,
    loading: requestsLoading,
    refetch: refetchRequests
  } = useCachedApi<ChefReassignmentRequest[]>(
    async () => {
      const response = await api.get<ApiResponse<ChefReassignmentRequest[]>>('/chefs/reassignment-requests');
      return { data: response.data.data } as MockAxiosResponse<ChefReassignmentRequest[]>;
    },
    {
      cacheKey: 'chef-reassignment-requests',
      cacheDuration: CACHE_DURATIONS.ORDERS,
      immediate: true
    }
  );

  const getWorkloadColor = (workloadScore: number, status: string) => {
    if (status === 'overloaded') return 'text-red-600 bg-red-50';
    if (workloadScore > 85) return 'text-orange-600 bg-orange-50';
    if (workloadScore > 65) return 'text-yellow-600 bg-yellow-50';
    return 'text-green-600 bg-green-50';
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'available': return '✅';
      case 'busy': return '🟡';
      case 'overloaded': return '🔴';
      default: return '⚫';
    }
  };

  const handleReassignmentAction = async (requestId: string, action: 'approve' | 'reject', newChefId?: string) => {
    try {
      await api.post(`/chefs/reassignment-requests/${requestId}/${action}`, {
        newChefId
      });
      refetchRequests();
      refetchChefs();
    } catch (error) {
      console.error('Failed to process reassignment:', error);
    }
  };

  if (chefsLoading && requestsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg text-gray-600 dark:text-neutral-200">Loading chef workload data...</div>
      </div>
    );
  }

  if (chefsError && !chefsWorkload) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="text-red-600 dark:text-red-400 text-lg mb-2">Error loading chef workload data</div>
          <div className="text-sm text-gray-600 dark:text-neutral-200">{chefsError || 'Unknown error'}</div>
          <button
            onClick={refetchChefs}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
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
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-neutral-100">
            Chef Workload Management
          </h2>
          <p className="text-gray-600 dark:text-neutral-200">
            Monitor chef capacity, assignments, and performance
          </p>
        </div>

        {/* Controls */}
        <div className="flex gap-3">
          <select
            value={selectedTimeFrame}
            onChange={(e) => setSelectedTimeFrame(e.target.value as 'today' | 'week' | 'month')}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm"
          >
            <option value="today">Today</option>
            <option value="week">This Week</option>
            <option value="month">This Month</option>
          </select>

          <select
            value={selectedArea}
            onChange={(e) => setSelectedArea(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm"
          >
            <option value="all">All Areas</option>
            <option value="lagos-island">Lagos Island</option>
            <option value="mainland">Mainland</option>
            <option value="ikoyi">Ikoyi</option>
            <option value="victoria-island">Victoria Island</option>
          </select>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as 'workload' | 'rating' | 'efficiency')}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm"
          >
            <option value="workload">Workload</option>
            <option value="rating">Rating</option>
            <option value="efficiency">Efficiency</option>
          </select>
        </div>
      </div>

      {/* Chef Workload Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {Array.isArray(chefsWorkload) && chefsWorkload.map((chef) => (
          <div
            key={chef._id}
            className="bg-white dark:bg-neutral-800 rounded-lg shadow-sm border border-gray-200 dark:border-neutral-700 p-6"
          >
            {/* Chef Header */}
            <div className="flex items-center gap-3 mb-4">
              <div className="relative">
                <img
                  src={chef.profileImage || '/default-avatar.png'}
                  alt={chef.fullName}
                  className="w-12 h-12 rounded-full object-cover"
                />
                <span
                  className="absolute -top-1 -right-1 text-lg"
                  title={chef.status}
                >
                  {getStatusIcon(chef.status)}
                </span>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-neutral-100">
                  {chef.fullName}
                </h3>
                <p className="text-sm text-gray-500 dark:text-neutral-400">
                  {chef.location.area}
                </p>
              </div>
            </div>

            {/* Workload Metrics */}
            <div className="space-y-3 mb-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600 dark:text-neutral-200">Workload</span>
                <span
                  className={`px-2 py-1 rounded-full text-xs font-medium ${getWorkloadColor(
                    chef.workloadScore,
                    chef.status
                  )}`}
                >
                  {chef.workloadScore}%
                </span>
              </div>

              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full ${chef.workloadScore > 85
                    ? 'bg-red-500'
                    : chef.workloadScore > 65
                      ? 'bg-yellow-500'
                      : 'bg-green-500'
                    }`}
                  style={{ width: `${Math.min(chef.workloadScore, 100)}%` }}
                ></div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-gray-600 dark:text-neutral-200">Active:</span>
                  <span className="font-medium ml-1">{chef.activeAssignments}</span>
                </div>
                <div>
                  <span className="text-gray-600 dark:text-neutral-200">Capacity:</span>
                  <span className="font-medium ml-1">{chef.maxDailyCapacity}</span>
                </div>
              </div>
            </div>

            {/* Performance Metrics */}
            <div className="border-t border-gray-200 dark:border-neutral-700 pt-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600 dark:text-neutral-200">Rating:</span>
                <span className="font-medium">⭐ {chef.averageRating.toFixed(1)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600 dark:text-neutral-200">On-time:</span>
                <span className="font-medium">{chef.onTimeDeliveryRate}%</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600 dark:text-neutral-200">Consistency:</span>
                <span className="font-medium">{chef.consistencyScore}/100</span>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="mt-4 flex gap-2">
              <button className="flex-1 px-3 py-2 bg-blue-50 text-blue-600 rounded-md text-sm font-medium hover:bg-blue-100">
                View Details
              </button>
              <button className="px-3 py-2 bg-gray-50 text-gray-600 rounded-md text-sm hover:bg-gray-100">
                Assign
              </button>
            </div>
          </div>
        ))}

        {(!Array.isArray(chefsWorkload) || chefsWorkload.length === 0) && (
          <div className="col-span-full">
            <div className="text-center py-12 bg-white dark:bg-neutral-800 rounded-lg shadow-sm border border-gray-200 dark:border-neutral-700">
              <div className="text-gray-500 dark:text-neutral-400">
                {chefsLoading ? 'Loading chef workload data...' : 'No chef workload data available'}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Reassignment Requests */}
      <div className="bg-white dark:bg-neutral-800 rounded-lg shadow-sm border border-gray-200 dark:border-neutral-700">
        <div className="p-6 border-b border-gray-200 dark:border-neutral-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-neutral-100">
            Chef Reassignment Requests
          </h3>
          <p className="text-sm text-gray-600 dark:text-neutral-200">
            Pending customer requests for chef changes
          </p>
        </div>

        <div className="divide-y divide-gray-200 dark:divide-neutral-700">
          {Array.isArray(reassignmentRequests) && reassignmentRequests.map((request) => (
            <div key={request._id} className="p-6 hover:bg-gray-50 dark:hover:bg-neutral-700">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h4 className="font-medium text-gray-900 dark:text-neutral-100">
                      {request.customerName}
                    </h4>
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${request.priority === 'high'
                        ? 'bg-red-100 text-red-800'
                        : request.priority === 'normal'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-gray-100 text-gray-800'
                        }`}
                    >
                      {request.priority} priority
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-neutral-200 mb-2">
                    Current Chef: <span className="font-medium">{request.currentChefName}</span>
                  </p>
                  <p className="text-sm text-gray-500 dark:text-neutral-400">
                    Reason: {request.reason}
                  </p>
                  <p className="text-xs text-gray-400 dark:text-neutral-500 mt-1">
                    Requested: {new Date(request.requestedAt).toLocaleString()}
                  </p>
                </div>

                <div className="flex gap-2 ml-4">
                  <button
                    onClick={() => handleReassignmentAction(request._id, 'approve')}
                    className="px-3 py-2 bg-green-50 text-green-600 rounded-md text-sm font-medium hover:bg-green-100"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => handleReassignmentAction(request._id, 'reject')}
                    className="px-3 py-2 bg-red-50 text-red-600 rounded-md text-sm font-medium hover:bg-red-100"
                  >
                    Reject
                  </button>
                </div>
              </div>
            </div>
          ))}

          {(!Array.isArray(reassignmentRequests) || reassignmentRequests.length === 0) && (
            <div className="p-6 text-center text-gray-500 dark:text-neutral-400">
              No pending reassignment requests
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChefWorkloadDashboard;