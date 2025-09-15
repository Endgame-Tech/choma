import React, { useState } from 'react';
import { ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/24/outline';
import StarRating from './StarRating';

interface RatingSummary {
  overallStats: {
    totalRatings: number;
    averageRating: number;
    ratingCounts: {
      '5': number;
      '4': number;
      '3': number;
      '2': number;
      '1': number;
    };
    recent30Days: {
      totalRatings: number;
      averageRating: number;
    };
  };
  aspectStats: {
    [key: string]: {
      average: number;
      count: number;
    };
  };
  trendingMetrics: {
    weeklyTrend: number;
    monthlyTrend: number;
    momentum: 'improving' | 'stable' | 'declining';
  };
  qualityMetrics: {
    ratingsWithComments: number;
    helpfulnessScore: number;
  };
}

interface Rating {
  _id: string;
  overallRating: number;
  aspectRatings?: { [key: string]: number };
  comment?: string;
  tags?: string[];
  createdAt: string;
  ratedBy: {
    name: string;
    email: string;
  };
  isVerifiedExperience: boolean;
  helpfulVotes: {
    positive: number;
    negative: number;
  };
  response?: {
    text: string;
    respondedAt: string;
    respondedBy: {
      name: string;
      email?: string;
    };
  };
}

interface RatingDisplayProps {
  entityId: string;
  entityType: string;
  summary?: RatingSummary;
  ratings?: Rating[];
  showSummary?: boolean;
  showRatings?: boolean;
  showAspects?: boolean;
  showTrends?: boolean;
  limit?: number;
  onLoadMore?: () => void;
  onRatingClick?: (rating: Rating) => void;
  loading?: boolean;
  className?: string;
}

const RatingDisplay: React.FC<RatingDisplayProps> = ({
  entityId,
  entityType,
  summary,
  ratings = [],
  showSummary = true,
  showRatings = true,
  showAspects = true,
  showTrends = false,
  limit,
  onLoadMore,
  onRatingClick,
  loading = false,
  className = ''
}) => {
  const [expandedAspects, setExpandedAspects] = useState(false);
  const [expandedRating, setExpandedRating] = useState<string | null>(null);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getMomentumColor = (momentum: string) => {
    switch (momentum) {
      case 'improving': return 'text-green-600';
      case 'declining': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getTrendIcon = (trend: number) => {
    if (trend > 0) return '↗';
    if (trend < 0) return '↘';
    return '→';
  };

  const renderRatingDistribution = () => {
    if (!summary?.overallStats.ratingCounts) return null;

    const { ratingCounts, totalRatings } = summary.overallStats;
    
    return (
      <div className="space-y-2">
        <h4 className="text-sm font-medium text-gray-700">Rating Distribution</h4>
        {[5, 4, 3, 2, 1].map(rating => {
          const key = rating.toString() as '5' | '4' | '3' | '2' | '1';
          const count = ratingCounts[key] || 0;
          const percentage = totalRatings > 0 ? (count / totalRatings) * 100 : 0;
          
          return (
            <div key={rating} className="flex items-center gap-2 text-sm">
              <span className="w-8">{rating}★</span>
              <div className="flex-1 bg-gray-200 rounded-full h-2">
                <div
                  className="bg-yellow-400 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${percentage}%` }}
                />
              </div>
              <span className="w-12 text-gray-600">{count}</span>
            </div>
          );
        })}
      </div>
    );
  };

  const renderAspectRatings = () => {
    if (!summary?.aspectStats || !showAspects) return null;

    const aspects = Object.entries(summary.aspectStats)
      .filter(([, data]) => data.count >= 3) // Only show aspects with enough data
      .sort(([, a], [, b]) => b.average - a.average)
      .slice(0, expandedAspects ? undefined : 5);

    if (aspects.length === 0) return null;

    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-medium text-gray-700">Aspect Ratings</h4>
          {Object.keys(summary.aspectStats).length > 5 && (
            <button
              onClick={() => setExpandedAspects(!expandedAspects)}
              className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
            >
              {expandedAspects ? 'Show Less' : 'Show More'}
              {expandedAspects ? (
                <ChevronUpIcon className="w-4 h-4" />
              ) : (
                <ChevronDownIcon className="w-4 h-4" />
              )}
            </button>
          )}
        </div>
        <div className="space-y-2">
          {aspects.map(([aspect, data]) => (
            <div key={aspect} className="flex items-center justify-between">
              <span className="text-sm text-gray-700 capitalize">
                {aspect.replace(/([A-Z])/g, ' $1').trim()}
              </span>
              <div className="flex items-center gap-2">
                <StarRating
                  value={data.average}
                  readOnly
                  size="small"
                  showValue
                />
                <span className="text-xs text-gray-500">({data.count})</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderTrendMetrics = () => {
    if (!summary?.trendingMetrics || !showTrends) return null;

    const { weeklyTrend, monthlyTrend, momentum } = summary.trendingMetrics;

    return (
      <div className="space-y-2">
        <h4 className="text-sm font-medium text-gray-700">Trends</h4>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-600">Weekly: </span>
            <span className={getTrendIcon(weeklyTrend) === '↗' ? 'text-green-600' : getTrendIcon(weeklyTrend) === '↘' ? 'text-red-600' : 'text-gray-600'}>
              {getTrendIcon(weeklyTrend)} {Math.abs(weeklyTrend).toFixed(1)}%
            </span>
          </div>
          <div>
            <span className="text-gray-600">Monthly: </span>
            <span className={getTrendIcon(monthlyTrend) === '↗' ? 'text-green-600' : getTrendIcon(monthlyTrend) === '↘' ? 'text-red-600' : 'text-gray-600'}>
              {getTrendIcon(monthlyTrend)} {Math.abs(monthlyTrend).toFixed(1)}%
            </span>
          </div>
          <div className="col-span-2">
            <span className="text-gray-600">Momentum: </span>
            <span className={`capitalize ${getMomentumColor(momentum)}`}>
              {momentum}
            </span>
          </div>
        </div>
      </div>
    );
  };

  const renderRatingItem = (rating: Rating) => {
    const isExpanded = expandedRating === rating._id;
    const hasComment = rating.comment && rating.comment.trim().length > 0;
    const hasAspects = rating.aspectRatings && Object.keys(rating.aspectRatings).length > 0;

    return (
      <div
        key={rating._id}
        className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
        onClick={() => onRatingClick?.(rating)}
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center gap-3">
            <StarRating value={rating.overallRating} readOnly size="small" />
            <div className="text-sm">
              <div className="font-medium text-gray-900">{rating.ratedBy.name}</div>
              <div className="text-gray-500 flex items-center gap-2">
                {formatDate(rating.createdAt)}
                {rating.isVerifiedExperience && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                    Verified
                  </span>
                )}
              </div>
            </div>
          </div>
          
          {/* Helpful votes */}
          {(rating.helpfulVotes.positive > 0 || rating.helpfulVotes.negative > 0) && (
            <div className="text-xs text-gray-500">
              {rating.helpfulVotes.positive} helpful
            </div>
          )}
        </div>

        {/* Comment */}
        {hasComment && (
          <div className="mb-3">
            <p className="text-sm text-gray-700">{rating.comment}</p>
          </div>
        )}

        {/* Tags */}
        {rating.tags && rating.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {rating.tags.map(tag => (
              <span
                key={tag}
                className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Aspect Ratings (expandable) */}
        {hasAspects && (
          <div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setExpandedRating(isExpanded ? null : rating._id);
              }}
              className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
            >
              View Details
              {isExpanded ? (
                <ChevronUpIcon className="w-4 h-4" />
              ) : (
                <ChevronDownIcon className="w-4 h-4" />
              )}
            </button>

            {isExpanded && (
              <div className="mt-3 pl-4 border-l-2 border-gray-200 space-y-2">
                {Object.entries(rating.aspectRatings!).map(([aspect, value]) => (
                  <div key={aspect} className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 capitalize">
                      {aspect.replace(/([A-Z])/g, ' $1').trim()}
                    </span>
                    <StarRating value={value} readOnly size="small" />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Response */}
        {rating.response && (
          <div className="mt-3 p-3 bg-gray-50 rounded-md">
            <div className="text-xs text-gray-500 mb-1">
              Response • {formatDate(rating.response.respondedAt)}
            </div>
            <p className="text-sm text-gray-700">{rating.response.text}</p>
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className={`space-y-4 ${className}`}>
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-2"></div>
          <div className="h-8 bg-gray-200 rounded w-1/2 mb-4"></div>
          <div className="space-y-2">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-20 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div data-entity-id={entityId} data-entity-type={entityType} className={`space-y-6 ${className}`}>
      {/* Summary Section */}
      {showSummary && summary && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Overall Stats */}
            <div className="space-y-3">
              <h3 className="text-lg font-semibold text-gray-900">Overall Rating</h3>
              <div className="flex items-center gap-3">
                <StarRating
                  value={summary.overallStats.averageRating}
                  readOnly
                  size="large"
                  showValue
                />
              </div>
              <div className="text-sm text-gray-600">
                Based on {summary.overallStats.totalRatings} rating{summary.overallStats.totalRatings !== 1 ? 's' : ''}
              </div>
              {summary.overallStats.recent30Days.totalRatings > 0 && (
                <div className="text-sm text-gray-600">
                  {summary.overallStats.recent30Days.totalRatings} in the last 30 days
                </div>
              )}
            </div>

            {/* Rating Distribution */}
            <div>
              {renderRatingDistribution()}
            </div>

            {/* Aspect Ratings */}
            <div>
              {renderAspectRatings()}
            </div>
          </div>

          {/* Trends */}
          {showTrends && (
            <div className="mt-6 pt-6 border-t border-gray-200">
              {renderTrendMetrics()}
            </div>
          )}
        </div>
      )}

      {/* Individual Ratings */}
      {showRatings && ratings.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">
            Recent Reviews
          </h3>
          <div className="space-y-4">
            {ratings.slice(0, limit).map(renderRatingItem)}
          </div>

          {/* Load More */}
          {onLoadMore && ratings.length >= (limit || 10) && (
            <div className="text-center">
              <button
                onClick={onLoadMore}
                className="px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Load More Reviews
              </button>
            </div>
          )}
        </div>
      )}

      {/* Empty State */}
      {showRatings && ratings.length === 0 && !loading && (
        <div className="text-center py-8">
          <div className="text-gray-500 mb-2">No reviews yet</div>
          <div className="text-sm text-gray-400">
            Be the first to share your experience!
          </div>
        </div>
      )}
    </div>
  );
};

export default RatingDisplay;