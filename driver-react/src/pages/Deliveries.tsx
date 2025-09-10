import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useDelivery } from '../contexts/DeliveryContext';
import { DeliveryAssignment } from '../types';
import { 
  TruckIcon,
  MapPinIcon,
  ClockIcon,
  CurrencyDollarIcon,
  FunnelIcon,
  MagnifyingGlassIcon,
  ChevronRightIcon
} from '@heroicons/react/24/outline';

type DeliveryStatus = 'all' | 'available' | 'assigned' | 'picked_up' | 'delivered' | 'cancelled';

const Deliveries: React.FC = () => {
  const { assignments, loading, error, refreshAssignments } = useDelivery();
  const [filteredAssignments, setFilteredAssignments] = useState<DeliveryAssignment[]>([]);
  const [statusFilter, setStatusFilter] = useState<DeliveryStatus>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'date' | 'distance' | 'earning'>('date');

  // Filter and sort assignments
  useEffect(() => {
    let filtered = assignments;

    // Filter by status
    if (statusFilter !== 'all') {
      filtered = filtered.filter(assignment => assignment.status === statusFilter);
    }

    // Filter by search term
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(assignment =>
        assignment.pickupLocation.chefName.toLowerCase().includes(term) ||
        assignment.deliveryLocation.area.toLowerCase().includes(term) ||
        assignment.deliveryLocation.address.toLowerCase().includes(term) ||
        assignment._id.toLowerCase().includes(term)
      );
    }

    // Sort assignments
    filtered = [...filtered].sort((a, b) => {
      switch (sortBy) {
        case 'date':
          return new Date(b.estimatedPickupTime).getTime() - new Date(a.estimatedPickupTime).getTime();
        case 'distance':
          return a.totalDistance - b.totalDistance;
        case 'earning':
          return b.totalEarning - a.totalEarning;
        default:
          return 0;
      }
    });

    setFilteredAssignments(filtered);
  }, [assignments, statusFilter, searchTerm, sortBy]);

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

  const formatDate = (timeString: string) => {
    return new Date(timeString).toLocaleDateString('en-NG', {
      month: 'short',
      day: 'numeric'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available':
        return 'bg-green-100 text-green-800';
      case 'assigned':
        return 'bg-choma-orange/20 text-choma-brown';
      case 'picked_up':
        return 'bg-yellow-100 text-yellow-800';
      case 'delivered':
        return 'bg-choma-brown/20 text-choma-brown';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusCounts = () => {
    return {
      all: assignments.length,
      available: assignments.filter(a => a.status === 'available').length,
      assigned: assignments.filter(a => a.status === 'assigned').length,
      picked_up: assignments.filter(a => a.status === 'picked_up').length,
      delivered: assignments.filter(a => a.status === 'delivered').length,
      cancelled: assignments.filter(a => a.status === 'cancelled').length,
    };
  };

  const statusCounts = getStatusCounts();

  if (loading) {
    return (
      <div className="choma-card">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin p-4 bg-choma-orange/10 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
              <TruckIcon className="h-8 w-8 text-choma-orange" />
            </div>
            <div className="text-lg text-gray-600 font-medium"><i className="fi fi-rr-refresh"></i> Loading deliveries...</div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="choma-card p-6">
        <div className="text-center">
          <div className="p-4 bg-red-100 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
            <TruckIcon className="h-8 w-8 text-red-600" />
          </div>
          <h3 className="text-red-800 font-semibold text-lg mb-2"><i className="fi fi-rr-cross-circle"></i> Error loading deliveries</h3>
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={refreshAssignments}
            className="px-6 py-3 bg-red-500 hover:bg-red-600 text-white font-semibold rounded-xl transition-all duration-300 transform hover:scale-105"
          >
            <i className="fi fi-rr-refresh"></i> Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="choma-card p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center space-x-3">
              <TruckIcon className="h-8 w-8 text-choma-orange" />
              <span>Deliveries</span>
            </h1>
            <p className="text-gray-600 mt-2">Manage and track your delivery assignments</p>
          </div>
          <button
            onClick={refreshAssignments}
            className="px-6 py-3 bg-choma-brown text-choma-white text-sm font-semibold rounded-xl hover:shadow-lg hover:shadow-choma-orange/25 transition-all duration-300 transform hover:scale-105"
          >
            <i className="fi fi-rr-refresh"></i> Refresh
          </button>
        </div>
      </div>

      {/* Status Filter Pills */}
      <div className="choma-card p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Filter by Status</h3>
        <div className="flex flex-wrap gap-3">
          {([
            { key: 'all', label: 'All', icon: 'fi-rr-clipboard-list', count: statusCounts.all },
            { key: 'available', label: 'Available', icon: 'fi-rr-circle-solid text-green-500', count: statusCounts.available },
            { key: 'assigned', label: 'Assigned', icon: 'fi-rr-refresh', count: statusCounts.assigned },
            { key: 'picked_up', label: 'Picked Up', icon: 'fi-rr-box', count: statusCounts.picked_up },
            { key: 'delivered', label: 'Delivered', icon: 'fi-rr-check-circle', count: statusCounts.delivered },
            { key: 'cancelled', label: 'Cancelled', icon: 'fi-rr-cross-circle', count: statusCounts.cancelled },
          ] as { key: DeliveryStatus; label: string; icon: string; count: number }[]).map((filter) => (
            <button
              key={filter.key}
              onClick={() => setStatusFilter(filter.key)}
              className={`px-4 py-3 text-sm font-semibold rounded-xl transition-all duration-300 transform hover:scale-105 ${
                statusFilter === filter.key
                  ? 'bg-choma-brown text-choma-white shadow-lg'
                  : 'bg-gray-100 text-gray-700 hover:bg-choma-orange/10 hover:text-choma-brown'
              }`}
            >
              <i className={`fi ${filter.icon}`}></i> {filter.label} ({filter.count})
            </button>
          ))}
        </div>
      </div>

      {/* Search and Sort */}
      <div className="choma-card p-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <MagnifyingGlassIcon className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by chef, location, or assignment ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-choma-orange focus:border-choma-orange transition-all duration-300 bg-gray-50 hover:bg-white"
            />
          </div>
          
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-choma-orange/10 rounded-lg">
              <FunnelIcon className="h-5 w-5 text-choma-orange" />
            </div>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'date' | 'distance' | 'earning')}
              className="px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-choma-orange focus:border-choma-orange font-medium bg-gray-50 hover:bg-white transition-all duration-300"
            >
              <option value="date"><i className="fi fi-rr-calendar"></i> Sort by Date</option>
              <option value="distance"><i className="fi fi-rr-marker"></i> Sort by Distance</option>
              <option value="earning"><i className="fi fi-rr-sack-dollar"></i> Sort by Earning</option>
            </select>
          </div>
        </div>
      </div>

      {/* Deliveries List */}
      <div className="choma-card">
        {filteredAssignments.length === 0 ? (
          <div className="text-center py-16">
            <div className="p-6 bg-choma-orange/10 rounded-full w-24 h-24 mx-auto mb-6 flex items-center justify-center">
              <TruckIcon className="h-12 w-12 text-choma-orange" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-3">No deliveries found</h3>
            <p className="text-gray-600">
              {searchTerm || statusFilter !== 'all'
                ? '<i className="fi fi-rr-search"></i> Try adjusting your search or filter criteria.'
                : '<i className="fi fi-rr-truck-side"></i> New delivery assignments will appear here when available.'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filteredAssignments.map((assignment) => (
              <Link
                key={assignment._id}
                to={`/deliveries/${assignment._id}`}
                className="block hover:bg-gradient-to-r hover:from-choma-orange/5 hover:to-choma-brown/5 transition-all duration-300 transform hover:scale-[1.02]"
              >
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <span className={`px-3 py-1 text-xs font-bold rounded-full ${getStatusColor(assignment.status)}`}>
                        {assignment.status.replace('_', ' ').toUpperCase()}
                      </span>
                      {assignment.priority === 'urgent' && (
                        <span className="px-3 py-1 text-xs font-bold bg-red-100 text-red-800 rounded-full animate-pulse">
                          <i className="fi fi-rr-siren"></i> URGENT
                        </span>
                      )}
                      <span className="text-sm text-gray-500 font-medium">
                        <i className="fi fi-rr-id-badge"></i> {assignment._id.slice(-8)}
                      </span>
                    </div>
                    
                    <div className="flex items-center space-x-3">
                      <span className="font-bold text-green-600 text-lg">
                        {formatCurrency(assignment.totalEarning)}
                      </span>
                      <ChevronRightIcon className="h-5 w-5 text-choma-orange" />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    {/* Pickup Location */}
                    <div>
                      <p className="text-sm font-medium text-gray-700 mb-1">Pickup</p>
                      <div className="flex items-start space-x-2">
                        <MapPinIcon className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {assignment.pickupLocation.chefName}
                          </p>
                          <p className="text-sm text-gray-600 line-clamp-1">
                            {assignment.pickupLocation.address}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Delivery Location */}
                    <div>
                      <p className="text-sm font-medium text-gray-700 mb-1">Delivery</p>
                      <div className="flex items-start space-x-2">
                        <MapPinIcon className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {assignment.deliveryLocation.area}
                          </p>
                          <p className="text-sm text-gray-600 line-clamp-1">
                            {assignment.deliveryLocation.address}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Time and Distance Info */}
                  <div className="flex items-center justify-between text-sm text-gray-600">
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center space-x-2 px-2 py-1 bg-gray-50 rounded-lg">
                        <ClockIcon className="h-4 w-4 text-choma-orange" />
                        <span className="font-medium">
                          <i className="fi fi-rr-calendar"></i> {formatDate(assignment.estimatedPickupTime)} <i className="fi fi-rr-clock"></i> {formatTime(assignment.estimatedPickupTime)}
                        </span>
                      </div>
                      
                      <div className="flex items-center space-x-2 px-2 py-1 bg-gray-50 rounded-lg">
                        <MapPinIcon className="h-4 w-4 text-choma-brown" />
                        <span className="font-medium"><i className="fi fi-rr-marker"></i> {assignment.totalDistance.toFixed(1)} km</span>
                      </div>
                    </div>

                    <div className="text-right px-3 py-1 bg-choma-orange/10 rounded-lg">
                      <p className="font-bold text-choma-brown">
                        <i className="fi fi-rr-stopwatch"></i> {assignment.estimatedDuration} min
                      </p>
                    </div>
                  </div>

                  {/* Special Instructions Preview */}
                  {assignment.specialInstructions && (
                    <div className="mt-4 p-3 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-xl border-l-4 border-choma-orange">
                      <p className="line-clamp-2 text-sm text-choma-brown">
                        <strong className="text-choma-orange"><i className="fi fi-rr-file-pen"></i> Note:</strong> {assignment.specialInstructions}
                      </p>
                    </div>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Summary Stats */}
      {filteredAssignments.length > 0 && (
        <div className="choma-card p-6">
          <h3 className="text-xl font-semibold text-gray-900 mb-6 flex items-center space-x-2">
            <CurrencyDollarIcon className="h-6 w-6 text-choma-orange" />
            <span>Summary</span>
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center p-4 bg-gradient-to-br from-choma-orange/10 to-choma-brown/5 rounded-xl hover:shadow-lg transition-all duration-300">
              <p className="text-3xl font-bold text-choma-orange">
                {filteredAssignments.length}
              </p>
              <p className="text-sm text-gray-600 font-medium mt-2">
                {statusFilter === 'all' ? '<i className="fi fi-rr-clipboard-list"></i> Total Assignments' : `${statusFilter.replace('_', ' ')} Assignments`}
              </p>
            </div>
            
            <div className="text-center p-4 bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl hover:shadow-lg transition-all duration-300">
              <p className="text-3xl font-bold text-green-600">
                {formatCurrency(filteredAssignments.reduce((sum, a) => sum + a.totalEarning, 0))}
              </p>
              <p className="text-sm text-gray-600 font-medium mt-2"><i className="fi fi-rr-sack-dollar"></i> Total Earnings</p>
            </div>
            
            <div className="text-center p-4 bg-gradient-to-br from-choma-brown/10 to-choma-orange/5 rounded-xl hover:shadow-lg transition-all duration-300">
              <p className="text-3xl font-bold text-choma-brown">
                {filteredAssignments.reduce((sum, a) => sum + a.totalDistance, 0).toFixed(1)} km
              </p>
              <p className="text-sm text-gray-600 font-medium mt-2"><i className="fi fi-rr-marker"></i> Total Distance</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Deliveries;