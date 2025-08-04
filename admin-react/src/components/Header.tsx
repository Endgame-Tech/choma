import React, { useState, useRef, useEffect } from 'react'
import { BellIcon, ArrowRightOnRectangleIcon } from '@heroicons/react/24/outline'
import { useAuth } from '../contexts/AuthContext'
import ThemeToggle from './ThemeToggle'

const Header: React.FC = () => {
  const [showUserMenu, setShowUserMenu] = useState(false)
  const { logout } = useAuth()
  const menuRef = useRef<HTMLDivElement>(null)

  const handleLogout = () => {
    logout()
    setShowUserMenu(false)
  }

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])
  return (
    <header className="bg-choma-white dark:bg-choma-black shadow-sm border-b border-choma-brown/10 dark:border-choma-orange/20 transition-colors duration-200">
      <div className="px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-semibold font-heading text-choma-brown dark:text-choma-white">
              Admin Dashboard
            </h2>
          </div>
          
          <div className="flex items-center space-x-4">
            <ThemeToggle />
            
            <button className="p-2 text-choma-brown/60 dark:text-choma-white/60 hover:text-choma-brown dark:hover:text-choma-white transition-colors">
              <BellIcon className="w-6 h-6" />
            </button>
            
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center space-x-3 hover:bg-choma-brown/5 dark:hover:bg-choma-orange/10 rounded-lg p-2 transition-colors"
              >
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 bg-choma-brown dark:bg-choma-orange rounded-full flex items-center justify-center">
                    <span className="text-sm font-medium text-choma-white dark:text-choma-brown">A</span>
                  </div>
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-choma-brown dark:text-choma-white">Admin User</p>
                  <p className="text-sm text-choma-brown/60 dark:text-choma-white/60">getchoma@gmail.com</p>
                </div>
              </button>

              {showUserMenu && (
                <div className="absolute right-0 mt-2 w-48 bg-white/95 dark:bg-gray-800/95 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-50">
                  <button
                    onClick={handleLogout}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center space-x-2"
                  >
                    <ArrowRightOnRectangleIcon className="w-4 h-4" />
                    <span>Sign out</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}

export default Header