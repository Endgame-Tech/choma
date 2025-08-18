import React, { useEffect, useRef } from 'react';
import styles from './ColorIndicator.module.css';

interface ColorIndicatorProps {
    color: string;
}

export const ColorIndicator: React.FC<ColorIndicatorProps> = ({ color }) => {
    const indicatorRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (indicatorRef.current) {
            indicatorRef.current.style.setProperty('--indicator-color', color);
        }
    }, [color]);

    return (
        <div
            className={`segment-color-indicator ${styles.colorIndicator}`}
            data-color={color}
        />
    );
};