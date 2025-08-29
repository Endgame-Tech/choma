import axios from 'axios';
import { 
  LoginCredentials, 
  RegisterData, 
  AuthResponse, 
  ApiResponse, 
  DeliveryAssignment,
  DailyStats,
  Driver,
  Location,
  DeliveryConfirmationData,
  PickupConfirmationData
} from '../types';

// Base API configuration
const API_BASE_URL = (import.meta as any).env?.VITE_API_URL || 'http://localhost:5001';

class DriverApiService {
  private api: any;
  private cache: Map<string, { data: any; timestamp: number }> = new Map();
  private readonly CACHE_DURATION = 10000; // 10 seconds cache

  constructor() {
    this.api = axios.create({
      baseURL: `${API_BASE_URL}/api/driver`,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Add token to requests
    this.api.interceptors.request.use((config: any) => {
      const token = localStorage.getItem('driverToken');
      if (token) {
        config.headers = config.headers || {};
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });

    // Handle auth errors
    this.api.interceptors.response.use(
      (response: any) => response,
      (error: any) => {
        if (error?.response?.status === 401) {
          try {
            localStorage.removeItem('driverToken');
            localStorage.removeItem('driverData');
            if (typeof window !== 'undefined') {
              const currentPath = window.location.pathname;
              // Avoid forcing a reload if we're already on the login page to prevent reload loops
              if (currentPath !== '/login') {
                // Use replace so we don't add an extra history entry
                window.location.replace('/login');
              } else {
                // Already on login; skip reload
                // eslint-disable-next-line no-console
                console.warn('Received 401 while on /login — skipping reload to avoid loop.');
              }
            }
          } catch (e) {
            // silent
          }
        }
        return Promise.reject(error);
      }
    );
  }

  private async handleRequest<T>(request: Promise<any>): Promise<ApiResponse<T>> {
    try {
      const response = await request;
      return {
        success: true,
        data: response.data.data || response.data,
        message: response.data.message,
      };
    } catch (error: any) {
      console.error('API Request Error:', error);
      return {
        success: false,
        message: error.response?.data?.message || error.message || 'Request failed',
        error: error.response?.data?.error || error.message,
      };
    }
  }

  // Authentication methods
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    const response = await this.handleRequest<{ driver: Driver; token: string }>(
      this.api.post('/auth/login', credentials)
    );
    return response as AuthResponse;
  }

  async register(data: RegisterData): Promise<ApiResponse> {
    return this.handleRequest(this.api.post('/auth/register', data));
  }

  async logout(): Promise<ApiResponse> {
    return this.handleRequest(this.api.post('/auth/logout'));
  }

  async verifyToken(): Promise<boolean> {
    try {
      const response = await this.api.post('/auth/verify');
      return response.data.success;
    } catch (error) {
      return false;
    }
  }

  async resetPassword(email: string): Promise<ApiResponse> {
    return this.handleRequest(this.api.post('/auth/reset-password', { email }));
  }

  private getCachedData(key: string): any {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      return cached.data;
    }
    return null;
  }

  private setCachedData(key: string, data: any): void {
    this.cache.set(key, { data, timestamp: Date.now() });
  }

  // Profile methods
  async getProfile(): Promise<ApiResponse<Driver>> {
    const cacheKey = 'profile';
    const cached = this.getCachedData(cacheKey);
    if (cached) {
      console.log('📁 Using cached profile data');
      return cached;
    }

    const result = await this.handleRequest<Driver>(this.api.get('/profile'));
    if (result.success) {
      this.setCachedData(cacheKey, result);
    }
    return result;
  }

  async updateProfile(updates: Partial<Driver>): Promise<ApiResponse<Driver>> {
    return this.handleRequest<Driver>(this.api.put('/profile', updates));
  }

  async uploadProfilePhoto(file: File): Promise<ApiResponse<{ profileImage: string }>> {
    const formData = new FormData();
    formData.append('profilePhoto', file);
    
    return this.handleRequest<{ profileImage: string }>(
      this.api.post('/profile/photo', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
    );
  }

  // Location methods
  async updateLocation(location: Location): Promise<ApiResponse> {
    return this.handleRequest(this.api.put('/location', location));
  }

  // Assignment methods
  async getAssignments(): Promise<ApiResponse<DeliveryAssignment[]>> {
    const cacheKey = 'assignments';
    const cached = this.getCachedData(cacheKey);
    if (cached) {
      console.log('📁 Using cached assignments data');
      return cached;
    }

    const result = await this.handleRequest<DeliveryAssignment[]>(this.api.get('/assignments'));
    if (result.success) {
      this.setCachedData(cacheKey, result);
    }
    return result;
  }

  async acceptAssignment(assignmentId: string): Promise<ApiResponse> {
    return this.handleRequest(this.api.post(`/assignments/${assignmentId}/accept`));
  }

  async confirmPickup(
    assignmentId: string, 
    data: PickupConfirmationData
  ): Promise<ApiResponse> {
    return this.handleRequest(this.api.put(`/assignments/${assignmentId}/pickup`, data));
  }

  async confirmDelivery(
    assignmentId: string, 
    data: DeliveryConfirmationData
  ): Promise<ApiResponse> {
    return this.handleRequest(this.api.put(`/assignments/${assignmentId}/deliver`, data));
  }

  async cancelAssignment(
    assignmentId: string, 
    reason: string
  ): Promise<ApiResponse> {
    return this.handleRequest(this.api.put(`/assignments/${assignmentId}/cancel`, { reason }));
  }

  async updateDeliveryStatus(
    assignmentId: string, 
    status: string, 
    data?: any
  ): Promise<ApiResponse> {
    return this.handleRequest(
      this.api.put(`/assignments/${assignmentId}/status`, { status, ...data })
    );
  }

  async uploadDeliveryPhoto(assignmentId: string, file: File): Promise<ApiResponse> {
    const formData = new FormData();
    formData.append('deliveryPhoto', file);
    
    return this.handleRequest(
      this.api.post(`/assignments/${assignmentId}/photo`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
    );
  }

  // History and stats methods
  async getDeliveryHistory(page = 1, limit = 20): Promise<ApiResponse<DeliveryAssignment[]>> {
    return this.handleRequest<DeliveryAssignment[]>(
      this.api.get(`/history?page=${page}&limit=${limit}`)
    );
  }

  async getDailyStats(date?: string): Promise<ApiResponse<DailyStats>> {
    const queryDate = date || new Date().toISOString().split('T')[0];
    return this.handleRequest<DailyStats>(this.api.get(`/stats/daily?date=${queryDate}`));
  }

  async getWeeklyStats(): Promise<ApiResponse> {
    return this.handleRequest(this.api.get('/stats/weekly'));
  }

  async getMonthlyStats(): Promise<ApiResponse> {
    return this.handleRequest(this.api.get('/stats/monthly'));
  }

  async getEarnings(period = 'week'): Promise<ApiResponse> {
    return this.handleRequest(this.api.get(`/earnings?period=${period}`));
  }

  // Status methods
  async goOnline(): Promise<ApiResponse> {
    return this.handleRequest(this.api.post('/status/online'));
  }

  async goOffline(): Promise<ApiResponse> {
    return this.handleRequest(this.api.post('/status/offline'));
  }

  async setBreakStatus(): Promise<ApiResponse> {
    return this.handleRequest(this.api.post('/status/break'));
  }

  // Notification methods
  async getNotifications(): Promise<ApiResponse> {
    return this.handleRequest(this.api.get('/notifications'));
  }

  async markNotificationAsRead(notificationId: string): Promise<ApiResponse> {
    return this.handleRequest(this.api.put(`/notifications/${notificationId}/read`));
  }

  async updateNotificationSettings(settings: any): Promise<ApiResponse> {
    return this.handleRequest(this.api.put('/notifications/settings', settings));
  }

  // Support methods
  async reportIssue(issueData: any): Promise<ApiResponse> {
    return this.handleRequest(this.api.post('/support/issue', issueData));
  }

  async getHelpArticles(): Promise<ApiResponse> {
    return this.handleRequest(this.api.get('/support/articles'));
  }

  // Device token for push notifications
  async updateDeviceToken(deviceToken: string): Promise<ApiResponse> {
    return this.handleRequest(this.api.put('/device-token', { deviceToken }));
  }
}

export const driverApi = new DriverApiService();

// Helper functions
export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
  }).format(amount);
};

