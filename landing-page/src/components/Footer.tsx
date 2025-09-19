import React from 'react'
import { Link } from 'react-router-dom'
import {
  MapPinIcon,
  PhoneIcon,
  EnvelopeIcon,
  ArrowTopRightOnSquareIcon,
  CheckBadgeIcon,
  TruckIcon,
  StarIcon
} from '@heroicons/react/24/outline'
import {
  FacebookLogo,
  InstagramLogo,
  TwitterLogo,
  TiktokLogo,
  WhatsappLogo
} from 'phosphor-react'
import googleplayStoreLogo from '../assets/images/googleplayStoreLogo.svg'
import appleLogo from '../assets/images/appleLogo.svg'

const Footer: React.FC = () => {
  const currentYear = new Date().getFullYear()

  const quickLinks = [
    { name: 'About Us', path: '/about' },
    { name: 'Products', path: '/products' },
    { name: 'FAQ', path: '/faq' },
    { name: 'Blog', path: '/blog' },
    { name: 'Contact', path: '/contact' }
  ]

  const supportLinks = [
    { name: 'Help Center', path: '/help' },
    { name: 'Track Order', path: '/track' },
    { name: 'Refund Policy', path: '/refund' },
    { name: 'Customer Support', path: '/support' }
  ]

  const partnerLinks = [
    { name: 'Become a Chef', path: '/chef-signup' },
    { name: 'Delivery Partner', path: '/delivery-signup' },
    { name: 'Business Solutions', path: '/business' },
    { name: 'Restaurant Partners', path: '/restaurant-signup' }
  ]

  const legalLinks = [
    { name: 'Privacy Policy', path: '/privacy' },
    { name: 'Terms of Service', path: '/terms' },
    { name: 'Delete Account', path: '/delete-account' },
    { name: 'Cookie Policy', path: '/cookies' }
  ]

  const socialLinks = [
    {
      name: 'WhatsApp',
      icon: WhatsappLogo,
      url: 'https://wa.me/+2348123456789',
      color: 'hover:text-green-500'
    },
    {
      name: 'Instagram',
      icon: InstagramLogo,
      url: 'https://instagram.com/chomaapp',
      color: 'hover:text-pink-500'
    },
    {
      name: 'Facebook',
      icon: FacebookLogo,
      url: 'https://facebook.com/chomaapp',
      color: 'hover:text-blue-500'
    },
    {
      name: 'Twitter',
      icon: TwitterLogo,
      url: 'https://twitter.com/chomaapp',
      color: 'hover:text-blue-400'
    },
    {
      name: 'TikTok',
      icon: TiktokLogo,
      url: 'https://tiktok.com/@chomaapp',
      color: 'hover:text-black'
    }
  ]

  return (
    <footer className="bg-choma-brown text-white relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute inset-0 bg-gradient-to-br from-choma-orange/20 to-transparent"></div>
        <div className="absolute top-0 right-0 w-96 h-96 bg-choma-orange/10 rounded-full -translate-y-32 translate-x-32"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-choma-orange/10 rounded-full translate-y-32 -translate-x-32"></div>
      </div>

      <div className="relative z-10">
        {/* Main Footer Content */}
        <div className="container mx-auto px-6 py-16">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-8">

            {/* Brand Section */}
            <div className="lg:col-span-2">
              <div className="mb-6">
                <h2 className="text-5xl font-bold text-choma-orange mb-3 tracking-tight">
                  Choma
                </h2>
                <p className="text-xl text-choma-white/90 font-medium leading-relaxed">
                  Authentic Nigerian flavors delivered fresh to your doorstep
                </p>
              </div>

              <p className="text-choma-white/80 mb-8 leading-relaxed max-w-md text-lg">
                Experience the rich taste of Nigeria with our carefully crafted meals.
                From traditional Jollof rice to continental dishes, we bring restaurant-quality
                food directly to you with love and authenticity.
              </p>

              {/* Contact Info */}
              <div className="space-y-4 mb-8">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-choma-orange rounded-full flex items-center justify-center">
                    <MapPinIcon className="w-5 h-5 text-choma-brown" />
                  </div>
                  <div>
                    <div className="text-choma-white font-medium">Lagos • Abuja • Port Harcourt</div>
                    <div className="text-choma-white/70 text-sm">Expanding across Nigeria</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-choma-orange rounded-full flex items-center justify-center">
                    <PhoneIcon className="w-5 h-5 text-choma-brown" />
                  </div>
                  <div>
                    <div className="text-choma-white font-medium">+234 (0) 800-CHOMA-NG</div>
                    <div className="text-choma-white/70 text-sm">24/7 Customer Support</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-choma-orange rounded-full flex items-center justify-center">
                    <EnvelopeIcon className="w-5 h-5 text-choma-brown" />
                  </div>
                  <div>
                    <div className="text-choma-white font-medium">hello@choma.ng</div>
                    <div className="text-choma-white/70 text-sm">We reply within 2 hours</div>
                  </div>
                </div>
              </div>

              {/* App Download Section */}
              <div className="space-y-3">
                <h4 className="text-lg font-semibold text-choma-orange mb-3">
                  Download Our App
                </h4>
                <div className="flex flex-col sm:flex-row gap-3">
                  <a
                    href="#"
                    className="flex items-center gap-3 bg-black hover:bg-gray-900 rounded-xl px-4 py-3 transition-all duration-300 hover:scale-105 group border border-choma-white/20"
                  >
                    <img src={googleplayStoreLogo} alt="Google Play" className="w-6 h-6" />
                    <div className="text-white">
                      <div className="text-xs opacity-80">Download on</div>
                      <div className="text-sm font-semibold">Google Play</div>
                    </div>
                  </a>
                  <a
                    href="#"
                    className="flex items-center gap-3 bg-black hover:bg-gray-900 rounded-xl px-4 py-3 transition-all duration-300 hover:scale-105 group border border-choma-white/20"
                  >
                    <img src={appleLogo} alt="App Store" className="w-6 h-6" />
                    <div className="text-white">
                      <div className="text-xs opacity-80">Download on</div>
                      <div className="text-sm font-semibold">App Store</div>
                    </div>
                  </a>
                </div>
              </div>
            </div>

            {/* Quick Links */}
            <div>
              <h3 className="text-xl font-semibold mb-6 text-choma-orange">
                Quick Links
              </h3>
              <ul className="space-y-3">
                {quickLinks.map((link, index) => (
                  <li key={index}>
                    <Link
                      to={link.path}
                      className="text-choma-white/80 hover:text-choma-orange transition-colors duration-300 flex items-center gap-2 group"
                    >
                      <span>{link.name}</span>
                      <ArrowTopRightOnSquareIcon className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-all duration-300 transform group-hover:translate-x-1" />
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Support */}
            <div>
              <h3 className="text-xl font-semibold mb-6 text-choma-orange">
                Support
              </h3>
              <ul className="space-y-3">
                {supportLinks.map((link, index) => (
                  <li key={index}>
                    <Link
                      to={link.path}
                      className="text-choma-white/80 hover:text-choma-orange transition-colors duration-300 flex items-center gap-2 group"
                    >
                      <span>{link.name}</span>
                      <ArrowTopRightOnSquareIcon className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-all duration-300 transform group-hover:translate-x-1" />
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Partners */}
            <div>
              <h3 className="text-xl font-semibold mb-6 text-choma-orange">
                Partners
              </h3>
              <ul className="space-y-3">
                {partnerLinks.map((link, index) => (
                  <li key={index}>
                    <Link
                      to={link.path}
                      className="text-choma-white/80 hover:text-choma-orange transition-colors duration-300 flex items-center gap-2 group"
                    >
                      <span>{link.name}</span>
                      <ArrowTopRightOnSquareIcon className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-all duration-300 transform group-hover:translate-x-1" />
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Legal */}
            <div>
              <h3 className="text-xl font-semibold mb-6 text-choma-orange">
                Legal
              </h3>
              <ul className="space-y-3">
                {legalLinks.map((link, index) => (
                  <li key={index}>
                    <Link
                      to={link.path}
                      className="text-choma-white/80 hover:text-choma-orange transition-colors duration-300 flex items-center gap-2 group"
                    >
                      <span>{link.name}</span>
                      <ArrowTopRightOnSquareIcon className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-all duration-300 transform group-hover:translate-x-1" />
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Newsletter & Social Section */}
        <div className="border-t border-choma-white/20 bg-choma-brown/50">
          <div className="container mx-auto px-6 py-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">

              {/* Newsletter */}
              <div>
                <h3 className="text-2xl font-bold mb-2 text-choma-orange">Stay in the Loop! 🍽️</h3>
                <p className="text-choma-white/80 mb-4">
                  Get exclusive offers, new menu updates, and food stories delivered to your inbox.
                </p>
                <div className="flex gap-3">
                  <input
                    type="email"
                    placeholder="Enter your email address"
                    className="flex-1 px-4 py-3 rounded-xl bg-white/10 border border-choma-white/20 text-white placeholder-choma-white/50 focus:outline-none focus:ring-2 focus:ring-choma-orange focus:border-transparent backdrop-blur"
                  />
                  <button className="bg-choma-orange hover:bg-choma-orange/90 text-choma-brown font-semibold px-6 py-3 rounded-xl transition-all duration-300 hover:scale-105 shadow-lg">
                    Subscribe
                  </button>
                </div>
              </div>

              {/* Social Media */}
              <div className="lg:text-right">
                <h4 className="text-xl font-semibold mb-4 text-choma-orange">Connect With Us</h4>
                <p className="text-choma-white/80 mb-6">Join our food community and share your Choma moments!</p>
                <div className="flex justify-center lg:justify-end gap-4">
                  {socialLinks.map((social, index) => {
                    const IconComponent = social.icon
                    return (
                      <a
                        key={index}
                        href={social.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`w-12 h-12 bg-white/10 backdrop-blur rounded-full flex items-center justify-center text-white ${social.color} transition-all duration-300 hover:scale-110 hover:bg-white/20 border border-choma-white/20`}
                        aria-label={social.name}
                      >
                        <IconComponent size={22} weight="fill" />
                      </a>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-choma-white/20 bg-choma-brown/80">
          <div className="container mx-auto px-6 py-6">
            <div className="flex flex-col lg:flex-row items-center justify-between gap-4">

              {/* Copyright */}
              <div className="flex flex-col lg:flex-row items-center gap-4 text-sm text-choma-white/70">
                <span>© {currentYear} Choma. All rights reserved.</span>
                <span className="hidden lg:inline">•</span>
                <span className="text-choma-orange font-medium flex items-center gap-1">
                  Made with ❤️ in Nigeria 🇳🇬
                </span>
              </div>

              {/* Trust Indicators */}
              <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-choma-white/70">
                <div className="flex items-center gap-2">
                  <CheckBadgeIcon className="w-5 h-5 text-green-400" />
                  <span>Secure Payments</span>
                </div>
                <div className="flex items-center gap-2">
                  <TruckIcon className="w-5 h-5 text-blue-400" />
                  <span>Fast Delivery</span>
                </div>
                <div className="flex items-center gap-2">
                  <StarIcon className="w-5 h-5 text-yellow-400 fill-current" />
                  <span>4.9/5 Rating</span>
                </div>
                <div className="text-choma-orange font-medium">
                  10,000+ Happy Customers
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}

export default Footer