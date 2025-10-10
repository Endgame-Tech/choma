// admin-react/src/pages/CustomMeals.tsx
// Custom Meal Library - Admin creates combo meals from DailyMeals

import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { mealsApi, Meal } from '../services/mealApi';

// Use Meal type from mealApi
type DailyMeal = Meal;

interface ConstituentMeal {
  mealId: string;
  quantity: number;
  notes?: string;
}

interface CustomMeal {
  _id: string;
  customMealId: string;
  name: string;
  description: string;
  category: string;
  constituentMeals: Array<{
    mealId: DailyMeal;
    quantity: number;
    notes?: string;
  }>;
  healthGoals: string[];
  nutrition: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    fiber: number;
    sugar: number;
  };
  pricing: {
    baseCost: number;
    preparationFee: number;
    totalPrice: number;
  };
  allergens: string[];
  dietaryTags: string[];
  preparationMethod: string;
  glycemicIndex: string;
  image: string;
  isAvailableForCustomPlans: boolean;
  isAvailableForDirectOrder: boolean;
  status: string;
  adminNotes: string;
  createdAt: string;
  updatedAt: string;
}

interface CustomMealStats {
  total: number;
  active: number;
  byCategory: Record<string, number>;
  byHealthGoal: Record<string, number>;
  availableForPlans: number;
}

