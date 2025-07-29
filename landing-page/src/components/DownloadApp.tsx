import React from 'react'
import { ArrowRightIcon, DevicePhoneMobileIcon } from '@heroicons/react/24/outline'

const DownloadApp: React.FC = () => {
  return (
    <section className="section-padding gradient-bg hero-pattern">
      <div className="container-width">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div className="text-white">
            <h2 className="text-4xl lg:text-5xl font-heading font-bold mb-6">
              Get the Choma App
              <span className="block text-secondary-400">Today</span>
            </h2>
            <p className="text-xl text-white/90 mb-8">
              Download our mobile app for the best ordering experience. 
              Get exclusive deals, faster checkout, and real-time tracking.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 mb-8">
              <img 
                src="https://upload.wikimedia.org/wikipedia/commons/7/78/Google_Play_Store_badge_EN.svg" 
                alt="Get it on Google Play" 
                className="h-14 hover:scale-105 transition-transform cursor-pointer"
              />
              <img 
                src="https://upload.wikimedia.org/wikipedia/commons/3/3c/Download_on_the_App_Store_Badge.svg" 
                alt="Download on the App Store" 
                className="h-14 hover:scale-105 transition-transform cursor-pointer"
              />
            </div>
            
            <div className="flex items-center space-x-4 text-white/80">
              <div className="flex items-center space-x-2">
                <span className="text-3xl">⭐</span>
                <div>
                  <div className="font-bold">4.9/5</div>
                  <div className="text-sm">App Store Rating</div>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <DevicePhoneMobileIcon className="w-8 h-8" />
                <div>
                  <div className="font-bold">100K+</div>
                  <div className="text-sm">Downloads</div>
                </div>
              </div>
            </div>
          </div>
          
          <div className="relative">
            <img 
              src="https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?ixlib=rb-4.0.3&auto=format&fit=crop&w=1170&q=80"
              alt="Choma Mobile App"
              className="rounded-2xl shadow-2xl w-full max-w-md mx-auto animate-float"
            />
            <div className="absolute -top-4 -right-4 bg-secondary-400 text-gray-900 rounded-xl p-3 shadow-lg">
              <div className="text-sm font-bold">20% OFF</div>
              <div className="text-xs">First Order</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

export default DownloadApp