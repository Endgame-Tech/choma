import React from 'react'
import { NavLink } from 'react-router-dom'
import { 
  HomeIcon, 
  ChartBarIcon,
  ClipboardDocumentListIcon, 
  UserGroupIcon, 
  UsersIcon,
  BookOpenIcon,
  CubeIcon
} from '@heroicons/react/24/outline'

const navigation = [
  { name: 'Dashboard', href: '/', icon: HomeIcon },
  { name: 'Advanced Analytics', href: '/analytics', icon: ChartBarIcon },
  { name: 'Orders', href: '/orders', icon: ClipboardDocumentListIcon },
  { name: 'Chefs', href: '/chefs', icon: UserGroupIcon },
  { name: 'Users', href: '/users', icon: UsersIcon },
  { name: 'Customers', href: '/customers', icon: UsersIcon },
  { name: 'Meals', href: '/meals', icon: CubeIcon },
  { name: 'Meal Plans', href: '/meal-plans', icon: BookOpenIcon },
]

const Sidebar: React.FC = () => {
  return (
    <div className="flex flex-col w-64 bg-white shadow-lg">
      <div className="flex items-center h-16 px-6 border-b">
        <h1 className="text-xl font-semibold text-gray-900">choma Admin</h1>
      </div>
      
      <nav className="flex-1 px-4 py-6 space-y-2">
        {navigation.map((item) => (
          <NavLink
            key={item.name}
            to={item.href}
            className={({ isActive }) =>
              `flex items-center px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                isActive
                  ? 'bg-primary-100 text-primary-700 border-r-2 border-primary-500'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`
            }
          >
            <item.icon className="w-5 h-5 mr-3" />
            {item.name}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}

export default Sidebar