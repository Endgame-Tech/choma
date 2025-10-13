import React, { useState, useEffect } from 'react';
import { useCachedApi } from '../../hooks/useCachedApi';
import { CACHE_DURATIONS } from '../../services/cacheService';
import { api } from '../../services/api';

interface DeliveryStatus {
  _id: string;
  subscriptionId: string;
  customerName: string;
  customerPhone: string;
  mealTitle: string;
  mealImage: string;
  chefName: string;
  chefPhone: string;
  driverName?: string;
  driverPhone?: string;
  status: 'scheduled' | 'chef_assigned' | 'preparing' | 'ready' | 'out_for_delivery' | 'delivered' | 'failed';
  scheduledDate: Date;
  scheduledTimeSlot: {
    start: string;
    end: string;
  };
  deliveryAddress: string;
  coordinates: {
    lat: number;
    lng: number;
  };
  estimatedReadyTime?: Date;
  actualDeliveryTime?: Date;
  isOverdue: boolean;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  timeline: {
    status: string;
    timestamp: Date;
    notes?: string;
    updatedBy: string;
  }[];
}

interface DeliveryStats {
  total: number;
  scheduled: number;
  preparing: number;
  ready: number;
  outForDelivery: number;
  delivered: number;
  failed: number;
  overdue: number;
  onTime: number;
  averageDeliveryTime: number;
}

