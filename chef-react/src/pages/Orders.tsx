import React, { useState, useEffect } from 'react'
import { ordersApi } from '../services/api'
import OrderDetailsModal from '../components/OrderDetailsModal'
import ChefStatusModal from '../components/ChefStatusModal'
import type { Order } from '../types'
import {
  FileText,
  CheckCircle,
  ChefHat,
  Target,
  Sparkles,
  Clock,
  Eye,
  AlertTriangle
} from 'lucide-react';

const statusOptions = [
  { value: 'all', label: 'All Orders' },
  { value: 'Pending', label: 'Pending Review' },
  { value: 'Accepted', label: 'Accepted' },
  { value: 'Preparing', label: 'In Progress' },
  { value: 'Ready', label: 'Ready' },
  { value: 'Completed', label: 'Completed' },
  { value: 'Cancelled', label: 'Cancelled' }
]

const chefStatusOptions = [
  { value: 'Assigned', label: 'Just Assigned' },
  { value: 'Accepted', label: 'Accepted Order' },
  { value: 'In Progress', label: 'Preparing Food' },
  { value: 'Ready', label: 'Food Ready' },
  { value: 'Completed', label: 'Completed' }
]

const Orders: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<string>('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [statusModal, setStatusModal] = useState<{
    isOpen: boolean
    orderId: string
    currentStatus: string
  }>({ isOpen: false, orderId: '', currentStatus: '' })

  useEffect(() => {
    fetchOrders()
  }, [filter])

  const fetchOrders = async () => {
    try {
      setLoading(true)
      setError(null)

      const filters: any = {}
      if (filter !== 'all') {
        filters.status = filter
      }

      const response = await ordersApi.getMyOrders(filters)
      setOrders(response.orders || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch orders')
    } finally {
      setLoading(false)
    }
  }

  const handleAcceptOrder = async (orderId: string) => {
    try {
      setActionLoading(orderId)
      await ordersApi.updateOrderStatus(orderId, 'Accepted')
      await fetchOrders() // Refresh orders
    } catch (err) {
      alert(`Failed to accept order: ${err instanceof Error ? err.message : 'Unknown error'}`)
    } finally {
      setActionLoading(null)
    }
  }

  const handleRejectOrder = async (orderId: string) => {
    try {
      setActionLoading(orderId)
      // You might want to create a separate API endpoint for rejection with reason
      await ordersApi.updateOrderStatus(orderId, 'Cancelled')
      await fetchOrders() // Refresh orders
    } catch (err) {
      alert(`Failed to reject order: ${err instanceof Error ? err.message : 'Unknown error'}`)
    } finally {
      setActionLoading(null)
    }
  }

  const handleStatusUpdate = async (orderId: string, newStatus: string) => {
    try {
      setActionLoading(orderId)
      await ordersApi.updateOrderStatus(orderId, newStatus)
      await fetchOrders() // Refresh orders
    } catch (err) {
      alert(`Failed to update order status: ${err instanceof Error ? err.message : 'Unknown error'}`)
    } finally {
      setActionLoading(null)
    }
  }

  const handleChefStatusUpdate = async (orderId: string, newChefStatus: string) => {
    try {
      setActionLoading(orderId)
      // Update chef status via delegation API
      await ordersApi.updateChefStatus(orderId, newChefStatus)
      await fetchOrders() // Refresh orders
      closeStatusModal() // Close the modal after successful update
    } catch (err) {
      alert(`Failed to update chef status: ${err instanceof Error ? err.message : 'Unknown error'}`)
      throw err // Re-throw so modal can handle the error
    } finally {
      setActionLoading(null)
    }
  }

  const openOrderDetails = (order: Order) => {
    setSelectedOrder(order)
    setIsDetailModalOpen(true)
  }

  const closeOrderDetails = () => {
    setSelectedOrder(null)
    setIsDetailModalOpen(false)
  }

  const openStatusModal = (order: Order) => {
    setStatusModal({
      isOpen: true,
      orderId: order._id,
      currentStatus: order.delegationStatus || 'Assigned'
    })
  }

  const closeStatusModal = () => {
    setStatusModal({ isOpen: false, orderId: '', currentStatus: '' })
  }

  const getStatusLabel = (status: string) => {
    const option = chefStatusOptions.find(opt => opt.value === status)
    return option?.label || status
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Assigned': return FileText
      case 'Accepted': return CheckCircle
      case 'In Progress': return ChefHat
      case 'Ready': return Target
      case 'Completed': return Sparkles
      default: return Clock
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0
    }).format(amount)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Completed':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'Preparing':
      case 'Ready':
        return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'Cancelled':
        return 'bg-red-100 text-red-800 border-red-200'
      case 'Pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'Accepted':
        return 'bg-purple-100 text-purple-800 border-purple-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority?.toLowerCase()) {
      case 'urgent':
        return 'bg-red-500 text-white'
      case 'high':
        return 'bg-orange-500 text-white'
      case 'medium':
        return 'bg-blue-500 text-white'
      case 'low':
        return 'bg-gray-500 text-white'
      default:
        return 'bg-gray-500 text-white'
    }
  }

  const filteredOrders = orders.filter(order =>
    order.subscription?.mealPlanId?.planName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    order.items?.some(item => item.name?.toLowerCase().includes(searchTerm.toLowerCase()))
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading your orders...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
        <div className="flex items-center">
          <AlertTriangle className="text-red-400 mr-3" size={20} />
          <div>
            <h3 className="text-red-800 dark:text-red-200 font-medium">Error loading orders</h3>
            <p className="text-red-600 dark:text-red-300">{error}</p>
            <button
              onClick={fetchOrders}
              className="mt-2 text-sm text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-200 underline"
            >
              Try again
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-semibold text-gray-900 dark:text-white">My Orders</h1>
        <p className="text-gray-600 dark:text-gray-400">Manage your assigned cooking orders</p>
      </div>

      {/* Filters and Search */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 transition-colors duration-200">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          {/* Filter tabs */}
          <div className="flex flex-wrap gap-2">
            {statusOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => setFilter(option.value)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${filter === option.value
                  ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-200 border-2 border-blue-200 dark:border-blue-700'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
              >
                {option.label}
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="relative">
            <input
              type="text"
              placeholder="Search by meal plan or items..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent w-full md:w-64 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 transition-colors duration-200"
            />
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Eye className="text-gray-400 dark:text-gray-500" size={20} />
            </div>
          </div>
        </div>
      </div>

      {/* Orders Grid */}
      {filteredOrders.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 transition-colors duration-200">
          <ChefHat size={60} className="text-gray-500 dark:text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No orders found</h3>
          <p className="text-gray-500 dark:text-gray-400">
            {filter === 'all'
              ? "You don't have any assigned orders yet."
              : `No ${filter.toLowerCase()} orders at the moment.`}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredOrders.map((order) => (
            <div key={order._id} className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md dark:hover:shadow-lg transition-all duration-200">
              {/* Order Header */}
              <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-gray-900 dark:text-white">New Cooking Order</h3>
                  <div className="flex items-center space-x-2">
                    {order.priority && order.priority !== 'Medium' && (
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getPriorityColor(order.priority)}`}>
                        {order.priority}
                      </span>
                    )}
                    <span className={`px-3 py-1 text-sm font-medium rounded-full border ${getStatusColor(order.orderStatus)}`}>
                      {order.orderStatus}
                    </span>
                  </div>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Cooking Assignment</p>
                <p className="text-lg font-semibold text-gray-900 dark:text-white mt-1">{formatCurrency(order.totalAmount)}</p>
              </div>

              {/* Order Preview */}
              <div className="p-4">
                {/* Meal Plan Info */}
                {order.subscription?.mealPlanId && (
                  <div className="mb-4">
                    <p className="text-sm text-gray-600 dark:text-gray-400">Meal Plan</p>
                    <p className="font-medium text-gray-900 dark:text-white">{order.subscription.mealPlanId.planName}</p>
                    {order.subscription.mealPlanId.planType && (
                      <p className="text-xs text-gray-500 dark:text-gray-400">{order.subscription.mealPlanId.planType}</p>
                    )}
                  </div>
                )}

                {/* Items Preview */}
                {order.items && order.items.length > 0 && (
                  <div className="mb-4">
                    <p className="text-sm text-gray-600 mb-2">Items to Cook ({order.items.length})</p>
                    <div className="space-y-2">
                      {order.items.slice(0, 2).map((item, index) => (
                        <div key={index} className="bg-gray-50 rounded-lg p-3">
                          <div className="flex justify-between items-center">
                            <span className="font-medium text-sm text-gray-900">{item.name}</span>
                            <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                              x{item.quantity}
                            </span>
                          </div>
                          {item.description && (
                            <p className="text-xs text-gray-600 mt-1 truncate">{item.description}</p>
                          )}
                        </div>
                      ))}
                      {order.items.length > 2 && (
                        <p className="text-xs text-gray-500 text-center">
                          +{order.items.length - 2} more items
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* Delivery Date */}
                {order.deliveryDate && (
                  <div className="mb-4">
                    <p className="text-sm text-gray-600">Delivery Date</p>
                    <p className="text-sm font-medium text-gray-900">
                      {new Date(order.deliveryDate).toLocaleDateString('en-NG', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                  </div>
                )}

                {/* Chef Status Display & Control */}
                {order.orderStatus !== 'Pending' && (
                  <div className="mb-4">
                    <p className="text-sm text-gray-600">My Cooking Status</p>
                    <div className="flex items-center justify-between mt-1">
                      <div className="flex items-center">
                        <span className="text-sm font-medium text-gray-900">
                          {getStatusLabel(order.delegationStatus || 'Assigned')}
                        </span>
                        <span className="ml-2">
                          {React.createElement(getStatusIcon(order.delegationStatus || 'Assigned'), { size: 16 })}
                        </span>
                      </div>
                      <button
                        onClick={() => openStatusModal(order)}
                        disabled={actionLoading === order._id}
                        className="text-sm bg-blue-100 text-blue-700 px-3 py-1 rounded-lg hover:bg-blue-200 disabled:opacity-50 transition-colors"
                      >
                        Update Status
                      </button>
                    </div>
                  </div>
                )}

                {/* Special Instructions Preview */}
                {order.specialInstructions && (
                  <div className="mb-4">
                    <p className="text-sm text-gray-600">Special Instructions</p>
                    <p className="text-sm text-gray-700 truncate">{order.specialInstructions}</p>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="p-4 border-t border-gray-200 bg-gray-50">
                <div className="flex space-x-2">
                  <button
                    onClick={() => openOrderDetails(order)}
                    className="flex-1 px-3 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center"
                  >
                    <Eye size={16} className="mr-2" />
                    View Details
                  </button>

                  {order.orderStatus === 'Pending' && (
                    <>
                      <button
                        onClick={() => handleAcceptOrder(order._id)}
                        disabled={actionLoading === order._id}
                        className="flex-1 px-3 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
                      >
                        {actionLoading === order._id ? 'Processing...' : <><CheckCircle size={16} className="mr-1" /> Accept Order</>}
                      </button>
                      <button
                        onClick={() => handleRejectOrder(order._id)}
                        disabled={actionLoading === order._id}
                        className="px-3 py-2 border border-red-300 text-red-700 text-sm font-medium rounded-lg hover:bg-red-50 disabled:opacity-50 transition-colors"
                      >
                        Reject
                      </button>
                    </>
                  )}

                  {order.orderStatus !== 'Pending' && order.orderStatus !== 'Cancelled' && (
                    <button
                      onClick={() => openStatusModal(order)}
                      disabled={actionLoading === order._id}
                      className="flex-1 px-3 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                    >
                      Update Cooking Status
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Order Details Modal */}
      <OrderDetailsModal
        order={selectedOrder}
        isOpen={isDetailModalOpen}
        onClose={closeOrderDetails}
        onAccept={handleAcceptOrder}
        onReject={handleRejectOrder}
        onUpdateStatus={handleStatusUpdate}
      />

      {/* Chef Status Update Modal */}
      <ChefStatusModal
        isOpen={statusModal.isOpen}
        onClose={closeStatusModal}
        currentStatus={statusModal.currentStatus}
        onUpdateStatus={(newStatus) => handleChefStatusUpdate(statusModal.orderId, newStatus)}
        loading={actionLoading === statusModal.orderId}
      />
    </div>
  )
}

export default Orders