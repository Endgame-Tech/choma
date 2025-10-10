// admin-react/src/pages/CustomMealPlans.tsx
// Custom Plan Management - View user-generated custom meal plans

import React, { useState, useEffect } from 'react';
import { api } from '../services/api';

interface CustomMealPlan {
  _id: string;
  customPlanId: string;
  userId: {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
    phoneNumber: string;
  };
  preferences: {
    healthGoal: string;
    dietaryRestrictions: string[];
    allergies: string[];
    excludeIngredients: string[];
    mealTypes: string[];
    durationWeeks: number;
  };
  pricing: {
    baseMealCost: number;
    customizationFeePercent: number;
    customizationFeeAmount: number;
    totalPrice: number;
  };
  nutritionSummary: {
    avgCaloriesPerDay: number;
    avgProteinPerDay: number;
    avgCarbsPerDay: number;
    avgFatPerDay: number;
  };
  stats: {
    totalMeals: number;
    breakfastCount: number;
    lunchCount: number;
    dinnerCount: number;
  };
  status: string;
  chefInstructions: string;
  createdAt: string;
  updatedAt: string;
  purchasedAt?: string;
  generatedAt: string;
}

interface PlanFilters {
  status: string;
  healthGoal: string;
  search: string;
  startDate: string;
  endDate: string;
}

