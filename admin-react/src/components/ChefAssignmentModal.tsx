import React, { useState, useEffect } from 'react'
import { useAvailableChefs } from '../hooks/useChefs'
import './styles/ChefAssignmentModal.css'

interface ChefAssignmentModalProps {
  isOpen: boolean
  onClose: () => void
  onAssign: (chefId: string, assignmentDetails: {
    estimatedHours: number
    priority: string
    specialInstructions: string
    chefFeePercentage: number
  }) => void
  orderId: string
  orderDetails: {
    orderNumber: string
    customer: string
    totalAmount: number
    deliveryDate?: string
  } | null
}

const ChefAssignmentModal: React.FC<ChefAssignmentModalProps> = ({
  isOpen,
  onClose,
  onAssign,
  orderId,
  orderDetails
}) => {
  const [selectedChef, setSelectedChef] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [assignmentDetails, setAssignmentDetails] = useState({
    estimatedHours: 2,
    priority: 'Medium',
    specialInstructions: '',
    chefFeePercentage: 70
  })
  const { chefs: availableChefs, loading: chefsLoading, error: chefsError } = useAvailableChefs()

  // Log order ID for debugging (prevents unused variable warning)
  useEffect(() => {
    if (isOpen && orderId) {
      console.log('Opening chef assignment for order:', orderId)
    }
  }, [isOpen, orderId])

  // Reset modal state when closed
  useEffect(() => {
    if (!isOpen) {
      setSelectedChef('')
      setSearchTerm('')
      setAssignmentDetails({
        estimatedHours: 2,
        priority: 'Medium',
        specialInstructions: '',
        chefFeePercentage: 70
      })
    }
  }, [isOpen])

  // Filter chefs based on search term
  const filteredChefs = Array.isArray(availableChefs)
    ? availableChefs.filter(chef =>
      chef.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      chef.specialties?.some(specialty =>
        specialty.toLowerCase().includes(searchTerm.toLowerCase())
      )
    )
    : []

  const handleAssign = () => {
    if (selectedChef) {
      onAssign(selectedChef, assignmentDetails)
      onClose()
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0
    }).format(amount)
  }

  const getAvailabilityColor = (availability: string) => {
    switch (availability?.toLowerCase()) {
      case 'available':
        return 'bg-green-100 text-green-800'
      case 'busy':
        return 'bg-orange-100 text-orange-800'
      case 'offline':
      case 'unavailable':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getCapacityPercentage = (current: number, max: number) => {
    return max > 0 ? (current / max) * 100 : 0
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Assign Chef to Order</h2>
              <div className="mt-1 text-sm text-gray-600">
                {orderDetails && (
                  <>
                    <span className="font-medium">Order #{orderDetails.orderNumber}</span>
                    <span className="mx-2">•</span>
                    <span>{orderDetails.customer}</span>
                    <span className="mx-2">•</span>
                    <span className="font-medium">{formatCurrency(orderDetails.totalAmount)}</span>
                    {orderDetails.deliveryDate && (
                      <>
                        <span className="mx-2">•</span>
                        <span>Delivery: {new Date(orderDetails.deliveryDate).toLocaleDateString()}</span>
                      </>
                    )}
                  </>
                )}
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-2xl font-bold"
            >
              ×
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="relative">
            <input
              type="text"
              placeholder="Search chefs by name or specialty..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <span className="text-gray-400">🔍</span>
            </div>
          </div>
        </div>

        {/* Assignment Configuration */}
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <h3 className="text-md font-semibold text-gray-900 mb-4">Assignment Details</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Estimated Hours to Complete
              </label>
              <input
                type="number"
                min="1"
                max="48"
                value={assignmentDetails.estimatedHours}
                onChange={(e) => setAssignmentDetails(prev => ({
                  ...prev,
                  estimatedHours: parseInt(e.target.value) || 1
                }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                aria-label="Estimated Hours to Complete"
                title="Estimated Hours to Complete"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Priority Level
              </label>
              <select
                value={assignmentDetails.priority}
                onChange={(e) => setAssignmentDetails(prev => ({
                  ...prev,
                  priority: e.target.value
                }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                aria-label="Priority Level"
                title="Priority Level"
              >
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
                <option value="Urgent">Urgent</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Chef Fee (% of total)
              </label>
              <input
                type="number"
                min="50"
                max="90"
                value={assignmentDetails.chefFeePercentage}
                onChange={(e) => setAssignmentDetails(prev => ({
                  ...prev,
                  chefFeePercentage: parseInt(e.target.value) || 70
                }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                aria-label="Chef Fee Percentage"
                title="Chef Fee Percentage"
              />
              <p className="text-xs text-gray-500 mt-1">
                Chef will earn: {orderDetails ? formatCurrency((orderDetails.totalAmount * assignmentDetails.chefFeePercentage) / 100) : '-'}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Special Instructions
              </label>
              <textarea
                value={assignmentDetails.specialInstructions}
                onChange={(e) => setAssignmentDetails(prev => ({
                  ...prev,
                  specialInstructions: e.target.value
                }))}
                rows={3}
                placeholder="Any special requirements or instructions for the chef..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              />
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="px-6 py-4 max-h-96 overflow-y-auto">
          {chefsLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
                <p className="text-gray-600">Loading chefs...</p>
              </div>
            </div>
          ) : chefsError ? (
            <div className="text-center py-8">
              <div className="text-red-500 text-4xl mb-2">⚠️</div>
              <p className="text-red-600">Error loading chefs</p>
              <p className="text-sm text-gray-500 mt-1">{chefsError}</p>
            </div>
          ) : filteredChefs.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-gray-400 text-4xl mb-2">👨‍🍳</div>
              <p className="text-gray-600">
                {searchTerm ? 'No chefs found matching your search' : 'No available chefs found'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredChefs.map((chef) => {
                const capacityPercentage = getCapacityPercentage(chef.currentCapacity || 0, chef.maxCapacity || 0)
                const isNearCapacity = capacityPercentage > 80

                return (
                  <div
                    key={chef._id}
                    className={`border rounded-lg p-4 cursor-pointer transition-all hover:shadow-md ${selectedChef === chef._id
                      ? 'border-blue-500 bg-blue-50 shadow-md'
                      : 'border-gray-200 hover:border-gray-300'
                      }`}
                    onClick={() => setSelectedChef(chef._id)}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center">
                        <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                          <span className="text-xl">👨‍🍳</span>
                        </div>
                        <div>
                          <h3 className="font-medium text-gray-900">{chef.fullName}</h3>
                          <p className="text-sm text-gray-600">{chef.email}</p>
                          {chef.rating && (
                            <div className="flex items-center mt-1">
                              <span className="text-yellow-400">⭐</span>
                              <span className="text-sm text-gray-600 ml-1">{chef.rating}/5</span>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center">
                        <input
                          type="radio"
                          name="selectedChef"
                          checked={selectedChef === chef._id}
                          onChange={() => setSelectedChef(chef._id)}
                          className="text-blue-600"
                          aria-label={`Select ${chef.fullName}`}
                          title={`Select ${chef.fullName}`}
                        />
                      </div>
                    </div>

                    {/* Status and Availability */}
                    <div className="flex items-center justify-between mb-3">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getAvailabilityColor(chef.availability || 'Unknown')}`}>
                        {chef.availability || 'Unknown'}
                      </span>
                      <span className={`text-xs px-2 py-1 rounded-full ${chef.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                        }`}>
                        {chef.status}
                      </span>
                    </div>

                    {/* Capacity */}
                    <div className="mb-3">
                      <div className="flex justify-between text-sm text-gray-600 mb-1">
                        <span>Current Load</span>
                        <span>{chef.currentCapacity || 0}/{chef.maxCapacity || 0}</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className={`capacity-bar ${isNearCapacity ? 'bg-orange-500' : 'bg-blue-500'}`}
                          data-capacity-percentage={Math.min(capacityPercentage, 100)}
                        ></div>
                      </div>
                      {isNearCapacity && (
                        <p className="text-xs text-orange-600 mt-1">⚠️ Near capacity limit</p>
                      )}
                    </div>

                    {/* Specialties */}
                    {chef.specialties && chef.specialties.length > 0 && (
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Specialties:</p>
                        <div className="flex flex-wrap gap-1">
                          {chef.specialties.slice(0, 3).map((specialty, index) => (
                            <span
                              key={index}
                              className="inline-block px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded"
                            >
                              {specialty}
                            </span>
                          ))}
                          {chef.specialties.length > 3 && (
                            <span className="text-xs text-gray-500">+{chef.specialties.length - 3} more</span>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Stats */}
                    <div className="mt-3 pt-3 border-t border-gray-100 flex justify-between text-xs text-gray-500">
                      <span>Orders: {chef.totalOrdersCompleted || 0}</span>
                      {chef.experience && <span>Exp: {chef.experience}</span>}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleAssign}
            disabled={!selectedChef}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Assign Chef
          </button>
        </div>
      </div>
    </div>
  )
}

export default ChefAssignmentModal