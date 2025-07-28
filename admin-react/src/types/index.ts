// Base API Response
export interface ApiResponse<T> {
  success: boolean
  data: T
  message?: string
  error?: string
}

// Customer
export interface Customer {
  _id: string
  fullName: string
  email: string
  phone?: string
  customerId?: string
  address?: string
}

// User (extends Customer with admin management fields)
export interface User {
  _id: string
  fullName: string
  email: string
  phone?: string
  customerId?: string
  address?: string
  status: 'Active' | 'Inactive' | 'Suspended' | 'Deleted'
  registrationDate: string
  lastLogin?: string
  emailVerified?: boolean
  profileComplete?: boolean
  subscriptionStatus?: string
  totalOrders?: number
  totalSpent?: number
}

// Meal Plan
export interface MealPlan {
  _id: string
  planName: string
  planType?: string
  duration?: string
  mealsPerDay?: number
  price?: number
}

// Subscription
export interface Subscription {
  _id: string
  subscriptionId: string
  userId: string
  mealPlanId: MealPlan
  frequency: string
  duration: string
  status: string
  startDate: string
  endDate?: string
  totalPrice: number
  paymentStatus: string
  deliveryAddress?: string
  autoRenewal: boolean
}

// Chef
export interface Chef {
  _id: string
  chefId?: string
  fullName: string
  email: string
  phone: string
  status: 'Active' | 'Inactive' | 'Suspended' | 'Pending'
  specialties: string[]
  experience: number
  rating: number
  totalOrdersCompleted: number
  currentCapacity: number
  maxCapacity: number
  availability: 'Available' | 'Busy' | 'Offline'
  location: {
    city: string
    area?: string
    address?: string
  }
  profileImage?: string
  joinDate: string
  lastLogin?: string
  workingHours?: {
    start: string
    end: string
    timezone?: string
  }
  preferences?: {
    cuisineTypes: string[]
    workingDays: string[]
    maxOrdersPerDay?: number
  }
  bankDetails?: {
    accountName: string
    accountNumber: string
    bankName: string
    routingNumber?: string
  }
  earnings?: {
    totalEarned: number
    currentBalance: number
    lastPayoutDate?: string
    averageOrderValue: number
  }
}

// Order
export interface Order {
  _id: string
  orderNumber: string
  customer: Customer
  subscription?: Subscription
  orderItems?: any
  orderStatus: 'Pending' | 'Confirmed' | 'Preparing' | 'InProgress' | 'Out for Delivery' | 'Completed' | 'Delivered' | 'Cancelled'
  totalAmount: number
  paymentMethod: 'Card' | 'Transfer' | 'Cash on Delivery'
  paymentReference?: string
  paymentStatus: 'Paid' | 'Pending' | 'Failed' | 'Refunded'
  deliveryAddress?: string
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

// Order Filters
export interface OrderFilters {
  page?: number
  limit?: number
  search?: string
  orderStatus?: string
  paymentStatus?: string
  delegationStatus?: string
  priority?: string
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
  dateFrom?: string
  dateTo?: string
}

// Pagination
export interface Pagination {
  currentPage: number
  totalPages: number
  totalOrders: number
  hasNext: boolean
  hasPrev: boolean
  limit: number
}

// Orders Response
export interface OrdersResponse {
  orders: Order[]
  stats: {
    orderStatus: Record<string, { count: number; total: number }>
    paymentStatus: Record<string, { count: number; total: number }>
  }
}

// Dashboard Stats
export interface DashboardStats {
  overview: {
    totalUsers: number
    activeUsers: number
    deletedUsers: number
    totalOrders: number
    totalSubscriptions: number
    totalMealPlans: number
    totalRevenue: number
    paidOrders: number
    pendingPayments: number
    failedPayments: number
    refundedOrders: number
  }
  orderStatusBreakdown: Array<{ _id: string; count: number }>
  recentOrders: Order[]
}

// Chef Assignment Data
export interface ChefAssignmentData {
  orderId: string
  chefId: string
  notes?: string
  estimatedHours?: number
  priority?: string
  specialInstructions?: string
  chefFeePercentage?: number
}

// Bulk Assignment Data
export interface BulkAssignmentData {
  orderIds: string[]
  chefId: string
  notes?: string
}

// Chef Performance Data
export interface ChefPerformanceData {
  _id: string
  chefId: string
  fullName: string
  email: string
  phone: string
  status: string
  rating: number
  totalOrdersCompleted: number
  currentCapacity: number
  maxCapacity: number
  availability: string
  specialties: string[]
  experience: number
  completionRate: number
  avgDeliveryTime: number
  customerSatisfaction: number
}