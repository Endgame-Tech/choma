import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Mail, ArrowLeft, AlertTriangle, CheckCircle, Clock } from 'lucide-react';
import TermsModal from '../components/TermsModal';
import AuthLayout from '../components/AuthLayout';

const EmailVerification: React.FC = () => {
  const [email, setEmail] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [showTermsModal, setShowTermsModal] = useState<boolean>(false);
  const navigate = useNavigate();
  const location = useLocation();

  // Get the email from navigation state if available
  React.useEffect(() => {
    if (location.state?.email) {
      setEmail(location.state.email);
    }
  }, [location.state]);

  const handleSendVerification = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setIsLoading(true);

    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/auth/send-verification`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email.toLowerCase(),
          purpose: 'chef_registration',
        }),
      });

      const data = await response.json();

      if (data.success) {
        setSuccess('Verification code sent! Check your email.');
        navigate('/register/verify-code', {
          state: { email: email.toLowerCase() },
        });
      } else {
        setError(data.message || 'Failed to send verification code');
      }
    } catch (err: any) {
      console.error('Error sending verification email:', err);
      setError('Failed to send verification email. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }; return (
    <AuthLayout
      title="Join Our Chef Community"
      subtitle="Never forget to go green everyday, because the greener you go the higher you get"
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
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Create your account</h1>
        <p className="text-gray-600">
          Already have an account?{' '}
          <button onClick={() => navigate('/login')} className="text-orange-600 hover:text-orange-700 font-medium">
            Sign in
          </button>
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
      <form onSubmit={handleSendVerification} className="space-y-6">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
            Email address *
          </label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-200"
              placeholder="chef@example.com"
            />
          </div>
        </div>

        <div className="flex items-start">
          <input
            id="terms"
            name="terms"
            type="checkbox"
            required
            className="mt-1 h-4 w-4 text-orange-600 focus:ring-orange-500 border-gray-300 rounded"
          />
          <label htmlFor="terms" className="ml-2 block text-sm text-gray-700">
            I agree to the{' '}
            <button
              type="button"
              onClick={() => setShowTermsModal(true)}
              className="text-orange-600 hover:text-orange-700 font-medium underline"
            >
              terms and conditions
            </button>
          </label>
        </div>

        <div className="space-y-4">
          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-orange-600 hover:bg-orange-700 text-white font-semibold py-4 px-4 rounded-2xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
          >
            {isLoading ? (
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                Sending verification code...
              </div>
            ) : (
              'Sign Up'
            )}
          </button>

          <button
            type="button"
            onClick={() => navigate('/login')}
            className="w-full border-2 border-orange-600 text-orange-600 hover:bg-orange-50 font-semibold py-4 px-4 rounded-2xl transition-all duration-200"
          >
            Log In
          </button>
        </div>
      </form>

      {/* Info Box */}
      <div className="mt-8 bg-orange-50 border border-orange-200 rounded-lg p-4">
        <div className="flex items-start">
          <Clock className="w-5 h-5 text-orange-500 mr-3 mt-0.5" />
          <div>
            <h3 className="text-sm font-medium text-orange-800 mb-1">
              What happens next?
            </h3>
            <ul className="text-sm text-orange-700 space-y-1">
              <li>• We'll send a 6-digit code to your email</li>
              <li>• Enter the code to verify your email</li>
              <li>• Complete your chef registration form</li>
              <li>• Wait for admin approval</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Terms Modal */}
      <TermsModal
        isOpen={showTermsModal}
        onClose={() => setShowTermsModal(false)}
      />
    </AuthLayout>
  );
};

export default EmailVerification;
