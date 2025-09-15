import React, { useState, useEffect, useMemo } from 'react';
import { 
  AlertTriangle,
  Clock,
  CheckCircle,
  XCircle,
  Pause,
  Play,
  SkipForward,
  Settings,
  ChefHat,
  Eye,
  Filter,
  Search,
  Calendar,
  MapPin,
  Phone,
  Mail,
  Star,
  TrendingUp,
  Users,
  Package
} from 'lucide-react';
import { subscriptionManagementApi } from '../services/subscriptionManagementApi';
import ChefReassignmentModal from '../components/subscription-management/ChefReassignmentModal';
import SubscriptionDetailsModal from '../components/subscription-management/SubscriptionDetailsModal';
import TimelineModal from '../components/subscription-management/TimelineModal';

// Types
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

interface ChefReassignmentRequest {
  _id: string;
  subscriptionId: string;
  customerId: string;
  customerName: string;
  currentChefId: string;
  currentChefName: string;
  reason: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  requestedAt: string;
  status: 'pending' | 'approved' | 'rejected' | 'completed';
  adminNotes?: string;
}

const SubscriptionManagement: React.FC = () => {
  // State
  const [subscriptions, setSubscriptions] = useState<SubscriptionOverview[]>([]);
  const [reassignmentRequests, setReassignmentRequests] = useState<ChefReassignmentRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'active' | 'paused' | 'issues'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSubscription, setSelectedSubscription] = useState<SubscriptionOverview | null>(null);
  
  // Modal states
  const [showChefReassignmentModal, setShowChefReassignmentModal] = useState(false);
  const [showSubscriptionDetailsModal, setShowSubscriptionDetailsModal] = useState(false);
  const [showTimelineModal, setShowTimelineModal] = useState(false);
  
  // Statistics
  const [stats, setStats] = useState({
    totalSubscriptions: 0,
    activeSubscriptions: 0,
    pausedSubscriptions: 0,
    pendingRequests: 0,
    issuesRequiringAttention: 0
  });

  // Load data
  useEffect(() => {
    loadSubscriptions();
    loadReassignmentRequests();
    loadStats();
  }, []);

  const loadSubscriptions = async () => {
    try {
      setLoading(true);
      const response = await subscriptionManagementApi.getAllSubscriptions();
      if (response.success) {
        setSubscriptions(response.data);
      }
    } catch (error) {
      console.error('Failed to load subscriptions:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadReassignmentRequests = async () => {
    try {
      const response = await subscriptionManagementApi.getChefReassignmentRequests();
      if (response.success) {
        setReassignmentRequests(response.data);
      }
    } catch (error) {
      console.error('Failed to load reassignment requests:', error);
    }
  };

  const loadStats = async () => {
    try {
      const response = await subscriptionManagementApi.getSubscriptionStats();
      if (response.success) {
        setStats(response.data);
      }
    } catch (error) {
      console.error('Failed to load stats:', error);
    }
  };

  // Filter and search subscriptions
  const filteredSubscriptions = useMemo(() => {
    let filtered = subscriptions;

    // Apply status filter
    if (filter !== 'all') {
      if (filter === 'issues') {
        filtered = filtered.filter(sub => 
          (sub.issues?.pendingReassignmentRequests || 0) > 0 ||
          (sub.issues?.customerComplaints || 0) > 0 ||
          sub.status === 'paused'
        );
      } else {
        filtered = filtered.filter(sub => sub.status === filter);
      }
    }

    // Apply search filter
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(sub =>
        sub.userId.fullName.toLowerCase().includes(search) ||
        sub.userId.email.toLowerCase().includes(search) ||
        sub.subscriptionId.toLowerCase().includes(search) ||
        sub.mealPlanId.planName.toLowerCase().includes(search)
      );
    }

    return filtered;
  }, [subscriptions, filter, searchTerm]);

  // Admin actions
  const handlePauseSubscription = async (subscriptionId: string) => {
    try {
      const response = await subscriptionManagementApi.adminPauseSubscription(subscriptionId, 'Admin override');
      if (response.success) {
        loadSubscriptions();
        alert('Subscription paused successfully');
      }
    } catch (error) {
      console.error('Failed to pause subscription:', error);
      alert('Failed to pause subscription');
    }
  };

  const handleResumeSubscription = async (subscriptionId: string) => {
    try {
      const response = await subscriptionManagementApi.adminResumeSubscription(subscriptionId);
      if (response.success) {
        loadSubscriptions();
        alert('Subscription resumed successfully');
      }
    } catch (error) {
      console.error('Failed to resume subscription:', error);
      alert('Failed to resume subscription');
    }
  };

  const handleViewTimeline = (subscription: SubscriptionOverview) => {
    setSelectedSubscription(subscription);
    setShowTimelineModal(true);
  };

  const handleViewDetails = (subscription: SubscriptionOverview) => {
    setSelectedSubscription(subscription);
    setShowSubscriptionDetailsModal(true);
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
      case 'cancelled': return <XCircle className="w-4 h-4" />;
      case 'pending': return <Clock className="w-4 h-4" />;
      default: return null;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'text-red-600 bg-red-100';
      case 'high': return 'text-orange-600 bg-orange-100';
      case 'medium': return 'text-yellow-600 bg-yellow-100';
      case 'low': return 'text-green-600 bg-green-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Subscription Management</h1>
        <p className="text-gray-600">Oversee and manage all customer subscriptions, chef assignments, and delivery preferences</p>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Package className="w-6 h-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Subscriptions</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalSubscriptions}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Active</p>
              <p className="text-2xl font-bold text-gray-900">{stats.activeSubscriptions}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <Pause className="w-6 h-6 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Paused</p>
              <p className="text-2xl font-bold text-gray-900">{stats.pausedSubscriptions}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg">
              <ChefHat className="w-6 h-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Pending Requests</p>
              <p className="text-2xl font-bold text-gray-900">{stats.pendingRequests}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-red-100 rounded-lg">
              <AlertTriangle className="w-6 h-6 text-red-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Issues</p>
              <p className="text-2xl font-bold text-gray-900">{stats.issuesRequiringAttention}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white rounded-lg shadow mb-6">
        <div className="p-6 border-b border-gray-200">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search by customer, subscription ID, or meal plan..."
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent w-96"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            {/* Filters */}
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Filter className="w-5 h-5 text-gray-400" />
                <select
                  value={filter}
                  onChange={(e) => setFilter(e.target.value as any)}
                  className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                >
                  <option value="all">All Subscriptions</option>
                  <option value="active">Active</option>
                  <option value="paused">Paused</option>
                  <option value="issues">Issues Requiring Attention</option>
                </select>
              </div>

              <button
                onClick={() => setShowChefReassignmentModal(true)}
                className="bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 flex items-center space-x-2"
              >
                <ChefHat className="w-4 h-4" />
                <span>Chef Requests ({reassignmentRequests.filter(r => r.status === 'pending').length})</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Subscriptions Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Customer & Subscription
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Meal Plan & Progress
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status & Chef
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Next Delivery
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Issues
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredSubscriptions.map((subscription) => (
                <tr key={subscription._id} className="hover:bg-gray-50">
                  {/* Customer & Subscription */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10">
                        <div className="h-10 w-10 rounded-full bg-primary-100 flex items-center justify-center">
                          <Users className="w-5 h-5 text-primary-600" />
                        </div>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">
                          {subscription.userId.fullName}
                        </div>
                        <div className="text-sm text-gray-500">
                          {subscription.subscriptionId}
                        </div>
                        <div className="text-xs text-gray-400 flex items-center mt-1">
                          <Mail className="w-3 h-3 mr-1" />
                          {subscription.userId.email}
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* Meal Plan & Progress */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {subscription.mealPlanId.planName}
                    </div>
                    <div className="text-sm text-gray-500">
                      {subscription.mealPlanId.durationWeeks} weeks • {subscription.mealPlanId.mealsPerWeek} meals/week
                    </div>
                    <div className="mt-2">
                      <div className="flex items-center">
                        <div className="flex-1 bg-gray-200 rounded-full h-2 mr-2">
                          <div 
                            className="bg-primary-600 h-2 rounded-full" 
                            style={{ width: `${subscription.metrics.progressPercentage}%` }}
                          ></div>
                        </div>
                        <span className="text-xs text-gray-500">
                          {subscription.metrics.completedMeals}/{subscription.metrics.totalMeals}
                        </span>
                      </div>
                    </div>
                  </td>

                  {/* Status & Chef */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(subscription.status)}`}>
                      {getStatusIcon(subscription.status)}
                      <span className="ml-1">{subscription.status}</span>
                    </span>
                    {subscription.chefAssignment && (
                      <div className="mt-2 text-sm text-gray-600">
                        <div className="flex items-center">
                          <ChefHat className="w-3 h-3 mr-1" />
                          {subscription.chefAssignment.chefId.fullName}
                        </div>
                        <div className="flex items-center mt-1">
                          <Star className="w-3 h-3 mr-1 text-yellow-400" />
                          <span className="text-xs">{subscription.chefAssignment.performance.averageRating.toFixed(1)}</span>
                        </div>
                      </div>
                    )}
                  </td>

                  {/* Next Delivery */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {new Date(subscription.nextDelivery).toLocaleDateString()}
                    </div>
                    <div className="text-sm text-gray-500">
                      {new Date(subscription.nextDelivery).toLocaleTimeString([], { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })}
                    </div>
                    <div className="text-xs text-gray-400 flex items-center mt-1">
                      <MapPin className="w-3 h-3 mr-1" />
                      {subscription.deliveryAddress.substring(0, 30)}...
                    </div>
                  </td>

                  {/* Issues */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="space-y-1">
                      {(subscription.issues?.pendingReassignmentRequests || 0) > 0 && (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                          {subscription.issues?.pendingReassignmentRequests} Chef Request(s)
                        </span>
                      )}
                      {(subscription.issues?.customerComplaints || 0) > 0 && (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                          {subscription.issues?.customerComplaints} Complaint(s)
                        </span>
                      )}
                      {(subscription.issues?.skippedMeals || 0) > 0 && (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                          {subscription.issues?.skippedMeals} Skipped
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Actions */}
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleViewDetails(subscription)}
                        className="text-primary-600 hover:text-primary-900"
                        title="View Details"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      
                      <button
                        onClick={() => handleViewTimeline(subscription)}
                        className="text-blue-600 hover:text-blue-900"
                        title="View Timeline"
                      >
                        <Calendar className="w-4 h-4" />
                      </button>

                      {subscription.status === 'active' ? (
                        <button
                          onClick={() => handlePauseSubscription(subscription._id)}
                          className="text-yellow-600 hover:text-yellow-900"
                          title="Pause Subscription"
                        >
                          <Pause className="w-4 h-4" />
                        </button>
                      ) : subscription.status === 'paused' ? (
                        <button
                          onClick={() => handleResumeSubscription(subscription._id)}
                          className="text-green-600 hover:text-green-900"
                          title="Resume Subscription"
                        >
                          <Play className="w-4 h-4" />
                        </button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredSubscriptions.length === 0 && (
          <div className="text-center py-8">
            <Package className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No subscriptions found</h3>
            <p className="mt-1 text-sm text-gray-500">
              Try adjusting your search criteria or filters.
            </p>
          </div>
        )}
      </div>

      {/* Chef Reassignment Requests Modal */}
      {showChefReassignmentModal && (
        <ChefReassignmentModal
          requests={reassignmentRequests}
          onClose={() => setShowChefReassignmentModal(false)}
          onUpdate={loadReassignmentRequests}
        />
      )}

      {/* Subscription Details Modal */}
      {showSubscriptionDetailsModal && selectedSubscription && (
        <SubscriptionDetailsModal
          subscription={selectedSubscription}
          onClose={() => setShowSubscriptionDetailsModal(false)}
          onUpdate={loadSubscriptions}
        />
      )}

      {/* Timeline Modal */}
      {showTimelineModal && selectedSubscription && (
        <TimelineModal
          subscription={selectedSubscription}
          onClose={() => setShowTimelineModal(false)}
        />
      )}
    </div>
  );
};


export default SubscriptionManagement;