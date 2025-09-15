import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useWebSocket } from '../hooks/useWebSocket';
import LocationTracker from './LocationTracker';
import {
  HomeIcon,
  TruckIcon,
  CurrencyDollarIcon,
  UserIcon,
  Bars3Icon,
  XMarkIcon,
  SignalIcon,
  SignalSlashIcon,
  ArrowRightOnRectangleIcon,
  CalendarDaysIcon
} from '@heroicons/react/24/outline';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { driver, logout } = useAuth();
  const { isConnected, status } = useWebSocket();
  const location = useLocation();
  const navigate = useNavigate();

  const navigation = [
    {
      name: 'Dashboard',
      href: '/',
      icon: HomeIcon,
      current: location.pathname === '/'
    },
    {
      name: 'Deliveries',
      href: '/deliveries',
      icon: TruckIcon,
      current: location.pathname.startsWith('/deliveries')
    },
    {
      name: 'Subscriptions',
      href: '/subscriptions',
      icon: CalendarDaysIcon,
      current: location.pathname.startsWith('/subscriptions')
    },
    {
      name: 'Earnings',
      href: '/earnings',
      icon: CurrencyDollarIcon,
      current: location.pathname === '/earnings'
    },
    {
      name: 'Profile',
      href: '/profile',
      icon: UserIcon,
      current: location.pathname === '/profile'
    }
  ];

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <div className="h-screen flex">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 flex z-40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        >
          <div className="fixed inset-0 bg-gray-600 bg-opacity-75" />
        </div>
      )}

      {/* Sidebar */}
      <div className={`${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      } fixed inset-y-0 left-0 z-50 w-64 choma-card transform transition-transform duration-300 ease-in-out md:translate-x-0 md:static md:inset-0 border-r border-gray-100`}>
        
        {/* Sidebar Header */}
        <div className="flex items-center justify-between h-16 px-4 border-b border-gray-100">
          <div className="flex items-center space-x-3">
            <div className="p-2 choma-gradient rounded-xl">
              <TruckIcon className="h-6 w-6 text-choma-white" />
            </div>
            <span className="text-xl font-bold text-gray-900">Choma Driver</span>
          </div>
          
          <button
            onClick={() => setSidebarOpen(false)}
            className="md:hidden p-2 rounded-lg text-gray-500 hover:text-gray-600 hover:bg-gray-100 transition-colors"
            title="Close sidebar"
            aria-label="Close sidebar"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        {/* Connection Status */}
        <div className="px-4 py-3 border-b border-gray-100">
          <div className={`flex items-center space-x-2 px-3 py-2 rounded-xl text-sm font-medium ${
            isConnected ? 'text-green-700 bg-green-100' : 'text-red-700 bg-red-100'
          }`}>
            {isConnected ? (
              <SignalIcon className="h-4 w-4" />
            ) : (
              <SignalSlashIcon className="h-4 w-4" />
            )}
            <span>
              {isConnected ? '🟢 Connected' : '🔴 Offline'}
            </span>
          </div>
          {!isConnected && status.reconnectAttempts > 0 && (
            <div className="text-xs text-gray-500 mt-2 px-3 py-1 bg-yellow-50 rounded-lg">
              ⏳ Reconnecting... ({status.reconnectAttempts}/{status.maxReconnectAttempts})
            </div>
          )}
        </div>

        {/* Driver Info */}
        {driver && (
          <div className="px-4 py-4 border-b border-gray-100">
            <div className="flex items-center space-x-3 p-3 bg-gradient-to-r from-choma-orange/5 to-choma-brown/5 rounded-xl">
              <div className="w-12 h-12 bg-choma-orange/20 rounded-full flex items-center justify-center">
                <UserIcon className="h-6 w-6 text-choma-orange" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 truncate">
                  {driver.fullName}
                </p>
                <p className="text-xs text-gray-500 truncate">
                  🆔 {driver.driverId}
                </p>
              </div>
            </div>
            
            <div className="mt-3 flex justify-center">
              <span className={`inline-flex items-center space-x-1 px-3 py-1 text-xs font-bold rounded-full ${
                driver.status === 'online' ? 'bg-green-100 text-green-800' :
                driver.status === 'on_delivery' ? 'bg-choma-orange/20 text-choma-brown' :
                'bg-gray-100 text-gray-800'
              }`}>
                <span className={`w-2 h-2 rounded-full ${
                  driver.status === 'online' ? 'bg-green-500' :
                  driver.status === 'on_delivery' ? 'bg-choma-orange' :
                  'bg-gray-500'
                }`}></span>
                <span>{driver.status?.charAt(0).toUpperCase() + driver.status?.slice(1)}</span>
              </span>
            </div>
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 px-3 py-6 space-y-2">
          {navigation.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.name}
                to={item.href}
                onClick={() => setSidebarOpen(false)}
                className={`${
                  item.current
                    ? 'bg-choma-brown text-choma-white shadow-lg'
                    : 'text-gray-600 hover:bg-choma-orange/10 hover:text-choma-brown'
                } group flex items-center px-4 py-3 text-sm font-semibold rounded-xl transition-all duration-300 transform hover:scale-105`}
              >
                <Icon
                  className={`${
                    item.current ? 'text-choma-white' : 'text-gray-400 group-hover:text-choma-orange'
                  } mr-3 flex-shrink-0 h-5 w-5`}
                />
                {item.name}
              </Link>
            );
          })}
        </nav>

        {/* Logout */}
        <div className="px-3 pb-4">
          <button
            onClick={handleLogout}
            className="w-full flex items-center px-4 py-3 text-sm font-semibold text-gray-600 hover:bg-red-50 hover:text-red-700 rounded-xl transition-all duration-300 transform hover:scale-105 border border-gray-200 hover:border-red-200"
          >
            <ArrowRightOnRectangleIcon className="mr-3 h-5 w-5 text-gray-400 group-hover:text-red-500" />
            Sign out
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <div className="choma-card shadow-sm border-b border-gray-100 md:hidden">
          <div className="px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-16">
              <div className="flex items-center">
                <button
                  onClick={() => setSidebarOpen(true)}
                  className="p-2 text-gray-500 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                  title="Open sidebar"
                  aria-label="Open sidebar"
                >
                  <Bars3Icon className="h-6 w-6" />
                </button>
                <div className="ml-4 flex items-center space-x-3">
                  <div className="p-1 choma-gradient rounded-lg">
                    <TruckIcon className="h-5 w-5 text-choma-white" />
                  </div>
                  <span className="font-bold text-gray-900">Choma Driver</span>
                </div>
              </div>
              
              <div className="flex items-center">
                <div className={`flex items-center space-x-1 px-3 py-1 rounded-xl text-xs font-medium ${
                  isConnected ? 'text-green-700 bg-green-100' : 'text-red-700 bg-red-100'
                }`}>
                  {isConnected ? (
                    <SignalIcon className="h-3 w-3" />
                  ) : (
                    <SignalSlashIcon className="h-3 w-3" />
                  )}
                  <span>{isConnected ? 'Online' : 'Offline'}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Page content */}
        <main className="flex-1 relative overflow-y-auto focus:outline-none">
          <div className="py-6">
            <div className="w-full mx-auto px-4 sm:px-6 lg:px-8">
              {children}
            </div>
          </div>
        </main>
        
        {/* Continuous Location Tracking */}
        <LocationTracker 
          isActive={true}
          highFrequency={false} // Background tracking with lower frequency
        />
      </div>
    </div>
  );
};

export default Layout;