const DeliveryMonitoringDashboard: React.FC = () => {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [areaFilter, setAreaFilter] = useState<string>('all');
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Fetch delivery data with auto-refresh
  const {
    data: deliveries,
    loading: deliveriesLoading,
    refetch: refetchDeliveries
  } = useCachedApi(
    () => Promise.resolve(api.get<DeliveryStatus[]>(`/deliveries/monitor?date=${selectedDate}&status=${statusFilter}&area=${areaFilter}`))
      .then(res => ({ data: res.data, status: res.status })),
    {
      cacheKey: `delivery-monitor-${selectedDate}-${statusFilter}-${areaFilter}`,
      cacheDuration: CACHE_DURATIONS.ORDERS,
      immediate: true
    }
  );

  // Fetch delivery statistics
  const {
    data: stats,
    loading: statsLoading,
    refetch: refetchStats
  } = useCachedApi(
    () => Promise.resolve(api.get<DeliveryStats>(`/deliveries/stats?date=${selectedDate}`))
      .then(res => ({ data: res.data, status: res.status })),
    {
      cacheKey: `delivery-stats-${selectedDate}`,
      cacheDuration: CACHE_DURATIONS.ORDERS,
      immediate: true
    }
  );

  // Auto-refresh every 30 seconds
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      refetchDeliveries();
      refetchStats();
    }, 30000);

    return () => clearInterval(interval);
  }, [autoRefresh, refetchDeliveries, refetchStats]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled': return 'bg-gray-100 text-gray-800';
      case 'chef_assigned': return 'bg-blue-100 text-blue-800';
      case 'preparing': return 'bg-yellow-100 text-yellow-800';
      case 'ready': return 'bg-green-100 text-green-800';
      case 'out_for_delivery': return 'bg-purple-100 text-purple-800';
      case 'delivered': return 'bg-emerald-100 text-emerald-800';
      case 'failed': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'scheduled': return '📅';
      case 'chef_assigned': return '👨‍🍳';
      case 'preparing': return '🍳';
      case 'ready': return '✅';
      case 'out_for_delivery': return '🚚';
      case 'delivered': return '✨';
      case 'failed': return '❌';
      default: return '⏳';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'border-l-red-500';
      case 'high': return 'border-l-orange-500';
      case 'normal': return 'border-l-blue-500';
      case 'low': return 'border-l-gray-500';
      default: return 'border-l-gray-500';
    }
  };

  const formatTimeSlot = (timeSlot: { start: string; end: string } | null | undefined) => {
    if (!timeSlot) return 'Unknown time';
    return `${timeSlot.start} - ${timeSlot.end}`;
  };

  const formatDuration = (minutes: number) => {
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  if (deliveriesLoading && statsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg text-gray-600 dark:text-neutral-200">Loading delivery data...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-neutral-100">
            Real-time Delivery Monitoring
          </h2>
          <p className="text-gray-600 dark:text-neutral-200">
            Track all subscription deliveries in real-time
          </p>
        </div>

        {/* Controls */}
        <div className="flex gap-3 items-center">
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm"
            title="Select date"
          />

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm"
            aria-label="Status Filter"
          >
            <option value="all">All Status</option>
            <option value="scheduled">Scheduled</option>
            <option value="preparing">Preparing</option>
            <option value="ready">Ready</option>
            <option value="out_for_delivery">Out for Delivery</option>
            <option value="overdue">Overdue</option>
          </select>

          <select
            value={areaFilter}
            onChange={(e) => setAreaFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm"
            aria-label="Area Filter"
          >
            <option value="all">All Areas</option>
            <option value="lagos-island">Lagos Island</option>
            <option value="mainland">Mainland</option>
            <option value="ikoyi">Ikoyi</option>
            <option value="victoria-island">Victoria Island</option>
          </select>

          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`px-3 py-2 rounded-md text-sm font-medium ${autoRefresh
                ? 'bg-green-50 text-green-600 border border-green-200'
                : 'bg-gray-50 text-gray-600 border border-gray-200'
              }`}
          >
            {autoRefresh ? '🔄 Auto-refresh ON' : '⏸️ Auto-refresh OFF'}
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-8 gap-4">
        <div className="bg-white dark:bg-neutral-800 p-4 rounded-lg shadow-sm border">
          <div className="text-2xl font-bold text-gray-900 dark:text-neutral-100">
            {stats?.total || 0}
          </div>
          <div className="text-sm text-gray-600 dark:text-neutral-200">Total</div>
        </div>

        <div className="bg-white dark:bg-neutral-800 p-4 rounded-lg shadow-sm border">
          <div className="text-2xl font-bold text-yellow-600">
            {stats?.preparing || 0}
          </div>
          <div className="text-sm text-gray-600 dark:text-neutral-200">Preparing</div>
        </div>

        <div className="bg-white dark:bg-neutral-800 p-4 rounded-lg shadow-sm border">
          <div className="text-2xl font-bold text-green-600">
            {stats?.ready || 0}
          </div>
          <div className="text-sm text-gray-600 dark:text-neutral-200">Ready</div>
        </div>

        <div className="bg-white dark:bg-neutral-800 p-4 rounded-lg shadow-sm border">
          <div className="text-2xl font-bold text-purple-600">
            {stats?.outForDelivery || 0}
          </div>
          <div className="text-sm text-gray-600 dark:text-neutral-200">Out for Delivery</div>
        </div>

        <div className="bg-white dark:bg-neutral-800 p-4 rounded-lg shadow-sm border">
          <div className="text-2xl font-bold text-emerald-600">
            {stats?.delivered || 0}
          </div>
          <div className="text-sm text-gray-600 dark:text-neutral-200">Delivered</div>
        </div>

        <div className="bg-white dark:bg-neutral-800 p-4 rounded-lg shadow-sm border">
          <div className="text-2xl font-bold text-red-600">
            {stats?.overdue || 0}
          </div>
          <div className="text-sm text-gray-600 dark:text-neutral-200">Overdue</div>
        </div>

        <div className="bg-white dark:bg-neutral-800 p-4 rounded-lg shadow-sm border">
          <div className="text-2xl font-bold text-blue-600">
            {stats?.total && stats.onTime ? Math.round((stats.onTime / stats.total) * 100) : 0}%
          </div>
          <div className="text-sm text-gray-600 dark:text-neutral-200">On Time</div>
        </div>

        <div className="bg-white dark:bg-neutral-800 p-4 rounded-lg shadow-sm border">
          <div className="text-2xl font-bold text-indigo-600">
            {stats?.averageDeliveryTime ? formatDuration(stats.averageDeliveryTime) : '-'}
          </div>
          <div className="text-sm text-gray-600 dark:text-neutral-200">Avg Time</div>
        </div>
      </div>

      {/* Deliveries List */}
      <div className="bg-white dark:bg-neutral-800 rounded-lg shadow-sm border border-gray-200 dark:border-neutral-700">
        <div className="p-6 border-b border-gray-200 dark:border-neutral-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-neutral-100">
            Live Deliveries ({Array.isArray(deliveries) ? deliveries.length : 0})
          </h3>
        </div>

        <div className="divide-y divide-gray-200 dark:divide-neutral-700 max-h-96 overflow-y-auto">
          {Array.isArray(deliveries) && deliveries.length > 0 ? deliveries.map((delivery, index) => (
            <div
              key={delivery?._id || `delivery-${index}`}
              className={`p-6 border-l-4 ${getPriorityColor(delivery?.priority || 'medium')} ${delivery?.isOverdue ? 'bg-red-50 dark:bg-red-900/20' : ''
                }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <img
                      src={delivery?.mealImage || '/default-meal.jpg'}
                      alt={delivery?.mealTitle || 'Meal'}
                      className="w-12 h-12 rounded-lg object-cover"
                    />
                    <div>
                      <h4 className="font-medium text-gray-900 dark:text-neutral-100">
                        {delivery?.mealTitle || 'Unknown Meal'}
                      </h4>
                      <p className="text-sm text-gray-600 dark:text-neutral-200">
                        {delivery?.customerName || 'Unknown Customer'} • {delivery?.deliveryAddress || 'Unknown Address'}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-sm mb-3">
                    <div>
                      <span className="text-gray-600 dark:text-neutral-200">Chef:</span>
                      <span className="font-medium ml-1">{delivery?.chefName || 'Unknown Chef'}</span>
                    </div>
                    <div>
                      <span className="text-gray-600 dark:text-neutral-200">Time Slot:</span>
                      <span className="font-medium ml-1">{formatTimeSlot(delivery?.scheduledTimeSlot)}</span>
                    </div>
                    {delivery?.driverName && (
                      <div>
                        <span className="text-gray-600 dark:text-neutral-200">Driver:</span>
                        <span className="font-medium ml-1">{delivery?.driverName}</span>
                      </div>
                    )}
                    {delivery?.estimatedReadyTime && (
                      <div>
                        <span className="text-gray-600 dark:text-neutral-200">Est. Ready:</span>
                        <span className="font-medium ml-1">
                          {new Date(delivery?.estimatedReadyTime).toLocaleTimeString('en-US', {
                            hour: 'numeric',
                            minute: '2-digit'
                          })}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Timeline */}
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    {Array.isArray(delivery?.timeline) && delivery.timeline.length > 0 ? delivery.timeline.slice(-3).map((event: { status: string; timestamp: Date; notes?: string; updatedBy: string; }, index: number) => (
                      <div key={index} className="flex items-center gap-1">
                        <span>{getStatusIcon(event?.status || 'unknown')}</span>
                        <span>{new Date(event?.timestamp || new Date()).toLocaleTimeString('en-US', {
                          hour: 'numeric',
                          minute: '2-digit'
                        })}</span>
                        {index < delivery.timeline.slice(-3).length - 1 && <span>→</span>}
                      </div>
                    )) : (
                      <span className="text-gray-400">No timeline available</span>
                    )}
                  </div>
                </div>

                <div className="text-right">
                  <span
                    className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(
                      delivery?.status || 'unknown'
                    )}`}
                  >
                    {getStatusIcon(delivery?.status || 'unknown')} {(delivery?.status || 'unknown').replace('_', ' ')}
                  </span>
                  {delivery?.isOverdue && (
                    <div className="mt-2">
                      <span className="inline-block px-2 py-1 bg-red-100 text-red-800 text-xs rounded-full font-medium">
                        OVERDUE
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )) : (
            <div className="p-6 text-center text-gray-500 dark:text-neutral-400">
              {deliveriesLoading ? 'Loading deliveries...' : 'No deliveries found for selected filters'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DeliveryMonitoringDashboard;