import React from 'react';

interface MetricProgressBarProps {
    value: number;
    maxValue?: number;
    colorThresholds?: {
        good: number;
        fair: number;
    };
    isInverse?: boolean;
}

export const MetricProgressBar: React.FC<MetricProgressBarProps> = ({
    value,
    maxValue = 100,
    colorThresholds = { good: 95, fair: 85 },
    isInverse = false,
}) => {
    const percentage = Math.min((value / maxValue) * 100, 100);

    const getColorClass = () => {
        if (isInverse) {
            if (value <= colorThresholds.good) return 'bg-green-500';
            if (value <= colorThresholds.fair) return 'bg-yellow-500';
            return 'bg-red-500';
        } else {
            if (value >= colorThresholds.good) return 'bg-green-500';
            if (value >= colorThresholds.fair) return 'bg-yellow-500';
            return 'bg-red-500';
        }
    };

    return (
        <div className="metric-bar">
            <div
                className={`metric-bar-value ${getColorClass()}`}
                style={{ width: `${percentage}%` }}
            />
        </div>
    );
};
