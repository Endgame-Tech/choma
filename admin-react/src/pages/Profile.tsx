import React, { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { UserCircleIcon, PencilIcon, CheckIcon, XMarkIcon, CameraIcon, ClockIcon } from '@heroicons/react/24/outline'

const Profile: React.FC = () => {
  const { admin } = useAuth()
  const [editing, setEditing] = useState(false)
  const [loading, setLoading] = useState(false)
  const [profileData, setProfileData] = useState({
    firstName: admin?.firstName || '',
    lastName: admin?.lastName || '',
    email: admin?.email || '',
    phone: '', // Not available in Admin type
    role: admin?.role?.name || '',
    department: '', // Not available in Admin type
    bio: '', // Not available in Admin type
    profileImage: admin?.profileImage || ''
  })

  const [activityLogs] = useState([
    { action: 'Logged in', timestamp: '2024-01-15 09:30:00', ip: '192.168.1.1' },
    { action: 'Updated meal plan', timestamp: '2024-01-15 14:22:00', ip: '192.168.1.1' },
    { action: 'Created new meal', timestamp: '2024-01-14 16:45:00', ip: '192.168.1.1' },
    { action: 'Managed admin users', timestamp: '2024-01-14 11:10:00', ip: '192.168.1.1' },
    { action: 'Logged in', timestamp: '2024-01-14 08:15:00', ip: '192.168.1.1' }
  ])

  useEffect(() => {
    if (admin) {
      setProfileData({
        firstName: admin.firstName || '',
        lastName: admin.lastName || '',
        email: admin.email || '',
        phone: '', // Not available in Admin type
        role: admin.role?.name || '',
        department: '', // Not available in Admin type
        bio: '', // Not available in Admin type
        profileImage: admin.profileImage || ''
      })
    }
  }, [admin])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setProfileData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleSave = async () => {
    setLoading(true)
    try {
      // TODO: Implement actual API call to update profile
      console.log('Saving profile:', profileData)
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      setEditing(false)
      // Show success message
      alert('Profile updated successfully!')
    } catch (error) {
      console.error('Failed to update profile:', error)
      alert('Failed to update profile. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = () => {
    // Reset to original data
    if (admin) {
      setProfileData({
        firstName: admin.firstName || '',
        lastName: admin.lastName || '',
        email: admin.email || '',
        phone: '', // Not available in Admin type
        role: admin.role?.name || '',
        department: '', // Not available in Admin type
        bio: '', // Not available in Admin type
        profileImage: admin.profileImage || ''
      })
    }
    setEditing(false)
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

  const getRoleColor = (role: string) => {
    if (!role || typeof role !== 'string') {
      return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300'
    }
    
    switch (role.toLowerCase()) {
      case 'super admin':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
      case 'admin':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
      case 'manager':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300'
    }
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-semibold text-gray-900 dark:text-neutral-100">Profile</h1>
          <p className="text-gray-600 dark:text-neutral-300">Manage your account information and preferences</p>
        </div>
        
        {!editing ? (
          <button
            onClick={() => setEditing(true)}
            className="inline-flex items-center px-4 py-2 bg-blue-600 dark:bg-blue-700 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-800 transition-colors"
          >
            <PencilIcon className="w-4 h-4 mr-2" />
            Edit Profile
          </button>
        ) : (
          <div className="flex space-x-2">
            <button
              onClick={handleSave}
              disabled={loading}
              className="inline-flex items-center px-4 py-2 bg-green-600 dark:bg-green-700 text-white rounded-lg hover:bg-green-700 dark:hover:bg-green-800 disabled:opacity-50 transition-colors"
            >
              {loading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
              ) : (
                <CheckIcon className="w-4 h-4 mr-2" />
              )}
              {loading ? 'Saving...' : 'Save'}
            </button>
            <button
              onClick={handleCancel}
              disabled={loading}
              className="inline-flex items-center px-4 py-2 bg-gray-600 dark:bg-gray-700 text-white rounded-lg hover:bg-gray-700 dark:hover:bg-gray-800 disabled:opacity-50 transition-colors"
            >
              <XMarkIcon className="w-4 h-4 mr-2" />
              Cancel
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Information */}
        <div className="lg:col-span-2 space-y-6">
          {/* Basic Information Card */}
          <div className="bg-white dark:bg-neutral-800 rounded-lg shadow-sm border border-gray-200 dark:border-neutral-700">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-neutral-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-neutral-100">Basic Information</h2>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-neutral-200 mb-2">
                    First Name
                  </label>
                  {editing ? (
                    <input
                      type="text"
                      name="firstName"
                      value={profileData.firstName}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 text-gray-900 dark:text-neutral-100 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  ) : (
                    <p className="text-gray-900 dark:text-neutral-100 py-2">{profileData.firstName}</p>
                  )}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-neutral-200 mb-2">
                    Last Name
                  </label>
                  {editing ? (
                    <input
                      type="text"
                      name="lastName"
                      value={profileData.lastName}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 text-gray-900 dark:text-neutral-100 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  ) : (
                    <p className="text-gray-900 dark:text-neutral-100 py-2">{profileData.lastName}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-neutral-200 mb-2">
                    Email Address
                  </label>
                  <p className="text-gray-900 dark:text-neutral-100 py-2 bg-gray-50 dark:bg-neutral-700 px-3 rounded">{profileData.email}</p>
                  <p className="text-xs text-gray-500 dark:text-neutral-400 mt-1">Email cannot be changed here</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-neutral-200 mb-2">
                    Phone Number
                  </label>
                  {editing ? (
                    <input
                      type="tel"
                      name="phone"
                      value={profileData.phone}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 text-gray-900 dark:text-neutral-100 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  ) : (
                    <p className="text-gray-900 dark:text-neutral-100 py-2">{profileData.phone || 'Not provided'}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-neutral-200 mb-2">
                    Role
                  </label>
                  <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${getRoleColor(profileData.role)}`}>
                    {String(profileData.role || 'No Role')}
                  </span>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-neutral-200 mb-2">
                    Department
                  </label>
                  {editing ? (
                    <input
                      type="text"
                      name="department"
                      value={profileData.department}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 text-gray-900 dark:text-neutral-100 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  ) : (
                    <p className="text-gray-900 dark:text-neutral-100 py-2">{profileData.department || 'Not specified'}</p>
                  )}
                </div>
              </div>

              <div className="mt-6">
                <label className="block text-sm font-medium text-gray-700 dark:text-neutral-200 mb-2">
                  Bio
                </label>
                {editing ? (
                  <textarea
                    name="bio"
                    value={profileData.bio}
                    onChange={handleInputChange}
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 text-gray-900 dark:text-neutral-100 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Tell us about yourself..."
                  />
                ) : (
                  <p className="text-gray-900 dark:text-neutral-100 py-2">{profileData.bio || 'No bio provided'}</p>
                )}
              </div>
            </div>
          </div>

          {/* Activity Log */}
          <div className="bg-white dark:bg-neutral-800 rounded-lg shadow-sm border border-gray-200 dark:border-neutral-700">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-neutral-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-neutral-100 flex items-center">
                <ClockIcon className="w-5 h-5 mr-2" />
                Recent Activity
              </h2>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                {activityLogs.map((log, index) => (
                  <div key={index} className="flex items-center justify-between py-3 border-b border-gray-100 dark:border-neutral-700 last:border-b-0">
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-neutral-100">{log.action}</p>
                      <p className="text-xs text-gray-500 dark:text-neutral-400">IP: {log.ip}</p>
                    </div>
                    <div className="text-xs text-gray-500 dark:text-neutral-400">
                      {formatTimestamp(log.timestamp)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Profile Picture */}
          <div className="bg-white dark:bg-neutral-800 rounded-lg shadow-sm border border-gray-200 dark:border-neutral-700">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-neutral-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-neutral-100">Profile Picture</h2>
            </div>
            <div className="p-6 text-center">
              <div className="relative inline-block">
                {profileData.profileImage ? (
                  <img
                    src={profileData.profileImage}
                    alt="Profile"
                    className="w-24 h-24 rounded-full mx-auto object-cover"
                  />
                ) : (
                  <div className="w-24 h-24 bg-gray-200 dark:bg-neutral-700 rounded-full flex items-center justify-center mx-auto">
                    <UserCircleIcon className="w-16 h-16 text-gray-400 dark:text-neutral-500" />
                  </div>
                )}
                {editing && (
                  <button className="absolute bottom-0 right-0 bg-blue-600 dark:bg-blue-700 text-white rounded-full p-2 hover:bg-blue-700 dark:hover:bg-blue-800">
                    <CameraIcon className="w-4 h-4" />
                  </button>
                )}
              </div>
              <div className="mt-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-neutral-100">
                  {profileData.firstName} {profileData.lastName}
                </h3>
                <p className="text-gray-500 dark:text-neutral-400">{profileData.email}</p>
              </div>
            </div>
          </div>

          {/* Account Statistics */}
          <div className="bg-white dark:bg-neutral-800 rounded-lg shadow-sm border border-gray-200 dark:border-neutral-700">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-neutral-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-neutral-100">Account Stats</h2>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600 dark:text-neutral-400">Member since</span>
                  <span className="text-sm font-medium text-gray-900 dark:text-neutral-100">Jan 2024</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600 dark:text-neutral-400">Last login</span>
                  <span className="text-sm font-medium text-gray-900 dark:text-neutral-100">Today</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600 dark:text-neutral-400">Total sessions</span>
                  <span className="text-sm font-medium text-gray-900 dark:text-neutral-100">127</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600 dark:text-neutral-400">2FA Status</span>
                  <span className="text-sm font-medium text-green-600 dark:text-green-400">Enabled</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Profile