const CustomMealPlans: React.FC = () => {
  const [plans, setPlans] = useState<CustomMealPlan[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<CustomMealPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  const [filters, setFilters] = useState<PlanFilters>({
    status: '',
    healthGoal: '',
    search: '',
    startDate: '',
    endDate: '',
  });

  const [stats, setStats] = useState({
    total: 0,
    draft: 0,
    generated: 0,
    purchased: 0,
    active: 0,
  });

  const healthGoalLabels: Record<string, string> = {
    weight_loss: 'Weight Loss',
    muscle_gain: 'Muscle Gain',
    maintenance: 'Maintenance',
    diabetes_management: 'Diabetes Management',
    heart_health: 'Heart Health',
  };

  const statusColors: Record<string, string> = {
    draft: 'bg-gray-100 text-gray-800',
    generated: 'bg-blue-100 text-blue-800',
    purchased: 'bg-green-100 text-green-800',
    active: 'bg-green-100 text-green-800',
  };

  useEffect(() => {
    fetchPlans();
  }, [filters]);

  const fetchPlans = async () => {
    try {
      setLoading(true);

      // Fetch all custom meal plans (admin endpoint)
      const response = await api.get('/custom-meal-plans', {
        params: {
          status: filters.status || undefined,
          healthGoal: filters.healthGoal || undefined,
          search: filters.search || undefined,
          startDate: filters.startDate || undefined,
          endDate: filters.endDate || undefined,
        },
      });

      setPlans(response.data.data || []);

      // Calculate stats
      const allPlans = response.data.data || [];
      setStats({
        total: allPlans.length,
        draft: allPlans.filter((p: CustomMealPlan) => p.status === 'draft').length,
        generated: allPlans.filter((p: CustomMealPlan) => p.status === 'generated').length,
        purchased: allPlans.filter((p: CustomMealPlan) => p.status === 'purchased').length,
        active: allPlans.filter((p: CustomMealPlan) => p.status === 'active').length,
      });
    } catch (error) {
      console.error('Error fetching custom meal plans:', error);
      alert('Failed to fetch custom meal plans');
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = async (planId: string) => {
    try {
      // Fetch full plan details including meal assignments
      const response = await api.get(`/custom-meal-plans/${planId}`);
      setSelectedPlan(response.data.data);
      setShowDetailsModal(true);
    } catch (error) {
      console.error('Error fetching plan details:', error);
      alert('Failed to fetch plan details');
    }
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Custom Meal Plans</h1>
        <p className="text-gray-600 mt-2">
          View and manage user-generated custom meal plans
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-gray-600 text-sm">Total Plans</div>
          <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-gray-600 text-sm">Draft</div>
          <div className="text-2xl font-bold text-gray-600">{stats.draft}</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-gray-600 text-sm">Generated</div>
          <div className="text-2xl font-bold text-blue-600">{stats.generated}</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-gray-600 text-sm">Purchased</div>
          <div className="text-2xl font-bold text-green-600">{stats.purchased}</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-gray-600 text-sm">Active</div>
          <div className="text-2xl font-bold text-green-700">{stats.active}</div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <input
            type="text"
            placeholder="Search by user name or plan ID..."
            value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
            className="border rounded-lg px-3 py-2"
          />

          <select
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
            className="border rounded-lg px-3 py-2"
          >
            <option value="">All Status</option>
            <option value="draft">Draft</option>
            <option value="generated">Generated</option>
            <option value="purchased">Purchased</option>
            <option value="active">Active</option>
          </select>

          <select
            value={filters.healthGoal}
            onChange={(e) => setFilters({ ...filters, healthGoal: e.target.value })}
            className="border rounded-lg px-3 py-2"
          >
            <option value="">All Health Goals</option>
            <option value="weight_loss">Weight Loss</option>
            <option value="muscle_gain">Muscle Gain</option>
            <option value="maintenance">Maintenance</option>
            <option value="diabetes_management">Diabetes Management</option>
            <option value="heart_health">Heart Health</option>
          </select>

          <input
            type="date"
            placeholder="Start Date"
            value={filters.startDate}
            onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
            className="border rounded-lg px-3 py-2"
          />

          <input
            type="date"
            placeholder="End Date"
            value={filters.endDate}
            onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
            className="border rounded-lg px-3 py-2"
          />
        </div>
      </div>

      {/* Plans Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Plan ID</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Health Goal</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Duration</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Meals</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Price</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Avg Cal/Day</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Created</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {loading ? (
              <tr>
                <td colSpan={10} className="px-6 py-4 text-center">Loading...</td>
              </tr>
            ) : plans.length === 0 ? (
              <tr>
                <td colSpan={10} className="px-6 py-4 text-center text-gray-500">
                  No custom meal plans found
                </td>
              </tr>
            ) : (
              plans.map((plan) => (
                <tr key={plan._id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {plan.customPlanId}
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <div className="font-medium text-gray-900">
                      {plan.userId.firstName} {plan.userId.lastName}
                    </div>
                    <div className="text-gray-500 text-xs">{plan.userId.email}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {healthGoalLabels[plan.preferences.healthGoal] || plan.preferences.healthGoal}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {plan.preferences.durationWeeks} weeks
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {plan.stats.totalMeals} meals
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    ₦{plan.pricing.totalPrice.toLocaleString()}
                    <div className="text-xs text-gray-500">
                      +{plan.pricing.customizationFeePercent}% fee
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {plan.nutritionSummary.avgCaloriesPerDay} cal
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <span
                      className={`px-2 py-1 rounded capitalize ${
                        statusColors[plan.status] || 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {plan.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(plan.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <button
                      onClick={() => handleViewDetails(plan._id)}
                      className="text-blue-600 hover:text-blue-900"
                    >
                      View Details
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Details Modal */}
      {showDetailsModal && selectedPlan && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full my-8">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <h2 className="text-xl font-bold">
                Custom Plan Details: {selectedPlan.customPlanId}
              </h2>
              <button
                onClick={() => setShowDetailsModal(false)}
                className="text-gray-500 hover:text-gray-700 text-2xl"
              >
                ×
              </button>
            </div>

            <div className="px-6 py-4 max-h-[calc(100vh-200px)] overflow-y-auto">
              {/* User Info */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-3">User Information</h3>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-sm text-gray-600">Name</div>
                      <div className="font-medium">
                        {selectedPlan.userId.firstName} {selectedPlan.userId.lastName}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-600">Email</div>
                      <div className="font-medium">{selectedPlan.userId.email}</div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-600">Phone</div>
                      <div className="font-medium">{selectedPlan.userId.phoneNumber}</div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-600">Status</div>
                      <span
                        className={`inline-block px-2 py-1 rounded capitalize ${
                          statusColors[selectedPlan.status] || 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {selectedPlan.status}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Preferences */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-3">Preferences & Specifications</h3>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <div className="text-sm text-gray-600">Health Goal</div>
                      <div className="font-medium">
                        {healthGoalLabels[selectedPlan.preferences.healthGoal]}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-600">Duration</div>
                      <div className="font-medium">{selectedPlan.preferences.durationWeeks} weeks</div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-600">Meal Types</div>
                      <div className="font-medium capitalize">
                        {selectedPlan.preferences.mealTypes.join(', ')}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-600">Total Meals</div>
                      <div className="font-medium">{selectedPlan.stats.totalMeals}</div>
                    </div>
                  </div>

                  {selectedPlan.preferences.dietaryRestrictions.length > 0 && (
                    <div className="mb-2">
                      <div className="text-sm text-gray-600">Dietary Restrictions</div>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {selectedPlan.preferences.dietaryRestrictions.map((tag) => (
                          <span key={tag} className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {selectedPlan.preferences.allergies.length > 0 && (
                    <div className="mb-2">
                      <div className="text-sm text-gray-600">Allergies</div>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {selectedPlan.preferences.allergies.map((allergen) => (
                          <span key={allergen} className="px-2 py-1 bg-red-100 text-red-800 rounded text-xs">
                            {allergen}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {selectedPlan.preferences.excludeIngredients.length > 0 && (
                    <div>
                      <div className="text-sm text-gray-600">Excluded Ingredients</div>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {selectedPlan.preferences.excludeIngredients.map((ingredient) => (
                          <span key={ingredient} className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded text-xs">
                            {ingredient}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {selectedPlan.chefInstructions && (
                    <div className="mt-4">
                      <div className="text-sm text-gray-600">Chef Instructions</div>
                      <div className="mt-1 p-3 bg-white rounded border border-gray-200">
                        {selectedPlan.chefInstructions}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Pricing */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-3">Pricing Breakdown</h3>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Base Meal Cost:</span>
                      <span className="font-medium">₦{selectedPlan.pricing.baseMealCost.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">
                        Customization Fee ({selectedPlan.pricing.customizationFeePercent}%):
                      </span>
                      <span className="font-medium">₦{selectedPlan.pricing.customizationFeeAmount.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-lg font-bold border-t border-gray-300 pt-2">
                      <span>Total Price:</span>
                      <span className="text-green-600">₦{selectedPlan.pricing.totalPrice.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Nutrition Summary */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-3">Nutrition Summary</h3>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="grid grid-cols-4 gap-4">
                    <div>
                      <div className="text-sm text-gray-600">Avg Calories/Day</div>
                      <div className="text-xl font-bold">{selectedPlan.nutritionSummary.avgCaloriesPerDay} cal</div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-600">Avg Protein/Day</div>
                      <div className="text-xl font-bold">{selectedPlan.nutritionSummary.avgProteinPerDay}g</div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-600">Avg Carbs/Day</div>
                      <div className="text-xl font-bold">{selectedPlan.nutritionSummary.avgCarbsPerDay}g</div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-600">Avg Fat/Day</div>
                      <div className="text-xl font-bold">{selectedPlan.nutritionSummary.avgFatPerDay}g</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Stats */}
              <div>
                <h3 className="text-lg font-semibold mb-3">Meal Distribution</h3>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="grid grid-cols-4 gap-4">
                    <div>
                      <div className="text-sm text-gray-600">Total Meals</div>
                      <div className="text-xl font-bold">{selectedPlan.stats.totalMeals}</div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-600">Breakfast</div>
                      <div className="text-xl font-bold">{selectedPlan.stats.breakfastCount}</div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-600">Lunch</div>
                      <div className="text-xl font-bold">{selectedPlan.stats.lunchCount}</div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-600">Dinner</div>
                      <div className="text-xl font-bold">{selectedPlan.stats.dinnerCount}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-gray-200 flex justify-end">
              <button
                onClick={() => setShowDetailsModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomMealPlans;
