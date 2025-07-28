import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: '📊' },
  { name: 'My Orders', href: '/orders', icon: '📋' },
  { name: 'Profile', href: '/profile', icon: '👨‍🍳' },
  { name: 'Earnings', href: '/earnings', icon: '💰' },
  { name: 'Notifications', href: '/notifications', icon: '🔔' },
]

export default function Sidebar() {
  const location = useLocation()
  const { chef, logout } = useAuth()

  return (
    <div className="hidden md:flex md:w-64 md:flex-col">
      <div className="flex flex-col flex-grow pt-5 bg-white overflow-y-auto border-r border-gray-200">
        <div className="flex items-center flex-shrink-0 px-4">
          <div className="text-2xl">👨‍🍳</div>
          <h1 className="ml-2 text-xl font-semibold text-gray-900">choma Chef</h1>
        </div>

        {/* Chef Info */}
        <div className="mt-6 px-4 pb-4 border-b border-gray-200">
          <div className="flex items-center">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
              <span className="text-lg">👤</span>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-900">{chef?.fullName}</p>
              <p className="text-xs text-gray-500">{chef?.email}</p>
              <div className="flex items-center mt-1">
                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                  chef?.status === 'Active' ? 'bg-green-100 text-green-800' :
                  chef?.status === 'Pending' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-red-100 text-red-800'
                }`}>
                  {chef?.status}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="mt-6 flex-1 px-4 pb-4 space-y-1">
          {navigation.map((item) => {
            const isCurrent = location.pathname === item.href
            return (
              <Link
                key={item.name}
                to={item.href}
                className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md transition-colors ${
                  isCurrent
                    ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-700'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                <span className="mr-3 text-lg">{item.icon}</span>
                {item.name}
              </Link>
            )
          })}
        </nav>

        {/* Logout */}
        <div className="flex-shrink-0 p-4 border-t border-gray-200">
          <button
            onClick={logout}
            className="group flex w-full items-center px-2 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900 rounded-md transition-colors"
          >
            <span className="mr-3 text-lg">🚪</span>
            Sign out
          </button>
        </div>
      </div>
    </div>
  )
}