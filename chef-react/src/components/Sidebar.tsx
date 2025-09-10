import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import logo from '../assets/logo.svg'
import {
  BarChart3,
  FileText,
  User,
  DollarSign,
  Bell,
  LogOut,
  Calendar
} from 'lucide-react'

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: BarChart3 },
  { name: 'My Orders', href: '/orders', icon: FileText },
  { name: 'Subscriptions', href: '/subscriptions', icon: Calendar },
  { name: 'Profile', href: '/profile', icon: User },
  { name: 'Earnings', href: '/earnings', icon: DollarSign },
  { name: 'Notifications', href: '/notifications', icon: Bell },
]

const Sidebar: React.FC = () => {
  const location = useLocation()
  const { chef, logout } = useAuth()

  return (
    <div className="hidden md:flex md:w-64 md:flex-col">
      <div className="flex flex-col flex-grow pt-5 bg-white dark:bg-gray-800 overflow-y-auto border-r border-gray-200 dark:border-gray-700 transition-colors duration-200">
        <div className="flex items-center flex-shrink-0 px-4">
          <img src={logo} alt="Choma Logo" className="h-8 w-auto" />
          <h1 className="ml-2 text-xl font-semibold text-gray-900 dark:text-white">choma Chef</h1>
        </div>

        {/* Chef Info */}
        <div className="mt-6 px-4 pb-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center">
            <div className="w-10 h-10 bg-blue-100 dark:bg-blue-800 rounded-full flex items-center justify-center">
              <User size={20} className="text-blue-600 dark:text-blue-300" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-900 dark:text-white">{chef?.fullName}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">{chef?.email}</p>
              <div className="flex items-center mt-1">
                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${chef?.status === 'Active' ? 'bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100' :
                  chef?.status === 'Pending' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-800 dark:text-yellow-100' :
                    'bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-100'
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
                className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md transition-colors ${isCurrent
                  ? 'bg-blue-50 dark:bg-blue-900 text-blue-700 dark:text-blue-100 border-r-2 border-blue-700 dark:border-blue-400'
                  : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white'
                  }`}
              >
                <item.icon size={18} className="mr-3" />
                {item.name}
              </Link>
            )
          })}
        </nav>

        {/* Logout */}
        <div className="flex-shrink-0 p-4 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={logout}
            className="group flex w-full items-center px-2 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white rounded-md transition-colors"
          >
            <LogOut size={18} className="mr-3" />
            Sign out
          </button>
        </div>
      </div>
    </div>
  )
}

export default Sidebar