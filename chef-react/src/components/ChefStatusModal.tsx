import React, { useState } from 'react'
import {
  FileText,
  CheckCircle,
  ChefHat,
  Target,
  Sparkles
} from 'lucide-react'

interface ChefStatusModalProps {
  isOpen: boolean
  onClose: () => void
  currentStatus: string
  onUpdateStatus: (newStatus: string) => Promise<void>
  orderNumber: string
  loading: boolean
}

const statusOptions = [
  { value: 'Assigned', label: 'Just Assigned', icon: FileText, color: 'bg-blue-500' },
  { value: 'Accepted', label: 'Accepted Order', icon: CheckCircle, color: 'bg-green-500' },
  { value: 'In Progress', label: 'Preparing Food', icon: ChefHat, color: 'bg-orange-500' },
  { value: 'Ready', label: 'Food Ready', icon: Target, color: 'bg-purple-500' },
  { value: 'Completed', label: 'Completed', icon: Sparkles, color: 'bg-emerald-500' }
]

const ChefStatusModal: React.FC<ChefStatusModalProps> = ({
  isOpen,
  onClose,
  currentStatus,
  onUpdateStatus,
  orderNumber,
}) => {
  const [updating, setUpdating] = useState(false)
  const [selectedStatus, setSelectedStatus] = useState(currentStatus)

  const handleUpdate = async () => {
    if (selectedStatus === currentStatus) {
      onClose()
      return
    }

    try {
      setUpdating(true)
      await onUpdateStatus(selectedStatus)
      onClose()
    } catch (error) {
      console.error('Failed to update status:', error)
    } finally {
      setUpdating(false)
    }
  }

  const getCurrentStatusInfo = () => {
    return statusOptions.find(option => option.value === currentStatus) || statusOptions[0]
  }

  const getSelectedStatusInfo = () => {
    return statusOptions.find(option => option.value === selectedStatus) || statusOptions[0]
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Update Cooking Status</h2>
              <p className="text-sm text-gray-600">Order #{orderNumber}</p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-xl font-bold"
              disabled={updating}
            >
              ×
            </button>
          </div>
        </div>

        {/* Current Status */}
        <div className="px-6 py-4 bg-gray-50">
          <p className="text-sm text-gray-600 mb-2">Current Status</p>
          <div className="flex items-center">
            <span className="mr-2">
              {React.createElement(getCurrentStatusInfo().icon, { size: 18 })}
            </span>
            <span className="font-medium text-gray-900">{getCurrentStatusInfo().label}</span>
          </div>
        </div>

        {/* Status Options */}
        <div className="px-6 py-4">
          <p className="text-sm text-gray-600 mb-4">Select New Status</p>
          <div className="space-y-2">
            {statusOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => setSelectedStatus(option.value)}
                disabled={updating}
                className={`w-full text-left p-3 rounded-lg border-2 transition-all ${selectedStatus === option.value
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  } disabled:opacity-50`}
              >
                <div className="flex items-center">
                  <span className="mr-3">
                    {React.createElement(option.icon, { size: 18 })}
                  </span>
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">{option.label}</div>
                    {option.value === currentStatus && (
                      <div className="text-xs text-blue-600">Current Status</div>
                    )}
                  </div>
                  {selectedStatus === option.value && (
                    <div className="w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
                      <div className="w-2 h-2 bg-white rounded-full"></div>
                    </div>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
          <div className="flex space-x-3">
            <button
              onClick={onClose}
              disabled={updating}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleUpdate}
              disabled={updating || selectedStatus === currentStatus}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {updating ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Updating...
                </div>
              ) : selectedStatus === currentStatus ? (
                'No Change'
              ) : (
                `Update to ${getSelectedStatusInfo().label}`
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ChefStatusModal