import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import StarRating from './StarRating';

const RatingDisplay = ({
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
  onRatingPress,
  loading = false,
  style
}) => {
  const [expandedAspects, setExpandedAspects] = useState(false);
  const [expandedRating, setExpandedRating] = useState(null);

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getMomentumColor = (momentum) => {
    switch (momentum) {
      case 'improving': return '#10B981';
      case 'declining': return '#EF4444';
      default: return '#6B7280';
    }
  };

  const getTrendIcon = (trend) => {
    if (trend > 0) return '↗';
    if (trend < 0) return '↘';
    return '→';
  };

  const renderRatingDistribution = () => {
    if (!summary?.overallStats.ratingCounts) return null;

    const { ratingCounts, totalRatings } = summary.overallStats;
    
    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Rating Distribution</Text>
        {[5, 4, 3, 2, 1].map(rating => {
          const count = ratingCounts[rating.toString()] || 0;
          const percentage = totalRatings > 0 ? (count / totalRatings) * 100 : 0;
          
          return (
            <View key={rating} style={styles.distributionRow}>
              <Text style={styles.distributionStar}>{rating}★</Text>
              <View style={styles.distributionBarContainer}>
                <View style={styles.distributionBarBackground}>
                  <View
                    style={[
                      styles.distributionBarFill,
                      { width: `${percentage}%` }
                    ]}
                  />
                </View>
              </View>
              <Text style={styles.distributionCount}>{count}</Text>
            </View>
          );
        })}
      </View>
    );
  };

  const renderAspectRatings = () => {
    if (!summary?.aspectStats || !showAspects) return null;

    const aspects = Object.entries(summary.aspectStats)
      .filter(([_, data]) => data.count >= 3)
      .sort(([_, a], [__, b]) => b.average - a.average)
      .slice(0, expandedAspects ? undefined : 5);

    if (aspects.length === 0) return null;

    return (
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Aspect Ratings</Text>
          {Object.keys(summary.aspectStats).length > 5 && (
            <TouchableOpacity
              onPress={() => setExpandedAspects(!expandedAspects)}
              style={styles.expandButton}
            >
              <Text style={styles.expandButtonText}>
                {expandedAspects ? 'Show Less' : 'Show More'}
              </Text>
              <Ionicons
                name={expandedAspects ? 'chevron-up' : 'chevron-down'}
                size={16}
                color="#2563EB"
              />
            </TouchableOpacity>
          )}
        </View>
        <View style={styles.aspectsList}>
          {aspects.map(([aspect, data]) => (
            <View key={aspect} style={styles.aspectItem}>
              <Text style={styles.aspectLabel}>
                {aspect.replace(/([A-Z])/g, ' $1').trim()}
              </Text>
              <View style={styles.aspectRating}>
                <StarRating
                  value={data.average}
                  readOnly
                  size={16}
                  showValue
                />
                <Text style={styles.aspectCount}>({data.count})</Text>
              </View>
            </View>
          ))}
        </View>
      </View>
    );
  };

  const renderTrendMetrics = () => {
    if (!summary?.trendingMetrics || !showTrends) return null;

    const { weeklyTrend, monthlyTrend, momentum } = summary.trendingMetrics;

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Trends</Text>
        <View style={styles.trendsGrid}>
          <View style={styles.trendItem}>
            <Text style={styles.trendLabel}>Weekly:</Text>
            <Text style={[
              styles.trendValue,
              { color: getTrendIcon(weeklyTrend) === '↗' ? '#10B981' : getTrendIcon(weeklyTrend) === '↘' ? '#EF4444' : '#6B7280' }
            ]}>
              {getTrendIcon(weeklyTrend)} {Math.abs(weeklyTrend).toFixed(1)}%
            </Text>
          </View>
          <View style={styles.trendItem}>
            <Text style={styles.trendLabel}>Monthly:</Text>
            <Text style={[
              styles.trendValue,
              { color: getTrendIcon(monthlyTrend) === '↗' ? '#10B981' : getTrendIcon(monthlyTrend) === '↘' ? '#EF4444' : '#6B7280' }
            ]}>
              {getTrendIcon(monthlyTrend)} {Math.abs(monthlyTrend).toFixed(1)}%
            </Text>
          </View>
          <View style={[styles.trendItem, styles.trendItemFull]}>
            <Text style={styles.trendLabel}>Momentum:</Text>
            <Text style={[
              styles.trendValue,
              { color: getMomentumColor(momentum), textTransform: 'capitalize' }
            ]}>
              {momentum}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  const renderRatingItem = (rating) => {
    const isExpanded = expandedRating === rating._id;
    const hasComment = rating.comment && rating.comment.trim().length > 0;
    const hasAspects = rating.aspectRatings && Object.keys(rating.aspectRatings).length > 0;

    return (
      <TouchableOpacity
        key={rating._id}
        style={styles.ratingCard}
        onPress={() => onRatingPress?.(rating)}
        activeOpacity={0.7}
      >
        {/* Header */}
        <View style={styles.ratingHeader}>
          <View style={styles.ratingInfo}>
            <StarRating value={rating.overallRating} readOnly size={16} />
            <View style={styles.ratingMeta}>
              <Text style={styles.raterName}>{rating.ratedBy.name}</Text>
              <View style={styles.ratingDetails}>
                <Text style={styles.ratingDate}>{formatDate(rating.createdAt)}</Text>
                {rating.isVerifiedExperience && (
                  <View style={styles.verifiedBadge}>
                    <Text style={styles.verifiedText}>Verified</Text>
                  </View>
                )}
              </View>
            </View>
          </View>
          
          {/* Helpful votes */}
          {(rating.helpfulVotes.positive > 0 || rating.helpfulVotes.negative > 0) && (
            <Text style={styles.helpfulVotes}>
              {rating.helpfulVotes.positive} helpful
            </Text>
          )}
        </View>

        {/* Comment */}
        {hasComment && (
          <View style={styles.commentContainer}>
            <Text style={styles.commentText}>{rating.comment}</Text>
          </View>
        )}

        {/* Tags */}
        {rating.tags && rating.tags.length > 0 && (
          <View style={styles.tagsContainer}>
            {rating.tags.map(tag => (
              <View key={tag} style={styles.tag}>
                <Text style={styles.tagText}>{tag}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Aspect Ratings (expandable) */}
        {hasAspects && (
          <View style={styles.aspectsContainer}>
            <TouchableOpacity
              onPress={() => setExpandedRating(isExpanded ? null : rating._id)}
              style={styles.expandAspectsButton}
            >
              <Text style={styles.expandAspectsText}>View Details</Text>
              <Ionicons
                name={isExpanded ? 'chevron-up' : 'chevron-down'}
                size={16}
                color="#2563EB"
              />
            </TouchableOpacity>

            {isExpanded && (
              <View style={styles.expandedAspects}>
                {Object.entries(rating.aspectRatings).map(([aspect, value]) => (
                  <View key={aspect} style={styles.expandedAspectItem}>
                    <Text style={styles.expandedAspectLabel}>
                      {aspect.replace(/([A-Z])/g, ' $1').trim()}
                    </Text>
                    <StarRating value={value} readOnly size={14} />
                  </View>
                ))}
              </View>
            )}
          </View>
        )}

        {/* Response */}
        {rating.response && (
          <View style={styles.responseContainer}>
            <Text style={styles.responseHeader}>
              Response • {formatDate(rating.response.respondedAt)}
            </Text>
            <Text style={styles.responseText}>{rating.response.text}</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={[styles.container, style]}>
        <ActivityIndicator size="large" color="#2563EB" />
        <Text style={styles.loadingText}>Loading ratings...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={[styles.container, style]} showsVerticalScrollIndicator={false}>
      {/* Summary Section */}
      {showSummary && summary && (
        <View style={styles.summaryCard}>
          {/* Overall Stats */}
          <View style={styles.overallStats}>
            <Text style={styles.overallTitle}>Overall Rating</Text>
            <View style={styles.overallRating}>
              <StarRating
                value={summary.overallStats.averageRating}
                readOnly
                size={24}
                showValue
              />
            </View>
            <Text style={styles.totalRatings}>
              Based on {summary.overallStats.totalRatings} rating{summary.overallStats.totalRatings !== 1 ? 's' : ''}
            </Text>
            {summary.overallStats.recent30Days.totalRatings > 0 && (
              <Text style={styles.recentRatings}>
                {summary.overallStats.recent30Days.totalRatings} in the last 30 days
              </Text>
            )}
          </View>

          {/* Rating Distribution */}
          {renderRatingDistribution()}

          {/* Aspect Ratings */}
          {renderAspectRatings()}

          {/* Trends */}
          {showTrends && renderTrendMetrics()}
        </View>
      )}

      {/* Individual Ratings */}
      {showRatings && ratings.length > 0 && (
        <View style={styles.ratingsSection}>
          <Text style={styles.ratingsSectionTitle}>Recent Reviews</Text>
          {ratings.slice(0, limit).map(renderRatingItem)}

          {/* Load More */}
          {onLoadMore && ratings.length >= (limit || 10) && (
            <TouchableOpacity onPress={onLoadMore} style={styles.loadMoreButton}>
              <Text style={styles.loadMoreText}>Load More Reviews</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Empty State */}
      {showRatings && ratings.length === 0 && !loading && (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateTitle}>No reviews yet</Text>
          <Text style={styles.emptyStateSubtitle}>
            Be the first to share your experience!
          </Text>
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingText: {
    textAlign: 'center',
    marginTop: 16,
    fontSize: 16,
    color: '#6B7280',
  },
  summaryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  overallStats: {
    alignItems: 'center',
    marginBottom: 24,
  },
  overallTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  overallRating: {
    marginBottom: 8,
  },
  totalRatings: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 4,
  },
  recentRatings: {
    fontSize: 14,
    color: '#6B7280',
  },
  section: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#374151',
  },
  expandButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  expandButtonText: {
    fontSize: 14,
    color: '#2563EB',
  },
  distributionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  distributionStar: {
    width: 32,
    fontSize: 14,
    color: '#374151',
  },
  distributionBarContainer: {
    flex: 1,
    marginHorizontal: 8,
  },
  distributionBarBackground: {
    height: 8,
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
  },
  distributionBarFill: {
    height: 8,
    backgroundColor: '#FBBF24',
    borderRadius: 4,
  },
  distributionCount: {
    width: 32,
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'right',
  },
  aspectsList: {
    gap: 8,
  },
  aspectItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  aspectLabel: {
    fontSize: 14,
    color: '#374151',
    textTransform: 'capitalize',
  },
  aspectRating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  aspectCount: {
    fontSize: 12,
    color: '#6B7280',
  },
  trendsGrid: {
    gap: 8,
  },
  trendItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  trendItemFull: {
    marginTop: 4,
  },
  trendLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  trendValue: {
    fontSize: 14,
    fontWeight: '500',
  },
  ratingsSection: {
    gap: 16,
  },
  ratingsSectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  ratingCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  ratingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  ratingInfo: {
    flex: 1,
    gap: 8,
  },
  ratingMeta: {
    gap: 4,
  },
  raterName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#111827',
  },
  ratingDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  ratingDate: {
    fontSize: 12,
    color: '#6B7280',
  },
  verifiedBadge: {
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  verifiedText: {
    fontSize: 10,
    color: '#065F46',
    fontWeight: '500',
  },
  helpfulVotes: {
    fontSize: 12,
    color: '#6B7280',
  },
  commentContainer: {
    marginBottom: 12,
  },
  commentText: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 12,
  },
  tag: {
    backgroundColor: '#DBEAFE',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  tagText: {
    fontSize: 12,
    color: '#1D4ED8',
    fontWeight: '500',
  },
  aspectsContainer: {
    marginBottom: 12,
  },
  expandAspectsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  expandAspectsText: {
    fontSize: 14,
    color: '#2563EB',
  },
  expandedAspects: {
    marginTop: 12,
    paddingLeft: 16,
    borderLeftWidth: 2,
    borderLeftColor: '#E5E7EB',
    gap: 8,
  },
  expandedAspectItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  expandedAspectLabel: {
    fontSize: 14,
    color: '#6B7280',
    textTransform: 'capitalize',
  },
  responseContainer: {
    backgroundColor: '#F9FAFB',
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
  },
  responseHeader: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4,
  },
  responseText: {
    fontSize: 14,
    color: '#374151',
  },
  loadMoreButton: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    marginTop: 16,
  },
  loadMoreText: {
    fontSize: 14,
    color: '#2563EB',
    fontWeight: '500',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyStateTitle: {
    fontSize: 16,
    color: '#6B7280',
    marginBottom: 8,
  },
  emptyStateSubtitle: {
    fontSize: 14,
    color: '#9CA3AF',
  },
});

export default RatingDisplay;