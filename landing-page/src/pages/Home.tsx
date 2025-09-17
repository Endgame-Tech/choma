import React, { useEffect, useRef, useState } from 'react'
import { gsap } from 'gsap'
import chomablob1 from '../assets/images/chomablob1.svg'
import chomablob2 from '../assets/images/chomablob2.svg'
import herofood1 from '../assets/images/herofood/herofood1.png'
import herofood2 from '../assets/images/herofood/herofood2.png'
import mealPlanImage1 from '../assets/images/mealplanimage1.png'
import badge from '../assets/images/badge.png'
import googleplayStoreLogo from '../assets/images/googleplayStoreLogo.svg'
import appleLogo from '../assets/images/appleLogo.svg'
import phonemockup from '../assets/images/phonemockup.png'
import backgroundSvg from '../assets/images/background.svg'
import takeAwayGif from '../assets/images/takeAway.gif'
// import femaleChefGif from '../assets/images/femaleChef.gif' // File not found
// import bestPrice from '../assets/images/bestPrice.gif' // File not found
import FeatureCard from '../components/FeatureCard'
import { Barbell } from 'phosphor-react'

const Home: React.FC = () => {
  const titleRef = useRef<HTMLHeadingElement>(null)
  const subtitleRef = useRef<HTMLParagraphElement>(null)
  const foodRef = useRef<HTMLImageElement>(null)

  // Feature Cards Data
  const featureCards = [
    {
      title: "Chef-Crafted Excellence",
      description: "Every dish is a masterpiece prepared by certified Nigerian chefs using premium, locally-sourced ingredients. Taste the difference quality makes.",
      image: takeAwayGif, // Using available GIF
      imageAlt: "Professional Chef Cooking",
      badges: [
        { text: "4.9/5 Rating", type: "rating" as const },
      ]
    },
    {
      title: "Unbeatable Value",
      description: "Savor restaurant-quality meals without breaking the bank. Transparent pricing, zero hidden fees, maximum satisfaction guaranteed.",
      image: mealPlanImage1, // Using available image instead of missing GIF
      imageAlt: "Best Price Value",
      badges: [
        { text: "From ₦3,500", type: "price" as const }
      ]
    },
    {
      title: "Cultural Fusion Menu",
      description: "From mama's secret Jollof recipe to international gourmet dishes - explore a world of flavors that celebrate Nigerian heritage and global cuisine.",
      image: takeAwayGif,
      imageAlt: "Diverse Cuisine Selection",
      badges: [
        { text: "100+ Dishes", type: "rating" as const },
      ]
    },
    {
      title: "Lightning-Fast Delivery",
      description: "Craving satisfaction can't wait! Our dedicated riders ensure your hot, fresh meals arrive in record time across Lagos, Abuja, and Port Harcourt.",
      image: takeAwayGif, // Using available GIF
      imageAlt: "Fast Delivery Service",
      badges: [
        { text: "30 Min Avg", type: "rating" as const },
      ]
    },
    {
      title: "Smart Meal Planning",
      description: "Let our AI-powered meal planner create personalized nutrition plans that fit your lifestyle, dietary needs, and taste preferences perfectly.",
      image: mealPlanImage1, // Using available image instead of missing GIF
      imageAlt: "Meal Planning Technology",
      badges: [
        { text: "AI-Powered", type: "price" as const }
      ]
    },
    {
      title: "Community-Driven",
      description: "Join thousands of food lovers sharing recipes, reviews, and culinary adventures. Choma isn't just food delivery - it's a food community.",
      image: takeAwayGif,
      imageAlt: "Food Community",
      badges: [
        { text: "15K+ Members", type: "rating" as const },
      ]
    }
  ]

  // Array of food images (add more images here as you get them)
  const foodImages = [
    herofood1,
    // Add more food images here when available
    herofood2,
    // herofood3,
  ]

  const [currentFoodIndex, setCurrentFoodIndex] = useState(0)

  useEffect(() => {
    // Set initial visibility to ensure text shows even if animation fails
    if (titleRef.current) {
      gsap.set(titleRef.current, { opacity: 0, y: 100 })
    }
    if (subtitleRef.current) {
      gsap.set(subtitleRef.current, { opacity: 0, y: 50 })
    }

    const tl = gsap.timeline()

    // Animate "Get Choma" text
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

    // Fallback: ensure text is visible after 3 seconds regardless
    setTimeout(() => {
      if (titleRef.current) {
        gsap.set(titleRef.current, { opacity: 1, y: 0 })
      }
      if (subtitleRef.current) {
        gsap.set(subtitleRef.current, { opacity: 1, y: 0 })
      }
    }, 3000)
  }, [])

  // Food spinning animation
  useEffect(() => {
    if (foodImages.length <= 1) return // Don't animate if only one image

    const interval = setInterval(() => {
      if (foodRef.current) {
        // Rotate out animation
        gsap.to(foodRef.current, {
          rotation: 180,
          opacity: 0,
          duration: 0.5,
          ease: "power2.in",
          onComplete: () => {
            // Change to next image
            setCurrentFoodIndex((prev) => (prev + 1) % foodImages.length)

            // Rotate in animation
            gsap.fromTo(foodRef.current,
              { rotation: -180, opacity: 0 },
              { rotation: 0, opacity: 1, duration: 0.5, ease: "power2.out" }
            )
          }
        })
      }
    }, 5000) // Change every 5 seconds

    return () => clearInterval(interval)
  }, [foodImages.length])

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

      {/* Hero */}
      <section className="py-10 relative">

        <h1 ref={titleRef} className='text-choma-brown text-center text-7xl lg:text-9xl font-medium tracking-tighter relative'>
          Get <span className='font-extrabold text-choma-orange'>Choma</span>
        </h1>

        <p ref={subtitleRef} className='text-choma-black px-[12]  md:px-[25%] lg:px-[30%] text-center text-[2rem] lg:text-5xl mt-4 tracking-tighter relative z-20 leading-tight'>
          <span className='text-choma-brown font-bold'>Authentic Nigerian Flavors</span> Delivered Fresh to Your Doorstep in <span className='text-choma-orange font-extrabold'>30 Minutes</span>
        </p>

        {/* Blob1 */}
        <div className="absolute overflow-x-hidden w-full h-[120%] md:h-[126%] flex justify-center mt-[45%] md:mt-[15%] pointer-events-none top-0">
          <div className='absolute w-[210%] md:w-[120%] flex justify-center translate-x-12 z-[-11]'>
            <img src={chomablob1} className="object-contain w-full h-auto" alt="Choma blob" />
          </div>
        </div>

        <div className="relative flex justify-center md:mt-20 overflow-hidden">
          <div className='w-[70%] relative'>
            <img
              ref={foodRef}
              src={foodImages[currentFoodIndex]}
              alt="Choma Food"
              className="object-contain w-full h-[40rem] md:h-[80rem]"
            />

            {/* Download buttons positioned like in the design */}
            <div className="absolute top-0 flex justify-between w-full mt-12 ">

              <div className="md:right-8 md:translate-y-52 pr-2 md:scale-150">
                <button className="bg-choma-brown hover:bg-choma-brown/90 border border-choma-white 
                text-white rounded-full px-6 py-3 flex items-center gap-3 transition-all duration-300 
                hover:scale-105 shadow-lg">
                  <img src={googleplayStoreLogo} alt="Google PlayStore Store" className="w-6 h-6" />
                  <div className="text-left">
                    <div className="text-xs opacity-90">Download on</div>
                    <div className="text-sm font-semibold">Google Play</div>
                  </div>
                </button>
              </div>

              <div className="md:right-8 md:translate-y-64 md:scale-150">
                <button className="bg-choma-brown hover:bg-choma-brown/90 border border-choma-white 
                text-white rounded-full px-6 py-3 flex items-center gap-3 transition-all duration-300 
                hover:scale-105 shadow-lg">
                  <img src={appleLogo} alt="Apple Store" className="w-6 h-6" />
                  <div className="text-left">
                    <div className="text-xs opacity-90">Download on</div>
                    <div className="text-sm font-semibold">Apple Store</div>
                  </div>
                </button>
              </div>

            </div>
          </div>
        </div>

        <div className="container-width flex w-full justify-center md:mt-36">
          <div className='text-center max-w-4xl'>
            <h2 className='text-choma-white text-center text-3xl md:text-5xl px-3 font-bold tracking-tighter mb-6'>
              Taste the Soul of Nigeria 🇳🇬
            </h2>
            <p className='text-choma-white/90 text-xl md:text-2xl leading-relaxed'>
              From <span className='text-choma-orange font-semibold'>grandma's secret Jollof rice</span> to
              perfectly grilled <span className='text-choma-orange font-semibold'>suya</span>, we bring the
              authentic taste of Nigerian street food and home cooking directly to you. Every bite tells
              a story of tradition, passion, and culinary excellence.
            </p>
            <div className='mt-8 flex flex-wrap justify-center gap-8 text-choma-white/80'>
              <div className='flex items-center gap-2'>
                <span className='text-2xl'>🍛</span>
                <span className='font-medium'>Traditional Recipes</span>
              </div>
              <div className='flex items-center gap-2'>
                <span className='text-2xl'>👨‍🍳</span>
                <span className='font-medium'>Local Chefs</span>
              </div>
              <div className='flex items-center gap-2'>
                <span className='text-2xl'>⚡</span>
                <span className='font-medium'>30-Min Delivery</span>
              </div>
              <div className='flex items-center gap-2'>
                <span className='text-2xl'>💯</span>
                <span className='font-medium'>Fresh Ingredients</span>
              </div>
            </div>
          </div>
        </div>

      </section>

      <div className='md:h-48'></div>

      {/* Meal Plan Section */}
      <section className="py-20 top-60 relative">
        <div className="container-width relative z-10">
          <div className='text-center mb-16'>
            <h2 className='text-choma-black text-center text-3xl sm:text-4xl md:text-6xl font-bold tracking-tighter mb-6'>
              Personalized Nutrition, <span className='text-choma-orange'>Perfected</span>
            </h2>
            <p className='text-choma-black/80 text-lg md:text-xl max-w-3xl mx-auto leading-relaxed'>
              Say goodbye to meal planning stress! Our AI-powered nutrition system creates custom meal plans
              tailored to your fitness goals, dietary preferences, and lifestyle. Whether you're bulking,
              cutting, or maintaining - we've got the perfect fuel for your journey.
            </p>
          </div>

          {/* Meal Plan Card */}
          <div className="flex justify-center px-4 md:px-20">
            <div className="bg-choma-orange rounded-[32px] p-4 md:p-6 w-full max-w-sm sm:max-w-md md:max-w-[190%] mx-auto relative overflow-hidden shadow-[8px_8px_0px_#1D0C06] md:shadow-[8px_8px_0px_#1D0C06]">

              {/* Mobile Layout */}
              <div className="lg:hidden">
                {/* Mobile Image */}
                <div className="relative mb-6">
                  <div className="rounded-[16px] overflow-hidden border-4 border-[#652815]">
                    <img
                      src={mealPlanImage1}
                      alt="Healthy FitFam Fuel Meal"
                      className="w-full h-40 sm:h-48 object-cover"
                    />
                  </div>

                  {/* Badge positioned on mobile */}
                  <div className="absolute -bottom-6 -left-3">
                    <img
                      src={badge}
                      alt="Choma Badge"
                      className="w-16 sm:w-20"
                    />
                  </div>
                </div>

                {/* Mobile Content */}
                <div className="text-left pl-3">
                  <h3 className="text-choma-black text-2xl sm:text-3xl font-bold mb-2 tracking-tight">
                    FitFam Fuel 💪
                  </h3>
                  <p className="text-choma-black text-sm sm:text-base font-medium mb-4">
                    Premium nutrition for gym-goers, athletes, and health champions
                  </p>
                  <div className="text-choma-black/70 text-xs sm:text-sm mb-6">
                    ✓ High-protein meals ✓ Balanced macros ✓ Performance-focused
                  </div>

                  {/* Order Now Button */}
                  <button className="bg-choma-black text-choma-white px-4 sm:px-6 py-2 sm:py-3 rounded-full font-semibold text-sm sm:text-base hover:bg-choma-brown/90 transition-colors flex items-center gap-2">
                    <i className="fi fi-rr-shop text-2xl pt-1"></i>
                    Order Now
                  </button>
                </div>
              </div>

              {/* Desktop Layout */}
              <div className="hidden lg:flex justify-center md:pl-8 lg:pl-32 items-center">
                {/* Left Content */}
                <div className="pr-8 w-1/2">
                  {/* Icons Row - Left aligned */}
                  <div className="flex gap-3 mb-12">
                    <div className="w-24 h-20 bg-choma-brown text-choma-white rounded-full flex 
                      items-center justify-center shadow-xl">
                      <Barbell size={32} weight="fill" />
                    </div>
                    <div className="w-20 h-20 rounded-full flex items-center justify-center 
                      border border-choma-brown">
                      <Barbell size={32} />
                    </div>
                    <div className="w-20 h-20 rounded-full flex items-center justify-center 
                      border border-choma-brown">
                      <Barbell size={32} />
                    </div>
                    <div className="w-20 h-20 rounded-full flex items-center justify-center
                      border border-choma-brown">
                      <Barbell size={32} />
                    </div>
                  </div>

                  <h3 className="text-choma-black text-5xl lg:text-7xl font-bold mb-8 tracking-tight">
                    FitFam Fuel 💪
                  </h3>
                  <p className="text-choma-black lg:text-[2.2rem] font-medium mb-6 leading-relaxed">
                    Premium nutrition designed for gym-goers, athletes, and health champions who demand excellence
                  </p>
                  <div className="text-choma-black/70 lg:text-xl">
                    ✓ High-protein meals ✓ Balanced macros ✓ Performance-focused nutrition
                  </div>
                </div>

                {/* Right Image */}
                <div className="relative h-[38rem] w-1/2 flex items-center justify-center">
                  <div className="rounded-[16px] overflow-hidden object-cover border-4 border-[#652815]">

                    {/* meally */}
                    <div className="absolute flex justify-center top-0 -left-12 z-10">
                      <div className="relative">
                        <img
                          src={badge}
                          alt="Choma Mobile App Interface"
                          className="w-36 h-auto"
                        />
                      </div>
                    </div>

                    <img
                      src={mealPlanImage1}
                      alt="Healthy FitFam Fuel Meal"
                      className="object-cover"
                    />
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>
      </section>

      {/* App Preview Section */}
      <section className="py-20 mt-20 md:mt-60">
        <div className="container-width">

          {/* Tab Selector */}
          <div className="flex justify-center mb-26 scale-110 ">
            <div className="scale-110 bg-choma-brown rounded-full p-2 flex border border-choma-white gap-5 shadow-lg">
              <button className="bg-choma-orange text-choma-brown px-6 py-3 rounded-full font-semibold text-sm">
                customer
              </button>
              <button className="text-white px-6 py-3 rounded-full font-medium text-sm hover:bg-white/10 transition-colors">
                chefs
              </button>
              <button className="text-white px-6 py-3 rounded-full font-medium text-sm hover:bg-white/10 transition-colors">
                riders
              </button>
            </div>
          </div>

          {/* Phone Mockup */}
          <div className="flex justify-center mt-12">
            <div className="relative">
              <img
                src={phonemockup}
                alt="Choma Mobile App Interface"
                className="w-96 h-auto drop-shadow-2xl"
              />
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

      <section>

        <div className="py-20 relative">
          <div className='text-center mb-20'>
            <p className='text-[#FBE0CE] text-center text-4xl md:text-6xl mt-4 font-bold tracking-tighter relative 
                    z-20 mb-6'>
              Still Hungry?
            </p>
            <h2 className='text-choma-orange text-center text-5xl md:text-8xl font-extrabold tracking-tighter relative z-20'>
              Choma Got You Covered!
            </h2>
            <p className='text-[#FBE0CE] text-center text-lg md:text-xl mt-6 max-w-2xl mx-auto leading-relaxed'>
              Discover why over <span className='text-choma-orange font-bold'>15,000+ food lovers</span> trust Choma
              for their daily dose of deliciousness. Join the revolution that's changing how Nigeria eats!
            </p>
          </div>

          {/* Feature Cards */}
          <div className="container-width relative z-10">
            <div className="flex gap-12 flex-wrap justify-center">
              {featureCards.map((card, index) => (
                <FeatureCard
                  key={index}
                  title={card.title}
                  description={card.description}
                  image={card.image}
                  imageAlt={card.imageAlt}
                  badges={card.badges}
                />
              ))}
            </div>

          </div>
        </div>
      </section>

      {/* Call to Action Section */}
      <section className="py-20 bg-[#c1840a] relative overflow-hidden">

        <div className="container-width relative z-10 text-center">
          <h2 className="text-white text-4xl md:text-6xl font-bold mb-6 tracking-tight">
            Ready to Transform Your Meals?
          </h2>
          <p className="text-white/90 text-xl md:text-2xl mb-12 max-w-3xl mx-auto leading-relaxed">
            Join thousands of satisfied customers who've made Choma their go-to food companion.
            Download now and get <span className="font-bold text-yellow-300">₦1,000 OFF</span> your first order!
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

          {/* Trust Indicators */}
          <div className="flex flex-wrap justify-center gap-8 text-white/80">
            <div className="flex items-center gap-2">
              <span className="text-2xl">⭐</span>
              <span className="font-medium">4.9/5 Rating</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-2xl">📱</span>
              <span className="font-medium">50,000+ Downloads</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-2xl">🚚</span>
              <span className="font-medium">30-Min Delivery</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-2xl">🔒</span>
              <span className="font-medium">Secure Payments</span>
            </div>
          </div>

          {/* Special Offer Badge */}
          <div className="mt-12">
            <div className="inline-flex items-center gap-3 bg-yellow-400 text-black px-6 py-3 rounded-full font-bold text-lg shadow-lg animate-pulse">
              <span>Limited Time: ₦1,000 OFF + Free Delivery!</span>
            </div>
          </div>
        </div>
      </section>

    </div>
  )
}

export default Home 