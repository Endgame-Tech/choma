import React from 'react';

interface SegmentIndicatorProps {
    color: string;
    percentage: number;
}

export const SegmentIndicator: React.FC<SegmentIndicatorProps> = ({ color, percentage }) => {
    return (
        <div className="w-full bg-gray-100 rounded-full h-2 mb-2">
            <div
                className={`segment-bar-value`}
                style={{
                    width: `${percentage}%`,
                    backgroundColor: color
                }}
            />
        </div>
    );
};
