import React, { useEffect, useRef, useState } from 'react'
import { gsap } from 'gsap'
import chomablob1 from '../assets/images/chomablob.svg'
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
import femaleChefGif from '../assets/images/femaleChef.gif'
import bestPrice from '../assets/images/bestPrice.gif'
import FeatureCard from '../components/FeatureCard'
import { Barbell } from 'phosphor-react'

const Home: React.FC = () => {
  const titleRef = useRef<HTMLHeadingElement>(null)
  const subtitleRef = useRef<HTMLParagraphElement>(null)
  const foodRef = useRef<HTMLImageElement>(null)

  // Feature Cards Data
  const featureCards = [
    {
      title: "Premium Quality",
      description: "Every meal is prepared by certified chefs using fresh, high-quality ingredients sourced locally.",
      image: femaleChefGif,
      imageAlt: "Female Chef Cooking",
      badges: [
        { text: "4.9/5 Rating", type: "rating" as const },
      ]
    },
    {
      title: "Best Prices",
      description: "Enjoy restaurant-quality meals at pocket-friendly prices. No hidden charges, ever.",
      image: bestPrice,
      imageAlt: "Best Price Deals",
      badges: [
        { text: "From ₦3500", type: "price" as const }
      ]
    },
    {
      title: "Local & International",
      description: "From traditional Nigerian dishes to international cuisines, we have something for everyone.",
      image: takeAwayGif,
      imageAlt: "Take Away Delivery",
      badges: [
        { text: "4.9/5 Rating", type: "rating" as const },
      ]
    },
    {
      title: "Premium Quality",
      description: "Every meal is prepared by certified chefs using fresh, high-quality ingredients sourced locally.",
      image: femaleChefGif,
      imageAlt: "Female Chef Cooking",
      badges: [
        { text: "4.9/5 Rating", type: "rating" as const },
      ]
    },
    {
      title: "Best Prices",
      description: "Enjoy restaurant-quality meals at pocket-friendly prices. No hidden charges, ever.",
      image: bestPrice,
      imageAlt: "Best Price Deals",
      badges: [
        { text: "From ₦3500", type: "price" as const }
      ]
    },
    {
      title: "Local & International",
      description: "From traditional Nigerian dishes to international cuisines, we have something for everyone.",
      image: takeAwayGif,
      imageAlt: "Take Away Delivery",
      badges: [
        { text: "4.9/5 Rating", type: "rating" as const },
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
    <>


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
      <section className="py-10 ">

        <h1 ref={titleRef} className='text-choma-brown text-center text-7xl lg:text-9xl font-medium tracking-tighter relative'>
          Get <span className='font-extrabold'>Choma</span>
        </h1>

        <p ref={subtitleRef} className='text-choma-black px-[12]  md:px-[25%] lg:px-[30%] text-center text-[2rem] lg:text-5xl mt-4 tracking-tighter relative z-20'>
          Delicious Home Cooked Meals,<span className='font-bold'> Delivered To Your Doorstep</span>
        </p>

        {/* Blob1 */}
        <div className="absolute overflow-x-clip h-[150rem] w-full flex justify-center mt-40 pointer-events-none">
          <div className='absolute w-[1000px] md:w-[2900px] flex justify-center translate-x-12 z-[-11]'>
            <img src={chomablob1} className="object-contain" alt="Choma blob" />
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
          <h2 className='text-choma-white text-center text-3xl md:text-5xl px-3 font-medium tracking-tighter 
            md:max-w-[600px]'>
            Experience the authentic taste of Nigeria with our carefully crafted meals. From Jollof rice to Suya,
            we bring your favorite local dishes right to you.
          </h2>
        </div>

      </section>

      <div className='md:h-48'></div>

      {/* Meal Plan Section */}
      <section className="py-20 top-60 relative">
        <div className="container-width relative z-10">
          <h2 className='text-choma-black text-center text-3xl sm:text-4xl md:text-5xl font-bold tracking-tighter mb-16'>
            A meal plan made for you
          </h2>

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
                    FitFam Fuel
                  </h3>
                  <p className="text-choma-black text-sm sm:text-base font-medium mb-6">
                    Gym-goers, athletes, and health-conscious professionals
                  </p>

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
                    FitFam Fuel
                  </h3>
                  <p className="text-choma-black lg:text-[2.6rem] font-medium">
                    Gym-goers, athletes, and
                    health-conscious professionals
                  </p>
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
      <div className="absolute md:pt-0 overflow-x-clip -translate-y-[4%] md:-translate-y-[10%] h-[100%] 
                z-[-11] w-full flex justify-center pointer-events-none">
        <div className='absolute w-[270rem] md:w-[2400px] translate-x-[20rem]
                  md:translate-x-[5rem] scale-125 md:scale-10 '>
          <img src={chomablob2} alt="Choma blob" />
        </div>
      </div>

      <section>

        <div className="py-20 relative">
          <p className='text-[#FBE0CE] text-center text-5xl md:text-7xl mt-4 font-bold tracking-tighter relative 
                  z-20 mb-20 md:mb-28'>
            You don Chop?<br /> <span className='text-choma-orange'>Choma got you!</span>
          </p>

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

    </>
  )
}

export default Home 