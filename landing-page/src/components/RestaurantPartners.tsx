import React from 'react'
import { 
  ChartBarIcon, 
  UserGroupIcon, 
  CurrencyDollarIcon, 
  ClockIcon,
  ArrowRightIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline'

const RestaurantPartners: React.FC = () => {
  const benefits = [
    {
      icon: ChartBarIcon,
      title: 'Boost Your Revenue',
      description: 'Increase your sales by up to 40% with our wide customer base and smart marketing tools.',
      stat: '+40% Revenue'
    },
    {
      icon: UserGroupIcon,
      title: 'Reach More Customers',
      description: 'Connect with thousands of hungry customers in your area and beyond.',
      stat: '50K+ Users'
    },
    {
      icon: CurrencyDollarIcon,
      title: 'Low Commission',
      description: 'Keep more of your earnings with our competitive commission rates.',
      stat: 'From 12%'
    },
    {
      icon: ClockIcon,
      title: 'Quick Setup',
      description: 'Get your restaurant online in 24 hours with our streamlined onboarding process.',
      stat: '24hr Setup'
    }
  ]

  const features = [
    'Real-time order management dashboard',
    'Detailed analytics and insights',
    'Marketing and promotional tools',
    'Customer feedback system',
    'Flexible menu management',
    'Secure payment processing',
    'Dedicated account manager',
    '24/7 technical support'
  ]

  const partnerLogos = [
    { name: 'Tasty Bites', category: 'Fast Food' },
    { name: 'Mama Put', category: 'Local Cuisine' },
    { name: 'Pizza Corner', category: 'Italian' },
    { name: 'Suya Spot', category: 'Grills' },
    { name: 'Rice & Beans', category: 'Nigerian' },
    { name: 'Chicken Republic', category: 'Fast Food' }
  ]

  return (
    <section className="section-padding bg-gray-900 text-white relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="food-pattern w-full h-full"></div>
      </div>
      
      <div className="container-width relative z-10">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center px-4 py-2 bg-white/10 backdrop-blur-sm text-white rounded-full text-sm font-medium mb-4">
            🤝 Partner With Us
          </div>
          <h2 className="text-4xl lg:text-5xl font-heading font-bold mb-6">
            Grow Your Restaurant
            <span className="block text-secondary-400">Business With Choma</span>
          </h2>
          <p className="text-xl text-gray-300 max-w-3xl mx-auto">
            Join hundreds of successful restaurants that have transformed their business 
            with our delivery platform. Reach more customers, increase revenue, and grow faster.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center mb-20">
          {/* Benefits */}
          <div>
            <h3 className="text-3xl font-heading font-bold mb-8">
              Why Restaurants Choose Choma
            </h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-8">
              {benefits.map((benefit, index) => (
                <div key={index} className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10 hover:bg-white/10 transition-colors group">
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-12 h-12 bg-secondary-400/20 rounded-xl flex items-center justify-center group-hover:bg-secondary-400/30 transition-colors">
                      <benefit.icon className="w-6 h-6 text-secondary-400" />
                    </div>
                    <span className="text-secondary-400 font-bold text-sm">{benefit.stat}</span>
                  </div>
                  <h4 className="text-lg font-semibold mb-2">{benefit.title}</h4>
                  <p className="text-gray-300 text-sm">{benefit.description}</p>
                </div>
              ))}
            </div>

            <div className="space-y-4 mb-8">
              <h4 className="text-xl font-semibold mb-4">What You Get:</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {features.map((feature, index) => (
                  <div key={index} className="flex items-center space-x-3">
                    <CheckCircleIcon className="w-5 h-5 text-secondary-400 flex-shrink-0" />
                    <span className="text-gray-300 text-sm">{feature}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4">
              <button className="btn-secondary flex items-center justify-center space-x-2">
                <span>Join as Partner</span>
                <ArrowRightIcon className="w-4 h-4" />
              </button>
              <button className="btn-outline border-white/30 text-white hover:bg-white hover:text-gray-900">
                Learn More
              </button>
            </div>
          </div>

          {/* Image */}
          <div className="relative">
            <img 
              src="https://images.unsplash.com/photo-1600565193348-f74bd3c7ccdf?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1170&q=80"
              alt="Restaurant Kitchen"
              className="rounded-2xl shadow-2xl w-full"
            />
            
            {/* Floating stats */}
            <div className="absolute -top-4 -left-4 bg-white rounded-xl p-4 shadow-lg">
              <div className="text-2xl font-bold text-gray-900">500+</div>
              <div className="text-sm text-gray-600">Partner Restaurants</div>
            </div>
            
            <div className="absolute -bottom-4 -right-4 bg-secondary-400 text-gray-900 rounded-xl p-4 shadow-lg">
              <div className="text-2xl font-bold">₦2M+</div>
              <div className="text-sm">Monthly Revenue</div>
            </div>
          </div>
        </div>

        {/* Partner Logos */}
        <div className="mb-16">
          <h3 className="text-2xl font-heading font-bold text-center mb-8">
            Trusted by Leading Restaurants
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-8">
            {partnerLogos.map((partner, index) => (
              <div key={index} className="text-center">
                <div className="w-20 h-20 bg-white/10 backdrop-blur-sm rounded-2xl flex items-center justify-center mx-auto mb-3 hover:bg-white/20 transition-colors">
                  <span className="text-2xl font-bold text-white">{partner.name.charAt(0)}</span>
                </div>
                <div className="text-sm font-medium text-white">{partner.name}</div>
                <div className="text-xs text-gray-400">{partner.category}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Success Story */}
        <div className="bg-white/5 backdrop-blur-sm rounded-3xl p-8 lg:p-12 border border-white/10">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-center">
            <div className="lg:col-span-2">
              <div className="flex items-center mb-4">
                <img 
                  src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=687&q=80"
                  alt="Restaurant Owner"
                  className="w-16 h-16 rounded-full mr-4"
                />
                <div>
                  <div className="font-semibold text-white">Chef Ibrahim</div>
                  <div className="text-gray-400 text-sm">Owner, Mama Put Restaurant</div>
                </div>
              </div>
              <blockquote className="text-lg italic text-gray-300 mb-4">
                "Since partnering with Choma, our revenue has increased by 45%. The platform is easy to use, 
                and their customer support is excellent. We now reach customers we never could before."
              </blockquote>
              <div className="flex items-center space-x-6">
                <div>
                  <div className="text-2xl font-bold text-secondary-400">45%</div>
                  <div className="text-sm text-gray-400">Revenue Increase</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-secondary-400">300+</div>
                  <div className="text-sm text-gray-400">New Customers</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-secondary-400">4.8★</div>
                  <div className="text-sm text-gray-400">Rating</div>
                </div>
              </div>
            </div>
            <div className="text-center lg:text-right">
              <button className="btn-secondary">
                Read Full Story
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

export default RestaurantPartners