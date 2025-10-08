import React, { useState, useEffect } from 'react';
import { chefSubscriptionsApi } from '../services/api';
import styles from '../styles/BatchPreparationPanel.module.css';
import {
  Clock,
  ChefHat,
  Users,
  CheckCircle,
  AlertCircle,
  Play,
  Pause,
  Timer,
  Zap,
  ArrowRight,
  X
} from 'lucide-react';

interface BatchMeal {
  _id: string;
  mealTitle: string;
  scheduledDate: string;
  scheduledTimeSlot: {
    start: string;
    end: string;
  };
  subscriptionId: {
    _id: string;
    customerId: {
      fullName: string;
      deliveryAddress: string;
    };
  };
  status: string;
  preparationTime: number;
}

interface BatchGroup {
  _id: string;
  mealName: string;
  count: number;
  meals: BatchMeal[];
  estimatedTimeSaving: number;
  recommendedStartTime: string;
  totalPreparationTime: number;
  status: 'pending' | 'in_progress' | 'completed' | 'paused';
}

interface ActiveBatch {
  batchId: string;
  startedAt: string;
  currentStep: number;
  totalSteps: number;
  estimatedCompletion: string;
  meals: BatchMeal[];
}

interface BatchPreparationPanelProps {
  onScheduleBatch: (batchData: any) => void;
}

