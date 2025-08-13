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
  XMarkIcon
} from '@heroicons/react/24/outline'

const navigation = [
  { name: 'Dashboard', href: '/', icon: HomeIcon },
  { name: 'Analytics', href: '/analytics', icon: ChartBarIcon },
  { name: 'Orders', href: '/orders', icon: ClipboardDocumentListIcon },
  { name: 'Chefs', href: '/chefs', icon: UserGroupIcon },
  { name: 'Users', href: '/users', icon: UsersIcon },
  { name: 'Customers', href: '/customers', icon: UsersIcon },
  { name: 'Meals', href: '/meals', icon: CubeIcon },
  { name: 'Meal Plans', href: '/meal-plans', icon: BookOpenIcon },
]

interface SidebarProps {
  isOpen: boolean
  onClose: () => void
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  return (
    <>
      {/* Desktop sidebar */}
      <div className="hidden lg:flex flex-col w-64 bg-choma-brown dark:bg-choma-black shadow-lg transition-colors duration-200">
        <div className="flex items-center h-16 px-6 border-b border-choma-orange/20">
          <h1 className="text-xl font-semibold font-heading text-choma-white">
            <span className="text-choma-orange">choma</span> Admin
          </h1>
        </div>
        
        <nav className="flex-1 px-4 py-6 space-y-2">
          {navigation.map((item) => (
            <NavLink
              key={item.name}
              to={item.href}
              className={({ isActive }) =>
                `flex items-center px-4 py-3 text-sm font-medium rounded-xl transition-all duration-200 ${
                  isActive
                    ? 'bg-choma-orange text-choma-brown shadow-lg transform scale-105'
                    : 'text-choma-white/80 hover:bg-choma-white/10 hover:text-choma-white hover:transform hover:scale-105'
                }`
              }
            >
              <item.icon className="w-5 h-5 mr-3" />
              {item.name}
            </NavLink>
          ))}
        </nav>
        
        {/* Footer */}
        <div className="px-6 py-4 border-t border-choma-orange/20">
          <p className="text-xs text-choma-white/60 text-center">
            © {new Date().getFullYear()} Choma. All rights reserved.
          </p>
        </div>
      </div>

      {/* Mobile sidebar */}
      <div className={`lg:hidden fixed inset-y-0 left-0 z-30 w-64 bg-choma-brown dark:bg-choma-black shadow-lg transform transition-transform duration-300 ease-in-out ${
        isOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <div className="flex items-center justify-between h-16 px-6 border-b border-choma-orange/20">
          <h1 className="text-xl font-semibold font-heading text-choma-white">
            <span className="text-choma-orange">choma</span> Admin
          </h1>
          <button
            onClick={onClose}
            className="p-2 text-choma-white/80 hover:text-choma-white transition-colors"
            aria-label="Close menu"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>
        
        <nav className="flex-1 px-4 py-6 space-y-2">
          {navigation.map((item) => (
            <NavLink
              key={item.name}
              to={item.href}
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center px-4 py-3 text-sm font-medium rounded-xl transition-all duration-200 ${
                  isActive
                    ? 'bg-choma-orange text-choma-brown shadow-lg'
                    : 'text-choma-white/80 hover:bg-choma-white/10 hover:text-choma-white'
                }`
              }
            >
              <item.icon className="w-5 h-5 mr-3" />
              {item.name}
            </NavLink>
          ))}
        </nav>
        
        {/* Footer */}
        <div className="px-6 py-4 border-t border-choma-orange/20">
          <p className="text-xs text-choma-white/60 text-center">
            © {new Date().getFullYear()} Choma. All rights reserved.
          </p>
        </div>
      </div>
    </>
  )
}

export default Sidebar