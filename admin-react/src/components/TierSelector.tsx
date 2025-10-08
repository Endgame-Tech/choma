import React from 'react';

interface TierSelectorProps {
    selectedTier: string;
    onTierChange: (tier: string) => void;
    className?: string;
}

const tiers = [
    {
        id: 'Premium',
        name: 'Premium',
        emoji: '💎',
        description: 'Premium tier with exclusive features',
        color: 'purple'
    },
    {
        id: 'Gold',
        name: 'Gold',
        emoji: '🥇',
        description: 'Gold tier with enhanced benefits',
        color: 'yellow'
    },
    {
        id: 'Silver',
        name: 'Silver',
        emoji: '🥈',
        description: 'Silver tier with standard features',
        color: 'gray'
    }
];

const TierSelector: React.FC<TierSelectorProps> = ({
    selectedTier,
    onTierChange,
    className = ''
}) => {
    const selectedTierData = tiers.find(tier => tier.id === selectedTier);

    return (
        <div className={`space-y-3 ${className}`}>
            <label className="block text-sm font-medium text-gray-700 dark:text-neutral-200">
                Tier *
            </label>

            {/* Current Tier Display */}
            {selectedTierData && (
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-3 mb-3">
                    <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 rounded bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-800 dark:to-blue-900 flex items-center justify-center">
                            <span className="text-lg">{selectedTierData.emoji}</span>
                        </div>
                        <div className="flex-1">
                            <p className="text-sm font-medium text-blue-800 dark:text-blue-300">
                                Current Tier: {selectedTierData.name}
                            </p>
                            <p className="text-xs text-blue-600 dark:text-blue-400">
                                {selectedTierData.description}
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Tier Selection Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {tiers.map((tier) => (
                    <button
                        key={tier.id}
                        type="button"
                        onClick={() => onTierChange(tier.id)}
                        className={`flex flex-col items-center space-y-2 p-4 rounded-lg border-2 transition-all ${selectedTier === tier.id
                                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30'
                                : 'border-gray-200 dark:border-neutral-600 bg-white dark:bg-neutral-800 hover:border-gray-300 dark:hover:border-neutral-500'
                            }`}
                    >
                        <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${tier.color === 'purple'
                                ? 'bg-gradient-to-br from-purple-100 to-purple-200 dark:from-purple-800 dark:to-purple-900'
                                : tier.color === 'yellow'
                                    ? 'bg-gradient-to-br from-yellow-100 to-yellow-200 dark:from-yellow-800 dark:to-yellow-900'
                                    : 'bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800'
                            }`}>
                            <span className="text-2xl">{tier.emoji}</span>
                        </div>

                        <div className="text-center">
                            <p className={`font-medium text-sm ${selectedTier === tier.id
                                    ? 'text-blue-700 dark:text-blue-300'
                                    : 'text-gray-900 dark:text-white'
                                }`}>
                                {tier.name}
                            </p>
                            <p className={`text-xs mt-1 ${selectedTier === tier.id
                                    ? 'text-blue-600 dark:text-blue-400'
                                    : 'text-gray-500 dark:text-neutral-400'
                                }`}>
                                {tier.description}
                            </p>
                        </div>

                        {selectedTier === tier.id && (
                            <i className="fi fi-sr-check text-blue-600 dark:text-blue-400 text-sm"></i>
                        )}
                    </button>
                ))}
            </div>

            <p className="text-xs text-gray-500 dark:text-neutral-400">
                Select the tier level for this meal plan. This affects pricing and feature availability.
            </p>
        </div>
    );
};

export default TierSelector;