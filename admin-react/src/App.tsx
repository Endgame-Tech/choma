import React from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { ThemeProvider } from './contexts/ThemeContext'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import AnalyticsDashboard from './pages/AnalyticsDashboard'
import Orders from './pages/Orders'
import Chefs from './pages/Chefs'
import Users from './pages/Users'
import AdvancedCustomers from './pages/AdvancedCustomers'
import Meals from './pages/Meals'
import MealPlans from './pages/MealPlans'

const App: React.FC = () => {
  return (
    <ThemeProvider>
      <Router>
        <Layout>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/analytics" element={<AnalyticsDashboard />} />
            <Route path="/orders" element={<Orders />} />
            <Route path="/chefs" element={<Chefs />} />
            <Route path="/users" element={<Users />} />
            <Route path="/customers" element={<AdvancedCustomers />} />
            <Route path="/meals" element={<Meals />} />
            <Route path="/meal-plans" element={<MealPlans />} />
          </Routes>
        </Layout>
      </Router>
    </ThemeProvider>
  )
}

export default App