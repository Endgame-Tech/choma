import React, { useState, useEffect } from 'react';
import { ShieldCheckIcon, KeyIcon, QrCodeIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import {
  TwoFactorSetup as TwoFactorSetupType,
  TwoFactorStatus,
  TwoFactorSetupResponse,
  TwoFactorVerificationResponse,
  TWO_FACTOR_CONFIG
} from '../types/twoFactor';
import { usePermissions } from '../contexts/PermissionContext';
import { twoFactorApi } from '../services/twoFactorApi';

interface TwoFactorSetupProps {
  isOpen: boolean;
  onClose: () => void;
  onSetupComplete?: (status: TwoFactorStatus) => void;
  adminId?: string;
}

const TwoFactorSetup: React.FC<TwoFactorSetupProps> = ({
  isOpen,
  onClose,
  onSetupComplete,
  adminId
}) => {
  const { currentAdmin } = usePermissions();
  const [step, setStep] = useState<'intro' | 'qrcode' | 'verify' | 'backup' | 'complete'>('intro');
  const [setupData, setSetupData] = useState<TwoFactorSetupType | null>(null);
  const [verificationCode, setVerificationCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentStatus, setCurrentStatus] = useState<TwoFactorStatus | null>(null);

  const targetAdminId = adminId || currentAdmin?._id;

  useEffect(() => {
    if (isOpen && targetAdminId) {
      loadCurrentStatus();
    }
  }, [isOpen, targetAdminId]);

  const loadCurrentStatus = async () => {
    if (!targetAdminId) return;

    try {
      const status = await twoFactorApi.getTwoFactorStatus();
      setCurrentStatus(status);

      if (status.isEnabled) {
        setStep('complete');
      }
    } catch (error) {
      console.error('Error loading 2FA status:', error);
    }
  };

  const handleStartSetup = async () => {
    if (!targetAdminId) return;

    setLoading(true);
    setError(null);

    try {
      const response: TwoFactorSetupResponse = await twoFactorApi.initiateTwoFactorSetup();

      if (response.success && response.data) {
        setSetupData(response.data);
        setStep('qrcode');
      } else {
        setError(response.message || 'Failed to initiate 2FA setup');
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to start setup');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    if (!targetAdminId || !verificationCode || !setupData) return;

    setLoading(true);
    setError(null);

    try {
      const response: TwoFactorVerificationResponse = await twoFactorApi.verifyTwoFactorSetup(
        verificationCode,
      );

      if (response.success) {
        setStep('backup');
      } else {
        setError(response.message || 'Invalid verification code');
        setVerificationCode('');
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Verification failed');
      setVerificationCode('');
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteSetup = async () => {
    if (!targetAdminId) return;

    setLoading(true);

    try {
      setStep('complete');
      const newStatus = await twoFactorApi.getTwoFactorStatus();
      setCurrentStatus(newStatus);
      onSetupComplete?.(newStatus);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Setup completion failed');
    } finally {
      setLoading(false);
    }
  };

  const handleDisableTwoFactor = async () => {
    if (!targetAdminId || !currentStatus?.isEnabled) return;

    const password = prompt('Please enter your password to disable Two-Factor Authentication.');
    if (!password) {
      setError('Password is required to disable 2FA.');
      return;
    }

    const token = prompt('Please enter a code from your authenticator app.');
    if (!token) {
      setError('A verification code is required to disable 2FA.');
      return;
    }

    if (!confirm('Are you sure you want to disable Two-Factor Authentication? This will reduce your account security.')) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await twoFactorApi.disableTwoFactor(password, token);

      if (response.success) {
        const newStatus = await twoFactorApi.getTwoFactorStatus();
        setCurrentStatus(newStatus);
        setStep('intro');
        onSetupComplete?.(newStatus);
      } else {
        setError(response.message || 'Failed to disable 2FA');
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to disable 2FA');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      alert('Copied to clipboard!');
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-choma-dark rounded-lg shadow-xl max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-3">
            <ShieldCheckIcon className="w-6 h-6 text-choma-orange" />
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Two-Factor Authentication
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            aria-label="Close 2FA setup"
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

          {step === 'intro' && (
            <div className="text-center">
              <div className="mb-6">
                <ShieldCheckIcon className="w-16 h-16 text-choma-orange mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  Secure Your Account
                </h3>
                <p className="text-gray-600 dark:text-gray-300 text-sm">
                  Two-Factor Authentication adds an extra layer of security to your admin account by requiring a verification code from your mobile device.
                </p>
              </div>

              {currentStatus?.isEnabled ? (
                <div className="space-y-4">
                  <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg">
                    <p className="text-green-700 dark:text-green-300 text-sm">
                      <strong>2FA is currently enabled</strong><br />
                      Setup date: {currentStatus.setupDate ? new Date(currentStatus.setupDate).toLocaleDateString() : 'Unknown'}<br />
                      Backup codes remaining: {currentStatus.backupCodesRemaining}
                    </p>
                  </div>

                  <div className="flex flex-col space-y-3">
                    <button
                      onClick={() => setStep('backup')}
                      className="w-full bg-blue-600 dark:bg-blue-700 text-white py-2 px-4 rounded-lg hover:bg-blue-700 dark:hover:bg-blue-800 transition-colors"
                    >
                      <KeyIcon className="w-4 h-4 inline mr-2" />
                      View Backup Codes
                    </button>

                    <button
                      onClick={handleDisableTwoFactor}
                      disabled={loading}
                      className="w-full bg-red-600 dark:bg-red-700 text-white py-2 px-4 rounded-lg hover:bg-red-700 dark:hover:bg-red-800 transition-colors disabled:opacity-50"
                    >
                      {loading ? 'Disabling...' : 'Disable 2FA'}
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={handleStartSetup}
                  disabled={loading}
                  className="w-full bg-choma-orange text-white py-3 px-4 rounded-lg hover:bg-choma-orange/90 transition-colors disabled:opacity-50"
                >
                  {loading ? 'Setting up...' : 'Set Up Two-Factor Authentication'}
                </button>
              )}
            </div>
          )}

          {step === 'qrcode' && setupData && (
            <div className="text-center">
              <div className="mb-6">
                <QrCodeIcon className="w-12 h-12 text-choma-orange mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  Scan QR Code
                </h3>
                <p className="text-gray-600 dark:text-gray-300 text-sm mb-4">
                  Use your authenticator app (Google Authenticator, Authy, etc.) to scan this QR code:
                </p>
              </div>

              <div className="mb-6 p-4 bg-white dark:bg-gray-800 rounded-lg border">
                <img
                  src={setupData.qrCodeUrl}
                  alt="2FA QR Code"
                  className="mx-auto max-w-full h-auto"
                />
              </div>

              <div className="mb-6">
                <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">
                  Can&apos;t scan? Enter this secret key manually:
                </p>
                <div className="flex items-center justify-between p-2 bg-gray-100 dark:bg-gray-700 rounded border">
                  <code className="text-sm font-mono">{setupData.secret}</code>
                  <button
                    onClick={() => copyToClipboard(setupData.secret)}
                    className="text-choma-orange hover:text-choma-orange/80 text-xs ml-2"
                  >
                    Copy
                  </button>
                </div>
              </div>

              <button
                onClick={() => setStep('verify')}
                className="w-full bg-choma-orange text-white py-2 px-4 rounded-lg hover:bg-choma-orange/90 transition-colors"
              >
                Continue to Verification
              </button>
            </div>
          )}

          {step === 'verify' && (
            <div className="text-center">
              <div className="mb-6">
                <KeyIcon className="w-12 h-12 text-choma-orange mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  Verify Setup
                </h3>
                <p className="text-gray-600 dark:text-gray-300 text-sm mb-4">
                  Enter the {TWO_FACTOR_CONFIG.TOKEN_DIGITS}-digit code from your authenticator app:
                </p>
              </div>

              <div className="mb-6">
                <input
                  type="text"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, TWO_FACTOR_CONFIG.TOKEN_DIGITS))}
                  placeholder={`${TWO_FACTOR_CONFIG.TOKEN_DIGITS}-digit code`}
                  className="w-full px-4 py-3 text-center text-2xl font-mono border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-choma-orange focus:border-transparent"
                  maxLength={TWO_FACTOR_CONFIG.TOKEN_DIGITS}
                  autoFocus
                />
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={() => setStep('qrcode')}
                  className="flex-1 bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-200 py-2 px-4 rounded-lg hover:bg-gray-400 dark:hover:bg-gray-700 transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={handleVerifyCode}
                  disabled={loading || verificationCode.length !== TWO_FACTOR_CONFIG.TOKEN_DIGITS}
                  className="flex-1 bg-choma-orange text-white py-2 px-4 rounded-lg hover:bg-choma-orange/90 transition-colors disabled:opacity-50"
                >
                  {loading ? 'Verifying...' : 'Verify Code'}
                </button>
              </div>
            </div>
          )}

          {step === 'backup' && setupData && (
            <div className="text-center">
              <div className="mb-6">
                <KeyIcon className="w-12 h-12 text-choma-orange mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  Backup Codes
                </h3>
                <p className="text-gray-600 dark:text-gray-300 text-sm mb-4">
                  Save these backup codes in a secure location. You can use them to access your account if you lose your device:
                </p>
              </div>

              <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border">
                <div className="grid grid-cols-2 gap-2 text-sm font-mono">
                  {setupData.backupCodes.map((code, index) => (
                    <div key={index} className="p-2 bg-white dark:bg-gray-700 rounded border">
                      {code}
                    </div>
                  ))}
                </div>
              </div>

              <div className="mb-6">
                <button
                  onClick={() => copyToClipboard(setupData.backupCodes.join('\n'))}
                  className="text-choma-orange hover:text-choma-orange/80 text-sm underline"
                >
                  Copy all backup codes
                </button>
              </div>

              <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg mb-6">
                <p className="text-yellow-700 dark:text-yellow-300 text-xs">
                  <strong>Important:</strong> Each backup code can only be used once. Store them securely and don&apos;t share them with anyone.
                </p>
              </div>

              <button
                onClick={handleCompleteSetup}
                disabled={loading}
                className="w-full bg-choma-orange text-white py-3 px-4 rounded-lg hover:bg-choma-orange/90 transition-colors disabled:opacity-50"
              >
                {loading ? 'Completing Setup...' : 'Complete Setup'}
              </button>
            </div>
          )}

          {step === 'complete' && (
            <div className="text-center">
              <div className="mb-6">
                <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                  <ShieldCheckIcon className="w-8 h-8 text-green-600 dark:text-green-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  Setup Complete!
                </h3>
                <p className="text-gray-600 dark:text-gray-300 text-sm mb-4">
                  Two-Factor Authentication has been successfully enabled for your account. Your account is now more secure.
                </p>
              </div>

              {currentStatus && (
                <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg">
                  <p className="text-green-700 dark:text-green-300 text-sm">
                    <strong>Status:</strong> Active<br />
                    <strong>Backup codes remaining:</strong> {currentStatus.backupCodesRemaining}<br />
                    <strong>Setup date:</strong> {currentStatus.setupDate ? new Date(currentStatus.setupDate).toLocaleDateString() : 'Just now'}
                  </p>
                </div>
              )}

              <button
                onClick={onClose}
                className="w-full bg-choma-orange text-white py-2 px-4 rounded-lg hover:bg-choma-orange/90 transition-colors"
              >
                Close
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TwoFactorSetup;