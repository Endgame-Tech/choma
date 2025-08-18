import React from 'react'

const About: React.FC = () => {
  return (
    <div className="pt-20 section-padding">
      <div className="container-width">
        <h1 className="text-4xl font-heading font-bold text-gray-900 mb-8">About Choma</h1>
        <div className="prose prose-lg max-w-none">
          <p>
            Choma is Nigeria's premier food delivery platform, connecting hungry customers 
            with their favorite restaurants and local eateries across major cities.
          </p>
          <p>
            Founded in 2024, we're committed to making delicious, authentic Nigerian cuisine 
            and international dishes accessible to everyone, delivered fast and fresh to your doorstep.
          </p>
        </div>
      </div>
    </div>
  )
}

export default About