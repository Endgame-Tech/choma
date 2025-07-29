import React from 'react'
import { ArrowRightIcon, PlayIcon } from '@heroicons/react/24/outline'

const Hero: React.FC = () => {
  return (
    <section className="relative min-h-screen flex items-center gradient-bg hero-pattern overflow-hidden">
      {/* Background decorations */}
      <div className="absolute inset-0">
        <div className="absolute top-20 left-10 w-20 h-20 bg-white/10 rounded-full blur-xl"></div>
        <div className="absolute top-40 right-20 w-32 h-32 bg-white/5 rounded-full blur-2xl"></div>
        <div className="absolute bottom-40 left-20 w-24 h-24 bg-white/10 rounded-full blur-xl"></div>
      </div>

      <div className="container-width relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Content */}
          <div className="text-white">
            {/* Greeting Badge */}
            <div className="inline-flex items-center px-4 py-2 bg-white/20 backdrop-blur-sm rounded-full text-sm font-medium mb-6 animate-fade-in">
              <span className="mr-2">👋</span>
              You hungry? We got you!
            </div>

            <h1 className="text-4xl md:text-5xl lg:text-6xl font-heading font-bold leading-tight mb-6 animate-slide-up">
              Delicious Nigerian
              <span className="block text-secondary-400">Meals Delivered</span>
              <span className="block">To Your Doorstep</span>
            </h1>

            <p className="text-xl text-white/90 mb-8 animate-slide-up" style={{ animationDelay: '0.2s' }}>
              Experience the authentic taste of Nigeria with our carefully crafted meals. 
              From Jollof rice to Suya, we bring your favorite local dishes right to you 
              in under 30 minutes.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 mb-8 animate-slide-up" style={{ animationDelay: '0.4s' }}>
              <button className="btn-secondary text-lg px-8 py-4 flex items-center justify-center space-x-2">
                <span>Order Now</span>
                <ArrowRightIcon className="w-5 h-5" />
              </button>
              <button className="flex items-center space-x-3 text-white hover:text-secondary-400 transition-colors group">
                <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center group-hover:bg-white/30 transition-colors">
                  <PlayIcon className="w-5 h-5 ml-1" />
                </div>
                <span className="font-medium">Watch How It Works</span>
              </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-8 animate-slide-up" style={{ animationDelay: '0.6s' }}>
              <div>
                <div className="text-3xl font-bold text-secondary-400 mb-1">50K+</div>
                <div className="text-white/80 text-sm">Happy Customers</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-secondary-400 mb-1">500+</div>
                <div className="text-white/80 text-sm">Restaurant Partners</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-secondary-400 mb-1">30min</div>
                <div className="text-white/80 text-sm">Average Delivery</div>
              </div>
            </div>
          </div>

          {/* Hero Image/Illustration */}
          <div className="relative">
            <div className="relative z-10 animate-float">
              {/* Main food image placeholder */}
              <div className="relative">
                <img 
                  src="https://images.unsplash.com/photo-1585937421612-70a008356fbe?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1336&q=80"
                  alt="Delicious Nigerian Food"
                  className="rounded-2xl shadow-2xl w-full max-w-lg mx-auto"
                />
                
                {/* Floating elements */}
                <div className="absolute -top-4 -right-4 bg-white rounded-xl p-4 shadow-lg animate-bounce-slow">
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                    <span className="text-sm font-medium text-gray-800">30min delivery</span>
                  </div>
                </div>
                
                <div className="absolute -bottom-4 -left-4 bg-white rounded-xl p-4 shadow-lg animate-pulse-slow">
                  <div className="flex items-center space-x-2">
                    <span className="text-2xl">⭐</span>
                    <div>
                      <div className="text-sm font-bold text-gray-800">4.9/5</div>
                      <div className="text-xs text-gray-600">Customer Rating</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Background decoration */}
            <div className="absolute inset-0 -z-10">
              <div className="absolute top-10 left-10 w-40 h-40 bg-secondary-400/20 rounded-full blur-3xl"></div>
              <div className="absolute bottom-10 right-10 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
            </div>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 animate-bounce">
          <div className="w-6 h-10 border-2 border-white/50 rounded-full flex justify-center">
            <div className="w-1 h-3 bg-white/50 rounded-full mt-2 animate-pulse"></div>
          </div>
        </div>
      </div>

      {/* App Download Floating Bar */}
      <div className="absolute bottom-0 left-0 right-0 bg-white/10 backdrop-blur-md border-t border-white/20 p-4">
        <div className="container-width">
          <div className="flex flex-col sm:flex-row items-center justify-between">
            <div className="text-white mb-4 sm:mb-0">
              <div className="font-semibold">Download the Choma App</div>
              <div className="text-sm text-white/80">Get exclusive deals and faster ordering</div>
            </div>
            <div className="flex space-x-4">
              <img 
                src="https://upload.wikimedia.org/wikipedia/commons/7/78/Google_Play_Store_badge_EN.svg" 
                alt="Get it on Google Play" 
                className="h-12 hover:scale-105 transition-transform cursor-pointer"
              />
              <img 
                src="https://upload.wikimedia.org/wikipedia/commons/3/3c/Download_on_the_App_Store_Badge.svg" 
                alt="Download on the App Store" 
                className="h-12 hover:scale-105 transition-transform cursor-pointer"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

export default Hero