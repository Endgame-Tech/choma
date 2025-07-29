import React, { useState } from 'react'
import { useAuth } from '../context/AuthContext'

const Header: React.FC = () => {
  const { chef, logout } = useAuth()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'active':
        return 'bg-green-100 text-green-800'
      case 'pending':
        return 'bg-yellow-100 text-yellow-800'
      case 'inactive':
      case 'suspended':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="flex items-center justify-between px-6 py-4">
        {/* Mobile menu button */}
        <div className="flex items-center">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100"
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          
          {/* Mobile logo */}
          <div className="md:hidden ml-2 flex items-center">
            <div className="text-2xl">👨‍🍳</div>
            <h1 className="ml-2 text-lg font-semibold text-gray-900">choma Chef</h1>
          </div>
        </div>

        {/* Right side */}
        <div className="flex items-center space-x-4">
          {/* Chef capacity indicator */}
          {chef?.currentCapacity !== undefined && chef?.maxCapacity !== undefined && (
            <div className="hidden sm:flex items-center space-x-2">
              <span className="text-sm text-gray-600">Capacity:</span>
              <div className="flex items-center space-x-2">
                <div className="w-16 bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-500 h-2 rounded-full transition-all"
                    style={{ 
                      width: `${Math.min((chef.currentCapacity / chef.maxCapacity) * 100, 100)}%` 
                    }}
                  ></div>
                </div>
                <span className="text-sm text-gray-900">
                  {chef.currentCapacity}/{chef.maxCapacity}
                </span>
              </div>
            </div>
          )}

          {/* Availability toggle */}
          {chef?.availability && (
            <div className="flex items-center">
              <span className="text-sm text-gray-600 mr-2">Status:</span>
              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                chef.availability === 'Available' ? 'bg-green-100 text-green-800' :
                chef.availability === 'Busy' ? 'bg-orange-100 text-orange-800' :
                'bg-gray-100 text-gray-800'
              }`}>
                {chef.availability}
              </span>
            </div>
          )}

          {/* Rating */}
          {chef?.rating && (
            <div className="hidden sm:flex items-center">
              <span className="text-sm text-gray-600 mr-1">Rating:</span>
              <span className="text-sm font-medium text-gray-900">{chef.rating}/5</span>
              <span className="text-yellow-400 ml-1">⭐</span>
            </div>
          )}

          {/* Profile dropdown */}
          <div className="relative">
            <button className="flex items-center space-x-2 p-2 rounded-lg hover:bg-gray-100">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                <span className="text-sm">👤</span>
              </div>
              <div className="hidden sm:block text-left">
                <p className="text-sm font-medium text-gray-900">{chef?.fullName}</p>
                <p className={`text-xs px-2 py-0.5 rounded-full ${getStatusColor(chef?.status || '')}`}>
                  {chef?.status}
                </p>
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-white border-t border-gray-200">
          <div className="px-2 pt-2 pb-3 space-y-1">
            <a href="/dashboard" className="block px-3 py-2 text-base font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50 rounded-md">
              📊 Dashboard
            </a>
            <a href="/orders" className="block px-3 py-2 text-base font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50 rounded-md">
              📋 My Orders
            </a>
            <a href="/profile" className="block px-3 py-2 text-base font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50 rounded-md">
              👨‍🍳 Profile
            </a>
            <a href="/earnings" className="block px-3 py-2 text-base font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50 rounded-md">
              💰 Earnings
            </a>
            <button
              onClick={logout}
              className="w-full text-left block px-3 py-2 text-base font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50 rounded-md"
            >
              🚪 Sign out
            </button>
          </div>
        </div>
      )}
    </header>
  )
}

export default Header