import React, { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { Link } from 'react-router-dom'
import type { RegisterData } from '../types'
import logo from '../assets/logo.svg'

const specialtyOptions = [
  'Nigerian Cuisine',
  'Continental Cuisine',
  'Asian Cuisine',
  'Italian Cuisine',
  'Chinese Cuisine',
  'Indian Cuisine',
  'Lebanese Cuisine',
  'Healthy Meals',
  'Vegetarian',
  'Vegan',
  'Keto Diet',
  'Protein-Rich',
  'Low Carb',
  'Gluten-Free',
  'Mediterranean',
  'Diabetic-Friendly',
  'Kids Meals',
  'Halal',
  'Kosher'
]

const nigerianStates = [
  'Abia', 'Adamawa', 'Akwa Ibom', 'Anambra', 'Bauchi', 'Bayelsa', 'Benue', 'Borno',
  'Cross River', 'Delta', 'Ebonyi', 'Edo', 'Ekiti', 'Enugu', 'Gombe', 'Imo',
  'Jigawa', 'Kaduna', 'Kano', 'Katsina', 'Kebbi', 'Kogi', 'Kwara', 'Lagos',
  'Nasarawa', 'Niger', 'Ogun', 'Ondo', 'Osun', 'Oyo', 'Plateau', 'Rivers',
  'Sokoto', 'Taraba', 'Yobe', 'Zamfara', 'FCT'
]

const kitchenEquipmentOptions = [
  'Gas Cooker', 'Electric Cooker', 'Microwave', 'Oven', 'Blender', 'Food Processor',
  'Pressure Cooker', 'Rice Cooker', 'Deep Fryer', 'Grilling Equipment', 'Refrigerator',
  'Freezer', 'Kitchen Scale', 'Mixing Bowls', 'Professional Knives', 'Cutting Boards'
]

const languageOptions = [
  'English', 'Hausa', 'Yoruba', 'Igbo', 'Pidgin English', 'Fulfulde', 'Kanuri',
  'Ibibio', 'Tiv', 'Ijaw', 'French', 'Arabic', 'Other'
]

const certificationOptions = [
  'HACCP Certification', 'Food Safety Certificate', 'Culinary School Diploma',
  'ServSafe Certification', 'Nutrition Certification', 'Catering License',
  'Health Department Permit', 'Other'
]

const Register: React.FC = () => {
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [formData, setFormData] = useState<RegisterData>({
    // Personal Information
    fullName: '',
    email: '',
    phone: '',
    alternatePhone: '',
    dateOfBirth: '',
    gender: 'Male',
    password: '',
    confirmPassword: '',

    // Identity Verification
    identityVerification: {
      idType: 'National ID',
      idNumber: '',
      idExpiryDate: ''
    },

    // Professional Details
    specialties: [],
    experience: 0,
    culinaryEducation: '',
    previousWorkExperience: '',
    certifications: [],
    languagesSpoken: ['English'],

    // Location & Service Area
    location: {
      streetAddress: '',
      city: '',
      state: '',
      postalCode: '',
      country: 'Nigeria',
      serviceRadius: 5
    },

    // Kitchen & Equipment
    kitchenDetails: {
      hasOwnKitchen: true,
      kitchenEquipment: [],
      canCookAtCustomerLocation: false,
      transportationMethod: 'Own Vehicle'
    },

    // Availability
    availability: {
      daysAvailable: [],
      hoursPerDay: {
        start: '08:00',
        end: '18:00'
      },
      maxOrdersPerDay: 5
    },

    // Emergency Contact
    emergencyContact: {
      name: '',
      relationship: '',
      phone: ''
    },

    // References
    references: [{
      name: '',
      relationship: '',
      phone: '',
      email: ''
    }],

    // Bank Details
    bankDetails: {
      accountName: '',
      accountNumber: '',
      bankName: '',
      bankCode: '',
      bvn: ''
    },

    // Profile & Portfolio
    profilePhoto: '',
    portfolioImages: [],
    bio: '',

    // Health & Safety
    healthCertificates: [],
    foodSafetyCertification: '',

    // Legal Agreements
    agreedToTerms: false,
    agreedToPrivacyPolicy: false,
    agreedToBackgroundCheck: false
  })

  const [currentStep, setCurrentStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const totalSteps = 7

  const { register } = useAuth()

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    const isCheckbox = type === 'checkbox';
    const checked = isCheckbox && 'checked' in e.target ? (e.target as HTMLInputElement).checked : undefined;

    if (name.includes('.')) {
      const [parent, child, grandchild] = name.split('.')
      if (grandchild) {
        setFormData(prev => ({
          ...prev,
          [parent]: {
            ...prev[parent as keyof RegisterData] as object,
            [child]: {
              ...(prev[parent as keyof RegisterData] as any)[child],
              [grandchild]: isCheckbox ? checked :
                name.includes('experience') || name.includes('maxOrdersPerDay') || name.includes('serviceRadius')
                  ? parseInt(value) || 0 : value
            }
          }
        }))
      } else {
        setFormData(prev => ({
          ...prev,
          [parent]: {
            ...((prev[parent as keyof RegisterData] as object) || {}),
            [child]: isCheckbox ? checked :
              name.includes('experience') || name.includes('maxOrdersPerDay') || name.includes('serviceRadius')
                ? parseInt(value) || 0 : value
          }
        }))
      }
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: isCheckbox ? checked :
          name === 'experience' || name === 'maxOrdersPerDay' || name === 'serviceRadius'
            ? parseInt(value) || 0 : value
      }))
    }
  }

  const handleArrayToggle = (arrayName: keyof RegisterData, item: string) => {
    setFormData(prev => ({
      ...prev,
      [arrayName]: (prev[arrayName] as string[]).includes(item)
        ? (prev[arrayName] as string[]).filter(i => i !== item)
        : [...(prev[arrayName] as string[]), item]
    }))
  }

  const handleNestedArrayToggle = (parent: string, arrayName: string, item: string) => {
    setFormData(prev => ({
      ...prev,
      [parent]: {
        ...((prev[parent as keyof RegisterData] as object) || {}),
        [arrayName]: ((prev[parent as keyof RegisterData] as any)[arrayName] as string[]).includes(item)
          ? ((prev[parent as keyof RegisterData] as any)[arrayName] as string[]).filter((i: string) => i !== item)
          : [...((prev[parent as keyof RegisterData] as any)[arrayName] as string[]), item]
      }
    }))
  }

  const addReference = () => {
    setFormData(prev => ({
      ...prev,
      references: [...prev.references, { name: '', relationship: '', phone: '', email: '' }]
    }))
  }

  const removeReference = (index: number) => {
    setFormData(prev => ({
      ...prev,
      references: prev.references.filter((_, i) => i !== index)
    }))
  }

  const updateReference = (index: number, field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      references: prev.references.map((ref, i) =>
        i === index ? { ...ref, [field]: value } : ref
      )
    }))
  }

  const validateStep = (step: number): boolean => {
    switch (step) {
      case 1: // Personal Information
        return !!(formData.fullName && formData.email && formData.phone && formData.dateOfBirth &&
          formData.password && formData.confirmPassword)
      case 2: // Identity Verification
        return !!(formData.identityVerification.idType && formData.identityVerification.idNumber)
      case 3: // Professional Details
        return !!(formData.specialties.length > 0 && formData.experience >= 0 && formData.languagesSpoken.length > 0)
      case 4: // Location & Service Area
        return !!(formData.location.streetAddress && formData.location.city && formData.location.state)
      case 5: // Kitchen & Availability
        return !!(formData.kitchenDetails.kitchenEquipment.length > 0 && formData.availability.daysAvailable.length > 0)
      case 6: // References & Bank Details
        return !!(formData.emergencyContact.name && formData.emergencyContact.phone &&
          formData.bankDetails.accountName && formData.bankDetails.accountNumber && formData.bankDetails.bankName)
      case 7: // Terms & Conditions
        return !!(formData.agreedToTerms && formData.agreedToPrivacyPolicy && formData.agreedToBackgroundCheck)
      default:
        return true
    }
  }

  const nextStep = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => prev + 1)
      setError(null)
    } else {
      setError('Please fill in all required fields')
    }
  }

  const prevStep = () => {
    setCurrentStep(prev => prev - 1)
    setError(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match')
      return
    }

    if (!validateStep(totalSteps)) {
      setError('Please fill in all required fields')
      return
    }

    setError(null)
    setLoading(true)

    try {
      await register(formData)
      setSuccess(true)
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10 text-center">
            <div className="text-6xl mb-4">✅</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Application Submitted!
            </h2>
            <p className="text-gray-600 mb-6">
              Thank you for applying to become a choma chef. Your application is now under review by our admin team.
            </p>
            <p className="text-sm text-gray-500 mb-6">
              You'll receive an email notification once your application is approved. This usually takes 1-2 business days.
            </p>
            <Link
              to="/login"
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-choma-black hover:bg-choma-brown"
            >
              Back to Login
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <div className="flex justify-center">
            <img src={logo} alt="getChoma Logo" className="w-20" />
          </div>
          <h1 className="text-3xl font-extrabold text-gray-900">
            Become a choma Chef
          </h1>
          <p className="mt-2 text-gray-600">
            Join our network of professional chefs
          </p>
        </div>

        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            {Array.from({ length: totalSteps }, (_, i) => i + 1).map((step) => (
              <div key={step} className="flex items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium ${currentStep >= step
                  ? 'bg-choma-black text-white'
                  : 'bg-gray-200 text-gray-600'
                  }`}>
                  {step}
                </div>
                {step < totalSteps && (
                  <div className={`w-12 h-1 mx-1 ${currentStep > step ? 'bg-choma-black' : 'bg-gray-200'
                    }`} />
                )}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1 text-xs text-gray-600 mt-2">
            <span>Personal</span>
            <span>Identity</span>
            <span>Professional</span>
            <span>Location</span>
            <span>Kitchen</span>
            <span>References</span>
            <span>Terms</span>
          </div>
        </div>

        <div className="bg-white shadow sm:rounded-lg">
          <form onSubmit={handleSubmit} className="p-6">
            {error && (
              <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
                {error}
              </div>
            )}

            {/* Step 1: Personal Information */}
            {currentStep === 1 && (
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900">Personal Information</h3>
                <p className="text-sm text-gray-600">Please provide your basic personal details</p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Full Name *</label>
                    <input
                      title="Enter your Your Full Name"
                      type="text"
                      name="fullName"
                      required
                      value={formData.fullName}
                      onChange={handleInputChange}
                      placeholder="Enter your full name"
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-choma-brown focus:border-choma-brown"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Gender *</label>
                    <select
                      name="gender"
                      required
                      value={formData.gender}
                      onChange={handleInputChange}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-choma-brown focus:border-choma-brown"
                      title="Select your gender"
                      aria-label="Gender"
                    >
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Date of Birth *</label>
                  <input
                    type="date"
                    name="dateOfBirth"
                    required
                    value={formData.dateOfBirth}
                    onChange={handleInputChange}
                    max={new Date(Date.now() - 18 * 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-choma-brown focus:border-choma-brown"
                    title="Your date of birth"
                    aria-label="Date of Birth"
                  />
                  <p className="text-xs text-gray-500 mt-1">You must be at least 18 years old</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Email Address *</label>
                  <input
                    type="email"
                    name="email"
                    required
                    value={formData.email}
                    onChange={handleInputChange}
                    placeholder="your.email@example.com"
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-choma-brown focus:border-choma-brown"
                    title="Your email address"
                    aria-label="Email Address"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Primary Phone Number *</label>
                    <input
                      type="tel"
                      name="phone"
                      required
                      value={formData.phone}
                      onChange={handleInputChange}
                      placeholder="+2348123456789"
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-choma-brown focus:border-choma-brown"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Alternate Phone Number</label>
                    <input
                      type="tel"
                      name="alternatePhone"
                      value={formData.alternatePhone}
                      onChange={handleInputChange}
                      placeholder="+2348987654321"
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-choma-brown focus:border-choma-brown"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Password *</label>
                    <div className="mt-1 relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        name="password"
                        required
                        value={formData.password}
                        onChange={handleInputChange}
                        placeholder="Create a strong password"
                        className="block w-full px-3 py-2 pr-10 border border-gray-300 rounded-md focus:ring-choma-brown focus:border-choma-brown"
                      />
                      <button
                        type="button"
                        className="absolute inset-y-0 right-0 pr-3 flex items-center"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? (
                          <svg className="h-5 w-5 text-gray-400 hover:text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                          </svg>
                        ) : (
                          <svg className="h-5 w-5 text-gray-400 hover:text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        )}
                      </button>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">At least 8 characters with numbers and symbols</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Confirm Password *</label>
                    <div className="mt-1 relative">
                      <input
                        type={showConfirmPassword ? "text" : "password"}
                        name="confirmPassword"
                        required
                        value={formData.confirmPassword}
                        onChange={handleInputChange}
                        placeholder="Confirm your password"
                        className="block w-full px-3 py-2 pr-10 border border-gray-300 rounded-md focus:ring-choma-brown focus:border-choma-brown"
                      />
                      <button
                        type="button"
                        className="absolute inset-y-0 right-0 pr-3 flex items-center"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      >
                        {showConfirmPassword ? (
                          <svg className="h-5 w-5 text-gray-400 hover:text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                          </svg>
                        ) : (
                          <svg className="h-5 w-5 text-gray-400 hover:text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Identity Verification */}
            {currentStep === 2 && (
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900">Identity Verification</h3>
                <p className="text-sm text-gray-600">We need to verify your identity for security purposes</p>

                <div>
                  <label className="block text-sm font-medium text-gray-700">ID Type *</label>
                  <select
                    name="identityVerification.idType"
                    required
                    value={formData.identityVerification.idType}
                    onChange={handleInputChange}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-choma-brown focus:border-choma-brown"
                    title="Select your ID type"
                    aria-label="ID Type"
                  >
                    <option value="National ID">National ID</option>
                    <option value="Driver License">Driver License</option>
                    <option value="International Passport">International Passport</option>
                    <option value="Voter Card">Voter Card</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">ID Number *</label>
                  <input
                    type="text"
                    name="identityVerification.idNumber"
                    required
                    value={formData.identityVerification.idNumber}
                    onChange={handleInputChange}
                    placeholder="Enter your ID number"
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-choma-brown focus:border-choma-brown"
                    title="Your identification number"
                    aria-label="ID Number"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">ID Expiry Date</label>
                  <input
                    type="date"
                    name="identityVerification.idExpiryDate"
                    value={formData.identityVerification.idExpiryDate}
                    onChange={handleInputChange}
                    min={new Date().toISOString().split('T')[0]}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-choma-brown focus:border-choma-brown"
                    title="Expiration date of your ID"
                    aria-label="ID Expiry Date"
                  />
                  <p className="text-xs text-gray-500 mt-1">Leave blank if ID doesn't expire</p>
                </div>

                <div className="bg-blue-50 border border-choma-brown/20 rounded-lg p-4">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-choma-brown" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-choma-black">Identity Verification</h3>
                      <div className="mt-2 text-sm text-choma-brown">
                        <p>Your identity information will be verified by our admin team. This helps ensure the safety and security of our platform.</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Step 3: Professional Details */}
            {currentStep === 3 && (
              <div className="space-y-6">
                <h3 className="text-lg font-medium text-gray-900">Professional Details</h3>
                <p className="text-sm text-gray-600">Tell us about your culinary experience and skills</p>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Cooking Specialties * (Select at least one)</label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {specialtyOptions.map((specialty) => (
                      <label key={specialty} className="flex items-center p-2 border rounded-lg hover:bg-gray-50">
                        <input
                          type="checkbox"
                          checked={formData.specialties.includes(specialty)}
                          onChange={() => handleArrayToggle('specialties', specialty)}
                          className="h-4 w-4 text-choma-black focus:ring-choma-brown border-gray-300 rounded"
                        />
                        <span className="ml-2 text-sm text-gray-700">{specialty}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Years of Experience *</label>
                    <input
                      type="number"
                      name="experience"
                      min="0"
                      max="50"
                      required
                      value={formData.experience}
                      onChange={handleInputChange}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-choma-brown focus:border-choma-brown"
                      title="Enter your years of experience"
                      placeholder="Years of experience"
                      aria-label="Years of Experience"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Languages Spoken * (Select at least one)</label>
                    <div className="mt-2 max-h-32 overflow-y-auto border border-gray-300 rounded-md p-2">
                      {languageOptions.map((language) => (
                        <label key={language} className="flex items-center py-1">
                          <input
                            type="checkbox"
                            checked={formData.languagesSpoken.includes(language)}
                            onChange={() => handleArrayToggle('languagesSpoken', language)}
                            className="h-4 w-4 text-choma-black focus:ring-choma-brown border-gray-300 rounded"
                          />
                          <span className="ml-2 text-sm text-gray-700">{language}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Culinary Education</label>
                  <textarea
                    name="culinaryEducation"
                    rows={3}
                    value={formData.culinaryEducation}
                    onChange={handleInputChange}
                    placeholder="e.g., Culinary Arts Diploma from XYZ Institute, Chef Training Program..."
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-choma-brown focus:border-choma-brown"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Previous Work Experience</label>
                  <textarea
                    name="previousWorkExperience"
                    rows={3}
                    value={formData.previousWorkExperience}
                    onChange={handleInputChange}
                    placeholder="e.g., Head Chef at ABC Restaurant (2020-2023), Private Chef for families..."
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-choma-brown focus:border-choma-brown"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Certifications & Licenses</label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {certificationOptions.map((cert) => (
                      <label key={cert} className="flex items-center p-2 border rounded-lg hover:bg-gray-50">
                        <input
                          type="checkbox"
                          checked={formData.certifications.includes(cert)}
                          onChange={() => handleArrayToggle('certifications', cert)}
                          className="h-4 w-4 text-choma-black focus:ring-choma-brown border-gray-300 rounded"
                        />
                        <span className="ml-2 text-sm text-gray-700">{cert}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Brief Bio</label>
                  <textarea
                    name="bio"
                    rows={4}
                    value={formData.bio}
                    onChange={handleInputChange}
                    placeholder="Tell customers about yourself, your cooking style, and what makes your food special..."
                    maxLength={500}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-choma-brown focus:border-choma-brown"
                  />
                  <p className="text-xs text-gray-500 mt-1">{formData.bio?.length || 0}/500 characters</p>
                </div>
              </div>
            )}

            {/* Step 4: Location & Service Area */}
            {currentStep === 4 && (
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900">Location & Service Area</h3>
                <p className="text-sm text-gray-600">Let us know where you're located and how far you can serve</p>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Street Address *</label>
                  <input
                    type="text"
                    name="location.streetAddress"
                    required
                    value={formData.location.streetAddress}
                    onChange={handleInputChange}
                    placeholder="e.g., No. 123 Adebayo Street"
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-choma-brown focus:border-choma-brown"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">City *</label>
                    <input
                      type="text"
                      name="location.city"
                      required
                      value={formData.location.city}
                      onChange={handleInputChange}
                      placeholder="e.g., Lagos"
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-choma-brown focus:border-choma-brown"
                    />
                  </div>

                  <div>
                    <label htmlFor="location-state" className="block text-sm font-medium text-gray-700">State *</label>
                    <select
                      id="location-state"
                      name="location.state"
                      required
                      value={formData.location.state}
                      onChange={handleInputChange}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-choma-brown focus:border-choma-brown"
                      title="Select your state"
                      aria-label="State"
                    >
                      <option value="">Select State</option>
                      {nigerianStates.map((state) => (
                        <option key={state} value={state}>{state}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Postal Code</label>
                    <input
                      type="text"
                      name="location.postalCode"
                      value={formData.location.postalCode}
                      onChange={handleInputChange}
                      placeholder="e.g., 100001"
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-choma-brown focus:border-choma-brown"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Service Radius (km) *</label>
                    <input
                      type="number"
                      name="location.serviceRadius"
                      min="1"
                      max="50"
                      required
                      value={formData.location.serviceRadius}
                      onChange={handleInputChange}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-choma-brown focus:border-choma-brown"
                      title="Enter your service radius in kilometers"
                      placeholder="Enter distance in km"
                      aria-label="Service Radius in Kilometers"
                    />
                    <p className="text-xs text-gray-500 mt-1">How far are you willing to travel/deliver? (1-50 km)</p>
                  </div>
                </div>
              </div>
            )}

            {/* Step 5: Kitchen & Availability */}
            {currentStep === 5 && (
              <div className="space-y-6">
                <h3 className="text-lg font-medium text-gray-900">Kitchen & Availability</h3>
                <p className="text-sm text-gray-600">Tell us about your kitchen setup and when you're available</p>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">Kitchen Setup</label>
                  <div className="space-y-3">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        name="kitchenDetails.hasOwnKitchen"
                        checked={formData.kitchenDetails.hasOwnKitchen}
                        onChange={handleInputChange}
                        className="h-4 w-4 text-choma-black focus:ring-choma-brown border-gray-300 rounded"
                      />
                      <span className="ml-2 text-sm text-gray-700">I have my own fully equipped kitchen</span>
                    </label>

                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Kitchen Equipment * (Select all that apply)</label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {kitchenEquipmentOptions.map((equipment) => (
                      <label key={equipment} className="flex items-center p-2 border rounded-lg hover:bg-gray-50">
                        <input
                          type="checkbox"
                          checked={formData.kitchenDetails.kitchenEquipment.includes(equipment)}
                          onChange={() => handleNestedArrayToggle('kitchenDetails', 'kitchenEquipment', equipment)}
                          className="h-4 w-4 text-choma-black focus:ring-choma-brown border-gray-300 rounded"
                        />
                        <span className="ml-2 text-sm text-gray-700">{equipment}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Transportation Method *</label>
                  <select
                    name="kitchenDetails.transportationMethod"
                    required
                    value={formData.kitchenDetails.transportationMethod}
                    onChange={handleInputChange}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-choma-brown focus:border-choma-brown"
                    title="Select your transportation method"
                    aria-label="Transportation Method"
                  >
                    <option value="Own Vehicle">Own Vehicle</option>
                    <option value="Motorcycle">Motorcycle</option>
                    <option value="Public Transport">Public Transport</option>
                    <option value="Delivery Service">Delivery Service Partner</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Days Available * (Select at least one)</label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map((day) => (
                      <label key={day} className="flex items-center p-2 border rounded-lg hover:bg-gray-50">
                        <input
                          type="checkbox"
                          checked={formData.availability.daysAvailable.includes(day)}
                          onChange={() => handleNestedArrayToggle('availability', 'daysAvailable', day)}
                          className="h-4 w-4 text-choma-black focus:ring-choma-brown border-gray-300 rounded"
                        />
                        <span className="ml-2 text-sm text-gray-700">{day}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Start Time *</label>
                    <input
                      type="time"
                      name="availability.hoursPerDay.start"
                      required
                      value={formData.availability.hoursPerDay.start}
                      onChange={handleInputChange}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-choma-brown focus:border-choma-brown"
                      placeholder="Select start time"
                      title="Select your availability start time"
                      aria-label="Start Time"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">End Time *</label>
                    <input
                      type="time"
                      name="availability.hoursPerDay.end"
                      required
                      value={formData.availability.hoursPerDay.end}
                      onChange={handleInputChange}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-choma-brown focus:border-choma-brown"
                      title="Select your availability end time"
                      aria-label="End Time"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Max Orders Per Day *</label>
                    <input
                      type="number"
                      name="availability.maxOrdersPerDay"
                      min="1"
                      max="20"
                      required
                      value={formData.availability.maxOrdersPerDay}
                      onChange={handleInputChange}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-choma-brown focus:border-choma-brown"
                      title="Enter maximum number of orders you can handle per day"
                      aria-label="Maximum Orders Per Day"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Step 6: References & Bank Details */}
            {currentStep === 6 && (
              <div className="space-y-6">
                <h3 className="text-lg font-medium text-gray-900">References & Bank Details</h3>
                <p className="text-sm text-gray-600">Provide emergency contact, references, and banking information</p>

                {/* Emergency Contact */}
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <h4 className="text-lg font-medium text-red-900 mb-3">Emergency Contact *</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Full Name *</label>
                      <input
                        type="text"
                        name="emergencyContact.name"
                        required
                        value={formData.emergencyContact.name}
                        onChange={handleInputChange}
                        placeholder="Contact person's name"
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-choma-brown focus:border-choma-brown"
                        title="Enter emergency contact's full name"
                        aria-label="Emergency Contact Full Name"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">Relationship *</label>
                      <input
                        type="text"
                        name="emergencyContact.relationship"
                        required
                        value={formData.emergencyContact.relationship}
                        onChange={handleInputChange}
                        placeholder="e.g., Spouse, Parent, Sibling"
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-choma-brown focus:border-choma-brown"
                        title="Enter your relationship with the emergency contact"
                        aria-label="Emergency Contact Relationship"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">Phone Number *</label>
                      <input
                        type="tel"
                        name="emergencyContact.phone"
                        required
                        value={formData.emergencyContact.phone}
                        onChange={handleInputChange}
                        placeholder="+2348123456789"
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-choma-brown focus:border-choma-brown"
                        title="Enter emergency contact's phone number"
                        aria-label="Emergency Contact Phone Number"
                      />
                    </div>
                  </div>
                </div>

                {/* References */}
                <div>
                  <div className="flex justify-between items-center mb-3">
                    <h4 className="text-lg font-medium text-gray-900">Professional References</h4>
                    <button
                      type="button"
                      onClick={addReference}
                      className="px-3 py-1 text-sm bg-choma-black text-white rounded hover:bg-choma-brown"
                    >
                      Add Reference
                    </button>
                  </div>

                  {formData.references.map((reference, index) => (
                    <div key={index} className="border border-gray-200 rounded-lg p-4 mb-4">
                      <div className="flex justify-between items-start mb-3">
                        <h5 className="text-md font-medium text-gray-800">Reference {index + 1}</h5>
                        {formData.references.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeReference(index)}
                            className="text-red-600 hover:text-red-800 text-sm"
                          >
                            Remove
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Full Name</label>
                          <input
                            type="text"
                            value={reference.name}
                            onChange={(e) => updateReference(index, 'name', e.target.value)}
                            placeholder="Reference's full name"
                            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-choma-brown focus:border-choma-brown"
                            title="Enter the full name of your professional reference"
                            aria-label={`Reference ${index + 1} Full Name`}
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700">Relationship</label>
                          <input
                            type="text"
                            value={reference.relationship}
                            onChange={(e) => updateReference(index, 'relationship', e.target.value)}
                            placeholder="e.g., Former Boss, Client"
                            title="Enter your relationship with this reference"
                            aria-label={`Reference ${index + 1} Relationship`}
                            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-choma-brown focus:border-choma-brown"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700">Phone Number</label>
                          <input
                            type="tel"
                            value={reference.phone}
                            onChange={(e) => updateReference(index, 'phone', e.target.value)}
                            placeholder="+2348123456789"
                            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-choma-brown focus:border-choma-brown"
                            title="Enter reference's phone number"
                            aria-label={`Reference ${index + 1} Phone Number`}
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700">Email (Optional)</label>
                          <input
                            type="email"
                            value={reference.email}
                            onChange={(e) => updateReference(index, 'email', e.target.value)}
                            placeholder="reference@example.com"
                            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-choma-brown focus:border-choma-brown"
                            title="Enter reference's email address (optional)"
                            aria-label={`Reference ${index + 1} Email`}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Bank Details */}
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <h4 className="text-lg font-medium text-green-900 mb-3">Bank Details *</h4>
                  <p className="text-sm text-green-700 mb-4">This information is required for payment processing</p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Account Name *</label>
                      <input
                        type="text"
                        name="bankDetails.accountName"
                        required
                        value={formData.bankDetails.accountName}
                        onChange={handleInputChange}
                        placeholder="Account holder's name"
                        title="Bank Account Name"
                        aria-label="Bank Account Name"
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-choma-brown focus:border-choma-brown"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">Account Number *</label>
                      <input
                        type="text"
                        name="bankDetails.accountNumber"
                        required
                        value={formData.bankDetails.accountNumber}
                        onChange={handleInputChange}
                        placeholder="10-digit account number"
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-choma-brown focus:border-choma-brown"
                        title="Enter your 10-digit bank account number"
                        aria-label="Bank Account Number"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">Bank Name *</label>
                      <select
                        name="bankDetails.bankName"
                        required
                        value={formData.bankDetails.bankName}
                        onChange={handleInputChange}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-choma-brown focus:border-choma-brown"
                        title="Select Bank Name"
                        aria-label="Bank Name"
                      >
                        <option value="">Select Bank</option>
                        <option value="Access Bank">Access Bank</option>
                        <option value="Guaranty Trust Bank">Guaranty Trust Bank (GTBank)</option>
                        <option value="United Bank for Africa">United Bank for Africa (UBA)</option>
                        <option value="Zenith Bank">Zenith Bank</option>
                        <option value="First Bank of Nigeria">First Bank of Nigeria</option>
                        <option value="Fidelity Bank">Fidelity Bank</option>
                        <option value="Union Bank">Union Bank</option>
                        <option value="Sterling Bank">Sterling Bank</option>
                        <option value="Stanbic IBTC Bank">Stanbic IBTC Bank</option>
                        <option value="Ecobank">Ecobank</option>
                        <option value="First City Monument Bank">First City Monument Bank (FCMB)</option>
                        <option value="Keystone Bank">Keystone Bank</option>
                        <option value="Polaris Bank">Polaris Bank</option>
                        <option value="Wema Bank">Wema Bank</option>
                        <option value="Unity Bank">Unity Bank</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">BVN (Bank Verification Number)</label>
                      <input
                        type="text"
                        name="bankDetails.bvn"
                        value={formData.bankDetails.bvn}
                        onChange={(e) => {
                          // Only allow numbers and limit to 11 digits
                          const value = e.target.value.replace(/\D/g, '').slice(0, 11);
                          handleInputChange({
                            ...e,
                            target: { ...e.target, value }
                          });
                        }}
                        placeholder="12345678901 (optional)"
                        maxLength={11}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-choma-brown focus:border-choma-brown"
                        title="Enter your 11-digit Bank Verification Number (optional)"
                        aria-label="Bank Verification Number (BVN)"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        BVN must be exactly 11 digits (optional field)
                      </p>
                      {formData.bankDetails.bvn && formData.bankDetails.bvn.length !== 11 && (
                        <p className="text-xs text-red-500 mt-1">
                          BVN must be exactly 11 digits
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Step 7: Terms & Conditions */}
            {currentStep === 7 && (
              <div className="space-y-6">
                <h3 className="text-lg font-medium text-gray-900">Terms & Conditions</h3>
                <p className="text-sm text-gray-600">Please review and accept our terms to complete your registration</p>

                <div className="space-y-4">
                  <div className="border border-gray-200 rounded-lg p-4">
                    <label className="flex items-start">
                      <input
                        type="checkbox"
                        name="agreedToTerms"
                        checked={formData.agreedToTerms}
                        onChange={handleInputChange}
                        className="h-4 w-4 text-choma-black focus:ring-choma-brown border-gray-300 rounded mt-1"
                        required
                        title="Accept Terms of Service"
                        aria-label="Accept Terms of Service"
                      />
                      <div className="ml-3">
                        <span className="text-sm font-medium text-gray-900">I agree to the Terms of Service *</span>
                        <p className="text-sm text-gray-600">
                          I understand and agree to Choma's Terms of Service, including payment terms,
                          service standards, and code of conduct for chefs on the platform.
                        </p>
                        <a href="#" className="text-choma-black hover:text-blue-800 text-sm underline">
                          Read Terms of Service
                        </a>
                      </div>
                    </label>
                  </div>

                  <div className="border border-gray-200 rounded-lg p-4">
                    <label className="flex items-start">
                      <input
                        type="checkbox"
                        name="agreedToPrivacyPolicy"
                        checked={formData.agreedToPrivacyPolicy}
                        onChange={handleInputChange}
                        className="h-4 w-4 text-choma-black focus:ring-choma-brown border-gray-300 rounded mt-1"
                        required
                        title="Accept Privacy Policy"
                        aria-label="Accept Privacy Policy"
                      />
                      <div className="ml-3">
                        <span className="text-sm font-medium text-gray-900">I agree to the Privacy Policy *</span>
                        <p className="text-sm text-gray-600">
                          I understand how Choma collects, uses, and protects my personal information
                          as outlined in the Privacy Policy.
                        </p>
                        <a href="#" className="text-choma-black hover:text-blue-800 text-sm underline">
                          Read Privacy Policy
                        </a>
                      </div>
                    </label>
                  </div>

                  <div className="border border-gray-200 rounded-lg p-4">
                    <label className="flex items-start">
                      <input
                        type="checkbox"
                        name="agreedToBackgroundCheck"
                        checked={formData.agreedToBackgroundCheck}
                        onChange={handleInputChange}
                        className="h-4 w-4 text-choma-black focus:ring-choma-brown border-gray-300 rounded mt-1"
                        required
                        title="Consent to Background Check"
                        aria-label="Consent to Background Check"
                      />
                      <div className="ml-3">
                        <span className="text-sm font-medium text-gray-900">I consent to background verification *</span>
                        <p className="text-sm text-gray-600">
                          I authorize Choma to verify my identity, references, and conduct background
                          checks as necessary for platform safety and security.
                        </p>
                      </div>
                    </label>
                  </div>
                </div>

                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-yellow-800">Application Review Process</h3>
                      <div className="mt-2 text-sm text-yellow-700">
                        <p>
                          After submitting your application, our admin team will review your information,
                          verify your documents, and contact your references. This process typically takes
                          2-5 business days. You'll receive an email notification once approved.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Navigation Buttons */}
            <div className="mt-8 flex justify-between">
              {currentStep > 1 ? (
                <button
                  type="button"
                  onClick={prevStep}
                  className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                  title="Go to previous step"
                  aria-label="Previous Step"
                >
                  Previous
                </button>
              ) : (
                <Link
                  to="/login"
                  className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                  title="Return to login page"
                  aria-label="Back to Login Page"
                >
                  Back to Login
                </Link>
              )}

              {currentStep < totalSteps ? (
                <button
                  type="button"
                  onClick={nextStep}
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-choma-black hover:bg-choma-brown"
                  title="Go to next step"
                  aria-label="Next Step"
                >
                  Next
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-choma-black hover:bg-choma-brown disabled:opacity-50"
                  title="Submit your registration application"
                  aria-label="Submit Application"
                >
                  {loading ? 'Submitting...' : 'Submit Application'}
                </button>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

export default Register;