// admin-react/src/components/AdDiscountModal.tsx
import React, { useState, useEffect } from 'react';
import { type DiscountRule } from '../services/api';
import type { MealPlan } from '../types';
import {
  XMarkIcon,
  ExclamationTriangleIcon,
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

interface AdDiscountModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (formData: DiscountRule) => Promise<void>;
  editingRule: DiscountRule | null;
  mealPlans: MealPlan[];
}

const AdDiscountModal: React.FC<AdDiscountModalProps> = ({
  isOpen,
  onClose,
  onSave,
  editingRule,
  mealPlans,
}) => {
  const [formData, setFormData] = useState<DiscountRule>({
    name: '',
    discountPercent: 0,
    targetSegment: 'first_time',
    isActive: true,
    criteria: {},
    applyToAllMealPlans: false,
    applicableMealPlans: [],
    applicableCategories: [],
    applicableTags: [],
    discountType: 'ad',
    selectedMealPlanId: '',
    counterValue: 0,
    calculatedDiscount: 0,
  });

  const [selectedMealPlan, setSelectedMealPlan] = useState<MealPlan | null>(null);

  useEffect(() => {
    if (isOpen) {
      if (editingRule && editingRule.discountType === 'ad') {
        setFormData({ ...editingRule });
        if (editingRule.selectedMealPlanId) {
          const plan = mealPlans.find(p => p._id === editingRule.selectedMealPlanId);
          setSelectedMealPlan(plan || null);
        } else {
          setSelectedMealPlan(null);
        }
      } else {
        // Reset everything for new discount
        setFormData({
          name: '',
          discountPercent: 0,
          targetSegment: 'first_time',
          isActive: true,
          criteria: {},
          applyToAllMealPlans: false,
          applicableMealPlans: [],
          applicableCategories: [],
          applicableTags: [],
          discountType: 'ad',
          selectedMealPlanId: '',
          counterValue: 0,
          calculatedDiscount: 0,
        });
        setSelectedMealPlan(null);
      }
    }
  }, [editingRule, isOpen, mealPlans]);

  const calculateAdDiscount = (originalPrice: number, counterValue: number): number => {
    if (counterValue <= originalPrice) return 0;
    return Math.round(((counterValue - originalPrice) / counterValue) * 100);
  };

  const handleMealPlanSelect = (mealPlanId: string) => {
    const plan = mealPlans.find(p => p._id === mealPlanId);
    if (plan) {
      setSelectedMealPlan(plan);
      const originalPrice = Number(plan.totalPrice) || Number(plan.basePrice) || 0;
      const counterValue = formData.counterValue || 0;
      const discount = calculateAdDiscount(originalPrice, counterValue);

      setFormData(prev => ({
        ...prev,
        selectedMealPlanId: mealPlanId,
        applicableMealPlans: [mealPlanId],
        applyToAllMealPlans: false,
        calculatedDiscount: discount,
        discountPercent: discount,
      }));
    }
  };

  const handleCounterValueChange = (counterValue: number) => {
    if (selectedMealPlan) {
      const originalPrice = Number(selectedMealPlan.totalPrice) || Number(selectedMealPlan.basePrice) || 0;
      const discount = calculateAdDiscount(originalPrice, counterValue);
      setFormData(prev => ({
        ...prev,
        counterValue,
        calculatedDiscount: discount,
        discountPercent: discount
      }));
    }
  };

  const handleSave = async () => {
    await onSave(formData);
  };

  const isValidCounterValue = selectedMealPlan && formData.counterValue > (Number(selectedMealPlan.totalPrice) || Number(selectedMealPlan.basePrice) || 0);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h2 className="text-xl font-semibold text-choma-black dark:text-choma-white">
              {editingRule ? 'Edit Ad Discount' : 'Create Ad Discount'}
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Show fake higher prices to create perceived value (customer pays original price)
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
              placeholder="e.g., Black Friday Special"
              required
            />
          </div>

          {/* Ad Discount Calculator */}
          <div className="bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 rounded-lg p-6 border-2 border-purple-200 dark:border-purple-800">
            <h3 className="text-lg font-semibold text-choma-black dark:text-choma-white mb-4 flex items-center">
              <span className="bg-gradient-to-r from-purple-500 to-blue-500 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm mr-3">
                📊
              </span>
              Ad Discount Calculator
            </h3>

            <div className="space-y-5">
              {/* Step 1: Select Meal Plan */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-purple-500 text-white text-xs font-bold mr-2">
                    1
                  </span>
                  Select Meal Plan *
                </label>
                <select
                  value={formData.selectedMealPlanId || ''}
                  onChange={(e) => handleMealPlanSelect(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 dark:bg-gray-700 dark:text-white"
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
                <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border-2 border-purple-200 dark:border-purple-700 shadow-sm">
                  <div className="flex items-center space-x-4">
                    {selectedMealPlan.planImageUrl && (
                      <img
                        src={selectedMealPlan.planImageUrl}
                        alt={String(selectedMealPlan.planName || selectedMealPlan.name || '')}
                        className="w-20 h-20 rounded-lg object-cover border-2 border-purple-300 dark:border-purple-600"
                      />
                    )}
                    <div className="flex-1">
                      <h4 className="font-semibold text-lg text-gray-900 dark:text-gray-100">
                        {String(selectedMealPlan.planName || selectedMealPlan.name || '')}
                      </h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                        Category: {String(selectedMealPlan.category || '')}
                      </p>
                      <div className="inline-flex items-center px-3 py-1 bg-green-100 dark:bg-green-900/30 rounded-full">
                        <span className="text-sm font-medium text-gray-600 dark:text-gray-400 mr-2">Original Price:</span>
                        <span className="text-lg font-bold text-choma-brown">
                          ₦{(Number(selectedMealPlan.totalPrice) || Number(selectedMealPlan.basePrice) || 0).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Step 2: Set Counter Value */}
              {selectedMealPlan && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-purple-500 text-white text-xs font-bold mr-2">
                      2
                    </span>
                    Set "Counter Value" (Fake Higher Price) *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 font-semibold">₦</span>
                    <input
                      type="number"
                      min={(Number(selectedMealPlan.totalPrice) || Number(selectedMealPlan.basePrice) || 0) + 1}
                      value={formData.counterValue || ''}
                      onChange={(e) => handleCounterValueChange(parseInt(e.target.value) || 0)}
                      className="w-full pl-8 pr-3 py-3 border-2 border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 dark:bg-gray-700 dark:text-white text-lg font-semibold"
                      placeholder={`Enter amount higher than ₦${(Number(selectedMealPlan.totalPrice) || Number(selectedMealPlan.basePrice) || 0).toLocaleString()}`}
                      required
                    />
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 ml-1">
                    💡 This should be higher than the original price to show a discount
                  </p>
                </div>
              )}

              {/* Step 3: Calculated Results */}
              {isValidCounterValue && (
                <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-lg p-5 border-2 border-green-300 dark:border-green-700 shadow-md">
                  <div className="flex items-center mb-3">
                    <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-green-500 text-white text-xs font-bold mr-2">
                      3
                    </span>
                    <h4 className="font-semibold text-green-800 dark:text-green-300 text-lg">
                      ✅ Calculated Ad Discount
                    </h4>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-green-200 dark:border-green-800">
                      <span className="text-xs text-gray-600 dark:text-gray-400 block mb-1">Advertised Price</span>
                      <p className="font-bold text-gray-900 dark:text-gray-100 text-xl">
                        ₦{(formData.counterValue || 0).toLocaleString()}
                      </p>
                    </div>
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-green-200 dark:border-green-800">
                      <span className="text-xs text-gray-600 dark:text-gray-400 block mb-1">Actual Price</span>
                      <p className="font-bold text-choma-brown text-xl">
                        ₦{(Number(selectedMealPlan.totalPrice) || Number(selectedMealPlan.basePrice) || 0).toLocaleString()}
                      </p>
                    </div>
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-green-200 dark:border-green-800">
                      <span className="text-xs text-gray-600 dark:text-gray-400 block mb-1">Calculated Discount</span>
                      <p className="font-bold text-green-600 text-2xl">
                        {formData.calculatedDiscount || 0}%
                      </p>
                    </div>
                  </div>
                  <div className="bg-gradient-to-r from-green-100 to-emerald-100 dark:from-green-900/40 dark:to-emerald-900/40 rounded-lg p-4 border-l-4 border-green-500">
                    <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">
                      <strong>Customer will see:</strong>
                    </p>
                    <div className="flex items-center space-x-3">
                      <span className="line-through text-gray-500 text-lg">₦{(formData.counterValue || 0).toLocaleString()}</span>
                      <span className="text-2xl font-bold text-choma-brown">₦{(Number(selectedMealPlan.totalPrice) || Number(selectedMealPlan.basePrice) || 0).toLocaleString()}</span>
                      <span className="bg-red-500 text-white px-3 py-1 rounded-full text-sm font-bold">
                        {formData.calculatedDiscount || 0}% OFF!
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Warning for invalid counter value */}
              {selectedMealPlan && formData.counterValue && !isValidCounterValue && (
                <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-4 border-2 border-red-300 dark:border-red-700">
                  <div className="flex items-start">
                    <ExclamationTriangleIcon className="h-6 w-6 text-red-600 dark:text-red-400 mr-3 flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-semibold text-red-800 dark:text-red-300 mb-1">Invalid Counter Value</h4>
                      <p className="text-sm text-red-700 dark:text-red-400">
                        Counter value must be higher than the original price (₦{(Number(selectedMealPlan.totalPrice) || Number(selectedMealPlan.basePrice) || 0).toLocaleString()}) to create a discount effect.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Target Segment */}
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
              placeholder="Describe the ad discount campaign..."
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
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:ring-2 focus:ring-offset-2 focus:ring-choma-brown dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-600"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!isValidCounterValue || !formData.name}
            className="px-4 py-2 text-sm font-medium text-white bg-choma-brown border border-transparent rounded-md hover:bg-choma-brown/90 focus:ring-2 focus:ring-offset-2 focus:ring-choma-brown disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {editingRule ? 'Update Ad Discount' : 'Create Ad Discount'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdDiscountModal;
