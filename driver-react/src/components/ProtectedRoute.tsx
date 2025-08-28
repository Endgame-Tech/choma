import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useWebSocket } from '../hooks/useWebSocket';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { isAuthenticated, isLoading: loading, driver } = useAuth();
  const { connect, isConnected } = useWebSocket();
  const [wsConnecting, setWsConnecting] = useState(false);

  // Auto-connect WebSocket when user is authenticated
  useEffect(() => {
    if (isAuthenticated && !isConnected && !wsConnecting) {
      setWsConnecting(true);
      connect()
        .then(() => {
          console.log('🔗 WebSocket connected');
        })
        .catch((error) => {
          console.error('❌ WebSocket connection failed:', error);
        })
        .finally(() => {
          setWsConnecting(false);
        });
    }
  }, [isAuthenticated, isConnected, wsConnecting, connect]);

  // Show loading spinner while checking authentication
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Check if driver account is approved
  if (driver && driver.accountStatus !== 'approved') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md mx-auto text-center p-6 bg-white rounded-lg shadow">
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-yellow-100 mb-4">
            <svg className="h-6 w-6 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.502 0L4.268 19.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>

          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Account Pending Approval
          </h3>

          <p className="text-gray-600 mb-4">
            Your driver account is currently <span className="font-medium text-yellow-600">{driver.accountStatus}</span>.
            Please wait for admin approval to start receiving delivery assignments.
          </p>

          <div className="text-sm text-gray-500">
            <p>Driver ID: <span className="font-mono">{driver.driverId}</span></p>
            <p>Registered: {driver?.joinDate ? new Date(driver.joinDate).toLocaleDateString() : '—'}</p>
          </div>

          <button
            onClick={() => {
              try {
                if (typeof window !== 'undefined') {
                  window.location.replace('/login');
                }
              } catch (e) {
                // fallback to reload
                window.location.reload();
              }
            }}
            className="mt-4 px-4 py-2 bg-primary-600 text-white text-sm rounded-lg hover:bg-primary-700 transition-colors"
          >
            Check Status
          </button>
        </div>
      </div>
    );
  }

  // Show WebSocket connection status if connecting
  if (wsConnecting) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-pulse rounded-full h-12 w-12 border-4 border-primary-600 border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-600">Connecting to delivery service...</p>
        </div>
      </div>
    );
  }

  // Render children if authenticated and approved
  return <>{children}</>;
};

export default ProtectedRoute;