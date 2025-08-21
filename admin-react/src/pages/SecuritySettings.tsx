import React, { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { 
  ShieldCheckIcon, 
  KeyIcon, 
  DevicePhoneMobileIcon, 
  EyeIcon, 
  EyeSlashIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ClockIcon,
  ComputerDesktopIcon,
  LockClosedIcon
} from '@heroicons/react/24/outline'
import TwoFactorSetup from '../components/TwoFactorSetup'
import BackupCodesManager from '../components/BackupCodesManager'
import { TwoFactorStatus } from '../types/twoFactor'
import { twoFactorApi } from '../services/twoFactorApi'

const SecuritySettings: React.FC = () => {
  const { admin } = useAuth()
  const [showTwoFactorSetup, setShowTwoFactorSetup] = useState(false)
  const [showBackupCodesManager, setShowBackupCodesManager] = useState(false)
  const [twoFactorStatus, setTwoFactorStatus] = useState<TwoFactorStatus | null>(null)
  const [loading2FA, setLoading2FA] = useState(false)
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [changingPassword, setChangingPassword] = useState(false)
  
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  })

  const [loginSessions] = useState([
    {
      id: '1',
      device: 'Chrome on Windows',
      location: 'Lagos, Nigeria',
      ipAddress: '192.168.1.100',
      lastActive: '2024-01-15 15:30:00',
      current: true
    },
    {
      id: '2',
      device: 'Safari on iPhone',
      location: 'Lagos, Nigeria',
      ipAddress: '192.168.1.101',
      lastActive: '2024-01-15 08:22:00',
      current: false
    },
    {
      id: '3',
      device: 'Firefox on macOS',
      location: 'Abuja, Nigeria',
      ipAddress: '10.0.0.50',
      lastActive: '2024-01-14 20:15:00',
      current: false
    }
  ])

  const [securityEvents] = useState([
    {
      type: 'login_success',
      message: 'Successful login from Chrome on Windows',
      timestamp: '2024-01-15 15:30:00',
      severity: 'low'
    },
    {
      type: '2fa_enabled',
      message: 'Two-factor authentication enabled',
      timestamp: '2024-01-15 10:00:00',
      severity: 'low'
    },
    {
      type: 'password_changed',
      message: 'Password changed successfully',
      timestamp: '2024-01-14 16:45:00',
      severity: 'medium'
    },
    {
      type: 'failed_login',
      message: 'Failed login attempt from unknown device',
      timestamp: '2024-01-13 02:30:00',
      severity: 'high'
    }
  ])

  const loadTwoFactorStatus = async () => {
    try {
      setLoading2FA(true)
      const status = await twoFactorApi.getTwoFactorStatus()
      setTwoFactorStatus(status)
    } catch (error) {
      console.error('Error loading 2FA status:', error)
      setTwoFactorStatus({
        isEnabled: false,
        lastVerified: undefined,
        backupCodesRemaining: 0
      })
    } finally {
      setLoading2FA(false)
    }
  }

  useEffect(() => {
    if (admin) {
      loadTwoFactorStatus()
    }
  }, [admin])

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setPasswordData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleChangePassword = async () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      alert('New passwords do not match!')
      return
    }

    if (passwordData.newPassword.length < 8) {
      alert('New password must be at least 8 characters long!')
      return
    }

    setChangingPassword(true)
    try {
      // TODO: Implement actual API call to change password
      console.log('Changing password...')
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500))
      
      // Reset form
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      })
      
      alert('Password changed successfully!')
    } catch (error) {
      console.error('Failed to change password:', error)
      alert('Failed to change password. Please try again.')
    } finally {
      setChangingPassword(false)
    }
  }

  const handleEndSession = async (sessionId: string) => {
    if (!confirm('Are you sure you want to end this session?')) return
    
    try {
      // TODO: Implement actual API call to end session
      console.log('Ending session:', sessionId)
      alert('Session ended successfully!')
    } catch (error) {
      console.error('Failed to end session:', error)
      alert('Failed to end session. Please try again.')
    }
  }

  const handleTwoFactorComplete = () => {
    loadTwoFactorStatus()
    setShowTwoFactorSetup(false)
  }

  const handleBackupCodesChanged = () => {
    loadTwoFactorStatus()
    setShowBackupCodesManager(false)
  }

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'
      case 'low':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300'
    }
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-semibold text-gray-900 dark:text-neutral-100">Security Settings</h1>
        <p className="text-gray-600 dark:text-neutral-300">Manage your account security and authentication settings</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Two-Factor Authentication */}
        <div className="bg-white dark:bg-neutral-800 rounded-lg shadow-sm border border-gray-200 dark:border-neutral-700">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-neutral-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-neutral-100 flex items-center">
              <ShieldCheckIcon className="w-5 h-5 mr-2" />
              Two-Factor Authentication
            </h2>
          </div>
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm text-gray-600 dark:text-neutral-400">
                  Add an extra layer of security to your account
                </p>
                {loading2FA ? (
                  <div className="flex items-center mt-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-500 border-t-transparent mr-2"></div>
                    <span className="text-sm text-gray-500">Loading...</span>
                  </div>
                ) : twoFactorStatus?.isEnabled ? (
                  <div className="flex items-center mt-2">
                    <CheckCircleIcon className="w-4 h-4 text-green-500 mr-2" />
                    <span className="text-sm text-green-600 dark:text-green-400 font-medium">Enabled</span>
                  </div>
                ) : (
                  <div className="flex items-center mt-2">
                    <ExclamationTriangleIcon className="w-4 h-4 text-orange-500 mr-2" />
                    <span className="text-sm text-orange-600 dark:text-orange-400 font-medium">Disabled</span>
                  </div>
                )}
              </div>
            </div>
            
            <div className="space-y-3">
              <button
                onClick={() => setShowTwoFactorSetup(true)}
                disabled={loading2FA}
                className="w-full px-4 py-2 bg-blue-600 dark:bg-blue-700 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-800 disabled:opacity-50 transition-colors"
              >
                {twoFactorStatus?.isEnabled ? 'Manage 2FA' : 'Enable 2FA'}
              </button>
              
              {twoFactorStatus?.isEnabled && (
                <button
                  onClick={() => setShowBackupCodesManager(true)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-neutral-600 text-gray-700 dark:text-neutral-300 rounded-lg hover:bg-gray-50 dark:hover:bg-neutral-700 transition-colors flex items-center justify-center"
                >
                  <KeyIcon className="w-4 h-4 mr-2" />
                  Manage Backup Codes
                  {twoFactorStatus.backupCodes && twoFactorStatus.backupCodes.remaining <= 2 && (
                    <span className="ml-2 px-2 py-1 text-xs bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300 rounded">
                      {twoFactorStatus.backupCodes.remaining} left
                    </span>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Password Change */}
        <div className="bg-white dark:bg-neutral-800 rounded-lg shadow-sm border border-gray-200 dark:border-neutral-700">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-neutral-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-neutral-100 flex items-center">
              <LockClosedIcon className="w-5 h-5 mr-2" />
              Change Password
            </h2>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-neutral-200 mb-2">
                  Current Password
                </label>
                <div className="relative">
                  <input
                    type={showCurrentPassword ? "text" : "password"}
                    name="currentPassword"
                    value={passwordData.currentPassword}
                    onChange={handlePasswordChange}
                    className="w-full px-3 py-2 pr-10 border border-gray-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 text-gray-900 dark:text-neutral-100 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  >
                    {showCurrentPassword ? (
                      <EyeSlashIcon className="h-5 w-5 text-gray-400" />
                    ) : (
                      <EyeIcon className="h-5 w-5 text-gray-400" />
                    )}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-neutral-200 mb-2">
                  New Password
                </label>
                <div className="relative">
                  <input
                    type={showNewPassword ? "text" : "password"}
                    name="newPassword"
                    value={passwordData.newPassword}
                    onChange={handlePasswordChange}
                    className="w-full px-3 py-2 pr-10 border border-gray-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 text-gray-900 dark:text-neutral-100 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  >
                    {showNewPassword ? (
                      <EyeSlashIcon className="h-5 w-5 text-gray-400" />
                    ) : (
                      <EyeIcon className="h-5 w-5 text-gray-400" />
                    )}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-neutral-200 mb-2">
                  Confirm New Password
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    name="confirmPassword"
                    value={passwordData.confirmPassword}
                    onChange={handlePasswordChange}
                    className="w-full px-3 py-2 pr-10 border border-gray-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 text-gray-900 dark:text-neutral-100 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  >
                    {showConfirmPassword ? (
                      <EyeSlashIcon className="h-5 w-5 text-gray-400" />
                    ) : (
                      <EyeIcon className="h-5 w-5 text-gray-400" />
                    )}
                  </button>
                </div>
              </div>

              <button
                onClick={handleChangePassword}
                disabled={changingPassword || !passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword}
                className="w-full px-4 py-2 bg-green-600 dark:bg-green-700 text-white rounded-lg hover:bg-green-700 dark:hover:bg-green-800 disabled:opacity-50 transition-colors"
              >
                {changingPassword ? (
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                    Changing Password...
                  </div>
                ) : (
                  'Change Password'
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Active Sessions */}
      <div className="bg-white dark:bg-neutral-800 rounded-lg shadow-sm border border-gray-200 dark:border-neutral-700">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-neutral-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-neutral-100 flex items-center">
            <ComputerDesktopIcon className="w-5 h-5 mr-2" />
            Active Sessions
          </h2>
        </div>
        <div className="p-6">
          <div className="space-y-4">
            {loginSessions.map((session) => (
              <div key={session.id} className="flex items-center justify-between p-4 border border-gray-200 dark:border-neutral-600 rounded-lg">
                <div className="flex items-center space-x-4">
                  <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                    {session.device.includes('iPhone') ? (
                      <DevicePhoneMobileIcon className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                    ) : (
                      <ComputerDesktopIcon className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                    )}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-neutral-100">
                      {session.device}
                      {session.current && (
                        <span className="ml-2 px-2 py-1 text-xs bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 rounded">
                          Current
                        </span>
                      )}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-neutral-400">
                      {session.location} • {session.ipAddress}
                    </p>
                    <p className="text-xs text-gray-400 dark:text-neutral-500">
                      Last active: {formatTimestamp(session.lastActive)}
                    </p>
                  </div>
                </div>
                {!session.current && (
                  <button
                    onClick={() => handleEndSession(session.id)}
                    className="px-3 py-1 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded transition-colors"
                  >
                    End Session
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Security Events Log */}
      <div className="bg-white dark:bg-neutral-800 rounded-lg shadow-sm border border-gray-200 dark:border-neutral-700">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-neutral-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-neutral-100 flex items-center">
            <ClockIcon className="w-5 h-5 mr-2" />
            Security Events
          </h2>
        </div>
        <div className="p-6">
          <div className="space-y-4">
            {securityEvents.map((event, index) => (
              <div key={index} className="flex items-center justify-between py-3 border-b border-gray-100 dark:border-neutral-700 last:border-b-0">
                <div className="flex items-center space-x-3">
                  <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getSeverityColor(event.severity)}`}>
                    {event.severity}
                  </span>
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-neutral-100">{event.message}</p>
                    <p className="text-xs text-gray-500 dark:text-neutral-400">{event.type}</p>
                  </div>
                </div>
                <div className="text-xs text-gray-500 dark:text-neutral-400">
                  {formatTimestamp(event.timestamp)}
                </div>
              </div>
            ))}
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
    </div>
  )
}

export default SecuritySettings