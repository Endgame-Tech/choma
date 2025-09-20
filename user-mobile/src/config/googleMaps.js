// Google Maps API Configuration
import { APP_CONFIG } from '../utils/constants';

// Get API key from environment or constants
const GOOGLE_MAPS_API_KEY = APP_CONFIG.GOOGLE_MAPS_API_KEY || process.env.GOOGLE_MAPS_API_KEY;

// Base URLs for Google Maps APIs
const PLACES_BASE_URL = 'https://maps.googleapis.com/maps/api/place';
const GEOCODING_BASE_URL = 'https://maps.googleapis.com/maps/api/geocode';

/**
 * Build URL for Places Autocomplete API
 * @param {string} input - The text string on which to search
 * @param {string} sessionToken - A random string which identifies an autocomplete session
 * @param {object} options - Additional options like location, radius, types
 * @returns {string} Complete URL for the request
 */
export const buildAutocompleteUrl = (input, sessionToken, options = {}) => {
  if (!GOOGLE_MAPS_API_KEY) {
    console.warn('Google Maps API key is not configured');
    return null;
  }

  const params = new URLSearchParams({
    input: input,
    key: GOOGLE_MAPS_API_KEY,
    sessiontoken: sessionToken,
    components: 'country:ng', // Restrict to Nigeria
    types: 'address', // Focus on addresses
    ...options
  });

  return `${PLACES_BASE_URL}/autocomplete/json?${params}`;
};

/**
 * Build URL for Place Details API
 * @param {string} placeId - The place ID from autocomplete
 * @param {string} sessionToken - The same session token used in autocomplete
 * @param {array} fields - Array of fields to return
 * @returns {string} Complete URL for the request
 */
export const buildPlaceDetailsUrl = (placeId, sessionToken, fields = []) => {
  if (!GOOGLE_MAPS_API_KEY) {
    console.warn('Google Maps API key is not configured');
    return null;
  }

  const defaultFields = [
    'place_id',
    'formatted_address',
    'geometry',
    'address_components',
    'name'
  ];

  const params = new URLSearchParams({
    place_id: placeId,
    key: GOOGLE_MAPS_API_KEY,
    sessiontoken: sessionToken,
    fields: [...defaultFields, ...fields].join(',')
  });

  return `${PLACES_BASE_URL}/details/json?${params}`;
};

/**
 * Build URL for Geocoding API
 * @param {object} options - Geocoding options (address, latlng, etc.)
 * @returns {string} Complete URL for the request
 */
export const buildGeocodingUrl = (options = {}) => {
  if (!GOOGLE_MAPS_API_KEY) {
    console.warn('Google Maps API key is not configured');
    return null;
  }

  const params = new URLSearchParams({
    key: GOOGLE_MAPS_API_KEY,
    ...options
  });

  return `${GEOCODING_BASE_URL}/json?${params}`;
};

/**
 * Generate a session token for Places API requests
 * @returns {string} A random session token
 */
export const generateSessionToken = () => {
  return Math.random().toString(36).substring(2, 15) + 
         Math.random().toString(36).substring(2, 15);
};

export default {
  buildAutocompleteUrl,
  buildPlaceDetailsUrl,
  buildGeocodingUrl,
  generateSessionToken,
  GOOGLE_MAPS_API_KEY
};