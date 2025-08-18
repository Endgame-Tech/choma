// Chef types
export interface Chef {
  _id: string
  chefId?: string
  fullName: string
  email: string
  phone?: string
  status: 'Active' | 'Inactive' | 'Suspended' | 'Pending'
  specialties?: string[]
  experience?: string
  bio?: string
  rating?: number
  totalOrdersCompleted?: number
  currentCapacity?: number
  maxCapacity?: number
  availability?: 'Available' | 'Busy' | 'Offline' | 'Unavailable'
  location?: {
    city: string
    area?: string
    address?: string
  }
  profileImage?: string
  joinDate?: string
  createdAt?: string
  lastLogin?: string
  bankDetails?: {
    accountName: string
    accountNumber: string
    bankName: string
    bankCode: string
  }
  earnings?: {
    totalEarnings: number
    currentMonthEarnings: number
    pendingPayments: number
    lastPaymentDate?: string
  }
}

// Order types
export interface OrderItem {
  _id?: string
  name: string
  quantity: number
  price: number
  description?: string
  specialInstructions?: string
}

export interface DeliveryAddress {
  street: string
  city: string
  state?: string
  zipCode?: string
  country?: string
  coordinates?: {
    lat: number
    lng: number
  }
}

export interface Order {
  _id: string
  orderNumber: string
  customer: {
    _id: string
    fullName: string
    email: string
    phone?: string
  }
  subscription?: {
    _id: string
    mealPlanId: {
      planName: string
      planType?: string
    }
  }
  items?: OrderItem[]
  orderItems?: any
  orderStatus: 'Pending' | 'Confirmed' | 'Preparing' | 'InProgress' | 'Out for Delivery' | 'Completed' | 'Delivered' | 'Cancelled' | 'Accepted' | 'Ready' | 'OutForDelivery'
  totalAmount: number
  paymentMethod: 'Card' | 'Transfer' | 'Cash on Delivery'
  paymentStatus: 'Paid' | 'Pending' | 'Failed' | 'Refunded'
  deliveryAddress?: DeliveryAddress
  deliveryDate?: string
  estimatedDelivery?: string
  actualDelivery?: string
  assignedChef?: Chef | null
  delegationStatus?: 'Not Assigned' | 'Pending Assignment' | 'Assigned' | 'Accepted' | 'In Progress' | 'Completed' | null
  priority: 'Low' | 'Medium' | 'High' | 'Urgent'
  chefNotes?: string
  adminNotes?: string
  specialInstructions?: string
  createdDate: string
  updatedDate: string
  urgencyInfo?: {
    urgencyLevel: string
    daysSinceOrder: number
    displayText: string
  }
}

// API Response types
export interface ApiResponse<T> {
  success: boolean
  data: T
  message?: string
  error?: string
}

// Auth types
export interface LoginCredentials {
  email: string
  password: string
}

export interface RegisterData {
  // Personal Information
  fullName: string
  email: string
  phone: string
  alternatePhone?: string
  dateOfBirth: string
  gender: 'Male' | 'Female' | 'Other'
  password: string
  confirmPassword: string
  
  // Identity Verification
  identityVerification: {
    idType: 'National ID' | 'Driver License' | 'International Passport' | 'Voter Card'
    idNumber: string
    idExpiryDate?: string
  }
  
  // Professional Details
  specialties: string[]
  experience: number
  culinaryEducation?: string
  previousWorkExperience?: string
  certifications: string[]
  languagesSpoken: string[]
  
  // Location & Service Area
  location: {
    streetAddress: string
    city: string
    state: string
    postalCode?: string
    country: string
    serviceRadius: number // in kilometers
  }
  
  // Kitchen & Equipment
  kitchenDetails: {
    hasOwnKitchen: boolean
    kitchenEquipment: string[]
    canCookAtCustomerLocation: boolean
    transportationMethod: 'Own Vehicle' | 'Motorcycle' | 'Public Transport' | 'Delivery Service'
  }
  
  // Availability
  availability: {
    daysAvailable: string[]
    hoursPerDay: {
      start: string
      end: string
    }
    maxOrdersPerDay: number
  }
  
  // Emergency Contact
  emergencyContact: {
    name: string
    relationship: string
    phone: string
  }
  
  // References
  references: {
    name: string
    relationship: string
    phone: string
    email?: string
  }[]
  
  // Bank Details
  bankDetails: {
    accountName: string
    accountNumber: string
    bankName: string
    bankCode: string
    bvn: string
    isVerified: boolean
    recipientCode?: string
  }
  
  // Profile & Portfolio
  profilePhoto?: string
  portfolioImages?: string[]
  bio?: string
  
  // Health & Safety
  healthCertificates: string[]
  foodSafetyCertification?: string
  
  // Legal Agreements
  agreedToTerms: boolean
  agreedToPrivacyPolicy: boolean
  agreedToBackgroundCheck: boolean
}

export interface AuthContextType {
  chef: Chef | null
  login: (credentials: LoginCredentials) => Promise<void>
  register: (data: RegisterData) => Promise<void>
  logout: () => void
  updateChef: (chef: Chef) => void
  loading: boolean
  isAuthenticated: boolean
}

// Dashboard stats
export interface ChefDashboardStats {
  totalOrders: number
  completedOrders: number
  pendingOrders: number
  inProgressOrders: number
  totalEarnings: number
  currentMonthEarnings: number
  pendingPayments: number
  averageRating: number
  currentCapacity: number
  maxCapacity: number
}

// Earnings types
export interface EarningsData {
  totalEarnings: number
  currentMonthEarnings: number
  availableBalance: number
  pendingPayments: number
  ordersCompleted: number
  averageOrderValue: number
}

export interface PaymentRecord {
  _id: string
  chefId: string
  amount: number
  type: 'earning' | 'withdrawal' | 'bonus' | 'deduction'
  status: 'pending' | 'completed' | 'processing' | 'failed' | 'cancelled'
  description?: string
  orderId?: string
  paymentMethod?: string
  transactionId?: string
  createdAt: string
  updatedAt: string
}