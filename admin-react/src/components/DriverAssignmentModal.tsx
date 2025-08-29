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

const DriverCard = ({ driver, isSelected, onSelect, disabled = false }: { driver: Driver, isSelected: boolean, onSelect: (id: string) => void, disabled?: boolean }) => {
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

  const isDriverAvailable = driver.accountStatus === 'approved' && driver.isAvailable !== false && driver.status !== 'busy';

  return (
    <div
      key={driver._id}
      className={`border rounded-lg p-4 transition-all ${
        disabled 
          ? 'opacity-60 cursor-not-allowed bg-gray-50' 
          : `cursor-pointer hover:shadow-md ${isSelected ? 'border-blue-500 bg-blue-50 shadow-md' : 'border-gray-200 hover:border-gray-300'}`
      }`}
      onClick={() => !disabled && onSelect(driver._id)}
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
            checked={!disabled && isSelected}
            onChange={() => !disabled && onSelect(driver._id)}
            disabled={disabled}
            className="text-blue-600 disabled:bg-gray-200"
            aria-label={`Select ${driver.fullName}`}
            title={disabled ? `${driver.fullName} is not available` : `Select ${driver.fullName}`}
          />
        </div>
      </div>

      <div className="flex items-center justify-between mb-3">
        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getDriverStatusColor(driver.status)}`}>
          {driver.status || 'Unknown'}
        </span>
        <span className={`text-xs px-2 py-1 rounded-full ${getAccountStatusColor(driver.accountStatus)}`}>
          {driver.accountStatus}
        </span>
      </div>

      <div className="mb-3">
        <div className="text-sm text-gray-600">
          <span className="font-medium">🚗 Vehicle:</span> {driver.vehicleInfo?.type || 'N/A'}
        </div>
        <div className="text-sm text-gray-600">
          <span className="font-medium">📋 Plate:</span> {driver.vehicleInfo?.plateNumber || 'N/A'}
        </div>
      </div>

      <div className="mt-3 pt-3 border-t border-gray-100 flex justify-between text-xs text-gray-500">
        <span>Deliveries: {driver.stats?.totalDeliveries || 0}</span>
        <span>Completed: {driver.stats?.completedDeliveries || 0}</span>
      </div>
      
      <div className="mt-2">
        <div className={`text-xs px-2 py-1 rounded text-center font-medium ${
          isDriverAvailable ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
        }`}>
          {isDriverAvailable ? '✅ Available for Assignment' : '❌ Unavailable for Assignment'}
        </div>
      </div>
    </div>
  )
}


const DriverAssignmentModal: React.FC<DriverAssignmentModalProps> = ({
  isOpen,
  onClose,
  onAssign,
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
  const [unavailableDrivers, setUnavailableDrivers] = useState<Driver[]>([])
  const [driversLoading, setDriversLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)


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

  useEffect(() => {
    if (isOpen) {
      fetchDrivers()
      const now = new Date()
      now.setMinutes(now.getMinutes() + 30)
      setAssignmentDetails(prev => ({
        ...prev,
        estimatedPickupTime: now.toISOString().slice(0, 16)
      }))
    }
  }, [isOpen])

  const fetchDrivers = async () => {
    try {
      setDriversLoading(true)
      setError(null)

      const response = await fetch('/api/admin/drivers?status=approved&limit=50', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('choma-admin-token')}`
        }
      })

      
      // Handle 304 Not Modified - use cached data if available
      if (response.status === 304) {
        // If we have cached data, don't treat this as an error
        if (availableDrivers.length > 0 || unavailableDrivers.length > 0) {
          return
        }
        // If no cached data, treat as empty response
        setAvailableDrivers([])
        setUnavailableDrivers([])
        return
      }
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()

      if (result.success) {
        const allDrivers = result.data || []
        const available = allDrivers.filter((driver: Driver) => {
          return driver.accountStatus === 'approved' && 
                 driver.isAvailable !== false && 
                 driver.status !== 'busy'
        })
        
        const unavailable = allDrivers.filter((driver: Driver) => 
          !available.some((d: Driver) => d._id === driver._id)
        )

        setAvailableDrivers(available)
        setUnavailableDrivers(unavailable)
        
      } else {
        console.error('🚛 API returned error:', result.message)
        setError(result.message || 'Failed to load drivers')
      }
    } catch (err) {
      console.error('🚛 Error fetching drivers:', err)
      setError(`Failed to load drivers: ${err instanceof Error ? err.message : 'Unknown error'}`)
    } finally {
      setDriversLoading(false)
    }
  }

  const applySearch = (drivers: Driver[]) => {
    if (!Array.isArray(drivers)) return []
    return drivers.filter(driver =>
        driver.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (driver.email && driver.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (driver.vehicleInfo?.type && driver.vehicleInfo.type.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (driver.vehicleInfo?.plateNumber && driver.vehicleInfo.plateNumber.toLowerCase().includes(searchTerm.toLowerCase()))
      )
  }

  const filteredAvailableDrivers = applySearch(availableDrivers)
  const filteredUnavailableDrivers = applySearch(unavailableDrivers)

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

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col">
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Assign Driver to Order</h2>
              {orderDetails && (
                <div className="mt-1 text-sm text-gray-600">
                  <span className="font-medium">Order #{orderDetails.orderNumber}</span>
                  <span className="mx-2">•</span>
                  <span>{orderDetails.customer}</span>
                  <span className="mx-2">•</span>
                  <span className="font-medium">{formatCurrency(orderDetails.totalAmount)}</span>
                </div>
              )}
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl font-bold">×</button>
          </div>
        </div>

        <div className="px-6 py-4 border-b border-gray-200">
          <input
            type="text"
            placeholder="Search drivers..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-4 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="px-6 py-4 flex-grow overflow-y-auto">
          {driversLoading ? (
            <div className="text-center py-8"><p>Loading drivers...</p></div>
          ) : error ? (
            <div className="text-center py-8 text-red-600">
              <p>⚠️ Error loading drivers</p>
              <p className="text-sm text-gray-500 mt-1">{error}</p>
            </div>
          ) : (filteredAvailableDrivers.length === 0 && filteredUnavailableDrivers.length === 0) ? (
            <div className="text-center py-8">
              <p className="text-gray-600">{searchTerm ? 'No drivers found matching your search' : 'No drivers found'}</p>
            </div>
          ) : (
            <div className="space-y-6">
              {filteredAvailableDrivers.length > 0 && (
                <div>
                  <h4 className="text-sm font-bold text-gray-500 mb-2 pb-2 border-b">AVAILABLE</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {filteredAvailableDrivers.map(driver => (
                      <DriverCard key={driver._id} driver={driver} isSelected={selectedDriver === driver._id} onSelect={setSelectedDriver} />
                    ))}
                  </div>
                </div>
              )}

              {filteredUnavailableDrivers.length > 0 && (
                <div>
                  <h4 className="text-sm font-bold text-gray-500 mb-2 pb-2 border-b">UNAVAILABLE</h4>
                  {filteredAvailableDrivers.length === 0 && !searchTerm && (
                    <div className="text-center text-sm text-gray-500 bg-yellow-50 p-3 rounded-lg mb-4">
                      No drivers are currently available for assignment.
                    </div>
                  )}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {filteredUnavailableDrivers.map(driver => (
                      <DriverCard key={driver._id} driver={driver} isSelected={false} onSelect={() => {}} disabled={true} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
          <h3 className="text-md font-semibold text-gray-900 mb-4">Assignment Details</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Priority</label>
              <select
                value={assignmentDetails.priority}
                onChange={(e) => setAssignmentDetails(prev => ({ ...prev, priority: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              >
                <option value="normal">Normal</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Pickup Time</label>
              <input
                type="datetime-local"
                value={assignmentDetails.estimatedPickupTime}
                onChange={(e) => setAssignmentDetails(prev => ({ ...prev, estimatedPickupTime: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">Instructions</label>
              <textarea
                value={assignmentDetails.specialInstructions}
                onChange={(e) => setAssignmentDetails(prev => ({ ...prev, specialInstructions: e.target.value }))}
                rows={2}
                placeholder="Special delivery instructions..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg resize-none"
              />
            </div>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-end space-x-3">
          <button onClick={onClose} className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100">
            Cancel
          </button>
          <button
            onClick={handleAssign}
            disabled={!selectedDriver}
            className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
          >
            Assign Driver
          </button>
        </div>
      </div>
    </div>
  )
}

export default DriverAssignmentModal
