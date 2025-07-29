import React from 'react'
import { StarIcon } from '@heroicons/react/24/solid'

const Testimonials: React.FC = () => {
  const testimonials = [
    {
      name: 'Adunni Okafor',
      role: 'Marketing Executive',
      image: 'https://images.unsplash.com/photo-1494790108755-2616b612b1c4?ixlib=rb-4.0.3&auto=format&fit=crop&w=687&q=80',
      rating: 5,
      text: 'The best food delivery service in Lagos! Fast, reliable, and the food always arrives hot. Choma has become my go-to for lunch at work.'
    },
    {
      name: 'Emeka Johnson',
      role: 'Software Engineer',
      image: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-4.0.3&auto=format&fit=crop&w=1170&q=80',
      rating: 5,
      text: 'Amazing variety of restaurants and cuisines. The app is super easy to use and tracking feature is brilliant. Highly recommended!'
    },
    {
      name: 'Fatima Abdul',
      role: 'Business Owner',
      image: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?ixlib=rb-4.0.3&auto=format&fit=crop&w=1170&q=80',
      rating: 5,
      text: 'Choma saved my dinner party! Quick delivery, excellent food quality, and great customer service. Will definitely use again.'
    }
  ]

  return (
    <section className="section-padding bg-white">
      <div className="container-width">
        <div className="text-center mb-16">
          <h2 className="text-4xl lg:text-5xl font-heading font-bold text-gray-900 mb-6">
            What Our Customers
            <span className="block text-primary-600">Say About Us</span>
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Don't just take our word for it. Here's what thousands of satisfied customers have to say about their Choma experience.
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {testimonials.map((testimonial, index) => (
            <div key={index} className="bg-gray-50 rounded-2xl p-8 hover:shadow-lg transition-shadow">
              <div className="flex items-center mb-4">
                {[...Array(testimonial.rating)].map((_, i) => (
                  <StarIcon key={i} className="w-5 h-5 text-yellow-400" />
                ))}
              </div>
              <p className="text-gray-700 mb-6 italic">"{testimonial.text}"</p>
              <div className="flex items-center">
                <img 
                  src={testimonial.image} 
                  alt={testimonial.name}
                  className="w-12 h-12 rounded-full mr-4"
                />
                <div>
                  <div className="font-semibold text-gray-900">{testimonial.name}</div>
                  <div className="text-gray-600 text-sm">{testimonial.role}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

export default Testimonials