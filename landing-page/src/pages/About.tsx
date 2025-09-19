import React, { useEffect, useRef } from 'react'
import { gsap } from 'gsap'
import {
  Heart,
  Star,
  Users,
  CookingPot,
  Truck,
  Clock,
  Shield,
  MapPin,
  CheckCircle,
  Lightbulb,
  Globe,
  TrendUp,
  User,
  ForkKnife
} from 'phosphor-react'
import chomablob2 from '../assets/images/chomablob2.svg'
import backgroundSvg from '../assets/images/background.svg'
import femaleChefGif from '../assets/images/herofood/herofood1.png'
import takeAwayGif from '../assets/images/takeAway.gif'
import bestPrice from '../assets/images/mealplanimage1.png'
import googleplayStoreLogo from '../assets/images/googleplayStoreLogo.svg'
import appleLogo from '../assets/images/appleLogo.svg'

const About: React.FC = () => {
  const titleRef = useRef<HTMLHeadingElement>(null)
  const subtitleRef = useRef<HTMLParagraphElement>(null)

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

  return (
    <div className="relative">
      <div className='h-20 md:h-48'></div>

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
        <h1 ref={titleRef} className='text-choma-brown text-center text-7xl lg:text-9xl font-medium tracking-tighter relative'>
          About <span className='font-extrabold text-choma-orange'>Choma</span>
        </h1>

        <p ref={subtitleRef} className='text-choma-black px-[12%] md:px-[25%] lg:px-[30%] text-center text-[2rem] lg:text-5xl mt-4 tracking-tighter relative z-20 leading-tight'>
          <span className='text-choma-brown font-bold'>Revolutionizing</span> Nigerian Food Culture with <span className='text-choma-orange font-extrabold'>Technology</span> and <span className='text-choma-orange font-extrabold'>Love</span>
        </p>


        <div className="container-width flex w-full justify-center md:mt-36">
          <div className='text-center max-w-4xl'>
            <h2 className='text-choma-black text-center text-3xl md:text-5xl px-3 font-bold tracking-tighter mb-6'>
              More Than Food Delivery - We're Building Community 🇳🇬
            </h2>
            <p className='text-choma-black text-xl md:text-2xl leading-relaxed'>
              At Choma, we believe that <span className='text-choma-orange font-semibold'>great food</span> has the power to bring people together,
              <span className='text-choma-orange font-semibold'> preserve culture</span>, and create lasting memories.
              We're not just delivering meals - we're delivering <span className='text-choma-orange font-semibold'>joy, tradition, and innovation</span>
              to every doorstep across Nigeria.
            </p>
            <div className='mt-8 flex flex-wrap justify-center gap-8 text-choma-brown'>
              <div className='flex items-center gap-2'>
                <span className='text-2xl'>🏆</span>
                <span className='font-medium'>Award-Winning Service</span>
              </div>
              <div className='flex items-center gap-2'>
                <span className='text-2xl'>🌍</span>
                <span className='font-medium'>Pan-African Vision</span>
              </div>
              <div className='flex items-center gap-2'>
                <span className='text-2xl'>💡</span>
                <span className='font-medium'>Tech Innovation</span>
              </div>
              <div className='flex items-center gap-2'>
                <span className='text-2xl'>❤️</span>
                <span className='font-medium'>Community First</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className='md:h-48'></div>

      {/* Our Story Section */}
      <section className="py-20 relative">
        <div className="container-width relative z-10">
          <div className='text-center mb-16'>
            <h2 className='text-choma-black text-center text-3xl sm:text-4xl md:text-6xl font-bold tracking-tighter mb-6'>
              Our <span className='text-choma-orange'>Story</span>
            </h2>
            <p className='text-choma-black/80 text-lg md:text-xl max-w-3xl mx-auto leading-relaxed'>
              From a simple idea to revolutionizing how Nigeria experiences food - this is the Choma journey.
            </p>
          </div>

          {/* Story Timeline */}
          <div className="max-w-4xl mx-auto space-y-12">
            {/* Foundation Story */}
            <div className="bg-white rounded-3xl p-8 shadow-lg hover:shadow-xl transition-all duration-300">
              <div className="flex items-start gap-6">
                <div className="bg-choma-orange rounded-full p-4 flex-shrink-0">
                  <Lightbulb size={32} className="text-white" weight="fill" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-choma-black mb-3">The Vision Begins (2024)</h3>
                  <p className="text-choma-black/70 text-lg leading-relaxed">
                    Founded by a team of food enthusiasts and tech innovators, Choma was born from a simple observation:
                    Nigerians deserve access to authentic, high-quality meals without compromise. We saw families struggling
                    to maintain healthy eating habits due to busy lifestyles, and we knew technology could bridge that gap.
                  </p>
                </div>
              </div>
            </div>

            {/* Mission Story */}
            <div className="bg-choma-orange/10 rounded-3xl p-8">
              <div className="flex items-start gap-6">
                <div className="bg-choma-brown rounded-full p-4 flex-shrink-0">
                  <Heart size={32} className="text-white" weight="fill" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-choma-black mb-3">Our Mission</h3>
                  <p className="text-choma-black/70 text-lg leading-relaxed mb-4">
                    To preserve and celebrate Nigerian culinary heritage while making nutritious, delicious meals accessible
                    to every Nigerian household. We connect skilled chefs with families, creating a sustainable ecosystem
                    that supports local talent while nourishing communities.
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-white rounded-xl p-4 text-center">
                      <CookingPot size={24} className="text-choma-orange mx-auto mb-2" weight="fill" />
                      <p className="text-sm font-semibold text-choma-black">Empower Chefs</p>
                    </div>
                    <div className="bg-white rounded-xl p-4 text-center">
                      <Users size={24} className="text-choma-orange mx-auto mb-2" weight="fill" />
                      <p className="text-sm font-semibold text-choma-black">Serve Communities</p>
                    </div>
                    <div className="bg-white rounded-xl p-4 text-center">
                      <Globe size={24} className="text-choma-orange mx-auto mb-2" weight="fill" />
                      <p className="text-sm font-semibold text-choma-black">Preserve Culture</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Vision Story */}
            <div className="bg-white rounded-3xl p-8 shadow-lg hover:shadow-xl transition-all duration-300">
              <div className="flex items-start gap-6">
                <div className="bg-choma-orange rounded-full p-4 flex-shrink-0">
                  <TrendUp size={32} className="text-white" weight="fill" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-choma-black mb-3">Our Vision</h3>
                  <p className="text-choma-black/70 text-lg leading-relaxed">
                    To become Africa's leading food technology platform, setting the standard for quality, innovation,
                    and cultural authenticity. We envision a future where every African household has access to
                    personalized, nutritious meals that celebrate our rich culinary diversity while supporting
                    local economies and sustainable practices.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Blob2 */}
      <div className="absolute overflow-x-hidden -translate-y-[10%] md:-translate-y-[15%] 
                z-[-11] w-full flex justify-center pointer-events-none inset-x-0">
        <div className='absolute w-[270rem] md:w-[2400px] translate-x-[20rem]
                  md:translate-x-[5rem] scale-100 md:scale-110 opacity-80'>
          <img src={chomablob2} alt="Choma blob" className="object-contain w-full h-auto" />
        </div>
      </div>

      {/* What We Offer Section */}
      <section className="py-20 relative">
        <div className="container-width relative z-10">
          <div className='text-center mb-16'>
            <h2 className='text-choma-brown text-center text-3xl sm:text-4xl md:text-6xl font-bold tracking-tighter mb-6'>
              What We <span className='text-choma-orange'>Offer</span>
            </h2>
            <p className='text-choma-white/90 text-lg md:text-xl max-w-3xl mx-auto leading-relaxed'>
              A comprehensive ecosystem designed to revolutionize how you experience food, from planning to your plate.
            </p>
          </div>

          {/* Services Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Meal Planning Service */}
            <div className="bg-white rounded-3xl p-8 text-center hover:scale-105 transition-all duration-300 cursor-pointer shadow-lg hover:shadow-xl">
              <div className="bg-choma-orange rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-6">
                <ForkKnife size={32} className="text-white" weight="fill" />
              </div>
              <h3 className="text-choma-black text-2xl font-bold mb-3">Smart Meal Planning</h3>
              <p className="text-choma-black/80 mb-4">AI-powered meal plans tailored to your dietary needs, preferences, and lifestyle. From fitness goals to family nutrition.</p>
              <div className="bg-choma-orange/20 text-choma-brown px-4 py-2 rounded-full inline-block font-semibold text-sm">
                Personalized Plans
              </div>
            </div>

            {/* Food Delivery Service */}
            <div className="bg-white rounded-3xl p-8 text-center hover:scale-105 transition-all duration-300 cursor-pointer shadow-lg hover:shadow-xl">
              <div className="bg-choma-brown rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-6">
                <Truck size={32} className="text-white" weight="fill" />
              </div>
              <h3 className="text-choma-black text-2xl font-bold mb-3">Fast Delivery</h3>
              <p className="text-choma-black/80 mb-4">Lightning-fast delivery across Lagos, Abuja, and Port Harcourt. Fresh, hot meals delivered in 30 minutes average.</p>
              <div className="bg-choma-brown/20 text-choma-brown px-4 py-2 rounded-full inline-block font-semibold text-sm">
                30 Min Average
              </div>
            </div>

            {/* Chef Network */}
            <div className="bg-white rounded-3xl p-8 text-center hover:scale-105 transition-all duration-300 cursor-pointer shadow-lg hover:shadow-xl">
              <div className="bg-choma-orange rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-6">
                <CookingPot size={32} className="text-white" weight="fill" />
              </div>
              <h3 className="text-choma-black text-2xl font-bold mb-3">Expert Chefs</h3>
              <p className="text-choma-black/80 mb-4">Network of certified Nigerian chefs specializing in authentic cuisine and international dishes with premium quality.</p>
              <div className="bg-choma-orange/20 text-choma-brown px-4 py-2 rounded-full inline-block font-semibold text-sm">
                Certified Network
              </div>
            </div>

            {/* Subscription Plans */}
            <div className="bg-white rounded-3xl p-8 text-center hover:scale-105 transition-all duration-300 cursor-pointer shadow-lg hover:shadow-xl">
              <div className="bg-choma-brown rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-6">
                <CheckCircle size={32} className="text-white" weight="fill" />
              </div>
              <h3 className="text-choma-black text-2xl font-bold mb-3">Flexible Subscriptions</h3>
              <p className="text-choma-black/80 mb-4">Weekly meal subscriptions with pause, skip, and customization options. Never worry about meal planning again.</p>
              <div className="bg-choma-brown/20 text-choma-brown px-4 py-2 rounded-full inline-block font-semibold text-sm">
                From ₦15,000/week
              </div>
            </div>

            {/* Real-time Tracking */}
            <div className="bg-white rounded-3xl p-8 text-center hover:scale-105 transition-all duration-300 cursor-pointer shadow-lg hover:shadow-xl">
              <div className="bg-choma-orange rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-6">
                <MapPin size={32} className="text-white" weight="fill" />
              </div>
              <h3 className="text-choma-black text-2xl font-bold mb-3">Real-time Tracking</h3>
              <p className="text-choma-black/80 mb-4">Track your order from kitchen to doorstep. Know exactly when your chef starts cooking and when your driver arrives.</p>
              <div className="bg-choma-orange/20 text-choma-brown px-4 py-2 rounded-full inline-block font-semibold text-sm">
                Live Updates
              </div>
            </div>

            {/* Community Platform */}
            <div className="bg-white rounded-3xl p-8 text-center hover:scale-105 transition-all duration-300 cursor-pointer shadow-lg hover:shadow-xl">
              <div className="bg-choma-brown rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-6">
                <Users size={32} className="text-white" weight="fill" />
              </div>
              <h3 className="text-choma-black text-2xl font-bold mb-3">Food Community</h3>
              <p className="text-choma-black/80 mb-4">Join a vibrant community of food lovers. Share reviews, discover new dishes, and connect with fellow food enthusiasts.</p>
              <div className="bg-choma-brown/20 text-choma-brown px-4 py-2 rounded-full inline-block font-semibold text-sm">
                15K+ Members
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Statistics Section */}
      <section className="py-20 bg-gradient-to-br from-choma-orange to-choma-brown relative overflow-hidden">
        <div className="container-width relative z-10">
          <div className='text-center mb-16'>
            <h2 className='text-white text-center text-3xl sm:text-4xl md:text-6xl font-bold tracking-tighter mb-6'>
              Our <span className='text-yellow-300'>Impact</span>
            </h2>
            <p className='text-white/90 text-lg md:text-xl max-w-3xl mx-auto leading-relaxed'>
              Numbers that tell the story of our growing community and the impact we're making across Nigeria.
            </p>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-16">
            <div className="text-center">
              <div className="bg-white/20 rounded-3xl p-6 backdrop-blur-sm hover:bg-white/30 transition-all duration-300">
                <Users size={48} className="text-white mx-auto mb-4" weight="fill" />
                <div className="text-4xl md:text-5xl font-bold text-white mb-2">15K+</div>
                <div className="text-white/80 font-medium">Happy Customers</div>
              </div>
            </div>

            <div className="text-center">
              <div className="bg-white/20 rounded-3xl p-6 backdrop-blur-sm hover:bg-white/30 transition-all duration-300">
                <ForkKnife size={48} className="text-white mx-auto mb-4" weight="fill" />
                <div className="text-4xl md:text-5xl font-bold text-white mb-2">100+</div>
                <div className="text-white/80 font-medium">Delicious Dishes</div>
              </div>
            </div>

            <div className="text-center">
              <div className="bg-white/20 rounded-3xl p-6 backdrop-blur-sm hover:bg-white/30 transition-all duration-300">
                <CookingPot size={48} className="text-white mx-auto mb-4" weight="fill" />
                <div className="text-4xl md:text-5xl font-bold text-white mb-2">200+</div>
                <div className="text-white/80 font-medium">Certified Chefs</div>
              </div>
            </div>

            <div className="text-center">
              <div className="bg-white/20 rounded-3xl p-6 backdrop-blur-sm hover:bg-white/30 transition-all duration-300">
                <MapPin size={48} className="text-white mx-auto mb-4" weight="fill" />
                <div className="text-4xl md:text-5xl font-bold text-white mb-2">3</div>
                <div className="text-white/80 font-medium">Major Cities</div>
              </div>
            </div>
          </div>

          {/* Additional Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white/10 rounded-3xl p-8 backdrop-blur-sm text-center">
              <Clock size={40} className="text-yellow-300 mx-auto mb-4" weight="fill" />
              <div className="text-3xl font-bold text-white mb-2">30 Min</div>
              <div className="text-white/80">Average Delivery Time</div>
            </div>

            <div className="bg-white/10 rounded-3xl p-8 backdrop-blur-sm text-center">
              <Star size={40} className="text-yellow-300 mx-auto mb-4" weight="fill" />
              <div className="text-3xl font-bold text-white mb-2">4.9/5</div>
              <div className="text-white/80">Customer Satisfaction</div>
            </div>

            <div className="bg-white/10 rounded-3xl p-8 backdrop-blur-sm text-center">
              <Shield size={40} className="text-yellow-300 mx-auto mb-4" weight="fill" />
              <div className="text-3xl font-bold text-white mb-2">99.8%</div>
              <div className="text-white/80">Successful Deliveries</div>
            </div>
          </div>

          {/* Achievement Highlights */}
          <div className="mt-16 grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-white/10 rounded-3xl p-8 backdrop-blur-sm">
              <div className="flex items-center gap-4 mb-4">
                <div className="bg-yellow-400 rounded-full p-3">
                  <span className="text-2xl">🏆</span>
                </div>
                <h3 className="text-2xl font-bold text-white">Innovation Award</h3>
              </div>
              <p className="text-white/80 leading-relaxed">
                Recognized as Nigeria's Most Innovative Food Tech Platform 2024 for revolutionizing meal planning and delivery.
              </p>
            </div>

            <div className="bg-white/10 rounded-3xl p-8 backdrop-blur-sm">
              <div className="flex items-center gap-4 mb-4">
                <div className="bg-yellow-400 rounded-full p-3">
                  <span className="text-2xl">🌱</span>
                </div>
                <h3 className="text-2xl font-bold text-white">Sustainability Leader</h3>
              </div>
              <p className="text-white/80 leading-relaxed">
                Committed to supporting local farmers, reducing food waste, and promoting sustainable food practices across Nigeria.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Our Values Section */}
      <section className="py-20 relative">
        <div className="container-width relative z-10">
          <div className='text-center mb-16'>
            <h2 className='text-choma-black text-center text-3xl sm:text-4xl md:text-6xl font-bold tracking-tighter mb-6'>
              Our <span className='text-choma-orange'>Values</span>
            </h2>
            <p className='text-choma-black/80 text-lg md:text-xl max-w-3xl mx-auto leading-relaxed'>
              The principles that guide everything we do - from selecting ingredients to delivering exceptional experiences.
            </p>
          </div>

          {/* Values Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16">
            {/* Quality First */}
            <div className="bg-gradient-to-br from-choma-orange/10 to-choma-orange/5 rounded-3xl p-8 hover:shadow-xl transition-all duration-300">
              <div className="flex items-start gap-6">
                <div className="bg-choma-orange rounded-full p-4 flex-shrink-0">
                  <Star size={32} className="text-white" weight="fill" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-choma-black mb-3">Quality First</h3>
                  <p className="text-choma-black/70 text-lg leading-relaxed mb-4">
                    We never compromise on quality. From sourcing the freshest ingredients to partnering with skilled chefs,
                    every meal meets our high standards of excellence and authenticity.
                  </p>
                  <ul className="space-y-2 text-choma-black/60">
                    <li className="flex items-center gap-2">
                      <CheckCircle size={16} className="text-choma-orange" weight="fill" />
                      <span>Premium local ingredients</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle size={16} className="text-choma-orange" weight="fill" />
                      <span>Certified chef partners</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle size={16} className="text-choma-orange" weight="fill" />
                      <span>Rigorous quality checks</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Cultural Authenticity */}
            <div className="bg-gradient-to-br from-choma-brown/10 to-choma-brown/5 rounded-3xl p-8 hover:shadow-xl transition-all duration-300">
              <div className="flex items-start gap-6">
                <div className="bg-choma-brown rounded-full p-4 flex-shrink-0">
                  <Globe size={32} className="text-white" weight="fill" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-choma-black mb-3">Cultural Authenticity</h3>
                  <p className="text-choma-black/70 text-lg leading-relaxed mb-4">
                    We celebrate and preserve Nigerian culinary heritage while embracing innovation. Our dishes tell stories,
                    connect generations, and honor our rich food culture.
                  </p>
                  <ul className="space-y-2 text-choma-black/60">
                    <li className="flex items-center gap-2">
                      <CheckCircle size={16} className="text-choma-brown" weight="fill" />
                      <span>Traditional recipes</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle size={16} className="text-choma-brown" weight="fill" />
                      <span>Cultural storytelling</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle size={16} className="text-choma-brown" weight="fill" />
                      <span>Heritage preservation</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Community Impact */}
            <div className="bg-gradient-to-br from-choma-orange/10 to-choma-orange/5 rounded-3xl p-8 hover:shadow-xl transition-all duration-300">
              <div className="flex items-start gap-6">
                <div className="bg-choma-orange rounded-full p-4 flex-shrink-0">
                  <Users size={32} className="text-white" weight="fill" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-choma-black mb-3">Community Impact</h3>
                  <p className="text-choma-black/70 text-lg leading-relaxed mb-4">
                    We believe in uplifting communities. By empowering local chefs, supporting small businesses,
                    and creating sustainable opportunities, we contribute to Nigeria's economic growth.
                  </p>
                  <ul className="space-y-2 text-choma-black/60">
                    <li className="flex items-center gap-2">
                      <CheckCircle size={16} className="text-choma-orange" weight="fill" />
                      <span>Local chef empowerment</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle size={16} className="text-choma-orange" weight="fill" />
                      <span>Economic opportunities</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle size={16} className="text-choma-orange" weight="fill" />
                      <span>Community building</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Innovation & Technology */}
            <div className="bg-gradient-to-br from-choma-brown/10 to-choma-brown/5 rounded-3xl p-8 hover:shadow-xl transition-all duration-300">
              <div className="flex items-start gap-6">
                <div className="bg-choma-brown rounded-full p-4 flex-shrink-0">
                  <Lightbulb size={32} className="text-white" weight="fill" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-choma-black mb-3">Innovation & Technology</h3>
                  <p className="text-choma-black/70 text-lg leading-relaxed mb-4">
                    We harness cutting-edge technology to solve real problems. From AI meal planning to seamless delivery tracking,
                    innovation drives everything we do.
                  </p>
                  <ul className="space-y-2 text-choma-black/60">
                    <li className="flex items-center gap-2">
                      <CheckCircle size={16} className="text-choma-brown" weight="fill" />
                      <span>AI-powered solutions</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle size={16} className="text-choma-brown" weight="fill" />
                      <span>Seamless user experience</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle size={16} className="text-choma-brown" weight="fill" />
                      <span>Continuous improvement</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/* Featured Images */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="relative overflow-hidden rounded-3xl aspect-square">
              <img
                src={femaleChefGif}
                alt="Professional Chef"
                className="w-full h-full object-cover hover:scale-110 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
              <div className="absolute bottom-6 left-6 text-white">
                <h4 className="font-bold text-xl mb-1">Expert Chefs</h4>
                <p className="text-white/90 text-sm">Culinary masters at work</p>
              </div>
            </div>

            <div className="relative overflow-hidden rounded-3xl aspect-square">
              <img
                src={takeAwayGif}
                alt="Fast Delivery"
                className="w-full h-full object-cover hover:scale-110 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
              <div className="absolute bottom-6 left-6 text-white">
                <h4 className="font-bold text-xl mb-1">Quick Service</h4>
                <p className="text-white/90 text-sm">Fast, reliable delivery</p>
              </div>
            </div>

            <div className="relative overflow-hidden rounded-3xl aspect-square">
              <img
                src={bestPrice}
                alt="Best Value"
                className="w-full h-full object-cover hover:scale-110 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
              <div className="absolute bottom-6 left-6 text-white">
                <h4 className="font-bold text-xl mb-1">Great Value</h4>
                <p className="text-white/90 text-sm">Quality at fair prices</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Technology & Innovation Section */}
      <section className="py-20 bg-gradient-to-br from-choma-black to-choma-brown relative overflow-hidden">
        <div className="container-width relative z-10">
          <div className='text-center mb-16'>
            <h2 className='text-white text-center text-3xl sm:text-4xl md:text-6xl font-bold tracking-tighter mb-6'>
              Powered by <span className='text-choma-orange'>Technology</span>
            </h2>
            <p className='text-white/90 text-lg md:text-xl max-w-3xl mx-auto leading-relaxed'>
              Advanced technology solutions that make food delivery smarter, faster, and more personalized than ever before.
            </p>
          </div>

          {/* Technology Features */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-16">
            {/* AI Meal Planning */}
            <div className="bg-white/10 rounded-3xl p-6 backdrop-blur-sm hover:bg-white/20 transition-all duration-300 text-center">
              <div className="bg-choma-orange rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <Lightbulb size={28} className="text-white" weight="fill" />
              </div>
              <h3 className="text-white font-bold text-lg mb-2">AI Meal Planning</h3>
              <p className="text-white/80 text-sm leading-relaxed">
                Smart algorithms create personalized meal plans based on your preferences, dietary needs, and health goals.
              </p>
            </div>

            {/* Real-time Tracking */}
            <div className="bg-white/10 rounded-3xl p-6 backdrop-blur-sm hover:bg-white/20 transition-all duration-300 text-center">
              <div className="bg-choma-orange rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <MapPin size={28} className="text-white" weight="fill" />
              </div>
              <h3 className="text-white font-bold text-lg mb-2">Live Tracking</h3>
              <p className="text-white/80 text-sm leading-relaxed">
                Track your order in real-time from kitchen preparation to your doorstep with GPS precision.
              </p>
            </div>

            {/* Mobile Apps */}
            <div className="bg-white/10 rounded-3xl p-6 backdrop-blur-sm hover:bg-white/20 transition-all duration-300 text-center">
              <div className="bg-choma-orange rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <User size={28} className="text-white" weight="fill" />
              </div>
              <h3 className="text-white font-bold text-lg mb-2">Multi-Platform</h3>
              <p className="text-white/80 text-sm leading-relaxed">
                Seamless experience across customer, chef, driver, and admin apps with synchronized data.
              </p>
            </div>

            {/* Smart Analytics */}
            <div className="bg-white/10 rounded-3xl p-6 backdrop-blur-sm hover:bg-white/20 transition-all duration-300 text-center">
              <div className="bg-choma-orange rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <TrendUp size={28} className="text-white" weight="fill" />
              </div>
              <h3 className="text-white font-bold text-lg mb-2">Smart Analytics</h3>
              <p className="text-white/80 text-sm leading-relaxed">
                Data-driven insights optimize operations, predict demand, and improve service quality continuously.
              </p>
            </div>
          </div>

          {/* Platform Showcase */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            {/* Customer Experience */}
            <div className="bg-white/5 rounded-3xl p-8 backdrop-blur-sm">
              <h3 className="text-2xl font-bold text-white mb-6">Customer Experience</h3>
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <CheckCircle size={20} className="text-choma-orange" weight="fill" />
                  <span className="text-white/90">Personalized meal recommendations</span>
                </div>
                <div className="flex items-center gap-4">
                  <CheckCircle size={20} className="text-choma-orange" weight="fill" />
                  <span className="text-white/90">One-click reordering</span>
                </div>
                <div className="flex items-center gap-4">
                  <CheckCircle size={20} className="text-choma-orange" weight="fill" />
                  <span className="text-white/90">Real-time order updates</span>
                </div>
                <div className="flex items-center gap-4">
                  <CheckCircle size={20} className="text-choma-orange" weight="fill" />
                  <span className="text-white/90">Integrated payment system</span>
                </div>
                <div className="flex items-center gap-4">
                  <CheckCircle size={20} className="text-choma-orange" weight="fill" />
                  <span className="text-white/90">Review and rating system</span>
                </div>
              </div>
            </div>

            {/* Business Operations */}
            <div className="bg-white/5 rounded-3xl p-8 backdrop-blur-sm">
              <h3 className="text-2xl font-bold text-white mb-6">Business Operations</h3>
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <CheckCircle size={20} className="text-choma-orange" weight="fill" />
                  <span className="text-white/90">Chef workload optimization</span>
                </div>
                <div className="flex items-center gap-4">
                  <CheckCircle size={20} className="text-choma-orange" weight="fill" />
                  <span className="text-white/90">Automated driver assignment</span>
                </div>
                <div className="flex items-center gap-4">
                  <CheckCircle size={20} className="text-choma-orange" weight="fill" />
                  <span className="text-white/90">Inventory management</span>
                </div>
                <div className="flex items-center gap-4">
                  <CheckCircle size={20} className="text-choma-orange" weight="fill" />
                  <span className="text-white/90">Performance analytics</span>
                </div>
                <div className="flex items-center gap-4">
                  <CheckCircle size={20} className="text-choma-orange" weight="fill" />
                  <span className="text-white/90">Financial reporting</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Call to Action Section */}
      <section className="py-20 bg-gradient-to-br from-choma-orange to-choma-brown relative overflow-hidden">
        <div className="container-width relative z-10 text-center">
          <h2 className="text-white text-4xl md:text-6xl font-bold mb-6 tracking-tight">
            Ready to Experience Choma?
          </h2>
          <p className="text-white/90 text-xl md:text-2xl mb-12 max-w-3xl mx-auto leading-relaxed">
            Join thousands of satisfied customers who have made Choma their go-to food solution.
            Download the app and enjoy <span className="font-bold text-yellow-300">₦1,000 OFF</span> your first order!
          </p>

          {/* Download Buttons */}
          <div className="flex flex-col sm:flex-row gap-6 justify-center items-center mb-12">
            <a
              href="#"
              className="flex items-center gap-4 bg-black hover:bg-gray-900 text-white rounded-2xl px-8 py-4 transition-all duration-300 hover:scale-105 shadow-2xl group min-w-[200px]"
            >
              <img src={googleplayStoreLogo} alt="Google Play" className="w-8 h-8" />
              <div className="text-left">
                <div className="text-sm opacity-80">Download on</div>
                <div className="text-lg font-bold">Google Play</div>
              </div>
            </a>
            <a
              href="#"
              className="flex items-center gap-4 bg-black hover:bg-gray-900 text-white rounded-2xl px-8 py-4 transition-all duration-300 hover:scale-105 shadow-2xl group min-w-[200px]"
            >
              <img src={appleLogo} alt="App Store" className="w-8 h-8" />
              <div className="text-left">
                <div className="text-sm opacity-80">Download on</div>
                <div className="text-lg font-bold">App Store</div>
              </div>
            </a>
          </div>

          {/* Contact Information */}
          <div className="bg-white/10 rounded-3xl p-8 backdrop-blur-sm max-w-2xl mx-auto">
            <h3 className="text-2xl font-bold text-white mb-6">Get in Touch</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-white/90">
              <div>
                <h4 className="font-semibold mb-2">Customer Support</h4>
                <p>support@choma.ng</p>
                <p>+234 800 CHOMA (24662)</p>
              </div>
              <div>
                <h4 className="font-semibold mb-2">Business Inquiries</h4>
                <p>business@choma.ng</p>
                <p>+234 901 234 5678</p>
              </div>
            </div>
          </div>

          {/* Special Offer Badge */}
          <div className="mt-12">
            <div className="inline-flex items-center gap-3 bg-yellow-400 text-black px-6 py-3 rounded-full font-bold text-lg shadow-lg animate-pulse">
              <span>Join 15K+ happy customers today! 🎉</span>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

export default About