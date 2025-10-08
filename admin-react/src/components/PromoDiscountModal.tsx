// admin-react/src/components/PromoDiscountModal.tsx
import React, { useState, useEffect } from 'react';
import { type DiscountRule } from '../services/api';
import type { MealPlan } from '../types';
import {
  XMarkIcon,
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

interface PromoDiscountModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (formData: DiscountRule) => Promise<void>;
  editingRule: DiscountRule | null;
  mealPlans: MealPlan[];
  categories: string[];
}

const PromoDiscountModal: React.FC<PromoDiscountModalProps> = ({
  isOpen,
  onClose,
  onSave,
  editingRule,
  mealPlans,
  categories,
}) => {
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
    discountType: 'promo',
  });

  useEffect(() => {
    if (editingRule) {
      setFormData({ ...editingRule, discountType: 'promo' });
    } else {
      setFormData({
        name: '',
        discountPercent: 0,
        targetSegment: 'first_time',
        isActive: true,
        criteria: {},
        applyToAllMealPlans: true,
        applicableMealPlans: [],
        applicableCategories: [],
        applicableTags: [],
        discountType: 'promo',
      });
    }
  }, [editingRule, isOpen]);

  const handleSave = async () => {
    await onSave(formData);
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h2 className="text-xl font-semibold text-choma-black dark:text-choma-white">
              {editingRule ? 'Edit Promo Discount' : 'Create Promo Discount'}
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Promotional discounts reduce the actual price customers pay
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            aria-label="Close modal"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6">
          {/* Rule Name */}
          <div>
            <label htmlFor="ruleName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Rule Name *
            </label>
            <input
              id="ruleName"
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-2 focus:ring-choma-brown focus:border-choma-brown dark:bg-gray-700 dark:text-white"
              placeholder="e.g., Summer Sale 2024"
              required
            />
          </div>

          {/* Discount Percentage and Target Segment */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="discountPercent" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Discount Percentage *
              </label>
              <div className="relative">
                <input
                  id="discountPercent"
                  type="number"
                  min="1"
                  max="100"
                  value={formData.discountPercent ?? 0}
                  onChange={(e) => setFormData({ ...formData, discountPercent: parseInt(e.target.value) || 0 })}
                  className="w-full px-3 py-2 pr-8 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-2 focus:ring-choma-brown focus:border-choma-brown dark:bg-gray-700 dark:text-white"
                  required
                />
                <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500">%</span>
              </div>
            </div>
            <div>
              <label htmlFor="targetSegment" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Target Segment *
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

          {/* Dynamic Criteria Fields */}
          {renderCriteriaFields()}

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
              placeholder="Describe the promotional discount..."
            />
          </div>

          {/* Meal Plan Selection */}
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
                              alt={String(mealPlan.planName || mealPlan.name || '')}
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
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:ring-2 focus:ring-offset-2 focus:ring-choma-brown dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-600"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 text-sm font-medium text-white bg-choma-brown border border-transparent rounded-md hover:bg-choma-brown/90 focus:ring-2 focus:ring-offset-2 focus:ring-choma-brown"
          >
            {editingRule ? 'Update Promo Discount' : 'Create Promo Discount'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PromoDiscountModal;
