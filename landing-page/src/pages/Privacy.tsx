import React from 'react'

const Privacy: React.FC = () => {
  return (
    <div className="pt-20 section-padding bg-gray-50 min-h-screen">
      <div className="container-width">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h1 className="text-4xl font-heading font-bold text-gray-900 mb-4">Privacy Policy</h1>
          <p className="text-gray-600 mb-8">Last updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
          
          <div className="prose prose-lg max-w-none space-y-8">
            
            {/* Introduction */}
            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">1. Introduction</h2>
              <p className="text-gray-700 leading-relaxed">
                Welcome to Choma ("we," "our," or "us"). We are committed to protecting your privacy and personal information. 
                This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our 
                mobile application, website, and related services (collectively, the "Service"). By using our Service, you 
                consent to the data practices described in this policy.
              </p>
            </section>

            {/* Information We Collect */}
            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">2. Information We Collect</h2>
              
              <h3 className="text-xl font-medium text-gray-800 mb-3">2.1 Personal Information</h3>
              <p className="text-gray-700 mb-4">We collect information you provide directly to us, including:</p>
              <ul className="list-disc ml-6 space-y-2 text-gray-700">
                <li>Name, email address, and phone number</li>
                <li>Delivery address and location information</li>
                <li>Payment information (processed securely through Paystack)</li>
                <li>Dietary preferences and food allergies</li>
                <li>Account credentials (username, password)</li>
                <li>Profile pictures and preferences</li>
              </ul>

              <h3 className="text-xl font-medium text-gray-800 mb-3 mt-6">2.2 Usage Information</h3>
              <p className="text-gray-700 mb-4">We automatically collect certain information about your use of our Service:</p>
              <ul className="list-disc ml-6 space-y-2 text-gray-700">
                <li>Device information (type, operating system, unique device identifiers)</li>
                <li>App usage data and interactions</li>
                <li>IP address and general location information</li>
                <li>Order history and meal preferences</li>
                <li>Customer service interactions</li>
              </ul>

              <h3 className="text-xl font-medium text-gray-800 mb-3 mt-6">2.3 Location Information</h3>
              <p className="text-gray-700">
                With your permission, we collect precise location data to provide delivery services, 
                estimate delivery times, and enhance your experience. You can disable location services 
                through your device settings, though this may limit some features.
              </p>
            </section>

            {/* How We Use Information */}
            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">3. How We Use Your Information</h2>
              <p className="text-gray-700 mb-4">We use your information for the following purposes:</p>
              <ul className="list-disc ml-6 space-y-2 text-gray-700">
                <li>Process and fulfill your meal orders and subscriptions</li>
                <li>Coordinate delivery services and track orders</li>
                <li>Process payments and prevent fraud</li>
                <li>Personalize your meal recommendations</li>
                <li>Send order confirmations, updates, and delivery notifications</li>
                <li>Provide customer support and respond to inquiries</li>
                <li>Improve our services and develop new features</li>
                <li>Send promotional communications (with your consent)</li>
                <li>Comply with legal obligations and protect our rights</li>
                <li>Analyze usage patterns and app performance</li>
              </ul>
            </section>

            {/* Information Sharing */}
            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">4. Information Sharing and Disclosure</h2>
              <p className="text-gray-700 mb-4">We may share your information in the following circumstances:</p>
              
              <h3 className="text-xl font-medium text-gray-800 mb-3">4.1 Service Providers</h3>
              <ul className="list-disc ml-6 space-y-2 text-gray-700 mb-4">
                <li>Kitchen partners and chefs for meal preparation</li>
                <li>Delivery partners for order fulfillment</li>
                <li>Payment processors (Paystack) for transaction processing</li>
                <li>Cloud service providers for data storage and hosting</li>
                <li>Analytics providers for service improvement</li>
                <li>Customer support tools and communication platforms</li>
              </ul>

              <h3 className="text-xl font-medium text-gray-800 mb-3">4.2 Legal Requirements</h3>
              <p className="text-gray-700 mb-4">We may disclose your information if required by law or in response to:</p>
              <ul className="list-disc ml-6 space-y-2 text-gray-700">
                <li>Legal process or government requests</li>
                <li>Protection of our rights and property</li>
                <li>Public safety or law enforcement purposes</li>
                <li>Prevention of fraud or security threats</li>
              </ul>
            </section>

            {/* Data Security */}
            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">5. Data Security</h2>
              <p className="text-gray-700 mb-4">We implement comprehensive security measures to protect your information:</p>
              <ul className="list-disc ml-6 space-y-2 text-gray-700">
                <li>End-to-end encryption for sensitive data transmission</li>
                <li>Secure server infrastructure with regular security audits</li>
                <li>Two-factor authentication for account protection</li>
                <li>Regular security training for our team members</li>
                <li>Limited access to personal information on a need-to-know basis</li>
                <li>Secure payment processing through certified providers</li>
              </ul>
              <p className="text-gray-700 mt-4">
                While we strive to protect your information, no method of transmission over the internet 
                or electronic storage is 100% secure. We cannot guarantee absolute security.
              </p>
            </section>

            {/* Data Retention */}
            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">6. Data Retention</h2>
              <p className="text-gray-700">
                We retain your personal information for as long as necessary to provide our services, 
                comply with legal obligations, resolve disputes, and enforce our agreements. Typically:
              </p>
              <ul className="list-disc ml-6 space-y-2 text-gray-700 mt-4">
                <li>Account information: Retained while your account is active</li>
                <li>Order history: Retained for 7 years for tax and legal purposes</li>
                <li>Payment information: Not stored; processed securely by Paystack</li>
                <li>Marketing communications: Until you unsubscribe</li>
                <li>Support interactions: Retained for 3 years for quality assurance</li>
              </ul>
            </section>

            {/* Your Rights */}
            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">7. Your Rights and Choices</h2>
              <p className="text-gray-700 mb-4">You have the following rights regarding your personal information:</p>
              
              <h3 className="text-xl font-medium text-gray-800 mb-3">7.1 Access and Control</h3>
              <ul className="list-disc ml-6 space-y-2 text-gray-700">
                <li>Access and update your account information through the app</li>
                <li>Request a copy of your personal data</li>
                <li>Correct inaccurate or incomplete information</li>
                <li>Delete your account and associated data</li>
                <li>Export your data in a machine-readable format</li>
              </ul>

              <h3 className="text-xl font-medium text-gray-800 mb-3 mt-6">7.2 Communication Preferences</h3>
              <ul className="list-disc ml-6 space-y-2 text-gray-700">
                <li>Opt-out of promotional emails and notifications</li>
                <li>Manage push notification settings in the app</li>
                <li>Control location sharing permissions</li>
                <li>Adjust privacy settings for meal recommendations</li>
              </ul>

              <p className="text-gray-700 mt-4">
                To exercise these rights, please contact us at <a href="mailto:privacy@choma.ng" className="text-blue-600 hover:underline">privacy@choma.ng</a> 
                or through the app's support section. To delete your account, you can use our{' '}
                <a href="/delete-account" className="text-blue-600 hover:underline font-medium">account deletion form</a>.
              </p>
            </section>

            {/* Children's Privacy */}
            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">8. Children's Privacy</h2>
              <p className="text-gray-700">
                Our Service is not intended for children under 13 years of age. We do not knowingly collect 
                personal information from children under 13. If you are a parent or guardian and believe your 
                child has provided us with personal information, please contact us immediately. If we discover 
                we have collected personal information from a child under 13, we will delete it promptly.
              </p>
            </section>

            {/* International Transfers */}
            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">9. International Data Transfers</h2>
              <p className="text-gray-700">
                Your information may be transferred to and processed in countries other than Nigeria, 
                including the United States and European Union, where our service providers operate. 
                We ensure that such transfers comply with applicable data protection laws and implement 
                appropriate safeguards to protect your information.
              </p>
            </section>

            {/* Cookies and Tracking */}
            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">10. Cookies and Tracking Technologies</h2>
              <p className="text-gray-700 mb-4">We use various technologies to collect and store information, including:</p>
              <ul className="list-disc ml-6 space-y-2 text-gray-700">
                <li>Cookies for website functionality and preferences</li>
                <li>Local storage for app settings and offline functionality</li>
                <li>Analytics tools to understand usage patterns</li>
                <li>Push notification tokens for order updates</li>
                <li>Session tokens for secure authentication</li>
              </ul>
              <p className="text-gray-700 mt-4">
                You can control cookie settings through your browser, though this may affect functionality.
              </p>
            </section>

            {/* Third-Party Services */}
            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">11. Third-Party Services</h2>
              <p className="text-gray-700 mb-4">Our Service integrates with third-party services that have their own privacy policies:</p>
              <ul className="list-disc ml-6 space-y-2 text-gray-700">
                <li><strong>Paystack:</strong> Payment processing and fraud prevention</li>
                <li><strong>Google Maps:</strong> Location services and delivery routing</li>
                <li><strong>Firebase:</strong> Authentication and push notifications</li>
                <li><strong>App stores:</strong> Apple App Store and Google Play Store</li>
              </ul>
              <p className="text-gray-700 mt-4">
                We recommend reviewing the privacy policies of these third-party providers.
              </p>
            </section>

            {/* Updates to Policy */}
            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">12. Changes to This Privacy Policy</h2>
              <p className="text-gray-700">
                We may update this Privacy Policy from time to time to reflect changes in our practices, 
                technology, legal requirements, or other factors. We will notify you of material changes 
                through the app, email, or by posting the updated policy on our website. Your continued 
                use of our Service after such changes constitutes acceptance of the updated policy.
              </p>
            </section>

            {/* Contact Information */}
            <section className="bg-gray-50 p-6 rounded-lg">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">13. Contact Us</h2>
              <p className="text-gray-700 mb-4">
                If you have any questions, concerns, or requests regarding this Privacy Policy or our 
                data practices, please contact us:
              </p>
              <div className="space-y-2 text-gray-700">
                <p><strong>Email:</strong> <a href="mailto:privacy@choma.ng" className="text-blue-600 hover:underline">privacy@choma.ng</a></p>
                <p><strong>Support:</strong> <a href="mailto:support@choma.ng" className="text-blue-600 hover:underline">support@choma.ng</a></p>
                <p><strong>Mailing Address:</strong></p>
                <p className="ml-4">
                  Choma Food Services<br />
                  Privacy Department<br />
                  Lagos, Nigeria
                </p>
              </div>
              <p className="text-gray-600 mt-4 text-sm">
                We are committed to resolving any privacy concerns promptly and transparently.
              </p>
            </section>

          </div>
        </div>
      </div>
    </div>
  )
}

export default Privacy