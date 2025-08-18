import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, AlertTriangle } from 'lucide-react';
import logo from '../assets/logo.svg';
import chefBgImage from '../assets/chefsingin.jpg';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await login({ email, password });
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* Mobile Image Section - Shows at top on mobile */}
      <div className="lg:hidden relative h-80 sm:h-96 rounded-b-3xl overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat sm:h-[34rem]"
          style={{ backgroundImage: `url(${chefBgImage})` }}
        />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center text-white px-6">
            <div className="mb-6">
              <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-4 inline-block">
                <img src={logo} alt="Choma Logo" className="w-20 h-20" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Form Section */}
      <div className="flex-1 lg:flex-[0_0_35%] rounded-t-3xl lg:rounded-none flex flex-col justify-center px-6 sm:px-8 lg:px-16 bg-white -mt-6 lg:mt-0 relative z-10 py-8 lg:py-0">
        <div className="w-full max-w-md mx-auto">
          {/* Desktop Logo - Hidden on mobile */}
          <div className="hidden lg:block mb-8">
            <div>
              <img src={logo} alt="Choma Logo" className="w-20" />
            </div>
          </div>

          {/* Header */}
          <div className="mb-8 text-center lg:text-left">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Welcome back</h1>
            <p className="text-gray-600">
              Don't have an account?{' '}
              <Link to="/register" className="text-orange-600 hover:text-orange-700 font-medium">
                Sign up
              </Link>
            </p>
          </div>

          {/* Error message */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center">
                <AlertTriangle className="text-red-400 mr-3" size={20} />
                <p className="text-red-700 text-sm">{error}</p>
              </div>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Email address *
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-200"
                placeholder="chef@example.com"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                Password *
              </label>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-200"
                  placeholder="Enter your password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input
                  id="remember-me"
                  name="remember-me"
                  type="checkbox"
                  className="h-4 w-4 text-orange-600 focus:ring-orange-500 border-gray-300 rounded"
                />
                <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-700">
                  Remember me
                </label>
              </div>
              <div className="text-sm">
                <Link
                  to="/forgot-password"
                  className="text-orange-600 hover:text-orange-700 font-medium"
                >
                  Forgot password?
                </Link>
              </div>
            </div>

            <div className="space-y-4">
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-orange-600 hover:bg-orange-700 text-white font-semibold py-4 px-4 rounded-2xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
              >
                {loading ? (
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                    Signing in...
                  </div>
                ) : (
                  'Log In'
                )}
              </button>

              <Link
                to="/register"
                className="w-full border-2 border-orange-600 text-orange-600 hover:bg-orange-50 font-semibold py-4 px-4 rounded-2xl transition-all duration-200 block text-center"
              >
                Sign Up
              </Link>
            </div>
          </form>

          {/* Additional links */}
          <div className="mt-8 text-center">
            <p className="text-gray-600 text-sm">
              New to Choma?{' '}
              <Link to="/register" className="text-orange-600 hover:text-orange-700 font-medium">
                Apply to become a chef
              </Link>
            </p>
          </div>
        </div>
      </div>

      {/* Desktop Image Section - Hidden on mobile */}
      <div className="hidden lg:flex flex-[0_0_65%] relative">
        <div
          className="w-full relative bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: `url(${chefBgImage})` }}
        >
          {/* Overlay */}
          <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/40 to-black/60 flex items-end">
            <div className="p-12 text-white">
              <h2 className="text-4xl font-bold mb-4 leading-tight">
                Start bringing your culinary ideas to reality.
              </h2>
              <p className="text-lg opacity-90 leading-relaxed">
                Join our community of talented chefs and start earning with your cooking skills.
                Trusted by thousands of food lovers across Nigeria.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;