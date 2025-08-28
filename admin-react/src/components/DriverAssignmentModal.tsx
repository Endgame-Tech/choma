import React, { useState, useEffect } from 'react'
import type { Driver } from '../types/drivers'

interface DriverAssignmentModalProps {
  isOpen: boolean
  onClose: () => void
  onAssign: (driverId: string, assignmentDetails: {
    priority: string
    specialInstructions: string
    estimatedPickupTime?: string
  }) => Promise<void>
  orderId: string
  orderDetails: {
    orderNumber: string
    customer: string
    totalAmount: number
    deliveryAddress: string
    delegationStatus: string
  } | null
}

const DriverAssignmentModal: React.FC<DriverAssignmentModalProps> = ({
  isOpen,
  onClose,
  onAssign,
  orderId,
  orderDetails
}) => {
  const [selectedDriver, setSelectedDriver] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [assignmentDetails, setAssignmentDetails] = useState({
    priority: 'normal',
    specialInstructions: '',
    estimatedPickupTime: ''
  })
  const [availableDrivers, setAvailableDrivers] = useState<Driver[]>([])
  const [driversLoading, setDriversLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Log order ID for debugging (prevents unused variable warning)
  useEffect(() => {
    if (isOpen && orderId) {
      console.log('Opening driver assignment for order:', orderId)
    }
  }, [isOpen, orderId])

  // Reset modal state when closed
  useEffect(() => {
    if (!isOpen) {
      setSelectedDriver('')
      setSearchTerm('')
      setAssignmentDetails({
        priority: 'normal',
        specialInstructions: '',
        estimatedPickupTime: ''
      })
      setError(null)
    }
  }, [isOpen])

  // Fetch available drivers when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchAvailableDrivers()
      // Set default pickup time to 30 minutes from now
      const now = new Date()
      now.setMinutes(now.getMinutes() + 30)
      setAssignmentDetails(prev => ({
        ...prev,
        estimatedPickupTime: now.toISOString().slice(0, 16)
      }))
    }
  }, [isOpen])

  const fetchAvailableDrivers = async () => {
    try {
      setDriversLoading(true)
      setError(null)

      console.log('🚛 Fetching drivers from API...')

      const response = await fetch('/api/admin/drivers?status=approved&limit=50', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('choma-admin-token')}`
        }
      })

      console.log('🚛 Driver API Response status:', response.status)

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()
      console.log('🚛 Driver API Result:', result)
      
      if (result.success) {
        console.log('🚛 Total drivers found:', result.data?.length || 0)
        
        // Filter for available drivers
        const available = (result.data || []).filter((driver: Driver) => {
          console.log(`🚛 Driver ${driver.fullName}: accountStatus=${driver.accountStatus}, isAvailable=${driver.isAvailable}, status=${driver.status}`)
          return driver.accountStatus === 'approved' && 
                 driver.isAvailable !== false && 
                 driver.status !== 'busy'
        })
        
        console.log('🚛 Available drivers after filtering:', available.length)
        setAvailableDrivers(available.length > 0 ? available : result.data || [])
        
        if (available.length === 0 && result.data?.length > 0) {
          setError('No available drivers found. Showing all drivers for debugging.')
        }
      } else {
        console.error('🚛 API returned error:', result.message)
        setError(result.message || 'Failed to load available drivers')
      }
    } catch (err) {
      console.error('🚛 Error fetching drivers:', err)
      setError(`Failed to load drivers: ${err instanceof Error ? err.message : 'Unknown error'}`)
    } finally {
      setDriversLoading(false)
    }
  }

  // Filter drivers based on search term
  const filteredDrivers = Array.isArray(availableDrivers)
    ? availableDrivers.filter(driver =>
        driver.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        driver.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        driver.vehicleInfo?.type?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        driver.vehicleInfo?.plateNumber?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : []

  const handleAssign = () => {
    if (selectedDriver) {
      onAssign(selectedDriver, assignmentDetails)
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

  const getDriverStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'online':
      case 'available':
        return 'bg-green-100 text-green-800'
      case 'busy':
      case 'on delivery':
        return 'bg-orange-100 text-orange-800'
      case 'offline':
      case 'unavailable':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getAccountStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'approved':
        return 'bg-green-100 text-green-800'
      case 'pending':
        return 'bg-yellow-100 text-yellow-800'
      case 'suspended':
      case 'rejected':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Assign Driver to Order</h2>
              <div className="mt-1 text-sm text-gray-600">
                {orderDetails && (
                  <>
                    <span className="font-medium">Order #{orderDetails.orderNumber}</span>
                    <span className="mx-2">•</span>
                    <span>{orderDetails.customer}</span>
                    <span className="mx-2">•</span>
                    <span className="font-medium">{formatCurrency(orderDetails.totalAmount)}</span>
                    <span className="mx-2">•</span>
                    <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs font-medium">
                      {orderDetails.delegationStatus}
                    </span>
                  </>
                )}
              </div>
              {orderDetails?.deliveryAddress && (
                <div className="mt-1 text-sm text-gray-600">
                  <span className="font-medium">📍 Delivery:</span> {orderDetails.deliveryAddress}
                </div>
              )}
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
              placeholder="Search drivers by name, email, or vehicle..."
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
                Priority Level
              </label>
              <select
                value={assignmentDetails.priority}
                onChange={(e) => setAssignmentDetails(prev => ({
                  ...prev,
                  priority: e.target.value
                }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="normal">Normal</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Estimated Pickup Time
              </label>
              <input
                type="datetime-local"
                value={assignmentDetails.estimatedPickupTime}
                onChange={(e) => setAssignmentDetails(prev => ({
                  ...prev,
                  estimatedPickupTime: e.target.value
                }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div className="md:col-span-2">
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
                placeholder="Any special delivery instructions..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              />
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="px-6 py-4 max-h-96 overflow-y-auto">
          {driversLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
                <p className="text-gray-600">Loading drivers...</p>
              </div>
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <div className="text-red-500 text-4xl mb-2">⚠️</div>
              <p className="text-red-600">Error loading drivers</p>
              <p className="text-sm text-gray-500 mt-1">{error}</p>
            </div>
          ) : filteredDrivers.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-gray-400 text-4xl mb-2">🚛</div>
              <p className="text-gray-600">
                {searchTerm ? 'No drivers found matching your search' : 'No available drivers found'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredDrivers.map((driver) => (
                <div
                  key={driver._id}
                  className={`border rounded-lg p-4 cursor-pointer transition-all hover:shadow-md ${
                    selectedDriver === driver._id
                      ? 'border-blue-500 bg-blue-50 shadow-md'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => setSelectedDriver(driver._id)}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center">
                      <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mr-3">
                        <span className="text-xl">🚛</span>
                      </div>
                      <div>
                        <h3 className="font-medium text-gray-900">{driver.fullName}</h3>
                        <p className="text-sm text-gray-600">{driver.email}</p>
                        {driver.stats?.rating && (
                          <div className="flex items-center mt-1">
                            <span className="text-yellow-400">⭐</span>
                            <span className="text-sm text-gray-600 ml-1">{driver.stats.rating}/5</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center">
                      <input
                        type="radio"
                        name="selectedDriver"
                        checked={selectedDriver === driver._id}
                        onChange={() => setSelectedDriver(driver._id)}
                        className="text-blue-600"
                        aria-label={`Select ${driver.fullName}`}
                        title={`Select ${driver.fullName}`}
                      />
                    </div>
                  </div>

                  {/* Status and Account Status */}
                  <div className="flex items-center justify-between mb-3">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getDriverStatusColor(driver.status)}`}>
                      {driver.status || 'Unknown'}
                    </span>
                    <span className={`text-xs px-2 py-1 rounded-full ${getAccountStatusColor(driver.accountStatus)}`}>
                      {driver.accountStatus}
                    </span>
                  </div>

                  {/* Vehicle Info */}
                  <div className="mb-3">
                    <div className="text-sm text-gray-600">
                      <span className="font-medium">🚗 Vehicle:</span> {driver.vehicleInfo?.type || 'N/A'}
                    </div>
                    <div className="text-sm text-gray-600">
                      <span className="font-medium">📋 Plate:</span> {driver.vehicleInfo?.plateNumber || 'N/A'}
                    </div>
                    {driver.vehicleInfo?.model && (
                      <div className="text-sm text-gray-600">
                        <span className="font-medium">Model:</span> {driver.vehicleInfo.model}
                      </div>
                    )}
                  </div>

                  {/* Stats */}
                  <div className="mt-3 pt-3 border-t border-gray-100 flex justify-between text-xs text-gray-500">
                    <span>Deliveries: {driver.stats?.totalDeliveries || 0}</span>
                    <span>Completed: {driver.stats?.completedDeliveries || 0}</span>
                    {driver.stats?.totalEarnings && (
                      <span>Earned: ₦{driver.stats.totalEarnings.toLocaleString()}</span>
                    )}
                  </div>

                  {/* Availability Indicator */}
                  <div className="mt-2">
                    <div className={`text-xs px-2 py-1 rounded text-center ${
                      driver.isAvailable ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {driver.isAvailable ? '✅ Available' : '❌ Not Available'}
                    </div>
                  </div>
                </div>
              ))}
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
            disabled={!selectedDriver}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Assign Driver
          </button>
        </div>
      </div>
    </div>
  )
}

export default DriverAssignmentModal