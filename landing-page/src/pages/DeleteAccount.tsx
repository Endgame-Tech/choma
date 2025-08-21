import React, { useState } from 'react'

const DeleteAccount: React.FC = () => {
  const [formData, setFormData] = useState({
    email: '',
    phoneNumber: '',
    reason: '',
    confirmDelete: false
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    // Here you would typically send the deletion request to your backend
    // For now, we'll simulate the process
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000))
      setIsSubmitted(true)
    } catch (error) {
      console.error('Error submitting deletion request:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isSubmitted) {
    return (
      <div className="pt-20 section-padding bg-gray-50 min-h-screen">
        <div className="container-width">
          <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-lg p-8 text-center">
            <div className="mb-6">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h1 className="text-3xl font-bold text-gray-900 mb-4">Request Submitted Successfully</h1>
              <p className="text-gray-600 text-lg">
                Your account deletion request has been received. We will process your request within 30 days 
                and send you a confirmation email once completed.
              </p>
            </div>
            <div className="bg-blue-50 p-4 rounded-lg">
              <p className="text-blue-800 text-sm">
                <strong>Reference ID:</strong> DEL-{Date.now()}<br />
                Please save this reference number for your records.
              </p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="pt-20 section-padding bg-gray-50 min-h-screen">
      <div className="container-width">
        <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-lg p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-6">Delete My Account</h1>
          
          <div className="mb-8">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">
                    Important: This action cannot be undone
                  </h3>
                  <div className="mt-2 text-sm text-red-700">
                    <p>
                      Deleting your account will permanently remove all your data including:
                    </p>
                    <ul className="list-disc list-inside mt-2 space-y-1">
                      <li>Profile information and preferences</li>
                      <li>Order history and meal plans</li>
                      <li>Saved addresses and payment methods</li>
                      <li>Loyalty points and rewards</li>
                      <li>All app data and settings</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            <div className="mb-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-3">Before You Delete Your Account</h2>
              <p className="text-gray-600 mb-4">
                If you're experiencing issues with our service, our support team is here to help. 
                Consider reaching out to us first:
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <a 
                  href="mailto:support@choma.ng" 
                  className="inline-flex items-center justify-center px-4 py-2 border border-blue-300 text-blue-700 bg-blue-50 rounded-md hover:bg-blue-100 transition-colors"
                >
                  Contact Support
                </a>
                <a 
                  href="/faq" 
                  className="inline-flex items-center justify-center px-4 py-2 border border-gray-300 text-gray-700 bg-white rounded-md hover:bg-gray-50 transition-colors"
                >
                  View FAQ
                </a>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Email Address *
              </label>
              <input
                type="email"
                id="email"
                name="email"
                required
                value={formData.email}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter the email associated with your account"
              />
            </div>

            <div>
              <label htmlFor="phoneNumber" className="block text-sm font-medium text-gray-700 mb-2">
                Phone Number *
              </label>
              <input
                type="tel"
                id="phoneNumber"
                name="phoneNumber"
                required
                value={formData.phoneNumber}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter your phone number"
              />
            </div>

            <div>
              <label htmlFor="reason" className="block text-sm font-medium text-gray-700 mb-2">
                Reason for Deletion (Optional)
              </label>
              <select
                id="reason"
                name="reason"
                value={formData.reason}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Please select a reason</option>
                <option value="privacy_concerns">Privacy concerns</option>
                <option value="not_using_service">Not using the service anymore</option>
                <option value="technical_issues">Technical issues</option>
                <option value="poor_experience">Poor user experience</option>
                <option value="switching_service">Switching to another service</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div className="flex items-start">
              <input
                type="checkbox"
                id="confirmDelete"
                name="confirmDelete"
                required
                checked={formData.confirmDelete}
                onChange={handleInputChange}
                className="mt-1 h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 rounded"
              />
              <label htmlFor="confirmDelete" className="ml-3 text-sm text-gray-700">
                I understand that this action cannot be undone and I want to permanently delete my account and all associated data. *
              </label>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="text-sm font-medium text-gray-900 mb-2">What happens next?</h3>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• We will verify your identity using the provided information</li>
                <li>• Your account will be deactivated immediately</li>
                <li>• All data will be permanently deleted within 30 days</li>
                <li>• You will receive a confirmation email once the deletion is complete</li>
              </ul>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-4">
              <button
                type="submit"
                disabled={!formData.confirmDelete || isSubmitting}
                className="flex-1 bg-red-600 text-white py-3 px-4 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isSubmitting ? 'Processing...' : 'Delete My Account'}
              </button>
              <a
                href="/"
                className="flex-1 text-center bg-gray-300 text-gray-700 py-3 px-4 rounded-md hover:bg-gray-400 transition-colors"
              >
                Cancel
              </a>
            </div>
          </form>

          <div className="mt-8 pt-6 border-t border-gray-200">
            <h3 className="text-sm font-medium text-gray-900 mb-2">Need Help?</h3>
            <p className="text-sm text-gray-600">
              If you have questions about account deletion or need assistance, contact us at{' '}
              <a href="mailto:privacy@choma.ng" className="text-blue-600 hover:underline">
                privacy@choma.ng
              </a>{' '}
              or{' '}
              <a href="mailto:support@choma.ng" className="text-blue-600 hover:underline">
                support@choma.ng
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default DeleteAccount