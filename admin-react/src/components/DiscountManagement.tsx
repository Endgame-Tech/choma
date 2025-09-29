// admin-react/src/components/DiscountManagement.tsx - Dynamic Discount Management
import React, { useState, useEffect } from 'react';
import { discountApi, type DiscountRule } from '../services/api';
import type { MealPlan } from '../types';
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  XMarkIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';

const TARGET_SEGMENTS = [
  { value: 'first_time', label: 'First-time Users', description: 'Users who have never placed an order' },
  { value: 'inactive_6_months', label: 'Inactive 6+ Months', description: 'Users who haven\'t ordered in 6+ months' },
  { value: 'inactive_1_year', label: 'Inactive 1+ Year', description: 'Users who haven\'t ordered in 1+ year' },
  { value: 'loyal_consistent', label: 'Loyal Customers', description: 'Users with 5+ orders and consistent ordering' },
  { value: 'high_value', label: 'High-Value Customers', description: 'Users who have spent over threshold amount' },
  { value: 'long_streak', label: 'Subscription Streak', description: 'Users with consistent subscription streak' },
  { value: 'new_registrant', label: 'New Members', description: 'Users who registered within timeframe' },
  { value: 'seasonal', label: 'Seasonal/Holiday', description: 'Time-based discounts for special events' },
  { value: 'all_users', label: 'All Users', description: 'Universal discount for everyone' },
];

