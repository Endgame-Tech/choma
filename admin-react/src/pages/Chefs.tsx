import React from 'react'
import { useState, useMemo, useEffect } from 'react'
import { useChefs } from '../hooks/useChefs'
import { chefsApi } from '../services/api'
import { emailService } from '../services/emailService'
import { useToast } from '../hooks/useToast'
import Toast from '../components/Toast'
import type { Chef } from '../types'

const Chefs: React.FC = () => {
  const [filter, setFilter] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('')
  const [selectedChef, setSelectedChef] = useState<Chef | null>(null)
  const { toasts, removeToast, success, error, warning } = useToast()

  // Debounce search term to prevent excessive API calls
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm)
    }, 500)

    return () => clearTimeout(timer)
  }, [searchTerm])

  // Build filters (memoized to prevent infinite re-renders)
  const filters = useMemo(() => {
    type ChefFilters = {
      search?: string
      status?: string
    }

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

  const { chefs, loading, error: chefsError, refreshChefs } = useChefs(filters)

  const handleStatusUpdate = async (chefId: string, newStatus: string) => {
    try {
      await chefsApi.updateChefStatus(chefId, newStatus)
      await refreshChefs()
    } catch (err) {
      console.error('Failed to update chef status:', err)
      error('Failed to update chef status. Please try again.')
    }
  }

  const handleApproveChef = async (chefId: string) => {
    try {
      const chef = chefs.find(c => c._id === chefId)
      if (!chef) {
        console.error('Chef not found')
        return
      }

      await chefsApi.approveChef(chefId)
      
      const emailSent = await emailService.sendChefAcceptanceEmail({
        chefName: chef.fullName,
        chefEmail: chef.email
      })

      if (emailSent) {
        success(`Chef ${chef.fullName} approved and welcome email sent!`)
      } else {
        warning(`Chef ${chef.fullName} approved but email notification failed`)
      }

      await refreshChefs()
    } catch (err) {
      console.error('Failed to approve chef:', err)
      error('Failed to approve chef. Please try again.')
    }
  }

  const handleRejectChef = async (chefId: string, reason?: string) => {
    try {
      const chef = chefs.find(c => c._id === chefId)
      if (!chef) {
        console.error('Chef not found')
        return
      }

      await chefsApi.rejectChef(chefId, reason)

      const emailSent = await emailService.sendChefRejectionEmail({
        chefName: chef.fullName,
        chefEmail: chef.email,
        reason: reason || 'No specific reason provided.'
      })

      if (emailSent) {
        success(`Chef ${chef.fullName} rejected and notification email sent!`)
      } else {
        warning(`Chef ${chef.fullName} rejected but email notification failed`)
      }

      await refreshChefs()
    } catch (err) {
      console.error('Failed to reject chef:', err)
      error('Failed to reject chef. Please try again.')
    }
  }

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active':
        return 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
      case 'pending':
        return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300'
      case 'inactive':
      case 'suspended':
        return 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300'
      default:
        return 'bg-gray-100 dark:bg-neutral-700/30 text-gray-800 dark:text-neutral-300'
    }
  }

  const getAvailabilityColor = (availability: string) => {
    switch (availability?.toLowerCase()) {
      case 'available':
        return 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
      case 'busy':
        return 'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300'
      case 'offline':
        return 'bg-gray-100 dark:bg-neutral-700/30 text-gray-800 dark:text-neutral-300'
      default:
        return 'bg-gray-100 dark:bg-neutral-700/30 text-gray-800 dark:text-neutral-300'
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-neutral-200">Loading chefs...</p>
        </div>
      </div>
    )
  }

  if (chefsError) {
    return (
      <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 rounded-lg p-4">
        <div className="flex items-center">
          <div className="text-red-400 dark:text-red-300 mr-3"><i className="fi fi-sr-warning"></i></div>
          <div>
            <h3 className="text-red-800 dark:text-red-300 font-medium">Error loading chefs</h3>
            <p className="text-red-600 dark:text-red-300 text-sm">{chefsError}</p>
            <button 
              onClick={refreshChefs}
              className="mt-2 text-red-600 dark:text-red-300 hover:text-red-800 dark:hover:text-red-400 text-sm font-medium"
            >
              Try again
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-semibold text-gray-900 dark:text-neutral-100">Chefs</h1>
        <p className="text-gray-600 dark:text-neutral-200">Manage chef profiles and assignments ({chefs.length} chefs)</p>
      </div>

      {/* Search and Filter Section */}
      <div className="space-y-4">
        {/* Search Bar */}
        <div className="flex items-center space-x-4">
          <div className="flex-1 max-w-md relative">
            <i className="fi fi-sr-search text-base absolute left-3 top-3 text-gray-400 dark:text-neutral-400"></i>
            <input
              type="text"
              placeholder="Search by chef name, email, or ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-full px-4 py-2 border border-gray-300 dark:border-neutral-600 bg-white/90 dark:bg-neutral-800/90 text-gray-900 dark:text-neutral-100 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <button
            onClick={refreshChefs}
            className="px-4 py-2 bg-blue-600 dark:bg-blue-700 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-800 transition-colors flex items-center gap-2"
          >
            <i className="fi fi-sr-refresh"></i>
            Refresh
          </button>
        </div>

        {/* Filter Tabs */}
        <div className="flex space-x-1 bg-gray-100 dark:bg-neutral-700/30 p-1 rounded-lg w-fit">
          {['all', 'active', 'pending', 'inactive'].map((filterType) => (
            <button
              key={filterType}
              onClick={() => setFilter(filterType)}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                filter === filterType
                  ? 'bg-white dark:bg-neutral-800 text-gray-900 dark:text-neutral-100 shadow-sm'
                  : 'text-gray-500 dark:text-neutral-300 hover:text-gray-700 dark:hover:text-neutral-100'
              }`}
            >
              {filterType.charAt(0).toUpperCase() + filterType.slice(1)} Chefs
            </button>
          ))}
        </div>
      </div>

      {/* Chefs Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {chefs.length === 0 ? (
          <div className="col-span-full bg-white/90 dark:bg-neutral-800/90 p-8 rounded-lg shadow-sm border border-gray-200 dark:border-neutral-700 text-center">
            <div className="text-4xl mb-2"><i className="fi fi-sr-user"></i></div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-neutral-100 mb-2">No Chefs Found</h3>
            <p className="text-gray-600 dark:text-neutral-200">No chefs match your current filters.</p>
          </div>
        ) : (
          chefs.map((chef) => (
            <div key={chef._id} className="bg-white/90 dark:bg-neutral-800/90 rounded-lg shadow-sm border border-gray-200 dark:border-neutral-700 overflow-hidden transition-transform hover:scale-[1.02]">
              {/* Chef Header */}
              <div className="p-4 border-b border-gray-200 dark:border-neutral-700 bg-gray-50 dark:bg-neutral-700/30">
                <div className="flex items-start justify-between">
                  <div className="flex items-center">
                    <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                      <span className="text-2xl text-white"><i className="fi fi-sr-user"></i></span>
                    </div>
                    <div className="ml-3">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-neutral-100">{chef.fullName}</h3>
                      <p className="text-sm text-gray-500 dark:text-neutral-300">{chef.email}</p>
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
              <div className="p-4 space-y-4">
                {/* Capacity */}
                {chef.currentCapacity !== undefined && chef.maxCapacity !== undefined && (
                  <div>
                    <div className="flex justify-between text-sm text-gray-600 dark:text-neutral-200 mb-1">
                      <span>Capacity</span>
                      <span>{chef.currentCapacity}/{chef.maxCapacity}</span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-neutral-600 rounded-full h-2.5">
                      <div 
                        className="bg-blue-500 h-2.5 rounded-full transition-all duration-300"
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
                      <span className="text-gray-600 dark:text-neutral-200">Experience</span>
                      <p className="font-medium text-gray-900 dark:text-neutral-100">{chef.experience} years</p>
                    </div>
                  )}
                  {chef.rating !== undefined && (
                    <div>
                      <span className="text-gray-600 dark:text-neutral-200">Rating</span>
                      <p className="font-medium text-gray-900 dark:text-neutral-100">{chef.rating}/5 <i className="fi fi-sr-star text-yellow-400"></i></p>
                    </div>
                  )}
                </div>

                {/* Location */}
                {chef.location && (
                  <div>
                    <span className="text-sm text-gray-600 dark:text-neutral-200">Location</span>
                    <p className="font-medium text-gray-900 dark:text-neutral-100">{chef.location.city}{chef.location.area ? `, ${chef.location.area}` : ''}</p>
                  </div>
                )}

                {/* Specialties */}
                {chef.specialties && chef.specialties.length > 0 && (
                  <div>
                    <span className="text-sm text-gray-600 dark:text-neutral-200">Specialties</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {chef.specialties.slice(0, 3).map((specialty, index) => (
                        <span key={index} className="inline-block px-2 py-1 text-xs bg-gray-100 dark:bg-neutral-700/30 text-gray-700 dark:text-neutral-300 rounded">
                          {specialty}
                        </span>
                      ))}
                      {chef.specialties.length > 3 && (
                        <span className="inline-block px-2 py-1 text-xs bg-gray-100 dark:bg-neutral-700/30 text-gray-700 dark:text-neutral-300 rounded">
                          +{chef.specialties.length - 3} more
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {/* Stats */}
                {chef.totalOrdersCompleted !== undefined && (
                  <div className="pt-2 border-t border-gray-200 dark:border-neutral-700">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600 dark:text-neutral-200">Orders Completed</span>
                      <span className="font-medium text-gray-900 dark:text-neutral-100">{chef.totalOrdersCompleted}</span>
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="mt-4 flex space-x-2">
                  <button
                    onClick={() => setSelectedChef(chef)}
                    className="flex-1 bg-blue-600 dark:bg-blue-700 text-white text-sm py-2 px-3 rounded-lg hover:bg-blue-700 dark:hover:bg-blue-800 transition-colors flex items-center justify-center gap-2"
                  >
                    <i className="fi fi-sr-eye"></i> View Details
                  </button>
                  {chef.status === 'Pending' && (
                    <>
                      <button
                        onClick={() => handleApproveChef(chef._id)}
                        className="flex-1 bg-green-600 dark:bg-green-700 text-white text-sm py-2 px-3 rounded-lg hover:bg-green-700 dark:hover:bg-green-800 transition-colors flex items-center justify-center gap-2"
                      >
                        <i className="fi fi-sr-check-circle"></i> Approve
                      </button>
                      <button
                        onClick={() => handleRejectChef(chef._id)}
                        className="flex-1 bg-red-600 dark:bg-red-700 text-white text-sm py-2 px-3 rounded-lg hover:bg-red-700 dark:hover:bg-red-800 transition-colors flex items-center justify-center gap-2"
                      >
                        <i className="fi fi-sr-cross-circle"></i> Reject
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
                      aria-label={`Change status for chef ${chef.fullName}`}
                      title={`Change status for ${chef.fullName}`}
                      className="text-xs border border-gray-300 dark:border-neutral-600 bg-white/90 dark:bg-neutral-800/90 text-gray-900 dark:text-neutral-100 rounded px-2 py-1"
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
        <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center p-4 z-50">
          <div className="bg-white/90 dark:bg-neutral-800/90 rounded-lg max-w-6xl w-full max-h-[90vh] overflow-hidden">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-gray-200 dark:border-neutral-700 bg-gray-50 dark:bg-neutral-700/30">
              <div className="flex justify-between items-center">
                <div className="flex items-center">
                  <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                    <span className="text-3xl text-white"><i className="fi fi-sr-user"></i></span>
                  </div>
                  <div className="ml-4">
                    <h3 className="text-2xl font-bold text-gray-900 dark:text-neutral-100">{selectedChef.fullName}</h3>
                    <p className="text-gray-600 dark:text-neutral-200">{selectedChef.email}</p>
                    <div className="flex items-center mt-1 gap-2">
                      <span className={`px-3 py-1 text-sm font-semibold rounded-full ${getStatusColor(selectedChef.status)}`}>
                        {selectedChef.status}
                      </span>
                      {selectedChef.availability && (
                        <span className={`px-3 py-1 text-sm font-semibold rounded-full ${getAvailabilityColor(selectedChef.availability)}`}>
                          {selectedChef.availability}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedChef(null)}
                  aria-label="Close chef details modal"
                  title="Close modal"
                  className="text-gray-400 dark:text-neutral-300 hover:text-gray-600 dark:hover:text-neutral-100 text-2xl"
                >
                  <i className="fi fi-sr-cross"></i>
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <div className="overflow-y-auto max-h-[calc(90vh-120px)]">
              <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* Personal Information Section */}
                <div className="bg-white/90 dark:bg-neutral-800/90 border border-gray-200 dark:border-neutral-700 rounded-lg p-4">
                  <h4 className="text-lg font-semibold text-gray-900 dark:text-neutral-100 mb-4 flex items-center">
                    <i className="fi fi-sr-user mr-2"></i> Personal Information
                  </h4>
                  <div className="space-y-3 text-sm">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <span className="font-medium text-gray-700 dark:text-neutral-200">Full Name:</span>
                        <p className="text-gray-900 dark:text-neutral-100">{selectedChef.fullName}</p>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700 dark:text-neutral-200">Gender:</span>
                        <p className="text-gray-900 dark:text-neutral-100">{selectedChef.gender || 'N/A'}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <span className="font-medium text-gray-700 dark:text-neutral-200">Email:</span>
                        <p className="text-gray-900 dark:text-neutral-100">{selectedChef.email}</p>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700 dark:text-neutral-200">Phone:</span>
                        <p className="text-gray-900 dark:text-neutral-100">{selectedChef.phone}</p>
                      </div>
                    </div>
                    {selectedChef.alternatePhone && (
                      <div>
                        <span className="font-medium text-gray-700 dark:text-neutral-200">Alternate Phone:</span>
                        <p className="text-gray-900 dark:text-neutral-100">{selectedChef.alternatePhone}</p>
                      </div>
                    )}
                    {selectedChef.dateOfBirth && (
                      <div>
                        <span className="font-medium text-gray-700 dark:text-neutral-200">Date of Birth:</span>
                        <p className="text-gray-900 dark:text-neutral-100">{new Date(selectedChef.dateOfBirth).toLocaleDateString()}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Identity Verification Section */}
                {selectedChef.identityVerification && (
                  <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 rounded-lg p-4">
                    <h4 className="text-lg font-semibold text-gray-900 dark:text-neutral-100 mb-4 flex items-center">
                      <i className="fi fi-sr-id-badge mr-2"></i> Identity Verification
                    </h4>
                    <div className="space-y-3 text-sm">
                      <div>
                        <span className="font-medium text-gray-700 dark:text-neutral-200">ID Type:</span>
                        <p className="text-gray-900 dark:text-neutral-100">{selectedChef.identityVerification.idType}</p>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700 dark:text-neutral-200">ID Number:</span>
                        <p className="text-gray-900 dark:text-neutral-100">{selectedChef.identityVerification.idNumber}</p>
                      </div>
                      {selectedChef.identityVerification.idExpiryDate && (
                        <div>
                          <span className="font-medium text-gray-700 dark:text-neutral-200">Expiry Date:</span>
                          <p className="text-gray-900 dark:text-neutral-100">{new Date(selectedChef.identityVerification.idExpiryDate).toLocaleDateString()}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Professional Details Section */}
                <div className="bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-700 rounded-lg p-4">
                  <h4 className="text-lg font-semibold text-gray-900 dark:text-neutral-100 mb-4 flex items-center">
                    <i className="fi fi-sr-user mr-2"></i> Professional Details
                  </h4>
                  <div className="space-y-3 text-sm">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <span className="font-medium text-gray-700 dark:text-neutral-200">Experience:</span>
                        <p className="text-gray-900 dark:text-neutral-100">{selectedChef.experience || 0} years</p>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700 dark:text-neutral-200">Rating:</span>
                        <p className="text-gray-900 dark:text-neutral-100">{selectedChef.rating || 'N/A'}/5 <i className="fi fi-sr-star text-yellow-400"></i></p>
                      </div>
                    </div>
                    
                    {selectedChef.specialties && selectedChef.specialties.length > 0 && (
                      <div>
                        <span className="font-medium text-gray-700 dark:text-neutral-200">Specialties:</span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {selectedChef.specialties.map((specialty, index) => (
                            <span key={index} className="inline-block px-2 py-1 text-xs bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 rounded">
                              {specialty}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {selectedChef.languagesSpoken && selectedChef.languagesSpoken.length > 0 && (
                      <div>
                        <span className="font-medium text-gray-700 dark:text-neutral-200">Languages:</span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {selectedChef.languagesSpoken.map((language: string, index: number) => (
                            <span key={index} className="inline-block px-2 py-1 text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 rounded">
                              {language}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {selectedChef.culinaryEducation && (
                      <div>
                        <span className="font-medium text-gray-700 dark:text-neutral-200">Education:</span>
                        <p className="text-gray-900 dark:text-neutral-100 text-xs">{selectedChef.culinaryEducation}</p>
                      </div>
                    )}

                    {selectedChef.previousWorkExperience && (
                      <div>
                        <span className="font-medium text-gray-700 dark:text-neutral-200">Work Experience:</span>
                        <p className="text-gray-900 dark:text-neutral-100 text-xs">{selectedChef.previousWorkExperience}</p>
                      </div>
                    )}

                    {selectedChef.certifications && selectedChef.certifications.length > 0 && (
                      <div>
                        <span className="font-medium text-gray-700 dark:text-neutral-200">Certifications:</span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {selectedChef.certifications.map((cert: string, index: number) => (
                            <span key={index} className="inline-block px-2 py-1 text-xs bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 rounded">
                              {cert}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {selectedChef.bio && (
                      <div>
                        <span className="font-medium text-gray-700 dark:text-neutral-200">Bio:</span>
                        <p className="text-gray-900 dark:text-neutral-100 text-xs">{selectedChef.bio}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Location & Service Area Section */}
                {selectedChef.location && (
                  <div className="bg-purple-50 dark:bg-purple-900/30 border border-purple-200 dark:border-purple-700 rounded-lg p-4">
                    <h4 className="text-lg font-semibold text-gray-900 dark:text-neutral-100 mb-4 flex items-center">
                      <i className="fi fi-sr-marker mr-2"></i> Location & Service Area
                    </h4>
                    <div className="space-y-3 text-sm">
                      {selectedChef.location.streetAddress && (
                        <div>
                          <span className="font-medium text-gray-700 dark:text-neutral-200">Address:</span>
                          <p className="text-gray-900 dark:text-neutral-100">{selectedChef.location.streetAddress}</p>
                        </div>
                      )}
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <span className="font-medium text-gray-700 dark:text-neutral-200">City:</span>
                          <p className="text-gray-900 dark:text-neutral-100">{selectedChef.location.city}</p>
                        </div>
                        <div>
                          <span className="font-medium text-gray-700 dark:text-neutral-200">State:</span>
                          <p className="text-gray-900 dark:text-neutral-100">{selectedChef.location.state || selectedChef.location.area}</p>
                        </div>
                      </div>
                      {selectedChef.location.postalCode && (
                        <div>
                          <span className="font-medium text-gray-700 dark:text-neutral-200">Postal Code:</span>
                          <p className="text-gray-900 dark:text-neutral-100">{selectedChef.location.postalCode}</p>
                        </div>
                      )}
                      {selectedChef.location.serviceRadius && (
                        <div>
                          <span className="font-medium text-gray-700 dark:text-neutral-200">Service Radius:</span>
                          <p className="text-gray-900 dark:text-neutral-100">{selectedChef.location.serviceRadius} km</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Kitchen & Equipment Section */}
                {selectedChef.kitchenDetails && (
                  <div className="bg-orange-50 dark:bg-orange-900/30 border border-orange-200 dark:border-orange-700 rounded-lg p-4">
                    <h4 className="text-lg font-semibold text-gray-900 dark:text-neutral-100 mb-4 flex items-center">
                      <i className="fi fi-sr-utensils mr-2"></i> Kitchen & Equipment
                    </h4>
                    <div className="space-y-3 text-sm">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <span className="font-medium text-gray-700 dark:text-neutral-200">Has Own Kitchen:</span>
                          <p className="text-gray-900 dark:text-neutral-100">{selectedChef.kitchenDetails?.hasOwnKitchen ? 'Yes' : 'No'}</p>
                        </div>
                        <div>
                          <span className="font-medium text-gray-700 dark:text-neutral-200">Cook at Customer Location:</span>
                          <p className="text-gray-900 dark:text-neutral-100">{selectedChef.kitchenDetails?.canCookAtCustomerLocation ? 'Yes' : 'No'}</p>
                        </div>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700 dark:text-neutral-200">Transportation:</span>
                        <p className="text-gray-900 dark:text-neutral-100">{selectedChef.kitchenDetails.transportationMethod}</p>
                      </div>
                      {selectedChef.kitchenDetails.kitchenEquipment && selectedChef.kitchenDetails.kitchenEquipment.length > 0 && (
                        <div>
                          <span className="font-medium text-gray-700 dark:text-neutral-200">Equipment:</span>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {selectedChef.kitchenDetails.kitchenEquipment.map((equipment: string, index: number) => (
                              <span key={index} className="inline-block px-2 py-1 text-xs bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300 rounded">
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
                <div className="bg-teal-50 dark:bg-teal-900/30 border border-teal-200 dark:border-teal-700 rounded-lg p-4">
                  <h4 className="text-lg font-semibold text-gray-900 dark:text-neutral-100 mb-4 flex items-center">
                    <i className="fi fi-sr-clock mr-2"></i> Availability & Capacity
                  </h4>
                  <div className="space-y-3 text-sm">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <span className="font-medium text-gray-700 dark:text-neutral-200">Current Capacity:</span>
                        <p className="text-gray-900 dark:text-neutral-100">{selectedChef.currentCapacity || 0}/{selectedChef.maxCapacity || 'N/A'}</p>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700 dark:text-neutral-200">Availability:</span>
                        <p className="text-gray-900 dark:text-neutral-100">{selectedChef.availability || 'N/A'}</p>
                      </div>
                    </div>
                    
                    {selectedChef.workingHours && (
                      <div>
                        <span className="font-medium text-gray-700 dark:text-neutral-200">Working Hours:</span>
                        <p className="text-gray-900 dark:text-neutral-100">{selectedChef.workingHours.start} - {selectedChef.workingHours.end}</p>
                      </div>
                    )}

                    {selectedChef.preferences?.workingDays && selectedChef.preferences.workingDays.length > 0 && (
                      <div>
                        <span className="font-medium text-gray-700 dark:text-neutral-200">Working Days:</span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {selectedChef.preferences.workingDays.map((day: string, index: number) => (
                            <span key={index} className="inline-block px-2 py-1 text-xs bg-teal-100 dark:bg-teal-900/30 text-teal-800 dark:text-teal-300 rounded">
                              {day}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    <div>
                      <span className="font-medium text-gray-700 dark:text-neutral-200">Orders Completed:</span>
                      <p className="text-gray-900 dark:text-neutral-100">{selectedChef.totalOrdersCompleted || 0}</p>
                    </div>
                  </div>
                </div>

                {/* Emergency Contact Section */}
                {selectedChef.emergencyContact && (
                  <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 rounded-lg p-4">
                    <h4 className="text-lg font-semibold text-gray-900 dark:text-neutral-100 mb-4 flex items-center">
                      <i className="fi fi-sr-warning mr-2"></i> Emergency Contact
                    </h4>
                    <div className="space-y-3 text-sm">
                      <div>
                        <span className="font-medium text-gray-700 dark:text-neutral-200">Name:</span>
                        <p className="text-gray-900 dark:text-neutral-100">{selectedChef.emergencyContact.name}</p>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <span className="font-medium text-gray-700 dark:text-neutral-200">Relationship:</span>
                          <p className="text-gray-900 dark:text-neutral-100">{selectedChef.emergencyContact.relationship}</p>
                        </div>
                        <div>
                          <span className="font-medium text-gray-700 dark:text-neutral-200">Phone:</span>
                          <p className="text-gray-900 dark:text-neutral-100">{selectedChef.emergencyContact.phone}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Bank Details Section */}
                {selectedChef.bankDetails && (
                  <div className="bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-700 rounded-lg p-4">
                    <h4 className="text-lg font-semibold text-gray-900 dark:text-neutral-100 mb-4 flex items-center">
                      <i className="fi fi-sr-bank mr-2"></i> Bank Details
                    </h4>
                    <div className="space-y-3 text-sm">
                      <div>
                        <span className="font-medium text-gray-700 dark:text-neutral-200">Account Name:</span>
                        <p className="text-gray-900 dark:text-neutral-100">{selectedChef.bankDetails.accountName}</p>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <span className="font-medium text-gray-700 dark:text-neutral-200">Account Number:</span>
                          <p className="text-gray-900 dark:text-neutral-100">{selectedChef.bankDetails.accountNumber}</p>
                        </div>
                        <div>
                          <span className="font-medium text-gray-700 dark:text-neutral-200">Bank:</span>
                          <p className="text-gray-900 dark:text-neutral-100">{selectedChef.bankDetails.bankName}</p>
                        </div>
                      </div>
                      {selectedChef.bankDetails && selectedChef.bankDetails.bvn && (
                        <div>
                          <span className="font-medium text-gray-700 dark:text-neutral-200">BVN:</span>
                          <p className="text-gray-900 dark:text-neutral-100">{selectedChef.bankDetails.bvn}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* References Section */}
                {selectedChef.references && selectedChef.references.length > 0 && (
                  <div className="bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-200 dark:border-indigo-700 rounded-lg p-4">
                    <h4 className="text-lg font-semibold text-gray-900 dark:text-neutral-100 mb-4 flex items-center">
                      <i className="fi fi-sr-clipboard-list mr-2"></i> References
                    </h4>
                    <div className="space-y-4">
                      {selectedChef.references.map((ref, index) => (
                        <div key={index} className="border-l-4 border-indigo-400 dark:border-indigo-600 pl-4">
                          <div className="text-sm">
                            <div className="font-medium text-gray-900 dark:text-neutral-100">{ref.name}</div>
                            <div className="grid grid-cols-2 gap-4 mt-1">
                              <div>
                                <span className="text-gray-600 dark:text-neutral-200">Relationship:</span> {ref.relationship}
                              </div>
                              <div>
                                <span className="text-gray-600 dark:text-neutral-200">Phone:</span> {ref.phone}
                              </div>
                            </div>
                            {ref.email && (
                              <div className="mt-1">
                                <span className="text-gray-600 dark:text-neutral-200">Email:</span> {ref.email}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Account Status & Dates Section */}
                <div className="bg-gray-50 dark:bg-neutral-700/30 border border-gray-200 dark:border-neutral-700 rounded-lg p-4">
                  <h4 className="text-lg font-semibold text-gray-900 dark:text-neutral-100 mb-4 flex items-center">
                    <i className="fi fi-sr-calendar mr-2"></i> Account Information
                  </h4>
                  <div className="space-y-3 text-sm">
                    {selectedChef.joinDate && (
                      <div>
                        <span className="font-medium text-gray-700 dark:text-neutral-200">Join Date:</span>
                        <p className="text-gray-900 dark:text-neutral-100">{new Date(selectedChef.joinDate).toLocaleDateString()}</p>
                      </div>
                    )}
                    {selectedChef.lastLogin && (
                      <div>
                        <span className="font-medium text-gray-700 dark:text-neutral-200">Last Login:</span>
                        <p className="text-gray-900 dark:text-neutral-100">{new Date(selectedChef.lastLogin).toLocaleDateString()}</p>
                      </div>
                    )}
                    {selectedChef.legalAgreements?.agreementDate && (
                      <div>
                        <span className="font-medium text-gray-700 dark:text-neutral-200">Terms Agreed:</span>
                        <p className="text-gray-900 dark:text-neutral-100">{new Date(selectedChef.legalAgreements.agreementDate).toLocaleDateString()}</p>
                      </div>
                    )}
                    {selectedChef.earnings && (
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <span className="font-medium text-gray-700 dark:text-neutral-200">Total Earnings:</span>
                          <p className="text-gray-900 dark:text-neutral-100">₦{selectedChef.earnings.totalEarned?.toLocaleString() || 0}</p>
                        </div>
                        <div>
                          <span className="font-medium text-gray-700 dark:text-neutral-200">Current Balance:</span>
                          <p className="text-gray-900 dark:text-neutral-100">₦{selectedChef.earnings.currentBalance?.toLocaleString() || 0}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Legal Agreements Section */}
                {selectedChef.legalAgreements && (
                  <div className="bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-700 rounded-lg p-4">
                    <h4 className="text-lg font-semibold text-gray-900 dark:text-neutral-100 mb-4 flex items-center">
                      <i className="fi fi-sr-document-signed mr-2"></i> Legal Agreements
                    </h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center">
                        <span className={selectedChef.legalAgreements.agreedToTerms ? 'text-green-600 dark:text-green-300' : 'text-red-600 dark:text-red-300'}>
                          {selectedChef.legalAgreements.agreedToTerms ? <i className="fi fi-sr-check-circle"></i> : <i className="fi fi-sr-cross-circle"></i>}
                        </span>
                        <span className="ml-2 text-gray-900 dark:text-neutral-100">Terms of Service</span>
                      </div>
                      <div className="flex items-center">
                        <span className={selectedChef.legalAgreements.agreedToPrivacyPolicy ? 'text-green-600 dark:text-green-300' : 'text-red-600 dark:text-red-300'}>
                          {selectedChef.legalAgreements.agreedToPrivacyPolicy ? <i className="fi fi-sr-check-circle"></i> : <i className="fi fi-sr-cross-circle"></i>}
                        </span>
                        <span className="ml-2 text-gray-900 dark:text-neutral-100">Privacy Policy</span>
                      </div>
                      <div className="flex items-center">
                        <span className={selectedChef.legalAgreements.agreedToBackgroundCheck ? 'text-green-600 dark:text-green-300' : 'text-red-600 dark:text-red-300'}>
                          {selectedChef.legalAgreements.agreedToBackgroundCheck ? <i className="fi fi-sr-check-circle"></i> : <i className="fi fi-sr-cross-circle"></i>}
                        </span>
                        <span className="ml-2 text-gray-900 dark:text-neutral-100">Background Check Consent</span>
                      </div>
                    </div>
                  </div>
                )}

              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-gray-200 dark:border-neutral-700 bg-gray-50 dark:bg-neutral-700/30">
              <div className="flex justify-between items-center">
                <div className="flex space-x-3">
                  {selectedChef.status === 'Pending' && (
                    <>
                      <button
                        onClick={() => {
                          handleApproveChef(selectedChef._id)
                          setSelectedChef(null)
                        }}
                        className="bg-green-600 dark:bg-green-700 text-white px-4 py-2 rounded-lg hover:bg-green-700 dark:hover:bg-green-800 transition-colors flex items-center gap-2"
                      >
                        <i className="fi fi-sr-check-circle"></i> Approve Chef
                      </button>
                      <button
                        onClick={() => {
                          handleRejectChef(selectedChef._id)
                          setSelectedChef(null)
                        }}
                        className="bg-red-600 dark:bg-red-700 text-white px-4 py-2 rounded-lg hover:bg-red-700 dark:hover:bg-red-800 transition-colors flex items-center gap-2"
                      >
                        <i className="fi fi-sr-cross-circle"></i> Reject Chef
                      </button>
                    </>
                  )}
                  {selectedChef.status === 'Active' && (
                    <select
                      onChange={(e) => {
                        if (e.target.value) {
                          handleStatusUpdate(selectedChef._id, e.target.value)
                          setSelectedChef(null)
                        }
                      }}
                      aria-label={`Change status for chef ${selectedChef.fullName}`}
                      title={`Change status for ${selectedChef.fullName}`}
                      className="border border-gray-300 dark:border-neutral-600 bg-white/90 dark:bg-neutral-800/90 text-gray-900 dark:text-neutral-100 rounded px-3 py-2"
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
                  className="bg-gray-500 dark:bg-neutral-600 text-white px-6 py-2 rounded-lg hover:bg-gray-600 dark:hover:bg-neutral-700 transition-colors flex items-center gap-2"
                >
                  <i className="fi fi-sr-cross"></i> Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notifications */}
      {toasts.map(toast => (
        <Toast
          key={toast.id}
          message={toast.message}
          type={toast.type}
          duration={toast.duration}
          onClose={() => removeToast(toast.id)}
        />
      ))}
    </div>
  )
}

export default Chefs