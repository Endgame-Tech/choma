import React, { useState } from 'react';
import { XMarkIcon, CheckIcon } from '@heroicons/react/24/outline';
import { AdminRole, AdminPermissions } from '../types/admin';
import { activityLogger } from '../services/activityLogger';
import { usePermissions } from '../contexts/PermissionContext';

interface CreateRoleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (roleData: Omit<AdminRole, 'id'>) => void;
}

interface PermissionModule {
  name: string;
  key: keyof AdminPermissions;
  actions: { key: string; label: string; description: string }[];
}

const permissionModules: PermissionModule[] = [
  {
    name: 'Dashboard',
    key: 'dashboard',
    actions: [
      { key: 'view', label: 'View Dashboard', description: 'Access dashboard overview and statistics' }
    ]
  },
  {
    name: 'Analytics',
    key: 'analytics',
    actions: [
      { key: 'view', label: 'View Analytics', description: 'Access analytics reports and insights' }
    ]
  },
  {
    name: 'Orders',
    key: 'orders',
    actions: [
      { key: 'view', label: 'View Orders', description: 'See all customer orders' },
      { key: 'create', label: 'Create Orders', description: 'Create new orders manually' },
      { key: 'edit', label: 'Edit Orders', description: 'Modify order details' },
      { key: 'delete', label: 'Delete Orders', description: 'Remove orders from system' },
      { key: 'approve', label: 'Approve Orders', description: 'Approve pending orders' }
    ]
  },
  {
    name: 'Chefs',
    key: 'chefs',
    actions: [
      { key: 'view', label: 'View Chefs', description: 'See chef profiles and information' },
      { key: 'create', label: 'Create Chefs', description: 'Add new chef accounts' },
      { key: 'edit', label: 'Edit Chefs', description: 'Modify chef profiles and settings' },
      { key: 'delete', label: 'Delete Chefs', description: 'Remove chef accounts' },
      { key: 'approve', label: 'Approve Chefs', description: 'Approve chef applications' },
      { key: 'manageApplications', label: 'Manage Applications', description: 'Handle chef application process' }
    ]
  },
  {
    name: 'Users',
    key: 'users',
    actions: [
      { key: 'view', label: 'View Users', description: 'See user accounts and basic info' },
      { key: 'create', label: 'Create Users', description: 'Add new user accounts' },
      { key: 'edit', label: 'Edit Users', description: 'Modify user profiles' },
      { key: 'delete', label: 'Delete Users', description: 'Remove user accounts' },
      { key: 'viewSensitiveInfo', label: 'View Sensitive Info', description: 'Access personal and payment details' }
    ]
  },
  {
    name: 'Customers',
    key: 'customers',
    actions: [
      { key: 'view', label: 'View Customers', description: 'See customer accounts and order history' },
      { key: 'edit', label: 'Edit Customers', description: 'Modify customer profiles' },
      { key: 'delete', label: 'Delete Customers', description: 'Remove customer accounts' },
      { key: 'viewSensitiveInfo', label: 'View Sensitive Info', description: 'Access personal and payment details' }
    ]
  },
  {
    name: 'Meals',
    key: 'meals',
    actions: [
      { key: 'view', label: 'View Meals', description: 'See meal catalog and details' },
      { key: 'create', label: 'Create Meals', description: 'Add new meals to catalog' },
      { key: 'edit', label: 'Edit Meals', description: 'Modify meal details and pricing' },
      { key: 'delete', label: 'Delete Meals', description: 'Remove meals from catalog' },
      { key: 'bulkUpload', label: 'Bulk Upload', description: 'Upload multiple meals via Excel' },
      { key: 'manageAvailability', label: 'Manage Availability', description: 'Control meal availability status' }
    ]
  },
  {
    name: 'Meal Plans',
    key: 'mealPlans',
    actions: [
      { key: 'view', label: 'View Meal Plans', description: 'See meal plans and schedules' },
      { key: 'create', label: 'Create Meal Plans', description: 'Design new meal plans' },
      { key: 'edit', label: 'Edit Meal Plans', description: 'Modify meal plan details' },
      { key: 'delete', label: 'Delete Meal Plans', description: 'Remove meal plans' },
      { key: 'publish', label: 'Publish Plans', description: 'Make meal plans available to customers' },
      { key: 'schedule', label: 'Schedule Plans', description: 'Set meal plan delivery schedules' }
    ]
  },
  {
    name: 'Admin Management',
    key: 'adminManagement',
    actions: [
      { key: 'view', label: 'View Admins', description: 'See admin accounts and roles' },
      { key: 'create', label: 'Create Admins', description: 'Add new admin accounts' },
      { key: 'edit', label: 'Edit Admins', description: 'Modify admin permissions and roles' },
      { key: 'delete', label: 'Delete Admins', description: 'Remove admin accounts' },
      { key: 'managePermissions', label: 'Manage Permissions', description: 'Control admin access levels' },
      { key: 'view_activity_logs', label: 'View Activity Logs', description: 'Access admin activity history' },
      { key: 'manage_sessions', label: 'Manage Sessions', description: 'Control admin login sessions' }
    ]
  }
];

