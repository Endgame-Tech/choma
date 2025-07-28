import React from 'react'
import { useState, useMemo, useEffect } from 'react'
import { useChefs } from '../hooks/useChefs'
import { chefsApi } from '../services/api'
import type { Chef } from '../types'

export default function Chefs() {
  const [filter, setFilter] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('')
  const [selectedChef, setSelectedChef] = useState<Chef | null>(null)

  // Debounce search term to prevent excessive API calls
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm)
    }, 500) // 500ms delay

    return () => clearTimeout(timer)
  }, [searchTerm])

  // Build filters (memoized to prevent infinite re-renders)
  const filters = useMemo(() => {
    type ChefFilters = {
      search?: string;
      status?: string;
    };

    const baseFilters: ChefFilters = {
      search: debouncedSearchTerm || undefined,
    }
    
    if (filter !== 'all') {
      baseFilters.status = filter === 'active' ? 'Active' : 
                          filter === 'pending' ? 'Pending' : 
                          filter === 'inactive' ? 'Inactive' : undefined
    }
    
    return baseFilters
  }, [debouncedSearchTerm, filter])

  const { chefs, loading, error, refreshChefs } = useChefs(filters)

  const handleStatusUpdate = async (chefId: string, newStatus: string) => {
    try {
      await chefsApi.updateChefStatus(chefId, newStatus)
      await refreshChefs()
    } catch (error) {
      console.error('Failed to update chef status:', error)
    }
  }

  const handleApproveChef = async (chefId: string) => {
    try {
      await chefsApi.approveChef(chefId)
      await refreshChefs()
    } catch (error) {
      console.error('Failed to approve chef:', error)
    }
  }

  const handleRejectChef = async (chefId: string, reason?: string) => {
    try {
      await chefsApi.rejectChef(chefId, reason)
      await refreshChefs()
    } catch (error) {
      console.error('Failed to reject chef:', error)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
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
      case 'offline':
        return 'bg-gray-100 text-gray-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading chefs...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-center">
          <div className="text-red-400 mr-3">⚠️</div>
          <div>
            <h3 className="text-red-800 font-medium">Error loading chefs</h3>
            <p className="text-red-600 text-sm">{error}</p>
            <button 
              onClick={refreshChefs}
              className="mt-2 text-red-600 hover:text-red-800 text-sm font-medium"
            >
              Try again
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-semibold text-gray-900">Chefs</h1>
        <p className="text-gray-600">Manage chef profiles and assignments ({chefs.length} chefs)</p>
      </div>

      {/* Search and Filter Section */}
      <div className="mb-6 space-y-4">
        {/* Search Bar */}
        <div className="flex items-center space-x-4">
          <div className="flex-1 max-w-md">
            <input
              type="text"
              placeholder="Search by chef name, email, or ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <button
            onClick={refreshChefs}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            Refresh
          </button>
        </div>

        {/* Filter Tabs */}
        <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg w-fit">
          {['all', 'active', 'pending', 'inactive'].map((filterType) => (
            <button
              key={filterType}
              onClick={() => setFilter(filterType)}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                filter === filterType
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {filterType.charAt(0).toUpperCase() + filterType.slice(1)} Chefs
            </button>
          ))}
        </div>
      </div>

      {/* Chefs Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {chefs.length === 0 ? (
          <div className="col-span-full bg-white p-8 rounded-lg shadow-sm border text-center">
            <div className="text-6xl mb-4">👨‍🍳</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Chefs Found</h3>
            <p className="text-gray-600">No chefs match your current filters.</p>
          </div>
        ) : (
          chefs.map((chef) => (
            <div key={chef._id} className="bg-white rounded-lg shadow-sm border overflow-hidden">
              {/* Chef Header */}
              <div className="p-4 border-b">
                <div className="flex items-start justify-between">
                  <div className="flex items-center">
                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="text-2xl">👨‍🍳</span>
                    </div>
                    <div className="ml-3">
                      <h3 className="text-lg font-medium text-gray-900">{chef.fullName}</h3>
                      <p className="text-sm text-gray-500">{chef.email}</p>
                    </div>
                  </div>
                  <div className="flex flex-col space-y-1">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(chef.status)}`}>
                      {chef.status}
                    </span>
                    {chef.availability && (
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getAvailabilityColor(chef.availability)}`}>
                        {chef.availability}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Chef Details */}
              <div className="p-4">
                <div className="space-y-3">
                  {/* Capacity */}
                  {chef.currentCapacity !== undefined && chef.maxCapacity !== undefined && (
                    <div>
                      <div className="flex justify-between text-sm text-gray-600 mb-1">
                        <span>Capacity</span>
                        <span>{chef.currentCapacity}/{chef.maxCapacity}</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-blue-500 h-2 rounded-full transition-all"
                          style={{ 
                            width: `${Math.min((chef.currentCapacity / chef.maxCapacity) * 100, 100)}%` 
                          }}
                        ></div>
                      </div>
                    </div>
                  )}

                  {/* Experience & Rating */}
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    {chef.experience !== undefined && (
                      <div>
                        <span className="text-gray-600">Experience</span>
                        <p className="font-medium">{chef.experience} years</p>
                      </div>
                    )}
                    {chef.rating !== undefined && (
                      <div>
                        <span className="text-gray-600">Rating</span>
                        <p className="font-medium">{chef.rating}/5 ⭐</p>
                      </div>
                    )}
                  </div>

                  {/* Location */}
                  {chef.location && (
                    <div>
                      <span className="text-sm text-gray-600">Location</span>
                      <p className="font-medium">{chef.location.city}{chef.location.area ? `, ${chef.location.area}` : ''}</p>
                    </div>
                  )}

                  {/* Specialties */}
                  {chef.specialties && chef.specialties.length > 0 && (
                    <div>
                      <span className="text-sm text-gray-600">Specialties</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {chef.specialties.slice(0, 3).map((specialty, index) => (
                          <span key={index} className="inline-block px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded">
                            {specialty}
                          </span>
                        ))}
                        {chef.specialties.length > 3 && (
                          <span className="inline-block px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded">
                            +{chef.specialties.length - 3} more
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Stats */}
                  {chef.totalOrdersCompleted !== undefined && (
                    <div className="pt-2 border-t">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Orders Completed</span>
                        <span className="font-medium">{chef.totalOrdersCompleted}</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="mt-4 flex space-x-2">
                  <button
                    onClick={() => setSelectedChef(chef)}
                    className="flex-1 bg-blue-500 text-white text-sm py-2 px-3 rounded hover:bg-blue-600 transition-colors"
                  >
                    View Details
                  </button>
                  {chef.status === 'Pending' && (
                    <>
                      <button
                        onClick={() => handleApproveChef(chef._id)}
                        className="flex-1 bg-green-500 text-white text-sm py-2 px-3 rounded hover:bg-green-600 transition-colors"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => handleRejectChef(chef._id)}
                        className="flex-1 bg-red-500 text-white text-sm py-2 px-3 rounded hover:bg-red-600 transition-colors"
                      >
                        Reject
                      </button>
                    </>
                  )}
                  {chef.status === 'Active' && (
                    <select
                      onChange={(e) => {
                        if (e.target.value) {
                          handleStatusUpdate(chef._id, e.target.value)
                          e.target.value = ''
                        }
                      }}
                      className="text-xs border rounded px-2 py-1 bg-white"
                      defaultValue=""
                    >
                      <option value="" disabled>Actions</option>
                      <option value="Inactive">Deactivate</option>
                      <option value="Suspended">Suspend</option>
                    </select>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Comprehensive Chef Details Modal */}
      {selectedChef && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] overflow-hidden">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
              <div className="flex justify-between items-center">
                <div className="flex items-center">
                  <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                    <span className="text-3xl text-white">👨‍🍳</span>
                  </div>
                  <div className="ml-4">
                    <h3 className="text-2xl font-bold text-gray-900">{selectedChef.fullName}</h3>
                    <p className="text-gray-600">{selectedChef.email}</p>
                    <div className="flex items-center mt-1">
                      <span className={`px-3 py-1 text-sm font-semibold rounded-full ${getStatusColor(selectedChef.status)}`}>
                        {selectedChef.status}
                      </span>
                      {selectedChef.availability && (
                        <span className={`ml-2 px-3 py-1 text-sm font-semibold rounded-full ${getAvailabilityColor(selectedChef.availability)}`}>
                          {selectedChef.availability}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedChef(null)}
                  className="text-gray-400 hover:text-gray-600 text-2xl"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <div className="overflow-y-auto max-h-[calc(90vh-120px)]">
              <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* Personal Information Section */}
                <div className="bg-white border border-gray-200 rounded-lg p-4">
                  <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <span className="mr-2">👤</span> Personal Information
                  </h4>
                  <div className="space-y-3 text-sm">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <span className="font-medium text-gray-700">Full Name:</span>
                        <p className="text-gray-900">{selectedChef.fullName}</p>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">Gender:</span>
                        <p className="text-gray-900">{selectedChef.gender || 'N/A'}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <span className="font-medium text-gray-700">Email:</span>
                        <p className="text-gray-900">{selectedChef.email}</p>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">Phone:</span>
                        <p className="text-gray-900">{selectedChef.phone}</p>
                      </div>
                    </div>
                    {selectedChef.alternatePhone && (
                      <div>
                        <span className="font-medium text-gray-700">Alternate Phone:</span>
                        <p className="text-gray-900">{selectedChef.alternatePhone}</p>
                      </div>
                    )}
                    {selectedChef.dateOfBirth && (
                      <div>
                        <span className="font-medium text-gray-700">Date of Birth:</span>
                        <p className="text-gray-900">{new Date(selectedChef.dateOfBirth).toLocaleDateString()}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Identity Verification Section */}
                {selectedChef.identityVerification && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                      <span className="mr-2">🆔</span> Identity Verification
                    </h4>
                    <div className="space-y-3 text-sm">
                      <div>
                        <span className="font-medium text-gray-700">ID Type:</span>
                        <p className="text-gray-900">{selectedChef.identityVerification.idType}</p>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">ID Number:</span>
                        <p className="text-gray-900">{selectedChef.identityVerification.idNumber}</p>
                      </div>
                      {selectedChef.identityVerification.idExpiryDate && (
                        <div>
                          <span className="font-medium text-gray-700">Expiry Date:</span>
                          <p className="text-gray-900">{new Date(selectedChef.identityVerification.idExpiryDate).toLocaleDateString()}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Professional Details Section */}
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <span className="mr-2">👨‍🍳</span> Professional Details
                  </h4>
                  <div className="space-y-3 text-sm">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <span className="font-medium text-gray-700">Experience:</span>
                        <p className="text-gray-900">{selectedChef.experience || 0} years</p>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">Rating:</span>
                        <p className="text-gray-900">{selectedChef.rating || 'N/A'}/5 ⭐</p>
                      </div>
                    </div>
                    
                    {selectedChef.specialties && selectedChef.specialties.length > 0 && (
                      <div>
                        <span className="font-medium text-gray-700">Specialties:</span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {selectedChef.specialties.map((specialty, index) => (
                            <span key={index} className="inline-block px-2 py-1 text-xs bg-green-100 text-green-800 rounded">
                              {specialty}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {selectedChef.languagesSpoken && selectedChef.languagesSpoken.length > 0 && (
                      <div>
                        <span className="font-medium text-gray-700">Languages:</span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {selectedChef.languagesSpoken.map((language: string, index: number) => (
                            <span key={index} className="inline-block px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded">
                              {language}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {selectedChef.culinaryEducation && (
                      <div>
                        <span className="font-medium text-gray-700">Education:</span>
                        <p className="text-gray-900 text-xs">{selectedChef.culinaryEducation}</p>
                      </div>
                    )}

                    {selectedChef.previousWorkExperience && (
                      <div>
                        <span className="font-medium text-gray-700">Work Experience:</span>
                        <p className="text-gray-900 text-xs">{selectedChef.previousWorkExperience}</p>
                      </div>
                    )}

                    {selectedChef.certifications && selectedChef.certifications.length > 0 && (
                      <div>
                        <span className="font-medium text-gray-700">Certifications:</span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {selectedChef.certifications.map((cert: string, index: number) => (
                            <span key={index} className="inline-block px-2 py-1 text-xs bg-yellow-100 text-yellow-800 rounded">
                              {cert}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {selectedChef.bio && (
                      <div>
                        <span className="font-medium text-gray-700">Bio:</span>
                        <p className="text-gray-900 text-xs">{selectedChef.bio}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Location & Service Area Section */}
                {selectedChef.location && (
                  <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                    <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                      <span className="mr-2">📍</span> Location & Service Area
                    </h4>
                    <div className="space-y-3 text-sm">
                      {selectedChef.location.streetAddress && (
                        <div>
                          <span className="font-medium text-gray-700">Address:</span>
                          <p className="text-gray-900">{selectedChef.location.streetAddress}</p>
                        </div>
                      )}
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <span className="font-medium text-gray-700">City:</span>
                          <p className="text-gray-900">{selectedChef.location.city}</p>
                        </div>
                        <div>
                          <span className="font-medium text-gray-700">State:</span>
                          <p className="text-gray-900">{selectedChef.location.state || selectedChef.location.area}</p>
                        </div>
                      </div>
                      {selectedChef.location.postalCode && (
                        <div>
                          <span className="font-medium text-gray-700">Postal Code:</span>
                          <p className="text-gray-900">{selectedChef.location.postalCode}</p>
                        </div>
                      )}
                      {selectedChef.location.serviceRadius && (
                        <div>
                          <span className="font-medium text-gray-700">Service Radius:</span>
                          <p className="text-gray-900">{selectedChef.location.serviceRadius} km</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Kitchen & Equipment Section */}
                {selectedChef.kitchenDetails && (
                  <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                    <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                      <span className="mr-2">🍳</span> Kitchen & Equipment
                    </h4>
                    <div className="space-y-3 text-sm">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <span className="font-medium text-gray-700">Has Own Kitchen:</span>
                          <p className="text-gray-900">{selectedChef.kitchenDetails?.hasOwnKitchen ? 'Yes' : 'No'}</p>
                        </div>
                        <div>
                          <span className="font-medium text-gray-700">Cook at Customer Location:</span>
                          <p className="text-gray-900">{selectedChef.kitchenDetails?.canCookAtCustomerLocation ? 'Yes' : 'No'}</p>
                        </div>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">Transportation:</span>
                        <p className="text-gray-900">{selectedChef.kitchenDetails.transportationMethod}</p>
                      </div>
                      {selectedChef.kitchenDetails.kitchenEquipment && selectedChef.kitchenDetails.kitchenEquipment.length > 0 && (
                        <div>
                          <span className="font-medium text-gray-700">Equipment:</span>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {selectedChef.kitchenDetails.kitchenEquipment.map((equipment: string, index: number) => (
                              <span key={index} className="inline-block px-2 py-1 text-xs bg-orange-100 text-orange-800 rounded">
                                {equipment}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Availability & Capacity Section */}
                <div className="bg-teal-50 border border-teal-200 rounded-lg p-4">
                  <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <span className="mr-2">⏰</span> Availability & Capacity
                  </h4>
                  <div className="space-y-3 text-sm">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <span className="font-medium text-gray-700">Current Capacity:</span>
                        <p className="text-gray-900">{selectedChef.currentCapacity || 0}/{selectedChef.maxCapacity || 'N/A'}</p>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">Availability:</span>
                        <p className="text-gray-900">{selectedChef.availability || 'N/A'}</p>
                      </div>
                    </div>
                    
                    {selectedChef.workingHours && (
                      <div>
                        <span className="font-medium text-gray-700">Working Hours:</span>
                        <p className="text-gray-900">{selectedChef.workingHours.start} - {selectedChef.workingHours.end}</p>
                      </div>
                    )}

                    {selectedChef.preferences?.workingDays && selectedChef.preferences.workingDays.length > 0 && (
                      <div>
                        <span className="font-medium text-gray-700">Working Days:</span>
                        <div className="flex flex-wrap gap-1 mt-1">
                            {selectedChef.preferences.workingDays.map((day: string, index: number) => (
                            <span key={index} className="inline-block px-2 py-1 text-xs bg-teal-100 text-teal-800 rounded">
                              {day}
                            </span>
                            ))}
                        </div>
                      </div>
                    )}

                    <div>
                      <span className="font-medium text-gray-700">Orders Completed:</span>
                      <p className="text-gray-900">{selectedChef.totalOrdersCompleted || 0}</p>
                    </div>
                  </div>
                </div>

                {/* Emergency Contact Section */}
                {selectedChef.emergencyContact && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                      <span className="mr-2">🚨</span> Emergency Contact
                    </h4>
                    <div className="space-y-3 text-sm">
                      <div>
                        <span className="font-medium text-gray-700">Name:</span>
                        <p className="text-gray-900">{selectedChef.emergencyContact.name}</p>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <span className="font-medium text-gray-700">Relationship:</span>
                          <p className="text-gray-900">{selectedChef.emergencyContact.relationship}</p>
                        </div>
                        <div>
                          <span className="font-medium text-gray-700">Phone:</span>
                          <p className="text-gray-900">{selectedChef.emergencyContact.phone}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Bank Details Section */}
                {selectedChef.bankDetails && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                      <span className="mr-2">🏦</span> Bank Details
                    </h4>
                    <div className="space-y-3 text-sm">
                      <div>
                        <span className="font-medium text-gray-700">Account Name:</span>
                        <p className="text-gray-900">{selectedChef.bankDetails.accountName}</p>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <span className="font-medium text-gray-700">Account Number:</span>
                          <p className="text-gray-900">{selectedChef.bankDetails.accountNumber}</p>
                        </div>
                        <div>
                          <span className="font-medium text-gray-700">Bank:</span>
                          <p className="text-gray-900">{selectedChef.bankDetails.bankName}</p>
                        </div>
                      </div>
                      {selectedChef.bankDetails && selectedChef.bankDetails.bvn && (
                        <div>
                          <span className="font-medium text-gray-700">BVN:</span>
                          <p className="text-gray-900">{selectedChef.bankDetails.bvn}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* References Section */}
                {selectedChef.references && selectedChef.references.length > 0 && (
                  <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
                    <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                      <span className="mr-2">📋</span> References
                    </h4>
                    <div className="space-y-4">
                      {selectedChef.references && selectedChef.references.map((ref, index) => (
                        <div key={index} className="border-l-4 border-indigo-400 pl-4">
                          <div className="text-sm">
                            <div className="font-medium text-gray-900">{ref.name}</div>
                            <div className="grid grid-cols-2 gap-4 mt-1">
                              <div>
                                <span className="text-gray-600">Relationship:</span> {ref.relationship}
                              </div>
                              <div>
                                <span className="text-gray-600">Phone:</span> {ref.phone}
                              </div>
                            </div>
                            {ref.email && (
                              <div className="mt-1">
                                <span className="text-gray-600">Email:</span> {ref.email}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Account Status & Dates Section */}
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <span className="mr-2">📅</span> Account Information
                  </h4>
                  <div className="space-y-3 text-sm">
                    {selectedChef.joinDate && (
                      <div>
                        <span className="font-medium text-gray-700">Join Date:</span>
                        <p className="text-gray-900">{new Date(selectedChef.joinDate).toLocaleDateString()}</p>
                      </div>
                    )}
                    {selectedChef.lastLogin && (
                      <div>
                        <span className="font-medium text-gray-700">Last Login:</span>
                        <p className="text-gray-900">{new Date(selectedChef.lastLogin).toLocaleDateString()}</p>
                      </div>
                    )}
                    {selectedChef.legalAgreements?.agreementDate && (
                      <div>
                        <span className="font-medium text-gray-700">Terms Agreed:</span>
                        <p className="text-gray-900">{new Date(selectedChef.legalAgreements.agreementDate).toLocaleDateString()}</p>
                      </div>
                    )}
                    {selectedChef.earnings && (
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <span className="font-medium text-gray-700">Total Earnings:</span>
                          <p className="text-gray-900">₦{selectedChef.earnings.totalEarned?.toLocaleString() || 0}</p>
                        </div>
                        <div>
                          <span className="font-medium text-gray-700">Current Balance:</span>
                          <p className="text-gray-900">₦{selectedChef.earnings.currentBalance?.toLocaleString() || 0}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Legal Agreements Section */}
                {selectedChef.legalAgreements && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                      <span className="mr-2">📜</span> Legal Agreements
                    </h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center">
                        <span className={selectedChef.legalAgreements.agreedToTerms ? 'text-green-600' : 'text-red-600'}>
                          {selectedChef.legalAgreements.agreedToTerms ? '✅' : '❌'}
                        </span>
                        <span className="ml-2">Terms of Service</span>
                      </div>
                      <div className="flex items-center">
                        <span className={selectedChef.legalAgreements.agreedToPrivacyPolicy ? 'text-green-600' : 'text-red-600'}>
                          {selectedChef.legalAgreements.agreedToPrivacyPolicy ? '✅' : '❌'}
                        </span>
                        <span className="ml-2">Privacy Policy</span>
                      </div>
                      <div className="flex items-center">
                        <span className={selectedChef.legalAgreements.agreedToBackgroundCheck ? 'text-green-600' : 'text-red-600'}>
                          {selectedChef.legalAgreements.agreedToBackgroundCheck ? '✅' : '❌'}
                        </span>
                        <span className="ml-2">Background Check Consent</span>
                      </div>
                    </div>
                  </div>
                )}

              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
              <div className="flex justify-between items-center">
                <div className="flex space-x-3">
                  {selectedChef.status === 'Pending' && (
                    <>
                      <button
                        onClick={() => {
                          handleApproveChef(selectedChef._id);
                          setSelectedChef(null);
                        }}
                        className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 transition-colors"
                      >
                        Approve Chef
                      </button>
                      <button
                        onClick={() => {
                          handleRejectChef(selectedChef._id);
                          setSelectedChef(null);
                        }}
                        className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 transition-colors"
                      >
                        Reject Chef
                      </button>
                    </>
                  )}
                  {selectedChef.status === 'Active' && (
                    <select
                      onChange={(e) => {
                        if (e.target.value) {
                          handleStatusUpdate(selectedChef._id, e.target.value);
                          setSelectedChef(null);
                        }
                      }}
                      className="border rounded px-3 py-2 bg-white"
                      defaultValue=""
                    >
                      <option value="" disabled>Change Status</option>
                      <option value="Inactive">Deactivate</option>
                      <option value="Suspended">Suspend</option>
                    </select>
                  )}
                </div>
                <button
                  onClick={() => setSelectedChef(null)}
                  className="bg-gray-500 text-white px-6 py-2 rounded hover:bg-gray-600 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}