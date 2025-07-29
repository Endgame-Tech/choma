import React from 'react'

const FAQ: React.FC = () => {
  const faqs = [
    {
      question: 'How long does delivery take?',
      answer: 'Most deliveries are completed within 30 minutes of placing your order.'
    },
    {
      question: 'What areas do you deliver to?',
      answer: 'We currently deliver across Lagos, Abuja, and Port Harcourt with plans to expand soon.'
    },
    {
      question: 'How can I track my order?',
      answer: 'You can track your order in real-time through our mobile app or website.'
    },
    {
      question: 'What payment methods do you accept?',
      answer: 'We accept credit/debit cards, bank transfers, and cash on delivery.'
    }
  ]

  return (
    <div className="pt-20 section-padding">
      <div className="container-width">
        <h1 className="text-4xl font-heading font-bold text-gray-900 mb-8">Frequently Asked Questions</h1>
        <div className="space-y-6">
          {faqs.map((faq, index) => (
            <div key={index} className="bg-white border border-gray-200 rounded-lg p-6">
              <h3 className="text-xl font-semibold text-gray-900 mb-2">{faq.question}</h3>
              <p className="text-gray-600">{faq.answer}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default FAQ