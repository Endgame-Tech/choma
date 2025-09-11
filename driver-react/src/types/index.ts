// Driver types
export interface Driver {
  _id: string;
  driverId: string;
  fullName: string;
  email: string;
  phone: string;
  licenseNumber: string;
  vehicleInfo: {
    type: 'motorcycle' | 'bicycle' | 'car' | 'van';
    model?: string;
    plateNumber: string;
    capacity: number;
  };
  accountStatus: 'pending' | 'approved' | 'rejected' | 'suspended';
  status: 'online' | 'offline' | 'on_delivery' | 'break';
  currentLocation?: {
    coordinates: [number, number]; // [longitude, latitude]
    lastUpdated: string;
  };
  rating: {
    average: number;
    count: number;
  };
  deliveryStats: {
    totalDeliveries: number;
    completedDeliveries: number;
    cancelledDeliveries: number;
    totalDistance: number;
    averageDeliveryTime: number;
  };
  earnings: {
    totalEarnings: number;
    pendingEarnings: number;
    weeklyEarnings: number;
    monthlyEarnings: number;
    lastPayout?: string;
  };
  profileImage?: string;
  isAvailable: boolean;
  lastActiveAt: string;
  joinDate: string;
}

// Assignment types
export interface DeliveryAssignment {
  _id: string;
  driverId: string;
  orderId: string;
  confirmationCode: string;
  pickupLocation: {
    address: string;
    coordinates: [number, number];
    chefId: string;
    chefName: string;
    chefPhone: string;
    instructions?: string;
  };
  deliveryLocation: {
    address: string;
    coordinates: [number, number];
    area: string;
    instructions?: string;
  };
  status: 'available' | 'assigned' | 'picked_up' | 'delivered' | 'cancelled';
  assignedAt: string;
  acceptedAt?: string;
  pickedUpAt?: string;
  deliveredAt?: string;
  estimatedPickupTime: string;
  estimatedDeliveryTime: string;
  totalDistance: number;
  estimatedDuration: number;
  baseFee: number;
  distanceFee: number;
  totalEarning: number;
  deliveryConfirmation?: {
    confirmedAt: string;
    confirmationMethod: 'code' | 'photo' | 'signature';
    deliveryPhoto?: string;
    deliveryNotes?: string;
  };
  pickupConfirmation?: {
    confirmedAt: string;
    pickupNotes?: string;
    pickupPhoto?: string;
  };
  priority: 'low' | 'normal' | 'high' | 'urgent';
  specialInstructions?: string;
  isFirstDelivery: boolean;
  subscriptionInfo?: {
    subscriptionId: string;
    mealPlanId: string;
    deliveryDay: number;
    isActivationDelivery: boolean;
  };
  // Package coordination with chef
  packageLabelId?: string;
  // Customer information for driver contact
  customerInfo?: {
    fullName: string;
    phone: string;
    email: string;
  };
}

// Auth types
export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  fullName: string;
  email: string;
  password: string;
  phone: string;
  licenseNumber: string;
  vehicleInfo: {
    type: string;
    model?: string;
    plateNumber: string;
  };
}

export interface AuthResponse {
  success: boolean;
  message?: string;
  data?: {
    driver: Driver;
    token: string;
  };
}

// Location types
export interface Location {
  latitude: number;
  longitude: number;
  timestamp?: string;
}

export interface LocationPermission {
  granted: boolean;
  accuracy?: 'precise' | 'approximate';
}

// API Response types
export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
}

// Dashboard stats
export interface DailyStats {
  totalDeliveries: number;
  completedDeliveries: number;
  earnings: number;
  distance: number;
}

// Notification types
export interface Notification {
  _id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  read: boolean;
  createdAt: string;
  data?: any;
}

// Delivery confirmation data
export interface DeliveryConfirmationData {
  confirmationCode: string;
  notes?: string;
  photo?: string;
}

export interface PickupConfirmationData {
  notes?: string;
  photo?: string;
}

// Subscription types for drivers
export interface SubscriptionGroup {
  subscriptionId: {
    _id: string;
    status: string;
    frequency: string;
    nextDeliveryDate: string;
    dietaryPreferences: string[];
  };
  mealPlan: {
    _id: string;
    planName: string;
    durationWeeks: number;
    planDescription: string;
  };
  customer: {
    _id: string;
    fullName: string;
    phone: string;
    email: string;
    profilePicture?: string;
    preferences?: any;
  };
  assignments: DeliveryAssignment[];
  totalDeliveries: number;
  relationshipScore: number;
}

export interface SubscriptionDeliveriesResponse {
  subscriptionGroups: SubscriptionGroup[];
  summary: {
    totalActiveSubscriptions: number;
    totalDeliveriesToday: number;
    avgRelationshipScore: number;
  };
}

export interface WeeklyDeliverySchedule {
  date: string;
  dayName: string;
  deliveries: DeliveryAssignment[];
  subscriptionDeliveries: number;
  oneTimeDeliveries: number;
}

export interface RouteOptimization {
  date: string;
  area: string;
  deliveries: DeliveryAssignment[];
  estimatedTimeSaving: number;
}

export interface WeeklyScheduleResponse {
  weekStart: string;
  weekEnd: string;
  weeklySchedule: WeeklyDeliverySchedule[];
  routeOptimizations: RouteOptimization[];
  statistics: {
    totalDeliveries: number;
    subscriptionDeliveries: number;
    oneTimeDeliveries: number;
    uniqueCustomers: number;
    routeOptimizations: number;
    totalDistance: number;
    totalEarnings: number;
  };
}

export interface SubscriptionMetrics {
  period: string;
  metrics: {
    subscription: {
      totalDeliveries: number;
      deliveredOrders: number;
      onTimeRate: number;
      totalEarnings: number;
      avgDeliveryTimeMinutes: number;
      uniqueCustomers: number;
    };
    oneTime: {
      totalDeliveries: number;
      deliveredOrders: number;
      onTimeRate: number;
      totalEarnings: number;
    };
    comparison: {
      subscriptionEarningsPercentage: number;
      subscriptionDeliveryPercentage: number;
    };
  };
  insights: {
    customerRetention: 'excellent' | 'good' | 'developing';
    performanceVsOneTime: 'better' | 'needs_improvement';
    earningsComparison: 'higher' | 'lower';
    strengths: string[];
    improvementAreas: string[];
    recommendations: Array<{
      category: string;
      priority: string;
      action: string;
      expectedImpact: string;
    }>;
  };
}

export interface CustomerTimeline {
  stepNumber: number;
  weekNumber: number;
  dayOfWeek: number;
  dayName: string;
  mealTime: string;
  mealTitle: string;
  mealDescription?: string;
  isDelivered: boolean;
  isInProgress: boolean;
  isUpcoming: boolean;
  scheduledDeliveryTime?: string;
  actualDeliveryTime?: string;
  deliveredBy?: string;
  deliveryStatus: string;
  isMyDelivery: boolean;
}

export interface CustomerTimelineResponse {
  subscription: any;
  timeline: CustomerTimeline[];
  progression: {
    totalSteps: number;
    deliveredSteps: number;
    inProgressSteps: number;
    progressPercentage: number;
    myDeliveries: number;
    relationshipStrength: number;
  };
}