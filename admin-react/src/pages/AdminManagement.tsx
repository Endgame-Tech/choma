import React, { useState, useEffect } from 'react';
import { Admin, PREDEFINED_ROLES, CreateAdminRequest, UpdateAdminRequest, AdminRole } from '../types/admin';
import CreateAdminModal from '../components/CreateAdminModal';
import EditAdminModal from '../components/EditAdminModal';
import AdminCard from '../components/AdminCard';
import ActivityDashboard from '../components/ActivityDashboard';
import SessionManagement from '../components/SessionManagement';
import CreateRoleModal from '../components/CreateRoleModal';
import BulkAdminOperations from '../components/BulkAdminOperations';
import { usePermissions } from '../contexts/PermissionContext';
import { adminManagementApi } from '../services/api';

const AdminManagement: React.FC = () => {
  const { hasPermission, currentAdmin } = usePermissions();
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');

  // Modals
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedAdmin, setSelectedAdmin] = useState<Admin | null>(null);
  const [activityDashboardOpen, setActivityDashboardOpen] = useState(false);
  const [sessionManagementOpen, setSessionManagementOpen] = useState(false);
  const [selectedAdminForSessions, setSelectedAdminForSessions] = useState<string | undefined>(undefined);
  const [createRoleModalOpen, setCreateRoleModalOpen] = useState(false);

  // Bulk operations
  const [selectedAdminIds, setSelectedAdminIds] = useState<string[]>([]);
  const selectedAdmins = admins.filter(admin => selectedAdminIds.includes(admin._id));

  // Filters
  const [filters, setFilters] = useState({
    search: '',
    role: '',
    status: ''
  });

  const fetchAdmins = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await adminManagementApi.getAllAdmins();
      setAdmins(response.admins as Admin[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch admins');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAdmin = async (adminData: CreateAdminRequest) => {
    try {
      setLoading(true);
      const result = await adminManagementApi.createAdmin(adminData as unknown as Record<string, unknown>);
      if (result.success) {
        await fetchAdmins(); // Refresh the list
        setCreateModalOpen(false);
      } else {
        alert(`Failed to create admin: ${result.message}`);
      }
    } catch (err) {
      alert(`Failed to create admin: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateRole = async (roleData: Omit<AdminRole, 'id'>) => {
    try {
      const result = await adminManagementApi.createRole(roleData);
      if (result.success) {
        alert(result.message);
        setCreateRoleModalOpen(false);
      } else {
        alert(`Failed to create role: ${result.message}`);
      }
    } catch (err) {
      alert(`Failed to create role: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  const handleEditAdmin = async (adminData: UpdateAdminRequest) => {
    if (!selectedAdmin) return;

    try {
      const result = await adminManagementApi.updateAdmin(selectedAdmin._id, adminData as unknown as Record<string, unknown>);
      if (result.success) {
        await fetchAdmins();
        setEditModalOpen(false);
        setSelectedAdmin(null);
        alert(result.message);
      } else {
        alert(`Failed to update admin: ${result.message}`);
      }
    } catch (err) {
      alert(`Failed to update admin: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  const handleDeleteAdmin = async (id: string) => {
    const admin = admins.find(a => a._id === id);
    if (admin?.isAlphaAdmin) {
      alert('Cannot delete the Alpha Admin account');
      return;
    }

    if (!confirm(`Are you sure you want to delete admin "${admin?.firstName} ${admin?.lastName}"? This action cannot be undone.`)) {
      return;
    }

    try {
      const result = await adminManagementApi.deleteAdmin(id);
      if (result.success) {
        await fetchAdmins();
        alert(result.message);
      } else {
        alert(`Failed to delete admin: ${result.message}`);
      }
    } catch (err) {
      alert(`Failed to delete admin: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  const handleToggleStatus = async (id: string) => {
    const admin = admins.find(a => a._id === id);
    if (admin?.isAlphaAdmin) {
      alert('Cannot modify the Alpha Admin status');
      return;
    }

    try {
      const result = await adminManagementApi.toggleAdminStatus(id);
      if (result.success) {
        await fetchAdmins();
        alert(result.message);
      } else {
        alert(`Failed to update admin status: ${result.message}`);
      }
    } catch (err) {
      alert(`Failed to update admin status: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  // Fetch admins on component mount
  useEffect(() => {
    fetchAdmins();
  }, []);

  const filteredAdmins = admins.filter(admin => {
    const matchesSearch = !filters.search ||
      admin.firstName.toLowerCase().includes(filters.search.toLowerCase()) ||
      admin.lastName.toLowerCase().includes(filters.search.toLowerCase()) ||
      admin.email.toLowerCase().includes(filters.search.toLowerCase());

    const matchesRole = !filters.role || admin.role.id === filters.role;
    const matchesStatus = !filters.status ||
      (filters.status === 'active' && admin.isActive) ||
      (filters.status === 'inactive' && !admin.isActive);

    return matchesSearch && matchesRole && matchesStatus;
  });

  // Bulk selection helpers
  const handleSelectAdmin = (adminId: string) => {
    setSelectedAdminIds(prev =>
      prev.includes(adminId)
        ? prev.filter(id => id !== adminId)
        : [...prev, adminId]
    );
  };

  const handleSelectAll = () => {
    const allIds = filteredAdmins.map(admin => admin._id);
    const allSelected = allIds.every(id => selectedAdminIds.includes(id));

    if (allSelected) {
      setSelectedAdminIds(prev => prev.filter(id => !allIds.includes(id)));
    } else {
      setSelectedAdminIds(prev => [...new Set([...prev, ...allIds])]);
    }
  };

  const handleClearSelection = () => {
    setSelectedAdminIds([]);
  };

  const refreshAdmins = async () => {
    await fetchAdmins();
  };

  useEffect(() => {
    fetchAdmins();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-neutral-200">Loading admins...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 rounded-lg p-4">
        <div className="flex items-center">
          <div className="text-red-400 dark:text-red-300 mr-3"><i className="fi fi-sr-warning"></i></div>
          <div>
            <h3 className="text-red-800 dark:text-red-300 font-medium">Error loading admins</h3>
            <p className="text-red-600 dark:text-red-300">{error}</p>
            <button
              onClick={fetchAdmins}
              className="mt-2 text-sm text-red-600 dark:text-red-300 hover:text-red-800 dark:hover:text-red-400 underline"
            >
              Try again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-semibold text-gray-900 dark:text-neutral-100">Admin Management</h1>
          <p className="text-gray-600 dark:text-neutral-200">Manage admin users and their permissions ({admins.length} admins)</p>
        </div>
        <div className="flex items-center space-x-3">
          {/* Activity Dashboard Button */}
          {(hasPermission('adminManagement', 'view_activity_logs') || currentAdmin?.isAlphaAdmin) && (
            <button
              onClick={() => setActivityDashboardOpen(true)}
              className="inline-flex items-center px-4 py-2 bg-gray-600 dark:bg-gray-700 text-white text-sm font-medium rounded-lg hover:bg-gray-700 dark:hover:bg-gray-800 transition-colors"
            >
              <i className="fi fi-sr-time-past mr-2"></i>
              Activity Logs
            </button>
          )}

          {/* Session Management Button */}
          {(hasPermission('adminManagement', 'manage_sessions') || currentAdmin?.isAlphaAdmin) && (
            <button
              onClick={() => {
                setSelectedAdminForSessions(undefined);
                setSessionManagementOpen(true);
              }}
              className="inline-flex items-center px-4 py-2 bg-purple-600 dark:bg-purple-700 text-white text-sm font-medium rounded-lg hover:bg-purple-700 dark:hover:bg-purple-800 transition-colors"
            >
              <i className="fi fi-sr-computer mr-2"></i>
              Sessions
            </button>
          )}

          {/* View Toggle */}
          <div className="flex items-center bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
            <button
              onClick={() => setViewMode('cards')}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${viewMode === 'cards'
                ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                }`}
            >
              <i className="fi fi-sr-apps mr-1.5"></i>
              Cards
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${viewMode === 'table'
                ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                }`}
            >
              <i className="fi fi-sr-list mr-1.5"></i>
              Table
            </button>
          </div>

          {/* Create Role Button - Only Alpha Admin */}
          {currentAdmin?.isAlphaAdmin && (
            <button
              onClick={() => setCreateRoleModalOpen(true)}
              className="inline-flex items-center px-4 py-2 bg-green-600 dark:bg-green-700 text-white text-sm font-medium rounded-lg hover:bg-green-700 dark:hover:bg-green-800 transition-colors"
            >
              <i className="fi fi-sr-shield mr-2"></i>
              Create Role
            </button>
          )}

          {/* Create Button */}
          {(hasPermission('adminManagement', 'create') || currentAdmin?.isAlphaAdmin) && (
            <button
              onClick={() => setCreateModalOpen(true)}
              className="inline-flex items-center px-4 py-2 bg-blue-600 dark:bg-blue-700 text-white text-sm font-medium rounded-lg hover:bg-blue-700 dark:hover:bg-blue-800 transition-colors"
            >
              <i className="fi fi-sr-plus mr-2"></i>
              Create Admin
            </button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white/90 dark:bg-neutral-800/90 rounded-lg shadow-sm border border-gray-200 dark:border-neutral-700 p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Search */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-neutral-200 mb-2">Search</label>
            <div className="relative">
              <i className="fi fi-sr-search text-base absolute left-3 top-3 text-gray-400 dark:text-neutral-400"></i>
              <input
                type="text"
                placeholder="Search admins..."
                value={filters.search}
                onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                className="pl-10 w-full px-3 py-2 border border-gray-300 dark:border-neutral-600 bg-white/90 dark:bg-neutral-800/90 text-gray-900 dark:text-neutral-100 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Role Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-neutral-200 mb-2">Role</label>
            <select
              value={filters.role}
              onChange={(e) => setFilters(prev => ({ ...prev, role: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-neutral-600 bg-white/90 dark:bg-neutral-800/90 text-gray-900 dark:text-neutral-100 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              aria-label="Filter by role"
            >
              <option value="">All Roles</option>
              {PREDEFINED_ROLES.map(role => (
                <option key={role.id} value={role.id}>{role.name}</option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-neutral-200 mb-2">Status</label>
            <select
              value={filters.status}
              onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-neutral-600 bg-white/90 dark:bg-neutral-800/90 text-gray-900 dark:text-neutral-100 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              aria-label="Filter by status"
            >
              <option value="">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>
      </div>

      {/* Bulk Operations */}
      {selectedAdmins.length > 0 && (
        <BulkAdminOperations
          selectedAdmins={selectedAdmins}
          onClearSelection={handleClearSelection}
          onRefreshAdmins={refreshAdmins}
        />
      )}

      {/* Admin List */}
      {filteredAdmins.length === 0 ? (
        <div className="text-center py-12 bg-white/90 dark:bg-neutral-800/90 rounded-lg shadow-sm border border-gray-200 dark:border-neutral-700">
          <div className="text-4xl mb-2"><i className="fi fi-sr-users"></i></div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-neutral-100 mb-2">No admins found</h3>
          <p className="text-gray-500 dark:text-neutral-200 mb-4">
            {filters.search || filters.role || filters.status
              ? "No admins match your current filters."
              : "Get started by creating your first admin user."}
          </p>
          <button
            onClick={() => setCreateModalOpen(true)}
            className="inline-flex items-center px-4 py-2 bg-blue-600 dark:bg-blue-700 text-white text-sm font-medium rounded-lg hover:bg-blue-700 dark:hover:bg-blue-800"
          >
            <i className="fi fi-sr-plus mr-2"></i>
            Create Admin
          </button>
        </div>
      ) : viewMode === 'cards' ? (
        /* Card View */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredAdmins.map((admin) => (
            <div key={admin._id} className="relative">
              {/* Selection Checkbox */}
              <div className="absolute top-3 left-3 z-10">
                <input
                  type="checkbox"
                  checked={selectedAdminIds.includes(admin._id)}
                  onChange={() => handleSelectAdmin(admin._id)}
                  className="w-4 h-4 text-choma-orange border-gray-300 rounded focus:ring-choma-orange bg-white"
                  aria-label={`Select admin ${admin.firstName} ${admin.lastName}`}
                />
              </div>
              <AdminCard
                admin={admin}
                onEdit={(admin) => {
                  setSelectedAdmin(admin);
                  setEditModalOpen(true);
                }}
                onDelete={handleDeleteAdmin}
                onToggleStatus={handleToggleStatus}
                onViewSessions={(hasPermission('adminManagement', 'manage_sessions') || currentAdmin?.isAlphaAdmin)
                  ? (adminId) => {
                    setSelectedAdminForSessions(adminId);
                    setSessionManagementOpen(true);
                  }
                  : undefined
                }
              />
            </div>
          ))}
        </div>
      ) : (
        /* Table View */
        <div className="bg-white/90 dark:bg-neutral-800/90 shadow-sm rounded-lg border border-gray-200 dark:border-neutral-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-neutral-700">
              <thead className="bg-gray-50 dark:bg-neutral-700/30">
                <tr>
                  <th className="px-6 py-3 text-left">
                    <input
                      type="checkbox"
                      checked={filteredAdmins.length > 0 && filteredAdmins.every(admin => selectedAdminIds.includes(admin._id))}
                      onChange={handleSelectAll}
                      className="w-4 h-4 text-choma-orange border-gray-300 rounded focus:ring-choma-orange"
                      aria-label="Select all admins"
                    />
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-neutral-300 uppercase tracking-wider">
                    Admin
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-neutral-300 uppercase tracking-wider">
                    Role & Permissions
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-neutral-300 uppercase tracking-wider">
                    Status & Activity
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-neutral-300 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white/90 dark:bg-neutral-800/90 divide-y divide-gray-200 dark:divide-neutral-700">
                {filteredAdmins.map((admin) => (
                  <tr key={admin._id} className="hover:bg-gray-100 dark:hover:bg-neutral-700">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={selectedAdminIds.includes(admin._id)}
                        onChange={() => handleSelectAdmin(admin._id)}
                        className="w-4 h-4 text-choma-orange border-gray-300 rounded focus:ring-choma-orange"
                        aria-label={`Select admin ${admin.firstName} ${admin.lastName}`}
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="h-12 w-12 bg-gray-200 dark:bg-neutral-700 rounded-full mr-4 flex items-center justify-center">
                          {admin.profileImage ? (
                            <img src={admin.profileImage} alt={`${admin.firstName} ${admin.lastName}`} className="h-12 w-12 rounded-full object-cover" />
                          ) : (
                            <span className="text-gray-400 dark:text-neutral-400 text-xl">
                              <i className="fi fi-sr-user"></i>
                            </span>
                          )}
                        </div>
                        <div>
                          <div className="text-sm font-medium text-gray-900 dark:text-neutral-100">
                            {admin.firstName} {admin.lastName}
                            {admin.isAlphaAdmin && (
                              <span className="ml-2 px-2 py-1 text-xs font-medium bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300 rounded-full">
                                Alpha Admin
                              </span>
                            )}
                          </div>
                          <div className="text-sm text-gray-500 dark:text-neutral-300">{admin.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 dark:text-neutral-100">
                        <div className="font-medium">{admin.role.name}</div>
                        <div className="text-xs text-gray-500 dark:text-neutral-300 mt-1">
                          {admin.role.description}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="space-y-2">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${admin.isActive
                          ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
                          : 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300'
                          }`}>
                          {admin.isActive ? 'Active' : 'Inactive'}
                        </span>
                        {admin.lastLogin && (
                          <div className="text-xs text-gray-500 dark:text-neutral-400">
                            Last login: {new Date(admin.lastLogin).toLocaleDateString()}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center space-x-3">
                        {/* Session Management Button - Available for all admins */}
                        {(hasPermission('adminManagement', 'manage_sessions') || currentAdmin?.isAlphaAdmin) && (
                          <button
                            onClick={() => {
                              setSelectedAdminForSessions(admin._id);
                              setSessionManagementOpen(true);
                            }}
                            className="inline-flex items-center px-3 py-2 text-xs font-medium rounded-lg text-purple-700 dark:text-purple-300 bg-purple-100 dark:bg-purple-900/30 hover:bg-purple-200 dark:hover:bg-purple-900/50 transition-colors"
                          >
                            <i className="fi fi-sr-computer mr-1"></i>
                            Sessions
                          </button>
                        )}

                        {!admin.isAlphaAdmin && (
                          <>
                            <button
                              onClick={() => handleToggleStatus(admin._id)}
                              className={`inline-flex items-center px-3 py-2 text-xs font-medium rounded-lg transition-colors ${admin.isActive
                                ? 'text-orange-700 dark:text-orange-300 bg-orange-100 dark:bg-orange-900/30 hover:bg-orange-200 dark:hover:bg-orange-900/50'
                                : 'text-green-700 dark:text-green-300 bg-green-100 dark:bg-green-900/30 hover:bg-green-200 dark:hover:bg-green-900/50'
                                }`}
                            >
                              <i className={`fi ${admin.isActive ? 'fi-sr-ban' : 'fi-sr-check'} mr-1`}></i>
                              {admin.isActive ? 'Deactivate' : 'Activate'}
                            </button>

                            <button
                              onClick={() => {
                                setSelectedAdmin(admin);
                                setEditModalOpen(true);
                              }}
                              className="inline-flex items-center px-3 py-2 text-xs font-medium rounded-lg text-blue-700 dark:text-blue-300 bg-blue-100 dark:bg-blue-900/30 hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors"
                            >
                              <i className="fi fi-sr-pencil mr-1"></i>
                              Edit
                            </button>

                            <button
                              onClick={() => handleDeleteAdmin(admin._id)}
                              className="inline-flex items-center px-3 py-2 text-xs font-medium rounded-lg text-red-700 dark:text-red-300 bg-red-100 dark:bg-red-900/30 hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors"
                            >
                              <i className="fi fi-sr-trash mr-1"></i>
                              Delete
                            </button>
                          </>
                        )}
                        {admin.isAlphaAdmin && (
                          <span className="text-xs text-gray-500 dark:text-neutral-400 italic">
                            Protected Account
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modals */}
      <CreateAdminModal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onSubmit={handleCreateAdmin}
      />

      {selectedAdmin && (
        <EditAdminModal
          isOpen={editModalOpen}
          onClose={() => {
            setEditModalOpen(false);
            setSelectedAdmin(null);
          }}
          onSubmit={handleEditAdmin}
          admin={selectedAdmin}
        />
      )}

      {/* Activity Dashboard */}
      <ActivityDashboard
        isOpen={activityDashboardOpen}
        onClose={() => setActivityDashboardOpen(false)}
      />

      {/* Session Management */}
      <SessionManagement
        isOpen={sessionManagementOpen}
        onClose={() => {
          setSessionManagementOpen(false);
          setSelectedAdminForSessions(undefined);
        }}
        targetAdminId={selectedAdminForSessions}
      />

      {/* Create Role Modal */}
      <CreateRoleModal
        isOpen={createRoleModalOpen}
        onClose={() => setCreateRoleModalOpen(false)}
        onSubmit={handleCreateRole}
      />
    </div>
  );
};

export default AdminManagement;