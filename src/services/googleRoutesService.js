import { GOOGLE_MAPS_API_KEY } from '../config/googleMaps';

class GoogleRoutesService {
  constructor() {
    this.apiKey = GOOGLE_MAPS_API_KEY;
    this.baseURL = 'https://routes.googleapis.com/directions/v2:computeRoutes';
    this.cache = new Map();
    this.cacheTTL = 5 * 60 * 1000; // 5 minutes
  }

  /**
   * Get cache key for route request
   */
  getCacheKey(origin, destination) {
    return `${origin.latitude},${origin.longitude}-${destination.latitude},${destination.longitude}`;
  }

  /**
   * Check if cached route is still valid
   */
  getCachedRoute(cacheKey) {
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
      return cached.data;
    }
    this.cache.delete(cacheKey);
    return null;
  }

  /**
   * Cache route data
   */
  setCachedRoute(cacheKey, data) {
    this.cache.set(cacheKey, {
      data,
      timestamp: Date.now()
    });
  }

  /**
   * Calculate route with ETA using Google Routes API
   */
  async calculateRoute(origin, destination, options = {}) {
    try {
      const cacheKey = this.getCacheKey(origin, destination);
      const cachedRoute = this.getCachedRoute(cacheKey);
      
      if (cachedRoute) {
        console.log('🚗 Using cached route data');
        return cachedRoute;
      }

      const requestBody = {
        origin: {
          location: {
            latLng: {
              latitude: origin.latitude,
              longitude: origin.longitude
            }
          }
        },
        destination: {
          location: {
            latLng: {
              latitude: destination.latitude,
              longitude: destination.longitude
            }
          }
        },
        travelMode: options.travelMode || 'DRIVE',
        routingPreference: options.routingPreference || 'TRAFFIC_AWARE',
        computeAlternativeRoutes: false,
        routeModifiers: {
          avoidTolls: options.avoidTolls || false,
          avoidHighways: options.avoidHighways || false,
          avoidFerries: options.avoidFerries || false
        },
        languageCode: 'en-US',
        units: 'METRIC'
      };

      console.log('🚗 Calculating route with Google Routes API...');
      
      const response = await fetch(this.baseURL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': this.apiKey,
          'X-Goog-FieldMask': 'routes.duration,routes.distanceMeters,routes.polyline.encodedPolyline,routes.legs.steps.navigationInstruction,routes.travelAdvisory.tollInfo,routes.routeLabels'
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Google Routes API error:', response.status, errorText);
        throw new Error(`Google Routes API error: ${response.status}`);
      }

      const data = await response.json();
      console.log('✅ Google Routes API response received');

      if (!data.routes || data.routes.length === 0) {
        throw new Error('No routes found');
      }

      const route = data.routes[0];
      const result = this.parseRouteResponse(route);
      
      // Cache the result
      this.setCachedRoute(cacheKey, result);
      
      return result;
    } catch (error) {
      console.error('❌ Error calculating route:', error);
      
      // Fallback to distance estimation
      return this.getFallbackRoute(origin, destination);
    }
  }

  /**
   * Parse Google Routes API response
   */
  parseRouteResponse(route) {
    const duration = route.duration ? parseInt(route.duration.replace('s', '')) : 0;
    const durationMinutes = Math.ceil(duration / 60);
    const distanceMeters = route.distanceMeters || 0;
    const distanceKm = (distanceMeters / 1000).toFixed(1);

    return {
      duration: duration, // seconds
      durationMinutes: durationMinutes,
      durationText: this.formatDuration(durationMinutes),
      distance: distanceMeters, // meters
      distanceText: `${distanceKm} km`,
      encodedPolyline: route.polyline?.encodedPolyline || null,
      bounds: this.calculateBounds(route),
      steps: this.parseSteps(route.legs?.[0]?.steps || []),
      tollInfo: route.travelAdvisory?.tollInfo,
      warnings: route.warnings || []
    };
  }

  /**
   * Calculate bounds from route polyline
   */
  calculateBounds(route) {
    // This would require decoding the polyline
    // For now, return null - can be implemented if needed
    return null;
  }

  /**
   * Parse navigation steps
   */
  parseSteps(steps) {
    return steps.map(step => ({
      instruction: step.navigationInstruction?.instructions || '',
      distance: step.distanceMeters || 0,
      duration: step.staticDuration ? parseInt(step.staticDuration.replace('s', '')) : 0
    }));
  }

  /**
   * Format duration in human readable format
   */
  formatDuration(minutes) {
    if (minutes < 60) {
      return `${minutes} min`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}h ${remainingMinutes}m`;
  }

  /**
   * Fallback route calculation using Haversine formula
   */
  getFallbackRoute(origin, destination) {
    console.log('🔄 Using fallback route calculation');
    
    const distance = this.calculateHaversineDistance(origin, destination);
    const averageSpeedKmh = 30; // Average city driving speed
    const durationMinutes = Math.ceil((distance / averageSpeedKmh) * 60);

    return {
      duration: durationMinutes * 60,
      durationMinutes: durationMinutes,
      durationText: this.formatDuration(durationMinutes),
      distance: distance * 1000, // convert to meters
      distanceText: `${distance.toFixed(1)} km`,
      encodedPolyline: null,
      bounds: null,
      steps: [],
      tollInfo: null,
      warnings: ['Using estimated route - Google Routes API unavailable'],
      isFallback: true
    };
  }

  /**
   * Calculate distance using Haversine formula
   */
  calculateHaversineDistance(origin, destination) {
    const R = 6371; // Earth's radius in kilometers
    const dLat = this.toRadians(destination.latitude - origin.latitude);
    const dLon = this.toRadians(destination.longitude - origin.longitude);
    
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(this.toRadians(origin.latitude)) * Math.cos(this.toRadians(destination.latitude)) *
      Math.sin(dLon/2) * Math.sin(dLon/2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c;
    
    return distance;
  }

  /**
   * Convert degrees to radians
   */
  toRadians(degrees) {
    return degrees * (Math.PI / 180);
  }

  /**
   * Decode polyline string to coordinates array
   */
  decodePolyline(encoded) {
    const poly = [];
    let index = 0;
    const len = encoded.length;
    let lat = 0;
    let lng = 0;

    while (index < len) {
      let b, shift = 0, result = 0;
      do {
        b = encoded.charCodeAt(index++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);
      const dlat = ((result & 1) != 0 ? ~(result >> 1) : (result >> 1));
      lat += dlat;

      shift = 0;
      result = 0;
      do {
        b = encoded.charCodeAt(index++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);
      const dlng = ((result & 1) != 0 ? ~(result >> 1) : (result >> 1));
      lng += dlng;

      poly.push({
        latitude: lat / 1E5,
        longitude: lng / 1E5
      });
    }

    return poly;
  }

  /**
   * Get ETA with traffic consideration
   */
  async getETAWithTraffic(origin, destination) {
    try {
      const route = await this.calculateRoute(origin, destination, {
        routingPreference: 'TRAFFIC_AWARE'
      });

      const now = new Date();
      const arrivalTime = new Date(now.getTime() + (route.duration * 1000));
      
      // Determine status based on traffic conditions
      let status = 'on_time';
      if (route.warnings && route.warnings.length > 0) {
        status = 'delayed';
      }
      
      return {
        estimatedMinutes: route.durationMinutes,
        distance: route.distanceText,
        status: status,
        arrivalTime: arrivalTime.toISOString(),
        route: route,
        lastUpdated: new Date().toISOString()
      };
    } catch (error) {
      console.error('❌ Error getting ETA:', error);
      
      // Return fallback ETA
      return {
        estimatedMinutes: 15,
        distance: '2.1 km',
        status: 'estimated',
        arrivalTime: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
        route: null,
        lastUpdated: new Date().toISOString(),
        error: error.message
      };
    }
  }

  /**
   * Clear cache
   */
  clearCache() {
    this.cache.clear();
  }

  /**
   * Get cache stats
   */
  getCacheStats() {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    };
  }
}

// Export singleton instance
const googleRoutesService = new GoogleRoutesService();
export default googleRoutesService;