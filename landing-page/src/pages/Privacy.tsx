import React from 'react'

const Privacy: React.FC = () => {
  return (
    <div className="pt-20 section-padding">
      <div className="container-width">
        <h1 className="text-4xl font-heading font-bold text-gray-900 mb-8">Privacy Policy</h1>
        <div className="prose prose-lg max-w-none">
          <p>
            At Choma, we take your privacy seriously. This policy outlines how we collect, 
            use, and protect your personal information.
          </p>
          <h2>Information We Collect</h2>
          <p>
            We collect information you provide directly to us, such as when you create an account, 
            place an order, or contact us for support.
          </p>
          <h2>How We Use Your Information</h2>
          <p>
            We use your information to provide our services, process orders, and improve your experience.
          </p>
        </div>
      </div>
    </div>
  )
}

export default Privacy