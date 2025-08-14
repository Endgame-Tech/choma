import React, { useState, useEffect } from 'react';
import {
  ComputerDesktopIcon,
  DevicePhoneMobileIcon,
  ClockIcon,
  MapPinIcon,
  ExclamationTriangleIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';
import { AdminSession } from '../types/activity';
import { sessionManager } from '../services/sessionManager';
import { usePermissions } from '../contexts/PermissionContext';

interface SessionManagementProps {
  isOpen: boolean;
  onClose: () => void;
  targetAdminId?: string; // If provided, show sessions for specific admin
}

const SessionManagement: React.FC<SessionManagementProps> = ({
  isOpen,
  onClose,
  targetAdminId
}) => {
  const { hasPermission, currentAdmin } = usePermissions();
  const [sessions, setSessions] = useState<AdminSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [terminatingSession, setTerminatingSession] = useState<string | null>(null);

  // Check if user can manage sessions
  const canManageSessions = hasPermission('adminManagement', 'manage_sessions') || currentAdmin?.isAlphaAdmin;

  useEffect(() => {
    if (isOpen && canManageSessions) {
      loadSessions();
    }
  }, [isOpen, targetAdminId, canManageSessions]);

  const loadSessions = async () => {
    setLoading(true);
    try {
      const sessionData = await sessionManager.getAdminSessions(targetAdminId);
      setSessions(sessionData);
    } catch (error) {
      console.error('Error loading sessions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTerminateSession = async (sessionId: string) => {
    if (!currentAdmin) return;

    const confirmTerminate = window.confirm(
      'Are you sure you want to terminate this session? The user will be logged out immediately.'
    );

    if (!confirmTerminate) return;

    setTerminatingSession(sessionId);
    try {
      await sessionManager.terminateSession(sessionId, `Terminated by ${currentAdmin.firstName} ${currentAdmin.lastName}`);

      // Remove session from list
      setSessions(prev => prev.filter(session => session._id !== sessionId));

      // Show success message
      alert('Session terminated successfully');
    } catch (error) {
      console.error('Error terminating session:', error);
      alert('Failed to terminate session');
    } finally {
      setTerminatingSession(null);
    }
  };

  const getDeviceIcon = (userAgent: string) => {
    if (userAgent.toLowerCase().includes('mobile') || userAgent.toLowerCase().includes('iphone') || userAgent.toLowerCase().includes('android')) {
      return DevicePhoneMobileIcon;
    }
    return ComputerDesktopIcon;
  };

  const getDeviceInfo = (userAgent: string) => {
    const ua = userAgent.toLowerCase();

    if (ua.includes('chrome')) return 'Chrome Browser';
    if (ua.includes('firefox')) return 'Firefox Browser';
    if (ua.includes('safari')) return 'Safari Browser';
    if (ua.includes('edge')) return 'Edge Browser';
    if (ua.includes('mobile')) return 'Mobile Device';
    if (ua.includes('iphone')) return 'iPhone';
    if (ua.includes('android')) return 'Android Device';

    return 'Unknown Device';
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  const getSessionStatus = (session: AdminSession) => {
    const lastActivity = new Date(session.lastActivity);
    const now = new Date();
    const diffMinutes = (now.getTime() - lastActivity.getTime()) / (1000 * 60);

    if (!session.isActive) return { status: 'Inactive', color: 'text-gray-500' };
    if (diffMinutes < 5) return { status: 'Active', color: 'text-green-600' };
    if (diffMinutes < 30) return { status: 'Idle', color: 'text-yellow-600' };
    return { status: 'Stale', color: 'text-red-600' };
  };

  if (!isOpen) return null;

  if (!canManageSessions) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white dark:bg-choma-dark rounded-lg p-6 max-w-md w-full mx-4">
          <div className="text-center">
            <ExclamationTriangleIcon className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Access Denied
            </h3>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              You don&apos;t have permission to manage admin sessions.
            </p>
            <button
              onClick={onClose}
              className="bg-choma-orange text-white px-4 py-2 rounded-lg hover:bg-choma-orange/90"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-choma-dark rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-3">
            <ComputerDesktopIcon className="w-6 h-6 text-choma-orange" />
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Session Management
            </h2>
            {targetAdminId && (
              <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 text-sm rounded-full">
                Specific Admin
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            aria-label="Close session management"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[70vh]">
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-choma-orange mx-auto"></div>
              <p className="text-gray-600 dark:text-gray-300 mt-2">Loading sessions...</p>
            </div>
          ) : sessions.length === 0 ? (
            <div className="text-center py-8">
              <ComputerDesktopIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 dark:text-gray-300">No active sessions found</p>
            </div>
          ) : (
            <div className="space-y-4">
              {sessions.map((session) => {
                const DeviceIcon = getDeviceIcon(session.userAgent);
                const deviceInfo = getDeviceInfo(session.userAgent);
                const sessionStatus = getSessionStatus(session);

                return (
                  <div
                    key={session._id}
                    className="bg-gray-50 dark:bg-choma-black/50 rounded-lg p-4 border border-gray-200 dark:border-gray-700"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-4 flex-1">
                        {/* Device Icon */}
                        <div className="bg-white dark:bg-choma-dark p-2 rounded-lg shadow-sm">
                          <DeviceIcon className="w-6 h-6 text-gray-600 dark:text-gray-400" />
                        </div>

                        {/* Session Details */}
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-2">
                            <h3 className="font-medium text-gray-900 dark:text-white">
                              {deviceInfo}
                            </h3>
                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${session.isActive
                                ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
                                : 'bg-gray-100 dark:bg-gray-900/30 text-gray-800 dark:text-gray-300'
                              }`}>
                              {sessionStatus.status}
                            </span>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-gray-600 dark:text-gray-400">
                            <div className="flex items-center space-x-2">
                              <MapPinIcon className="w-4 h-4" />
                              <span>IP: {session.ipAddress}</span>
                            </div>

                            <div className="flex items-center space-x-2">
                              <ClockIcon className="w-4 h-4" />
                              <span>Login: {formatTimestamp(session.loginTime)}</span>
                            </div>

                            <div className="flex items-center space-x-2">
                              <ClockIcon className="w-4 h-4" />
                              <span>Last Activity: {formatTimestamp(session.lastActivity)}</span>
                            </div>

                            {session.logoutTime && (
                              <div className="flex items-center space-x-2">
                                <ClockIcon className="w-4 h-4" />
                                <span>Logout: {formatTimestamp(session.logoutTime)}</span>
                              </div>
                            )}
                          </div>

                          {session.logoutReason && (
                            <div className="mt-2">
                              <span className="text-xs text-gray-500 dark:text-gray-400">
                                Logout Reason: {session.logoutReason}
                              </span>
                            </div>
                          )}

                          {/* User Agent Details */}
                          <details className="mt-3">
                            <summary className="cursor-pointer text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200">
                              View User Agent
                            </summary>
                            <div className="mt-1 p-2 bg-gray-100 dark:bg-gray-800 rounded text-xs font-mono overflow-x-auto">
                              {session.userAgent}
                            </div>
                          </details>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="ml-4">
                        {session.isActive && (
                          <button
                            onClick={() => handleTerminateSession(session._id)}
                            disabled={terminatingSession === session._id}
                            className="flex items-center px-3 py-2 text-sm font-medium text-red-700 dark:text-red-300 bg-red-100 dark:bg-red-900/30 hover:bg-red-200 dark:hover:bg-red-900/50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {terminatingSession === session._id ? (
                              <>
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600 mr-2"></div>
                                Terminating...
                              </>
                            ) : (
                              <>
                                <XMarkIcon className="w-4 h-4 mr-1" />
                                Terminate
                              </>
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 dark:bg-choma-black/30 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600 dark:text-gray-400">
              {sessions.length} session{sessions.length !== 1 ? 's' : ''} found
            </div>
            <button
              onClick={loadSessions}
              className="flex items-center px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-choma-black border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              <ClockIcon className="w-4 h-4 mr-1" />
              Refresh
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SessionManagement;