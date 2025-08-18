import React from 'react'
import googleplayStoreLogo from '../assets/images/googleplayStoreLogo.svg'
import appleLogo from '../assets/images/appleLogo.svg'

const DownloadApp: React.FC = () => {
  return (
    <div className="flex flex-col sm:flex-row gap-6">
      {/* Google Play Button */}
      <button className="bg-choma-brown hover:bg-choma-brown/90 text-white rounded-full px-6 py-3 flex items-center gap-3 transition-all duration-300 hover:scale-105 shadow-lg">
        <img src={googleplayStoreLogo} alt="Google Play" className="w-6 h-6" />
        <div className="text-left">
          <div className="text-xs opacity-90">Download on</div>
          <div className="text-sm font-semibold">Google Play</div>
        </div>
      </button>

      {/* Apple Store Button */}
      <button className="bg-choma-brown hover:bg-choma-brown/90 text-white rounded-full px-6 py-3 flex items-center gap-3 transition-all duration-300 hover:scale-105 shadow-lg">
        <img src={appleLogo} alt="Apple Store" className="w-6 h-6" />
        <div className="text-left">
          <div className="text-xs opacity-90">Download on</div>
          <div className="text-sm font-semibold">Apple Store</div>
        </div>
      </button>
    </div>
  )
}

export default DownloadApp