// admin-react/src/components/DiscountManagement.tsx - Dynamic Discount Management
import React, { useState, useEffect } from 'react';
import { discountApi, type DiscountRule } from '../services/api';
import type { MealPlan } from '../types';

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
  });
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
    });
    setDialogOpen(true);
  };

  const handleEditRule = (rule: DiscountRule) => {
    setEditingRule(rule);
    setFormData({ ...rule });
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
          <div style={{ marginBottom: '16px' }}>
            <label htmlFor="minSpent" style={{ display: 'block', marginBottom: '4px', fontWeight: '500' }}>
              Minimum Spent (₦)
            </label>
            <input
              id="minSpent"
              type="number"
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid #d1d5db',
                borderRadius: '4px',
                fontSize: '14px'
              }}
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
          <div style={{ marginBottom: '16px' }}>
            <label htmlFor="minStreak" style={{ display: 'block', marginBottom: '4px', fontWeight: '500' }}>
              Minimum Streak (months)
            </label>
            <input
              id="minStreak"
              type="number"
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid #d1d5db',
                borderRadius: '4px',
                fontSize: '14px'
              }}
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
          <div style={{ marginBottom: '16px' }}>
            <label htmlFor="withinDays" style={{ display: 'block', marginBottom: '4px', fontWeight: '500' }}>
              Within Days of Registration
            </label>
            <input
              id="withinDays"
              type="number"
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid #d1d5db',
                borderRadius: '4px',
                fontSize: '14px'
              }}
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
            <div style={{ marginBottom: '16px' }}>
              <label htmlFor="seasonName" style={{ display: 'block', marginBottom: '4px', fontWeight: '500' }}>
                Season Name
              </label>
              <input
                id="seasonName"
                type="text"
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '4px',
                  fontSize: '14px'
                }}
                value={formData.criteria?.seasonName || ''}
                onChange={(e) => setFormData({
                  ...formData,
                  criteria: { ...formData.criteria, seasonName: e.target.value }
                })}
              />
            </div>
            <div style={{ display: 'flex', gap: '16px' }}>
              <div style={{ flex: 1 }}>
                <label htmlFor="seasonStart" style={{ display: 'block', marginBottom: '4px', fontWeight: '500' }}>
                  Season Start Date
                </label>
                <input
                  id="seasonStart"
                  type="datetime-local"
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '4px',
                    fontSize: '14px'
                  }}
                  value={formData.criteria?.seasonStart ? new Date(formData.criteria.seasonStart).toISOString().slice(0, 16) : ''}
                  onChange={(e) => setFormData({
                    ...formData,
                    criteria: { ...formData.criteria, seasonStart: e.target.value ? new Date(e.target.value) : undefined }
                  })}
                />
              </div>
              <div style={{ flex: 1 }}>
                <label htmlFor="seasonEnd" style={{ display: 'block', marginBottom: '4px', fontWeight: '500' }}>
                  Season End Date
                </label>
                <input
                  id="seasonEnd"
                  type="datetime-local"
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '4px',
                    fontSize: '14px'
                  }}
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

  const getSegmentColor = (segment: string) => {
    switch (segment) {
      case 'first_time': return '#10b981';
      case 'inactive_6_months':
      case 'inactive_1_year': return '#f59e0b';
      case 'loyal_consistent':
      case 'high_value': return '#3b82f6';
      case 'seasonal': return '#8b5cf6';
      default: return '#6b7280';
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '40px',
            height: '40px',
            border: '4px solid #f3f4f6',
            borderTop: '4px solid #3b82f6',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 16px'
          }}></div>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '24px' }}>
      <style>
        {`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
          .discount-card {
            background: white;
            border-radius: 8px;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
            padding: 20px;
            margin-bottom: 16px;
            border: 1px solid #e5e7eb;
          }
          .discount-card:hover {
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
          }
          .tag {
            display: inline-block;
            padding: 4px 8px;
            border-radius: 12px;
            font-size: 12px;
            font-weight: 500;
            margin-right: 8px;
            margin-bottom: 4px;
          }
          .btn {
            padding: 8px 16px;
            border-radius: 4px;
            border: none;
            font-weight: 500;
            cursor: pointer;
            font-size: 14px;
            transition: all 0.2s;
          }
          .btn-primary {
            background-color: #3b82f6;
            color: white;
          }
          .btn-primary:hover {
            background-color: #2563eb;
          }
          .btn-danger {
            background-color: #ef4444;
            color: white;
          }
          .btn-danger:hover {
            background-color: #dc2626;
          }
          .btn-secondary {
            background-color: #6b7280;
            color: white;
          }
          .btn-secondary:hover {
            background-color: #4b5563;
          }
          .modal-overlay {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background-color: rgba(0, 0, 0, 0.5);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 1000;
          }
          .modal-content {
            background: white;
            border-radius: 8px;
            padding: 24px;
            max-width: 600px;
            width: 90%;
            max-height: 80vh;
            overflow-y: auto;
          }
          .form-group {
            margin-bottom: 16px;
          }
          .form-label {
            display: block;
            margin-bottom: 4px;
            font-weight: 500;
            color: #374151;
          }
          .form-input {
            width: 100%;
            padding: 8px 12px;
            border: 1px solid #d1d5db;
            border-radius: 4px;
            font-size: 14px;
          }
          .form-input:focus {
            outline: none;
            border-color: #3b82f6;
            box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
          }
          .alert {
            padding: 12px 16px;
            border-radius: 4px;
            margin-bottom: 16px;
          }
          .alert-error {
            background-color: #fef2f2;
            color: #991b1b;
            border: 1px solid #fecaca;
          }
          .alert-success {
            background-color: #f0fdf4;
            color: #166534;
            border: 1px solid #bbf7d0;
          }
        `}
      </style>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 'bold', margin: 0 }}>
          Discount Management
        </h1>
        <button
          className="btn btn-primary"
          onClick={handleCreateRule}
        >
          + Create Discount Rule
        </button>
      </div>

      {error && (
        <div className="alert alert-error">
          <strong>Error:</strong> {error}
          <button
            onClick={() => setError(null)}
            style={{ float: 'right', background: 'none', border: 'none', fontSize: '16px', cursor: 'pointer' }}
          >
            ×
          </button>
        </div>
      )}

      {success && (
        <div className="alert alert-success">
          <strong>Success:</strong> {success}
          <button
            onClick={() => setSuccess(null)}
            style={{ float: 'right', background: 'none', border: 'none', fontSize: '16px', cursor: 'pointer' }}
          >
            ×
          </button>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
        {discountRules.map((rule) => {
          const segment = TARGET_SEGMENTS.find(s => s.value === rule.targetSegment);
          return (
            <div key={rule._id} className="discount-card">
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: '12px' }}>
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '600', flex: 1 }}>
                  {rule.name}
                </h3>
                <span
                  className="tag"
                  style={{ backgroundColor: '#3b82f6', color: 'white' }}
                >
                  {(rule.discountPercent ?? 0)}% OFF
                </span>
              </div>

              <span
                className="tag"
                style={{ backgroundColor: getSegmentColor(rule.targetSegment ?? 'first_time'), color: 'white' }}
              >
                {segment?.label || (rule.targetSegment ?? 'first_time')}
              </span>

              <p style={{ color: '#6b7280', fontSize: '14px', margin: '8px 0' }}>
                {segment?.description}
              </p>

              {rule.description && (
                <p style={{ fontSize: '14px', margin: '8px 0' }}>
                  {rule.description}
                </p>
              )}

              <div style={{ marginBottom: '12px' }}>
                {rule.applyToAllMealPlans ? (
                  <span className="tag" style={{ backgroundColor: '#10b981', color: 'white' }}>
                    All Meal Plans
                  </span>
                ) : (
                  <>
                    {rule.applicableMealPlans && rule.applicableMealPlans.length > 0 && (
                      <span className="tag" style={{ backgroundColor: '#3b82f6', color: 'white' }}>
                        {rule.applicableMealPlans.length} Specific Plan{rule.applicableMealPlans.length > 1 ? 's' : ''}
                      </span>
                    )}
                    {rule.applicableCategories && rule.applicableCategories.length > 0 && (
                      <span className="tag" style={{ backgroundColor: '#8b5cf6', color: 'white' }}>
                        {rule.applicableCategories.length} Categor{rule.applicableCategories.length > 1 ? 'ies' : 'y'}
                      </span>
                    )}
                  </>
                )}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                <span
                  className="tag"
                  style={{
                    backgroundColor: rule.isActive ? '#10b981' : '#6b7280',
                    color: 'white'
                  }}
                >
                  {rule.isActive ? 'Active' : 'Inactive'}
                </span>

                {rule.validUntil && (
                  <span style={{ fontSize: '12px', color: '#6b7280' }}>
                    Until {new Date(rule.validUntil).toLocaleDateString()}
                  </span>
                )}
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  className="btn btn-secondary"
                  onClick={() => handleEditRule(rule)}
                  style={{ flex: 1 }}
                >
                  Edit
                </button>
                <button
                  className="btn btn-danger"
                  onClick={() => handleDeleteRule(rule._id!)}
                  style={{ flex: 1 }}
                >
                  Delete
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Create/Edit Modal */}
      {dialogOpen && (
        <div className="modal-overlay" onClick={() => setDialogOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2 style={{ margin: '0 0 24px 0', fontSize: '20px', fontWeight: '600' }}>
              {editingRule ? 'Edit Discount Rule' : 'Create Discount Rule'}
            </h2>

            <div className="form-group">
              <label className="form-label" htmlFor="ruleName">
                Rule Name *
              </label>
              <input
                id="ruleName"
                className="form-input"
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>

            <div style={{ display: 'flex', gap: '16px' }}>
              <div className="form-group" style={{ flex: 1 }}>
                <label className="form-label" htmlFor="discountPercent">
                  Discount Percentage *
                </label>
                <input
                  id="discountPercent"
                  className="form-input"
                  type="number"
                  min="1"
                  max="100"
                  value={formData.discountPercent ?? 0}
                  onChange={(e) => setFormData({ ...formData, discountPercent: parseInt(e.target.value) || 0 })}
                  required
                />
              </div>
              <div className="form-group" style={{ flex: 1 }}>
                <label className="form-label" htmlFor="targetSegment">
                  Target Segment
                </label>
                <select
                  id="targetSegment"
                  className="form-input"
                  value={formData.targetSegment ?? 'first_time'}
                  onChange={(e) => setFormData({ ...formData, targetSegment: e.target.value })}
                >
                  {TARGET_SEGMENTS.map((segment) => (
                    <option key={segment.value} value={segment.value}>
                      {segment.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {renderCriteriaFields()}

            {/* Meal Plan Selection */}
            <div style={{ marginBottom: '16px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px' }}>
                Meal Plan Selection
              </h3>

              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
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
                  />
                  Apply to All Meal Plans
                </label>
              </div>

              {!formData.applyToAllMealPlans && (
                <>
                  <div className="form-group">
                    <label className="form-label">Select Specific Meal Plans</label>
                    <div style={{ maxHeight: '150px', overflowY: 'auto', border: '1px solid #d1d5db', borderRadius: '4px', padding: '8px' }}>
                      {mealPlans.map((mealPlan) => (
                        <label key={mealPlan._id} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
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
                          />
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            {mealPlan.planImageUrl && (
                              <img
                                src={mealPlan.planImageUrl}
                                alt={String(mealPlan.planName ?? mealPlan.name ?? '')}
                                style={{
                                  width: '30px',
                                  height: '30px',
                                  borderRadius: '4px',
                                  objectFit: 'cover',
                                }}
                              />
                            )}
                            <div>
                              <div style={{ fontWeight: '500', fontSize: '14px' }}>
                                {String(mealPlan.planName ?? mealPlan.name ?? '')}
                              </div>
                              <div style={{ fontSize: '12px', color: '#6b7280' }}>
                                {String(mealPlan.category ?? '')} • ₦{Number(mealPlan.totalPrice ?? mealPlan.basePrice ?? 0).toLocaleString()}
                              </div>
                            </div>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Or Select by Categories</label>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                      {categories.map((category) => (
                        <label key={category} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
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
                          />
                          {category}
                        </label>
                      ))}
                    </div>
                  </div>

                  <div style={{ padding: '12px', backgroundColor: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '4px', fontSize: '14px' }}>
                    <strong>Selection Logic:</strong> If you select specific meal plans, the discount will only apply to those plans.
                    If you select categories, it will apply to all meal plans in those categories.
                    If you select both, it will apply to plans that match either criteria.
                  </div>
                </>
              )}
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="description">
                Description (Optional)
              </label>
              <textarea
                id="description"
                className="form-input"
                rows={3}
                value={formData.description ?? ''}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>

            <div style={{ display: 'flex', gap: '16px' }}>
              <div className="form-group" style={{ flex: 1 }}>
                <label className="form-label" htmlFor="validFrom">
                  Valid From (Optional)
                </label>
                <input
                  id="validFrom"
                  className="form-input"
                  type="datetime-local"
                  value={formData.validFrom ? new Date(formData.validFrom).toISOString().slice(0, 16) : ''}
                  onChange={(e) => setFormData({ ...formData, validFrom: e.target.value ? new Date(e.target.value) : undefined })}
                />
              </div>
              <div className="form-group" style={{ flex: 1 }}>
                <label className="form-label" htmlFor="validUntil">
                  Valid Until (Optional)
                </label>
                <input
                  id="validUntil"
                  className="form-input"
                  type="datetime-local"
                  value={formData.validUntil ? new Date(formData.validUntil).toISOString().slice(0, 16) : ''}
                  onChange={(e) => setFormData({ ...formData, validUntil: e.target.value ? new Date(e.target.value) : undefined })}
                />
              </div>
            </div>

            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input
                  type="checkbox"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                />
                Active Rule
              </label>
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                className="btn btn-secondary"
                onClick={() => setDialogOpen(false)}
              >
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={handleSaveRule}
              >
                {editingRule ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DiscountManagement;