const BatchPreparationPanel: React.FC<BatchPreparationPanelProps> = ({ onScheduleBatch }) => {
  const [availableBatches, setAvailableBatches] = useState<BatchGroup[]>([]);
  const [, setActiveBatches] = useState<ActiveBatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedBatch, setSelectedBatch] = useState<BatchGroup | null>(null);
  const [preparationTimer, setPreparationTimer] = useState<number>(0);
  const [timerActive, setTimerActive] = useState<boolean>(false);

  useEffect(() => {
    fetchBatchOpportunities();
    fetchActiveBatches();
  }, []);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (timerActive && preparationTimer > 0) {
      interval = setInterval(() => {
        setPreparationTimer(prev => {
          if (prev <= 1) {
            setTimerActive(false);
            handleBatchCompletion();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [timerActive, preparationTimer]);

  const fetchBatchOpportunities = async () => {
    try {
      setLoading(true);
      const data = await chefSubscriptionsApi.getBatchOpportunities();
      setAvailableBatches(data.batchGroups || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load batch opportunities');
    } finally {
      setLoading(false);
    }
  };

  const fetchActiveBatches = async () => {
    try {
      const data = await chefSubscriptionsApi.getActiveBatches();
      setActiveBatches(data || []);
    } catch (err) {
      console.error('Failed to fetch active batches:', err);
    }
  };

  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const startBatchPreparation = async (batch: BatchGroup) => {
    try {
      await chefSubscriptionsApi.startBatchPreparation(batch._id);

      setSelectedBatch(batch);
      setPreparationTimer(batch.totalPreparationTime * 60); // Convert to seconds
      setTimerActive(true);

      const newActiveBatch: ActiveBatch = {
        batchId: batch._id,
        startedAt: new Date().toISOString(),
        currentStep: 1,
        totalSteps: batch.meals.length,
        estimatedCompletion: new Date(Date.now() + batch.totalPreparationTime * 60 * 1000).toISOString(),
        meals: batch.meals
      };

      setActiveBatches(prev => [...prev, newActiveBatch]);
      onScheduleBatch(newActiveBatch);

      // Remove from available batches
      setAvailableBatches(prev => prev.filter(b => b._id !== batch._id));
    } catch (err) {
      console.error('Failed to start batch preparation:', err);
    }
  };

  const pauseBatchPreparation = () => {
    setTimerActive(false);
  };

  const resumeBatchPreparation = () => {
    setTimerActive(true);
  };

  const handleBatchCompletion = async () => {
    if (!selectedBatch) return;

    try {
      await chefSubscriptionsApi.completeBatchPreparation(selectedBatch._id);

      setActiveBatches(prev => prev.filter(b => b.batchId !== selectedBatch._id));
      setSelectedBatch(null);
      setPreparationTimer(0);

      await fetchBatchOpportunities();
    } catch (err) {
      console.error('Failed to complete batch preparation:', err);
    }
  };

  const cancelBatchPreparation = async () => {
    if (!selectedBatch) return;

    try {
      await chefSubscriptionsApi.cancelBatchPreparation(selectedBatch._id);

      setActiveBatches(prev => prev.filter(b => b.batchId !== selectedBatch._id));
      setSelectedBatch(null);
      setPreparationTimer(0);
      setTimerActive(false);

      await fetchBatchOpportunities();
    } catch (err) {
      console.error('Failed to cancel batch preparation:', err);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-300">Loading batch opportunities...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 rounded-lg p-6">
        <div className="flex items-center">
          <AlertCircle size={20} className="text-red-400 mr-3" />
          <div className="flex-1">
            <h3 className="text-red-800 dark:text-red-200 font-medium">Error loading batch data</h3>
            <p className="text-red-600 dark:text-red-300 mt-1">{error}</p>
          </div>
          <button
            onClick={fetchBatchOpportunities}
            className="ml-4 px-4 py-2 bg-red-100 dark:bg-red-800 text-red-700 dark:text-red-200 rounded-lg hover:bg-red-200 dark:hover:bg-red-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
            Batch Preparation
          </h2>
          <p className="text-gray-600 dark:text-gray-300 mt-1">
            Optimize your cooking workflow with batch preparation
          </p>
        </div>

        {selectedBatch && (
          <div className="flex items-center gap-2">
            <div className="bg-blue-100 dark:bg-blue-800 px-4 py-2 rounded-lg">
              <div className="flex items-center gap-2">
                <Timer size={16} className="text-blue-600" />
                <span className="font-mono text-lg font-semibold text-blue-900 dark:text-blue-100">
                  {formatTime(preparationTimer)}
                </span>
              </div>
            </div>

            <button
              onClick={timerActive ? pauseBatchPreparation : resumeBatchPreparation}
              className="p-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            >
              {timerActive ? <Pause size={16} /> : <Play size={16} />}
            </button>

            <button
              onClick={cancelBatchPreparation}
              className="p-2 bg-red-100 dark:bg-red-800 text-red-700 dark:text-red-200 rounded-lg hover:bg-red-200 dark:hover:bg-red-700 transition-colors"
              aria-label="Cancel batch preparation"
            >
              <X size={16} />
            </button>
          </div>
        )}
      </div>

      {/* Active Batch Progress */}
      {selectedBatch && (
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/30 dark:to-purple-900/30 border border-blue-200 dark:border-blue-700 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Currently Preparing: {selectedBatch.mealName}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                {selectedBatch.count} meals • Est. {selectedBatch.estimatedTimeSaving}min saved
              </p>
            </div>

            <div className="text-right">
              <p className="text-2xl font-bold text-blue-600">
                {Math.round(((selectedBatch.totalPreparationTime * 60 - preparationTimer) / (selectedBatch.totalPreparationTime * 60)) * 100)}%
              </p>
              <p className="text-xs text-gray-500">Complete</p>
            </div>
          </div>

          {/* Progress Bar */}
          <div className={styles.progressContainer}>
            <div
              className={styles.progressBar}
              style={{
                width: `${Math.round(((selectedBatch.totalPreparationTime * 60 - preparationTimer) / (selectedBatch.totalPreparationTime * 60)) * 100)}%`
              }}
            ></div>
          </div>

          {/* Meal Progress */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {selectedBatch.meals.slice(0, 3).map((meal) => (
              <div key={meal._id} className="bg-white dark:bg-gray-800 p-3 rounded-lg border">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                      {meal.subscriptionId.customerId.fullName}
                    </p>
                    <p className="text-xs text-gray-500 truncate">
                      {meal.scheduledTimeSlot.start} - {meal.scheduledTimeSlot.end}
                    </p>
                  </div>
                  <CheckCircle size={16} className="text-green-500" />
                </div>
              </div>
            ))}

            {selectedBatch.meals.length > 3 && (
              <div className="flex items-center justify-center text-sm text-gray-500">
                +{selectedBatch.meals.length - 3} more
              </div>
            )}
          </div>
        </div>
      )}

      {/* Available Batch Opportunities */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Available Batch Opportunities
        </h3>

        {availableBatches.length === 0 ? (
          <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
            <ChefHat size={48} className="mx-auto mb-4 text-gray-400 dark:text-gray-500" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              No Batch Opportunities Available
            </h3>
            <p className="text-gray-600 dark:text-gray-300">
              Batch opportunities appear when you have 3 or more similar meals to prepare.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {availableBatches.map((batch) => (
              <div
                key={batch._id}
                className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h4 className="font-semibold text-gray-900 dark:text-white mb-1">
                      {batch.mealName}
                    </h4>
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      {batch.count} similar meals
                    </p>
                  </div>

                  <div className="text-right">
                    <div className="flex items-center gap-1 text-green-600 mb-1">
                      <Zap size={16} />
                      <span className="font-semibold">{batch.estimatedTimeSaving}m</span>
                    </div>
                    <p className="text-xs text-gray-500">time saved</p>
                  </div>
                </div>

                {/* Batch Details */}
                <div className="space-y-3 mb-4">
                  <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                    <Clock size={14} />
                    <span>Start: {batch.recommendedStartTime}</span>
                  </div>

                  <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                    <Timer size={14} />
                    <span>Duration: {batch.totalPreparationTime} minutes</span>
                  </div>
                </div>

                {/* Sample Meals */}
                <div className="space-y-2 mb-4">
                  <p className="text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wide">
                    Included Meals:
                  </p>
                  {batch.meals.slice(0, 2).map((meal) => (
                    <div key={meal._id} className="flex items-center justify-between text-sm p-2 bg-gray-50 dark:bg-gray-700 rounded">
                      <div className="flex items-center gap-2">
                        <Users size={12} />
                        <span className="truncate">{meal.subscriptionId.customerId.fullName}</span>
                      </div>
                      <span className="text-xs text-gray-500">
                        {meal.scheduledTimeSlot.start}
                      </span>
                    </div>
                  ))}

                  {batch.meals.length > 2 && (
                    <p className="text-xs text-gray-500 text-center">
                      +{batch.meals.length - 2} more meals
                    </p>
                  )}
                </div>

                <button
                  onClick={() => startBatchPreparation(batch)}
                  disabled={selectedBatch !== null}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <Play size={16} />
                  Start Batch Preparation
                  <ArrowRight size={16} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default BatchPreparationPanel;