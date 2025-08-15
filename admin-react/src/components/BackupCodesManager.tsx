import React, { useState, useEffect } from 'react';
import { 
  KeyIcon, 
  DocumentDuplicateIcon, 
  ArrowDownTrayIcon,
  ExclamationTriangleIcon,
  CheckIcon,
  EyeIcon,
  EyeSlashIcon
} from '@heroicons/react/24/outline';
import { TwoFactorBackupCodes } from '../types/twoFactor';
import { twoFactorApi } from '../services/twoFactorApi';
import TwoFactorModal from './TwoFactorModal';

interface BackupCodesManagerProps {
  isOpen: boolean;
  onClose: () => void;
  onBackupCodesChanged?: () => void;
}

const BackupCodesManager: React.FC<BackupCodesManagerProps> = ({
  isOpen,
  onClose,
  onBackupCodesChanged
}) => {
  const [backupCodes, setBackupCodes] = useState<TwoFactorBackupCodes | null>(null);
  const [newBackupCodes, setNewBackupCodes] = useState<string[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCodes, setShowCodes] = useState(false);
  const [show2FAModal, setShow2FAModal] = useState(false);
  const [copiedCodes, setCopiedCodes] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (isOpen) {
      loadBackupCodes();
    }
  }, [isOpen]);

  const loadBackupCodes = async () => {
    try {
      setLoading(true);
      setError(null);
      const codes = await twoFactorApi.getBackupCodesInfo();
      setBackupCodes(codes);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load backup codes');
    } finally {
      setLoading(false);
    }
  };

  const executeRegenerateBackupCodes = async (verificationToken: string) => {
    try {
      setLoading(true);
      setError(null);

      const result = await twoFactorApi.regenerateBackupCodes(verificationToken);
      
      if (result.success && result.data) {
        setNewBackupCodes(result.data.backupCodes);
        setBackupCodes({
          total: result.data.total,
          used: 0,
          remaining: result.data.total,
          lastGenerated: new Date().toISOString()
        });
        
        if (onBackupCodesChanged) {
          onBackupCodesChanged();
        }
      } else {
        setError(result.message || 'Failed to regenerate backup codes');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to regenerate backup codes');
    } finally {
      setLoading(false);
    }
  };

  const handleRegenerateBackupCodes = () => {
    setShow2FAModal(true);
  };

  const handleTwoFactorVerified = async (verified: boolean, data?: any) => {
    if (verified) {
      try {
        const verificationToken = data?.verificationToken;
        if (verificationToken) {
          await executeRegenerateBackupCodes(verificationToken);
        } else {
          throw new Error('Verification token is required');
        }
      } catch (error) {
        console.error('Error executing operation after 2FA verification:', error);
        setError(error instanceof Error ? error.message : 'Operation failed');
      }
    }
  };

  const copyCode = async (code: string, index: number) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCodes(prev => new Set([...prev, index]));
      
      // Remove the "copied" indicator after 2 seconds
      setTimeout(() => {
        setCopiedCodes(prev => {
          const newSet = new Set(prev);
          newSet.delete(index);
          return newSet;
        });
      }, 2000);
    } catch (err) {
      console.error('Failed to copy code:', err);
    }
  };

  const downloadBackupCodes = () => {
    if (!newBackupCodes) return;

    const content = [
      '# Choma Admin 2FA Backup Codes',
      `# Generated: ${new Date().toLocaleString()}`,
      '# Keep these codes safe and secure!',
      '# Each code can only be used once.',
      '',
      ...newBackupCodes.map((code, index) => `${index + 1}. ${code}`)
    ].join('\n');

    const blob = new Blob([content], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `choma-admin-backup-codes-${Date.now()}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  const copyAllBackupCodes = async () => {
    if (!newBackupCodes) return;

    const content = [
      'Choma Admin 2FA Backup Codes',
      `Generated: ${new Date().toLocaleString()}`,
      '',
      ...newBackupCodes.map((code, index) => `${index + 1}. ${code}`)
    ].join('\n');

    try {
      await navigator.clipboard.writeText(content);
      // Visual feedback for copying all codes
      setCopiedCodes(new Set(newBackupCodes.map((_, index) => index)));
      setTimeout(() => setCopiedCodes(new Set()), 2000);
    } catch (err) {
      console.error('Failed to copy backup codes:', err);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white dark:bg-choma-dark rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center space-x-3">
              <KeyIcon className="w-6 h-6 text-choma-orange" />
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Backup Codes Management
              </h2>
            </div>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              aria-label="Close backup codes manager"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Content */}
          <div className="p-6">
            {error && (
              <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg">
                <div className="flex items-center">
                  <ExclamationTriangleIcon className="w-5 h-5 text-red-500 mr-2" />
                  <p className="text-red-700 dark:text-red-300 text-sm">{error}</p>
                </div>
              </div>
            )}

            {/* Current Backup Codes Status */}
            {backupCodes && !newBackupCodes && (
              <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg">
                <h3 className="text-lg font-medium text-blue-900 dark:text-blue-300 mb-2">
                  Current Backup Codes Status
                </h3>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-blue-700 dark:text-blue-300 font-medium">Total:</span>
                    <span className="ml-2 text-blue-900 dark:text-blue-200">{backupCodes.total}</span>
                  </div>
                  <div>
                    <span className="text-blue-700 dark:text-blue-300 font-medium">Used:</span>
                    <span className="ml-2 text-blue-900 dark:text-blue-200">{backupCodes.used}</span>
                  </div>
                  <div>
                    <span className="text-blue-700 dark:text-blue-300 font-medium">Remaining:</span>
                    <span className="ml-2 text-blue-900 dark:text-blue-200">{backupCodes.remaining}</span>
                  </div>
                </div>
                {backupCodes.lastGenerated && (
                  <p className="text-xs text-blue-600 dark:text-blue-400 mt-2">
                    Last generated: {new Date(backupCodes.lastGenerated).toLocaleString()}
                  </p>
                )}
                
                {backupCodes.remaining <= 2 && (
                  <div className="mt-3 p-3 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-700 rounded">
                    <div className="flex items-center">
                      <ExclamationTriangleIcon className="w-4 h-4 text-orange-500 mr-2" />
                      <p className="text-orange-700 dark:text-orange-300 text-sm">
                        <strong>Warning:</strong> You have only {backupCodes.remaining} backup codes remaining. 
                        Consider regenerating new codes.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* New Backup Codes Display */}
            {newBackupCodes && (
              <div className="mb-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                    New Backup Codes
                  </h3>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => setShowCodes(!showCodes)}
                      className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
                    >
                      {showCodes ? (
                        <>
                          <EyeSlashIcon className="w-4 h-4 mr-1" />
                          Hide Codes
                        </>
                      ) : (
                        <>
                          <EyeIcon className="w-4 h-4 mr-1" />
                          Show Codes
                        </>
                      )}
                    </button>
                  </div>
                </div>

                <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg mb-4">
                  <div className="flex items-start">
                    <ExclamationTriangleIcon className="w-5 h-5 text-yellow-500 mr-2 mt-0.5" />
                    <div>
                      <p className="text-yellow-700 dark:text-yellow-300 text-sm font-medium mb-1">
                        Important: Save These Backup Codes Now
                      </p>
                      <p className="text-yellow-600 dark:text-yellow-400 text-xs">
                        These codes will not be shown again. Each code can only be used once to verify your identity 
                        if you lose access to your authenticator app.
                      </p>
                    </div>
                  </div>
                </div>

                {showCodes && (
                  <>
                    <div className="grid grid-cols-2 gap-3 mb-4">
                      {newBackupCodes.map((code, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
                        >
                          <span className="font-mono text-sm text-gray-900 dark:text-white">
                            {index + 1}. {code}
                          </span>
                          <button
                            onClick={() => copyCode(code, index)}
                            className="ml-2 p-1.5 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded"
                            title="Copy code"
                          >
                            {copiedCodes.has(index) ? (
                              <CheckIcon className="w-4 h-4 text-green-500" />
                            ) : (
                              <DocumentDuplicateIcon className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      ))}
                    </div>

                    <div className="flex space-x-3 mb-4">
                      <button
                        onClick={copyAllBackupCodes}
                        className="inline-flex items-center px-4 py-2 text-sm font-medium text-blue-700 dark:text-blue-300 bg-blue-100 dark:bg-blue-900/30 hover:bg-blue-200 dark:hover:bg-blue-900/50 rounded-lg transition-colors"
                      >
                        <DocumentDuplicateIcon className="w-4 h-4 mr-2" />
                        Copy All Codes
                      </button>
                      <button
                        onClick={downloadBackupCodes}
                        className="inline-flex items-center px-4 py-2 text-sm font-medium text-green-700 dark:text-green-300 bg-green-100 dark:bg-green-900/30 hover:bg-green-200 dark:hover:bg-green-900/50 rounded-lg transition-colors"
                      >
                        <ArrowDownTrayIcon className="w-4 h-4 mr-2" />
                        Download as Text
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Info Section */}
            <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                How Backup Codes Work
              </h3>
              <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-300">
                <li className="flex items-start">
                  <span className="w-2 h-2 bg-choma-orange rounded-full mt-2 mr-3"></span>
                  Each backup code can only be used once for two-factor authentication
                </li>
                <li className="flex items-start">
                  <span className="w-2 h-2 bg-choma-orange rounded-full mt-2 mr-3"></span>
                  Use backup codes when you don't have access to your authenticator app
                </li>
                <li className="flex items-start">
                  <span className="w-2 h-2 bg-choma-orange rounded-full mt-2 mr-3"></span>
                  Store these codes in a safe, secure location (password manager, safe, etc.)
                </li>
                <li className="flex items-start">
                  <span className="w-2 h-2 bg-choma-orange rounded-full mt-2 mr-3"></span>
                  Regenerate new codes if you've used most of your current codes
                </li>
              </ul>
            </div>

            {/* Actions */}
            <div className="flex justify-between items-center">
              <button
                onClick={onClose}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
              >
                Close
              </button>
              
              <button
                onClick={handleRegenerateBackupCodes}
                disabled={loading}
                className="inline-flex items-center px-4 py-2 bg-choma-orange text-white rounded-lg hover:bg-choma-orange/90 disabled:opacity-50 transition-colors"
              >
                {loading ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                ) : (
                  <KeyIcon className="w-4 h-4 mr-2" />
                )}
                {newBackupCodes ? 'Generate New Codes' : 'Regenerate Backup Codes'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 2FA Verification Modal */}
      {show2FAModal && (
        <TwoFactorModal
          isOpen={show2FAModal}
          onClose={() => {
            setShow2FAModal(false);
          }}
          onVerified={handleTwoFactorVerified}
          title="Verify Identity"
          description="Please verify your identity to regenerate backup codes."
          actionDescription="Regenerate backup codes - this will invalidate all existing backup codes"
          allowBackupCodes={false} // Don't allow backup codes to regenerate backup codes
          allowTrustDevice={false}
        />
      )}
    </>
  );
};

export default BackupCodesManager;