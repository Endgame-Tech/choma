import React from 'react'

const Terms: React.FC = () => {
  return (
    <div className="pt-20 section-padding">
      <div className="container-width">
        <h1 className="text-4xl font-heading font-bold text-gray-900 mb-8">Terms of Service</h1>
        <div className="prose prose-lg max-w-none">
          <p>
            Welcome to Choma. These terms and conditions outline the rules and regulations 
            for the use of our service.
          </p>
          <h2>Acceptance of Terms</h2>
          <p>
            By accessing and using this service, you accept and agree to be bound by the terms 
            and provision of this agreement.
          </p>
          <h2>Use License</h2>
          <p>
            Permission is granted to temporarily use our service for personal, non-commercial use only.
          </p>
        </div>
      </div>
    </div>
  )
}

export default Terms