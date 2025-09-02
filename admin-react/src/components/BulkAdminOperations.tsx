import React, { useState } from 'react';
import {
  UsersIcon,
  TrashIcon,
  CheckIcon,
  XMarkIcon,
  ExclamationTriangleIcon,
  ArrowDownTrayIcon,
  EnvelopeIcon,
  ShieldCheckIcon
} from '@heroicons/react/24/outline';
import { Admin, AdminRole, PREDEFINED_ROLES } from '../types/admin';
import { activityLogger } from '../services/activityLogger';
import { usePermissions } from '../contexts/PermissionContext';
import WithTwoFactorAuth from './WithTwoFactorAuth';
import { SensitiveOperation } from '../services/twoFactorEnforcement';

interface BulkAdminOperationsProps {
  selectedAdmins: Admin[];
  onClearSelection: () => void;
  onRefreshAdmins: () => void;
}

type BulkOperation =
  | 'activate'
  | 'deactivate'
  | 'delete'
  | 'changeRole'
  | 'export'
  | 'sendEmail';

const BulkAdminOperations: React.FC<BulkAdminOperationsProps> = ({
  selectedAdmins,
  onClearSelection,
  onRefreshAdmins
}) => {
  const { currentAdmin } = usePermissions();
  const [loading, setLoading] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    operation: BulkOperation;
    title: string;
    message: string;
    data?: Admin[];
  }>({ isOpen: false, operation: 'activate', title: '', message: '' });
  const [roleChangeModal, setRoleChangeModal] = useState(false);
  const [selectedRole, setSelectedRole] = useState<AdminRole | null>(null);
  const [emailModal, setEmailModal] = useState(false);
  const [emailData, setEmailData] = useState({ subject: '', message: '' });

  // Filter out Alpha Admins from bulk operations
  const validSelectedAdmins = selectedAdmins.filter(admin => !admin.isAlphaAdmin);
  const hasAlphaAdmins = selectedAdmins.length > validSelectedAdmins.length;

  if (selectedAdmins.length === 0) return null;

  const handleBulkActivate = () => {
    const inactiveAdmins = validSelectedAdmins.filter(admin => !admin.isActive);
    if (inactiveAdmins.length === 0) {
      alert('All selected admins are already active');
      return;
    }

    setConfirmDialog({
      isOpen: true,
      operation: 'activate',
      title: 'Activate Selected Admins',
      message: `Are you sure you want to activate ${inactiveAdmins.length} admin account${inactiveAdmins.length !== 1 ? 's' : ''}?\n\nActivated admins will be able to log in and access their assigned permissions.`,
      data: inactiveAdmins
    });
  };

  const handleBulkDeactivate = () => {
    const activeAdmins = validSelectedAdmins.filter(admin => admin.isActive);
    if (activeAdmins.length === 0) {
      alert('All selected admins are already inactive');
      return;
    }

    setConfirmDialog({
      isOpen: true,
      operation: 'deactivate',
      title: 'Deactivate Selected Admins',
      message: `Are you sure you want to deactivate ${activeAdmins.length} admin account${activeAdmins.length !== 1 ? 's' : ''}?\n\nDeactivated admins will be logged out immediately and cannot access the system until reactivated.`,
      data: activeAdmins
    });
  };

  const handleBulkDelete = () => {
    if (validSelectedAdmins.length === 0) {
      alert('No valid admins selected for deletion');
      return;
    }

    setConfirmDialog({
      isOpen: true,
      operation: 'delete',
      title: 'Delete Selected Admins',
      message: `⚠️ DANGER: Are you sure you want to permanently delete ${validSelectedAdmins.length} admin account${validSelectedAdmins.length !== 1 ? 's' : ''}?\n\nThis action cannot be undone and will:\n• Remove all admin data and access\n• Terminate active sessions\n• Clear activity history\n• Cannot be recovered\n\nDeleted accounts: ${validSelectedAdmins.map(a => a.email).join(', ')}`,
      data: validSelectedAdmins
    });
  };

  const handleRoleChange = () => {
    if (validSelectedAdmins.length === 0) {
      alert('No valid admins selected for role change');
      return;
    }
    setRoleChangeModal(true);
  };

  const handleExport = async () => {
    try {
      setLoading(true);

      // Create CSV content
      const headers = ['Name', 'Email', 'Role', 'Status', 'Last Login', 'Created Date'];
      const csvContent = [
        headers.join(','),
        ...selectedAdmins.map(admin => [
          `"${admin.firstName} ${admin.lastName}"`,
          admin.email,
          `"${admin.role.name}"`,
          admin.isActive ? 'Active' : 'Inactive',
          admin.lastLogin ? new Date(admin.lastLogin).toLocaleDateString() : 'Never',
          new Date(admin.createdAt).toLocaleDateString()
        ].join(','))
      ].join('\n');

      // Download CSV
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `admin-export-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      // Log activity
      if (currentAdmin) {
        await activityLogger.logAdminAction(
          currentAdmin._id,
          `${currentAdmin.firstName} ${currentAdmin.lastName}`,
          currentAdmin.email,
          'CREATE',
          undefined,
          {
            actionType: 'bulk_export_admins',
            exportCount: selectedAdmins.length,
            adminEmails: selectedAdmins.map(a => a.email)
          }
        );
      }

      alert(`Successfully exported ${selectedAdmins.length} admin records to CSV`);
    } catch (error) {
      console.error('Export error:', error);
      alert('Failed to export admin data');
    } finally {
      setLoading(false);
    }
  };

  const handleSendEmail = () => {
    setEmailModal(true);
  };

  const executeOperation = async () => {
    if (!confirmDialog.data) return;

    setLoading(true);
    try {
      const { operation, data } = confirmDialog;

      switch (operation) {
        case 'activate':

          if (currentAdmin) {
            await activityLogger.logAdminAction(
              currentAdmin._id,
              `${currentAdmin.firstName} ${currentAdmin.lastName}`,
              currentAdmin.email,
              'UPDATE',
              undefined,
              {
                actionType: 'bulk_activate_admins',
                count: data.length,
                adminEmails: data.map((a: Admin) => a.email)
              }
            );
          }

          alert(`Successfully activated ${data.length} admin account${data.length !== 1 ? 's' : ''}`);
          break;

        case 'deactivate':
          // TODO: Replace with actual API call
          console.log('Bulk deactivating admins:', data.map((a: Admin) => a.email));

          if (currentAdmin) {
            await activityLogger.logAdminAction(
              currentAdmin._id,
              `${currentAdmin.firstName} ${currentAdmin.lastName}`,
              currentAdmin.email,
              'UPDATE',
              undefined,
              {
                actionType: 'bulk_deactivate_admins',
                count: data.length,
                adminEmails: data.map((a: Admin) => a.email)
              }
            );
          }

          alert(`Successfully deactivated ${data.length} admin account${data.length !== 1 ? 's' : ''}`);
          break;

        case 'delete':
          // TODO: Replace with actual API call
          console.log('Bulk deleting admins:', data.map((a: Admin) => a.email));

          if (currentAdmin) {
            await activityLogger.logAdminAction(
              currentAdmin._id,
              `${currentAdmin.firstName} ${currentAdmin.lastName}`,
              currentAdmin.email,
              'DELETE',
              undefined,
              {
                actionType: 'bulk_delete_admins',
                count: data.length,
                adminEmails: data.map((a: Admin) => a.email)
              }
            );
          }

          alert(`Successfully deleted ${data.length} admin account${data.length !== 1 ? 's' : ''}`);
          break;
      }

      onRefreshAdmins();
      onClearSelection();
      setConfirmDialog(prev => ({ ...prev, isOpen: false }));
    } catch (error) {
      console.error(`Bulk ${confirmDialog.operation} error:`, error);
      alert(`Failed to ${confirmDialog.operation} selected admins`);
    } finally {
      setLoading(false);
    }
  };

  const executeRoleChange = async () => {
    if (!selectedRole) return;

    setLoading(true);
    try {
      // TODO: Replace with actual API call
      console.log('Bulk role change:', {
        admins: validSelectedAdmins.map(a => a.email),
        newRole: selectedRole.name
      });

      if (currentAdmin) {
        await activityLogger.logAdminAction(
          currentAdmin._id,
          `${currentAdmin.firstName} ${currentAdmin.lastName}`,
          currentAdmin.email,
          'ROLE_CHANGE',
          undefined,
          {
            actionType: 'bulk_role_change',
            count: validSelectedAdmins.length,
            newRole: selectedRole.name,
            adminEmails: validSelectedAdmins.map(a => a.email)
          }
        );
      }

      alert(`Successfully changed role to "${selectedRole.name}" for ${validSelectedAdmins.length} admin${validSelectedAdmins.length !== 1 ? 's' : ''}`);

      onRefreshAdmins();
      onClearSelection();
      setRoleChangeModal(false);
      setSelectedRole(null);
    } catch (error) {
      console.error('Bulk role change error:', error);
      alert('Failed to change admin roles');
    } finally {
      setLoading(false);
    }
  };

  const executeSendEmail = async () => {
    if (!emailData.subject.trim() || !emailData.message.trim()) {
      alert('Please fill in both subject and message');
      return;
    }

    setLoading(true);
    try {
      // TODO: Replace with actual API call
      console.log('Bulk email send:', {
        recipients: selectedAdmins.map(a => a.email),
        subject: emailData.subject,
        message: emailData.message
      });

      if (currentAdmin) {
        await activityLogger.logAdminAction(
          currentAdmin._id,
          `${currentAdmin.firstName} ${currentAdmin.lastName}`,
          currentAdmin.email,
          'CREATE',
          undefined,
          {
            actionType: 'bulk_email_admins',
            count: selectedAdmins.length,
            subject: emailData.subject,
            recipientEmails: selectedAdmins.map(a => a.email)
          }
        );
      }

      alert(`Successfully sent email to ${selectedAdmins.length} admin${selectedAdmins.length !== 1 ? 's' : ''}`);

      setEmailModal(false);
      setEmailData({ subject: '', message: '' });
      onClearSelection();
    } catch (error) {
      console.error('Bulk email error:', error);
      alert('Failed to send emails');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Bulk Operations Bar */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <UsersIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <span className="text-sm font-medium text-blue-900 dark:text-blue-300">
              {selectedAdmins.length} admin{selectedAdmins.length !== 1 ? 's' : ''} selected
              {hasAlphaAdmins && (
                <span className="ml-2 text-xs text-orange-600 dark:text-orange-400">
                  (Alpha Admins excluded from bulk operations)
                </span>
              )}
            </span>
          </div>

          <button
            onClick={onClearSelection}
            className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200"
            aria-label="Clear selection"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2 mt-3">
          {/* Activate Button */}
          <button
            onClick={handleBulkActivate}
            disabled={loading || validSelectedAdmins.filter(a => !a.isActive).length === 0}
            className="inline-flex items-center px-3 py-2 text-sm font-medium text-green-700 dark:text-green-300 bg-green-100 dark:bg-green-900/30 hover:bg-green-200 dark:hover:bg-green-900/50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <CheckIcon className="w-4 h-4 mr-1" />
            Activate ({validSelectedAdmins.filter(a => !a.isActive).length})
          </button>

          {/* Deactivate Button */}
          <WithTwoFactorAuth
            operation={SensitiveOperation.ADMIN_DEACTIVATE}
            onVerified={async () => {
              handleBulkDeactivate();
            }}
            customTitle="Confirm Bulk Admin Deactivation"
            customDescription="Deactivating multiple admin accounts will immediately revoke their access."
          >
            {({ executeWithVerification, isVerifying }) => (
              <button
                onClick={executeWithVerification}
                disabled={loading || isVerifying || validSelectedAdmins.filter(a => a.isActive).length === 0}
                className="inline-flex items-center px-3 py-2 text-sm font-medium text-orange-700 dark:text-orange-300 bg-orange-100 dark:bg-orange-900/30 hover:bg-orange-200 dark:hover:bg-orange-900/50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <XMarkIcon className={`w-4 h-4 mr-1 ${isVerifying ? 'animate-spin' : ''}`} />
                {isVerifying ? 'Verifying...' : `Deactivate (${validSelectedAdmins.filter(a => a.isActive).length})`}
              </button>
            )}
          </WithTwoFactorAuth>

          {/* Change Role Button */}
          <WithTwoFactorAuth
            operation={SensitiveOperation.BULK_ADMIN_ROLE_CHANGE}
            onVerified={async () => {
              handleRoleChange();
            }}
            customTitle="Confirm Bulk Role Change"
            customDescription="Changing admin roles will modify permissions for multiple accounts."
          >
            {({ executeWithVerification, isVerifying }) => (
              <button
                onClick={executeWithVerification}
                disabled={loading || isVerifying || validSelectedAdmins.length === 0}
                className="inline-flex items-center px-3 py-2 text-sm font-medium text-purple-700 dark:text-purple-300 bg-purple-100 dark:bg-purple-900/30 hover:bg-purple-200 dark:hover:bg-purple-900/50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ShieldCheckIcon className={`w-4 h-4 mr-1 ${isVerifying ? 'animate-spin' : ''}`} />
                {isVerifying ? 'Verifying...' : 'Change Role'}
              </button>
            )}
          </WithTwoFactorAuth>

          {/* Export Button */}
          <button
            onClick={handleExport}
            disabled={loading}
            className="inline-flex items-center px-3 py-2 text-sm font-medium text-blue-700 dark:text-blue-300 bg-blue-100 dark:bg-blue-900/30 hover:bg-blue-200 dark:hover:bg-blue-900/50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ArrowDownTrayIcon className="w-4 h-4 mr-1" />
            Export CSV
          </button>

          {/* Send Email Button */}
          <button
            onClick={handleSendEmail}
            disabled={loading}
            className="inline-flex items-center px-3 py-2 text-sm font-medium text-indigo-700 dark:text-indigo-300 bg-indigo-100 dark:bg-indigo-900/30 hover:bg-indigo-200 dark:hover:bg-indigo-900/50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <EnvelopeIcon className="w-4 h-4 mr-1" />
            Send Email
          </button>

          {/* Delete Button */}
          {currentAdmin?.isAlphaAdmin && (
            <WithTwoFactorAuth
              operation={SensitiveOperation.BULK_ADMIN_DELETE}
              onVerified={async () => {
                handleBulkDelete();
              }}
              customTitle="Confirm Bulk Admin Deletion"
              customDescription="Permanently deleting multiple admin accounts is irreversible and highly dangerous."
            >
              {({ executeWithVerification, isVerifying }) => (
                <button
                  onClick={executeWithVerification}
                  disabled={loading || isVerifying || validSelectedAdmins.length === 0}
                  className="inline-flex items-center px-3 py-2 text-sm font-medium text-red-700 dark:text-red-300 bg-red-100 dark:bg-red-900/30 hover:bg-red-200 dark:hover:bg-red-900/50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <TrashIcon className={`w-4 h-4 mr-1 ${isVerifying ? 'animate-spin' : ''}`} />
                  {isVerifying ? 'Verifying...' : `Delete (${validSelectedAdmins.length})`}
                </button>
              )}
            </WithTwoFactorAuth>
          )}
        </div>
      </div>

      {/* Confirmation Dialog */}
      {confirmDialog.isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-choma-dark rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center space-x-3 mb-4">
              <ExclamationTriangleIcon className="w-6 h-6 text-orange-500" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {confirmDialog.title}
              </h3>
            </div>
            <p className="text-gray-600 dark:text-gray-300 mb-6 whitespace-pre-line">
              {confirmDialog.message}
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))}
                disabled={loading}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600"
              >
                Cancel
              </button>
              <button
                onClick={executeOperation}
                disabled={loading}
                className={`px-4 py-2 text-white rounded-lg flex items-center space-x-2 ${confirmDialog.operation === 'delete'
                  ? 'bg-red-600 hover:bg-red-700'
                  : 'bg-choma-orange hover:bg-choma-orange/90'
                  }`}
              >
                {loading && (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                )}
                <span>Confirm</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Role Change Modal */}
      {roleChangeModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-choma-dark rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Change Role for Selected Admins
            </h3>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              Select a new role to assign to {validSelectedAdmins.length} admin{validSelectedAdmins.length !== 1 ? 's' : ''}:
            </p>
            <div className="space-y-2 mb-6">
              {PREDEFINED_ROLES.map(role => (
                <label key={role.id} className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="radio"
                    name="role"
                    value={role.id}
                    checked={selectedRole?.id === role.id}
                    onChange={() => setSelectedRole(role)}
                    className="w-4 h-4 text-choma-orange border-gray-300 focus:ring-choma-orange"
                  />
                  <div>
                    <div className="font-medium text-gray-900 dark:text-white">{role.name}</div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">{role.description}</div>
                  </div>
                </label>
              ))}
            </div>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setRoleChangeModal(false);
                  setSelectedRole(null);
                }}
                disabled={loading}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600"
              >
                Cancel
              </button>
              <button
                onClick={executeRoleChange}
                disabled={loading || !selectedRole}
                className="px-4 py-2 bg-choma-orange text-white rounded-lg hover:bg-choma-orange/90 disabled:opacity-50 flex items-center space-x-2"
              >
                {loading && (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                )}
                <span>Change Role</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Email Modal */}
      {emailModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-choma-dark rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Send Email to Selected Admins
            </h3>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              Send a message to {selectedAdmins.length} admin{selectedAdmins.length !== 1 ? 's' : ''}
            </p>
            <div className="mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Subject
                </label>
                <input
                  type="text"
                  value={emailData.subject}
                  onChange={(e) => setEmailData(prev => ({ ...prev, subject: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-choma-black text-gray-900 dark:text-white focus:ring-2 focus:ring-choma-orange focus:border-transparent"
                  placeholder="Email subject..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Message
                </label>
                <textarea
                  value={emailData.message}
                  onChange={(e) => setEmailData(prev => ({ ...prev, message: e.target.value }))}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-choma-black text-gray-900 dark:text-white focus:ring-2 focus:ring-choma-orange focus:border-transparent resize-none"
                  placeholder="Email message..."
                />
              </div>
            </div>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setEmailModal(false);
                  setEmailData({ subject: '', message: '' });
                }}
                disabled={loading}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600"
              >
                Cancel
              </button>
              <button
                onClick={executeSendEmail}
                disabled={loading || !emailData.subject.trim() || !emailData.message.trim()}
                className="px-4 py-2 bg-choma-orange text-white rounded-lg hover:bg-choma-orange/90 disabled:opacity-50 flex items-center space-x-2"
              >
                {loading && (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                )}
                <span>Send Email</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default BulkAdminOperations;