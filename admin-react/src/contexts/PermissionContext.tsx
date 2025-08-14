import React, { createContext, useContext, useEffect, useState } from 'react';
import { Admin, AdminPermissions } from '../types/admin';
import { useAuth } from './AuthContext';

interface PermissionContextType {
  currentAdmin: Admin | null;
  permissions: AdminPermissions | null;
  hasPermission: (module: keyof AdminPermissions, action: string) => boolean;
  hasAnyPermission: (module: keyof AdminPermissions) => boolean;
  isAlphaAdmin: boolean;
  setCurrentAdmin: (admin: Admin | null) => void;
  refreshPermissions: () => void;
}

const PermissionContext = createContext<PermissionContextType | undefined>(undefined);

export const usePermissions = () => {
  const context = useContext(PermissionContext);
  if (context === undefined) {
    throw new Error('usePermissions must be used within a PermissionProvider');
  }
  return context;
};

interface PermissionProviderProps {
  children: React.ReactNode;
}

export const PermissionProvider: React.FC<PermissionProviderProps> = ({ children }) => {
  const { admin } = useAuth();
  const [currentAdmin, setCurrentAdmin] = useState<Admin | null>(null);
  const [permissions, setPermissions] = useState<AdminPermissions | null>(null);

  // Sync with auth context
  useEffect(() => {
    setCurrentAdmin(admin);
  }, [admin]);

  const refreshPermissions = () => {
    if (currentAdmin) {
      setPermissions(currentAdmin.role.permissions);
    } else {
      setPermissions(null);
    }
  };

  useEffect(() => {
    refreshPermissions();
  }, [currentAdmin]);

  const hasPermission = (module: keyof AdminPermissions, action: string): boolean => {
    if (!permissions || !currentAdmin) return false;
    
    // Alpha admin has all permissions
    if (currentAdmin.isAlphaAdmin) return true;
    
    // Check if admin is active
    if (!currentAdmin.isActive) return false;
    
    const modulePermissions = permissions[module] as Record<string, boolean>;
    return modulePermissions[action] === true;
  };

  const hasAnyPermission = (module: keyof AdminPermissions): boolean => {
    if (!permissions || !currentAdmin) return false;
    
    // Alpha admin has all permissions
    if (currentAdmin.isAlphaAdmin) return true;
    
    // Check if admin is active
    if (!currentAdmin.isActive) return false;
    
    const modulePermissions = permissions[module] as Record<string, boolean>;
    return Object.values(modulePermissions).some(permission => permission === true);
  };

  const isAlphaAdmin = currentAdmin?.isAlphaAdmin || false;

  return (
    <PermissionContext.Provider
      value={{
        currentAdmin,
        permissions,
        hasPermission,
        hasAnyPermission,
        isAlphaAdmin,
        setCurrentAdmin,
        refreshPermissions,
      }}
    >
      {children}
    </PermissionContext.Provider>
  );
};

// Permission-based component wrapper
interface PermissionGateProps {
  module: keyof AdminPermissions;
  action?: string;
  requireAll?: boolean;
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

export const PermissionGate: React.FC<PermissionGateProps> = ({
  module,
  action,
  fallback = null,
  children,
}) => {
  const { hasPermission, hasAnyPermission } = usePermissions();

  const hasAccess = action 
    ? hasPermission(module, action)
    : hasAnyPermission(module);

  if (!hasAccess) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
};

// Hook for permission checks in components
export const usePermissionCheck = () => {
  const { hasPermission, hasAnyPermission, isAlphaAdmin, currentAdmin } = usePermissions();

  return {
    hasPermission,
    hasAnyPermission,
    isAlphaAdmin,
    currentAdmin,
    canAccess: (module: keyof AdminPermissions, action?: string) => {
      return action ? hasPermission(module, action) : hasAnyPermission(module);
    },
    isActive: currentAdmin?.isActive || false,
  };
};