/**
 * Chef API Service - Handles all chef-related API calls including status updates with email notifications
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001';

interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
  emailSent?: boolean;
  notificationSent?: boolean;
  previousStatus?: string;
  statusChanged?: boolean;
  error?: string;
}

interface Chef {
  _id: string;
  fullName: string;
  email: string;
  status: 'Active' | 'Inactive' | 'Suspended' | 'Pending';
  profileImage?: string;
  cuisineSpecialties?: string[];
  rating?: number;
  totalOrders?: number;
  joinDate?: string;
  availability?: string;
  phone?: string;
  address?: string;
}

interface UpdateChefStatusPayload {
  status: 'Active' | 'Inactive' | 'Suspended' | 'Pending';
  reason?: string;
  sendEmail?: boolean;
}

interface ApproveChefPayload {
  sendEmail?: boolean;
}

interface RejectChefPayload {
  reason?: string;
  sendEmail?: boolean;
}

interface ChefStats {
  totalChefs: number;
  activeChefs: number;
  suspendedChefs: number;
  pendingChefs: number;
  averageRating: number;
  totalOrders: number;
}

class ChefApiService {
  private async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    try {
      const url = `${API_BASE_URL}/api/admin${endpoint}`;
      
      const defaultHeaders = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('choma-admin-token') || ''}`,
      };

      const response = await fetch(url, {
        ...options,
        headers: {
          ...defaultHeaders,
          ...options.headers,
        },
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || `HTTP error! status: ${response.status}`);
      }

      return result;
    } catch (error) {
      console.error(`Chef API Error (${endpoint}):`, error);
      throw error;
    }
  }

  /**
   * Get all chefs
   */
  async getAllChefs(): Promise<ApiResponse<Chef[]>> {
    return this.makeRequest<Chef[]>('/chefs');
  }

  /**
   * Get chef details by ID
   */
  async getChefDetails(chefId: string): Promise<ApiResponse<Chef>> {
    return this.makeRequest<Chef>(`/chefs/${chefId}`);
  }

  /**
   * Update chef status with email notification
   */
  async updateChefStatus(chefId: string, payload: UpdateChefStatusPayload): Promise<ApiResponse<Chef>> {
    return this.makeRequest<Chef>(`/chefs/${chefId}/status`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  }

  /**
   * Approve chef with email notification
   */
  async approveChef(chefId: string, payload: ApproveChefPayload = {}): Promise<ApiResponse<Chef>> {
    return this.makeRequest<Chef>(`/chefs/${chefId}/approve`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  }

  /**
   * Reject chef with email notification
   */
  async rejectChef(chefId: string, payload: RejectChefPayload): Promise<ApiResponse<Chef>> {
    return this.makeRequest<Chef>(`/chefs/${chefId}/reject`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  }

  /**
   * Get chef statistics
   */
  async getChefStats(): Promise<ApiResponse<ChefStats>> {
    return this.makeRequest<ChefStats>('/chefs/stats');
  }

  /**
   * Get pending chefs count
   */
  async getPendingChefsCount(): Promise<ApiResponse<{ count: number }>> {
    return this.makeRequest('/chefs/pending/count');
  }

  /**
   * Notify chef (general notification)
   */
  async notifyChef(chefId: string, payload: { message: string; type?: string }): Promise<ApiResponse> {
    return this.makeRequest(`/chefs/${chefId}/notify`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  /**
   * Suspend chef with reason and email notification
   */
  async suspendChef(chefId: string, reason?: string, sendEmail: boolean = true): Promise<ApiResponse<Chef>> {
    return this.updateChefStatus(chefId, {
      status: 'Suspended',
      reason: reason || 'Violation of platform policies',
      sendEmail,
    });
  }

  /**
   * Deactivate chef with reason and email notification
   */
  async deactivateChef(chefId: string, reason?: string, sendEmail: boolean = true): Promise<ApiResponse<Chef>> {
    return this.updateChefStatus(chefId, {
      status: 'Inactive',
      reason: reason || 'Account deactivation requested',
      sendEmail,
    });
  }

  /**
   * Reactivate chef with email notification
   */
  async reactivateChef(chefId: string, sendEmail: boolean = true): Promise<ApiResponse<Chef>> {
    return this.updateChefStatus(chefId, {
      status: 'Active',
      sendEmail,
    });
  }

  /**
   * Unsuspend chef with email notification
   */
  async unsuspendChef(chefId: string, sendEmail: boolean = true): Promise<ApiResponse<Chef>> {
    return this.updateChefStatus(chefId, {
      status: 'Active',
      sendEmail,
    });
  }
}

export default new ChefApiService();
export type { Chef, UpdateChefStatusPayload, ApproveChefPayload, RejectChefPayload, ApiResponse };
