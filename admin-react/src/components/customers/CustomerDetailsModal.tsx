
import React from 'react'
import { useState } from 'react'
import { XMarkIcon, EnvelopeIcon, PhoneIcon, MapPinIcon, CalendarIcon } from '@heroicons/react/24/outline'
import type { User } from '../../types'

interface CustomerOrder {
  _id: string
  orderNumber: string
  orderDate: string
  totalAmount: number
  orderStatus: string
  paymentStatus: string
  mealPlan?: string
}

interface CustomerDetailsModalProps {
  isOpen: boolean
  onClose: () => void
  customer: User
  orders?: CustomerOrder[]
  onUpdateStatus?: (customerId: string, status: string) => void
}

export default function CustomerDetailsModal({ 
  isOpen, 
  onClose, 
  customer, 
  orders = [],
  onUpdateStatus 
}: CustomerDetailsModalProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'orders' | 'activity' | 'support'>('overview')
  const [updatingStatus, setUpdatingStatus] = useState(false)

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Active': return 'bg-green-100 text-green-800'
      case 'Inactive': return 'bg-gray-100 text-gray-800'
      case 'Suspended': return 'bg-yellow-100 text-yellow-800'
      case 'Deleted': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getOrderStatusColor = (status: string) => {
    switch (status) {
      case 'Completed':
      case 'Delivered': return 'bg-green-100 text-green-800'
      case 'In Progress':
      case 'Preparing': return 'bg-blue-100 text-blue-800'
      case 'Pending': return 'bg-yellow-100 text-yellow-800'
      case 'Cancelled': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const handleStatusUpdate = async (newStatus: string) => {
    if (!onUpdateStatus) return
    
    try {
      setUpdatingStatus(true)
      await onUpdateStatus(customer._id, newStatus)
    } catch (error) {
      console.error('Failed to update status:', error)
    } finally {
      setUpdatingStatus(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-6xl w-full max-h-[95vh] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <div className="flex justify-between items-center">
            <div className="flex items-center">
              <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                <span className="text-3xl text-white font-bold">
                  {customer.fullName.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="ml-4">
                <h3 className="text-2xl font-bold text-gray-900">{customer.fullName}</h3>
                <p className="text-gray-600">{customer.email}</p>
                <div className="flex items-center mt-2">
                  <span className={`px-3 py-1 text-sm font-semibold rounded-full ${getStatusColor(customer.status)}`}>
                    {customer.status}
                  </span>
                  {customer.customerId && (
                    <span className="ml-2 px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded-full">
                      ID: {customer.customerId}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-2xl"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            {[
              { key: 'overview', label: 'Overview', icon: '📊' },
              { key: 'orders', label: `Orders (${orders.length})`, icon: '🛒' },
              { key: 'activity', label: 'Activity', icon: '📈' },
              { key: 'support', label: 'Support', icon: '🎧' }
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as 'overview' | 'orders' | 'activity' | 'support')}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === tab.key
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <span className="mr-2">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        <div className="overflow-y-auto max-h-[calc(95vh-200px)]">
          {activeTab === 'overview' && (
            <div className="p-6 space-y-6">
              {/* Quick Actions */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-semibold text-gray-900 mb-3">Quick Actions</h4>
                <div className="flex flex-wrap gap-3">
                  <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                    <EnvelopeIcon className="h-4 w-4 inline mr-2" />
                    Send Email
                  </button>
                  {customer.phone && (
                    <button className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
                      <PhoneIcon className="h-4 w-4 inline mr-2" />
                      Call Customer
                    </button>
                  )}
                  <select
                    value={customer.status}
                    onChange={(e) => handleStatusUpdate(e.target.value)}
                    disabled={updatingStatus}
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                    <option value="Suspended">Suspended</option>
                    <option value="Deleted">Deleted</option>
                  </select>
                </div>
              </div>

              {/* Customer Stats */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-blue-50 rounded-lg p-4 text-center">
                  <p className="text-2xl font-bold text-blue-600">{customer.totalOrders || 0}</p>
                  <p className="text-sm text-gray-600">Total Orders</p>
                </div>
                <div className="bg-green-50 rounded-lg p-4 text-center">
                  <p className="text-2xl font-bold text-green-600">
                    {formatCurrency(customer.totalSpent || 0)}
                  </p>
                  <p className="text-sm text-gray-600">Total Spent</p>
                </div>
                <div className="bg-purple-50 rounded-lg p-4 text-center">
                  <p className="text-2xl font-bold text-purple-600">
                    {customer.totalOrders ? formatCurrency((customer.totalSpent || 0) / customer.totalOrders) : '₦0'}
                  </p>
                  <p className="text-sm text-gray-600">Avg Order Value</p>
                </div>
                <div className="bg-yellow-50 rounded-lg p-4 text-center">
                  <p className="text-2xl font-bold text-yellow-600">
                    {customer.lastLogin ? Math.floor((Date.now() - new Date(customer.lastLogin).getTime()) / (1000 * 60 * 60 * 24)) : 'N/A'}
                  </p>
                  <p className="text-sm text-gray-600">Days Since Last Login</p>
                </div>
              </div>

              {/* Customer Information */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Personal Information */}
                <div className="bg-white border border-gray-200 rounded-lg p-6">
                  <h4 className="text-lg font-semibold text-gray-900 mb-4">Personal Information</h4>
                  <div className="space-y-4">
                    <div className="flex items-center">
                      <EnvelopeIcon className="h-5 w-5 text-gray-400 mr-3" />
                      <div>
                        <p className="font-medium text-gray-900">{customer.email}</p>
                        <p className="text-sm text-gray-500">
                          {customer.emailVerified ? '✅ Verified' : '❌ Not verified'}
                        </p>
                      </div>
                    </div>
                    
                    {customer.phone && (
                      <div className="flex items-center">
                        <PhoneIcon className="h-5 w-5 text-gray-400 mr-3" />
                        <div>
                          <p className="font-medium text-gray-900">{customer.phone}</p>
                          <p className="text-sm text-gray-500">Primary phone</p>
                        </div>
                      </div>
                    )}
                    
                    {customer.address && (
                      <div className="flex items-center">
                        <MapPinIcon className="h-5 w-5 text-gray-400 mr-3" />
                        <div>
                          <p className="font-medium text-gray-900">{customer.address}</p>
                          <p className="text-sm text-gray-500">Primary address</p>
                        </div>
                      </div>
                    )}
                    
                    <div className="flex items-center">
                      <CalendarIcon className="h-5 w-5 text-gray-400 mr-3" />
                      <div>
                        <p className="font-medium text-gray-900">{formatDate(customer.registrationDate)}</p>
                        <p className="text-sm text-gray-500">Registration date</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Account Status */}
                <div className="bg-white border border-gray-200 rounded-lg p-6">
                  <h4 className="text-lg font-semibold text-gray-900 mb-4">Account Status</h4>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Profile Complete</span>
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        customer.profileComplete ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {customer.profileComplete ? 'Complete' : 'Incomplete'}
                      </span>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Subscription Status</span>
                      <span className="font-medium text-gray-900">
                        {customer.subscriptionStatus || 'No active subscription'}
                      </span>
                    </div>
                    
                    {customer.lastLogin && (
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Last Login</span>
                        <span className="font-medium text-gray-900">
                          {formatDate(customer.lastLogin)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'orders' && (
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h4 className="text-lg font-semibold text-gray-900">Order History</h4>
                <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                  Export Orders
                </button>
              </div>
              
              {orders.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-gray-400 text-6xl mb-4">📦</div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No orders yet</h3>
                  <p className="text-gray-500">This customer hasn`t placed any orders.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-3 font-medium text-gray-700">Order #</th>
                        <th className="text-left py-3 font-medium text-gray-700">Date</th>
                        <th className="text-left py-3 font-medium text-gray-700">Amount</th>
                        <th className="text-left py-3 font-medium text-gray-700">Status</th>
                        <th className="text-left py-3 font-medium text-gray-700">Payment</th>
                        <th className="text-left py-3 font-medium text-gray-700">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {orders.map((order) => (
                        <tr key={order._id} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="py-4">
                            <span className="font-medium text-blue-600">{order.orderNumber}</span>
                            {order.mealPlan && (
                              <div className="text-xs text-gray-500">{order.mealPlan}</div>
                            )}
                          </td>
                          <td className="py-4">{formatDate(order.orderDate)}</td>
                          <td className="py-4 font-semibold">{formatCurrency(order.totalAmount)}</td>
                          <td className="py-4">
                            <span className={`px-2 py-1 text-xs rounded-full ${getOrderStatusColor(order.orderStatus)}`}>
                              {order.orderStatus}
                            </span>
                          </td>
                          <td className="py-4">
                            <span className={`px-2 py-1 text-xs rounded-full ${
                              order.paymentStatus === 'Paid' ? 'bg-green-100 text-green-800' :
                              order.paymentStatus === 'Pending' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-red-100 text-red-800'
                            }`}>
                              {order.paymentStatus}
                            </span>
                          </td>
                          <td className="py-4">
                            <button className="text-blue-600 hover:text-blue-800 text-sm">
                              View Details
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {activeTab === 'activity' && (
            <div className="p-6">
              <h4 className="text-lg font-semibold text-gray-900 mb-6">Customer Activity</h4>
              
              {/* Activity Timeline */}
              <div className="space-y-4">
                <div className="flex items-start">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-4">
                    <span className="text-blue-600 text-sm">📱</span>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h5 className="font-medium text-gray-900">Last login</h5>
                      <span className="text-sm text-gray-500">
                        {customer.lastLogin ? formatDate(customer.lastLogin) : 'Never'}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600">Customer accessed their account</p>
                  </div>
                </div>
                
                <div className="flex items-start">
                  <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center mr-4">
                    <span className="text-green-600 text-sm">📝</span>  
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h5 className="font-medium text-gray-900">Account created</h5>
                      <span className="text-sm text-gray-500">{formatDate(customer.registrationDate)}</span>
                    </div>
                    <p className="text-sm text-gray-600">Customer registered an account</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'support' && (
            <div className="p-6">
              <h4 className="text-lg font-semibold text-gray-900 mb-6">Support & Communication</h4>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Support Tickets */}
                <div className="bg-white border border-gray-200 rounded-lg p-4">
                  <h5 className="font-medium text-gray-900 mb-4">Support Tickets</h5>
                  <div className="text-center py-8 text-gray-500">
                    <div className="text-4xl mb-2">🎧</div>
                    <p>No support tickets found</p>
                  </div>
                </div>
                
                {/* Communication Log */}
                <div className="bg-white border border-gray-200 rounded-lg p-4">
                  <h5 className="font-medium text-gray-900 mb-4">Communication Log</h5>
                  <div className="text-center py-8 text-gray-500">
                    <div className="text-4xl mb-2">💬</div>
                    <p>No communications logged</p>
                  </div>
                </div>
              </div>
              
              {/* Quick Contact */}
              <div className="mt-6 bg-gray-50 rounded-lg p-4">
                <h5 className="font-medium text-gray-900 mb-3">Quick Contact</h5>
                <div className="flex space-x-4">
                  <button className="flex-1 py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                    Send Email
                  </button>
                  <button className="flex-1 py-2 px-4 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
                    Send SMS
                  </button>
                  <button className="flex-1 py-2 px-4 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors">
                    Create Ticket
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}