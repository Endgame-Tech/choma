import React, { useEffect, useRef, useState } from 'react'
import { gsap } from 'gsap'
import {
  Phone,
  EnvelopeSimple,
  MapPin,
  Clock,
  Star,
  PaperPlaneTilt,
  CheckCircle,
  Users,
  ChatCircle
} from 'phosphor-react'
import backgroundSvg from '../assets/images/background.svg'
import happyUser from '../assets/images/happy-user.jpg'

const Contact: React.FC = () => {
  const titleRef = useRef<HTMLHeadingElement>(null)
  const subtitleRef = useRef<HTMLParagraphElement>(null)

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    message: ''
  })

  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    // Animation for hero section
    if (titleRef.current) {
      gsap.set(titleRef.current, { opacity: 0, y: 100 })
    }
    if (subtitleRef.current) {
      gsap.set(subtitleRef.current, { opacity: 0, y: 50 })
    }

    const tl = gsap.timeline()

    tl.to(titleRef.current, {
      y: 0,
      opacity: 1,
      duration: 1.2,
      ease: "power3.out"
    })
      .to(subtitleRef.current, {
        y: 0,
        opacity: 1,
        duration: 0.8,
        ease: "power2.out"
      }, "-=0.5")

    // Fallback
    setTimeout(() => {
      if (titleRef.current) {
        gsap.set(titleRef.current, { opacity: 1, y: 0 })
      }
      if (subtitleRef.current) {
        gsap.set(subtitleRef.current, { opacity: 1, y: 0 })
      }
    }, 3000)
  }, [])

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
    <div className="relative">
      <div className='h-20 md:h-32'></div>

      {/* Background pattern */}
      <div
        className="fixed inset-0 pointer-events-none z-[-10]"
        style={{
          backgroundImage: `url(${backgroundSvg})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          opacity: 0.1
        }}
      ></div>

      {/* Hero Section */}
      <section className="py-10 relative">
        <div className="container-width">
          <div className="text-center mb-16">
            <h1 ref={titleRef} className='text-choma-brown text-center text-6xl lg:text-8xl font-medium tracking-tighter relative'>
              Get in <span className='font-extrabold text-choma-orange'>Touch</span>
            </h1>

            <p ref={subtitleRef} className='text-choma-black px-[12%] md:px-[25%] lg:px-[30%] text-center text-xl lg:text-3xl mt-4 tracking-tighter relative z-20 leading-tight'>
              We're a <span className='text-choma-brown font-bold'>full service agency</span> with experts ready to help. We'll get in touch within <span className='text-choma-orange font-extrabold'>24 hours</span>.
            </p>
          </div>

          {/* Main Contact Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-start">
            {/* Contact Form */}
            <div className="bg-white rounded-3xl p-8 shadow-xl hover:shadow-2xl transition-all duration-300">
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Name Fields */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-choma-black mb-2">
                      First name
                    </label>
                    <input
                      type="text"
                      name="firstName"
                      value={formData.firstName}
                      onChange={handleInputChange}
                      placeholder="First name"
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-choma-orange transition-colors bg-gray-50 focus:bg-white"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-choma-black mb-2">
                      Last name
                    </label>
                    <input
                      type="text"
                      name="lastName"
                      value={formData.lastName}
                      onChange={handleInputChange}
                      placeholder="Last name"
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-choma-orange transition-colors bg-gray-50 focus:bg-white"
                      required
                    />
                  </div>
                </div>

                {/* Email */}
                <div>
                  <label className="block text-sm font-medium text-choma-black mb-2">
                    Email
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    placeholder="you@company.com"
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-choma-orange transition-colors bg-gray-50 focus:bg-white"
                    required
                  />
                </div>

                {/* Phone */}
                <div>
                  <label className="block text-sm font-medium text-choma-black mb-2">
                    Phone number
                  </label>
                  <div className="flex">
                    <select className="px-3 py-3 border-2 border-gray-200 rounded-l-xl bg-gray-50 text-choma-black font-medium focus:outline-none focus:border-choma-orange">
                      <option value="+234">🇳🇬 +234</option>
                    </select>
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleInputChange}
                      placeholder="(555) 000-0000"
                      className="flex-1 px-4 py-3 border-2 border-l-0 border-gray-200 rounded-r-xl focus:outline-none focus:border-choma-orange transition-colors bg-gray-50 focus:bg-white"
                    />
                  </div>
                </div>

                {/* Message */}
                <div>
                  <label className="block text-sm font-medium text-choma-black mb-2">
                    Message
                  </label>
                  <textarea
                    name="message"
                    value={formData.message}
                    onChange={handleInputChange}
                    rows={4}
                    placeholder="Leave us a message..."
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-choma-orange transition-colors bg-gray-50 focus:bg-white resize-none"
                    required
                  ></textarea>
                </div>

                {/* Privacy Policy */}
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    id="privacy"
                    className="mt-1 h-4 w-4 text-choma-orange border-gray-300 rounded focus:ring-choma-orange"
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
                  className="w-full bg-choma-black hover:bg-choma-brown text-white font-bold py-4 px-6 rounded-xl transition-all duration-300 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      Sending...
                    </>
                  ) : (
                    <>
                      Send message
                      <PaperPlaneTilt size={20} weight="fill" />
                    </>
                  )}
                </button>
              </form>
            </div>

            {/* Image and Testimonial */}
            <div className="relative">
              {/* Main Image */}
              <div className="relative overflow-hidden rounded-3xl mb-8">
                <img
                  src={happyUser}
                  alt="Happy Choma Customer"
                  className="w-full h-[500px] object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-choma-black/60 via-transparent to-transparent"></div>

                {/* Floating Elements */}
                <div className="absolute top-6 right-6">
                  <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-4 shadow-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Star size={16} className="text-yellow-500" weight="fill" />
                      <Star size={16} className="text-yellow-500" weight="fill" />
                      <Star size={16} className="text-yellow-500" weight="fill" />
                      <Star size={16} className="text-yellow-500" weight="fill" />
                      <Star size={16} className="text-yellow-500" weight="fill" />
                    </div>
                    <p className="text-xs text-choma-black font-medium">
                      Choma is the real deal! We've worked with a dozen agencies that simply don't deliver. Working with experienced and knowledgeable professionals at the helm is a breath of fresh air.
                    </p>
                    <div className="mt-3 flex items-center gap-2">
                      <div className="w-6 h-6 bg-choma-orange rounded-full"></div>
                      <div>
                        <p className="text-xs font-bold text-choma-black">Ellie Simpson</p>
                        <p className="text-xs text-choma-black/60">Head of Design, Sisyphus Labs</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Navigation Arrows */}
                <div className="absolute bottom-6 right-6 flex gap-2">
                  <button type="button" aria-label="Previous slide" title="Previous slide" className="bg-white/20 backdrop-blur-sm rounded-full p-3 hover:bg-white/30 transition-colors">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                  <button type="button" aria-label="Next slide" title="Next slide" className="bg-white/20 backdrop-blur-sm rounded-full p-3 hover:bg-white/30 transition-colors">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>


      </section>

      <div className='md:h-32'></div>

      {/* Contact Information Section */}
      <section className="py-20 relative">
        <div className="container-width relative z-10">
          <div className='text-center mb-16'>
            <h2 className='text-choma-white text-center text-3xl sm:text-4xl md:text-6xl font-bold tracking-tighter mb-6'>
              Other Ways to <span className='text-choma-orange'>Reach Us</span>
            </h2>
            <p className='text-choma-white/90 text-lg md:text-xl max-w-3xl mx-auto leading-relaxed'>
              Choose the method that works best for you. We're here to help with any questions about our services.
            </p>
          </div>

          {/* Contact Methods Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {/* Phone Support */}
            <div className="bg-white rounded-3xl p-8 text-center hover:scale-105 transition-all duration-300 cursor-pointer shadow-lg hover:shadow-xl">
              <div className="bg-choma-orange rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-6">
                <Phone size={32} className="text-white" weight="fill" />
              </div>
              <h3 className="text-choma-black text-xl font-bold mb-3">Call Us</h3>
              <p className="text-choma-black/80 mb-4">Speak directly with our customer support team</p>
              <p className="text-choma-orange font-bold text-lg">+234 800 CHOMA (24662)</p>
              <div className="bg-choma-orange/20 text-choma-brown px-4 py-2 rounded-full inline-block font-semibold text-sm mt-3">
                24/7 Support
              </div>
            </div>

            {/* Email Support */}
            <div className="bg-white rounded-3xl p-8 text-center hover:scale-105 transition-all duration-300 cursor-pointer shadow-lg hover:shadow-xl">
              <div className="bg-choma-brown rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-6">
                <EnvelopeSimple size={32} className="text-white" weight="fill" />
              </div>
              <h3 className="text-choma-black text-xl font-bold mb-3">Email Us</h3>
              <p className="text-choma-black/80 mb-4">Send us an email for detailed inquiries</p>
              <p className="text-choma-brown font-bold text-lg">support@choma.ng</p>
              <div className="bg-choma-brown/20 text-choma-brown px-4 py-2 rounded-full inline-block font-semibold text-sm mt-3">
                24hr Response
              </div>
            </div>

            {/* Live Chat */}
            <div className="bg-white rounded-3xl p-8 text-center hover:scale-105 transition-all duration-300 cursor-pointer shadow-lg hover:shadow-xl">
              <div className="bg-choma-orange rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-6">
                <ChatCircle size={32} className="text-white" weight="fill" />
              </div>
              <h3 className="text-choma-black text-xl font-bold mb-3">Live Chat</h3>
              <p className="text-choma-black/80 mb-4">Chat with us in real-time through the app</p>
              <p className="text-choma-orange font-bold text-lg">Start Chat</p>
              <div className="bg-choma-orange/20 text-choma-brown px-4 py-2 rounded-full inline-block font-semibold text-sm mt-3">
                Instant Response
              </div>
            </div>

            {/* Visit Us */}
            <div className="bg-white rounded-3xl p-8 text-center hover:scale-105 transition-all duration-300 cursor-pointer shadow-lg hover:shadow-xl">
              <div className="bg-choma-brown rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-6">
                <MapPin size={32} className="text-white" weight="fill" />
              </div>
              <h3 className="text-choma-black text-xl font-bold mb-3">Visit Us</h3>
              <p className="text-choma-black/80 mb-4">We're located in major Nigerian cities</p>
              <p className="text-choma-brown font-bold text-lg">Lagos, Abuja, PH</p>
              <div className="bg-choma-brown/20 text-choma-brown px-4 py-2 rounded-full inline-block font-semibold text-sm mt-3">
                3 Locations
              </div>
            </div>
          </div>

          {/* Additional Info */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-16">
            <div className="bg-white/10 rounded-3xl p-8 backdrop-blur-sm text-center">
              <Clock size={40} className="text-choma-orange mx-auto mb-4" weight="fill" />
              <h3 className="text-white font-bold text-xl mb-2">Response Time</h3>
              <p className="text-white/80">We typically respond within 2-4 hours during business hours</p>
            </div>

            <div className="bg-white/10 rounded-3xl p-8 backdrop-blur-sm text-center">
              <Users size={40} className="text-choma-orange mx-auto mb-4" weight="fill" />
              <h3 className="text-white font-bold text-xl mb-2">Expert Team</h3>
              <p className="text-white/80">Our customer success team is here to ensure your satisfaction</p>
            </div>

            <div className="bg-white/10 rounded-3xl p-8 backdrop-blur-sm text-center">
              <CheckCircle size={40} className="text-choma-orange mx-auto mb-4" weight="fill" />
              <h3 className="text-white font-bold text-xl mb-2">Satisfaction Guaranteed</h3>
              <p className="text-white/80">99.8% customer satisfaction rate with our support services</p>
            </div>
          </div>
        </div>

      </section>
    </div>
  )
}

export default Contact