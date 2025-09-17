import React, { useState, useEffect, memo } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Dimensions,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import tagService from '../../services/tagService';
import { useTheme } from '../../styles/theme';
import FilterModal from '../meal-plans/FilterModal';

const { width: screenWidth } = Dimensions.get('window');

// Cache tags globally to avoid re-fetching on every render
let cachedTags = [];
let tagsLastFetched = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Export function to refresh tags cache (call when new tags are created)
export const refreshTagsCache = () => {
  cachedTags = [];
  tagsLastFetched = 0;
};

const TagFilterBar = memo(({ onTagSelect, selectedTagId = null, onApplyFilters }) => {
  console.log('🏷️ TagFilterBar component mounted/rendered');
  const { colors } = useTheme();
  const [tags, setTags] = useState(cachedTags);
  const [loading, setLoading] = useState(cachedTags.length === 0);
  const [animating, setAnimating] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [appliedFilters, setAppliedFilters] = useState({});

  useEffect(() => {
    fetchTags();
  }, []);

  const fetchTags = async () => {
    console.log('🔄 TagFilterBar fetchTags called');
    try {
      // Use cached tags if they're fresh
      const now = Date.now();
      if (cachedTags.length > 0 && (now - tagsLastFetched) < CACHE_DURATION) {
        console.log('📦 Using cached tags:', cachedTags);
        setTags(cachedTags);
        setLoading(false);
        return;
      }

      console.log('🌐 Fetching fresh tags from API...');
      setLoading(true);
      const tagsData = await tagService.getAllTags(true); // Force refresh like banners
      
      // Update cache
      cachedTags = tagsData;
      tagsLastFetched = now;
      
      setTags(tagsData);
      console.log(`✅ Loaded ${tagsData.length} tags for filtering`);
      
      // Prefetch tag images for better performance
      tagsData.forEach(tag => {
        if (tag.image) {
          Image.prefetch(tag.image).catch(() => {
            // Silently ignore prefetch errors
          });
        }
      });
    } catch (error) {
      console.error('❌ Error fetching tags:', error);
      // Keep using cached tags on error
      setTags(cachedTags);
    } finally {
      setLoading(false);
    }
  };

  const handleTagPress = (tag) => {
    if (animating) return; // Prevent multiple rapid taps during animation
    
    setAnimating(true);
    const newTagId = selectedTagId === tag._id ? null : tag._id;
    
    // Add a small delay to allow visual feedback before triggering the change
    setTimeout(() => {
      onTagSelect(newTagId, tag);
      setAnimating(false);
    }, 150);
  };

  const handleFilterPress = () => {
    setShowFilterModal(true);
  };

  const handleApplyFilters = (filters) => {
    setAppliedFilters(filters);
    if (onApplyFilters) {
      onApplyFilters(filters);
    }
  };

  const hasActiveFilters = () => {
    return Object.keys(appliedFilters).length > 0 && (
      appliedFilters.audiences?.length > 0 ||
      appliedFilters.priceRange?.[0] > 0 ||
      appliedFilters.priceRange?.[1] < 50000 ||
      appliedFilters.sortBy !== 'popularity' ||
      appliedFilters.duration
    );
  };

  console.log('🏷️ TagFilterBar render state:', { loading, tagsLength: tags.length, tags });
  
  // Show loading skeleton while fetching tags
  if (loading && tags.length === 0) {
    return (
      <View style={styles(colors).container}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles(colors).scrollContainer}
        >
          {/* Loading skeleton for tags */}
          {[1, 2, 3, 4].map((index) => (
            <View key={index} style={[styles(colors).tagItem, styles(colors).skeletonTag]}>
              <View style={[styles(colors).tagImageContainer, styles(colors).skeletonImage]} />
              <View style={[styles(colors).skeletonText]} />
            </View>
          ))}
        </ScrollView>
      </View>
    );
  }

  // Don't show anything if no tags available after loading
  if (!loading && tags.length === 0) {
    return null;
  }

  return (
    <View style={styles(colors).container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles(colors).scrollContainer}
      >
        {/* All / Clear Filter Button */}
        <TouchableOpacity
          style={[
            styles(colors).tagItem,
            !selectedTagId && styles(colors).selectedTagItem,
          ]}
          onPress={() => {
            if (animating) return;
            setAnimating(true);
            setTimeout(() => {
              onTagSelect(null, null);
              setAnimating(false);
            }, 150);
          }}
        >
          <View style={[
            styles(colors).tagImageContainer,
            !selectedTagId && styles(colors).selectedTagImageContainer,
          ]}>
            <Text style={[
              styles(colors).allIcon,
              !selectedTagId && styles(colors).selectedAllIcon,
            ]}>
              🍽️
            </Text>
          </View>
          <Text style={[
            styles(colors).tagName,
            !selectedTagId && styles(colors).selectedTagName,
          ]}>
            All
          </Text>
        </TouchableOpacity>

        {/* Filter Button */}
        <TouchableOpacity
          style={[
            styles(colors).filterButton,
            hasActiveFilters() && styles(colors).filterButtonActive,
          ]}
          onPress={handleFilterPress}
        >
          <View style={[
            styles(colors).filterIconContainer,
            hasActiveFilters() && styles(colors).filterIconContainerActive,
          ]}>
            <Ionicons
              name="options"
              size={18}
              color={hasActiveFilters() ? colors.surface : colors.text}
            />
            {hasActiveFilters() && (
              <View style={styles(colors).filterBadge}>
                <View style={styles(colors).filterBadgeDot} />
              </View>
            )}
          </View>
          <Text style={[
            styles(colors).filterText,
            hasActiveFilters() && styles(colors).filterTextActive,
          ]}>
            Filter
          </Text>
        </TouchableOpacity>

        {/* Tag Items */}
        {tags.map((tag) => (
          <TouchableOpacity
            key={tag._id}
            style={[
              styles(colors).tagItem,
              selectedTagId === tag._id && styles(colors).selectedTagItem,
            ]}
            onPress={() => handleTagPress(tag)}
          >
            <View style={[
              styles(colors).tagImageContainer,
              selectedTagId === tag._id && styles(colors).selectedTagImageContainer,
            ]}>
              <Image
                source={{ 
                  uri: tag.image,
                  cache: 'default'
                }}
                style={styles(colors).tagImage}
                resizeMode="cover"
                onError={(error) => {
                  console.log(`Failed to load tag image for ${tag.name}:`, error.nativeEvent.error);
                }}
              />
            </View>
            <Text style={[
              styles(colors).tagName,
              selectedTagId === tag._id && styles(colors).selectedTagName,
            ]}>
              {tag.name}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
      
      {/* Filter Modal */}
      <FilterModal
        visible={showFilterModal}
        onClose={() => setShowFilterModal(false)}
        onApplyFilters={handleApplyFilters}
        initialFilters={appliedFilters}
      />
    </View>
  );
});

const styles = (colors) =>
  StyleSheet.create({
    container: {
      marginVertical: 15,
    },
    scrollContainer: {
      paddingHorizontal: 20,
      paddingVertical: 5,
    },
    tagItem: {
      alignItems: 'center',
      marginRight: 15,
      paddingVertical: 8,
      paddingHorizontal: 12,
      borderRadius: 20,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      minWidth: 70,
    },
    selectedTagItem: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.3,
      shadowRadius: 4,
      elevation: 4,
    },
    tagImageContainer: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.background,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 6,
      overflow: 'hidden',
    },
    selectedTagImageContainer: {
      backgroundColor: 'rgba(255, 255, 255, 0.2)',
    },
    tagImage: {
      width: 36,
      height: 36,
      borderRadius: 18,
    },
    allIcon: {
      fontSize: 20,
    },
    selectedAllIcon: {
      fontSize: 20,
    },
    tagName: {
      fontSize: 12,
      fontWeight: '500',
      color: colors.text,
      textAlign: 'center',
    },
    selectedTagName: {
      color: colors.surface,
      fontWeight: '600',
    },
    skeletonTag: {
      backgroundColor: colors.surface,
      borderColor: colors.border,
    },
    skeletonImage: {
      backgroundColor: colors.border,
    },
    skeletonText: {
      height: 12,
      width: 40,
      backgroundColor: colors.border,
      borderRadius: 6,
    },
    filterButton: {
      alignItems: 'center',
      marginRight: 15,
      paddingVertical: 8,
      paddingHorizontal: 12,
      borderRadius: 20,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      minWidth: 70,
    },
    filterButtonActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.3,
      shadowRadius: 4,
      elevation: 4,
    },
    filterIconContainer: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.background,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 6,
      position: 'relative',
    },
    filterIconContainerActive: {
      backgroundColor: 'rgba(255, 255, 255, 0.2)',
    },
    filterBadge: {
      position: 'absolute',
      top: 4,
      right: 4,
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: colors.surface,
      justifyContent: 'center',
      alignItems: 'center',
    },
    filterBadgeDot: {
      width: 4,
      height: 4,
      borderRadius: 2,
      backgroundColor: colors.primary,
    },
    filterText: {
      fontSize: 12,
      fontWeight: '500',
      color: colors.text,
      textAlign: 'center',
    },
    filterTextActive: {
      color: colors.surface,
      fontWeight: '600',
    },
  });

export default TagFilterBar;