import React from 'react'
import { 
  ClockIcon, 
  TruckIcon, 
  StarIcon, 
  ShieldCheckIcon,
  CurrencyDollarIcon,
  DevicePhoneMobileIcon,
  GlobeAltIcon,
  HeartIcon,
  ArrowRightIcon
} from '@heroicons/react/24/outline'

const Features: React.FC = () => {
  const features = [
    {
      icon: ClockIcon,
      title: 'Lightning Fast Delivery',
      description: 'Get your favorite meals delivered in 30 minutes or less. We value your time as much as you do.',
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      stats: '< 30 mins'
    },
    {
      icon: StarIcon,
      title: 'Premium Quality',
      description: 'Every meal is prepared by certified chefs using fresh, high-quality ingredients sourced locally.',
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-50',
      stats: '4.9/5 Rating'
    },
    {
      icon: TruckIcon,
      title: 'Wide Coverage',
      description: 'We deliver across Lagos, Abuja, and Port Harcourt with plans to expand to more cities soon.',
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      stats: '3+ Cities'
    },
    {
      icon: ShieldCheckIcon,
      title: 'Safe & Secure',
      description: 'Your payments are protected with bank-level security. Order with confidence every time.',
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      stats: '100% Secure'
    },
    {
      icon: CurrencyDollarIcon,
      title: 'Affordable Prices',
      description: 'Enjoy restaurant-quality meals at pocket-friendly prices. No hidden charges, ever.',
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-50',
      stats: 'From ₦500'
    },
    {
      icon: DevicePhoneMobileIcon,
      title: 'Easy Ordering',
      description: 'Order with just a few taps on our user-friendly app. Track your delivery in real-time.',
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-50',
      stats: '3 Taps Only'
    },
    {
      icon: GlobeAltIcon,
      title: 'Local & International',
      description: 'From traditional Nigerian dishes to international cuisines, we have something for everyone.',
      color: 'text-rose-600',
      bgColor: 'bg-rose-50',
      stats: '200+ Dishes'
    },
    {
      icon: HeartIcon,
      title: '24/7 Support',
      description: 'Our customer support team is always ready to help you with any questions or concerns.',
      color: 'text-red-600',
      bgColor: 'bg-red-50',
      stats: 'Always Here'
    }
  ]

  return (
    <section className="section-padding bg-gray-50">
      <div className="container-width">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center px-4 py-2 bg-primary-100 text-primary-700 rounded-full text-sm font-medium mb-4">
            ✨ Why Choose Choma
          </div>
          <h2 className="text-4xl lg:text-5xl font-heading font-bold text-gray-900 mb-6">
            Features That Make Us
            <span className="block text-primary-600">Different</span>
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            We're not just another food delivery app. We're your trusted partner in bringing 
            authentic Nigerian flavors and international cuisines directly to your table.
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {features.map((feature, index) => (
            <div 
              key={index}
              className="bg-white rounded-2xl p-6 shadow-sm hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2 group"
            >
              {/* Icon */}
              <div className={`inline-flex items-center justify-center w-14 h-14 ${feature.bgColor} rounded-xl mb-4 group-hover:scale-110 transition-transform duration-300`}>
                <feature.icon className={`w-7 h-7 ${feature.color}`} />
              </div>

              {/* Content */}
              <div className="mb-4">
                <h3 className="text-xl font-heading font-semibold text-gray-900 mb-2">
                  {feature.title}
                </h3>
                <p className="text-gray-600 text-sm leading-relaxed">
                  {feature.description}
                </p>
              </div>

              {/* Stats */}
              <div className={`inline-flex items-center px-3 py-1 ${feature.bgColor} ${feature.color} rounded-full text-sm font-medium`}>
                {feature.stats}
              </div>
            </div>
          ))}
        </div>

        {/* CTA Section */}
        <div className="mt-16 text-center">
          <div className="bg-white rounded-2xl p-8 shadow-lg max-w-4xl mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
              <div className="text-left">
                <h3 className="text-3xl font-heading font-bold text-gray-900 mb-4">
                  Ready to Experience the Difference?
                </h3>
                <p className="text-gray-600 mb-6">
                  Join thousands of satisfied customers who trust Choma for their daily meals. 
                  Download our app and get your first order delivered with a special discount.
                </p>
                <div className="flex flex-col sm:flex-row gap-4">
                  <button className="btn-primary flex items-center justify-center space-x-2">
                    <span>Download App</span>
                    <ArrowRightIcon className="w-4 h-4" />
                  </button>
                  <button className="btn-outline border-gray-300 text-gray-700 hover:bg-gray-700">
                    Learn More
                  </button>
                </div>
              </div>
              <div className="relative">
                <img 
                  src="https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1170&q=80"
                  alt="Choma App Features"
                  className="rounded-xl shadow-lg w-full max-w-sm mx-auto"
                />
                <div className="absolute -top-4 -right-4 bg-primary-600 text-white rounded-lg p-3 shadow-lg">
                  <div className="text-sm font-bold">20% OFF</div>
                  <div className="text-xs">First Order</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

export default Features