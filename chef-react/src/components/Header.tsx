import React, { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import ThemeToggle from './ThemeToggle'
import logo from '../assets/logo.svg'
import {
  Menu,
  BarChart3,
  FileText,
  User,
  DollarSign,
  LogOut,
  Star
} from 'lucide-react'

const Header: React.FC = () => {
  const { chef, logout } = useAuth()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'active':
        return 'bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100'
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-800 dark:text-yellow-100'
      case 'inactive':
      case 'suspended':
        return 'bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-100'
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
    }
  }

  return (
    <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700 transition-colors duration-200">
      <div className="flex items-center justify-between px-6 py-4">
        {/* Mobile menu button */}
        <div className="flex items-center">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-md text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            title="Toggle mobile menu"
          >
            <Menu size={24} />
          </button>

          {/* Mobile logo */}
          <div className="md:hidden ml-2 flex items-center">
            <img src={logo} alt="Choma Logo" className="h-6 w-auto" />
            <h1 className="ml-2 text-lg font-semibold text-gray-900 dark:text-white">choma Chef</h1>
          </div>
        </div>

        {/* Right side */}
        <div className="flex items-center space-x-4">
          {/* Theme Toggle */}
          <ThemeToggle />

          {/* Chef capacity indicator */}
          {chef?.currentCapacity !== undefined && chef?.maxCapacity !== undefined && (
            <div className="hidden sm:flex items-center space-x-2">
              <span className="text-sm text-gray-600 dark:text-gray-300">Capacity:</span>
              <div className="flex items-center space-x-2">
                <div className="w-16 bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                  <div
                    className="bg-blue-500 dark:bg-blue-400 h-2 rounded-full transition-all"
                    style={{
                      width: `${Math.min((chef.currentCapacity / chef.maxCapacity) * 100, 100)}%`
                    }}
                  ></div>
                </div>
                <span className="text-sm text-gray-900 dark:text-white">
                  {chef.currentCapacity}/{chef.maxCapacity}
                </span>
              </div>
            </div>
          )}

          {/* Availability toggle */}
          {chef?.availability && (
            <div className="flex items-center">
              <span className="text-sm text-gray-600 dark:text-gray-300 mr-2">Status:</span>
              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${chef.availability === 'Available' ? 'bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100' :
                chef.availability === 'Busy' ? 'bg-orange-100 text-orange-800 dark:bg-orange-800 dark:text-orange-100' :
                  'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                }`}>
                {chef.availability}
              </span>
            </div>
          )}

          {/* Rating */}
          {chef?.rating && (
            <div className="hidden sm:flex items-center">
              <span className="text-sm text-gray-600 dark:text-gray-300 mr-1">Rating:</span>
              <span className="text-sm font-medium text-gray-900 dark:text-white">{chef.rating}/5</span>
              <Star className="text-yellow-400 ml-1" size={16} fill="currentColor" />
            </div>
          )}

          {/* Profile dropdown */}
          <div className="relative">
            <button className="flex items-center space-x-2 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
              <div className="w-8 h-8 bg-blue-100 dark:bg-blue-800 rounded-full flex items-center justify-center">
                <User className="text-sm text-blue-600 dark:text-blue-300" size={16} />
              </div>
              <div className="hidden sm:block text-left">
                <p className="text-sm font-medium text-gray-900 dark:text-white">{chef?.fullName}</p>
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
        <div className="md:hidden bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
          <div className="px-2 pt-2 pb-3 space-y-1">
            <a href="/dashboard" className="flex items-center px-3 py-2 text-base font-medium text-gray-700 dark:text-gray-200 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-700 rounded-md transition-colors">
              <BarChart3 size={18} className="mr-2" /> Dashboard
            </a>
            <a href="/orders" className="flex items-center px-3 py-2 text-base font-medium text-gray-700 dark:text-gray-200 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-700 rounded-md transition-colors">
              <FileText size={18} className="mr-2" /> My Orders
            </a>
            <a href="/profile" className="flex items-center px-3 py-2 text-base font-medium text-gray-700 dark:text-gray-200 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-700 rounded-md transition-colors">
              <User size={18} className="mr-2" /> Profile
            </a>
            <a href="/earnings" className="flex items-center px-3 py-2 text-base font-medium text-gray-700 dark:text-gray-200 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-700 rounded-md transition-colors">
              <DollarSign size={18} className="mr-2" /> Earnings
            </a>
            <button
              onClick={logout}
              className="w-full text-left flex items-center px-3 py-2 text-base font-medium text-gray-700 dark:text-gray-200 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-700 rounded-md transition-colors"
            >
              <LogOut size={18} className="mr-2" /> Sign out
            </button>
          </div>
        </div>
      )}
    </header>
  )
}

export default Header