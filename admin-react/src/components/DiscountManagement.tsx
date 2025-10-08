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
import PromoDiscountModal from './PromoDiscountModal';
import AdDiscountModal from './AdDiscountModal';

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
  const [promoDialogOpen, setPromoDialogOpen] = useState(false);
  const [adDialogOpen, setAdDialogOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<DiscountRule | null>(null);
  const [activeSection, setActiveSection] = useState<'ad' | 'promo'>('promo');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

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
    if (activeSection === 'promo') {
      setPromoDialogOpen(true);
    } else {
      setAdDialogOpen(true);
    }
  };

  const handleEditRule = (rule: DiscountRule) => {
    setEditingRule(rule);
    if (rule.discountType === 'ad') {
      setAdDialogOpen(true);
    } else {
      setPromoDialogOpen(true);
    }
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

  const handleSaveRule = async (formData: DiscountRule) => {
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
        setPromoDialogOpen(false);
        setAdDialogOpen(false);
        loadDiscountRules();
      } else {
        setError('Failed to save discount rule');
      }
    } catch (err) {
      setError('Error saving discount rule');
      console.error('Error saving discount rule:', err);
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

      {/* Promo Discount Modal */}
      <PromoDiscountModal
        isOpen={promoDialogOpen}
        onClose={() => setPromoDialogOpen(false)}
        onSave={handleSaveRule}
        editingRule={editingRule}
        mealPlans={mealPlans}
        categories={categories}
      />

      {/* Ad Discount Modal */}
      <AdDiscountModal
        isOpen={adDialogOpen}
        onClose={() => setAdDialogOpen(false)}
        onSave={handleSaveRule}
        editingRule={editingRule}
        mealPlans={mealPlans}
      />
    </div>
  );
};

export default DiscountManagement;