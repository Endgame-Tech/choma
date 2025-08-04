import React from 'react';
import styles from './ColorIndicator.module.css';

interface ColorIndicatorProps {
    color: string;
}

export const ColorIndicator: React.FC<ColorIndicatorProps> = ({ color }) => {
    return (
        <div
            className={`segment-color-indicator ${styles.colorIndicator}`}
            style={{'--indicator-color': color} as React.CSSProperties}
        />
    );
};
