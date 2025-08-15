import React, { useState, useEffect } from 'react';
import { Admin, PREDEFINED_ROLES, UpdateAdminRequest } from '../types/admin';
import { XMarkIcon } from '@heroicons/react/24/outline';

interface EditAdminModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (adminData: UpdateAdminRequest) => void;
  admin: Admin;
}

const EditAdminModal: React.FC<EditAdminModalProps> = ({ 
  isOpen, 
  onClose, 
  onSubmit,
  admin 
}) => {
  const [formData, setFormData] = useState<UpdateAdminRequest>({
    firstName: admin.firstName,
    lastName: admin.lastName,
    roleId: admin.role.id,
    isActive: admin.isActive
  });
  
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Update form data when admin changes
  useEffect(() => {
    setFormData({
      firstName: admin.firstName,
      lastName: admin.lastName,
      roleId: admin.role.id,
      isActive: admin.isActive
    });
  }, [admin]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.firstName?.trim()) {
      newErrors.firstName = 'First name is required';
    }

    if (!formData.lastName?.trim()) {
      newErrors.lastName = 'Last name is required';
    }

    if (!formData.roleId) {
      newErrors.roleId = 'Please select a role';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      await onSubmit(formData);
      setErrors({});
    } catch (error) {
      // Error handling is done in parent component
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedRole = PREDEFINED_ROLES.find(role => role.id === formData.roleId);
  const hasChanges = 
    formData.firstName !== admin.firstName ||
    formData.lastName !== admin.lastName ||
    formData.roleId !== admin.role.id ||
    formData.isActive !== admin.isActive;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-neutral-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[95vh] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-neutral-700 bg-gray-50 dark:bg-neutral-700">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-neutral-100">Edit Admin</h2>
              <p className="text-sm text-gray-600 dark:text-neutral-300">
                Update {admin.firstName} {admin.lastName}&apos;s information and permissions
                {admin.isAlphaAdmin && (
                  <span className="ml-2 px-2 py-1 text-xs font-medium bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300 rounded-full">
                    Alpha Admin
                  </span>
                )}
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              title="Close"
            >
              <XMarkIcon className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(95vh-140px)]">
          {admin.isAlphaAdmin && (
            <div className="mb-6 p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-700">
              <div className="flex items-center">
                <div className="text-purple-600 dark:text-purple-400 mr-3">
                  <i className="fi fi-sr-shield-check text-lg"></i>
                </div>
                <div>
                  <h3 className="text-purple-800 dark:text-purple-300 font-medium">Alpha Admin Account</h3>
                  <p className="text-purple-700 dark:text-purple-300 text-sm">
                    This is the main administrator account. Some restrictions apply for security.
                  </p>
                </div>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Personal Information */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-neutral-100 mb-4">Personal Information</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-neutral-200 mb-2">
                    First Name *
                  </label>
                  <input
                    type="text"
                    value={formData.firstName}
                    onChange={(e) => setFormData(prev => ({ ...prev, firstName: e.target.value }))}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      errors.firstName 
                        ? 'border-red-300 dark:border-red-600' 
                        : 'border-gray-300 dark:border-neutral-600'
                    } bg-white dark:bg-neutral-800 text-gray-900 dark:text-neutral-100`}
                    placeholder="Enter first name"
                  />
                  {errors.firstName && (
                    <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.firstName}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-neutral-200 mb-2">
                    Last Name *
                  </label>
                  <input
                    type="text"
                    value={formData.lastName}
                    onChange={(e) => setFormData(prev => ({ ...prev, lastName: e.target.value }))}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      errors.lastName 
                        ? 'border-red-300 dark:border-red-600' 
                        : 'border-gray-300 dark:border-neutral-600'
                    } bg-white dark:bg-neutral-800 text-gray-900 dark:text-neutral-100`}
                    placeholder="Enter last name"
                  />
                  {errors.lastName && (
                    <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.lastName}</p>
                  )}
                </div>
              </div>

              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-neutral-200 mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  value={admin.email}
                  disabled
                  className="w-full px-3 py-2 border border-gray-300 dark:border-neutral-600 bg-gray-100 dark:bg-neutral-700 text-gray-500 dark:text-neutral-400 rounded-lg cursor-not-allowed"
                />
                <p className="mt-1 text-xs text-gray-500 dark:text-neutral-400">
                  Email address cannot be changed after account creation
                </p>
              </div>
            </div>

            {/* Role Selection */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-neutral-100 mb-4">Role & Permissions</h3>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-neutral-200 mb-2">
                  Admin Role *
                </label>
                <select
                  value={formData.roleId}
                  onChange={(e) => setFormData(prev => ({ ...prev, roleId: e.target.value }))}
                  disabled={admin.isAlphaAdmin}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    admin.isAlphaAdmin 
                      ? 'bg-gray-100 dark:bg-neutral-700 text-gray-500 dark:text-neutral-400 cursor-not-allowed'
                      : errors.roleId 
                        ? 'border-red-300 dark:border-red-600 bg-white dark:bg-neutral-800 text-gray-900 dark:text-neutral-100' 
                        : 'border-gray-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 text-gray-900 dark:text-neutral-100'
                  }`}
                >
                  <option value="">Select a role</option>
                  {PREDEFINED_ROLES.map(role => (
                    <option key={role.id} value={role.id}>{role.name}</option>
                  ))}
                </select>
                {errors.roleId && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.roleId}</p>
                )}
                {admin.isAlphaAdmin && (
                  <p className="mt-1 text-xs text-gray-500 dark:text-neutral-400">
                    Alpha Admin role cannot be changed
                  </p>
                )}
              </div>

              {/* Role Description */}
              {selectedRole && (
                <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-700">
                  <h4 className="font-medium text-blue-900 dark:text-blue-300 mb-2">{selectedRole.name}</h4>
                  <p className="text-sm text-blue-700 dark:text-blue-300 mb-3">{selectedRole.description}</p>
                  
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-blue-800 dark:text-blue-300">Key Permissions:</p>
                    <div className="flex flex-wrap gap-1">
                      {Object.entries(selectedRole.permissions).map(([section, perms]) => {
                        const hasPermissions = Object.values(perms).some(p => p === true);
                        if (!hasPermissions) return null;
                        
                        return (
                          <span 
                            key={section}
                            className="text-xs px-2 py-1 bg-blue-100 dark:bg-blue-800/30 text-blue-800 dark:text-blue-300 rounded-full capitalize"
                          >
                            {section.replace(/([A-Z])/g, ' $1').trim()}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Account Status */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-neutral-100 mb-4">Account Status</h3>
              
              <div className="flex items-center space-x-3">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.isActive}
                    onChange={(e) => setFormData(prev => ({ ...prev, isActive: e.target.checked }))}
                    disabled={admin.isAlphaAdmin}
                    className={`rounded border-gray-300 dark:border-neutral-600 text-blue-600 focus:ring-blue-500 ${
                      admin.isAlphaAdmin ? 'cursor-not-allowed opacity-50' : ''
                    }`}
                  />
                  <span className="ml-2 text-sm text-gray-700 dark:text-neutral-200">
                    Active account
                  </span>
                </label>
              </div>
              
              <p className="mt-2 text-xs text-gray-500 dark:text-neutral-400">
                {admin.isAlphaAdmin 
                  ? 'Alpha Admin account is always active and cannot be deactivated'
                  : 'Inactive accounts cannot log in to the admin panel'
                }
              </p>
            </div>

            {/* Account Information */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-neutral-100 mb-4">Account Information</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-500 dark:text-neutral-400">Created:</span>
                  <p className="text-gray-900 dark:text-neutral-100">
                    {new Date(admin.createdAt).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </p>
                </div>
                
                <div>
                  <span className="text-gray-500 dark:text-neutral-400">Last Login:</span>
                  <p className="text-gray-900 dark:text-neutral-100">
                    {admin.lastLogin 
                      ? new Date(admin.lastLogin).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })
                      : 'Never'
                    }
                  </p>
                </div>
              </div>
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 dark:border-neutral-700 bg-gray-50 dark:bg-neutral-700">
          <div className="flex justify-between items-center">
            <div className="text-sm text-gray-500 dark:text-neutral-400">
              {hasChanges ? 'You have unsaved changes' : 'No changes made'}
            </div>
            
            <div className="flex space-x-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-gray-700 dark:text-neutral-200 bg-white dark:bg-neutral-800 border border-gray-300 dark:border-neutral-600 rounded-lg hover:bg-gray-50 dark:hover:bg-neutral-700 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                onClick={handleSubmit}
                disabled={isSubmitting || !hasChanges}
                className="px-4 py-2 bg-blue-600 dark:bg-blue-700 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isSubmitting ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EditAdminModal;