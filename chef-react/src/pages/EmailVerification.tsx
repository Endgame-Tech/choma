import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Clock, ArrowLeft, AlertTriangle, CheckCircle } from 'lucide-react';
import logo from '../assets/logo.svg';
import chefBgImage from '../assets/chefsingin.jpg';
import TermsModal from '../components/TermsModal';
import styles from './EmailVerification.module.css';

const EmailVerification: React.FC = () => {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showTermsModal, setShowTermsModal] = useState(false);
  const navigate = useNavigate();
  const bgRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (bgRef.current) {
      bgRef.current.style.setProperty('--bg-image', `url(${chefBgImage})`);
    }
  }, []);

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleSendVerification = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email.trim()) {
      setError('Please enter your email address');
      return;
    }

    if (!validateEmail(email)) {
      setError('Please enter a valid email address');
      return;
    }

    setIsLoading(true);
    setError('');
    setSuccess('');

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
    } catch (error) {
      console.error('Send verification error:', error);
      setError('Failed to send verification code. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left side - Form */}
      <div className="flex-[0_0_35%] flex flex-col justify-center px-8 sm:px-12 lg:px-16 bg-white">
        <div className="w-full max-w-md mx-auto">
          {/* Back Button */}
          <button
            onClick={() => navigate('/login')}
            className="flex items-center text-orange-600 hover:text-orange-700 mb-8 transition-colors"
          >
            <ArrowLeft size={20} className="mr-2" />
            Back to Login
          </button>

          {/* Logo */}
          <div className="mb-8">
            <div>
              <img src={logo} alt="Choma Logo" className="w-20" />
            </div>
          </div>

          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Create your account.</h1>
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

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-semibold py-3 px-4 rounded-lg transition-all duration-200 transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none shadow-lg"
            >
              {isLoading ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  Sending verification code...
                </div>
              ) : (
                'Get Started'
              )}
            </button>
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
        </div>
      </div>

      {/* Right side - Image */}
      <div className="hidden lg:flex flex-[0_0_65%] relative">
        <div
          className={`w-full bg-cover bg-center relative ${styles.bgImage}`}
          data-bg-image={chefBgImage}
          ref={bgRef}
        >
          {/* Overlay */}
          <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/40 to-black/60 flex items-end">
            <div className="p-12 text-white">
              <h2 className="text-4xl font-bold mb-4 leading-tight">
                Start bringing your culinary ideas to reality.
              </h2>
              <p className="text-lg opacity-90 leading-relaxed">
                Create a free account and get full access to all features.
                Trusted by thousands of professional chefs.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Terms Modal */}
      <TermsModal
        isOpen={showTermsModal}
        onClose={() => setShowTermsModal(false)}
      />
    </div>
  );
};

export default EmailVerification;