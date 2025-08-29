// Shared Driver type used across admin-react components
export interface Driver {
  _id: string;
  fullName: string;
  email: string;
  phone: string;
  driverId: string;
  licenseNumber: string;
  accountStatus: 'pending' | 'approved' | 'suspended' | 'rejected';
  status: 'online' | 'offline' | 'busy';
  isAvailable: boolean;
  vehicleInfo: {
    type: string;
    plateNumber: string;
    model?: string;
  };
  currentLocation?: {
    coordinates: [number, number];
  };
  stats?: {
    totalDeliveries: number;
    completedDeliveries: number;
    totalEarnings: number;
    rating: number;
  };
  // Optional fields populated by admin API
  completionRate?: number;
  activeAssignment?: {
    _id?: string;
    status?: string;
    orderId?: string | {
      orderNumber?: string;
      totalAmount?: number;
    };
    estimatedDeliveryTime?: string;
  };
  lastActiveAt: string;
  createdAt: string;
}

export interface DriverApiResponse {
  success: boolean;
  data: Driver[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
  };
  // Summary counts provided by the admin API
  summary?: {
    total?: number;
    pending?: number;
    approved?: number;
    suspended?: number;
    online?: number;
    busy?: number;
  };
}
