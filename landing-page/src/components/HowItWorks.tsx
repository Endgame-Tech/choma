import React from 'react'
import { DevicePhoneMobileIcon, MagnifyingGlassIcon, CreditCardIcon, TruckIcon } from '@heroicons/react/24/outline'

const HowItWorks: React.FC = () => {
  const steps = [
    {
      step: '01',
      icon: DevicePhoneMobileIcon,
      title: 'Download & Register',
      description: 'Download the Choma app from App Store or Google Play. Create your account in seconds with your phone number or email.',
      image: 'https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1170&q=80',
      color: 'text-blue-600',
      bgColor: 'bg-blue-50'
    },
    {
      step: '02',
      icon: MagnifyingGlassIcon,
      title: 'Browse & Choose',
      description: 'Explore hundreds of restaurants and dishes. Filter by cuisine, price, rating, or delivery time to find exactly what you crave.',
      image: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1170&q=80',
      color: 'text-green-600',
      bgColor: 'bg-green-50'
    },
    {
      step: '03',
      icon: CreditCardIcon,
      title: 'Order & Pay',
      description: 'Add items to cart, customize your order, and pay securely with card, bank transfer, or cash on delivery.',
      image: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1170&q=80',
      color: 'text-purple-600',
      bgColor: 'bg-purple-50'
    },
    {
      step: '04',
      icon: TruckIcon,
      title: 'Track & Enjoy',
      description: 'Track your order in real-time from preparation to delivery. Get notified when your delicious meal arrives at your doorstep.',
      image: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ca4b?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1181&q=80',
      color: 'text-orange-600',
      bgColor: 'bg-orange-50'
    }
  ]

  return (
    <section className="section-padding bg-white">
      <div className="container-width">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center px-4 py-2 bg-primary-100 text-primary-700 rounded-full text-sm font-medium mb-4">
            🍽️ Simple Process
          </div>
          <h2 className="text-4xl lg:text-5xl font-heading font-bold text-gray-900 mb-6">
            How Choma
            <span className="block text-primary-600">Works</span>
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Getting your favorite meal delivered is as easy as 1-2-3-4. 
            Follow these simple steps and enjoy restaurant-quality food at home.
          </p>
        </div>

        {/* Steps */}
        <div className="space-y-24">
          {steps.map((step, index) => (
            <div key={index} className={`grid grid-cols-1 lg:grid-cols-2 gap-12 items-center ${
              index % 2 === 1 ? 'lg:grid-flow-col-dense' : ''
            }`}>
              {/* Content */}
              <div className={`${index % 2 === 1 ? 'lg:col-start-2' : ''}`}>
                <div className="flex items-center mb-6">
                  <div className={`inline-flex items-center justify-center w-16 h-16 ${step.bgColor} rounded-2xl mr-4`}>
                    <step.icon className={`w-8 h-8 ${step.color}`} />
                  </div>
                  <div className={`text-6xl font-bold ${step.color} opacity-20`}>
                    {step.step}
                  </div>
                </div>
                
                <h3 className="text-3xl font-heading font-bold text-gray-900 mb-4">
                  {step.title}
                </h3>
                
                <p className="text-lg text-gray-600 mb-8 leading-relaxed">
                  {step.description}
                </p>

                {/* Progress indicator */}
                <div className="flex items-center space-x-2">
                  {steps.map((_, stepIndex) => (
                    <div 
                      key={stepIndex}
                      className={`w-3 h-3 rounded-full transition-colors ${
                        stepIndex <= index ? step.color.replace('text-', 'bg-') : 'bg-gray-200'
                      }`}
                    />
                  ))}
                  <span className="text-sm text-gray-500 ml-4">
                    Step {index + 1} of {steps.length}
                  </span>
                </div>
              </div>

              {/* Image */}
              <div className={`relative ${index % 2 === 1 ? 'lg:col-start-1' : ''}`}>
                <div className="relative z-10">
                  <img 
                    src={step.image}
                    alt={step.title}
                    className="rounded-2xl shadow-2xl w-full max-w-lg mx-auto"
                  />
                  
                  {/* Floating step number */}
                  <div className={`absolute -top-4 -left-4 w-16 h-16 ${step.color.replace('text-', 'bg-')} rounded-2xl flex items-center justify-center shadow-lg`}>
                    <span className="text-white font-bold text-xl">{index + 1}</span>
                  </div>

                  {/* Additional floating elements */}
                  {index === 0 && (
                    <div className="absolute -bottom-4 -right-4 bg-white rounded-xl p-4 shadow-lg">
                      <div className="flex items-center space-x-2">
                        <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                        <span className="text-sm font-medium text-gray-800">App Available</span>
                      </div>
                    </div>
                  )}

                  {index === 1 && (
                    <div className="absolute -top-4 -right-4 bg-white rounded-xl p-4 shadow-lg">
                      <div className="text-sm font-bold text-gray-800">500+</div>
                      <div className="text-xs text-gray-600">Restaurants</div>
                    </div>
                  )}

                  {index === 2 && (
                    <div className="absolute -bottom-4 -left-4 bg-white rounded-xl p-4 shadow-lg">
                      <div className="flex items-center space-x-2">
                        <span className="text-lg">🔒</span>
                        <span className="text-sm font-medium text-gray-800">Secure Payment</span>
                      </div>
                    </div>
                  )}

                  {index === 3 && (
                    <div className="absolute -top-4 -right-4 bg-white rounded-xl p-4 shadow-lg">
                      <div className="text-sm font-bold text-gray-800">&lt; 30min</div>
                      <div className="text-xs text-gray-600">Delivery Time</div>
                    </div>
                  )}
                </div>

                {/* Background decoration */}
                <div className="absolute inset-0 -z-10">
                  <div className={`absolute top-10 right-10 w-40 h-40 ${step.color.replace('text-', 'bg-').replace('600', '100')} rounded-full blur-3xl opacity-50`}></div>
                  <div className={`absolute bottom-10 left-10 w-32 h-32 ${step.color.replace('text-', 'bg-').replace('600', '200')} rounded-full blur-2xl opacity-30`}></div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* CTA Section */}
        <div className="mt-24 text-center">
          <div className="bg-gradient-to-r from-primary-50 to-secondary-50 rounded-3xl p-12">
            <h3 className="text-3xl font-heading font-bold text-gray-900 mb-4">
              Ready to Get Started?
            </h3>
            <p className="text-lg text-gray-600 mb-8 max-w-2xl mx-auto">
              Join thousands of satisfied customers who enjoy delicious meals delivered fast. 
              Download the Choma app today and get 20% off your first order.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button className="btn-primary text-lg px-8 py-4">
                Download App Now
              </button>
              <button className="btn-outline border-gray-300 text-gray-700 hover:bg-gray-700 text-lg px-8 py-4">
                Watch Demo Video
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

export default HowItWorks