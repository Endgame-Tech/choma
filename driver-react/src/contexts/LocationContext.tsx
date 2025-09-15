import React, { createContext, useContext, useState, useEffect } from 'react';
import { Location } from '../types';
import { useWebSocket } from '../hooks/useWebSocket';

interface LocationContextType {
  currentLocation: Location | null;
  locationError: string | null;
  isTracking: boolean;
  accuracy: number;
  lastUpdate: Date | null;
  startTracking: () => void;
  stopTracking: () => void;
  getCurrentLocation: () => Promise<Location | null>;
  watchPosition: boolean;
  setWatchPosition: (watch: boolean) => void;
}

const LocationContext = createContext<LocationContextType | undefined>(undefined);

export const useLocation = () => {
  const context = useContext(LocationContext);
  if (!context) {
    throw new Error('useLocation must be used within a LocationProvider');
  }
  return context;
};

interface LocationProviderProps {
  children: React.ReactNode;
}

export const LocationProvider: React.FC<LocationProviderProps> = ({ children }) => {
  const [currentLocation, setCurrentLocation] = useState<Location | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [isTracking, setIsTracking] = useState(false);
  const [accuracy, setAccuracy] = useState(0);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [watchPosition, setWatchPosition] = useState(false);
  const [watchId, setWatchId] = useState<number | null>(null);

  const { updateLocation, isConnected } = useWebSocket();

  // Position options for high-accuracy GPS (not IP geolocation)
  const positionOptions: PositionOptions = {
    enableHighAccuracy: true,
    timeout: 30000, // Increased timeout for GPS
    maximumAge: 0 // Force fresh GPS reading, don't use cached data
  };

  // Handle successful position update
  const handlePositionSuccess = (position: GeolocationPosition) => {
    const location: Location = {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude
    };

    // Validate location accuracy - reject low-accuracy positions
    const accuracy = position.coords.accuracy;
    if (accuracy > 100) {
      console.warn(`[Location] Low accuracy GPS reading (${accuracy}m) - likely IP geolocation. Requesting better GPS fix...`);
      setLocationError(`Low accuracy location (${Math.round(accuracy)}m) - waiting for better GPS signal...`);
      return;
    }

    setCurrentLocation(location);
    setAccuracy(accuracy);
    setLastUpdate(new Date());
    setLocationError(null);

    // Send enhanced location data to server if connected
    if (isConnected) {
      updateLocation({
        latitude: location.latitude,
        longitude: location.longitude,
        accuracy: accuracy,
        speed: position.coords.speed || 0,
        bearing: position.coords.heading || 0,
        timestamp: new Date().toISOString()
      });
    }

    console.log(`[Location] High-accuracy GPS location updated:`, {
      ...location,
      accuracy: `${Math.round(accuracy)}m`,
      source: accuracy <= 20 ? 'GPS' : accuracy <= 100 ? 'Network-assisted GPS' : 'Network/IP'
    });
  };

  // Handle position error
  const handlePositionError = (error: GeolocationPositionError) => {
    let errorMessage = 'Unknown location error';
    
    switch (error.code) {
      case error.PERMISSION_DENIED:
        errorMessage = 'Location permission denied. Please enable location access.';
        break;
      case error.POSITION_UNAVAILABLE:
        errorMessage = 'Location information unavailable.';
        break;
      case error.TIMEOUT:
        errorMessage = 'Location request timed out.';
        break;
    }

    setLocationError(errorMessage);
    setIsTracking(false);
    console.error('Location error:', errorMessage);
  };

  // Get current location once
  const getCurrentLocation = (): Promise<Location | null> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        const error = 'Geolocation is not supported by this browser.';
        setLocationError(error);
        reject(new Error(error));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          handlePositionSuccess(position);
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          });
        },
        (error) => {
          handlePositionError(error);
          reject(error);
        },
        positionOptions
      );
    });
  };

  // Start continuous tracking
  const startTracking = () => {
    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported by this browser.');
      return;
    }

    // Get initial position
    getCurrentLocation().catch(console.error);

    if (watchPosition && !watchId) {
      const id = navigator.geolocation.watchPosition(
        handlePositionSuccess,
        handlePositionError,
        positionOptions
      );
      setWatchId(id);
      setIsTracking(true);
      console.log('[Location] Started location tracking');
    } else {
      setIsTracking(true);
    }
  };

  // Stop tracking
  const stopTracking = () => {
    if (watchId !== null) {
      navigator.geolocation.clearWatch(watchId);
      setWatchId(null);
    }
    setIsTracking(false);
    console.log('[Location] Stopped location tracking');
  };

  // Effect to handle watch position changes
  useEffect(() => {
    if (watchPosition && isTracking && !watchId) {
      startTracking();
    } else if (!watchPosition && watchId) {
      navigator.geolocation.clearWatch(watchId);
      setWatchId(null);
    }
  }, [watchPosition, isTracking]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, [watchId]);

  // Request permission on mount
  useEffect(() => {
    if ('permissions' in navigator) {
      navigator.permissions.query({ name: 'geolocation' }).then((result) => {
        if (result.state === 'granted') {
          console.log('[Location] Geolocation permission granted');
        } else if (result.state === 'denied') {
          setLocationError('Geolocation permission denied');
        }
      }).catch((error) => {
        console.warn('Could not query geolocation permission:', error);
      });
    }
  }, []);

  const value: LocationContextType = {
    currentLocation,
    locationError,
    isTracking,
    accuracy,
    lastUpdate,
    startTracking,
    stopTracking,
    getCurrentLocation,
    watchPosition,
    setWatchPosition
  };

  return (
    <LocationContext.Provider value={value}>
      {children}
    </LocationContext.Provider>
  );
};