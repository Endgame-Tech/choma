import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Eye, EyeOff, ArrowLeft, AlertTriangle, CheckCircle, Shield } from 'lucide-react';
import AuthLayout from '../components/AuthLayout';

const ResetPassword: React.FC = () => {
  const [password, setPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isValidToken, setIsValidToken] = useState<boolean>(true);
  const [isCheckingToken, setIsCheckingToken] = useState<boolean>(true);
  const [isPasswordReset, setIsPasswordReset] = useState<boolean>(false);
  
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const email = searchParams.get('email');

  // Check if token is valid on component mount
  useEffect(() => {
    const verifyToken = async () => {
      if (!token || !email) {
        setIsValidToken(false);
        setIsCheckingToken(false);
        return;
      }

      try {
        const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/auth/verify-reset-token`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ token, email }),
        });

        const data = await response.json();
        setIsValidToken(data.success);
      } catch (err) {
        console.error('Error verifying token:', err);
        setIsValidToken(false);
      } finally {
        setIsCheckingToken(false);
      }
    };

    verifyToken();
  }, [token, email]);

  const validatePassword = (password: string) => {
    const minLength = password.length >= 8;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    
    return {
      minLength,
      hasUpperCase,
      hasLowerCase,
      hasNumbers,
      isValid: minLength && hasUpperCase && hasLowerCase && hasNumbers
    };
  };

  const passwordStrength = validatePassword(password);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!password || !confirmPassword) {
      setError('Please fill in all fields');
      return;
    }

    if (!passwordStrength.isValid) {
      setError('Password does not meet requirements');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/auth/reset-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token,
          email,
          password,
          userType: 'chef'
        }),
      });

      const data = await response.json();

      if (data.success) {
        setSuccess('Password reset successfully!');
        setIsPasswordReset(true);
      } else {
        setError(data.message || 'Failed to reset password');
      }
    } catch (err: any) {
      console.error('Error resetting password:', err);
      setError('Failed to reset password. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Loading state while checking token
  if (isCheckingToken) {
    return (
      <AuthLayout
        title="Verifying Reset Link"
        subtitle="Please wait while we verify your password reset link..."
      >
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Verifying your reset link...</p>
        </div>
      </AuthLayout>
    );
  }

  // Invalid token state
  if (!isValidToken) {
    return (
      <AuthLayout
        title="Invalid Reset Link"
        subtitle="This password reset link is invalid or has expired. Please request a new one."
      >
        {/* Error State */}
        <div className="text-center">
          {/* Error Icon */}
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-red-500 to-red-600 rounded-full mb-6">
            <AlertTriangle className="w-8 h-8 text-white" />
          </div>

          {/* Error Message */}
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-4">
            Invalid Reset Link
          </h1>
          
          <p className="text-gray-600 mb-8">
            This password reset link is invalid, expired, or has already been used.
          </p>

          {/* Action Buttons */}
          <div className="space-y-3">
            <button
              onClick={() => navigate('/forgot-password')}
              className="w-full bg-orange-600 hover:bg-orange-700 text-white font-semibold py-3 px-4 rounded-lg transition-all duration-200"
            >
              Request New Reset Link
            </button>

            <button
              onClick={() => navigate('/login')}
              className="w-full border border-gray-300 text-gray-700 font-medium py-3 px-4 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Back to Login
            </button>
          </div>

          {/* Help Section */}
          <div className="mt-8 bg-orange-50 border border-orange-200 rounded-lg p-4">
            <div className="text-left">
              <h3 className="text-sm font-medium text-orange-800 mb-1">
                Common reasons for invalid links:
              </h3>
              <ul className="text-sm text-orange-700 space-y-1">
                <li>• The link has expired (links expire after 15 minutes)</li>
                <li>• The link has already been used</li>
                <li>• The link was copied incorrectly</li>
                <li>• A newer reset request was made</li>
              </ul>
            </div>
          </div>
        </div>
      </AuthLayout>
    );
  }

  // Success state after password reset
  if (isPasswordReset) {
    return (
      <AuthLayout
        title="Password Reset Successful"
        subtitle="Your password has been successfully reset. You can now log in with your new password."
      >
        {/* Success State */}
        <div className="text-center">
          {/* Success Icon */}
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-green-500 to-green-600 rounded-full mb-6">
            <CheckCircle className="w-8 h-8 text-white" />
          </div>

          {/* Success Message */}
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-4">
            Password Reset Complete!
          </h1>
          
          <p className="text-gray-600 mb-8">
            Your password has been successfully updated. You can now log in with your new password.
          </p>

          {/* Action Buttons */}
          <div className="space-y-3">
            <button
              onClick={() => navigate('/login')}
              className="w-full bg-orange-600 hover:bg-orange-700 text-white font-semibold py-3 px-4 rounded-lg transition-all duration-200"
            >
              Continue to Login
            </button>
          </div>

          {/* Security Note */}
          <div className="mt-8 bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-start">
              <Shield className="w-5 h-5 text-green-500 mr-3 mt-0.5" />
              <div className="text-left">
                <h3 className="text-sm font-medium text-green-800 mb-1">
                  Security Tips:
                </h3>
                <ul className="text-sm text-green-700 space-y-1">
                  <li>• Keep your password secure and don't share it</li>
                  <li>• Consider using a password manager</li>
                  <li>• Log out from public devices</li>
                  <li>• Contact support if you notice suspicious activity</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Create New Password"
      subtitle="Please create a strong, secure password for your account. Make sure it meets all the requirements below."
    >
      {/* Back Button */}
      <button
        onClick={() => navigate('/login')}
        className="flex items-center text-orange-600 hover:text-orange-700 mb-8 transition-colors"
      >
        <ArrowLeft size={20} className="mr-2" />
        Back to Login
      </button>

      {/* Header */}
      <div className="mb-8 text-center lg:text-left">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Reset Your Password</h1>
        <p className="text-gray-600">
          Create a new password for your account: <span className="font-medium text-orange-600">{email}</span>
        </p>
      </div>

      {/* Error message */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center">
            <AlertTriangle size={20} className="text-red-400 mr-3" />
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        </div>
      )}

      {/* Success message */}
      {success && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center">
            <CheckCircle className="text-green-400 mr-3" size={20} />
            <p className="text-green-700 text-sm">{success}</p>
          </div>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
            New Password *
          </label>
          <div className="relative">
            <input
              id="password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-200"
              placeholder="Enter your new password"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
            >
              {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>

          {/* Password Requirements */}
          {password && (
            <div className="mt-3 space-y-2">
              <p className="text-sm font-medium text-gray-700">Password Requirements:</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div className={`flex items-center text-xs ${passwordStrength.minLength ? 'text-green-600' : 'text-red-500'}`}>
                  <CheckCircle size={12} className="mr-1" />
                  At least 8 characters
                </div>
                <div className={`flex items-center text-xs ${passwordStrength.hasUpperCase ? 'text-green-600' : 'text-red-500'}`}>
                  <CheckCircle size={12} className="mr-1" />
                  One uppercase letter
                </div>
                <div className={`flex items-center text-xs ${passwordStrength.hasLowerCase ? 'text-green-600' : 'text-red-500'}`}>
                  <CheckCircle size={12} className="mr-1" />
                  One lowercase letter
                </div>
                <div className={`flex items-center text-xs ${passwordStrength.hasNumbers ? 'text-green-600' : 'text-red-500'}`}>
                  <CheckCircle size={12} className="mr-1" />
                  One number
                </div>
              </div>
            </div>
          )}
        </div>

        <div>
          <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
            Confirm New Password *
          </label>
          <div className="relative">
            <input
              id="confirmPassword"
              name="confirmPassword"
              type={showConfirmPassword ? 'text' : 'password'}
              autoComplete="new-password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-200"
              placeholder="Confirm your new password"
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
            >
              {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>

          {/* Password Match Indicator */}
          {confirmPassword && (
            <div className="mt-2">
              {password === confirmPassword ? (
                <div className="flex items-center text-xs text-green-600">
                  <CheckCircle size={12} className="mr-1" />
                  Passwords match
                </div>
              ) : (
                <div className="flex items-center text-xs text-red-500">
                  <AlertTriangle size={12} className="mr-1" />
                  Passwords do not match
                </div>
              )}
            </div>
          )}
        </div>

        <button
          type="submit"
          disabled={isLoading || !passwordStrength.isValid || password !== confirmPassword}
          className="w-full bg-orange-600 hover:bg-orange-700 text-white font-semibold py-4 px-4 rounded-2xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
        >
          {isLoading ? (
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
              Resetting Password...
            </div>
          ) : (
            'Reset Password'
          )}
        </button>
      </form>

      {/* Security Info */}
      <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start">
          <Shield className="w-5 h-5 text-blue-500 mr-3 mt-0.5" />
          <div>
            <h3 className="text-sm font-medium text-blue-800 mb-1">
              Security Information:
            </h3>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• Your password is encrypted and stored securely</li>
              <li>• Choose a unique password you haven't used elsewhere</li>
              <li>• This link expires after use for security</li>
              <li>• You'll be automatically logged out from other devices</li>
            </ul>
          </div>
        </div>
      </div>
    </AuthLayout>
  );
};

export default ResetPassword;