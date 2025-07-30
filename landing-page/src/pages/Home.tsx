import React, { useEffect, useRef, useState } from 'react'
import { gsap } from 'gsap'
import chomablob1 from '../assets/images/chomablob1.svg'
import herofood1 from '../assets/images/herofood/herofood1.png'
import herofood2 from '../assets/images/herofood/herofood2.png'
import googleplayStoreLogo from '../assets/images/googleplayStoreLogo.svg'
import appleLogo from '../assets/images/appleLogo.svg'
// import DownloadApp from '../components/DownloadApp'

const Home: React.FC = () => {
  const titleRef = useRef<HTMLHeadingElement>(null)
  const subtitleRef = useRef<HTMLParagraphElement>(null)
  const foodRef = useRef<HTMLImageElement>(null)
  
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
    }, 5000) // Change every 7 seconds
    
    return () => clearInterval(interval)
  }, [foodImages.length])

  return (
    <>

        
        <div className='h-48'></div>

        {/* Background pattern */}
        <div 
          className="fixed inset-0 pointer-events-none z-[-10]"
          style={{
            backgroundImage: "url('./src/assets/images/background.svg')",
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
            opacity: 0.1
          }}
        ></div>

        {/* Hero */}
        <section className="py-10 ">

          <h1 ref={titleRef} className='text-choma-brown text-center text-9xl font-medium tracking-tighter relative'>
            Get <span className='font-extrabold'>Choma</span>
          </h1>

          <p ref={subtitleRef} className='text-choma-dark text-center text-5xl mt-4 tracking-tighter relative z-20'>
            Delicious Home Cooked Meals, <br /> <span className='font-bold'> Delivered To Your Doorstep</span>
          </p>

          <div className="absolute overflow-hidden h-[150rem] w-full flex justify-center mt-40 pointer-events-none">
            {/* Blob */}
            <div className='absolute w-[2900px] pl-[100px] flex justify-center z-[-11]'>
            <img src={chomablob1} className="object-contain" />
            </div>
          </div>

          <div className="relative flex justify-center mt-20">
            <div className='w-[70%] relative'>
              <img 
                ref={foodRef}
                src={foodImages[currentFoodIndex]} 
                alt="Choma Food" 
                className="object-contain w-full h-[80rem]" 
              />
              
              {/* Download buttons positioned like in the design */}
              <div className="absolute left-8  top-44 transform -translate-y-1/2">
                <div className="mb-4 scale-150">
                  <button className="bg-choma-brown hover:bg-choma-brown/90 border border-choma-white text-white rounded-full px-6 py-3 flex items-center gap-3 transition-all duration-300 hover:scale-105 shadow-lg">
                    <img src={googleplayStoreLogo} alt="Google Play" className="w-6 h-6" />
                    <div className="text-left">
                      <div className="text-xs opacity-90">Download on</div>
                      <div className="text-sm font-semibold">Google Play</div>
                    </div>
                  </button>
                </div>
              </div>
              
              <div className="absolute right-8 top-60  scale-150">
                <button className="bg-choma-brown hover:bg-choma-brown/90 border border-choma-white text-white rounded-full px-6 py-3 flex items-center gap-3 transition-all duration-300 hover:scale-105 shadow-lg">
                  <img src={appleLogo} alt="Apple Store" className="w-6 h-6" />
                  <div className="text-left">
                    <div className="text-xs opacity-90">Download on</div>
                    <div className="text-sm font-semibold">Apple Store</div>
                  </div>
                </button>
              </div>
            </div>
          </div>

          <div className="flex w-full justify-center mt-10">
            <h2 className='text-choma-white text-center text-4xl font-medium tracking-tighter max-w-[400px]'>
              Experience the authentic taste of Nigeria with our carefully crafted meals. From Jollof rice to Suya, we bring your favorite local dishes right to you in under 30 minutes.
            </h2>
          </div>

        </section>

        <section>
        </section>


    </> 
  )
}

export default Home