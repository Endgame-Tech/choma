import React from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
// import 'flaticon-uicons/css/uicons-solid-rounded.css';
import { ThemeProvider } from './contexts/ThemeContext'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { PermissionProvider } from './contexts/PermissionContext'
import { NotificationProvider } from './contexts/NotificationContext'
import Layout from './components/Layout'
import ToastContainer from './components/ToastContainer'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import AnalyticsDashboard from './pages/AnalyticsDashboard'
import Orders from './pages/Orders'
import Chefs from './pages/Chefs'
import Users from './pages/Users'
import AdvancedCustomers from './pages/AdvancedCustomers'
import Meals from './pages/Meals'
import MealPlans from './pages/MealPlans'
import AdminManagement from './pages/AdminManagement'

// Protected Route Component
interface ProtectedRouteProps {
  children: React.ReactNode
}

function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen bg-choma-white dark:bg-choma-dark flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-choma-orange mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-300">Authenticating...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  return (
    <PermissionProvider>
      <NotificationProvider>
        <Layout>{children}</Layout>
        <ToastContainer />
      </NotificationProvider>
    </PermissionProvider>
  )
}

// Public Route Component (redirects to dashboard if already authenticated)
interface PublicRouteProps {
  children: React.ReactNode
}

function PublicRoute({ children }: PublicRouteProps) {
  const { isAuthenticated, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen bg-choma-white dark:bg-choma-dark flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-choma-orange mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-300">Loading...</p>
        </div>
      </div>
    )
  }

  if (isAuthenticated) {
    return <Navigate to="/" replace />
  }

  return <>{children}</>
}

function AppRoutes() {
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/login" element={
        <PublicRoute>
          <Login />
        </PublicRoute>
      } />

      {/* Protected Routes */}
      <Route path="/" element={
        <ProtectedRoute>
          <Dashboard />
        </ProtectedRoute>
      } />
      <Route path="/analytics" element={
        <ProtectedRoute>
          <AnalyticsDashboard />
        </ProtectedRoute>
      } />
      <Route path="/orders" element={
        <ProtectedRoute>
          <Orders />
        </ProtectedRoute>
      } />
      <Route path="/chefs" element={
        <ProtectedRoute>
          <Chefs />
        </ProtectedRoute>
      } />
      <Route path="/users" element={
        <ProtectedRoute>
          <Users />
        </ProtectedRoute>
      } />
      <Route path="/customers" element={
        <ProtectedRoute>
          <AdvancedCustomers />
        </ProtectedRoute>
      } />
      <Route path="/meals" element={
        <ProtectedRoute>
          <Meals />
        </ProtectedRoute>
      } />
      <Route path="/meal-plans" element={
        <ProtectedRoute>
          <MealPlans />
        </ProtectedRoute>
      } />
      <Route path="/admin-management" element={
        <ProtectedRoute>
          <AdminManagement />
        </ProtectedRoute>
      } />

      {/* Catch all route */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

const App: React.FC = () => {
  return (
    <ThemeProvider>
      <Router>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </Router>
    </ThemeProvider>
  )
}

export default App