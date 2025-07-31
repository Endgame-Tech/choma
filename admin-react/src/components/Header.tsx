import React from 'react'
import { BellIcon } from '@heroicons/react/24/outline'
import ThemeToggle from './ThemeToggle'

const Header: React.FC = () => {
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
            
            <div className="flex items-center space-x-3">
              <div className="flex-shrink-0">
                <div className="w-10 h-10 bg-choma-brown dark:bg-choma-orange rounded-full flex items-center justify-center">
                  <span className="text-sm font-medium text-choma-white dark:text-choma-brown">A</span>
                </div>
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-choma-brown dark:text-choma-white">Admin User</p>
                <p className="text-sm text-choma-brown/60 dark:text-choma-white/60">admin@choma.com</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}

export default Header