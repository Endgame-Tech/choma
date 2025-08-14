import React from 'react'
import type { Order } from '../types'
import { FileText, Utensils, ChefHat, BarChart3 } from 'lucide-react'

interface OrderDetailsModalProps {
  order: Order | null
  isOpen: boolean
  onClose: () => void
  onAccept?: (orderId: string) => void
  onReject?: (orderId: string, reason?: string) => void
  onUpdateStatus?: (orderId: string, status: string) => void
}

const OrderDetailsModal: React.FC<OrderDetailsModalProps> = ({
  order,
  isOpen,
  onClose,
  onAccept,
  onReject
}) => {
  const [rejectReason, setRejectReason] = React.useState('')
  const [showRejectForm, setShowRejectForm] = React.useState(false)

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0
    }).format(amount)
  }

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-NG', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Completed':
      case 'Delivered':
        return 'bg-green-100 text-green-800'
      case 'InProgress':
      case 'Preparing':
      case 'Ready':
      case 'OutForDelivery':
        return 'bg-blue-100 text-blue-800'
      case 'Cancelled':
        return 'bg-red-100 text-red-800'
      case 'Pending':
        return 'bg-yellow-100 text-yellow-800'
      case 'Accepted':
        return 'bg-purple-100 text-purple-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const handleReject = () => {
    if (order && onReject) {
      onReject(order._id, rejectReason)
      setRejectReason('')
      setShowRejectForm(false)
      onClose()
    }
  }

  const handleAccept = () => {
    if (order && onAccept) {
      onAccept(order._id)
      onClose()
    }
  }

  const canAcceptOrReject = order?.orderStatus === 'Pending'

  if (!isOpen || !order) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[95vh] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-semibold text-gray-900">Order Details</h2>
              <p className="text-gray-600">#{order.orderNumber}</p>
            </div>
            <div className="flex items-center space-x-4">
              <span className={`px-3 py-1 text-sm font-medium rounded-full ${getStatusColor(order.orderStatus)}`}>
                {order.orderStatus}
              </span>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 text-2xl font-bold"
              >
                ×
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto max-h-[70vh]">
          <div className="p-6 space-y-6">
            {/* Order Information */}
            <div className="bg-blue-50 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                <FileText size={20} className="mr-2" />
                Order Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Customer ID</p>
                  <p className="font-medium text-gray-900">Customer #{order.customer?._id?.slice(-6).toUpperCase() || 'UNKNOWN'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Delivery Zone</p>
                  <p className="font-medium text-gray-900">
                    {order.deliveryAddress?.city || 'Not specified'}
                  </p>
                </div>
              </div>
            </div>

            {/* Meal Plan Details */}
            {order.subscription?.mealPlanId && (
              <div className="bg-green-50 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                  <Utensils size={20} className="mr-2" />
                  Meal Plan Details
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <p className="text-sm text-gray-600">Plan Name</p>
                    <p className="font-medium text-gray-900">{order.subscription.mealPlanId.planName}</p>
                  </div>
                  {order.subscription.mealPlanId.planType && (
                    <div>
                      <p className="text-sm text-gray-600">Plan Type</p>
                      <p className="font-medium text-gray-900">{order.subscription.mealPlanId.planType}</p>
                    </div>
                  )}
                </div>

                {/* View Meal Plan Placeholder */}
                <div className="text-center py-6">
                  <button className="inline-flex items-center px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
                    <FileText size={18} className="mr-2" />
                    View Meal Plan
                  </button>
                  <p className="text-sm text-gray-500 mt-2">
                    Click to view detailed meal plan and cooking instructions
                  </p>
                </div>

                {/* Cooking Items Summary */}
                {order.items && order.items.length > 0 && (
                  <div>
                    <p className="text-sm text-gray-600 mb-3 flex items-center">
                      <ChefHat size={16} className="mr-1" />
                      Items to Prepare ({order.items.length} items):
                    </p>
                    <div className="space-y-3">
                      {order.items.map((item, index) => (
                        <div key={index} className="bg-white rounded-lg p-4 border border-green-200">
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <h4 className="font-semibold text-gray-900">{item.name}</h4>
                              {item.description && (
                                <p className="text-sm text-gray-600 mt-1">{item.description}</p>
                              )}
                              <div className="flex items-center mt-2">
                                <span className="text-sm bg-blue-100 text-blue-800 px-2 py-1 rounded">
                                  Quantity: {item.quantity}
                                </span>
                              </div>
                            </div>
                          </div>
                          {item.specialInstructions && (
                            <div className="mt-3 p-2 bg-yellow-50 border border-yellow-200 rounded">
                              <p className="text-sm text-yellow-800">
                                <strong>Cooking Instructions:</strong> {item.specialInstructions}
                              </p>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Order Summary */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center"><BarChart3 size={20} className="mr-2" /> Order Summary</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Order Value</p>
                  <p className="text-xl font-bold text-gray-900">{formatCurrency(order.totalAmount)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Payment Status</p>
                  <p className="font-medium text-gray-900">{order.paymentStatus}</p>
                </div>
              </div>
            </div>

            {/* Status Information */}
            <div className="bg-purple-50 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center"><BarChart3 size={20} className="mr-2" /> Status & Delivery Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Order Status (Business)</p>
                  <p className="font-medium text-gray-900">{order.orderStatus}</p>
                  <p className="text-xs text-gray-500">Managed by admin for customer updates</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">My Cooking Status</p>
                  <p className="font-medium text-gray-900">{order.delegationStatus || 'Assigned'}</p>
                  <p className="text-xs text-gray-500">Update this as you cook</p>
                </div>
                {order.deliveryDate && (
                  <div>
                    <p className="text-sm text-gray-600">Requested Delivery Date</p>
                    <p className="font-medium text-gray-900">{formatDate(order.deliveryDate)}</p>
                  </div>
                )}
                <div>
                  <p className="text-sm text-gray-600">Priority</p>
                  <p className="font-medium text-gray-900">{order.priority || 'Medium'}</p>
                </div>
              </div>
            </div>

            {/* Special Instructions */}
            {order.specialInstructions && (
              <div className="bg-orange-50 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center"><FileText size={20} className="mr-2" /> Special Instructions</h3>
                <p className="text-gray-700">{order.specialInstructions}</p>
              </div>
            )}

            {/* Admin Notes for Chef */}
            {(order.adminNotes || order.chefNotes) && (
              <div className="bg-indigo-50 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center"><FileText size={20} className="mr-2" /> Admin Notes</h3>
                <p className="text-gray-700">{order.adminNotes || order.chefNotes}</p>
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
          {canAcceptOrReject && !showRejectForm && (
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowRejectForm(true)}
                className="px-4 py-2 border border-red-300 text-red-700 rounded-lg hover:bg-red-50 transition-colors"
              >
                Reject Order
              </button>
              <button
                onClick={handleAccept}
                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                Accept Order
              </button>
            </div>
          )}

          {showRejectForm && (
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Reason for rejection (optional):
                </label>
                <textarea
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  rows={3}
                  placeholder="Please provide a reason for rejecting this order..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShowRejectForm(false)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleReject}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                >
                  Confirm Rejection
                </button>
              </div>
            </div>
          )}

          {!canAcceptOrReject && (
            <div className="flex justify-center">
              <button
                onClick={onClose}
                className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
              >
                Close
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}

export default OrderDetailsModal