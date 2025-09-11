import React, { useState, useEffect } from 'react';
import { 
  Clock, 
  User,
  MapPin,
  Phone,
  Package,
  RefreshCw,
  AlertTriangle,
  Route,
  CheckCircle,
} from 'lucide-react';

interface Customer {
  _id: string;
  fullName: string;
  phone: string;
  email: string;
  address: string;
}

interface Subscription {
  _id: string;
  frequency: string;
  dietaryPreferences: string[];
  allergens: string[];
}

interface Delivery {
  _id: string;
  scheduledDate: string;
  status: string;
  mealAssignment: {
    assignmentId: string;
    mealTime: string;
    customTitle: string;
  };
  payment: {
    amount: number;
    status: string;
  };
  deliveryInfo: {
    address: string;
    estimatedDeliveryTime: string;
  };
  estimatedDuration: number;
}

interface DeliveryGroup {
  customer: Customer;
  subscription: Subscription;
  deliveries: Delivery[];
  relationshipScore: number;
  totalEarnings: number;
}

interface ApiResponse {
  success: boolean;
  data: {
    deliveryGroups: DeliveryGroup[];
    totalDeliveries: number;
    totalCustomers: number;
  };
}

interface RouteResponse {
  success: boolean;
  data: {
    deliveries: Array<Delivery & {
      routeOrder: number;
      estimatedArrival: string;
      distanceFromPrevious: number;
    }>;
    totalDeliveries: number;
    estimatedDuration: number;
    totalDistance: number;
  };
}

const NextDeliveries: React.FC = () => {
  const [deliveryGroups, setDeliveryGroups] = useState<DeliveryGroup[]>([]);
  const [optimizedRoute, setOptimizedRoute] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTimeframe, setSelectedTimeframe] = useState(7);
  const [showRouteOptimization, setShowRouteOptimization] = useState(false);
  const [, setStatusUpdate] = useState<{deliveryId: string, status: string, notes: string}>({
    deliveryId: '',
    status: '',
    notes: ''
  });

  useEffect(() => {
    fetchNextDeliveries();
  }, [selectedTimeframe]);

  const fetchNextDeliveries = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/unified-subscriptions/driver/next-deliveries?days=${selectedTimeframe}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('driverToken')}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: ApiResponse = await response.json();

      if (data.success) {
        setDeliveryGroups(data.data.deliveryGroups);
      } else {
        throw new Error('Failed to fetch next deliveries');
      }

    } catch (err: any) {
      console.error('Error fetching next deliveries:', err);
      setError(err.message || 'Failed to load delivery data');
    } finally {
      setLoading(false);
    }
  };

  const fetchOptimizedRoute = async (date: string = new Date().toISOString().split('T')[0]) => {
    try {
      const response = await fetch(`/api/unified-subscriptions/driver/optimized-route?date=${date}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('driverToken')}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: RouteResponse = await response.json();

      if (data.success) {
        setOptimizedRoute(data.data);
        setShowRouteOptimization(true);
      } else {
        throw new Error('Failed to fetch optimized route');
      }

    } catch (err: any) {
      console.error('Error fetching optimized route:', err);
      setError(err.message || 'Failed to load route optimization');
    }
  };

  const updateDeliveryStatus = async (deliveryId: string, status: string, notes: string = '', location?: {lat: number, lng: number}) => {
    try {
      const response = await fetch(`/api/unified-subscriptions/driver/delivery-status/${deliveryId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('driverToken')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status, notes, location })
      });

      if (response.ok) {
        // Refresh data
        await fetchNextDeliveries();
        setStatusUpdate({deliveryId: '', status: '', notes: ''});
      } else {
        throw new Error('Failed to update delivery status');
      }
    } catch (err: any) {
      console.error('Error updating delivery status:', err);
      setError(err.message || 'Failed to update status');
    }
  };

  const getRelationshipColor = (score: number) => {
    if (score >= 80) return 'text-green-600 bg-green-50 border-green-200';
    if (score >= 60) return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    return 'text-red-600 bg-red-50 border-red-200';
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'ready':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'out_for_delivery':
        return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'delivered':
        return 'text-gray-600 bg-gray-50 border-gray-200';
      case 'assigned':
        return 'text-purple-600 bg-purple-50 border-purple-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (date.toDateString() === today.toDateString()) {
      return `Today at ${date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`;
    } else if (date.toDateString() === tomorrow.toDateString()) {
      return `Tomorrow at ${date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`;
    } else {
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin text-blue-500 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-300">Loading your next deliveries...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
        <div className="flex items-center">
          <AlertTriangle className="h-5 w-5 text-red-500 mr-2" />
          <p className="text-red-700 dark:text-red-400">{error}</p>
          <button 
            onClick={() => fetchNextDeliveries()}
            className="ml-auto text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
            aria-label="Refresh"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  }

  if (showRouteOptimization && optimizedRoute) {
    return (
      <div className="space-y-6">
        {/* Route Optimization Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Optimized Route</h2>
            <p className="text-gray-600 dark:text-gray-300">
              {optimizedRoute.totalDeliveries} deliveries • {optimizedRoute.estimatedDuration} min • {optimizedRoute.totalDistance.toFixed(1)} km
            </p>
          </div>
          <button
            onClick={() => setShowRouteOptimization(false)}
            className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
          >
            Back to List
          </button>
        </div>

        {/* Route Cards */}
        <div className="space-y-4">
          {optimizedRoute.deliveries.map((delivery: any, index: number) => (
            <div key={delivery._id} className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">
                    {delivery.routeOrder}
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">
                      {delivery.customerId?.fullName}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {delivery.deliveryInfo?.address}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    ETA: {formatDateTime(delivery.estimatedArrival)}
                  </p>
                  {index > 0 && (
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {delivery.distanceFromPrevious.toFixed(1)} km from previous
                    </p>
                  )}
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between">
                <span className={`px-2 py-1 text-xs rounded-full border ${getStatusColor(delivery.status)}`}>
                  {delivery.status.replace('_', ' ')}
                </span>

                <div className="flex space-x-2">
                  {delivery.status === 'ready' && (
                    <button
                      onClick={() => updateDeliveryStatus(delivery._id, 'picked_up', 'Food picked up from chef')}
                      className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
                    >
                      Mark Picked Up
                    </button>
                  )}
                  {delivery.status === 'picked_up' && (
                    <button
                      onClick={() => updateDeliveryStatus(delivery._id, 'out_for_delivery', 'On the way to customer')}
                      className="px-3 py-1 text-xs bg-orange-600 text-white rounded hover:bg-orange-700"
                    >
                      Start Delivery
                    </button>
                  )}
                  {delivery.status === 'out_for_delivery' && (
                    <button
                      onClick={() => updateDeliveryStatus(delivery._id, 'delivered', 'Successfully delivered')}
                      className="px-3 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700"
                    >
                      Mark Delivered
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Next Deliveries</h2>
          <p className="text-gray-600 dark:text-gray-300">
            {deliveryGroups.length} customers • 
            {deliveryGroups.reduce((sum, group) => sum + group.deliveries.length, 0)} total deliveries
          </p>
        </div>

        <div className="flex items-center space-x-4">
          <select
            value={selectedTimeframe}
            onChange={(e) => setSelectedTimeframe(parseInt(e.target.value))}
            className="border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value={1}>Next 1 day</option>
            <option value={3}>Next 3 days</option>
            <option value={7}>Next 7 days</option>
            <option value={14}>Next 14 days</option>
          </select>

          <button 
            onClick={() => fetchOptimizedRoute()}
            className="flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
          >
            <Route className="h-4 w-4 mr-2" />
            Optimize Route
          </button>

          <button 
            onClick={() => fetchNextDeliveries()}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </button>
        </div>
      </div>

      {deliveryGroups.length === 0 ? (
        <div className="text-center py-12">
          <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No upcoming deliveries</h3>
          <p className="text-gray-600 dark:text-gray-300">
            You don't have any delivery assignments scheduled for the selected timeframe.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {deliveryGroups.map((group) => (
            <div key={`${group.customer._id}_${group.subscription._id}`} className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
              {/* Customer Header */}
              <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="flex-shrink-0">
                      <User className="h-8 w-8 text-gray-400" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        {group.customer.fullName}
                      </h3>
                      <div className="flex items-center mt-1">
                        <MapPin className="h-3 w-3 text-gray-400 mr-1" />
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {group.customer.address}
                        </p>
                      </div>
                      <div className="flex items-center mt-1">
                        <Phone className="h-3 w-3 text-gray-400 mr-1" />
                        <a 
                          href={`tel:${group.customer.phone}`}
                          className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                        >
                          {group.customer.phone}
                        </a>
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className={`inline-flex px-2 py-1 text-xs rounded-full border ${getRelationshipColor(group.relationshipScore)}`}>
                      Relationship: {group.relationshipScore}%
                    </div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white mt-1">
                      Earnings: {formatCurrency(group.totalEarnings)}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {group.subscription.frequency} delivery
                    </p>
                  </div>
                </div>
              </div>

              {/* Deliveries */}
              <div className="p-6">
                <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-4">
                  Upcoming Deliveries ({group.deliveries.length})
                </h4>
                
                <div className="space-y-3">
                  {group.deliveries.map((delivery) => (
                    <div 
                      key={delivery._id}
                      className="p-4 rounded-lg border border-gray-200 dark:border-gray-600"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">
                            {delivery.mealAssignment.customTitle || 
                             `${delivery.mealAssignment.mealTime.charAt(0).toUpperCase() + delivery.mealAssignment.mealTime.slice(1)}`}
                          </p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {formatDateTime(delivery.scheduledDate)}
                          </p>
                        </div>

                        <div className="text-right">
                          <span className={`px-2 py-1 text-xs rounded-full border ${getStatusColor(delivery.status)}`}>
                            {delivery.status.replace('_', ' ')}
                          </span>
                          <p className="text-sm font-medium text-gray-900 dark:text-white mt-1">
                            {formatCurrency(delivery.payment.amount)}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div className="flex items-center space-x-1">
                            <Clock className="h-4 w-4 text-gray-400" />
                            <span className="text-sm text-gray-600 dark:text-gray-400">
                              ~{delivery.estimatedDuration}min
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center space-x-2">
                          {delivery.status === 'ready' && (
                            <button
                              onClick={() => updateDeliveryStatus(delivery._id, 'picked_up', 'Food picked up from chef')}
                              className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
                            >
                              Pick Up
                            </button>
                          )}
                          
                          {delivery.status === 'picked_up' && (
                            <button
                              onClick={() => updateDeliveryStatus(delivery._id, 'out_for_delivery', 'On the way to customer')}
                              className="px-3 py-1 text-xs bg-orange-600 text-white rounded hover:bg-orange-700"
                            >
                              Start Delivery
                            </button>
                          )}

                          {delivery.status === 'out_for_delivery' && (
                            <button
                              onClick={() => updateDeliveryStatus(delivery._id, 'delivered', 'Successfully delivered')}
                              className="px-3 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700"
                            >
                              Mark Delivered
                            </button>
                          )}

                          {delivery.status === 'delivered' && (
                            <div className="flex items-center space-x-1">
                              <CheckCircle className="h-4 w-4 text-green-500" />
                              <span className="text-xs text-green-600">Delivered</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default NextDeliveries;