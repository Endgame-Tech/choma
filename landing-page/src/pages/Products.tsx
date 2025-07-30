import React from 'react'

const Products: React.FC = () => {
  return (
    <div className="min-h-screen pt-32 pb-16">
      <div className="container-width">
        <div className="text-center">
          <h1 className="text-4xl lg:text-6xl font-heading font-bold text-choma-brown mb-6">
            Our Products
          </h1>
          <p className="text-xl text-choma-dark max-w-3xl mx-auto">
            Discover our delicious range of authentic Nigerian meals, carefully crafted and delivered fresh to your doorstep.
          </p>
        </div>

        <div className="mt-16">
          <p className="text-center text-choma-dark text-lg">
            Products page coming soon! Check back later for our full menu.
          </p>
        </div>
      </div>
    </div>
  )
}

export default Products