const CreateRoleModal: React.FC<CreateRoleModalProps> = ({ isOpen, onClose, onSubmit }) => {
  const { currentAdmin } = usePermissions();
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    permissions: {} as AdminPermissions
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  // Initialize permissions with all false
  React.useEffect(() => {
    if (isOpen) {
      const initialPermissions = {} as AdminPermissions;
      permissionModules.forEach(module => {
        const modulePermissions: Record<string, boolean> = {};
        module.actions.forEach(action => {
          modulePermissions[action.key] = false;
        });
        (initialPermissions as unknown as Record<string, Record<string, boolean>>)[module.key] = modulePermissions;
      });
      setFormData(prev => ({ ...prev, permissions: initialPermissions }));
    }
  }, [isOpen]);

  const handlePermissionChange = (moduleKey: keyof AdminPermissions, actionKey: string, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      permissions: {
        ...prev.permissions,
        [moduleKey]: {
          ...prev.permissions[moduleKey],
          [actionKey]: checked
        }
      }
    }));
  };

  const handleSelectAllModule = (moduleKey: keyof AdminPermissions, checked: boolean) => {
    const module = permissionModules.find(m => m.key === moduleKey);
    if (!module) return;

    const modulePermissions = { ...formData.permissions[moduleKey] };
    module.actions.forEach(action => {
      (modulePermissions as Record<string, boolean>)[action.key] = checked;
    });

    setFormData(prev => ({
      ...prev,
      permissions: {
        ...prev.permissions,
        [moduleKey]: modulePermissions
      }
    }));
  };

  const getModulePermissionCount = (moduleKey: keyof AdminPermissions) => {
    const modulePermissions = formData.permissions[moduleKey] as Record<string, boolean>;
    if (!modulePermissions) return { enabled: 0, total: 0 };

    const enabled = Object.values(modulePermissions).filter(Boolean).length;
    const total = Object.keys(modulePermissions).length;
    return { enabled, total };
  };

  const getTotalPermissionCount = () => {
    let enabled = 0;
    let total = 0;

    permissionModules.forEach(module => {
      const count = getModulePermissionCount(module.key);
      enabled += count.enabled;
      total += count.total;
    });

    return { enabled, total };
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Role name is required';
    } else if (formData.name.length < 3) {
      newErrors.name = 'Role name must be at least 3 characters';
    } else if (formData.name.length > 50) {
      newErrors.name = 'Role name must be less than 50 characters';
    }

    if (!formData.description.trim()) {
      newErrors.description = 'Role description is required';
    } else if (formData.description.length < 10) {
      newErrors.description = 'Description must be at least 10 characters';
    } else if (formData.description.length > 200) {
      newErrors.description = 'Description must be less than 200 characters';
    }

    const { enabled } = getTotalPermissionCount();
    if (enabled === 0) {
      newErrors.permissions = 'At least one permission must be selected';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setLoading(true);
    try {
      const roleData: Omit<AdminRole, 'id'> = {
        name: formData.name.trim(),
        description: formData.description.trim(),
        permissions: formData.permissions,
        isDefault: false
      };

      // Log activity
      if (currentAdmin) {
        await activityLogger.logAdminAction(
          currentAdmin._id,
          `${currentAdmin.firstName} ${currentAdmin.lastName}`,
          currentAdmin.email,
          'CREATE',
          undefined,
          {
            roleName: roleData.name,
            permissionCount: getTotalPermissionCount().enabled,
            actionType: 'create_custom_role'
          }
        );
      }

      await onSubmit(roleData);
      handleClose();
    } catch (error) {
      console.error('Error creating role:', error);
      setErrors({ submit: 'Failed to create role. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFormData({ name: '', description: '', permissions: {} as AdminPermissions });
    setErrors({});
    setLoading(false);
    onClose();
  };

  if (!isOpen) return null;

  const totalCount = getTotalPermissionCount();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-choma-dark rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col">
        {/* Fixed Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Create Custom Role
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              Define a new role with specific permissions for admin users
            </p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            aria-label="Close"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          {/* Scrollable Content Area */}
          <div className="flex-1 overflow-y-auto p-6">
            {/* Basic Information */}
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Role Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-choma-black text-gray-900 dark:text-white focus:ring-2 focus:ring-choma-orange focus:border-transparent ${errors.name ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                    }`}
                  placeholder="e.g., Content Editor, Customer Support"
                />
                {errors.name && (
                  <p className="text-red-500 text-sm mt-1">{errors.name}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Role Description *
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  rows={3}
                  className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-choma-black text-gray-900 dark:text-white focus:ring-2 focus:ring-choma-orange focus:border-transparent resize-none ${errors.description ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                    }`}
                  placeholder="Describe what this role can do and when it should be used..."
                />
                {errors.description && (
                  <p className="text-red-500 text-sm mt-1">{errors.description}</p>
                )}
              </div>
            </div>

            {/* Permissions Summary */}
            <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <h3 className="font-medium text-blue-900 dark:text-blue-300 mb-2">
                Permission Summary
              </h3>
              <p className="text-sm text-blue-700 dark:text-blue-400">
                {totalCount.enabled} of {totalCount.total} permissions selected
              </p>
              {errors.permissions && (
                <p className="text-red-500 text-sm mt-2">{errors.permissions}</p>
              )}
            </div>

            {/* Permissions Grid */}
            <div className="space-y-6">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                Permissions Configuration
              </h3>

              {permissionModules.map(module => {
                const count = getModulePermissionCount(module.key);
                const allSelected = count.enabled === count.total;
                const someSelected = count.enabled > 0 && count.enabled < count.total;

                return (
                  <div key={module.key} className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                    <div className="bg-gray-50 dark:bg-choma-black/30 px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <label className="flex items-center space-x-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={allSelected}
                              ref={input => {
                                if (input) input.indeterminate = someSelected;
                              }}
                              onChange={(e) => handleSelectAllModule(module.key, e.target.checked)}
                              className="w-4 h-4 text-choma-orange border-gray-300 rounded focus:ring-choma-orange"
                            />
                            <span className="text-sm font-medium text-gray-900 dark:text-white">
                              {module.name}
                            </span>
                          </label>
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            ({count.enabled}/{count.total})
                          </span>
                        </div>
                        {count.enabled > 0 && (
                          <CheckIcon className="w-4 h-4 text-green-600" />
                        )}
                      </div>
                    </div>

                    <div className="p-4 space-y-3">
                      {module.actions.map(action => {
                        const isChecked = (formData.permissions[module.key] as Record<string, boolean>)?.[action.key] || false;

                        return (
                          <label key={action.key} className="flex items-start space-x-3 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={(e) => handlePermissionChange(module.key, action.key, e.target.checked)}
                              className="w-4 h-4 text-choma-orange border-gray-300 rounded focus:ring-choma-orange mt-0.5"
                            />
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium text-gray-900 dark:text-white">
                                {action.label}
                              </div>
                              <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                {action.description}
                              </div>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Fixed Footer */}
          <div className="flex items-center justify-between p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-choma-black/30 flex-shrink-0">
            <div className="text-sm text-gray-600 dark:text-gray-400">
              {totalCount.enabled > 0 && (
                <span>{totalCount.enabled} permission{totalCount.enabled !== 1 ? 's' : ''} selected</span>
              )}
            </div>
            <div className="flex space-x-3">
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-white dark:bg-choma-black border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || totalCount.enabled === 0}
                className="px-4 py-2 bg-choma-orange text-white rounded-lg hover:bg-choma-orange/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                {loading && (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                )}
                <span>{loading ? 'Creating...' : 'Create Role'}</span>
              </button>
            </div>
          </div>

          {errors.submit && (
            <div className="px-6 pb-4">
              <p className="text-red-500 text-sm">{errors.submit}</p>
            </div>
          )}
        </form>
      </div>
    </div>
  );
};

export default CreateRoleModal;