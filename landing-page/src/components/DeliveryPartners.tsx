import React from 'react'
import { TruckIcon, ClockIcon, CurrencyDollarIcon } from '@heroicons/react/24/outline'

const DeliveryPartners: React.FC = () => {
  return (
    <section className="section-padding bg-primary-50">
      <div className="container-width">
        <div className="text-center mb-16">
          <h2 className="text-4xl lg:text-5xl font-heading font-bold text-gray-900 mb-6">
            Become a Delivery
            <span className="block text-primary-600">Partner</span>
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Join our fleet of delivery partners and earn money on your schedule. 
            Flexible hours, competitive rates, and weekly payments.
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
          <div className="text-center p-6">
            <TruckIcon className="w-12 h-12 text-primary-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">Flexible Schedule</h3>
            <p className="text-gray-600">Work when you want, where you want</p>
          </div>
          <div className="text-center p-6">
            <CurrencyDollarIcon className="w-12 h-12 text-primary-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">Great Earnings</h3>
            <p className="text-gray-600">Earn up to ₦5,000 per day</p>
          </div>
          <div className="text-center p-6">
            <ClockIcon className="w-12 h-12 text-primary-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">Weekly Payments</h3>
            <p className="text-gray-600">Get paid every week, on time</p>
          </div>
        </div>
        
        <div className="text-center">
          <button className="btn-primary text-lg px-8 py-4">
            Join Our Fleet
          </button>
        </div>
      </div>
    </section>
  )
}

export default DeliveryPartners