export const formatDistance = (distanceInKm: number): string => {
  if (distanceInKm < 1) {
    return `${Math.round(distanceInKm * 1000)}m`;
  }
  return `${distanceInKm.toFixed(1)}km`;
};

export const formatTime = (minutes: number): string => {
  if (minutes < 60) {
    return `${minutes} min`;
  }
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return `${hours}h ${remainingMinutes}min`;
};

export const getStatusColor = (status: string): string => {
  const statusColors: Record<string, string> = {
    available: 'bg-driver-primary',
    assigned: 'bg-driver-secondary',
    picked_up: 'bg-driver-warning',
    delivered: 'bg-driver-success',
    cancelled: 'bg-gray-500',
    online: 'bg-driver-success',
    offline: 'bg-gray-500',
    on_delivery: 'bg-driver-warning',
    break: 'bg-driver-info',
  };
  return statusColors[status] || 'bg-gray-500';
};

export const getStatusText = (status: string): string => {
  const statusTexts: Record<string, string> = {
    available: 'Available',
    assigned: 'Assigned',
    picked_up: 'Picked Up',
    delivered: 'Delivered',
    cancelled: 'Cancelled',
    online: 'Online',
    offline: 'Offline',
    on_delivery: 'On Delivery',
    break: 'On Break',
  };
  return statusTexts[status] || 'Unknown';
};