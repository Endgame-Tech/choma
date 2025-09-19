import React, { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { profileApi } from '../services/api'
import { AlertTriangle, ChefHat, Info, CheckCircle } from 'lucide-react'

const Profile: React.FC = () => {
  const { chef, updateChef } = useAuth()
  const [editing, setEditing] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    fullName: chef?.fullName || '',
    email: chef?.email || '',
    phone: chef?.phone || '',
    bio: chef?.bio || '',
    specialties: chef?.specialties?.join(', ') || '',
    experience: chef?.experience || '',
    maxCapacity: chef?.maxCapacity || 10,
    availability: chef?.availability || 'Available'
  })

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: name === 'maxCapacity' ? parseInt(value) || 0 : value
    }))
  }

  const handleSave = async () => {
    try {
      setLoading(true)
      setError(null)
      setSuccess(null)

      const updateData = {
        ...formData,
        specialties: formData.specialties.split(',').map(s => s.trim()).filter(s => s.length > 0)
      }

      const updatedChef = await profileApi.updateProfile(updateData)
      updateChef(updatedChef)
      setEditing(false)
      setSuccess('Profile updated successfully!')

      setTimeout(() => setSuccess(null), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update profile')
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = () => {
    setFormData({
      fullName: chef?.fullName || '',
      email: chef?.email || '',
      phone: chef?.phone || '',
      bio: chef?.bio || '',
      specialties: chef?.specialties?.join(', ') || '',
      experience: chef?.experience || '',
      maxCapacity: chef?.maxCapacity || 10,
      availability: chef?.availability || 'Available'
    })
    setEditing(false)
    setError(null)
  }

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'active':
        return 'bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100'
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-800 dark:text-yellow-100'
      case 'inactive':
      case 'suspended':
        return 'bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-100'
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
    }
  }

  const getAvailabilityColor = (availability: string) => {
    switch (availability?.toLowerCase()) {
      case 'available':
        return 'bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100'
      case 'busy':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-800 dark:text-orange-100'
      case 'unavailable':
        return 'bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-100'
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
    }
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-semibold text-gray-900 dark:text-white">Chef Profile</h1>
            <p className="text-gray-600 dark:text-gray-400">Manage your professional profile and settings</p>
          </div>
          {!editing && (
            <button
              onClick={() => setEditing(true)}
              className="bg-blue-600 dark:bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors"
            >
              Edit Profile
            </button>
          )}
        </div>
      </div>

      {/* Alerts */}
      {success && (
        <div className="mb-6 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 transition-colors duration-200">
          <div className="flex items-center">
            <CheckCircle className="text-green-400 mr-3" size={20} />
            <p className="text-green-800 dark:text-green-200">{success}</p>
          </div>
        </div>
      )}

      {error && (
        <div className="mb-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 transition-colors duration-200">
          <div className="flex items-center">
            <AlertTriangle size={20} className="text-red-400 mr-3" />
            <p className="text-red-800 dark:text-red-200">{error}</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Overview */}
        <div className="lg:col-span-1">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 transition-colors duration-200">
            <div className="text-center">
              <div className="w-24 h-24 bg-blue-100 dark:bg-blue-800 rounded-full flex items-center justify-center mx-auto mb-4">
                <ChefHat size={40} className="text-blue-600 dark:text-blue-300" />
              </div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">{chef?.fullName}</h2>
              <p className="text-gray-600 dark:text-gray-400 mb-4">{chef?.email}</p>

              {/* Status badges */}
              <div className="space-y-2">
                <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${getStatusColor(chef?.status || '')}`}>
                  {chef?.status}
                </span>
                <br />
                <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${getAvailabilityColor(chef?.availability || '')}`}>
                  {chef?.availability}
                </span>
              </div>
            </div>

            {/* Stats */}
            <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
              <div className="grid grid-cols-2 gap-4 text-center">
                <div>
                  <p className="text-2xl font-semibold text-gray-900 dark:text-white">{chef?.rating?.toFixed(1) || '0.0'}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Rating ⭐</p>
                </div>
                <div>
                  <p className="text-2xl font-semibold text-gray-900 dark:text-white">{chef?.totalOrdersCompleted || 0}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Orders</p>
                </div>
                <div>
                  <p className="text-2xl font-semibold text-gray-900 dark:text-white">{chef?.currentCapacity || 0}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Current Load</p>
                </div>
                <div>
                  <p className="text-2xl font-semibold text-gray-900 dark:text-white">{chef?.maxCapacity || 0}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Max Capacity</p>
                </div>
              </div>
            </div>

            {/* Joined date */}
            {chef?.createdAt && (
              <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700 text-center">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Chef since {new Date(chef.createdAt).toLocaleDateString('en-NG', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Profile Details */}
        <div className="lg:col-span-2">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 transition-colors duration-200">
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Profile Information</h3>
            </div>

            <div className="p-6">
              <form className="space-y-6">
                {/* Basic Information */}
                <div>
                  <h4 className="text-md font-medium text-gray-900 dark:text-white mb-4">Basic Information</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Full Name
                      </label>
                      {editing ? (
                        <input
                          id="fullName"
                          type="text"
                          name="fullName"
                          value={formData.fullName}
                          onChange={handleInputChange}
                          placeholder="Enter your full name"
                          className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 transition-colors duration-200"
                          required
                        />
                      ) : (
                        <p className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg text-gray-900 dark:text-white">{chef?.fullName}</p>
                      )}
                    </div>

                    <div>
                      <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Email Address
                      </label>
                      {editing ? (
                        <input
                          id="email"
                          type="email"
                          name="email"
                          value={formData.email}
                          onChange={handleInputChange}
                          placeholder="Enter your email address"
                          className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 transition-colors duration-200"
                          required
                        />
                      ) : (
                        <p className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg text-gray-900 dark:text-white">{chef?.email}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Phone Number
                      </label>
                      {editing ? (
                        <input
                          type="tel"
                          name="phone"
                          value={formData.phone}
                          onChange={handleInputChange}
                          title="Phone Number"
                          placeholder="Enter your phone number"
                          className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 transition-colors duration-200"
                        />
                      ) : (
                        <p className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg text-gray-900 dark:text-white">{chef?.phone || 'Not provided'}</p>
                      )}
                    </div>

                    <div>
                      <label htmlFor="availability" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Availability Status
                      </label>
                      {editing ? (
                        <select
                          id="availability"
                          name="availability"
                          value={formData.availability}
                          onChange={handleInputChange}
                          title="Select your availability status"
                          className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                          <option value="Available">Available</option>
                          <option value="Busy">Busy</option>
                          <option value="Unavailable">Unavailable</option>
                        </select>
                      ) : (
                        <p className="p-3 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg">{chef?.availability}</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Professional Information */}
                <div className="pt-6 border-t border-gray-200 dark:border-gray-700">
                  <h4 className="text-md font-medium text-gray-900 dark:text-white mb-4">Professional Information</h4>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Bio
                      </label>
                      {editing ? (
                        <textarea
                          name="bio"
                          value={formData.bio}
                          onChange={handleInputChange}
                          rows={4}
                          placeholder="Tell customers about yourself, your cooking style, and experience..."
                          className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 transition-colors duration-200"
                        />
                      ) : (
                        <p className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg min-h-[100px] text-gray-900 dark:text-white">
                          {chef?.bio || 'No bio provided'}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Specialties (comma-separated)
                      </label>
                      {editing ? (
                        <input
                          type="text"
                          name="specialties"
                          value={formData.specialties}
                          onChange={handleInputChange}
                          placeholder="e.g. Nigerian cuisine, Jollof rice, Suya, Continental dishes"
                          className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 transition-colors duration-200"
                        />
                      ) : (
                        <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                          {chef?.specialties && chef.specialties.length > 0 ? (
                            <div className="flex flex-wrap gap-2">
                              {chef.specialties.map((specialty, index) => (
                                <span
                                  key={index}
                                  className="px-2 py-1 bg-blue-100 dark:bg-blue-800 text-blue-800 dark:text-blue-200 rounded-full text-sm"
                                >
                                  {specialty}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-gray-500 dark:text-gray-400">No specialties listed</span>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Years of Experience
                        </label>
                        {editing ? (
                          <input
                            type="text"
                            name="experience"
                            value={formData.experience}
                            onChange={handleInputChange}
                            placeholder="e.g. 5 years"
                            title="Years of Experience"
                            className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 transition-colors duration-200"
                          />
                        ) : (
                          <p className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg text-gray-900 dark:text-white">{chef?.experience || 'Not specified'}</p>
                        )}
                      </div>

                      <div>
                        <label htmlFor="maxCapacity" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Maximum Order Capacity
                        </label>
                        {editing ? (
                          <input
                            id="maxCapacity"
                            type="number"
                            name="maxCapacity"
                            value={formData.maxCapacity}
                            onChange={handleInputChange}
                            min="1"
                            max="50"
                            placeholder="Enter maximum order capacity"
                            title="Maximum number of orders you can handle"
                            className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 transition-colors duration-200"
                          />
                        ) : (
                          <p className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg text-gray-900 dark:text-white">{chef?.maxCapacity} orders</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Banking Information (Read-only) */}
                <div className="pt-6 border-t border-gray-200 dark:border-gray-700">
                  <h4 className="text-md font-medium text-gray-900 dark:text-white mb-4">Banking Information</h4>
                  <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 mb-4 transition-colors duration-200">
                    <div className="flex items-center">
                      <Info size={20} className="text-yellow-400 mr-3" />
                      <p className="text-yellow-800 dark:text-yellow-200 text-sm">
                        Banking information cannot be edited here for security reasons.
                        Contact support to update payment details.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Bank Name</label>
                      <p className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg text-gray-900 dark:text-white">{chef?.bankDetails?.bankName || 'Not provided'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Account Name</label>
                      <p className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg text-gray-900 dark:text-white">{chef?.bankDetails?.accountName || 'Not provided'}</p>
                    </div>
                  </div>
                </div>

                {/* Action buttons */}
                {editing && (
                  <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200 dark:border-gray-700">
                    <button
                      type="button"
                      onClick={handleCancel}
                      disabled={loading}
                      className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleSave}
                      disabled={loading}
                      className="px-4 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors disabled:opacity-50 flex items-center"
                    >
                      {loading && (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      )}
                      {loading ? 'Saving...' : 'Save Changes'}
                    </button>
                  </div>
                )}
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Profile