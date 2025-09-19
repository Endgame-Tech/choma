import React, { useEffect, useRef, useState } from 'react'
import { gsap } from 'gsap'
import chomablob1 from '../assets/images/chomablob1.svg'
import chomablob2 from '../assets/images/chomablob2.svg'
import herofood1 from '../assets/images/herofood/herofood1.png'
import mealPlanImage1 from '../assets/images/mealplanimage1.png'
import backgroundSvg from '../assets/images/background.svg'
import googleplayStoreLogo from '../assets/images/googleplayStoreLogo.svg'
import appleLogo from '../assets/images/appleLogo.svg'
import { ShoppingCart, Clock, Star, ForkKnife, Heart, Truck, Spinner } from 'phosphor-react'
import { MealPlanService } from '../services/mealplanService'
import type { MealPlan } from '../types/mealplan'

const Products: React.FC = () => {
  const titleRef = useRef<HTMLHeadingElement>(null)
  const subtitleRef = useRef<HTMLParagraphElement>(null)

  // State for dynamic meal plans
  const [featuredMealPlans, setFeaturedMealPlans] = useState<MealPlan[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Fetch meal plans on component mount
  useEffect(() => {
    const fetchMealPlans = async () => {
      try {
        setIsLoading(true)
        setError(null)

        // Get random meal plans for the featured section
        const mealPlans = await MealPlanService.getRandomMealPlans(6)
        setFeaturedMealPlans(mealPlans)
      } catch (err) {
        console.error('Error fetching meal plans:', err)
        setError('Failed to load meal plans. Please try again later.')
      } finally {
        setIsLoading(false)
      }
    }

    fetchMealPlans()
  }, [])

  // Subscription Plans Data
  const subscriptionPlans = [
    {
      name: 'Basic Plan',
      description: 'Perfect for individuals who want to try our service',
      price: '₦15,000',
      period: 'week',
      color: 'bg-yellow-200',
      popular: false,
      features: [
        '5 meals per week',
        'Basic Nigerian dishes',
        'Email support',
        'Free delivery'
      ]
    },
    {
      name: 'Premium Plan',
      description: 'Great for families and food enthusiasts',
      price: '₦45,000',
      period: 'week',
      color: 'bg-green-200',
      popular: true,
      features: [
        '14 meals per week',
        'Premium Nigerian dishes',
        'Priority support',
        'Free delivery',
        'Nutritional information',
        'Custom spice levels'
      ]
    },
    {
      name: 'Family Plan',
      description: 'Perfect for large families and groups',
      price: '₦75,000',
      period: 'week',
      color: 'bg-blue-200',
      popular: false,
      features: [
        '21 meals per week',
        'All dish categories',
        '24/7 support',
        'Free priority delivery',
        'Nutritional information',
        'Custom meal planning',
        'Bulk discounts'
      ]
    }
  ]

  // Product Categories Data
  const categories = [
    {
      id: 'traditional',
      title: 'Traditional Nigerian Meals',
      emoji: '🍛',
      description: 'Authentic recipes passed down through generations',
      color: 'bg-choma-orange',
      count: '25+ Dishes'
    },
    {
      id: 'grilled',
      title: 'Grilled & BBQ',
      emoji: '🔥',
      description: 'Perfectly seasoned and grilled to perfection',
      color: 'bg-choma-brown',
      count: '15+ Options'
    },
    {
      id: 'soups',
      title: 'Soups & Stews',
      emoji: '🥣',
      description: 'Rich, flavorful soups that warm your soul',
      color: 'bg-choma-orange',
      count: '12+ Varieties'
    },
    {
      id: 'snacks',
      title: 'Snacks & Sides',
      emoji: '🥙',
      description: 'Perfect companions to your main meals',
      color: 'bg-choma-brown',
      count: '20+ Items'
    },
    {
      id: 'drinks',
      title: 'Traditional Drinks',
      emoji: '🥤',
      description: 'Refreshing beverages to complete your meal',
      color: 'bg-choma-orange',
      count: '10+ Drinks'
    },
    {
      id: 'desserts',
      title: 'Sweet Treats',
      emoji: '🍮',
      description: 'Delightful desserts to end on a sweet note',
      color: 'bg-choma-brown',
      count: '8+ Desserts'
    }
  ]

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

  // Helper function to calculate average cost per meal
  const calculateAveragePerMeal = (mealPlan: MealPlan): number => {
    if (mealPlan.sampleMeals && mealPlan.sampleMeals.length > 0) {
      // Calculate average from sample meals pricing
      const totalSampleMealsCost = mealPlan.sampleMeals.reduce((sum, meal) => {
        return sum + (meal.pricing?.totalPrice || 0)
      }, 0)
      return totalSampleMealsCost / mealPlan.sampleMeals.length
    } else if (mealPlan.stats?.totalMealsAssigned && mealPlan.stats.totalMealsAssigned > 0) {
      // Calculate based on total plan price divided by total meals
      return mealPlan.price / mealPlan.stats.totalMealsAssigned
    } else if (mealPlan.totalMealsAssigned && mealPlan.totalMealsAssigned > 0) {
      // Fallback to totalMealsAssigned field
      return mealPlan.price / mealPlan.totalMealsAssigned
    } else {
      // Fallback: assume 3 meals per day for the duration
      const estimatedMeals = (mealPlan.durationWeeks || 1) * 7 * 3
      return mealPlan.price / estimatedMeals
    }
  }

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
          Our <span className='font-extrabold text-choma-orange'>Menu</span>
        </h1>

        <p ref={subtitleRef} className='text-choma-black px-[12] md:px-[25%] lg:px-[30%] text-center text-[2rem] lg:text-5xl mt-4 tracking-tighter relative z-20 leading-tight'>
          <span className='text-choma-brown font-bold'>100+ Authentic Dishes</span> Crafted with Love and Delivered with <span className='text-choma-orange font-extrabold'>Pride</span>
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
              src={herofood1}
              alt="Choma Delicious Food"
              className="object-contain w-full h-[40rem] md:h-[80rem]"
            />
          </div>
        </div>

        <div className="container-width flex w-full justify-center md:mt-36">
          <div className='text-center max-w-4xl'>
            <h2 className='text-choma-white text-center text-3xl md:text-5xl px-3 font-bold tracking-tighter mb-6'>
              From Street Food to Home Cooking 🇳🇬
            </h2>
            <p className='text-choma-white/90 text-xl md:text-2xl leading-relaxed'>
              Explore our diverse menu featuring <span className='text-choma-orange font-semibold'>traditional Nigerian classics</span>,
              <span className='text-choma-orange font-semibold'> modern fusion dishes</span>, and
              <span className='text-choma-orange font-semibold'> healthy meal plans</span> designed to satisfy every craving and dietary need.
            </p>
            <div className='mt-8 flex flex-wrap justify-center gap-8 text-choma-white/80'>
              <div className='flex items-center gap-2'>
                <span className='text-2xl'>👨‍🍳</span>
                <span className='font-medium'>Chef-Prepared</span>
              </div>
              <div className='flex items-center gap-2'>
                <span className='text-2xl'>🌶️</span>
                <span className='font-medium'>Authentic Spices</span>
              </div>
              <div className='flex items-center gap-2'>
                <span className='text-2xl'>🥗</span>
                <span className='font-medium'>Fresh Ingredients</span>
              </div>
              <div className='flex items-center gap-2'>
                <span className='text-2xl'>💝</span>
                <span className='font-medium'>Made with Love</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className='md:h-48'></div>

      {/* Product Categories Section */}
      <section className="py-20 relative">
        <div className="container-width relative z-10">
          <div className='text-center mb-16'>
            <h2 className='text-choma-black text-center text-3xl sm:text-4xl md:text-6xl font-bold tracking-tighter mb-6'>
              Explore Our <span className='text-choma-orange'>Categories</span>
            </h2>
            <p className='text-choma-black/80 text-lg md:text-xl max-w-3xl mx-auto leading-relaxed'>
              Discover your next favorite meal from our carefully curated categories, each featuring authentic recipes and fresh ingredients.
            </p>
          </div>

          {/* Categories Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-20">
            {categories.map((category) => (
              <div key={category.id} className={`${category.color} rounded-3xl p-8 text-center hover:scale-105 transition-all duration-300 cursor-pointer shadow-lg hover:shadow-xl`}>
                <div className="text-6xl mb-4">{category.emoji}</div>
                <h3 className="text-choma-black text-2xl font-bold mb-3">{category.title}</h3>
                <p className="text-choma-black/80 mb-4">{category.description}</p>
                <div className="bg-choma-black text-choma-white px-4 py-2 rounded-full inline-block font-semibold">
                  {category.count}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Meal Plans Section */}
      <section className="py-20 relative">
        <div className="container-width relative z-10">
          <div className='text-center mb-16'>
            <h2 className='text-choma-black text-center text-3xl sm:text-4xl md:text-6xl font-bold tracking-tighter mb-6'>
              <span className='text-choma-orange'>Featured</span> Meal Plans
            </h2>
            <p className='text-choma-black/80 text-lg md:text-xl max-w-3xl mx-auto leading-relaxed'>
              Discover our most popular meal plans, carefully designed by nutrition experts and loved by thousands of customers.
            </p>
          </div>

          {/* Loading State */}
          {isLoading && (
            <div className="flex justify-center items-center py-20">
              <div className="flex items-center gap-3 text-choma-brown">
                <Spinner size={32} className="animate-spin" />
                <span className="text-lg font-medium">Loading delicious meal plans...</span>
              </div>
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="text-center py-20">
              <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md mx-auto">
                <p className="text-red-600 font-medium mb-4">{error}</p>
                <button
                  onClick={() => window.location.reload()}
                  className="bg-choma-orange hover:bg-choma-orange/90 text-choma-black font-semibold px-6 py-2 rounded-full transition-colors"
                >
                  Try Again
                </button>
              </div>
            </div>
          )}

          {/* Featured Meal Plans Grid */}
          {!isLoading && !error && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {featuredMealPlans.map((mealPlan) => (
                <div key={mealPlan._id} className="bg-white rounded-3xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300 hover:scale-105 border-2 border-choma-orange/20">
                  {/* Meal Plan Image */}
                  <div className="relative h-64 bg-gradient-to-br from-choma-orange to-choma-brown">
                    <img
                      src={mealPlan.coverImage || mealPlanImage1}
                      alt={mealPlan.planName}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement
                        target.src = mealPlanImage1 // Fallback image
                      }}
                    />
                    {/* Badges */}
                    <div className="absolute top-4 left-4 flex flex-col gap-2">
                      {mealPlan.tag && (
                        <span className="bg-choma-orange text-choma-black px-3 py-1 rounded-full text-xs font-bold shadow-lg">
                          {mealPlan.tag}
                        </span>
                      )}
                      {mealPlan.targetAudience && (
                        <span className="bg-choma-brown text-choma-white px-3 py-1 rounded-full text-xs font-bold shadow-lg">
                          {mealPlan.targetAudience}
                        </span>
                      )}
                    </div>
                    {/* Price */}
                    <div className="absolute top-4 right-4 bg-choma-black text-choma-white px-4 py-2 rounded-full">
                      <span className="font-bold">₦{Math.round(calculateAveragePerMeal(mealPlan)).toLocaleString()}</span>
                      <span className="text-xs text-gray-300 ml-1">/meal</span>
                      {mealPlan.originalPrice && mealPlan.originalPrice > mealPlan.price && (
                        <div className="text-xs text-gray-300 line-through">
                          ₦{Math.round((mealPlan.originalPrice / (mealPlan.stats?.totalMealsAssigned || mealPlan.totalMealsAssigned || ((mealPlan.durationWeeks || 1) * 7 * 3)))).toLocaleString()}/meal
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Meal Plan Info */}
                  <div className="p-6">
                    <h3 className="text-choma-black text-xl font-bold mb-2">{mealPlan.planName}</h3>
                    <p className="text-choma-black/70 text-sm mb-4 leading-relaxed">
                      {mealPlan.description || `A comprehensive ${mealPlan.durationWeeks}-week meal plan designed for ${mealPlan.targetAudience?.toLowerCase()} lifestyle.`}
                    </p>

                    {/* Rating and Reviews */}
                    <div className="flex items-center gap-2 mb-4">
                      <div className="flex items-center gap-1">
                        <Star size={16} weight="fill" className="text-yellow-500" />
                        <span className="font-semibold text-choma-black">{mealPlan.avgRating?.toFixed(1) || 'New'}</span>
                      </div>
                      <span className="text-choma-black/50 text-sm">
                        ({mealPlan.totalReviews || 0} reviews)
                      </span>
                    </div>

                    {/* Plan Details */}
                    <div className="flex justify-between items-center text-sm text-choma-black/70 mb-4">
                      <div className="flex items-center gap-1">
                        <Clock size={14} />
                        <span>{mealPlan.duration || `${mealPlan.durationWeeks} weeks`}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-choma-orange font-semibold">
                          {mealPlan.meals || `${mealPlan.stats?.avgMealsPerDay || 3} meals/day`}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <ForkKnife size={14} />
                        <span>{mealPlan.stats?.totalMealsAssigned || 0} meals</span>
                      </div>
                    </div>

                    {/* Total Plan Price */}
                    <div className="bg-choma-orange/10 rounded-lg p-3 mb-6">
                      <div className="flex justify-between items-center">
                        <span className="text-choma-black/70 text-sm">Total Plan Cost:</span>
                        <span className="font-bold text-choma-black">₦{mealPlan.price?.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between items-center mt-1">
                        <span className="text-choma-black/70 text-xs">Average per meal:</span>
                        <span className="font-semibold text-choma-orange text-sm">₦{Math.round(calculateAveragePerMeal(mealPlan)).toLocaleString()}</span>
                      </div>
                    </div>

                    {/* Features */}
                    {mealPlan.planFeatures && mealPlan.planFeatures.length > 0 && (
                      <div className="mb-6">
                        <div className="flex flex-wrap gap-1">
                          {mealPlan.planFeatures.slice(0, 3).map((feature, index) => (
                            <span
                              key={index}
                              className="bg-choma-orange/20 text-choma-brown px-2 py-1 rounded-full text-xs font-medium"
                            >
                              {feature}
                            </span>
                          ))}
                          {mealPlan.planFeatures.length > 3 && (
                            <span className="bg-choma-brown/20 text-choma-brown px-2 py-1 rounded-full text-xs font-medium">
                              +{mealPlan.planFeatures.length - 3} more
                            </span>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex gap-2">
                      <button className="flex-1 bg-choma-orange hover:bg-choma-orange/90 text-choma-black font-bold py-3 px-4 rounded-full transition-colors flex items-center justify-center gap-2">
                        <ShoppingCart size={18} />
                        Subscribe Now
                      </button>
                      <button
                        className="bg-choma-brown hover:bg-choma-brown/90 text-choma-white p-3 rounded-full transition-colors"
                        aria-label="Add to favorites"
                        title="Add to favorites"
                      >
                        <Heart size={18} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Empty State */}
          {!isLoading && !error && featuredMealPlans.length === 0 && (
            <div className="text-center py-20">
              <div className="bg-choma-orange/10 border border-choma-orange/20 rounded-lg p-8 max-w-md mx-auto">
                <h3 className="text-choma-brown text-xl font-bold mb-4">No Meal Plans Available</h3>
                <p className="text-choma-brown/70 mb-6">
                  We're working on adding delicious meal plans. Check back soon!
                </p>
                <button
                  onClick={() => window.location.reload()}
                  className="bg-choma-orange hover:bg-choma-orange/90 text-choma-black font-semibold px-6 py-3 rounded-full transition-colors"
                >
                  Refresh Page
                </button>
              </div>
            </div>
          )}
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

      {/* Meal Plans Section */}
      <section className="py-20 relative">
        <div className="container-width relative z-10">
          <div className='text-center mb-16'>
            <h2 className='text-choma-white text-center text-3xl sm:text-4xl md:text-6xl font-bold tracking-tighter mb-6'>
              Weekly <span className='text-choma-orange'>Meal Plans</span>
            </h2>
            <p className='text-choma-white/90 text-lg md:text-xl max-w-3xl mx-auto leading-relaxed'>
              Subscribe to our meal plans and never worry about what to eat. Convenient, nutritious, and delicious meals delivered weekly.
            </p>
          </div>

          {/* Meal Plans Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {subscriptionPlans.map((plan) => (
              <div key={plan.name} className={`${plan.color} rounded-3xl p-8 relative hover:scale-105 transition-all duration-300 shadow-lg hover:shadow-xl ${plan.popular ? 'ring-4 ring-choma-white' : ''}`}>
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <span className="bg-choma-black text-choma-white px-6 py-2 rounded-full text-sm font-bold">
                      Most Popular
                    </span>
                  </div>
                )}

                <div className="text-center">
                  <h3 className="text-choma-black text-3xl font-bold mb-4">{plan.name}</h3>
                  <p className="text-choma-black/80 mb-6">{plan.description}</p>

                  {/* Price */}
                  <div className="mb-6">
                    <span className="text-choma-black text-4xl font-bold">{plan.price}</span>
                    <span className="text-choma-black/70 text-lg">/{plan.period}</span>
                  </div>

                  {/* Features */}
                  <ul className="text-choma-black/80 mb-8 space-y-2">
                    {plan.features.map((feature, featureIndex) => (
                      <li key={featureIndex} className="flex items-center justify-center gap-2">
                        <span className="text-green-600">✓</span>
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>

                  {/* Subscribe Button */}
                  <button className="w-full bg-choma-black hover:bg-choma-brown text-choma-white font-bold py-4 px-6 rounded-full transition-colors">
                    Subscribe Now
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Call to Action Section */}
      <section className="py-20 bg-gradient-to-br from-choma-orange to-choma-brown relative overflow-hidden">
        {/* Background Elements */}
        {/* <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 right-0 w-96 h-96 bg-white rounded-full -translate-y-32 translate-x-32"></div>
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-white rounded-full translate-y-32 -translate-x-32"></div>
        </div> */}

        <div className="container-width relative z-10 text-center">
          <h2 className="text-white text-4xl md:text-6xl font-bold mb-6 tracking-tight">
            Hungry? We've Got You Covered!
          </h2>
          <p className="text-white/90 text-xl md:text-2xl mb-12 max-w-3xl mx-auto leading-relaxed">
            Download the Choma app and enjoy <span className="font-bold text-yellow-300">₦1,000 OFF</span> your first order.
            Fast delivery, fresh food, authentic flavors - all at your fingertips!
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

          {/* Order Stats */}
          <div className="flex flex-wrap justify-center gap-8 text-white/80">
            <div className="flex items-center gap-2">
              <Truck size={24} />
              <span className="font-medium">Free delivery over ₦5,000</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock size={24} />
              <span className="font-medium">Average 30-min delivery</span>
            </div>
            <div className="flex items-center gap-2">
              <Star size={24} weight="fill" />
              <span className="font-medium">4.9/5 customer rating</span>
            </div>
            <div className="flex items-center gap-2">
              <Heart size={24} weight="fill" />
              <span className="font-medium">15K+ happy customers</span>
            </div>
          </div>

          {/* Special Offer Badge */}
          <div className="mt-12">
            <div className="inline-flex items-center gap-3 bg-yellow-400 text-black px-6 py-3 rounded-full font-bold text-lg shadow-lg animate-pulse">
              {/* <span className="text-2xl">🎉</span> */}
              <span>Order now and get ₦1,000 OFF + Free delivery!</span>
              {/* <span className="text-2xl">🎉</span> */}
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

export default Products