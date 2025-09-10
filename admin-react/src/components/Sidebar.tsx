import React from 'react'
import { NavLink } from 'react-router-dom'
import {
  HomeIcon,
  ChartBarIcon,
  ClipboardDocumentListIcon,
  UserGroupIcon,
  UsersIcon,
  BookOpenIcon,
  CubeIcon,
  CogIcon,
  XMarkIcon,
  MegaphoneIcon,
  TruckIcon,
  ReceiptPercentIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline'
import { usePermissionCheck } from '../contexts/PermissionContext'
import type { AdminPermissions } from '../types/admin'

const navigationItems = [
  { name: 'Dashboard', href: '/', icon: HomeIcon, permission: 'dashboard' as keyof AdminPermissions },
  { name: 'Analytics', href: '/analytics', icon: ChartBarIcon, permission: 'analytics' as keyof AdminPermissions },
  { name: 'Orders', href: '/orders', icon: ClipboardDocumentListIcon, permission: 'orders' as keyof AdminPermissions },
  { name: 'Customers', href: '/customers', icon: UsersIcon, permission: 'customers' as keyof AdminPermissions },
  { name: 'Chefs', href: '/chefs', icon: UserGroupIcon, permission: 'chefs' as keyof AdminPermissions },
  { name: 'Drivers', href: '/drivers', icon: TruckIcon, permission: 'drivers' as keyof AdminPermissions },
  // { name: 'Users', href: '/users', icon: UsersIcon, permission: 'users' as keyof AdminPermissions },
  { name: 'Meals', href: '/meals', icon: CubeIcon, permission: 'meals' as keyof AdminPermissions },
  { name: 'Meal Plans', href: '/meal-plans', icon: BookOpenIcon, permission: 'mealPlans' as keyof AdminPermissions },
  { name: 'Promo Banners', href: '/promo-banners', icon: MegaphoneIcon, permission: 'banners' as keyof AdminPermissions },
  { name: 'Discounts', href: '/discounts', icon: ReceiptPercentIcon, permission: 'banners' as keyof AdminPermissions },
  // Delivery Prices: permission key is 'deliveryPrices' (see AdminPermissions)
  { name: 'Delivery Prices', href: '/delivery-prices', icon: TruckIcon, permission: 'deliveryPrices' as keyof AdminPermissions },
  { name: 'Recurring Deliveries', href: '/recurring-deliveries', icon: ArrowPathIcon, permission: 'orders' as keyof AdminPermissions },
  { name: 'Admin Management', href: '/admin-management', icon: CogIcon, permission: 'adminManagement' as keyof AdminPermissions },
]

interface SidebarProps {
  isOpen: boolean
  onClose: () => void
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const { hasAnyPermission, currentAdmin } = usePermissionCheck();

  // Filter navigation items based on permissions
  const allowedNavigation = navigationItems.filter(item =>
    hasAnyPermission(item.permission)
  );

  return (
    <>
      {/* Desktop sidebar */}
      <div className="hidden lg:flex flex-col w-64 xl:w-72 bg-choma-brown dark:bg-choma-black shadow-lg transition-colors duration-200 min-h-screen">
        <div className="flex items-center h-16 px-4 xl:px-6 border-b border-choma-orange/20">
          <h1 className="text-lg xl:text-xl font-semibold font-heading text-choma-white truncate">
            <span className="text-choma-orange">choma</span> Admin
          </h1>
        </div>

        <nav className="flex-1 px-3 xl:px-4 py-4 xl:py-6 space-y-1 xl:space-y-2 overflow-y-auto">
          {allowedNavigation.map((item) => (
            <NavLink
              key={item.name}
              to={item.href}
              className={({ isActive }) =>
                `flex items-center px-3 xl:px-4 py-2 xl:py-3 text-xs xl:text-sm font-medium rounded-lg xl:rounded-xl transition-all duration-200 ${isActive
                  ? 'bg-choma-orange text-choma-brown shadow-lg transform scale-105'
                  : 'text-choma-white/80 hover:bg-choma-white/10 hover:text-choma-white hover:transform hover:scale-105'
                }`
              }
            >
              <item.icon className="w-4 h-4 xl:w-5 xl:h-5 mr-2 xl:mr-3 flex-shrink-0" />
              <span className="truncate">{item.name}</span>
            </NavLink>
          ))}
        </nav>

        {/* Footer */}
        <div className="px-3 xl:px-6 py-3 xl:py-4 bg-choma-brown border-t border-choma-orange/20 flex-shrink-0">
          {currentAdmin && (
            <div className="mb-2 xl:mb-3 text-center">
              <p className="text-xs text-choma-white/80 font-medium truncate">
                {currentAdmin.firstName} {currentAdmin.lastName}
              </p>
              <p className="text-xs text-choma-white/60 truncate">
                {currentAdmin.role.name}
                {currentAdmin.isAlphaAdmin && (
                  <span className="ml-1 px-1 py-0.5 bg-choma-orange/20 text-choma-orange rounded text-[10px]">
                    Alpha
                  </span>
                )}
              </p>
            </div>
          )}
          <p className="text-xs text-choma-white/60 text-center hidden xl:block">
            © {new Date().getFullYear()} Choma. All rights reserved.
          </p>
        </div>
      </div>

      {/* Mobile sidebar */}
      <div className={`lg:hidden fixed inset-y-0 left-0 z-30 w-64 bg-choma-brown dark:bg-choma-black shadow-lg transform transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex items-center justify-between h-16 px-4 border-b border-choma-orange/20">
          <h1 className="text-lg font-semibold font-heading text-choma-white truncate">
            <span className="text-choma-orange">choma</span> Admin
          </h1>
          <button
            onClick={onClose}
            className="p-2 text-choma-white/80 hover:text-choma-white transition-colors flex-shrink-0"
            aria-label="Close menu"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {allowedNavigation.map((item) => (
            <NavLink
              key={item.name}
              to={item.href}
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${isActive
                  ? 'bg-choma-orange text-choma-brown shadow-lg'
                  : 'text-choma-white/80 hover:bg-choma-white/10 hover:text-choma-white'
                }`
              }
            >
              <item.icon className="w-4 h-4 mr-2 flex-shrink-0" />
              <span className="truncate">{item.name}</span>
            </NavLink>
          ))}
        </nav>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-choma-orange/20 flex-shrink-0">
          {currentAdmin && (
            <div className="mb-2 text-center">
              <p className="text-xs text-choma-white/80 font-medium truncate">
                {currentAdmin.firstName} {currentAdmin.lastName}
              </p>
              <p className="text-xs text-choma-white/60 truncate">
                {currentAdmin.role.name}
                {currentAdmin.isAlphaAdmin && (
                  <span className="ml-1 px-1 py-0.5 bg-choma-orange/20 text-choma-orange rounded text-[10px]">
                    Alpha
                  </span>
                )}
              </p>
            </div>
          )}
        </div>
      </div>
    </>
  )
}

export default Sidebar