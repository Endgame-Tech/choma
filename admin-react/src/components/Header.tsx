import React, { useState, useRef, useEffect } from 'react'
import { BellIcon, ArrowRightOnRectangleIcon, Bars3Icon, UserCircleIcon, KeyIcon, Cog6ToothIcon, ShieldCheckIcon } from '@heroicons/react/24/outline'
import { useAuth } from '../contexts/AuthContext'
import ThemeToggle from './ThemeToggle'
import TwoFactorSetup from './TwoFactorSetup'
import BackupCodesManager from './BackupCodesManager'
import NotificationDropdown from './NotificationDropdown'
import { TwoFactorStatus } from '../types/twoFactor'
import { twoFactorApi } from '../services/twoFactorApi'

interface HeaderProps {
  onMenuClick: () => void
}

const Header: React.FC<HeaderProps> = ({ onMenuClick }) => {
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [showTwoFactorSetup, setShowTwoFactorSetup] = useState(false)
  const [showBackupCodesManager, setShowBackupCodesManager] = useState(false)
  const [twoFactorStatus, setTwoFactorStatus] = useState<TwoFactorStatus | null>(null)
  const [loading2FA, setLoading2FA] = useState(false)
  const { logout, admin } = useAuth()
  const menuRef = useRef<HTMLDivElement>(null)

  const handleLogout = () => {
    logout()
    setShowUserMenu(false)
  }


  const loadTwoFactorStatus = async () => {
    try {
      setLoading2FA(true)
      const status = await twoFactorApi.getTwoFactorStatus()
      setTwoFactorStatus(status)
    } catch (error) {
      console.error('Error loading 2FA status:', error)
      // Set a default disabled status to prevent UI blocking
      setTwoFactorStatus({
        isEnabled: false,
        lastVerified: undefined,
        backupCodesRemaining: 0
      })
    } finally {
      setLoading2FA(false)
    }
  }

  const handleTwoFactorSetup = () => {
    setShowTwoFactorSetup(true)
    setShowUserMenu(false)
  }

  const handleBackupCodes = () => {
    setShowBackupCodesManager(true)
    setShowUserMenu(false)
  }

  const handleTwoFactorComplete = () => {
    loadTwoFactorStatus() // Refresh status after setup
  }

  const handleBackupCodesChanged = () => {
    loadTwoFactorStatus() // Refresh status after backup codes change
  }

  // Load 2FA status when component mounts or admin changes
  useEffect(() => {
    if (admin) {
      loadTwoFactorStatus()
    }
  }, [admin])

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
      <div className="px-3 sm:px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            {/* Mobile menu button */}
            <button
              onClick={onMenuClick}
              className="lg:hidden p-2 text-choma-brown/60 dark:text-choma-white/60 hover:text-choma-brown dark:hover:text-choma-white transition-colors"
              aria-label="Open menu"
            >
              <Bars3Icon className="w-6 h-6" />
            </button>

            <div>
              <h2 className="text-xl sm:text-2xl font-semibold font-heading text-choma-brown dark:text-choma-white">
                <span className="hidden sm:inline">Admin Dashboard</span>
                <span className="sm:hidden">Dashboard</span>
              </h2>
            </div>
          </div>

          <div className="flex items-center space-x-2 sm:space-x-4">
            <ThemeToggle />

            <NotificationDropdown />

            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center space-x-2 sm:space-x-3 hover:bg-choma-brown/5 dark:hover:bg-choma-orange/10 rounded-lg p-2 transition-colors"
                aria-label="Open user menu"
                {...(showUserMenu ? { 'aria-expanded': 'true' } : { 'aria-expanded': 'false' })}
              >
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 bg-choma-brown dark:bg-choma-orange rounded-full flex items-center justify-center">
                    <span className="text-xs sm:text-sm font-medium text-choma-white dark:text-choma-brown">
                      {admin?.firstName ? admin.firstName.charAt(0).toUpperCase() : 'A'}
                    </span>
                  </div>
                </div>
                <div className="min-w-0 hidden sm:block">
                  <p className="text-sm font-medium text-choma-brown dark:text-choma-white">
                    {admin ? `${admin.firstName} ${admin.lastName}` : 'Admin User'}
                  </p>
                  <p className="text-sm text-choma-brown/60 dark:text-choma-white/60">
                    {admin?.email || 'Loading...'}
                  </p>
                </div>
              </button>

              {showUserMenu && (
                <div className="absolute right-0 mt-2 w-56 bg-white/95 dark:bg-gray-800/95 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-50">
                  <div className="px-4 py-2 border-b border-gray-200 dark:border-gray-600 sm:hidden">
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      {admin ? `${admin.firstName} ${admin.lastName}` : 'Admin User'}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {admin?.email || 'Loading...'}
                    </p>
                  </div>

                  {/* Profile Section */}
                  <div className="py-1">
                    <button
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center space-x-2"
                    >
                      <UserCircleIcon className="w-4 h-4" />
                      <span>View Profile</span>
                    </button>
                  </div>

                  {/* Security Section */}
                  <div className="border-t border-gray-200 dark:border-gray-600 py-1">
                    <div className="px-4 py-2">
                      <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Security
                      </p>
                    </div>

                    <button
                      onClick={handleTwoFactorSetup}
                      disabled={loading2FA}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center space-x-2 disabled:opacity-50"
                    >
                      <ShieldCheckIcon className="w-4 h-4" />
                      <div className="flex-1 flex items-center justify-between">
                        <span>Two-Factor Auth</span>
                        {loading2FA ? (
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse"></div>
                        ) : twoFactorStatus?.isEnabled ? (
                          <div className="w-2 h-2 bg-green-500 rounded-full" title="2FA Enabled"></div>
                        ) : (
                          <div className="w-2 h-2 bg-gray-400 rounded-full" title="2FA Disabled"></div>
                        )}
                      </div>
                    </button>

                    {twoFactorStatus?.isEnabled && (
                      <button
                        onClick={handleBackupCodes}
                        className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center space-x-2"
                      >
                        <KeyIcon className="w-4 h-4" />
                        <div className="flex-1 flex items-center justify-between">
                          <span>Backup Codes</span>
                          {twoFactorStatus.backupCodes && twoFactorStatus.backupCodes.remaining <= 2 && (
                            <div className="text-xs text-orange-500 font-medium">
                              {twoFactorStatus.backupCodes.remaining} left
                            </div>
                          )}
                        </div>
                      </button>
                    )}

                    <button
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center space-x-2"
                    >
                      <Cog6ToothIcon className="w-4 h-4" />
                      <span>Security Settings</span>
                    </button>
                  </div>

                  {/* Sign Out */}
                  <div className="border-t border-gray-200 dark:border-gray-600 py-1">
                    <button
                      onClick={handleLogout}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center space-x-2"
                    >
                      <ArrowRightOnRectangleIcon className="w-4 h-4" />
                      <span>Sign out</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Two-Factor Setup Modal */}
      {showTwoFactorSetup && (
        <TwoFactorSetup
          isOpen={showTwoFactorSetup}
          onClose={() => setShowTwoFactorSetup(false)}
          onSetupComplete={handleTwoFactorComplete}
        />
      )}

      {/* Backup Codes Manager Modal */}
      {showBackupCodesManager && (
        <BackupCodesManager
          isOpen={showBackupCodesManager}
          onClose={() => setShowBackupCodesManager(false)}
          onBackupCodesChanged={handleBackupCodesChanged}
        />
      )}
    </header>
  )
}

export default Header