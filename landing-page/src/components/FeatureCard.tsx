import React from 'react'

interface Badge {
  text: string
  type?: 'rating' | 'price'
}

interface FeatureCardProps {
  title: string
  description: string
  image: string
  imageAlt: string
  badges: Badge[]
}

const FeatureCard: React.FC<FeatureCardProps> = ({
  title,
  description,
  image,
  imageAlt,
  badges
}) => {
  return (
    <div className="rounded-3xl md:max-w-96 overflow-hidden border-2 border-choma-orange h-full flex flex-col">
      {/* Image Section */}
      <div className="bg-choma-brown h-64 flex items-center justify-center relative">
        <img 
          src={image} 
          alt={imageAlt} 
          className="w-full h-full object-cover"
        />
      </div>
      
      {/* Content Section */} 
      <div className="p-6 bg-choma-orange rounded-t-3xl flex-1 flex flex-col">
        <h4 className="text-choma-brown text-2xl font-bold mb-4">{title}</h4>
        <p className="text-choma-brown text-base mb-6 flex-1">
          {description}
        </p>
        
        {/* Badges - Always at bottom */}
        <div className="flex gap-2 mt-auto">
          {badges.map((badge, index) => (
            <span 
              key={index}
              className="bg-white text-choma-brown px-3 py-1 rounded-full text-sm font-semibold"
            >
              {badge.text}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}

export default FeatureCard