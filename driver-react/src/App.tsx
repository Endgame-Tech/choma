import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { DeliveryProvider } from './contexts/DeliveryContext';
import { LocationProvider } from './contexts/LocationContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Deliveries from './pages/Deliveries';
import DeliveryDetail from './pages/DeliveryDetail';
import Profile from './pages/Profile';
import Earnings from './pages/Earnings';
import './index.css';

const App: React.FC = () => {
  return (
    <AuthProvider>
      <LocationProvider>
        <DeliveryProvider>
          <Router>
            <div className="min-h-screen bg-gray-50">
              <Routes>
                {/* Auth Routes */}
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                
                {/* Protected Routes */}
                <Route path="/" element={
                  <ProtectedRoute>
                    <Layout>
                      <Dashboard />
                    </Layout>
                  </ProtectedRoute>
                } />
                
                <Route path="/deliveries" element={
                  <ProtectedRoute>
                    <Layout>
                      <Deliveries />
                    </Layout>
                  </ProtectedRoute>
                } />
                
                <Route path="/deliveries/:id" element={
                  <ProtectedRoute>
                    <Layout>
                      <DeliveryDetail />
                    </Layout>
                  </ProtectedRoute>
                } />
                
                <Route path="/earnings" element={
                  <ProtectedRoute>
                    <Layout>
                      <Earnings />
                    </Layout>
                  </ProtectedRoute>
                } />
                
                <Route path="/profile" element={
                  <ProtectedRoute>
                    <Layout>
                      <Profile />
                    </Layout>
                  </ProtectedRoute>
                } />
              </Routes>
            </div>
          </Router>
        </DeliveryProvider>
      </LocationProvider>
    </AuthProvider>
  );
}

export default App;