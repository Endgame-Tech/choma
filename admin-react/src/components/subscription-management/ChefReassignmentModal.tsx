import React, { useState, useEffect } from 'react';
import { 
  X, 
  ChefHat, 
  Star, 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  User,
  Phone,
  Mail,
  Award,
  TrendingUp,
  Calendar,
  MessageSquare
} from 'lucide-react';
import { subscriptionManagementApi } from '../../services/subscriptionManagementApi';

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

interface AvailableChef {
  _id: string;
  fullName: string;
  email: string;
  phone: string;
  rating: number;
  specialties: string[];
  currentWorkload: number;
  maxCapacity: number;
  availability: {
    daysOfWeek: string[];
    timeSlots: string[];
  };
  performance: {
    averageRating: number;
    completedOrders: number;
    onTimePercentage: number;
    customerSatisfaction: number;
  };
}

interface ChefReassignmentModalProps {
  requests: ChefReassignmentRequest[];
  onClose: () => void;
  onUpdate: () => void;
}

const ChefReassignmentModal: React.FC<ChefReassignmentModalProps> = ({ 
  requests, 
  onClose, 
  onUpdate 
}) => {
  const [selectedRequest, setSelectedRequest] = useState<ChefReassignmentRequest | null>(null);
  const [availableChefs, setAvailableChefs] = useState<AvailableChef[]>([]);
  const [selectedChef, setSelectedChef] = useState<string>('');
  const [adminNotes, setAdminNotes] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [showChefSelection, setShowChefSelection] = useState(false);
  const [showRejectionModal, setShowRejectionModal] = useState(false);

  // Load available chefs when a request is selected
  useEffect(() => {
    if (selectedRequest && showChefSelection) {
      loadAvailableChefs(selectedRequest.subscriptionId);
    }
  }, [selectedRequest, showChefSelection]);

  const loadAvailableChefs = async (subscriptionId: string) => {
    try {
      setLoading(true);
      const response = await subscriptionManagementApi.getAvailableChefs(subscriptionId);
      if (response.success) {
        setAvailableChefs(response.data || []);
      }
    } catch (error) {
      console.error('Failed to load available chefs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApproveRequest = async () => {
    if (!selectedRequest || !selectedChef) return;

    try {
      setLoading(true);
      const response = await subscriptionManagementApi.approveChefReassignment(
        selectedRequest._id,
        selectedChef,
        adminNotes
      );
      
      if (response.success) {
        alert('Chef reassignment approved successfully');
        onUpdate();
        setShowChefSelection(false);
        setSelectedRequest(null);
        setSelectedChef('');
        setAdminNotes('');
      }
    } catch (error) {
      console.error('Failed to approve reassignment:', error);
      alert('Failed to approve reassignment');
    } finally {
      setLoading(false);
    }
  };

  const handleRejectRequest = async () => {
    if (!selectedRequest || !rejectionReason.trim()) return;

    try {
      setLoading(true);
      const response = await subscriptionManagementApi.rejectChefReassignment(
        selectedRequest._id,
        rejectionReason
      );
      
      if (response.success) {
        alert('Chef reassignment request rejected');
        onUpdate();
        setShowRejectionModal(false);
        setSelectedRequest(null);
        setRejectionReason('');
      }
    } catch (error) {
      console.error('Failed to reject reassignment:', error);
      alert('Failed to reject reassignment');
    } finally {
      setLoading(false);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'text-red-600 bg-red-100 border-red-200';
      case 'high': return 'text-orange-600 bg-orange-100 border-orange-200';
      case 'medium': return 'text-yellow-600 bg-yellow-100 border-yellow-200';
      case 'low': return 'text-green-600 bg-green-100 border-green-200';
      default: return 'text-gray-600 bg-gray-100 border-gray-200';
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'urgent': return <AlertTriangle className="w-4 h-4" />;
      case 'high': return <AlertTriangle className="w-4 h-4" />;
      case 'medium': return <Clock className="w-4 h-4" />;
      case 'low': return <CheckCircle className="w-4 h-4" />;
      default: return null;
    }
  };

  const getWorkloadColor = (workload: number, maxCapacity: number) => {
    const percentage = (workload / maxCapacity) * 100;
    if (percentage >= 90) return 'text-red-600 bg-red-100';
    if (percentage >= 70) return 'text-yellow-600 bg-yellow-100';
    return 'text-green-600 bg-green-100';
  };

  const pendingRequests = requests.filter(r => r.status === 'pending');

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <ChefHat className="w-6 h-6 text-primary-600" />
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                Chef Reassignment Requests
              </h2>
              <p className="text-sm text-gray-500">
                {pendingRequests.length} pending request(s) requiring your attention
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex h-[calc(90vh-88px)]">
          {/* Requests List */}
          <div className="w-1/2 border-r border-gray-200 overflow-y-auto">
            <div className="p-4">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Pending Requests</h3>
              
              {pendingRequests.length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle className="mx-auto h-12 w-12 text-green-400" />
                  <h4 className="mt-2 text-sm font-medium text-gray-900">All caught up!</h4>
                  <p className="mt-1 text-sm text-gray-500">No pending chef reassignment requests.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {pendingRequests.map((request) => (
                    <div
                      key={request._id}
                      className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                        selectedRequest?._id === request._id
                          ? 'border-primary-500 bg-primary-50'
                          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                      }`}
                      onClick={() => setSelectedRequest(request)}
                    >
                      {/* Priority Badge */}
                      <div className="flex items-center justify-between mb-3">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getPriorityColor(request.priority)}`}>
                          {getPriorityIcon(request.priority)}
                          <span className="ml-1">{request.priority.toUpperCase()}</span>
                        </span>
                        <span className="text-xs text-gray-500">
                          {new Date(request.requestedAt).toLocaleDateString()}
                        </span>
                      </div>

                      {/* Customer Info */}
                      <div className="mb-3">
                        <h4 className="text-sm font-medium text-gray-900">
                          {request.customerName}
                        </h4>
                        <p className="text-xs text-gray-600">
                          Current Chef: {request.currentChefName}
                        </p>
                      </div>

                      {/* Reason */}
                      <div className="text-sm text-gray-700">
                        <p className="line-clamp-2">{request.reason}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Request Details & Actions */}
          <div className="w-1/2 overflow-y-auto">
            {selectedRequest ? (
              <div className="p-6">
                <div className="mb-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Request Details</h3>
                  
                  {/* Customer Information */}
                  <div className="bg-gray-50 rounded-lg p-4 mb-6">
                    <h4 className="text-sm font-medium text-gray-900 mb-3 flex items-center">
                      <User className="w-4 h-4 mr-2" />
                      Customer Information
                    </h4>
                    <div className="space-y-2 text-sm">
                      <div><span className="font-medium">Name:</span> {selectedRequest.customerName}</div>
                      <div><span className="font-medium">Request Date:</span> {new Date(selectedRequest.requestedAt).toLocaleString()}</div>
                      <div><span className="font-medium">Priority:</span> 
                        <span className={`ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getPriorityColor(selectedRequest.priority)}`}>
                          {selectedRequest.priority.toUpperCase()}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Current Chef Information */}
                  <div className="bg-gray-50 rounded-lg p-4 mb-6">
                    <h4 className="text-sm font-medium text-gray-900 mb-3 flex items-center">
                      <ChefHat className="w-4 h-4 mr-2" />
                      Current Chef
                    </h4>
                    <div className="text-sm">
                      <div><span className="font-medium">Name:</span> {selectedRequest.currentChefName}</div>
                    </div>
                  </div>

                  {/* Reason for Reassignment */}
                  <div className="bg-gray-50 rounded-lg p-4 mb-6">
                    <h4 className="text-sm font-medium text-gray-900 mb-3 flex items-center">
                      <MessageSquare className="w-4 h-4 mr-2" />
                      Reason for Reassignment
                    </h4>
                    <p className="text-sm text-gray-700">{selectedRequest.reason}</p>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="space-y-3">
                  <button
                    onClick={() => setShowChefSelection(true)}
                    className="w-full bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center justify-center space-x-2"
                  >
                    <CheckCircle className="w-4 h-4" />
                    <span>Approve & Assign New Chef</span>
                  </button>
                  
                  <button
                    onClick={() => setShowRejectionModal(true)}
                    className="w-full bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 flex items-center justify-center space-x-2"
                  >
                    <XCircle className="w-4 h-4" />
                    <span>Reject Request</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <ChefHat className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">Select a Request</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Choose a request from the list to view details and take action.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Chef Selection Modal */}
      {showChefSelection && selectedRequest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-60">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[80vh] overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Select New Chef</h3>
              <button
                onClick={() => setShowChefSelection(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto max-h-[60vh]">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {availableChefs.map((chef) => (
                    <div
                      key={chef._id}
                      className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                        selectedChef === chef._id
                          ? 'border-primary-500 bg-primary-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => setSelectedChef(chef._id)}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h4 className="text-sm font-medium text-gray-900">{chef.fullName}</h4>
                          <p className="text-xs text-gray-600">{chef.email}</p>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Star className="w-3 h-3 text-yellow-400" />
                          <span className="text-xs text-gray-600">{chef.rating.toFixed(1)}</span>
                        </div>
                      </div>

                      {/* Workload Indicator */}
                      <div className="mb-3">
                        <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                          <span>Workload</span>
                          <span>{chef.currentWorkload}/{chef.maxCapacity}</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full ${
                              (chef.currentWorkload / chef.maxCapacity) * 100 >= 90
                                ? 'bg-red-500'
                                : (chef.currentWorkload / chef.maxCapacity) * 100 >= 70
                                ? 'bg-yellow-500'
                                : 'bg-green-500'
                            }`}
                            style={{ width: `${Math.min((chef.currentWorkload / chef.maxCapacity) * 100, 100)}%` }}
                          />
                        </div>
                      </div>

                      {/* Performance Metrics */}
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <span className="text-gray-500">Completed:</span>
                          <span className="ml-1 font-medium">{chef.performance.completedOrders}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">On Time:</span>
                          <span className="ml-1 font-medium">{chef.performance.onTimePercentage}%</span>
                        </div>
                      </div>

                      {/* Specialties */}
                      {chef.specialties.length > 0 && (
                        <div className="mt-2">
                          <div className="flex flex-wrap gap-1">
                            {chef.specialties.slice(0, 2).map((specialty) => (
                              <span key={specialty} className="inline-block px-2 py-0.5 text-xs bg-gray-100 text-gray-700 rounded">
                                {specialty}
                              </span>
                            ))}
                            {chef.specialties.length > 2 && (
                              <span className="inline-block px-2 py-0.5 text-xs bg-gray-100 text-gray-700 rounded">
                                +{chef.specialties.length - 2} more
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Admin Notes */}
              <div className="mt-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Admin Notes (Optional)
                </label>
                <textarea
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  rows={3}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="Add any notes about this reassignment..."
                />
              </div>
            </div>

            <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200">
              <button
                onClick={() => setShowChefSelection(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleApproveRequest}
                disabled={!selectedChef || loading}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Processing...' : 'Approve & Assign'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rejection Modal */}
      {showRejectionModal && selectedRequest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-60">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Reject Request</h3>
              <button
                onClick={() => setShowRejectionModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6">
              <p className="text-sm text-gray-600 mb-4">
                Please provide a reason for rejecting this chef reassignment request. 
                This will be communicated to the customer.
              </p>

              <label className="block text-sm font-medium text-gray-700 mb-2">
                Rejection Reason *
              </label>
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                rows={4}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="Enter the reason for rejection..."
                required
              />
            </div>

            <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200">
              <button
                onClick={() => setShowRejectionModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleRejectRequest}
                disabled={!rejectionReason.trim() || loading}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Processing...' : 'Reject Request'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChefReassignmentModal;