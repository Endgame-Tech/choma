import React, { useEffect, useRef } from 'react';
import styles from './SegmentIndicator.module.css';

interface SegmentIndicatorProps {
    color: string;
    percentage: number;
}

export const SegmentIndicator: React.FC<SegmentIndicatorProps> = ({ color, percentage }) => {
    const barRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (barRef.current) {
            barRef.current.style.setProperty('--segment-width', `${Math.min(percentage, 100)}%`);
            barRef.current.style.setProperty('--segment-color', color);
        }
    }, [percentage, color]);

    return (
        <div className={`w-full bg-gray-100 rounded-full h-2 mb-2 ${styles.segmentBar}`}>
            <div
                className={`segment-bar-value ${styles.segmentBarValue}`}
                data-percentage={percentage}
                data-color={color}
            />
        </div>
    );
};