const CustomMeals: React.FC = () => {
  const [customMeals, setCustomMeals] = useState<CustomMeal[]>([]);
  const [stats, setStats] = useState<CustomMealStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showSelectMealsModal, setShowSelectMealsModal] = useState(false);
  const [selectedMeal, setSelectedMeal] = useState<CustomMeal | null>(null);

  // Filters
  const [filters, setFilters] = useState({
    category: '',
    healthGoal: '',
    status: '',
    search: '',
  });

  // Create/Edit form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: 'breakfast',
    constituentMeals: [] as ConstituentMeal[],
    healthGoals: [] as string[],
    image: '',
    isAvailableForCustomPlans: true,
    isAvailableForDirectOrder: false,
    adminNotes: '',
  });

  // Available DailyMeals for selection
  const [availableMeals, setAvailableMeals] = useState<DailyMeal[]>([]);
  const [mealSearchQuery, setMealSearchQuery] = useState('');

  const healthGoalOptions = [
    { value: 'weight_loss', label: 'Weight Loss' },
    { value: 'muscle_gain', label: 'Muscle Gain' },
    { value: 'maintenance', label: 'Maintenance' },
    { value: 'diabetes_management', label: 'Diabetes Management' },
    { value: 'heart_health', label: 'Heart Health' },
  ];

  useEffect(() => {
    fetchCustomMeals();
    fetchStats();
  }, [filters]);

  const fetchCustomMeals = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filters.category) params.append('category', filters.category);
      if (filters.healthGoal) params.append('healthGoal', filters.healthGoal);
      if (filters.status) params.append('status', filters.status);
      if (filters.search) params.append('search', filters.search);

      const response = await api.get(`/custom-meals?${params.toString()}`);
      setCustomMeals(response.data.data);
    } catch (error) {
      console.error('Error fetching custom meals:', error);
      alert('Failed to fetch custom meals');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await api.get('/custom-meals/stats/overview');
      setStats(response.data.data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const fetchAvailableMeals = async () => {
    try {
      // Fetch all DailyMeals for selection using the same method as MealPlanScheduler
      const mealsResponse = await mealsApi.getAllMeals({ limit: 1000, isAvailable: true });
      console.log('🍽️ Available meals response:', mealsResponse);

      const meals = mealsResponse.data?.meals || [];
      console.log('🍽️ Parsed meals:', meals.length, 'meals');

      setAvailableMeals(meals);
    } catch (error) {
      console.error('Error fetching available meals:', error);
      alert('Failed to fetch available meals');
    }
  };

  const handleOpenCreateModal = () => {
    setFormData({
      name: '',
      description: '',
      category: 'breakfast',
      constituentMeals: [],
      healthGoals: [],
      image: '',
      isAvailableForCustomPlans: true,
      isAvailableForDirectOrder: false,
      adminNotes: '',
    });
    setSelectedMeal(null);
    setShowCreateModal(true);
    fetchAvailableMeals();
  };

  const handleOpenEditModal = async (customMeal: CustomMeal) => {
    setSelectedMeal(customMeal);
    setFormData({
      name: customMeal.name,
      description: customMeal.description || '',
      category: customMeal.category,
      constituentMeals: customMeal.constituentMeals.map(cm => ({
        mealId: cm.mealId._id,
        quantity: cm.quantity,
        notes: cm.notes || '',
      })),
      healthGoals: customMeal.healthGoals,
      image: customMeal.image || '',
      isAvailableForCustomPlans: customMeal.isAvailableForCustomPlans,
      isAvailableForDirectOrder: customMeal.isAvailableForDirectOrder,
      adminNotes: customMeal.adminNotes || '',
    });
    setShowCreateModal(true);
    fetchAvailableMeals();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.constituentMeals.length === 0) {
      alert('Please add at least one constituent meal');
      return;
    }

    if (formData.healthGoals.length === 0) {
      alert('Please select at least one health goal');
      return;
    }

    try {
      if (selectedMeal) {
        // Update existing
        await api.put(`/custom-meals/${selectedMeal._id}`, formData);
        alert('Custom meal updated successfully!');
      } else {
        // Create new
        await api.post('/custom-meals', formData);
        alert('Custom meal created successfully!');
      }

      setShowCreateModal(false);
      fetchCustomMeals();
      fetchStats();
    } catch (error: any) {
      console.error('Error saving custom meal:', error);
      alert(error.response?.data?.error || 'Failed to save custom meal');
    }
  };

  const handleDelete = async (customMealId: string) => {
    if (!window.confirm('Are you sure you want to delete this custom meal?')) {
      return;
    }

    try {
      await api.delete(`/custom-meals/${customMealId}`);
      alert('Custom meal deleted successfully!');
      fetchCustomMeals();
      fetchStats();
    } catch (error: any) {
      console.error('Error deleting custom meal:', error);
      alert(error.response?.data?.error || 'Failed to delete custom meal');
    }
  };

  const handleAddConstituentMeal = (meal: DailyMeal) => {
    // Check if already added
    const exists = formData.constituentMeals.find(cm => cm.mealId === meal._id);
    if (exists) {
      alert('This meal is already added');
      return;
    }

    setFormData({
      ...formData,
      constituentMeals: [
        ...formData.constituentMeals,
        { mealId: meal._id, quantity: 1, notes: '' }
      ],
    });
  };

  const handleRemoveConstituentMeal = (mealId: string) => {
    setFormData({
      ...formData,
      constituentMeals: formData.constituentMeals.filter(cm => cm.mealId !== mealId),
    });
  };

  const handleUpdateConstituentQuantity = (mealId: string, quantity: number) => {
    setFormData({
      ...formData,
      constituentMeals: formData.constituentMeals.map(cm =>
        cm.mealId === mealId ? { ...cm, quantity } : cm
      ),
    });
  };

  const handleToggleHealthGoal = (goal: string) => {
    if (formData.healthGoals.includes(goal)) {
      setFormData({
        ...formData,
        healthGoals: formData.healthGoals.filter(g => g !== goal),
      });
    } else {
      setFormData({
        ...formData,
        healthGoals: [...formData.healthGoals, goal],
      });
    }
  };

  const getSelectedMealDetails = () => {
    return formData.constituentMeals.map(cm => {
      const meal = availableMeals.find(m => m._id === cm.mealId);
      return { ...cm, meal };
    });
  };

  const filteredAvailableMeals = availableMeals.filter(meal =>
    meal.name.toLowerCase().includes(mealSearchQuery.toLowerCase()) ||
    meal.category.toLowerCase().includes(mealSearchQuery.toLowerCase())
  );

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Custom Meal Library</h1>
        <p className="text-gray-600 mt-2">
          Create combo meals from DailyMeals that the algorithm will use for custom meal plans
        </p>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-gray-600 text-sm">Total Custom Meals</div>
            <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-gray-600 text-sm">Active</div>
            <div className="text-2xl font-bold text-green-600">{stats.active}</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-gray-600 text-sm">Available for Plans</div>
            <div className="text-2xl font-bold text-blue-600">{stats.availableForPlans}</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-gray-600 text-sm">Breakfast</div>
            <div className="text-2xl font-bold text-gray-900">{stats.byCategory.breakfast || 0}</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-gray-600 text-sm">Lunch/Dinner</div>
            <div className="text-2xl font-bold text-gray-900">
              {(stats.byCategory.lunch || 0) + (stats.byCategory.dinner || 0)}
            </div>
          </div>
        </div>
      )}

      {/* Filters and Actions */}
      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <input
            type="text"
            placeholder="Search by name..."
            value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
            className="border rounded-lg px-3 py-2"
          />

          <select
            value={filters.category}
            onChange={(e) => setFilters({ ...filters, category: e.target.value })}
            className="border rounded-lg px-3 py-2"
          >
            <option value="">All Categories</option>
            <option value="breakfast">Breakfast</option>
            <option value="lunch">Lunch</option>
            <option value="dinner">Dinner</option>
            <option value="snack">Snack</option>
          </select>

          <select
            value={filters.healthGoal}
            onChange={(e) => setFilters({ ...filters, healthGoal: e.target.value })}
            className="border rounded-lg px-3 py-2"
          >
            <option value="">All Health Goals</option>
            {healthGoalOptions.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>

          <select
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
            className="border rounded-lg px-3 py-2"
          >
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="archived">Archived</option>
          </select>

          <button
            onClick={handleOpenCreateModal}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            + Create Custom Meal
          </button>
        </div>
      </div>

      {/* Custom Meals Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Meals</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Price</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Calories</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Health Goals</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {loading ? (
              <tr>
                <td colSpan={9} className="px-6 py-4 text-center">Loading...</td>
              </tr>
            ) : customMeals.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-6 py-4 text-center text-gray-500">
                  No custom meals found. Create one to get started!
                </td>
              </tr>
            ) : (
              customMeals.map((meal) => (
                <tr key={meal._id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {meal.customMealId}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">{meal.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 capitalize">
                    {meal.category}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {meal.constituentMeals.length} meals
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    ₦{meal.pricing.totalPrice.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {meal.nutrition.calories} cal
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    <div className="flex flex-wrap gap-1">
                      {meal.healthGoals.map((goal) => (
                        <span
                          key={goal}
                          className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs"
                        >
                          {goal.replace('_', ' ')}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <span
                      className={`px-2 py-1 rounded ${
                        meal.status === 'active'
                          ? 'bg-green-100 text-green-800'
                          : meal.status === 'inactive'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {meal.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <button
                      onClick={() => handleOpenEditModal(meal)}
                      className="text-blue-600 hover:text-blue-900 mr-3"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(meal._id)}
                      className="text-red-600 hover:text-red-900"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Create/Edit Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full my-8">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-xl font-bold">
                {selectedMeal ? 'Edit Custom Meal' : 'Create Custom Meal'}
              </h2>
            </div>

            <form onSubmit={handleSubmit} className="px-6 py-4 max-h-[calc(100vh-200px)] overflow-y-auto">
              {/* Basic Info */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2"
                  placeholder="e.g., Protein Power Breakfast Combo"
                />
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2"
                  rows={3}
                  placeholder="Brief description of this combo meal"
                />
              </div>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Category *
                  </label>
                  <select
                    required
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2"
                  >
                    <option value="breakfast">Breakfast</option>
                    <option value="lunch">Lunch</option>
                    <option value="dinner">Dinner</option>
                    <option value="snack">Snack</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Image URL
                  </label>
                  <input
                    type="text"
                    value={formData.image}
                    onChange={(e) => setFormData({ ...formData, image: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2"
                    placeholder="https://..."
                  />
                </div>
              </div>

              {/* Health Goals */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Health Goals * (select at least one)
                </label>
                <div className="flex flex-wrap gap-2">
                  {healthGoalOptions.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => handleToggleHealthGoal(option.value)}
                      className={`px-3 py-2 rounded-lg border ${
                        formData.healthGoals.includes(option.value)
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Constituent Meals */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Constituent Meals * (add 1 or more DailyMeals)
                </label>

                {/* Selected Meals */}
                {formData.constituentMeals.length > 0 && (
                  <div className="mb-3 space-y-2">
                    {getSelectedMealDetails().map((cm) => (
                      <div key={cm.mealId} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                        <div className="flex-1">
                          <div className="font-medium">{cm.meal?.name || 'Loading...'}</div>
                          <div className="text-sm text-gray-600">
                            ₦{cm.meal?.pricing.totalPrice.toLocaleString()} | {cm.meal?.nutrition.calories} cal
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <label className="text-sm text-gray-600">Qty:</label>
                          <input
                            type="number"
                            min="1"
                            value={cm.quantity}
                            onChange={(e) => handleUpdateConstituentQuantity(cm.mealId, parseInt(e.target.value))}
                            className="w-16 border rounded px-2 py-1 text-center"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveConstituentMeal(cm.mealId)}
                          className="text-red-600 hover:text-red-800"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => setShowSelectMealsModal(true)}
                  className="w-full border-2 border-dashed border-gray-300 rounded-lg px-4 py-3 text-gray-600 hover:border-blue-500 hover:text-blue-600"
                >
                  + Add DailyMeal
                </button>
              </div>

              {/* Availability */}
              <div className="mb-4">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.isAvailableForCustomPlans}
                    onChange={(e) => setFormData({ ...formData, isAvailableForCustomPlans: e.target.checked })}
                    className="rounded"
                  />
                  <span className="text-sm font-medium text-gray-700">
                    Available for Custom Meal Plans (algorithm can select this)
                  </span>
                </label>
              </div>

              <div className="mb-4">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.isAvailableForDirectOrder}
                    onChange={(e) => setFormData({ ...formData, isAvailableForDirectOrder: e.target.checked })}
                    className="rounded"
                  />
                  <span className="text-sm font-medium text-gray-700">
                    Available for Direct Order (future feature)
                  </span>
                </label>
              </div>

              {/* Admin Notes */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Admin Notes
                </label>
                <textarea
                  value={formData.adminNotes}
                  onChange={(e) => setFormData({ ...formData, adminNotes: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2"
                  rows={2}
                  placeholder="Internal notes for admins"
                />
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  {selectedMeal ? 'Update' : 'Create'} Custom Meal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Select DailyMeals Modal */}
      {showSelectMealsModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[80vh] flex flex-col">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-xl font-bold">Select DailyMeal to Add</h2>
              <input
                type="text"
                placeholder="Search meals..."
                value={mealSearchQuery}
                onChange={(e) => setMealSearchQuery(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 mt-3"
              />
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-4">
              {availableMeals.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <p>Loading meals...</p>
                  <p className="text-sm mt-2">If meals don't appear, check console for errors</p>
                </div>
              ) : filteredAvailableMeals.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <p>No meals found matching your search</p>
                  <p className="text-sm mt-2">Total meals available: {availableMeals.length}</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredAvailableMeals.map((meal) => (
                    <div
                      key={meal._id}
                      className="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer"
                      onClick={() => {
                        handleAddConstituentMeal(meal);
                        setShowSelectMealsModal(false);
                        setMealSearchQuery('');
                      }}
                    >
                      {meal.image && (
                        <img src={meal.image} alt={meal.name} className="w-16 h-16 object-cover rounded" />
                      )}
                      <div className="flex-1">
                        <div className="font-medium">{meal.name}</div>
                        <div className="text-sm text-gray-600">
                          {meal.category} | ₦{meal.pricing.totalPrice.toLocaleString()} | {meal.nutrition.calories} cal
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="px-6 py-4 border-t border-gray-200">
              <button
                type="button"
                onClick={() => {
                  setShowSelectMealsModal(false);
                  setMealSearchQuery('');
                }}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
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

export default CustomMeals;
