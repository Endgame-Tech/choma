import React from 'react'
import type { Chef } from '../../types'

interface ChefPerformanceData extends Chef {
  completionRate: number
  avgDeliveryTime: number
  ordersThisMonth: number
  earningsThisMonth: number
  customerSatisfaction: number
}

interface ChefPerformanceCardProps {
  chef: ChefPerformanceData
  onClick?: () => void
}

const ChefPerformanceCard: React.FC<ChefPerformanceCardProps> = ({ chef, onClick }) => {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0
    }).format(amount)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Active': return 'bg-green-100 text-green-800'
      case 'Busy': return 'bg-yellow-100 text-yellow-800'
      case 'Offline': return 'bg-gray-100 text-gray-800'
      default: return 'bg-red-100 text-red-800'
    }
  }

  const getAvailabilityColor = (availability: string) => {
    switch (availability) {
      case 'Available': return 'bg-green-100 text-green-800'
      case 'Busy': return 'bg-yellow-100 text-yellow-800'
      case 'Offline': return 'bg-gray-100 text-gray-800'
      default: return 'bg-red-100 text-red-800'
    }
  }

  const getPerformanceRating = (completionRate: number, rating: number) => {
    const avgScore = (completionRate + rating * 20) / 2
    if (avgScore >= 90) return { label: 'Excellent', color: 'text-green-600' }
    if (avgScore >= 80) return { label: 'Very Good', color: 'text-blue-600' }
    if (avgScore >= 70) return { label: 'Good', color: 'text-yellow-600' }
    if (avgScore >= 60) return { label: 'Fair', color: 'text-orange-600' }
    return { label: 'Needs Improvement', color: 'text-red-600' }
  }

  const performance = getPerformanceRating(chef.completionRate, chef.rating)

  return (
    <div 
      className={`bg-white rounded-lg shadow-sm border p-6 transition-all duration-200 ${
        onClick ? 'cursor-pointer hover:shadow-md hover:border-gray-300' : ''
      }`}
      onClick={onClick}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center">
          <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
            {chef.profileImage ? (
              <img 
                src={chef.profileImage} 
                alt={chef.fullName}
                className="w-full h-full rounded-full object-cover"
              />
            ) : (
              <span className="text-white font-semibold text-lg">
                {chef.fullName.charAt(0)}
              </span>
            )}
          </div>
          <div className="ml-3">
            <h4 className="font-semibold text-gray-900">{chef.fullName}</h4>
            <p className="text-sm text-gray-600">{chef.chefId}</p>
          </div>
        </div>
        
        <div className="flex flex-col items-end space-y-1">
          <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(chef.status)}`}>
            {chef.status}
          </span>
          <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getAvailabilityColor(chef.availability)}`}>
            {chef.availability}
          </span>
        </div>
      </div>

      {/* Performance Metrics */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="text-center">
          <p className="text-2xl font-bold text-blue-600">{chef.rating.toFixed(1)}</p>
          <p className="text-xs text-gray-600">Rating</p>
          <div className="flex justify-center mt-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <span 
                key={star}
                className={`text-sm ${star <= chef.rating ? 'text-yellow-400' : 'text-gray-300'}`}
              >
                ⭐
              </span>
            ))}
          </div>
        </div>
        
        <div className="text-center">
          <p className="text-2xl font-bold text-green-600">{chef.completionRate}%</p>
          <p className="text-xs text-gray-600">Completion Rate</p>
          <p className={`text-xs mt-1 font-medium ${performance.color}`}>
            {performance.label}
          </p>
        </div>
      </div>

      {/* Capacity & Orders */}
      <div className="mb-4">
        <div className="flex items-center justify-between text-sm mb-2">
          <span className="text-gray-600">Capacity</span>
          <span className="font-medium">{chef.currentCapacity}/{chef.maxCapacity}</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className={`h-2 rounded-full ${
              chef.currentCapacity >= chef.maxCapacity 
                ? 'bg-red-500' 
                : chef.currentCapacity > chef.maxCapacity * 0.8 
                ? 'bg-yellow-500' 
                : 'bg-green-500'
            }`}
            style={{ width: `${Math.min((chef.currentCapacity / chef.maxCapacity) * 100, 100)}%` }}
          />
        </div>
      </div>

      {/* Monthly Stats */}
      <div className="border-t border-gray-100 pt-4 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">This Month</span>
          <span className="text-sm font-medium text-gray-900">{chef.ordersThisMonth} orders</span>
        </div>
        
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">Earnings</span>
          <span className="text-sm font-medium text-green-600">
            {formatCurrency(chef.earningsThisMonth)}
          </span>
        </div>
        
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">Avg Delivery</span>
          <span className="text-sm font-medium text-gray-900">{chef.avgDeliveryTime} min</span>
        </div>
        
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">Total Completed</span>
          <span className="text-sm font-medium text-blue-600">{chef.totalOrdersCompleted}</span>
        </div>
      </div>

      {/* Location */}
      <div className="mt-4 pt-3 border-t border-gray-100">
        <div className="flex items-center text-sm text-gray-600">
          <span className="mr-1">📍</span>
          <span>{chef.location.city}{chef.location.area ? `, ${chef.location.area}` : ''}</span>
        </div>
      </div>
    </div>
  )
}

export default ChefPerformanceCard