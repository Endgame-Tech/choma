import React from 'react'

const Contact: React.FC = () => {
  return (
    <div className="pt-20 section-padding">
      <div className="container-width">
        <h1 className="text-4xl font-heading font-bold text-gray-900 mb-8">Contact Us</h1>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          <div>
            <h2 className="text-2xl font-semibold mb-4">Get in Touch</h2>
            <p className="text-gray-600 mb-6">
              Have questions? We'd love to hear from you. Send us a message and we'll respond as soon as possible.
            </p>
            <div className="space-y-4">
              <div>
                <strong>Phone:</strong> +234-800-CHOMA-NG
              </div>
              <div>
                <strong>Email:</strong> hello@choma.ng
              </div>
              <div>
                <strong>Address:</strong> Lagos, Abuja, Port Harcourt
              </div>
            </div>
          </div>
          <div>
            <form className="space-y-4">
              <input 
                type="text" 
                placeholder="Your Name"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-primary-500"
              />
              <input 
                type="email" 
                placeholder="Your Email"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-primary-500"
              />
              <textarea 
                rows={5}
                placeholder="Your Message"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-primary-500"
              ></textarea>
              <button className="btn-primary w-full">
                Send Message
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Contact