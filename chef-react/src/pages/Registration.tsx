import React, { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { ArrowLeft, CheckCircle, User, MapPin, Briefcase, Shield, Eye, EyeOff, AlertTriangle } from 'lucide-react'
import AuthLayout from '../components/AuthLayout'
import TermsModal from '../components/TermsModal'
import PrivacyModal from '../components/PrivacyModal'
import type { RegisterData } from '../types'

const specialtyOptions = [
  'Nigerian Cuisine', 'Continental Cuisine', 'Asian Cuisine', 'Italian Cuisine',
  'Chinese Cuisine', 'Indian Cuisine', 'Lebanese Cuisine', 'Healthy Meals',
  'Vegetarian', 'Vegan', 'Keto Diet', 'Protein-Rich', 'Low Carb', 'Gluten-Free',
  'Mediterranean', 'Diabetic-Friendly', 'Kids Meals', 'Halal', 'Kosher'
]

const nigerianStates = [
  'Abia', 'Adamawa', 'Akwa Ibom', 'Anambra', 'Bauchi', 'Bayelsa', 'Benue', 'Borno',
  'Cross River', 'Delta', 'Ebonyi', 'Edo', 'Ekiti', 'Enugu', 'Gombe', 'Imo',
  'Jigawa', 'Kaduna', 'Kano', 'Katsina', 'Kebbi', 'Kogi', 'Kwara', 'Lagos',
  'Nasarawa', 'Niger', 'Ogun', 'Ondo', 'Osun', 'Oyo', 'Plateau', 'Rivers',
  'Sokoto', 'Taraba', 'Yobe', 'Zamfara', 'FCT'
]

const languageOptions = [
  'English', 'Hausa', 'Yoruba', 'Igbo', 'Pidgin English', 'Fulfulde',
  'Kanuri', 'Ibibio', 'Tiv', 'Ijaw', 'French', 'Arabic', 'Other'
]

const certificationOptions = [
  'HACCP Certification', 'Food Safety Certificate', 'Culinary School Diploma',
  'ServSafe Certification', 'Nutrition Certification', 'Catering License',
  'Health Department Permit', 'Other'
]

const kitchenEquipmentOptions = [
  'Gas Cooker', 'Electric Cooker', 'Microwave', 'Oven', 'Blender', 'Food Processor',
  'Pressure Cooker', 'Rice Cooker', 'Deep Fryer', 'Grilling Equipment', 'Refrigerator',
  'Freezer', 'Kitchen Scale', 'Mixing Bowls', 'Professional Knives', 'Cutting Boards'
]

const transportationOptions = [
  'Own Vehicle', 'Motorcycle', 'Public Transport', 'Delivery Service'
]

const bankOptions = [
  { name: 'Access Bank', code: '044' },
  { name: 'Guaranty Trust Bank (GTBank)', code: '058' },
  { name: 'United Bank for Africa (UBA)', code: '033' },
  { name: 'Zenith Bank', code: '057' },
  { name: 'First Bank of Nigeria', code: '011' },
  { name: 'Fidelity Bank', code: '070' },
  { name: 'Union Bank', code: '032' },
  { name: 'Sterling Bank', code: '232' },
  { name: 'Stanbic IBTC Bank', code: '221' },
  { name: 'Ecobank', code: '050' },
  { name: 'First City Monument Bank (FCMB)', code: '214' },
  { name: 'Keystone Bank', code: '082' },
  { name: 'Polaris Bank', code: '076' },
  { name: 'Wema Bank', code: '035' },
  { name: 'Unity Bank', code: '215' }
]

const CompleteRegistration: React.FC = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const [currentStep, setCurrentStep] = useState(1)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [showTermsModal, setShowTermsModal] = useState(false)
  const [showPrivacyModal, setShowPrivacyModal] = useState(false)

  const email = location.state?.email
  const verificationToken = location.state?.verificationToken
  const isVerified = location.state?.verified


  // Redirect if not verified, unless using already_verified token
  useEffect(() => {
    if (!email || (!verificationToken && verificationToken !== 'already_verified') || !isVerified) {
      navigate('/register')
    }
  }, [email, verificationToken, isVerified, navigate])

  // Load existing chef data if available
  useEffect(() => {
    const loadExistingChefData = async () => {
      if (!email || verificationToken !== 'already_verified') return;

      try {
        const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/chef/registration-status/${encodeURIComponent(email.toLowerCase())}`);
        const data = await response.json();

        if (data.success && data.data.chefExists && !data.data.registrationComplete) {
          // Chef exists but registration incomplete, fetch their data to pre-populate
          // For now, we'll just show them the form with empty fields
          // In a real app, you might want to fetch the partial data and pre-populate
          console.log('Chef exists with incomplete registration, allowing them to continue');
        }
      } catch (error) {
        console.error('Error loading existing chef data:', error);
      }
    };

    loadExistingChefData();
  }, [email, verificationToken])

  const [formData, setFormData] = useState<RegisterData>({
    // Personal Information
    fullName: '',
    email: email || '',
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
      bvn: '',
      isVerified: false
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

  const steps = [
    { number: 1, title: 'Personal', icon: User },
    { number: 2, title: 'Identity', icon: Shield },
    { number: 3, title: 'Professional', icon: Briefcase },
    { number: 4, title: 'Location', icon: MapPin },
    { number: 5, title: 'Kitchen', icon: MapPin },
    { number: 6, title: 'References', icon: User },
    { number: 7, title: 'Terms', icon: Shield }
  ]

  // Function to check if a specific step is completed
  const isStepCompleted = (stepNumber: number): boolean => {
    switch (stepNumber) {
      case 1: // Personal Information
        return !!(formData.fullName && formData.email && formData.phone && formData.dateOfBirth &&
          formData.password && formData.confirmPassword && formData.password === formData.confirmPassword);

      case 2: // Identity Verification
        return !!(formData.identityVerification.idType && formData.identityVerification.idNumber &&
          validateIdNumber(formData.identityVerification.idType, formData.identityVerification.idNumber));

      case 3: // Professional Details
        return !!(formData.specialties.length > 0 && formData.experience >= 0 && formData.languagesSpoken.length > 0);

      case 4: // Location
        return !!(formData.location.streetAddress && formData.location.city && formData.location.state);

      case 5: // Kitchen & Availability
        return !!(formData.kitchenDetails.kitchenEquipment.length > 0 &&
          formData.availability.daysAvailable.length > 0 &&
          formData.kitchenDetails.transportationMethod);

      case 6: // References & Bank Details
        return !!(formData.emergencyContact.name && formData.emergencyContact.phone &&
          formData.emergencyContact.relationship && formData.bankDetails.accountName &&
          formData.bankDetails.accountNumber && formData.bankDetails.bankName);

      case 7: // Terms & Conditions
        return !!(formData.agreedToTerms && formData.agreedToPrivacyPolicy && formData.agreedToBackgroundCheck);

      default:
        return false;
    }
  };

  // Function to handle step navigation
  const navigateToStep = (stepNumber: number) => {
    setCurrentStep(stepNumber);
    setError(''); // Clear any existing errors
  };

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
                (name && (name.includes('experience') || name.includes('maxOrdersPerDay') || name.includes('serviceRadius')))
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
              (name && (name.includes('experience') || name.includes('maxOrdersPerDay') || name.includes('serviceRadius')))
                ? parseInt(value) || 0 : value
          }
        }))
      }
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: isCheckbox ? checked :
          (name && (name === 'experience' || name === 'maxOrdersPerDay' || name === 'serviceRadius'))
            ? parseInt(value) || 0 : value
      }))
    }
    setError('')
  }

  const handleArrayToggle = (arrayName: keyof RegisterData, item: string) => {
    setFormData(prev => ({
      ...prev,
      [arrayName]: (prev[arrayName] as string[]).includes(item)
        ? (prev[arrayName] as string[]).filter(i => i !== item)
        : [...(prev[arrayName] as string[]), item]
    }))
    setError('')
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
    setError('')
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
    setError('')
  }

  const handleBankSelection = (bankName: string) => {
    const selectedBank = bankOptions.find(bank => bank.name === bankName)
    setFormData(prev => ({
      ...prev,
      bankDetails: {
        ...prev.bankDetails,
        bankName: bankName,
        bankCode: selectedBank ? selectedBank.code : '',
        isVerified: false // Reset verification when bank changes
      }
    }))
    setError('')
  }

  // ID validation functions
  const validateIdNumber = (idType: string, idNumber: string) => {
    switch (idType) {
      case 'National ID':
        return /^\d{11}$/.test(idNumber); // 11 digits
      case 'Driver License':
        return /^[A-Z]{3}\d{9}$/.test(idNumber); // 3 letters + 9 digits (e.g., LAG123456789)
      case 'International Passport':
        return /^[A-Z]\d{8}$/.test(idNumber); // 1 letter + 8 digits (e.g., A12345678)
      case 'Voter Card':
        return /^[A-Z0-9]{19}$/.test(idNumber); // 19 alphanumeric characters
      default:
        return true;
    }
  };

  const getIdFormatInfo = (idType: string) => {
    switch (idType) {
      case 'National ID':
        return { placeholder: '12345678901', maxLength: 11, format: '11 digits' };
      case 'Driver License':
        return { placeholder: 'LAG123456789', maxLength: 12, format: '3 letters + 9 digits' };
      case 'International Passport':
        return { placeholder: 'A12345678', maxLength: 9, format: '1 letter + 8 digits' };
      case 'Voter Card':
        return { placeholder: '90F5B4F877D45670891234A', maxLength: 19, format: '19 alphanumeric characters' };
      default:
        return { placeholder: 'Enter ID number', maxLength: 20, format: '' };
    }
  };

  const validateBvn = (bvn: string) => {
    return /^\d{11}$/.test(bvn);
  };

  const verifyBankAccount = async () => {
    const { accountNumber, bankCode } = formData.bankDetails;

    if (!accountNumber || !bankCode || accountNumber.length !== 10) {
      setError('Please enter a valid 10-digit account number and select a bank');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/auth/verify-bank-account`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          accountNumber,
          bankCode
        }),
      });

      const data = await response.json();

      if (data.success) {
        setFormData(prev => ({
          ...prev,
          bankDetails: {
            ...prev.bankDetails,
            accountName: data.account_name,
            isVerified: true
          }
        }));
      } else {
        setError(data.message || 'Unable to verify bank account. Please check your details.');
        setFormData(prev => ({
          ...prev,
          bankDetails: {
            ...prev.bankDetails,
            isVerified: false
          }
        }));
      }
    } catch (error) {
      console.error('Bank verification error:', error);
      setError('Network error. Please check your connection and try again.');
      setFormData(prev => ({
        ...prev,
        bankDetails: {
          ...prev.bankDetails,
          isVerified: false
        }
      }));
    } finally {
      setIsLoading(false);
    }
  };

  const validateAllRequiredFields = (): boolean => {
    // Check all required fields across all steps
    const requiredFieldsCheck = {
      // Step 1: Personal Information
      personalInfo: !!(formData.fullName && formData.email && formData.phone && formData.dateOfBirth &&
        formData.password && formData.confirmPassword),

      // Step 2: Identity Verification
      identity: !!(formData.identityVerification.idType && formData.identityVerification.idNumber),

      // Step 3: Professional Details
      professional: !!(formData.specialties.length > 0 && formData.experience >= 0 && formData.languagesSpoken.length > 0),

      // Step 4: Location
      location: !!(formData.location.streetAddress && formData.location.city && formData.location.state),

      // Step 5: Kitchen & Availability
      kitchen: !!(formData.kitchenDetails.kitchenEquipment.length > 0 && formData.availability.daysAvailable.length > 0),

      // Step 6: References & Bank Details
      references: !!(formData.emergencyContact.name && formData.emergencyContact.phone &&
        formData.emergencyContact.relationship && formData.bankDetails.accountName &&
        formData.bankDetails.accountNumber && formData.bankDetails.bankName),

      // Step 7: Terms & Conditions
      terms: !!(formData.agreedToTerms && formData.agreedToPrivacyPolicy && formData.agreedToBackgroundCheck)
    };

    return Object.values(requiredFieldsCheck).every(Boolean);
  }

  const getIncompleteSteps = (): string[] => {
    const incompleteSteps = [];

    if (!(formData.fullName && formData.email && formData.phone && formData.dateOfBirth &&
      formData.password && formData.confirmPassword)) {
      incompleteSteps.push('Personal Information');
    }

    if (!(formData.identityVerification.idType && formData.identityVerification.idNumber)) {
      incompleteSteps.push('Identity Verification');
    }

    if (!(formData.specialties.length > 0 && formData.experience >= 0 && formData.languagesSpoken.length > 0)) {
      incompleteSteps.push('Professional Details');
    }

    if (!(formData.location.streetAddress && formData.location.city && formData.location.state)) {
      incompleteSteps.push('Location & Service Area');
    }

    if (!(formData.kitchenDetails.kitchenEquipment.length > 0 && formData.availability.daysAvailable.length > 0)) {
      incompleteSteps.push('Kitchen & Availability');
    }

    if (!(formData.emergencyContact.name && formData.emergencyContact.phone &&
      formData.emergencyContact.relationship && formData.bankDetails.accountName &&
      formData.bankDetails.accountNumber && formData.bankDetails.bankName)) {
      incompleteSteps.push('References & Bank Details');
    }

    if (!(formData.agreedToTerms && formData.agreedToPrivacyPolicy && formData.agreedToBackgroundCheck)) {
      incompleteSteps.push('Terms & Conditions');
    }

    return incompleteSteps;
  }

  const handleNext = () => {
    setCurrentStep(prev => Math.min(prev + 1, steps.length))
    setError('') // Clear any existing errors
  }

  const handlePrevious = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1))
    setError('') // Clear any existing errors
  }

  const handleSubmit = async () => {
    if (!validateAllRequiredFields()) {
      const incompleteSteps = getIncompleteSteps();
      setError(`Please complete the following sections: ${incompleteSteps.join(', ')}`);
      return
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match')
      return
    }

    setIsLoading(true)
    setError('')

    try {
      const registrationData = {
        ...formData,
        legalAgreements: {
          agreedToTerms: formData.agreedToTerms,
          agreedToPrivacyPolicy: formData.agreedToPrivacyPolicy,
          agreedToBackgroundCheck: formData.agreedToBackgroundCheck,
          agreementDate: new Date().toISOString()
        }
      }

      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/chef/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(registrationData)
      })

      const data = await response.json()

      if (data.success) {
        navigate('/register/success', {
          state: {
            chefName: formData.fullName,
            email: formData.email
          }
        })
      } else {
        if (data.message && data.message.includes('already exists')) {
          // Chef already exists, this might be a duplicate registration attempt
          setError('A chef with this email is already registered. Redirecting to login...')
          setTimeout(() => {
            navigate('/login')
          }, 2000)
        } else {
          setError(data.message || 'Registration failed. Please try again.')
          if (data.requiresVerification) {
            navigate('/register')
          }
        }
      }
    } catch (error) {
      console.error('Registration error:', error)
      setError('Registration failed. Please check your connection and try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-4 lg:space-y-6">
            <div className="text-left mb-4 lg:mb-6">
              <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-2">Personal Information</h2>
              <p className="text-gray-600 text-sm sm:text-base">Please provide your basic personal details</p>
            </div>

            <div className="grid grid-cols-1 gap-4">
              <div>
                <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 mb-2">
                  Full Name *
                </label>
                <input
                  id="fullName"
                  type="text"
                  name="fullName"
                  value={formData.fullName}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  placeholder="Enter your full name"
                  required
                />
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address
                </label>
                <input
                  id="email"
                  type="email"
                  name="email"
                  value={formData.email}
                  disabled
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-50 text-gray-500"
                />
                <div className="flex items-center mt-1">
                  <CheckCircle className="w-4 h-4 text-green-500 mr-1" />
                  <span className="text-xs text-green-600">Verified</span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
                    Primary Phone Number *
                  </label>
                  <input
                    id="phone"
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    placeholder="+234 123 456 7890"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="alternatePhone" className="block text-sm font-medium text-gray-700 mb-2">
                    Alternate Phone Number
                  </label>
                  <input
                    id="alternatePhone"
                    type="tel"
                    name="alternatePhone"
                    value={formData.alternatePhone}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    placeholder="+234 987 654 3210"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="dateOfBirth" className="block text-sm font-medium text-gray-700 mb-2">
                    Date of Birth *
                  </label>
                  <input
                    id="dateOfBirth"
                    type="date"
                    name="dateOfBirth"
                    value={formData.dateOfBirth}
                    onChange={handleInputChange}
                    max={new Date(Date.now() - 18 * 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">You must be at least 18 years old</p>
                </div>

                <div>
                  <label htmlFor="gender" className="block text-sm font-medium text-gray-700 mb-2">
                    Gender *
                  </label>
                  <select
                    id="gender"
                    name="gender"
                    value={formData.gender}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    required
                  >
                    <option value="">Select gender</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                  Password *
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent pr-10"
                    placeholder="Create a strong password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-1">At least 8 characters with numbers and symbols</p>
              </div>

              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
                  Confirm Password *
                </label>
                <div className="relative">
                  <input
                    id="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent pr-10"
                    placeholder="Confirm your password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
                {formData.password && formData.confirmPassword && formData.password !== formData.confirmPassword && (
                  <p className="text-red-500 text-sm mt-1">Passwords do not match</p>
                )}
              </div>
            </div>
          </div>
        )

      case 2:
        return (
          <div className="space-y-4 lg:space-y-6">
            <div className="text-left mb-4 lg:mb-6">
              <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-2">Identity Verification</h2>
              <p className="text-gray-600 text-sm sm:text-base">We need to verify your identity for security purposes</p>
            </div>

            <div>
              <label htmlFor="idType" className="block text-sm font-medium text-gray-700 mb-2">
                ID Type *
              </label>
              <select
                id="idType"
                name="identityVerification.idType"
                value={formData.identityVerification.idType}
                onChange={handleInputChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                required
              >
                <option value="">Select ID type</option>
                <option value="National ID">National ID</option>
                <option value="Driver License">Driver's License</option>
                <option value="International Passport">International Passport</option>
                <option value="Voter Card">Voter's Card</option>
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="idNumber" className="block text-sm font-medium text-gray-700 mb-2">
                  ID Number *
                </label>
                <input
                  id="idNumber"
                  type="text"
                  name="identityVerification.idNumber"
                  value={formData.identityVerification.idNumber}
                  onChange={(e) => {
                    const value = e.target.value.toUpperCase();
                    const syntheticEvent = {
                      ...e,
                      target: {
                        ...e.target,
                        name: 'identityVerification.idNumber',
                        value: value
                      }
                    };
                    handleInputChange(syntheticEvent as React.ChangeEvent<HTMLInputElement>);
                  }}
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent ${formData.identityVerification.idNumber && formData.identityVerification.idType &&
                    !validateIdNumber(formData.identityVerification.idType, formData.identityVerification.idNumber)
                    ? 'border-red-300 bg-red-50'
                    : 'border-gray-300'
                    }`}
                  placeholder={getIdFormatInfo(formData.identityVerification.idType).placeholder}
                  maxLength={getIdFormatInfo(formData.identityVerification.idType).maxLength}
                  required
                />
                {formData.identityVerification.idType && getIdFormatInfo(formData.identityVerification.idType).format && (
                  <p className="text-xs text-gray-500 mt-1">
                    Format: {getIdFormatInfo(formData.identityVerification.idType).format}
                  </p>
                )}
                {formData.identityVerification.idNumber && formData.identityVerification.idType &&
                  !validateIdNumber(formData.identityVerification.idType, formData.identityVerification.idNumber) && (
                    <p className="text-xs text-red-500 mt-1">
                      Invalid format. Expected: {getIdFormatInfo(formData.identityVerification.idType).format}
                    </p>
                  )}
                {formData.identityVerification.idNumber && formData.identityVerification.idType &&
                  validateIdNumber(formData.identityVerification.idType, formData.identityVerification.idNumber) && (
                    <p className="text-xs text-green-600 mt-1 flex items-center">
                      <CheckCircle size={12} className="mr-1" />
                      Valid {formData.identityVerification.idType} format
                    </p>
                  )}
              </div>

              <div>
                <label htmlFor="idExpiryDate" className="block text-sm font-medium text-gray-700 mb-2">
                  ID Expiry Date
                </label>
                <input
                  id="idExpiryDate"
                  type="date"
                  name="identityVerification.idExpiryDate"
                  value={formData.identityVerification.idExpiryDate}
                  onChange={handleInputChange}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
                <p className="text-xs text-gray-500 mt-1">Leave blank if ID doesn't expire</p>
              </div>
            </div>

            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-orange-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-orange-800">Identity Verification</h3>
                  <p className="text-sm text-orange-700">
                    Your identity information will be verified by our admin team to ensure platform safety.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )

      case 3:
        return (
          <div className="space-y-4 lg:space-y-6 mt-72">
            <div className="text-left mb-4 lg:mb-6">
              <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-2">Professional Details</h2>
              <p className="text-gray-600 text-sm sm:text-base">Tell us about your culinary expertise</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Cooking Specialties * (Select at least one)
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-40 overflow-y-auto border border-gray-300 rounded-lg p-3">
                {specialtyOptions.map((specialty) => (
                  <label key={specialty} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.specialties.includes(specialty)}
                      onChange={() => handleArrayToggle('specialties', specialty)}
                      className="mr-2 text-orange-500 focus:ring-orange-500"
                    />
                    <span className="text-sm">{specialty}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label htmlFor="experience" className="block text-sm font-medium text-gray-700 mb-2">
                Years of Experience *
              </label>
              <input
                id="experience"
                type="number"
                name="experience"
                min="0"
                max="50"
                value={formData.experience}
                onChange={handleInputChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                placeholder="Enter years of cooking experience"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Languages Spoken * (Select at least one)
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-32 overflow-y-auto border border-gray-300 rounded-lg p-3">
                {languageOptions.map((language) => (
                  <label key={language} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.languagesSpoken.includes(language)}
                      onChange={() => handleArrayToggle('languagesSpoken', language)}
                      className="mr-2 text-orange-500 focus:ring-orange-500"
                    />
                    <span className="text-sm">{language}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Certifications
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-32 overflow-y-auto border border-gray-300 rounded-lg p-3">
                {certificationOptions.map((cert) => (
                  <label key={cert} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.certifications.includes(cert)}
                      onChange={() => handleArrayToggle('certifications', cert)}
                      className="mr-2 text-orange-500 focus:ring-orange-500"
                    />
                    <span className="text-sm">{cert}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label htmlFor="culinaryEducation" className="block text-sm font-medium text-gray-700 mb-2">
                Culinary Education
              </label>
              <textarea
                id="culinaryEducation"
                name="culinaryEducation"
                value={formData.culinaryEducation}
                onChange={handleInputChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                rows={3}
                placeholder="Describe your culinary education or training"
              />
            </div>

            <div>
              <label htmlFor="previousWorkExperience" className="block text-sm font-medium text-gray-700 mb-2">
                Previous Work Experience
              </label>
              <textarea
                id="previousWorkExperience"
                name="previousWorkExperience"
                value={formData.previousWorkExperience}
                onChange={handleInputChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                rows={3}
                placeholder="Describe your previous work experience in the culinary field"
              />
            </div>

            <div>
              <label htmlFor="bio" className="block text-sm font-medium text-gray-700 mb-2">
                Brief Bio
              </label>
              <textarea
                id="bio"
                name="bio"
                value={formData.bio}
                onChange={handleInputChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                rows={4}
                placeholder="Tell customers about yourself, your cooking style, and what makes your food special"
                maxLength={500}
              />
              <p className="text-xs text-gray-500 mt-1">{formData.bio?.length || 0}/500 characters</p>
            </div>
          </div>
        )

      case 4:
        return (
          <div className="space-y-4 lg:space-y-6">
            <div className="text-left mb-4 lg:mb-6">
              <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-2">Location & Service Area</h2>
              <p className="text-gray-600 text-sm sm:text-base">Let us know where you're located and how far you can serve</p>
            </div>

            <div>
              <label htmlFor="streetAddress" className="block text-sm font-medium text-gray-700 mb-2">
                Street Address *
              </label>
              <input
                id="streetAddress"
                type="text"
                name="location.streetAddress"
                value={formData.location.streetAddress}
                onChange={handleInputChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                placeholder="e.g., No. 123 Adebayo Street"
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="city" className="block text-sm font-medium text-gray-700 mb-2">
                  City *
                </label>
                <input
                  id="city"
                  type="text"
                  name="location.city"
                  value={formData.location.city}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  placeholder="e.g., Lagos"
                  required
                />
              </div>

              <div>
                <label htmlFor="state" className="block text-sm font-medium text-gray-700 mb-2">
                  State *
                </label>
                <select
                  id="state"
                  name="location.state"
                  value={formData.location.state}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  required
                >
                  <option value="">Select state</option>
                  {nigerianStates.map((state) => (
                    <option key={state} value={state}>{state}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="postalCode" className="block text-sm font-medium text-gray-700 mb-2">
                  Postal Code
                </label>
                <input
                  id="postalCode"
                  type="text"
                  name="location.postalCode"
                  value={formData.location.postalCode}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  placeholder="e.g., 100001"
                />
              </div>

              <div>
                <label htmlFor="serviceRadius" className="block text-sm font-medium text-gray-700 mb-2">
                  Service Radius (km) *
                </label>
                <input
                  id="serviceRadius"
                  type="number"
                  name="location.serviceRadius"
                  min="1"
                  max="50"
                  value={formData.location.serviceRadius}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  placeholder="Enter service radius"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">How far are you willing to travel/deliver? (1-50 km)</p>
              </div>
            </div>
          </div>
        )

      case 5:
        return (
          <div className="space-y-6">
            <div className="text-left mb-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Kitchen & Availability</h2>
              <p className="text-gray-600">Tell us about your kitchen setup and when you're available</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Kitchen Setup
              </label>
              <div className="space-y-3">
                <label className="flex items-center">
                  <input
                    id="hasOwnKitchen"
                    type="checkbox"
                    name="kitchenDetails.hasOwnKitchen"
                    checked={formData.kitchenDetails.hasOwnKitchen}
                    onChange={handleInputChange}
                    className="mr-2 text-orange-500 focus:ring-orange-500"
                  />
                  <span className="text-sm text-gray-700">I have my own fully equipped kitchen</span>
                </label>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Kitchen Equipment * (Select all that apply)
              </label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-32 overflow-y-auto border border-gray-300 rounded-lg p-3">
                {kitchenEquipmentOptions.map((equipment) => (
                  <label key={equipment} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.kitchenDetails.kitchenEquipment.includes(equipment)}
                      onChange={() => handleNestedArrayToggle('kitchenDetails', 'kitchenEquipment', equipment)}
                      className="mr-2 text-orange-500 focus:ring-orange-500"
                    />
                    <span className="text-sm">{equipment}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label htmlFor="transportationMethod" className="block text-sm font-medium text-gray-700 mb-2">
                Transportation Method *
              </label>
              <select
                id="transportationMethod"
                name="kitchenDetails.transportationMethod"
                value={formData.kitchenDetails.transportationMethod}
                onChange={handleInputChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                required
              >
                <option value="">Select transportation method</option>
                {transportationOptions.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Days Available * (Select at least one)
              </label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map((day) => (
                  <label key={day} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.availability.daysAvailable.includes(day)}
                      onChange={() => handleNestedArrayToggle('availability', 'daysAvailable', day)}
                      className="mr-2 text-orange-500 focus:ring-orange-500"
                    />
                    <span className="text-sm">{day}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label htmlFor="startTime" className="block text-sm font-medium text-gray-700 mb-2">
                  Start Time *
                </label>
                <input
                  id="startTime"
                  type="time"
                  name="availability.hoursPerDay.start"
                  value={formData.availability.hoursPerDay.start}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label htmlFor="endTime" className="block text-sm font-medium text-gray-700 mb-2">
                  End Time *
                </label>
                <input
                  id="endTime"
                  type="time"
                  name="availability.hoursPerDay.end"
                  value={formData.availability.hoursPerDay.end}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label htmlFor="maxOrdersPerDay" className="block text-sm font-medium text-gray-700 mb-2">
                  Max Orders Per Day *
                </label>
                <input
                  id="maxOrdersPerDay"
                  type="number"
                  name="availability.maxOrdersPerDay"
                  min="1"
                  max="20"
                  value={formData.availability.maxOrdersPerDay}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  placeholder="Enter max orders"
                  required
                />
              </div>
            </div>
          </div>
        )

      case 6:
        return (
          <div className="space-y-6">
            <div className="text-left mb-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-2">References & Bank Details</h2>
              <p className="text-gray-600">Provide emergency contact, references, and banking information</p>
            </div>

            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
              <h3 className="text-lg font-medium text-orange-800 mb-3">Emergency Contact *</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label htmlFor="emergencyContactName" className="block text-sm font-medium text-gray-700 mb-2">
                    Full Name *
                  </label>
                  <input
                    id="emergencyContactName"
                    type="text"
                    name="emergencyContact.name"
                    value={formData.emergencyContact.name}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    placeholder="Contact person's name"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="emergencyContactRelationship" className="block text-sm font-medium text-gray-700 mb-2">
                    Relationship *
                  </label>
                  <input
                    id="emergencyContactRelationship"
                    type="text"
                    name="emergencyContact.relationship"
                    value={formData.emergencyContact.relationship}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    placeholder="e.g., Spouse, Parent"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="emergencyContactPhone" className="block text-sm font-medium text-gray-700 mb-2">
                    Phone Number *
                  </label>
                  <input
                    id="emergencyContactPhone"
                    type="tel"
                    name="emergencyContact.phone"
                    value={formData.emergencyContact.phone}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    placeholder="+234 123 456 7890"
                    required
                  />
                </div>
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-lg font-medium text-gray-900">Professional References</h3>
                <button
                  type="button"
                  onClick={addReference}
                  className="px-3 py-1 text-sm bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-lg hover:from-orange-600 hover:to-orange-700"
                >
                  Add Reference
                </button>
              </div>

              {formData.references.map((reference, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-4 mb-4">
                  <div className="flex justify-between items-start mb-3">
                    <h4 className="text-md font-medium text-gray-800">Reference {index + 1}</h4>
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
                      <label htmlFor={`referenceName-${index}`} className="block text-sm font-medium text-gray-700 mb-2">
                        Full Name
                      </label>
                      <input
                        id={`referenceName-${index}`}
                        type="text"
                        value={reference.name}
                        onChange={(e) => updateReference(index, 'name', e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                        placeholder="Reference's full name"
                      />
                    </div>

                    <div>
                      <label htmlFor={`referenceRelationship-${index}`} className="block text-sm font-medium text-gray-700 mb-2">
                        Relationship
                      </label>
                      <input
                        id={`referenceRelationship-${index}`}
                        type="text"
                        value={reference.relationship}
                        onChange={(e) => updateReference(index, 'relationship', e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                        placeholder="e.g., Former Boss, Client"
                      />
                    </div>

                    <div>
                      <label htmlFor={`referencePhone-${index}`} className="block text-sm font-medium text-gray-700 mb-2">
                        Phone Number
                      </label>
                      <input
                        id={`referencePhone-${index}`}
                        type="tel"
                        value={reference.phone}
                        onChange={(e) => updateReference(index, 'phone', e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                        placeholder="+234 123 456 7890"
                      />
                    </div>

                    <div>
                      <label htmlFor={`referenceEmail-${index}`} className="block text-sm font-medium text-gray-700 mb-2">
                        Email (Optional)
                      </label>
                      <input
                        id={`referenceEmail-${index}`}
                        type="email"
                        value={reference.email}
                        onChange={(e) => updateReference(index, 'email', e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                        placeholder="reference@example.com"
                      />
                    </div>
                  </div>
                </div>
              ))
              }
            </div>

            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
              <h3 className="text-lg font-medium text-orange-800 mb-3">Bank Details *</h3>
              <p className="text-sm text-orange-700 mb-4">This information is required for payment processing</p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="accountNumber" className="block text-sm font-medium text-gray-700 mb-2">
                    Account Number *
                  </label>
                  <input
                    id="accountNumber"
                    type="text"
                    name="bankDetails.accountNumber"
                    value={formData.bankDetails.accountNumber}
                    onChange={(e) => {
                      const value = e.target.value.replace(/\D/g, '').slice(0, 10);
                      const syntheticEvent = {
                        ...e,
                        target: {
                          ...e.target,
                          name: 'bankDetails.accountNumber',
                          value: value
                        }
                      };
                      handleInputChange(syntheticEvent as React.ChangeEvent<HTMLInputElement>);
                      // Reset verification when account number changes
                      setFormData(prev => ({
                        ...prev,
                        bankDetails: {
                          ...prev.bankDetails,
                          accountNumber: value,
                          isVerified: false
                        }
                      }));
                    }}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    placeholder="10-digit account number"
                    maxLength={10}
                    required
                  />
                </div>

                <div>
                  <label htmlFor="bankName" className="block text-sm font-medium text-gray-700 mb-2">
                    Bank Name *
                  </label>
                  <select
                    id="bankName"
                    name="bankDetails.bankName"
                    value={formData.bankDetails.bankName}
                    onChange={(e) => handleBankSelection(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    required
                  >
                    <option value="">Select Bank</option>
                    {bankOptions.map((bank) => (
                      <option key={bank.code} value={bank.name}>
                        {bank.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="md:col-span-2">
                  <div className="flex items-center gap-4 mb-4">
                    <button
                      type="button"
                      onClick={verifyBankAccount}
                      disabled={!formData.bankDetails.accountNumber || !formData.bankDetails.bankCode || formData.bankDetails.accountNumber.length !== 10 || isLoading}
                      className="px-6 py-3 bg-orange-600 hover:bg-orange-700 text-white font-semibold rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isLoading ? (
                        <div className="flex items-center">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Verifying...
                        </div>
                      ) : (
                        'Verify Account'
                      )}
                    </button>

                    {formData.bankDetails.isVerified && (
                      <div className="flex items-center text-green-600">
                        <CheckCircle size={20} className="mr-2" />
                        <span className="font-medium">Account Verified</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="md:col-span-2">
                  <label htmlFor="accountName" className="block text-sm font-medium text-gray-700 mb-2">
                    Account Name *
                  </label>
                  <input
                    id="accountName"
                    type="text"
                    name="bankDetails.accountName"
                    value={formData.bankDetails.accountName}
                    readOnly={formData.bankDetails.isVerified}
                    onChange={handleInputChange}
                    className={`w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent ${formData.bankDetails.isVerified ? 'bg-green-50 text-green-800' : ''}`}
                    placeholder={formData.bankDetails.isVerified ? "Account name will appear here after verification" : "Account holder's name"}
                    required
                  />
                  {formData.bankDetails.isVerified && (
                    <p className="text-xs text-green-600 mt-1">✓ Account name verified from bank records</p>
                  )}
                </div>

                <div>
                  <label htmlFor="bvn" className="block text-sm font-medium text-gray-700 mb-2">
                    BVN (Optional)
                  </label>
                  <input
                    id="bvn"
                    type="text"
                    name="bankDetails.bvn"
                    value={formData.bankDetails.bvn}
                    onChange={(e) => {
                      const value = e.target.value.replace(/\D/g, '').slice(0, 11);
                      const syntheticEvent = {
                        ...e,
                        target: {
                          ...e.target,
                          name: 'bankDetails.bvn',
                          value: value
                        }
                      };
                      handleInputChange(syntheticEvent as React.ChangeEvent<HTMLInputElement>);
                    }}
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent ${formData.bankDetails.bvn && !validateBvn(formData.bankDetails.bvn)
                      ? 'border-red-300 bg-red-50'
                      : 'border-gray-300'
                      }`}
                    placeholder="12345678901 (optional)"
                    maxLength={11}
                  />
                  <p className="text-xs text-gray-500 mt-1">BVN must be exactly 11 digits (optional)</p>
                  {formData.bankDetails.bvn && !validateBvn(formData.bankDetails.bvn) && (
                    <p className="text-xs text-red-500 mt-1">BVN must be exactly 11 digits</p>
                  )}
                  {formData.bankDetails.bvn && validateBvn(formData.bankDetails.bvn) && (
                    <p className="text-xs text-green-600 mt-1 flex items-center">
                      <CheckCircle size={12} className="mr-1" />
                      Valid BVN format
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )

      case 7:
        return (
          <div className="space-y-6">
            <div className="text-left mb-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Terms & Conditions</h2>
              <p className="text-gray-600">Please review and accept our terms to complete your registration</p>
            </div>

            <div className="space-y-4">
              <div className="border border-gray-200 rounded-lg p-4">
                <label className="flex items-start">
                  <input
                    id="agreedToTerms"
                    type="checkbox"
                    name="agreedToTerms"
                    checked={formData.agreedToTerms}
                    onChange={handleInputChange}
                    className="mt-1 mr-3 text-orange-500 focus:ring-orange-500"
                    required
                  />
                  <div>
                    <span className="text-sm font-medium text-gray-700">
                      I agree to the Terms of Service *
                    </span>
                    <p className="text-sm text-gray-600">
                      I understand and agree to Choma's Terms of Service, including payment terms, service standards, and code of conduct for chefs.
                    </p>
                    <button
                      type="button"
                      onClick={() => setShowTermsModal(true)}
                      className="text-orange-600 hover:underline text-sm"
                    >
                      Read Terms of Service
                    </button>
                  </div>
                </label>
              </div>

              <div className="border border-gray-200 rounded-lg p-4">
                <label className="flex items-start">
                  <input
                    id="agreedToPrivacyPolicy"
                    type="checkbox"
                    name="agreedToPrivacyPolicy"
                    checked={formData.agreedToPrivacyPolicy}
                    onChange={handleInputChange}
                    className="mt-1 mr-3 text-orange-500 focus:ring-orange-500"
                    required
                  />
                  <div>
                    <span className="text-sm font-medium text-gray-700">
                      I agree to the Privacy Policy *
                    </span>
                    <p className="text-sm text-gray-600">
                      I understand how Choma collects, uses, and protects my personal information as outlined in the Privacy Policy.
                    </p>
                    <button
                      type="button"
                      onClick={() => setShowPrivacyModal(true)}
                      className="text-orange-600 hover:underline text-sm z-[500]"
                    >
                      Read Privacy Policy
                    </button>
                  </div>
                </label>
              </div>

              <div className="border border-gray-200 rounded-lg p-4">
                <label className="flex items-start">
                  <input
                    id="agreedToBackgroundCheck"
                    type="checkbox"
                    name="agreedToBackgroundCheck"
                    checked={formData.agreedToBackgroundCheck}
                    onChange={handleInputChange}
                    className="mt-1 mr-3 text-orange-500 focus:ring-orange-500"
                    required
                  />
                  <div>
                    <span className="text-sm font-medium text-gray-700">
                      I consent to background verification *
                    </span>
                    <p className="text-sm text-gray-600">
                      I authorize Choma to verify my identity, references, and conduct background checks as necessary for platform safety.
                    </p>
                  </div>
                </label>
              </div>

              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                <h3 className="text-sm font-medium text-orange-800 mb-2">What happens next?</h3>
                <ul className="text-sm text-orange-700 space-y-1">
                  <li>• Your application will be reviewed by our admin team</li>
                  <li>• We'll verify your information and credentials</li>
                  <li>• You'll receive an email notification about your application status</li>
                  <li>• If approved, you can start receiving orders immediately</li>
                </ul>
              </div>
            </div>
          </div>
        )

      default:
        return null
    }
  }

  if (!email || !verificationToken || !isVerified) {
    return null
  }

  return (
    <AuthLayout
      title="Complete your chef profile."
      subtitle="Tell us about your culinary skills, experience, and preferences. This helps us match you with the perfect customers."
    >
      {/* Back Button */}
      <button
        onClick={() => navigate('/register/verify-code', { state: { email } })}
        className="flex items-center text-orange-600 hover:text-orange-700 mb-6 transition-colors"
      >
        <ArrowLeft size={20} className="mr-2" />
        Back to Verification
      </button>

      {/* Progress Steps */}
      <div className="mb-6">
        <div className="flex justify-start">
          <div className="flex flex-wrap justify-start items-center gap-x-2 gap-y-3 max-w-sm">
            {steps.map((step, index) => {
              const Icon = step.icon
              const isActive = currentStep === step.number
              const isCompleted = isStepCompleted(step.number)

              return (
                <div key={step.number} className="flex items-center">
                  <div className="flex flex-col items-center">
                    <button
                      onClick={() => navigateToStep(step.number)}
                      className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-orange-300 ${isCompleted
                        ? 'bg-green-500 text-white cursor-pointer'
                        : isActive
                          ? 'bg-orange-500 text-white cursor-pointer'
                          : 'bg-gray-200 text-gray-500 cursor-pointer hover:bg-gray-300'
                        }`}
                      title={`Go to ${step.title} step`}
                    >
                      {isCompleted ? (
                        <CheckCircle size={16} />
                      ) : (
                        <Icon size={16} />
                      )}
                    </button>
                    <span className={`text-xs mt-1 text-left max-w-12 leading-tight ${isActive ? 'text-orange-600 font-medium' :
                      isCompleted ? 'text-green-600 font-medium' : 'text-gray-500'
                      }`}>
                      {step.title}
                    </span>
                  </div>
                  {index < steps.length - 1 && index % 4 !== 3 && (
                    <div className={`w-6 h-0.5 mx-1 ${isCompleted ? 'bg-green-500' : 'bg-gray-200'
                      }`} />
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Form Content */}
      <div className="bg-white">
        {renderStepContent()}

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mt-6">
            <div className="flex items-center">
              <AlertTriangle size={20} className="text-red-400 mr-3 flex-shrink-0" />
              <div>
                <p className="text-red-800 text-sm">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Navigation Buttons */}
        <div className="flex justify-between mt-6 lg:mt-8">
          <button
            onClick={handlePrevious}
            disabled={currentStep === 1}
            className="px-4 sm:px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base"
          >
            Previous
          </button>

          {currentStep < steps.length ? (
            <button
              onClick={handleNext}
              className="px-4 sm:px-6 py-3 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-semibold rounded-lg transition-all duration-200 transform hover:scale-[1.02] text-sm sm:text-base"
            >
              Next
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={isLoading}
              className="px-4 sm:px-6 py-3 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-semibold rounded-lg transition-all duration-200 transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none text-sm sm:text-base"
            >
              {isLoading ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  Submitting...
                </div>
              ) : (
                'Submit Application'
              )}
            </button>
          )}
        </div>
      </div>

      {/* Terms Modal */}
      <TermsModal
        isOpen={showTermsModal}
        onClose={() => setShowTermsModal(false)}
      />

      {/* Privacy Modal */}
      <PrivacyModal
        isOpen={showPrivacyModal}
        onClose={() => setShowPrivacyModal(false)}
      />
    </AuthLayout>
  )
}

export default CompleteRegistration