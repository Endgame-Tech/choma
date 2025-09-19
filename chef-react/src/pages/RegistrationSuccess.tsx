import React, { useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { CheckCircle, Clock, Mail, ArrowRight } from 'lucide-react'

const RegistrationSuccess: React.FC = () => {
  const navigate = useNavigate()
  const location = useLocation()
  
  const chefName = location.state?.chefName || 'Chef'
  const email = location.state?.email

  // Redirect if no state provided
  useEffect(() => {
    if (!email) {
      navigate('/register')
    }
  }, [email, navigate])

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-green-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-xl p-8 border border-green-100 text-center">
          {/* Success Icon */}
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-r from-green-500 to-green-600 rounded-full mb-6">
            <CheckCircle className="w-10 h-10 text-white" />
          </div>

          {/* Success Message */}
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Application Submitted Successfully!
          </h1>
          
          <p className="text-gray-600 mb-6">
            Thank you, <strong>{chefName}</strong>! Your chef application has been submitted and is now under review.
          </p>

          {/* Status Cards */}
          <div className="space-y-4 mb-8">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center">
                <CheckCircle className="w-5 h-5 text-green-500 mr-3" />
                <div className="text-left">
                  <h3 className="text-sm font-medium text-green-800">Email Verified</h3>
                  <p className="text-xs text-green-600">{email}</p>
                </div>
              </div>
            </div>

            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center">
                <CheckCircle className="w-5 h-5 text-green-500 mr-3" />
                <div className="text-left">
                  <h3 className="text-sm font-medium text-green-800">Application Submitted</h3>
                  <p className="text-xs text-green-600">All required information received</p>
                </div>
              </div>
            </div>

            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
              <div className="flex items-center">
                <Clock className="w-5 h-5 text-orange-500 mr-3" />
                <div className="text-left">
                  <h3 className="text-sm font-medium text-orange-800">Under Review</h3>
                  <p className="text-xs text-orange-600">Admin team is reviewing your application</p>
                </div>
              </div>
            </div>
          </div>

          {/* What Happens Next */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 text-left mb-6">
            <div className="flex items-start">
              <Mail className="w-5 h-5 text-blue-500 mr-3 mt-0.5" />
              <div>
                <h3 className="text-sm font-medium text-blue-800 mb-2">
                  What happens next?
                </h3>
                <ul className="text-sm text-blue-700 space-y-2">
                  <li className="flex items-start">
                    <span className="text-blue-500 mr-2">1.</span>
                    Our admin team will review your application and credentials
                  </li>
                  <li className="flex items-start">
                    <span className="text-blue-500 mr-2">2.</span>
                    We'll verify your information and background
                  </li>
                  <li className="flex items-start">
                    <span className="text-blue-500 mr-2">3.</span>
                    You'll receive an email notification about your status
                  </li>
                  <li className="flex items-start">
                    <span className="text-blue-500 mr-2">4.</span>
                    If approved, you can start receiving orders immediately
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* Email Notification Info */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6">
            <div className="flex items-center justify-center">
              <Mail className="w-5 h-5 text-gray-500 mr-2" />
              <div>
                <p className="text-sm text-gray-600">
                  We'll send approval updates to
                </p>
                <p className="text-sm font-medium text-gray-900">{email}</p>
              </div>
            </div>
          </div>

          {/* Timeline */}
          <div className="text-center mb-6">
            <p className="text-sm text-gray-600">
              <Clock className="inline w-4 h-4 mr-1" />
              Typical review time: <strong>1-3 business days</strong>
            </p>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3">
            <button
              onClick={() => navigate('/login')}
              className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-semibold py-3 px-4 rounded-lg transition-all duration-200 transform hover:scale-[1.02] flex items-center justify-center"
            >
              Go to Login
              <ArrowRight className="w-4 h-4 ml-2" />
            </button>

            <button
              onClick={() => navigate('/register')}
              className="w-full border border-gray-300 text-gray-700 font-medium py-3 px-4 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Register Another Account
            </button>
          </div>

          {/* Support Contact */}
          <div className="mt-6 text-center">
            <p className="text-xs text-gray-500">
              Questions about your application?
            </p>
            <p className="text-xs text-gray-500">
              Contact us at <a href="mailto:chefs@getchoma.com" className="text-orange-600 hover:underline">chefs@getchoma.com</a>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default RegistrationSuccess