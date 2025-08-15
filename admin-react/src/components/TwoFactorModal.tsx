import React, { useState, useEffect, useRef } from 'react';
import { KeyIcon, ExclamationTriangleIcon, ClockIcon } from '@heroicons/react/24/outline';
import {
  TwoFactorVerificationResponse,
  TWO_FACTOR_CONFIG,
} from '../types/twoFactor';
import { twoFactorApi } from '../services/twoFactorApi';

interface TwoFactorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onVerified: (verified: boolean, data?: TwoFactorVerificationResponse['data']) => void;
  actionDescription?: string;
  allowBackupCodes?: boolean;
  allowTrustDevice?: boolean;
  title?: string;
  description?: string;
}

const TwoFactorModal: React.FC<TwoFactorModalProps> = ({
  isOpen,
  onClose,
  onVerified,
  actionDescription,
  allowBackupCodes = true,
  allowTrustDevice = false,
  title = "Two-Factor Authentication Required",
  description = "Please enter your verification code to continue."
}) => {
  const [verificationCode, setVerificationCode] = useState('');
  const [backupCode, setBackupCode] = useState('');
  const [useBackupCode, setUseBackupCode] = useState(false);
  const [rememberDevice, setRememberDevice] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attempts, setAttempts] = useState(0);
  const [timeLeft, setTimeLeft] = useState(30);
  const [isLocked, setIsLocked] = useState(false);

  const codeInputRef = useRef<HTMLInputElement>(null);
  const backupInputRef = useRef<HTMLInputElement>(null);

  const maxAttempts = TWO_FACTOR_CONFIG.MAX_VERIFICATION_ATTEMPTS;
  const lockoutDuration = TWO_FACTOR_CONFIG.LOCKOUT_DURATION_MINUTES;

  useEffect(() => {
    if (isOpen) {
      // Reset state when modal opens
      setVerificationCode('');
      setBackupCode('');
      setUseBackupCode(false);
      setRememberDevice(false);
      setError(null);
      setAttempts(0);
      setIsLocked(false);

      // Focus appropriate input
      setTimeout(() => {
        if (useBackupCode) {
          backupInputRef.current?.focus();
        } else {
          codeInputRef.current?.focus();
        }
      }, 100);
    }
  }, [isOpen, useBackupCode]);

  // Countdown timer for token refresh
  useEffect(() => {
    if (!isOpen || useBackupCode) return;

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          return 30; // Reset to 30 seconds
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isOpen, useBackupCode]);

  // Lockout timer
  useEffect(() => {
    if (!isLocked) return;

    const lockoutTimer = setTimeout(() => {
      setIsLocked(false);
      setAttempts(0);
      setError(null);
    }, lockoutDuration * 60 * 1000);

    return () => clearTimeout(lockoutTimer);
  }, [isLocked, lockoutDuration]);

  const handleVerify = async () => {
    if (isLocked) return;

    const code = useBackupCode ? backupCode.trim() : verificationCode.trim();
    if (!code) return;

    if (!useBackupCode && code.length !== TWO_FACTOR_CONFIG.TOKEN_DIGITS) {
      setError(`Please enter a ${TWO_FACTOR_CONFIG.TOKEN_DIGITS}-digit code`);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      let response: TwoFactorVerificationResponse;
      const trustDevice = allowTrustDevice ? rememberDevice : false;

      if (useBackupCode) {
        response = await twoFactorApi.verifyBackupCode(code, trustDevice);
      } else {
        response = await twoFactorApi.verifyTwoFactorCode(code, trustDevice);
      }

      if (response.success && response.data?.verified) {
        // Handle device trust if enabled
        if (rememberDevice && allowTrustDevice && !response.data.deviceTrusted) {
          try {
            // The token from the successful verification is needed to trust the device
            const verificationToken = response.data.verificationToken;
            if (verificationToken) {
              await twoFactorApi.trustCurrentDevice(`Device-${Date.now()}`, verificationToken);
            } else {
              console.warn('Verification token not available, cannot trust device.');
            }
          } catch (trustError) {
            console.warn('Failed to trust device:', trustError);
          }
        }

        onVerified(true, response.data);
        onClose();
      } else {
        setAttempts(prev => {
          const newAttempts = prev + 1;
          if (newAttempts >= maxAttempts) {
            setIsLocked(true);
            setError(`Too many failed attempts. Please wait ${lockoutDuration} minutes before trying again.`);
          } else {
            setError(response.message || 'Invalid verification code');
          }
          return newAttempts;
        });

        // Clear the input
        if (useBackupCode) {
          setBackupCode('');
        } else {
          setVerificationCode('');
        }
      }
    } catch (error) {
      setAttempts(prev => {
        const newAttempts = prev + 1;
        if (newAttempts >= maxAttempts) {
          setIsLocked(true);
          setError(`Too many failed attempts. Please wait ${lockoutDuration} minutes before trying again.`);
        } else {
          setError(error instanceof Error ? error.message : 'Verification failed');
        }
        return newAttempts;
      });

      // Clear the input
      if (useBackupCode) {
        setBackupCode('');
      } else {
        setVerificationCode('');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !loading && !isLocked) {
      handleVerify();
    }
  };

  const formatCode = (value: string) => {
    // Remove all non-digits
    const digits = value.replace(/\D/g, '');
    // Limit to 6 digits and format as XXX XXX
    if (digits.length <= 3) {
      return digits;
    }
    return `${digits.slice(0, 3)} ${digits.slice(3, 6)}`;
  };

  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const formattedValue = formatCode(value);
    setVerificationCode(formattedValue);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-choma-dark rounded-lg shadow-xl max-w-md w-full mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-3">
            <KeyIcon className="w-6 h-6 text-choma-orange" />
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              {title}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            aria-label="Close 2FA verification"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Description */}
          <div className="mb-6 text-center">
            <p className="text-gray-600 dark:text-gray-300 text-sm mb-2">
              {description}
            </p>
            {actionDescription && (
              <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg">
                <p className="text-blue-700 dark:text-blue-300 text-sm">
                  <strong>Action:</strong> {actionDescription}
                </p>
              </div>
            )}
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg">
              <div className="flex items-center">
                <ExclamationTriangleIcon className="w-5 h-5 text-red-500 mr-2" />
                <p className="text-red-700 dark:text-red-300 text-sm">{error}</p>
              </div>
            </div>
          )}

          {/* Lockout Warning */}
          {attempts > 0 && !isLocked && (
            <div className="mb-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg">
              <p className="text-yellow-700 dark:text-yellow-300 text-sm">
                <strong>Warning:</strong> {attempts} of {maxAttempts} attempts used.
                After {maxAttempts} failed attempts, you will be locked out for {lockoutDuration} minutes.
              </p>
            </div>
          )}

          {/* Input Section */}
          {!isLocked && (
            <div className="mb-6">
              {!useBackupCode ? (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Verification Code
                    </label>
                    <div className="flex items-center text-xs text-gray-500 dark:text-gray-400">
                      <ClockIcon className="w-4 h-4 mr-1" />
                      {timeLeft}s
                    </div>
                  </div>
                  <input
                    ref={codeInputRef}
                    type="text"
                    value={verificationCode}
                    onChange={handleCodeChange}
                    onKeyPress={handleKeyPress}
                    placeholder="000 000"
                    className="w-full px-4 py-3 text-center text-2xl font-mono border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-choma-orange focus:border-transparent"
                    maxLength={7} // "000 000" format
                    autoComplete="off"
                    disabled={loading}
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 text-center">
                    Enter the {TWO_FACTOR_CONFIG.TOKEN_DIGITS}-digit code from your authenticator app
                  </p>
                </div>
              ) : (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Backup Code
                  </label>
                  <input
                    ref={backupInputRef}
                    type="text"
                    value={backupCode}
                    onChange={(e) => setBackupCode(e.target.value.toUpperCase())}
                    onKeyPress={handleKeyPress}
                    placeholder="XXXXXXXX"
                    className="w-full px-4 py-3 text-center text-lg font-mono border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-choma-orange focus:border-transparent"
                    maxLength={8}
                    autoComplete="off"
                    disabled={loading}
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 text-center">
                    Enter one of your backup codes
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Trust Device Option */}
          {allowTrustDevice && !useBackupCode && !isLocked && (
            <div className="mb-6">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={rememberDevice}
                  onChange={(e) => setRememberDevice(e.target.checked)}
                  className="w-4 h-4 text-choma-orange border-gray-300 rounded focus:ring-choma-orange"
                />
                <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                  Trust this device for 7 days
                </span>
              </label>
            </div>
          )}

          {/* Action Buttons */}
          <div className="space-y-3">
            {!isLocked && (
              <button
                onClick={handleVerify}
                disabled={loading || (!useBackupCode && verificationCode.replace(/\s/g, '').length !== TWO_FACTOR_CONFIG.TOKEN_DIGITS) || (useBackupCode && !backupCode.trim())}
                className="w-full bg-choma-orange text-white py-3 px-4 rounded-lg hover:bg-choma-orange/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Verifying...' : 'Verify'}
              </button>
            )}

            {/* Toggle Backup Code */}
            {allowBackupCodes && !isLocked && (
              <button
                onClick={() => {
                  setUseBackupCode(!useBackupCode);
                  setError(null);
                  setVerificationCode('');
                  setBackupCode('');
                }}
                className="w-full text-sm text-choma-orange hover:text-choma-orange/80 underline"
              >
                {useBackupCode ? 'Use authenticator app instead' : 'Use backup code instead'}
              </button>
            )}

            {/* Cancel Button */}
            <button
              onClick={onClose}
              className="w-full bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-200 py-2 px-4 rounded-lg hover:bg-gray-400 dark:hover:bg-gray-700 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TwoFactorModal;