const DiscountManagement: React.FC = () => {
  const [discountRules, setDiscountRules] = useState<DiscountRule[]>([]);
  const [mealPlans, setMealPlans] = useState<MealPlan[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<DiscountRule | null>(null);
  const [activeSection, setActiveSection] = useState<'ad' | 'promo'>('promo');
  const [formData, setFormData] = useState<DiscountRule>({
    name: '',
    discountPercent: 0,
    targetSegment: 'first_time',
    isActive: true,
    criteria: {},
    applyToAllMealPlans: true,
    applicableMealPlans: [],
    applicableCategories: [],
    applicableTags: [],
    discountType: 'promo', // Add discount type
    // Ad discount specific fields
    selectedMealPlanId: '',
    counterValue: 0,
    calculatedDiscount: 0,
  });
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [selectedMealPlan, setSelectedMealPlan] = useState<MealPlan | null>(null);

  // Calculate ad discount percentage - accepts any type and converts internally
  const calculateAdDiscountSafe = (originalPrice: number, counterValue: unknown): number => {
    const numCounterValue = Number(counterValue) || 0;
    if (numCounterValue <= originalPrice) return 0;
    return Math.round(((numCounterValue - originalPrice) / numCounterValue) * 100);
  };

  // Handle meal plan selection for ad discount
  const handleMealPlanSelect = (mealPlanId: string) => {
    const plan = mealPlans.find(p => p._id === mealPlanId);
    if (plan) {
      setSelectedMealPlan(plan);
      const originalPrice = Number(plan.totalPrice) || Number(plan.basePrice) || 0;
      setFormData(prev => {
        const counterValueRaw = prev.counterValue;
        const counterValue = typeof counterValueRaw === 'number' ? counterValueRaw : Number(counterValueRaw) || 0;
        const discount = counterValue <= originalPrice ? 0 : Math.round(((counterValue - originalPrice) / counterValue) * 100);
        return {
          ...prev,
          selectedMealPlanId: mealPlanId,
          applicableMealPlans: [mealPlanId],
          applyToAllMealPlans: false,
          calculatedDiscount: discount
        };
      });
    }
  };

  // Handle counter value change
  const handleCounterValueChange = (counterValue: number) => {
    if (selectedMealPlan) {
      const originalPrice = Number(selectedMealPlan.totalPrice) || Number(selectedMealPlan.basePrice) || 0;
      const discount = calculateAdDiscountSafe(originalPrice, counterValue);
      setFormData(prev => ({
        ...prev,
        counterValue,
        calculatedDiscount: discount,
        discountPercent: discount
      }));
    }
  };

  // Render ad discount calculator
  const renderAdDiscountCalculator = () => {
    if (formData.discountType !== 'ad') return null;

    return (
      <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-6 mb-6">
        <h3 className="text-lg font-semibold text-choma-black dark:text-choma-white mb-4 flex items-center">
          <span className="bg-choma-orange text-white rounded-full w-6 h-6 flex items-center justify-center text-sm mr-2">
            📊
          </span>
          Ad Discount Calculator
        </h3>

        <div className="space-y-4">
          {/* Step 1: Select Meal Plan */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Step 1: Select Meal Plan *
            </label>
            <select
              value={formData.selectedMealPlanId || ''}
              onChange={(e) => handleMealPlanSelect(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-2 focus:ring-choma-brown focus:border-choma-brown dark:bg-gray-700 dark:text-white"
              aria-label="Select meal plan for ad discount"
              required
            >
              <option value="">Choose a meal plan...</option>
              {mealPlans.map((plan) => (
                <option key={plan._id} value={plan._id}>
                  {String(plan.planName || plan.name || '')} - ₦{(Number(plan.totalPrice) || Number(plan.basePrice) || 0).toLocaleString()}
                </option>
              ))}
            </select>
          </div>

          {/* Selected Meal Plan Details */}
          {selectedMealPlan && (
            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-600">
              <div className="flex items-center space-x-4">
                {selectedMealPlan.planImageUrl && (
                  <img
                    src={selectedMealPlan.planImageUrl}
                    alt={String(selectedMealPlan.planName || selectedMealPlan.name || '')}
                    className="w-16 h-16 rounded-lg object-cover"
                  />
                )}
                <div>
                  <h4 className="font-semibold text-gray-900 dark:text-gray-100">
                    {String(selectedMealPlan.planName || selectedMealPlan.name || '')}
                  </h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Category: {String(selectedMealPlan.category || '')}
                  </p>
                  <p className="text-lg font-bold text-choma-brown">
                    Original Price: ₦{(Number(selectedMealPlan.totalPrice) || Number(selectedMealPlan.basePrice) || 0).toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Set Counter Value */}
          {selectedMealPlan && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Step 2: Set &ldquo;Counter Value&rdquo; (Advertised Higher Price) *
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">₦</span>
                <input
                  type="number"
                  min={(Number(selectedMealPlan.totalPrice) || Number(selectedMealPlan.basePrice) || 0) + 1}
                  value={formData.counterValue || ''}
                  onChange={(e) => handleCounterValueChange(parseInt(e.target.value) || 0)}
                  className="w-full pl-8 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-2 focus:ring-choma-brown focus:border-choma-brown dark:bg-gray-700 dark:text-white"
                  placeholder={`Enter amount higher than ₦${(Number(selectedMealPlan.totalPrice) || Number(selectedMealPlan.basePrice) || 0).toLocaleString()}`}
                  required
                />
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                This should be higher than the original price to show a discount
              </p>
            </div>
          )}

          {/* Step 3: Calculated Results */}
          {selectedMealPlan && formData.counterValue && formData.counterValue > (Number(selectedMealPlan.totalPrice) || Number(selectedMealPlan.basePrice) || 0) && (
            <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 border border-green-200 dark:border-green-800">
              <h4 className="font-semibold text-green-800 dark:text-green-300 mb-2">
                ✅ Calculated Ad Discount
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="text-gray-600 dark:text-gray-400">Advertised Price:</span>
                  <p className="font-bold text-gray-900 dark:text-gray-100">
                    ₦{(formData.counterValue || 0).toLocaleString()}
                  </p>
                </div>
                <div>
                  <span className="text-gray-600 dark:text-gray-400">Actual Price:</span>
                  <p className="font-bold text-choma-brown">
                    ₦{(Number(selectedMealPlan.totalPrice) || Number(selectedMealPlan.basePrice) || 0).toLocaleString()}
                  </p>
                </div>
                <div>
                  <span className="text-gray-600 dark:text-gray-400">Calculated Discount:</span>
                  <p className="font-bold text-green-600 text-lg">
                    {formData.calculatedDiscount || 0}% OFF
                  </p>
                </div>
              </div>
              <div className="mt-3 p-3 bg-green-100 dark:bg-green-900/40 rounded border-l-4 border-green-500">
                <p className="text-green-700 dark:text-green-300 font-medium">
                  Customer sees: <span className="line-through">₦{(formData.counterValue || 0).toLocaleString()}</span>{' '}
                  ₦{(Number(selectedMealPlan.totalPrice) || Number(selectedMealPlan.basePrice) || 0).toLocaleString()}{' '}
                  ({formData.calculatedDiscount || 0}% OFF!)
                </p>
              </div>
            </div>
          )}

          {/* Warning for invalid counter value */}
          {selectedMealPlan && formData.counterValue && formData.counterValue <= (Number(selectedMealPlan.totalPrice) || Number(selectedMealPlan.basePrice) || 0) && (
            <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-4 border border-red-200 dark:border-red-800">
              <p className="text-red-700 dark:text-red-300 flex items-center">
                <ExclamationTriangleIcon className="h-5 w-5 mr-2" />
                Counter value must be higher than the original price (₦{(Number(selectedMealPlan.totalPrice) || Number(selectedMealPlan.basePrice) || 0).toLocaleString()}) to create a discount.
              </p>
            </div>
          )}
        </div>
      </div>
    );
  };

  useEffect(() => {
    loadDiscountRules();
    loadMealPlans();
    loadCategories();
  }, []);

  const loadDiscountRules = async () => {
    try {
      const result = await discountApi.getAllDiscountRules();
      if (result.success && result.data) {
        setDiscountRules(result.data);
      } else {
        setError('Failed to load discount rules');
      }
    } catch (err) {
      setError('Error loading discount rules');
      console.error('Error loading discount rules:', err);
    }
  };

  const loadMealPlans = async () => {
    try {
      const result = await discountApi.getAllMealPlansForAdmin();
      if (result.success && result.data) {
        setMealPlans(result.data);
      } else {
        console.warn('Failed to load meal plans for admin');
      }
    } catch (err) {
      console.error('Error loading meal plans:', err);
    }
  };

  const loadCategories = async () => {
    try {
      const result = await discountApi.getMealPlanCategories();
      if (result.success && result.data) {
        setCategories(result.data);
      } else {
        console.warn('Failed to load meal plan categories');
      }
    } catch (err) {
      console.error('Error loading categories:', err);
    }
  };

  const finishLoading = () => {
    setLoading(false);
  };

  useEffect(() => {
    if (discountRules.length >= 0) {
      finishLoading();
    }
  }, [discountRules]);

  const handleCreateRule = () => {
    setEditingRule(null);
    setSelectedMealPlan(null);
    setFormData({
      name: '',
      discountPercent: 0,
      targetSegment: 'first_time',
      isActive: true,
      criteria: {},
      applyToAllMealPlans: activeSection === 'promo', // Ad discounts are meal-specific
      applicableMealPlans: [],
      applicableCategories: [],
      applicableTags: [],
      discountType: activeSection, // Set based on active section
      // Ad discount specific fields
      selectedMealPlanId: '',
      counterValue: 0,
      calculatedDiscount: 0,
    });
    setDialogOpen(true);
  };

  const handleEditRule = (rule: DiscountRule) => {
    setEditingRule(rule);
    setFormData({ ...rule });

    // Handle ad discount specific data
    if (rule.discountType === 'ad' && rule.selectedMealPlanId) {
      const plan = mealPlans.find(p => p._id === rule.selectedMealPlanId);
      setSelectedMealPlan(plan || null);
    } else {
      setSelectedMealPlan(null);
    }

    setDialogOpen(true);
  };

  const handleDeleteRule = async (ruleId: string) => {
    if (!confirm('Are you sure you want to delete this discount rule?')) return;

    try {
      const result = await discountApi.deleteDiscountRule(ruleId);
      if (result.success) {
        setSuccess('Discount rule deleted successfully');
        loadDiscountRules();
      } else {
        setError('Failed to delete discount rule');
      }
    } catch (err) {
      setError('Error deleting discount rule');
      console.error('Error deleting discount rule:', err);
    }
  };

  const handleSaveRule = async () => {
    try {
      setError(null);

      if (!formData.name || (formData.discountPercent ?? 0) <= 0) {
        setError('Please fill in all required fields');
        return;
      }

      if ((formData.discountPercent ?? 0) > 100) {
        setError('Discount percentage cannot exceed 100%');
        return;
      }

      const result = editingRule
        ? await discountApi.updateDiscountRule(editingRule._id!, formData)
        : await discountApi.createDiscountRule(formData);

      if (result.success) {
        setSuccess(editingRule ? 'Discount rule updated successfully' : 'Discount rule created successfully');
        setDialogOpen(false);
        loadDiscountRules();
      } else {
        setError('Failed to save discount rule');
      }
    } catch (err) {
      setError('Error saving discount rule');
      console.error('Error saving discount rule:', err);
    }
  };

  const renderCriteriaFields = () => {
    switch (formData.targetSegment) {
      case 'high_value':
        return (
          <div className="mb-4">
            <label htmlFor="minSpent" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Minimum Spent (₦)
            </label>
            <input
              id="minSpent"
              type="number"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-2 focus:ring-choma-brown focus:border-choma-brown dark:bg-gray-700 dark:text-white text-sm"
              value={formData.criteria?.minSpent || ''}
              onChange={(e) => setFormData({
                ...formData,
                criteria: { ...formData.criteria, minSpent: parseInt(e.target.value) || 0 }
              })}
            />
          </div>
        );

      case 'long_streak':
        return (
          <div className="mb-4">
            <label htmlFor="minStreak" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Minimum Streak (months)
            </label>
            <input
              id="minStreak"
              type="number"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-2 focus:ring-choma-brown focus:border-choma-brown dark:bg-gray-700 dark:text-white text-sm"
              value={formData.criteria?.minStreak || ''}
              onChange={(e) => setFormData({
                ...formData,
                criteria: { ...formData.criteria, minStreak: parseInt(e.target.value) || 0 }
              })}
            />
          </div>
        );

      case 'new_registrant':
        return (
          <div className="mb-4">
            <label htmlFor="withinDays" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Within Days of Registration
            </label>
            <input
              id="withinDays"
              type="number"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-2 focus:ring-choma-brown focus:border-choma-brown dark:bg-gray-700 dark:text-white text-sm"
              value={formData.criteria?.withinDays || ''}
              onChange={(e) => setFormData({
                ...formData,
                criteria: { ...formData.criteria, withinDays: parseInt(e.target.value) || 0 }
              })}
            />
          </div>
        );

      case 'seasonal':
        return (
          <div>
            <div className="mb-4">
              <label htmlFor="seasonName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Season Name
              </label>
              <input
                id="seasonName"
                type="text"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-2 focus:ring-choma-brown focus:border-choma-brown dark:bg-gray-700 dark:text-white text-sm"
                value={formData.criteria?.seasonName || ''}
                onChange={(e) => setFormData({
                  ...formData,
                  criteria: { ...formData.criteria, seasonName: e.target.value }
                })}
              />
            </div>
            <div className="flex gap-4">
              <div className="flex-1">
                <label htmlFor="seasonStart" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Season Start Date
                </label>
                <input
                  id="seasonStart"
                  type="datetime-local"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-2 focus:ring-choma-brown focus:border-choma-brown dark:bg-gray-700 dark:text-white text-sm"
                  value={formData.criteria?.seasonStart ? new Date(formData.criteria.seasonStart).toISOString().slice(0, 16) : ''}
                  onChange={(e) => setFormData({
                    ...formData,
                    criteria: { ...formData.criteria, seasonStart: e.target.value ? new Date(e.target.value) : undefined }
                  })}
                />
              </div>
              <div className="flex-1">
                <label htmlFor="seasonEnd" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Season End Date
                </label>
                <input
                  id="seasonEnd"
                  type="datetime-local"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-2 focus:ring-choma-brown focus:border-choma-brown dark:bg-gray-700 dark:text-white text-sm"
                  value={formData.criteria?.seasonEnd ? new Date(formData.criteria.seasonEnd).toISOString().slice(0, 16) : ''}
                  onChange={(e) => setFormData({
                    ...formData,
                    criteria: { ...formData.criteria, seasonEnd: e.target.value ? new Date(e.target.value) : undefined }
                  })}
                />
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  const getSegmentColorClass = (segment: string): string => {
    switch (segment) {
      case 'first_time': return 'bg-blue-500';
      case 'returning': return 'bg-green-500';
      case 'high_value': return 'bg-purple-500';
      case 'long_streak': return 'bg-orange-500';
      case 'new_registrant': return 'bg-pink-500';
      case 'seasonal': return 'bg-yellow-500';
      default: return 'bg-gray-500';
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-choma-brown mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading discount rules...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-choma-black dark:text-choma-white mb-2">
            Discount Management
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Create and manage discount rules for different user segments
          </p>
        </div>
      </div>

      {/* Section Tabs */}
      <div className="mb-6">
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveSection('promo')}
              className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors duration-200 ${activeSection === 'promo'
                ? 'border-choma-brown text-choma-brown'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
            >
              Promo Discount
            </button>
            <button
              onClick={() => setActiveSection('ad')}
              className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors duration-200 ${activeSection === 'ad'
                ? 'border-choma-brown text-choma-brown'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
            >
              Ad Discount
            </button>
          </nav>
        </div>
      </div>

      {/* Section Header with Create Button */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <div>
          <h2 className="text-xl font-semibold text-choma-black dark:text-choma-white mb-1">
            {activeSection === 'promo' ? 'Promo Discounts' : 'Ad Discounts'}
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            {activeSection === 'promo'
              ? 'Promotional discounts for marketing campaigns and special offers'
              : 'Advertisement-based discounts for targeted marketing'
            }
          </p>
        </div>
        <button
          onClick={handleCreateRule}
          className="inline-flex items-center px-4 py-2 bg-choma-brown hover:bg-choma-brown/90 text-white font-medium rounded-lg transition-colors duration-200"
        >
          <PlusIcon className="h-5 w-5 mr-2" />
          Create {activeSection === 'promo' ? 'Promo' : 'Ad'} Discount
        </button>
      </div>

      {/* Alerts */}
      {error && (
        <div className="mb-6 p-4 rounded-lg bg-red-50 border border-red-200 dark:bg-red-900/20 dark:border-red-800">
          <div className="flex items-center">
            <ExclamationTriangleIcon className="h-5 w-5 text-red-600 dark:text-red-400 mr-3" />
            <div className="flex-1">
              <h3 className="text-sm font-medium text-red-800 dark:text-red-300">Error</h3>
              <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
            </div>
            <button
              onClick={() => setError(null)}
              className="ml-4 text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
              aria-label="Dismiss error message"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>
        </div>
      )}

      {success && (
        <div className="mb-6 p-4 rounded-lg bg-green-50 border border-green-200 dark:bg-green-900/20 dark:border-green-800">
          <div className="flex items-center">
            <CheckCircleIcon className="h-5 w-5 text-green-600 dark:text-green-400 mr-3" />
            <div className="flex-1">
              <h3 className="text-sm font-medium text-green-800 dark:text-green-300">Success</h3>
              <p className="text-sm text-green-700 dark:text-green-400">{success}</p>
            </div>
            <button
              onClick={() => setSuccess(null)}
              className="ml-4 text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-300"
              aria-label="Dismiss success message"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>
        </div>
      )}

      {/* Discount Rules Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {discountRules
          .filter(rule => (rule.discountType || 'promo') === activeSection)
          .map((rule) => {
            const segment = TARGET_SEGMENTS.find(s => s.value === rule.targetSegment);
            return (
              <div key={rule._id} className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow duration-200">
                <div className="p-6">
                  {/* Header with name and discount */}
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-choma-black dark:text-choma-white truncate">
                      {rule.name}
                    </h3>
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-choma-brown text-white">
                      {(rule.discountPercent ?? 0)}% OFF
                    </span>
                  </div>

                  {/* Discount Type Badge */}
                  <div className="mb-3">
                    <span
                      className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium mr-2 ${(rule.discountType || 'promo') === 'promo'
                        ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
                        : 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400'
                        }`}
                    >
                      {(rule.discountType || 'promo') === 'promo' ? 'PROMO' : 'AD'}
                    </span>
                    <span
                      className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium text-white ${getSegmentColorClass(rule.targetSegment ?? 'first_time')}`}
                    >
                      {segment?.label || (rule.targetSegment ?? 'first_time')}
                    </span>
                  </div>

                  {/* Description */}
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 line-clamp-2">
                    {rule.description || segment?.description}
                  </p>

                  {/* Applicability */}
                  <div className="mb-4">
                    {rule.applyToAllMealPlans ? (
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                        All Meal Plans
                      </span>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {rule.applicableMealPlans && rule.applicableMealPlans.length > 0 && (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
                            {rule.applicableMealPlans.length} Plan{rule.applicableMealPlans.length > 1 ? 's' : ''}
                          </span>
                        )}
                        {rule.applicableCategories && rule.applicableCategories.length > 0 && (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400">
                            {rule.applicableCategories.length} Categor{rule.applicableCategories.length > 1 ? 'ies' : 'y'}
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Status and validity */}
                  <div className="flex items-center justify-between mb-4">
                    <span
                      className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${rule.isActive
                        ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                        : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                        }`}
                    >
                      {rule.isActive ? 'Active' : 'Inactive'}
                    </span>

                    {rule.validUntil && (
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        Until {new Date(rule.validUntil).toLocaleDateString()}
                      </span>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEditRule(rule)}
                      className="flex-1 inline-flex items-center justify-center px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600 rounded-md transition-colors duration-200"
                    >
                      <PencilIcon className="h-4 w-4 mr-1" />
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteRule(rule._id!)}
                      className="flex-1 inline-flex items-center justify-center px-3 py-2 text-sm font-medium text-red-700 bg-red-100 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400 dark:hover:bg-red-900/50 rounded-md transition-colors duration-200"
                    >
                      <TrashIcon className="h-4 w-4 mr-1" />
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        }
      </div>

      {/* Empty State */}
      {discountRules.filter(rule => (rule.discountType || 'promo') === activeSection).length === 0 && (
        <div className="text-center py-12">
          <div className="mx-auto h-12 w-12 text-gray-400 mb-4">
            <PlusIcon className="h-full w-full" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
            No {activeSection === 'promo' ? 'promo' : 'ad'} discounts yet
          </h3>
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            Get started by creating your first {activeSection === 'promo' ? 'promotional' : 'advertisement'} discount.
          </p>
          <button
            onClick={handleCreateRule}
            className="inline-flex items-center px-4 py-2 bg-choma-brown hover:bg-choma-brown/90 text-white font-medium rounded-lg transition-colors duration-200"
          >
            <PlusIcon className="h-5 w-5 mr-2" />
            Create {activeSection === 'promo' ? 'Promo' : 'Ad'} Discount
          </button>
        </div>
      )}

      {/* Create/Edit Modal */}
      {dialogOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-semibold text-choma-black dark:text-choma-white">
                {editingRule ? 'Edit Discount Rule' : 'Create Discount Rule'}
              </h2>
              <button
                onClick={() => setDialogOpen(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                aria-label="Close modal"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-6">
              {/* Rule Name and Discount Type */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2">
                  <label htmlFor="ruleName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Rule Name *
                  </label>
                  <input
                    id="ruleName"
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-2 focus:ring-choma-brown focus:border-choma-brown dark:bg-gray-700 dark:text-white"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="discountType" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Discount Type *
                  </label>
                  <select
                    id="discountType"
                    value={formData.discountType || 'promo'}
                    onChange={(e) => setFormData({ ...formData, discountType: e.target.value as 'promo' | 'ad' })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-2 focus:ring-choma-brown focus:border-choma-brown dark:bg-gray-700 dark:text-white"
                  >
                    <option value="promo">Promo Discount</option>
                    <option value="ad">Ad Discount</option>
                  </select>
                </div>
              </div>

              {/* Ad Discount Calculator */}
              {renderAdDiscountCalculator()}

              {/* Discount Percentage and Target Segment - Hide discount percentage for ad type since it's calculated */}
              {formData.discountType !== 'ad' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="discountPercent" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Discount Percentage *
                    </label>
                    <input
                      id="discountPercent"
                      type="number"
                      min="1"
                      max="100"
                      value={formData.discountPercent ?? 0}
                      onChange={(e) => setFormData({ ...formData, discountPercent: parseInt(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-2 focus:ring-choma-brown focus:border-choma-brown dark:bg-gray-700 dark:text-white"
                      required
                    />
                  </div>
                  <div>
                    <label htmlFor="targetSegment" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Target Segment
                    </label>
                    <select
                      id="targetSegment"
                      value={formData.targetSegment ?? 'first_time'}
                      onChange={(e) => setFormData({ ...formData, targetSegment: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-2 focus:ring-choma-brown focus:border-choma-brown dark:bg-gray-700 dark:text-white"
                    >
                      {TARGET_SEGMENTS.map((segment) => (
                        <option key={segment.value} value={segment.value}>
                          {segment.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {/* Target Segment for Ad Discount */}
              {formData.discountType === 'ad' && (
                <div>
                  <label htmlFor="targetSegment" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Target Segment
                  </label>
                  <select
                    id="targetSegment"
                    value={formData.targetSegment ?? 'first_time'}
                    onChange={(e) => setFormData({ ...formData, targetSegment: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-2 focus:ring-choma-brown focus:border-choma-brown dark:bg-gray-700 dark:text-white"
                  >
                    {TARGET_SEGMENTS.map((segment) => (
                      <option key={segment.value} value={segment.value}>
                        {segment.label}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Dynamic Criteria Fields - Only show for promo discounts */}
              {formData.discountType !== 'ad' && renderCriteriaFields()}

              {/* Meal Plan Selection - Only show for promo discounts */}
              {formData.discountType !== 'ad' && (
                <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                  <h3 className="text-lg font-medium text-choma-black dark:text-choma-white mb-4">
                    Meal Plan Selection
                  </h3>

                  <div className="mb-4">
                    <label className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        checked={formData.applyToAllMealPlans ?? true}
                        onChange={(e) => {
                          setFormData({
                            ...formData,
                            applyToAllMealPlans: e.target.checked,
                            applicableMealPlans: e.target.checked ? [] : formData.applicableMealPlans,
                            applicableCategories: e.target.checked ? [] : formData.applicableCategories,
                          });
                        }}
                        className="h-4 w-4 text-choma-brown focus:ring-choma-brown border-gray-300 rounded"
                      />
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Apply to All Meal Plans
                      </span>
                    </label>
                  </div>

                  {!formData.applyToAllMealPlans && (
                    <>
                      {/* Specific Meal Plans */}
                      <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Select Specific Meal Plans
                        </label>
                        <div className="max-h-40 overflow-y-auto border border-gray-300 dark:border-gray-600 rounded-md p-2 bg-white dark:bg-gray-800">
                          {mealPlans.map((mealPlan) => (
                            <label key={mealPlan._id} className="flex items-center space-x-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-700 rounded">
                              <input
                                type="checkbox"
                                checked={formData.applicableMealPlans?.includes(mealPlan._id) ?? false}
                                onChange={(e) => {
                                  const current = formData.applicableMealPlans || [];
                                  const updated = e.target.checked
                                    ? [...current, mealPlan._id]
                                    : current.filter(id => id !== mealPlan._id);
                                  setFormData({
                                    ...formData,
                                    applicableMealPlans: updated
                                  });
                                }}
                                className="h-4 w-4 text-choma-brown focus:ring-choma-brown border-gray-300 rounded"
                              />
                              <div className="flex items-center space-x-3 min-w-0">
                                {mealPlan.planImageUrl && (
                                  <img
                                    src={mealPlan.planImageUrl}
                                    alt={String(mealPlan.planName ?? mealPlan.name ?? '')}
                                    className="w-8 h-8 rounded object-cover flex-shrink-0"
                                  />
                                )}
                                <div className="min-w-0">
                                  <div className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                                    {String(mealPlan.planName ?? mealPlan.name ?? '')}
                                  </div>
                                  <div className="text-xs text-gray-500 dark:text-gray-400">
                                    {String(mealPlan.category ?? '')} • ₦{Number(mealPlan.totalPrice ?? mealPlan.basePrice ?? 0).toLocaleString()}
                                  </div>
                                </div>
                              </div>
                            </label>
                          ))}
                        </div>
                      </div>

                      {/* Categories */}
                      <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Or Select by Categories
                        </label>
                        <div className="flex flex-wrap gap-2">
                          {categories.map((category) => (
                            <label key={category} className="flex items-center space-x-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-700">
                              <input
                                type="checkbox"
                                checked={formData.applicableCategories?.includes(category) ?? false}
                                onChange={(e) => {
                                  const current = formData.applicableCategories || [];
                                  const updated = e.target.checked
                                    ? [...current, category]
                                    : current.filter(cat => cat !== category);
                                  setFormData({
                                    ...formData,
                                    applicableCategories: updated
                                  });
                                }}
                                className="h-4 w-4 text-choma-brown focus:ring-choma-brown border-gray-300 rounded"
                              />
                              <span className="text-sm text-gray-700 dark:text-gray-300">{category}</span>
                            </label>
                          ))}
                        </div>
                      </div>

                      {/* Info Banner */}
                      <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md">
                        <p className="text-sm text-blue-700 dark:text-blue-300">
                          <strong>Selection Logic:</strong> If you select specific meal plans, the discount will only apply to those plans.
                          If you select categories, it will apply to all meal plans in those categories.
                          If you select both, it will apply to plans that match either criteria.
                        </p>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Description */}
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Description (Optional)
              </label>
              <textarea
                id="description"
                rows={3}
                value={formData.description ?? ''}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-2 focus:ring-choma-brown focus:border-choma-brown dark:bg-gray-700 dark:text-white"
              />
            </div>

            {/* Valid From and Until */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="validFrom" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Valid From (Optional)
                </label>
                <input
                  id="validFrom"
                  type="datetime-local"
                  value={formData.validFrom ? new Date(formData.validFrom).toISOString().slice(0, 16) : ''}
                  onChange={(e) => setFormData({ ...formData, validFrom: e.target.value ? new Date(e.target.value) : undefined })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-2 focus:ring-choma-brown focus:border-choma-brown dark:bg-gray-700 dark:text-white"
                />
              </div>
              <div>
                <label htmlFor="validUntil" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Valid Until (Optional)
                </label>
                <input
                  id="validUntil"
                  type="datetime-local"
                  value={formData.validUntil ? new Date(formData.validUntil).toISOString().slice(0, 16) : ''}
                  onChange={(e) => setFormData({ ...formData, validUntil: e.target.value ? new Date(e.target.value) : undefined })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-2 focus:ring-choma-brown focus:border-choma-brown dark:bg-gray-700 dark:text-white"
                />
              </div>
            </div>

            {/* Active Status */}
            <div>
              <label className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="h-4 w-4 text-choma-brown focus:ring-choma-brown border-gray-300 rounded"
                />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Active Rule
                </span>
              </label>
            </div>
          </div>

          {/* Modal Footer */}
          <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={() => setDialogOpen(false)}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:ring-2 focus:ring-offset-2 focus:ring-choma-brown dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-600"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveRule}
              className="px-4 py-2 text-sm font-medium text-white bg-choma-brown border border-transparent rounded-md hover:bg-choma-brown/90 focus:ring-2 focus:ring-offset-2 focus:ring-choma-brown"
            >
              {editingRule ? 'Update Rule' : 'Create Rule'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default DiscountManagement;