import React, { useState, useCallback } from 'react';

interface StarRatingProps {
  value?: number;
  onChange?: (rating: number) => void;
  onHover?: (rating: number | null) => void;
  size?: 'small' | 'medium' | 'large';
  color?: string;
  hoverColor?: string;
  disabled?: boolean;
  allowHalf?: boolean;
  readOnly?: boolean;
  showValue?: boolean;
  className?: string;
  starClassName?: string;
  emptyStarClassName?: string;
  filledStarClassName?: string;
  halfStarClassName?: string;
}

const StarRating: React.FC<StarRatingProps> = ({
  value = 0,
  onChange,
  onHover,
  size = 'medium',
  color = '#fbbf24',
  hoverColor = '#f59e0b',
  disabled = false,
  allowHalf = true,
  readOnly = false,
  showValue = false,
  className = '',
  starClassName = '',
  emptyStarClassName = '',
  filledStarClassName = '',
  halfStarClassName = ''
}) => {
  const [hoverValue, setHoverValue] = useState<number | null>(null);
  const [isHovering, setIsHovering] = useState(false);

  const sizeClasses = {
    small: 'w-4 h-4',
    medium: 'w-6 h-6',
    large: 'w-8 h-8'
  };

  const handleMouseEnter = useCallback((starIndex: number, isHalf: boolean = false) => {
    if (disabled || readOnly) return;

    const rating = isHalf ? starIndex + 0.5 : starIndex + 1;
    setHoverValue(rating);
    setIsHovering(true);
    onHover?.(rating);
  }, [disabled, readOnly, onHover]);

  const handleMouseLeave = useCallback(() => {
    if (disabled || readOnly) return;

    setHoverValue(null);
    setIsHovering(false);
    onHover?.(null);
  }, [disabled, readOnly, onHover]);

  const handleClick = useCallback((starIndex: number, isHalf: boolean = false) => {
    if (disabled || readOnly) return;

    const rating = isHalf ? starIndex + 0.5 : starIndex + 1;
    onChange?.(rating);
  }, [disabled, readOnly, onChange]);

  const displayValue = hoverValue !== null ? hoverValue : value;
  const currentColor = isHovering ? hoverColor : color;

  const renderStar = (index: number) => {
    const starValue = index + 1;
    const halfStarValue = index + 0.5;

    const isFullyFilled = displayValue >= starValue;
    const isHalfFilled = allowHalf && displayValue >= halfStarValue && displayValue < starValue;

    const baseClasses = `
      ${sizeClasses[size]}
      transition-colors duration-150
      ${disabled ? 'cursor-not-allowed opacity-50' : readOnly ? 'cursor-default' : 'cursor-pointer'}
      ${starClassName}
    `.trim();

    const starStyle = {
      color: isFullyFilled || isHalfFilled ? currentColor : '#d1d5db'
    };

    if (isHalfFilled && allowHalf) {
      return (
        <div key={index} className="relative inline-block">
          {/* Empty star background */}
          <svg
            className={`${baseClasses} absolute inset-0 ${emptyStarClassName}`}
            fill="#d1d5db"
            viewBox="0 0 24 24"
            onMouseEnter={() => handleMouseEnter(index, false)}
            onMouseLeave={handleMouseLeave}
            onClick={() => handleClick(index, false)}
          >
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
          </svg>

          {/* Half-filled star */}
          <svg
            className={`${baseClasses} ${halfStarClassName}`}
            fill="url(#half-fill-gradient)"
            viewBox="0 0 24 24"
            onMouseEnter={() => handleMouseEnter(index, true)}
            onMouseLeave={handleMouseLeave}
            onClick={() => handleClick(index, true)}
          >
            <defs>
              <linearGradient id="half-fill-gradient">
                <stop offset="50%" style={{ stopColor: currentColor }} />
                <stop offset="50%" style={{ stopColor: '#d1d5db' }} />
              </linearGradient>
            </defs>
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
          </svg>
        </div>
      );
    }

    return (
      <svg
        key={index}
        className={`${baseClasses} ${isFullyFilled ? filledStarClassName : emptyStarClassName}`}
        fill={starStyle.color}
        viewBox="0 0 24 24"
        style={starStyle}
        onMouseEnter={() => handleMouseEnter(index, false)}
        onMouseLeave={handleMouseLeave}
        onClick={() => handleClick(index, false)}
      >
        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
      </svg>
    );
  };

  return (
    <div className={`flex items-center gap-1 ${className}`}>
      <div className="flex items-center">
        {Array.from({ length: 5 }, (_, index) => renderStar(index))}
      </div>

      {showValue && (
        <span className="ml-2 text-sm font-medium text-gray-700">
          {displayValue.toFixed(1)}
        </span>
      )}
    </div>
  );
};

export default StarRating;