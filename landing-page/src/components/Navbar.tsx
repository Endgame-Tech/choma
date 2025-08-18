import React, { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import logo from '../assets/images/logo.svg'

const Navbar: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false)
  const [isScrolled, setIsScrolled] = useState(false)
  const location = useLocation()

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const navigation = [
    { name: 'Products', href: '/products' },
    { name: 'About', href: '/about' },
    { name: 'Blog', href: '/blog' },
    { name: 'Contact', href: '/contact' },
    { name: 'FAQs', href: '/faq' },
  ]

  const isActive = (path: string) => location.pathname === path

  return (
    <nav className={`fixed w-full z-50 transition-all duration-300 ${
      isScrolled ? 'py-4' : 'py-6'
    }`}>
      <div className="container-width">
        {/* Desktop Navigation */}
        <div className="hidden lg:flex items-center justify-center space-x-4">
          {/* Logo Section - Separate Brown Background */}
          <Link to="/" className="flex bg-choma-brown rounded-full items-center px-6 py-4 shadow-lg">
            <img src={logo} alt="Choma" className="h-10 w-auto" />
          </Link>

          {/* Navigation Items - Orange Background */}
          <div className="flex items-center space-x-16 px-12 py-8 bg-choma-orange rounded-full tracking-tighter shadow-lg">
            {navigation.map((item) => (
              <Link
                key={item.name}
                to={item.href}
                className={`text-base font-medium transition-colors duration-200 ${
                  isActive(item.href)
                    ? 'text-choma-brown font-semibold'
                    : 'text-choma-brown/80 hover:text-choma-brown'
                }`}
              >
                {item.name}
              </Link>
            ))}
          </div>
          
          {/* Order Now Button - Separate Brown Background */}
          <button className="flex tracking-tighter items-center space-x-2 bg-choma-brown text-white px-6 py-4 rounded-full font-medium hover:bg-choma-brown/90 transition-colors shadow-lg">
            <i className="fi fi-rr-shop text-2xl pt-1"></i>
            <span>Order Now</span>
          </button>
        </div>

        {/* Mobile Navigation */}
        <div className="lg:hidden flex items-center justify-between">
          {/* Mobile Logo */}
          <Link to="/" className="flex items-center">
            <img src={logo} alt="Choma" className="h-10 w-auto" />
          </Link>

          {/* Mobile Menu Button */}
          <button
            className="p-2 rounded-md bg-choma-orange text-choma-brown hover:bg-choma-orange/90 transition-colors"
            onClick={() => setIsOpen(!isOpen)}
          >
            {isOpen ? (
              <i className="fi fi-rr-cross text-lg"></i>
            ) : (
              <i className="fi fi-rr-menu-burger text-lg"></i>
            )}
          </button>
        </div>

        {/* Mobile Menu */}
        {isOpen && (
          <div className="lg:hidden mt-4">
            <div className="bg-choma-orange rounded-2xl shadow-lg p-4">
              <div className="space-y-2">
                {navigation.map((item) => (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={`block px-4 py-3 rounded-xl text-base font-medium transition-colors ${
                      isActive(item.href)
                        ? 'text-choma-brown bg-white/20 font-semibold'
                        : 'text-choma-brown/80 hover:text-choma-brown hover:bg-white/10'
                    }`}
                    onClick={() => setIsOpen(false)}
                  >
                    {item.name}
                  </Link>
                ))}
              </div>
              <div className="mt-4 pt-4 border-t border-choma-brown/20">
                <button className="w-full flex items-center justify-center space-x-2 bg-choma-brown text-white px-6 py-3 rounded-xl font-medium hover:bg-choma-brown/90 transition-colors">
                  <i className="fi fi-rr-shopping-bag text-sm"></i>
                  <span>Order Now</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  )
}

export default Navbar