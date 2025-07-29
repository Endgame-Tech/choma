import React, { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { profileApi } from '../services/api'

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
        return 'bg-green-100 text-green-800'
      case 'pending':
        return 'bg-yellow-100 text-yellow-800'
      case 'inactive':
      case 'suspended':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getAvailabilityColor = (availability: string) => {
    switch (availability?.toLowerCase()) {
      case 'available':
        return 'bg-green-100 text-green-800'
      case 'busy':
        return 'bg-orange-100 text-orange-800'
      case 'unavailable':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-semibold text-gray-900">Chef Profile</h1>
            <p className="text-gray-600">Manage your professional profile and settings</p>
          </div>
          {!editing && (
            <button
              onClick={() => setEditing(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Edit Profile
            </button>
          )}
        </div>
      </div>

      {/* Alerts */}
      {success && (
        <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center">
            <div className="text-green-400 mr-3">✅</div>
            <p className="text-green-800">{success}</p>
          </div>
        </div>
      )}

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <div className="text-red-400 mr-3">⚠️</div>
            <p className="text-red-800">{error}</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Overview */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="text-center">
              <div className="w-24 h-24 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-4xl">👨‍🍳</span>
              </div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">{chef?.fullName}</h2>
              <p className="text-gray-600 mb-4">{chef?.email}</p>
              
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
            <div className="mt-6 pt-6 border-t border-gray-200">
              <div className="grid grid-cols-2 gap-4 text-center">
                <div>
                  <p className="text-2xl font-semibold text-gray-900">{chef?.rating?.toFixed(1) || '0.0'}</p>
                  <p className="text-sm text-gray-600">Rating ⭐</p>
                </div>
                <div>
                  <p className="text-2xl font-semibold text-gray-900">{chef?.totalOrdersCompleted || 0}</p>
                  <p className="text-sm text-gray-600">Orders</p>
                </div>
                <div>
                  <p className="text-2xl font-semibold text-gray-900">{chef?.currentCapacity || 0}</p>
                  <p className="text-sm text-gray-600">Current Load</p>
                </div>
                <div>
                  <p className="text-2xl font-semibold text-gray-900">{chef?.maxCapacity || 0}</p>
                  <p className="text-sm text-gray-600">Max Capacity</p>
                </div>
              </div>
            </div>

            {/* Joined date */}
            {chef?.createdAt && (
              <div className="mt-6 pt-6 border-t border-gray-200 text-center">
                <p className="text-sm text-gray-600">
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
          <div className="bg-white rounded-lg shadow-sm border">
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Profile Information</h3>
            </div>

            <div className="p-6">
              <form className="space-y-6">
                {/* Basic Information */}
                <div>
                  <h4 className="text-md font-medium text-gray-900 mb-4">Basic Information</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Full Name
                      </label>
                      {editing ? (
                        <input
                          type="text"
                          name="fullName"
                          value={formData.fullName}
                          onChange={handleInputChange}
                          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          required
                        />
                      ) : (
                        <p className="p-3 bg-gray-50 rounded-lg">{chef?.fullName}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Email Address
                      </label>
                      {editing ? (
                        <input
                          type="email"
                          name="email"
                          value={formData.email}
                          onChange={handleInputChange}
                          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          required
                        />
                      ) : (
                        <p className="p-3 bg-gray-50 rounded-lg">{chef?.email}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Phone Number
                      </label>
                      {editing ? (
                        <input
                          type="tel"
                          name="phone"
                          value={formData.phone}
                          onChange={handleInputChange}
                          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      ) : (
                        <p className="p-3 bg-gray-50 rounded-lg">{chef?.phone || 'Not provided'}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Availability Status
                      </label>
                      {editing ? (
                        <select
                          name="availability"
                          value={formData.availability}
                          onChange={handleInputChange}
                          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                          <option value="Available">Available</option>
                          <option value="Busy">Busy</option>
                          <option value="Unavailable">Unavailable</option>
                        </select>
                      ) : (
                        <p className="p-3 bg-gray-50 rounded-lg">{chef?.availability}</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Professional Information */}
                <div className="pt-6 border-t border-gray-200">
                  <h4 className="text-md font-medium text-gray-900 mb-4">Professional Information</h4>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Bio
                      </label>
                      {editing ? (
                        <textarea
                          name="bio"
                          value={formData.bio}
                          onChange={handleInputChange}
                          rows={4}
                          placeholder="Tell customers about yourself, your cooking style, and experience..."
                          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      ) : (
                        <p className="p-3 bg-gray-50 rounded-lg min-h-[100px]">
                          {chef?.bio || 'No bio provided'}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Specialties (comma-separated)
                      </label>
                      {editing ? (
                        <input
                          type="text"
                          name="specialties"
                          value={formData.specialties}
                          onChange={handleInputChange}
                          placeholder="e.g. Nigerian cuisine, Jollof rice, Suya, Continental dishes"
                          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      ) : (
                        <div className="p-3 bg-gray-50 rounded-lg">
                          {chef?.specialties && chef.specialties.length > 0 ? (
                            <div className="flex flex-wrap gap-2">
                              {chef.specialties.map((specialty, index) => (
                                <span
                                  key={index}
                                  className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
                                >
                                  {specialty}
                                </span>
                              ))}
                            </div>
                          ) : (
                            'No specialties listed'
                          )}
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Years of Experience
                        </label>
                        {editing ? (
                          <input
                            type="text"
                            name="experience"
                            value={formData.experience}
                            onChange={handleInputChange}
                            placeholder="e.g. 5 years"
                            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        ) : (
                          <p className="p-3 bg-gray-50 rounded-lg">{chef?.experience || 'Not specified'}</p>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Maximum Order Capacity
                        </label>
                        {editing ? (
                          <input
                            type="number"
                            name="maxCapacity"
                            value={formData.maxCapacity}
                            onChange={handleInputChange}
                            min="1"
                            max="50"
                            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        ) : (
                          <p className="p-3 bg-gray-50 rounded-lg">{chef?.maxCapacity} orders</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Banking Information (Read-only) */}
                <div className="pt-6 border-t border-gray-200">
                  <h4 className="text-md font-medium text-gray-900 mb-4">Banking Information</h4>
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                    <div className="flex items-center">
                      <div className="text-yellow-400 mr-3">ℹ️</div>
                      <p className="text-yellow-800 text-sm">
                        Banking information cannot be edited here for security reasons. 
                        Contact support to update payment details.
                      </p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Bank Name</label>
                      <p className="p-3 bg-gray-50 rounded-lg">{chef?.bankDetails?.bankName || 'Not provided'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Account Name</label>
                      <p className="p-3 bg-gray-50 rounded-lg">{chef?.bankDetails?.accountName || 'Not provided'}</p>
                    </div>
                  </div>
                </div>

                {/* Action buttons */}
                {editing && (
                  <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
                    <button
                      type="button"
                      onClick={handleCancel}
                      disabled={loading}
                      className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleSave}
                      disabled={loading}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center"
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