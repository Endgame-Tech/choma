// NOTE: Add 'deliveryPrices' to AdminPermissions for Delivery Prices sidebar navigation.
export interface AdminPermissions {
  // Dashboard permissions
  dashboard: {
    view: boolean;
  };
  
  // Analytics permissions
  analytics: {
    view: boolean;
  };
  
  // Orders permissions
  orders: {
    view: boolean;
    create: boolean;
    edit: boolean;
    delete: boolean;
    approve: boolean;
  };
  
  // Chefs permissions
  chefs: {
    view: boolean;
    create: boolean;
    edit: boolean;
    delete: boolean;
    approve: boolean;
    manageApplications: boolean;
  };
  
  // Users permissions
  users: {
    view: boolean;
    create: boolean;
    edit: boolean;
    delete: boolean;
    viewSensitiveInfo: boolean;
  };
  
  // Customers permissions
  customers: {
    view: boolean;
    edit: boolean;
    delete: boolean;
    viewSensitiveInfo: boolean;
  };
  
  // Meals permissions
  meals: {
    view: boolean;
    create: boolean;
    edit: boolean;
    delete: boolean;
    bulkUpload: boolean;
    manageAvailability: boolean;
  };
  
  // Meal Plans permissions
  mealPlans: {
    view: boolean;
    create: boolean;
    edit: boolean;
    delete: boolean;
    publish: boolean;
    schedule: boolean;
  };
  
  // Banners permissions
  banners: {
    view: boolean;
    create: boolean;
    edit: boolean;
    delete: boolean;
  };
  
  // Admin Management permissions
  adminManagement: {
    view: boolean;
    create: boolean;
    edit: boolean;
    delete: boolean;
    managePermissions: boolean;
    view_activity_logs: boolean;
    manage_sessions: boolean;
  };
  
  // Delivery Prices permissions (used for Delivery Prices sidebar navigation)
  deliveryPrices: {
    view: boolean;
  };
}

export interface AdminRole {
  id: string;
  name: string;
  description: string;
  permissions: AdminPermissions;
  isDefault?: boolean;
}

export interface Admin {
  _id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: AdminRole;
  isActive: boolean;
  isAlphaAdmin: boolean; // True for the main admin (you)
  createdAt: string;
  updatedAt: string;
  lastLogin?: string;
  profileImage?: string;
}

export interface CreateAdminRequest {
  email: string;
  firstName: string;
  lastName: string;
  roleId: string;
  password: string;
}

export interface UpdateAdminRequest {
  firstName?: string;
  lastName?: string;
  roleId?: string;
  isActive?: boolean;
}

// Predefined roles (now include deliveryPrices permission for Delivery Prices sidebar)
export const PREDEFINED_ROLES: AdminRole[] = [
  {
    id: 'super_admin',
    name: 'Super Admin',
    description: 'Full access to all features and admin management',
    isDefault: true,
    permissions: {
      dashboard: { view: true },
      analytics: { view: true },
      orders: { view: true, create: true, edit: true, delete: true, approve: true },
      chefs: { view: true, create: true, edit: true, delete: true, approve: true, manageApplications: true },
      users: { view: true, create: true, edit: true, delete: true, viewSensitiveInfo: true },
      customers: { view: true, edit: true, delete: true, viewSensitiveInfo: true },
      meals: { view: true, create: true, edit: true, delete: true, bulkUpload: true, manageAvailability: true },
      mealPlans: { view: true, create: true, edit: true, delete: true, publish: true, schedule: true },
      banners: { view: true, create: true, edit: true, delete: true },
  adminManagement: { view: true, create: true, edit: true, delete: true, managePermissions: true, view_activity_logs: true, manage_sessions: true },
  deliveryPrices: { view: true }
    }
  },
  {
    id: 'content_manager',
    name: 'Content Manager',
    description: 'Manage meals and meal plans, limited access to users',
    isDefault: true,
    permissions: {
      dashboard: { view: true },
      analytics: { view: true },
      orders: { view: true, create: false, edit: true, delete: false, approve: false },
      chefs: { view: true, create: false, edit: true, delete: false, approve: false, manageApplications: false },
      users: { view: true, create: false, edit: false, delete: false, viewSensitiveInfo: false },
      customers: { view: true, edit: false, delete: false, viewSensitiveInfo: false },
      meals: { view: true, create: true, edit: true, delete: true, bulkUpload: true, manageAvailability: true },
      mealPlans: { view: true, create: true, edit: true, delete: true, publish: true, schedule: true },
      banners: { view: true, create: true, edit: true, delete: true },
  adminManagement: { view: false, create: false, edit: false, delete: false, managePermissions: false, view_activity_logs: false, manage_sessions: false },
  deliveryPrices: { view: true }
    }
  },
  {
    id: 'operations_staff',
    name: 'Operations Staff',
    description: 'Handle orders and chef management, no admin access',
    isDefault: true,
    permissions: {
      dashboard: { view: true },
      analytics: { view: true },
      orders: { view: true, create: true, edit: true, delete: false, approve: true },
      chefs: { view: true, create: false, edit: true, delete: false, approve: true, manageApplications: true },
      users: { view: true, create: false, edit: false, delete: false, viewSensitiveInfo: false },
      customers: { view: true, edit: true, delete: false, viewSensitiveInfo: false },
      meals: { view: true, create: false, edit: false, delete: false, bulkUpload: false, manageAvailability: true },
      mealPlans: { view: true, create: false, edit: false, delete: false, publish: false, schedule: false },
      banners: { view: true, create: false, edit: false, delete: false },
  adminManagement: { view: false, create: false, edit: false, delete: false, managePermissions: false, view_activity_logs: false, manage_sessions: false },
  deliveryPrices: { view: true }
    }
  },
  {
    id: 'viewer',
    name: 'Viewer',
    description: 'Read-only access to most sections',
    isDefault: true,
    permissions: {
      dashboard: { view: true },
      analytics: { view: true },
      orders: { view: true, create: false, edit: false, delete: false, approve: false },
      chefs: { view: true, create: false, edit: false, delete: false, approve: false, manageApplications: false },
      users: { view: true, create: false, edit: false, delete: false, viewSensitiveInfo: false },
      customers: { view: true, edit: false, delete: false, viewSensitiveInfo: false },
      meals: { view: true, create: false, edit: false, delete: false, bulkUpload: false, manageAvailability: false },
      mealPlans: { view: true, create: false, edit: false, delete: false, publish: false, schedule: false },
      banners: { view: true, create: false, edit: false, delete: false },
  adminManagement: { view: false, create: false, edit: false, delete: false, managePermissions: false, view_activity_logs: false, manage_sessions: false },
  deliveryPrices: { view: true }
    }
  }
];