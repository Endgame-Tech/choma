import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
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
  ArrowPathIcon,
  RectangleGroupIcon,
  ClipboardDocumentCheckIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from '@heroicons/react/24/outline';
import { usePermissionCheck } from '../contexts/PermissionContext';
import type { AdminPermissions } from '../types/admin';

const navigationItems = [
  { name: 'Dashboard', href: '/', icon: HomeIcon, permission: 'dashboard' as keyof AdminPermissions },
  { name: 'Analytics', href: '/analytics', icon: ChartBarIcon, permission: 'analytics' as keyof AdminPermissions },
  { name: 'Orders', href: '/orders', icon: ClipboardDocumentListIcon, permission: 'orders' as keyof AdminPermissions },
  { name: 'Customers', href: '/customers', icon: UsersIcon, permission: 'customers' as keyof AdminPermissions },
  { name: 'Chefs', href: '/chefs', icon: UserGroupIcon, permission: 'chefs' as keyof AdminPermissions },
  { name: 'Drivers', href: '/drivers', icon: TruckIcon, permission: 'drivers' as keyof AdminPermissions },
  { name: 'Meals', href: '/meals', icon: CubeIcon, permission: 'meals' as keyof AdminPermissions },
  { name: 'Meal Plans', href: '/meal-plans', icon: BookOpenIcon, permission: 'mealPlans' as keyof AdminPermissions },
  { name: 'Custom Meals', href: '/custom-meals', icon: RectangleGroupIcon, permission: 'meals' as keyof AdminPermissions },
  { name: 'Custom Meal Plans', href: '/custom-meal-plans', icon: ClipboardDocumentCheckIcon, permission: 'orders' as keyof AdminPermissions },
  { name: 'Promo Banners', href: '/promo-banners', icon: MegaphoneIcon, permission: 'banners' as keyof AdminPermissions },
  { name: 'Discounts', href: '/discounts', icon: ReceiptPercentIcon, permission: 'banners' as keyof AdminPermissions },
  { name: 'Delivery Prices', href: '/delivery-prices', icon: TruckIcon, permission: 'deliveryPrices' as keyof AdminPermissions },
  { name: 'Recurring Deliveries', href: '/recurring-deliveries', icon: ArrowPathIcon, permission: 'orders' as keyof AdminPermissions },
  { name: 'Subscription Management', href: '/subscription-management', icon: CogIcon, permission: 'orders' as keyof AdminPermissions },
  { name: 'Admin Management', href: '/admin-management', icon: CogIcon, permission: 'adminManagement' as keyof AdminPermissions },
];

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const { hasAnyPermission, currentAdmin } = usePermissionCheck();
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Filter navigation items based on permissions
  const allowedNavigation = navigationItems.filter(item =>
    hasAnyPermission(item.permission)
  );

  const scaleClass = isCollapsed ? '' : 'transform scale-105';

  return (
    <>
      {/* Desktop sidebar */}
      <div className="hidden lg:flex">
        {/* Main sidebar container */}
        <div
          className={`flex flex-col bg-choma-brown dark:bg-choma-black shadow-lg transition-all duration-300 ease-in-out min-h-screen ${isCollapsed ? 'w-20' : 'w-64 xl:w-72'
            }`}
        >
          {/* Header with collapse button */}
          <div className="flex items-center justify-between h-16 px-4 xl:px-6 border-b border-choma-orange/20">
            {!isCollapsed && (
              <h1 className="text-lg xl:text-xl font-semibold font-heading text-choma-white truncate">
                <span className="text-choma-orange">choma</span> Admin
              </h1>
            )}
            <div className="relative group">
              <button
                onClick={() => setIsCollapsed(!isCollapsed)}
                className="p-2 text-choma-white/80 hover:text-choma-white hover:bg-choma-white/10 rounded-lg transition-all duration-200"
                aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              >
                {isCollapsed ? (
                  <ChevronRightIcon className="w-5 h-5" />
                ) : (
                  <ChevronLeftIcon className="w-5 h-5" />
                )}
              </button>

              {/* Tooltip for collapse button */}
              <div
                className="absolute top-1/2 -translate-y-1/2 left-full px-3 py-2 bg-choma-brown/95 dark:bg-choma-black/95 text-choma-white text-xs font-medium rounded-lg shadow-lg border border-choma-orange/30 whitespace-nowrap opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-[10000] pointer-events-none ml-2"
              >
                {isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                <div
                  className="absolute right-full top-1/2 -translate-y-1/2 border-8 border-transparent border-l-0 border-r-choma-brown/95 dark:border-r-choma-black/95"
                ></div>
              </div>
            </div>
          </div>

          <nav className="flex-1 px-3 xl:px-4 py-4 xl:py-6 space-y-1 xl:space-y-2 ">
            {allowedNavigation.map((item) => (
              <div key={item.name} className="relative group">
                <NavLink
                  to={item.href}
                  className={({ isActive }) =>
                    `flex items-center py-2 xl:py-3 text-xs xl:text-sm font-medium rounded-lg xl:rounded-xl transition-all duration-200 ${isCollapsed ? 'justify-center px-3' : 'px-3 xl:px-4'} ${isActive
                      ? `bg-choma-orange text-choma-brown shadow-lg ${scaleClass}`
                      : `text-choma-white/80 hover:bg-choma-white/10 hover:text-choma-white hover:${scaleClass}`
                    }`
                  }
                >
                  <item.icon
                    className={`${isCollapsed ? 'w-5 h-5' : 'w-4 h-4 xl:w-5 xl:h-5 mr-2 xl:mr-3'
                      } flex-shrink-0`}
                  />
                  {!isCollapsed && <span className="truncate">{item.name}</span>}
                </NavLink>

                {/* Tooltip for collapsed state - positioned relative to the group */}
                {isCollapsed && (
                  <div
                    className="absolute top-1/2 -translate-y-1/2 left-full px-3 py-2 bg-choma-brown/95 dark:bg-choma-black/95 text-choma-white text-sm font-medium rounded-lg shadow-lg border border-choma-orange/30 whitespace-nowrap opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-[10000] pointer-events-none ml-2"
                  >
                    {item.name}
                    <div className="absolute right-full top-1/2 -translate-y-1/2 border-8 border-transparent border-l-0 border-r-choma-brown/95 dark:border-r-choma-black/95"></div>
                  </div>
                )}
              </div>
            ))}
          </nav>

          {/* Footer */}
          <div
            className={`${isCollapsed ? 'px-2' : 'px-3 xl:px-6'
              } py-3 xl:py-4 bg-choma-brown border-t border-choma-orange/20 flex-shrink-0`}
          >
            {currentAdmin && !isCollapsed && (
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
            {currentAdmin && isCollapsed && (
              <div className="group flex justify-center relative">
                <div className="w-8 h-8 rounded-full bg-choma-orange flex items-center justify-center text-choma-brown text-xs font-bold cursor-default">
                  {currentAdmin.firstName.charAt(0)}
                  {currentAdmin.lastName.charAt(0)}
                </div>

                {/* Tooltip for user info */}
                <span className="absolute left-full top-1/2 -translate-y-1/2 px-3 py-2 bg-choma-brown/95 dark:bg-choma-black/95 text-choma-white text-xs rounded-lg shadow-lg border border-choma-orange/30 whitespace-nowrap opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-[10000] pointer-events-none ml-2">
                  <p className="font-medium">
                    {currentAdmin.firstName} {currentAdmin.lastName}
                  </p>
                  <p className="text-choma-white/60">{currentAdmin.role.name}</p>
                  <div className="absolute right-full top-1/2 -translate-y-1/2 border-8 border-transparent border-l-0 border-r-choma-brown/95 dark:border-r-choma-black/95"></div>
                </span>
              </div>
            )}
            {!isCollapsed && (
              <p className="text-xs text-choma-white/60 text-center hidden xl:block">
                © {new Date().getFullYear()} Choma. All rights reserved.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Mobile sidebar */}
      <div
        className={`lg:hidden fixed inset-y-0 left-0 z-30 w-64 bg-choma-brown dark:bg-choma-black shadow-lg transform transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
      >
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
  );
};

export default Sidebar;