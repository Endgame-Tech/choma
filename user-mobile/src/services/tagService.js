import { APP_CONFIG } from '../utils/constants';

const API_BASE_URL = APP_CONFIG.API_BASE_URL;

/**
 * Tag Service for mobile app
 * Handles fetching tags and tag-based meal plan filtering
 */
class TagService {
  /**
   * Get all active tags
   * @returns {Promise<Array>} Array of tag objects
   */
  async getAllTags(forceRefresh = false) {
    try {
      // Add cache-busting parameter if force refresh (like banners and meal plans do)
      const endpoint = forceRefresh
        ? `${API_BASE_URL}/tags?_t=${Date.now()}`
        : `${API_BASE_URL}/tags`;
      
      console.log('🌐 TagService fetching from:', endpoint);
      const response = await fetch(endpoint, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('📦 TagService API response:', data);
      return data.success ? data.data : [];
    } catch (error) {
      console.error('❌ Error fetching tags:', error);
      throw error;
    }
  }

  /**
   * Get meal plans by tag ID
   * @param {string} tagId - The tag ID to filter by
   * @param {number} page - Page number for pagination
   * @param {number} limit - Number of items per page
   * @returns {Promise<Object>} Object containing meal plans and pagination info
   */
  async getMealPlansByTag(tagId, page = 1, limit = 20) {
    try {
      const response = await fetch(
        `${API_BASE_URL}/tags/${tagId}/mealplans?page=${page}&limit=${limit}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data.success ? data : { data: [], pagination: null, tag: null };
    } catch (error) {
      console.error('❌ Error fetching meal plans by tag:', error);
      throw error;
    }
  }

  /**
   * Get tag by ID
   * @param {string} tagId - The tag ID
   * @returns {Promise<Object|null>} Tag object or null
   */
  async getTagById(tagId) {
    try {
      const response = await fetch(`${API_BASE_URL}/tags/${tagId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data.success ? data.data : null;
    } catch (error) {
      console.error('❌ Error fetching tag by ID:', error);
      throw error;
    }
  }
}

export default new TagService();