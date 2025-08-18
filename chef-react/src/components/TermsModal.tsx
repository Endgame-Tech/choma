import React from 'react'
import { X } from 'lucide-react'

interface TermsModalProps {
  isOpen: boolean
  onClose: () => void
}

const TermsModal: React.FC<TermsModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900">Getchoma Chef Terms of Service</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            aria-label="Close terms and conditions modal"
            title="Close terms and conditions modal"
          >
            <X size={24} className="text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          <div className="prose max-w-none">
            <p className="text-lg mb-6">
              Welcome to Getchoma! By completing your onboarding as a Chef Partner on the Getchoma platform, you agree to the following Terms of Service. Please read carefully before proceeding.
            </p>

            <h3 className="text-xl font-semibold mt-8 mb-4">1. Your Role as a Getchoma Chef</h3>
            <p className="mb-4">
              As a Getchoma Chef, you are an independent partner responsible for preparing meals according to Getchoma's standards. Your responsibilities include:
            </p>
            <ul className="list-disc pl-6 mb-6 space-y-2">
              <li>Preparing meals based on assigned bundles or custom user preferences</li>
              <li>Maintaining high levels of hygiene, safety, and quality</li>
              <li>Delivering meals on time to assigned pickup agents or hubs</li>
              <li>Using approved ingredients and standardized recipes</li>
              <li>Complying with any instructions related to allergies or special diets</li>
            </ul>

            <h3 className="text-xl font-semibold mt-8 mb-4">2. Independent Contractor Relationship</h3>
            <ul className="list-disc pl-6 mb-6 space-y-2">
              <li>You are not an employee or staff member of Getchoma.</li>
              <li>You operate as an independent service provider and are responsible for your own taxes, tools, and equipment.</li>
              <li>You may work with other clients as long as it does not conflict with your responsibilities on Getchoma.</li>
            </ul>

            <h3 className="text-xl font-semibold mt-8 mb-4">3. Meal Standards & Compliance</h3>
            <p className="mb-4">All meals you prepare must meet the following standards:</p>
            <ul className="list-disc pl-6 mb-6 space-y-2">
              <li><strong>Hygiene:</strong> Meals must be prepared in clean, compliant kitchens.</li>
              <li><strong>Taste & Presentation:</strong> Meals must be appealing and consistent with Getchoma quality.</li>
              <li><strong>Timing:</strong> Late deliveries reduce user satisfaction and may affect your standing on the platform.</li>
              <li><strong>Packaging:</strong> Meals must be properly sealed and labeled using Getchoma-approved packaging.</li>
              <li><strong>Special Requests:</strong> You must carefully follow allergy notes or customization instructions. Any deviation could cause harm and result in suspension.</li>
            </ul>

            <h3 className="text-xl font-semibold mt-8 mb-4">4. Payment Terms</h3>
            <ul className="list-disc pl-6 mb-6 space-y-2">
              <li>You will be paid per meal prepared and delivered as agreed during onboarding.</li>
              <li>Payments are processed weekly or bi-weekly via bank transfer.</li>
              <li>Payouts depend on completed orders and compliance with quality and timing standards.</li>
              <li>Bonus payments or penalties may apply based on performance or customer satisfaction.</li>
            </ul>

            <h3 className="text-xl font-semibold mt-8 mb-4">5. Ingredients & Supplies</h3>
            <ul className="list-disc pl-6 mb-6 space-y-2">
              <li>You are responsible for sourcing ingredients unless Getchoma provides otherwise.</li>
              <li>Getchoma may supply branded packaging or delivery materials when needed.</li>
              <li>All meals must meet our ingredient quality standards.</li>
            </ul>

            <h3 className="text-xl font-semibold mt-8 mb-4">6. Performance Monitoring</h3>
            <p className="mb-4">Your work will be reviewed regularly based on:</p>
            <ul className="list-disc pl-6 mb-6 space-y-2">
              <li>Meal quality and consistency</li>
              <li>Timeliness of order fulfillment</li>
              <li>User ratings and feedback</li>
              <li>Responsiveness to platform communications</li>
            </ul>
            <p className="mb-6">
              Low performance may lead to reduced order allocation, warnings, or removal from the platform.
            </p>

            <h3 className="text-xl font-semibold mt-8 mb-4">7. Confidentiality</h3>
            <p className="mb-4">As a Chef Partner, you agree to keep the following confidential:</p>
            <ul className="list-disc pl-6 mb-6 space-y-2">
              <li>Customer information</li>
              <li>Recipe formats or custom plans</li>
              <li>Operational processes or platform data</li>
            </ul>
            <p className="mb-6">
              You must not disclose, share, or use Getchoma's materials outside the platform without permission.
            </p>

            <h3 className="text-xl font-semibold mt-8 mb-4">8. Intellectual Property</h3>
            <p className="mb-6">
              All branding, meal plans, recipes, and customer data belong to Getchoma. You may not reuse, sell, or distribute any Getchoma-owned content outside of the platform.
            </p>

            <h3 className="text-xl font-semibold mt-8 mb-4">9. Platform Removal</h3>
            <p className="mb-4">Getchoma reserves the right to remove you from the platform without prior notice in cases of:</p>
            <ul className="list-disc pl-6 mb-6 space-y-2">
              <li>Breach of hygiene or safety standards</li>
              <li>Repeated customer complaints or poor reviews</li>
              <li>Missed deliveries or order manipulation</li>
              <li>Violation of any part of this agreement</li>
            </ul>
            <p className="mb-6">
              You may also choose to deactivate your chef account at any time via your dashboard.
            </p>

            <h3 className="text-xl font-semibold mt-8 mb-4">10. Legal & Liability Notice</h3>
            <p className="mb-4">You agree to:</p>
            <ul className="list-disc pl-6 mb-6 space-y-2">
              <li>Follow all local food safety regulations and kitchen licensing rules</li>
              <li>Indemnify Getchoma against any claims resulting from negligence, misconduct, or non-compliance</li>
              <li>Take responsibility for your own workspace, equipment, and legal obligations</li>
            </ul>

            <h3 className="text-xl font-semibold mt-8 mb-4">11. Updates to This Agreement</h3>
            <p className="mb-6">
              Getchoma may update these terms from time to time. When changes are made, you will be notified via your dashboard or email. Continued use of the platform means you accept the updated terms.
            </p>

            <h3 className="text-xl font-semibold mt-8 mb-4">12. Acceptance</h3>
            <p className="mb-6">
              By onboarding and using the Getchoma Chef Platform, you confirm that you have read, understood, and agree to be bound by this Terms of Service.
            </p>
            <p className="mb-6 font-medium text-orange-600">
              If you do not agree with these terms, please exit the onboarding process.
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

export default TermsModal