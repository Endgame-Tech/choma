import React, { useState, useEffect } from 'react';
import { Admin } from '../types/admin';
import { TwoFactorStatus } from '../types/twoFactor';
import { twoFactorApi } from '../services/twoFactorApi';
import {
  FiEdit,
  FiTrash2,
  FiUser,
  FiShield,
  FiClock,
  FiMonitor,
  FiKey,
  FiLock
} from 'react-icons/fi';

interface AdminCardProps {
  admin: Admin;
  onEdit?: (admin: Admin) => void;
  onDelete?: (id: string) => void;
  onToggleStatus?: (id: string) => void;
  onViewSessions?: (adminId: string) => void;
  onSetup2FA?: (adminId: string) => void;
}

const AdminCard: React.FC<AdminCardProps> = ({ 
  admin, 
  onEdit, 
  onDelete, 
  onToggleStatus,
  onViewSessions,
  onSetup2FA
}) => {
  const [twoFactorStatus, setTwoFactorStatus] = useState<TwoFactorStatus | null>(null);
  const [loading2FA, setLoading2FA] = useState(false);

  useEffect(() => {
    loadTwoFactorStatus();
  }, [admin._id]);

  const loadTwoFactorStatus = async () => {
    try {
      setLoading2FA(true);
      const status = await twoFactorApi.getTwoFactorStatus();
      setTwoFactorStatus(status);
    } catch (error) {
      console.error('Error loading 2FA status:', error);
      setTwoFactorStatus(null);
    } finally {
      setLoading2FA(false);
    }
  };
  const formatLastLogin = (lastLogin?: string) => {
    if (!lastLogin) return 'Never';
    const date = new Date(lastLogin);
    const now = new Date();
    const diffInMs = now.getTime() - date.getTime();
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));
    
    if (diffInDays === 0) return 'Today';
    if (diffInDays === 1) return 'Yesterday';
    if (diffInDays < 7) return `${diffInDays} days ago`;
    if (diffInDays < 30) return `${Math.floor(diffInDays / 7)} weeks ago`;
    return date.toLocaleDateString();
  };

  const getPermissionCount = () => {
    let count = 0;
    Object.values(admin.role.permissions).forEach(section => {
      Object.values(section).forEach(permission => {
        if (permission === true) count++;
      });
    });
    return count;
  };

  return (
    <div className="group relative bg-white dark:bg-black/50 rounded-[20px] shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-100 dark:border-gray-700 w-full max-w-[320px] mx-auto overflow-hidden">
      
      {/* Alpha Admin Badge */}
      {admin.isAlphaAdmin && (
        <div className="absolute top-[16px] left-[16px] z-10">
          <span className="px-2 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300 text-xs font-semibold rounded-full border border-purple-200 dark:border-purple-700">
            Alpha Admin
          </span>
        </div>
      )}

      {/* Admin Actions - Show on hover */}
      <div className="absolute top-[16px] right-[16px] flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
        {onSetup2FA && (
          <button
            onClick={(e) => { e.stopPropagation(); onSetup2FA(admin._id); }}
            className={`p-1.5 bg-white/90 dark:bg-black/80 backdrop-blur-sm rounded-full shadow-md ${
              twoFactorStatus?.isEnabled 
                ? 'text-green-600 dark:text-green-400 hover:text-green-800 dark:hover:text-green-300 hover:bg-green-50 dark:hover:bg-green-900/30'
                : 'text-orange-600 dark:text-orange-400 hover:text-orange-800 dark:hover:text-orange-300 hover:bg-orange-50 dark:hover:bg-orange-900/30'
            }`}
            title={twoFactorStatus?.isEnabled ? 'Manage 2FA' : 'Setup 2FA'}
            disabled={loading2FA}
          >
            {loading2FA ? (
              <div className="w-4 h-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
            ) : twoFactorStatus?.isEnabled ? (
              <FiLock className="w-4 h-4" />
            ) : (
              <FiKey className="w-4 h-4" />
            )}
          </button>
        )}
        {onViewSessions && (
          <button
            onClick={(e) => { e.stopPropagation(); onViewSessions(admin._id); }}
            className="p-1.5 bg-white/90 dark:bg-black/80 backdrop-blur-sm rounded-full text-purple-600 dark:text-purple-400 hover:text-purple-800 dark:hover:text-purple-300 hover:bg-purple-50 dark:hover:bg-purple-900/30 shadow-md"
            title="View Sessions"
          >
            <FiMonitor className="w-4 h-4" />
          </button>
        )}
        {!admin.isAlphaAdmin && (
          <>
            {onEdit && (
              <button
                onClick={(e) => { e.stopPropagation(); onEdit(admin); }}
                className="p-1.5 bg-white/90 dark:bg-black/80 backdrop-blur-sm rounded-full text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/30 shadow-md"
                title="Edit Admin"
              >
                <FiEdit className="w-4 h-4" />
              </button>
            )}
            {onDelete && (
              <button
                onClick={(e) => { e.stopPropagation(); onDelete(admin._id); }}
                className="p-1.5 bg-white/90 dark:bg-black/80 backdrop-blur-sm rounded-full text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/30 shadow-md"
                title="Delete Admin"
              >
                <FiTrash2 className="w-4 h-4" />
              </button>
            )}
          </>
        )}
      </div>

      {/* Profile Section */}
      <div className="relative w-full h-[180px] p-[8px] bg-gradient-to-br from-blue-400 to-purple-500">
        {/* Profile Image */}
        <div className="flex items-center justify-center h-full">
          <div className="w-24 h-24 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm border-4 border-white/30">
            {admin.profileImage ? (
              <img 
                src={admin.profileImage} 
                alt={`${admin.firstName} ${admin.lastName}`} 
                className="w-full h-full rounded-full object-cover"
              />
            ) : (
              <FiUser className="w-10 h-10 text-white" />
            )}
          </div>
        </div>

        {/* Status Badge */}
        <div className="absolute bottom-[16px] left-[16px]">
          <button
            onClick={(e) => { 
              e.stopPropagation(); 
              if (!admin.isAlphaAdmin) onToggleStatus?.(admin._id); 
            }}
            disabled={admin.isAlphaAdmin}
            className={`px-2 py-1 rounded-full text-xs font-semibold ${
              admin.isActive
                ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
                : 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300'
            } ${admin.isAlphaAdmin ? 'cursor-not-allowed opacity-75' : 'cursor-pointer hover:opacity-80'}`}
            title={admin.isAlphaAdmin ? 'Cannot modify Alpha Admin status' : `Click to ${admin.isActive ? 'deactivate' : 'activate'}`}
          >
            {admin.isActive ? 'Active' : 'Inactive'}
          </button>
        </div>
      </div>

      {/* Content Section */}
      <div className="px-[16px] pb-[20px]">
        {/* Name and Email */}
        <div className="mb-4 -mt-2">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white leading-tight">
            {admin.firstName} {admin.lastName}
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 leading-tight">
            {admin.email}
          </p>
        </div>

        {/* Role */}
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-2">
            <FiShield className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span className="text-sm font-medium text-gray-900 dark:text-white">
              {admin.role.name}
            </span>
          </div>
          <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
            {admin.role.description}
          </p>
        </div>

        {/* Permission Stats */}
        <div className="flex items-center gap-2 mb-4 flex-wrap">
          <span className="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full">
            {getPermissionCount()} permissions
          </span>
          <span className="text-xs px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full">
            {Object.keys(admin.role.permissions).length} modules
          </span>
          {twoFactorStatus && (
            <span className={`text-xs px-2 py-1 rounded-full flex items-center gap-1 ${
              twoFactorStatus.isEnabled
                ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                : 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300'
            }`}>
              {twoFactorStatus.isEnabled ? (
                <>
                  <FiLock className="w-3 h-3" />
                  2FA
                </>
              ) : (
                <>
                  <FiKey className="w-3 h-3" />
                  No 2FA
                </>
              )}
            </span>
          )}
        </div>

        {/* Divider */}
        <div className="h-[1px] bg-gray-200 dark:bg-gray-600 mb-4"></div>

        {/* Bottom Info */}
        <div className="flex items-center justify-between text-xs">
          {/* Last Login */}
          <div className="flex items-center gap-1 text-gray-500 dark:text-gray-400">
            <FiClock className="w-3 h-3" />
            <span>Last: {formatLastLogin(admin.lastLogin)}</span>
          </div>

          {/* Created Date */}
          <div className="text-gray-500 dark:text-gray-400">
            Created: {new Date(admin.createdAt).toLocaleDateString()}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminCard;