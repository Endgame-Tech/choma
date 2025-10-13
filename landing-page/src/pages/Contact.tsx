import React, { useState } from 'react'
import { Star } from 'phosphor-react'

const Contact: React.FC = () => {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    message: ''
  })

  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    // Simulate form submission
    setTimeout(() => {
      setIsSubmitting(false)
      // Reset form or show success message
      alert('Thank you for your message! We\'ll get back to you within 24 hours.')
      setFormData({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        message: ''
      })
    }, 2000)
  }

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      {/* Main Container */}
      <div className="bg-white rounded-3xl shadow-2xl overflow-hidden max-w-5xl w-full grid grid-cols-1 lg:grid-cols-2 min-h-[600px]">

        {/* Left Side - Contact Form */}
        <div className="p-8 lg:p-12">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-6">
              <div className="w-8 h-8 bg-choma-black rounded-full flex items-center justify-center">
                <span className="text-white text-xs">✱</span>
              </div>
              <span className="text-choma-black font-semibold">Choma</span>
            </div>

            <h1 className="text-3xl lg:text-4xl font-bold text-choma-black mb-4">
              We'd love to help
            </h1>

            <p className="text-choma-black/70 text-base lg:text-lg leading-relaxed">
              We're a full service agency with experts ready to help. We'll get in touch within 24 hours.
            </p>
          </div>

          {/* Contact Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Name Fields */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-choma-black/80 mb-2">
                  First name
                </label>
                <input
                  type="text"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleInputChange}
                  placeholder="First name"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-choma-orange/50 focus:border-choma-orange transition-colors"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-choma-black/80 mb-2">
                  Last name
                </label>
                <input
                  type="text"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleInputChange}
                  placeholder="Last name"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-choma-orange/50 focus:border-choma-orange transition-colors"
                  required
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-choma-black/80 mb-2">
                Email
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                placeholder="you@company.com"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-choma-orange/50 focus:border-choma-orange transition-colors"
                required
              />
            </div>

            {/* Phone */}
            <div>
              <label className="block text-sm font-medium text-choma-black/80 mb-2">
                Phone number
              </label>
              <div className="flex">
                <select aria-label="Country code" className="px-3 py-3 border border-gray-300 rounded-l-lg bg-white text-choma-black font-medium focus:outline-none focus:ring-2 focus:ring-choma-orange/50 focus:border-choma-orange">
                  <option value="+234">NG</option>
                  <option value="+1">US</option>
                </select>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  placeholder="+1 (555) 000-0000"
                  className="flex-1 px-4 py-3 border border-l-0 border-gray-300 rounded-r-lg focus:outline-none focus:ring-2 focus:ring-choma-orange/50 focus:border-choma-orange transition-colors"
                />
              </div>
            </div>

            {/* Message */}
            <div>
              <label className="block text-sm font-medium text-choma-black/80 mb-2">
                Message
              </label>
              <textarea
                name="message"
                value={formData.message}
                onChange={handleInputChange}
                rows={4}
                placeholder="Leave us a message..."
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-choma-orange/50 focus:border-choma-orange transition-colors resize-none"
                required
              ></textarea>
            </div>

            {/* Privacy Policy */}
            <div className="flex items-start gap-3">
              <input
                type="checkbox"
                id="privacy"
                className="mt-1 h-4 w-4 text-choma-orange border-gray-300 rounded focus:ring-choma-orange/50"
                required
              />
              <label htmlFor="privacy" className="text-sm text-choma-black/70">
                You agree to our friendly{' '}
                <a href="#" className="text-choma-orange underline hover:text-choma-brown">
                  privacy policy
                </a>
                .
              </label>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-choma-black hover:bg-choma-brown text-white font-semibold py-4 px-6 rounded-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Sending...' : 'Send message'}
            </button>
          </form>
        </div>

        {/* Right Side - Abstract Design */}
        <div className="relative bg-gradient-to-br from-purple-900 via-purple-800 to-orange-500 overflow-hidden">
          {/* Grid Pattern Background */}
          <div className="absolute inset-0 opacity-20">
            <div
              className="w-full h-full"
              style={{
                backgroundImage: `
                  linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
                  linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)
                `,
                backgroundSize: '40px 40px'
              }}
            />
          </div>

          {/* Abstract Curved Elements */}
          <div className="absolute inset-0">
            <svg
              className="absolute top-20 right-10 w-80 h-80 opacity-80"
              viewBox="0 0 400 400"
              fill="none"
            >
              <path
                d="M50 200C50 200 100 100 200 150C300 200 350 100 350 200C350 300 250 350 200 300C150 250 50 300 50 200Z"
                fill="url(#gradient1)"
              />
              <path
                d="M100 300C100 300 150 200 250 250C350 300 400 200 400 300C400 400 300 450 250 400C200 350 100 400 100 300Z"
                fill="url(#gradient2)"
              />
              <defs>
                <linearGradient id="gradient1" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="rgba(255,255,255,0.3)" />
                  <stop offset="100%" stopColor="rgba(255,255,255,0.1)" />
                </linearGradient>
                <linearGradient id="gradient2" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="rgba(255,255,255,0.2)" />
                  <stop offset="100%" stopColor="rgba(255,255,255,0.05)" />
                </linearGradient>
              </defs>
            </svg>
          </div>

          {/* Testimonial */}
          <div className="absolute bottom-8 left-8 right-8">
            <div className="bg-black/40 backdrop-blur-sm rounded-2xl p-6 text-white">
              {/* Stars */}
              <div className="flex gap-1 mb-4">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} size={16} className="text-yellow-400" weight="fill" />
                ))}
              </div>

              {/* Testimonial Text */}
              <p className="text-sm leading-relaxed mb-4">
                Choma is the real deal! We've worked with a dozen agencies that
                simply don't deliver. Working with experienced and knowledgeable
                professionals at the helm is a breath of fresh air.
              </p>

              {/* Author */}
              <div className="text-sm">
                <p className="font-semibold">— Ellie Simpson</p>
                <p className="text-white/70">Head of Design, Sisyphus Labs</p>
              </div>
            </div>

            {/* Navigation Arrows */}
            <div className="flex gap-2 mt-4 justify-end">
              <button
                type="button"
                className="bg-white/20 backdrop-blur-sm rounded-full p-3 hover:bg-white/30 transition-colors"
                aria-label="Previous testimonial"
              >
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <button
                type="button"
                className="bg-white/20 backdrop-blur-sm rounded-full p-3 hover:bg-white/30 transition-colors"
                aria-label="Next testimonial"
              >
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Contact