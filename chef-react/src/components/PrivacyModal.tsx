import React from 'react'
import { X } from 'lucide-react'

interface PrivacyModalProps {
  isOpen: boolean
  onClose: () => void
}

const PrivacyModal: React.FC<PrivacyModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900">Getchoma Chef Privacy Policy</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X size={24} className="text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          <div className="prose max-w-none">
            <p className="text-sm text-gray-600 mb-4">
              <strong>Effective Date:</strong> January 2025
            </p>
            <p className="text-lg mb-6">
              This Privacy Policy explains how Getchoma collects, uses, stores, and protects personal information provided by individuals who sign up to become Chef Partners on our platform.
            </p>
            <p className="mb-6 font-medium">
              By onboarding to the Getchoma platform, you agree to the terms of this policy.
            </p>

            <h3 className="text-xl font-semibold mt-8 mb-4">1. Information We Collect</h3>
            <p className="mb-4">When you sign up as a Chef Partner, we may collect the following personal data:</p>
            
            <h4 className="text-lg font-semibold mt-6 mb-3">a. Personal Identification</h4>
            <ul className="list-disc pl-6 mb-4 space-y-1">
              <li>Full name</li>
              <li>Date of birth</li>
              <li>Gender</li>
              <li>National ID or government-issued ID number</li>
            </ul>

            <h4 className="text-lg font-semibold mt-6 mb-3">b. Contact Information</h4>
            <ul className="list-disc pl-6 mb-4 space-y-1">
              <li>Phone number</li>
              <li>Email address</li>
              <li>Residential and kitchen location address</li>
            </ul>

            <h4 className="text-lg font-semibold mt-6 mb-3">c. Banking Details</h4>
            <ul className="list-disc pl-6 mb-4 space-y-1">
              <li>Bank account number and name (for payments)</li>
              <li>BVN (only where legally required for verification)</li>
            </ul>

            <h4 className="text-lg font-semibold mt-6 mb-3">d. Professional Information</h4>
            <ul className="list-disc pl-6 mb-4 space-y-1">
              <li>Certifications, licenses, or permits (e.g. food handler certificates)</li>
              <li>Experience details</li>
              <li>Photos of kitchen setup (for quality and hygiene verification)</li>
            </ul>

            <h4 className="text-lg font-semibold mt-6 mb-3">e. Platform Activity</h4>
            <ul className="list-disc pl-6 mb-6 space-y-1">
              <li>Performance data (delivery times, ratings, customer feedback)</li>
              <li>Communication history with the Getchoma team</li>
              <li>Device/IP used to access the platform</li>
            </ul>

            <h3 className="text-xl font-semibold mt-8 mb-4">2. How We Use Your Information</h3>
            <p className="mb-4">We use your information to:</p>
            <ul className="list-disc pl-6 mb-6 space-y-2">
              <li>Create and manage your chef account</li>
              <li>Assign meal preparation and delivery tasks</li>
              <li>Process and pay out earnings</li>
              <li>Verify your identity and kitchen compliance</li>
              <li>Monitor quality, ratings, and performance</li>
              <li>Communicate operational updates and platform changes</li>
              <li>Enforce our Terms of Service and resolve disputes</li>
            </ul>

            <h3 className="text-xl font-semibold mt-8 mb-4">3. Data Sharing & Disclosure</h3>
            <p className="mb-4">We do not sell or rent your data. However, we may share your information with:</p>
            <ul className="list-disc pl-6 mb-6 space-y-2">
              <li><strong>Internal staff:</strong> Operations, customer service, and admin teams</li>
              <li><strong>Third-party service providers:</strong> For payment processing (e.g. Paystack), logistics coordination, and compliance</li>
              <li><strong>Regulatory authorities:</strong> If legally required to report or verify information</li>
              <li><strong>Buyers or delivery agents:</strong> In rare cases, for issue resolution (e.g. wrong order clarification)</li>
            </ul>
            <p className="mb-6">
              All third parties we work with are contractually bound to maintain your data confidentiality.
            </p>

            <h3 className="text-xl font-semibold mt-8 mb-4">4. Data Storage & Security</h3>
            <ul className="list-disc pl-6 mb-6 space-y-2">
              <li>Your data is stored securely in encrypted systems (e.g., Airtable, secure cloud storage).</li>
              <li>We implement security best practices including firewalls, limited data access, and password encryption.</li>
              <li>Only authorized staff have access to chef-related data.</li>
            </ul>

            <h3 className="text-xl font-semibold mt-8 mb-4">5. Data Retention</h3>
            <p className="mb-4">We retain your information:</p>
            <ul className="list-disc pl-6 mb-6 space-y-2">
              <li>As long as you remain an active chef on the platform</li>
              <li>For up to 12 months after account deactivation (for compliance and audits)</li>
              <li>Longer if legally required (e.g. financial/tax records)</li>
            </ul>
            <p className="mb-6">
              You may request data deletion after account closure unless we are legally required to keep certain records.
            </p>

            <h3 className="text-xl font-semibold mt-8 mb-4">6. Your Data Rights</h3>
            <p className="mb-4">As a Chef Partner, you have the right to:</p>
            <ul className="list-disc pl-6 mb-6 space-y-2">
              <li>Access the personal data we hold about you</li>
              <li>Request correction of inaccurate or outdated information</li>
              <li>Request deletion of your data (subject to legal retention obligations)</li>
              <li>Withdraw consent for non-essential communications</li>
              <li>File a complaint with a data protection authority (e.g. NITDA in Nigeria)</li>
            </ul>
            <p className="mb-6">
              To exercise these rights, contact us via: <a href="mailto:privacy@getchoma.com" className="text-orange-600 hover:text-orange-700">privacy@getchoma.com</a>
            </p>

            <h3 className="text-xl font-semibold mt-8 mb-4">7. Cookies & Device Data</h3>
            <p className="mb-4">
              We may collect device and usage data when you access the Chef dashboard (e.g. IP address, browser type). This helps us improve platform performance and prevent fraud.
            </p>
            <p className="mb-6">
              No third-party advertising cookies are used on the Chef platform.
            </p>

            <h3 className="text-xl font-semibold mt-8 mb-4">8. Updates to this Policy</h3>
            <p className="mb-6">
              We may update this Privacy Policy from time to time. We'll notify you of any significant changes through your dashboard or email. Continued use of the platform implies consent to the updated policy.
            </p>

            <h3 className="text-xl font-semibold mt-8 mb-4">Consent Notice</h3>
            <p className="mb-6 font-medium text-orange-600">
              By clicking "Accept" or proceeding with onboarding, you confirm that you have read, understood, and agreed to the terms of this Privacy Policy.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end p-6 border-t border-gray-200">
          <button
            onClick={onClose}
            className="bg-orange-600 hover:bg-orange-700 text-white font-medium py-2 px-6 rounded-lg transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}

export default PrivacyModal