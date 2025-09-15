import React, { useEffect, useState } from 'react';
import { useWebSocket } from '../hooks/useWebSocket';
import firebaseService from '../services/firebaseService';
import { MapPinIcon, SignalIcon, SignalSlashIcon } from '@heroicons/react/24/outline';

interface Location {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: number;
}

interface LocationTrackerProps {
  isActive?: boolean;
  updateInterval?: number;
  highFrequency?: boolean; // For active deliveries
}

const LocationTracker: React.FC<LocationTrackerProps> = ({ 
  isActive = true, 
  updateInterval,
  highFrequency = false
}) => {
  // Dynamic update interval based on activity
  const getUpdateInterval = () => {
    if (updateInterval) return updateInterval;
    return highFrequency ? 15000 : 60000; // 15 seconds for active deliveries, 60 seconds otherwise
  };
  const { isConnected, updateLocation } = useWebSocket();
  const [currentLocation, setCurrentLocation] = useState<Location | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [isTracking, setIsTracking] = useState(false);
  const [firebaseConnected, setFirebaseConnected] = useState(false);

  useEffect(() => {
    if (!isActive) {
      setIsTracking(false);
      return;
    }

    // Initialize Firebase with driver ID from localStorage
    const initFirebase = async () => {
      const driverToken = localStorage.getItem('driverToken');
      if (driverToken) {
        try {
          // Extract driver ID from token or use a stored driver ID
          const driverId = localStorage.getItem('driverId') || 'driver_' + Date.now();
          const connected = await firebaseService.initialize(driverId);
          setFirebaseConnected(connected);
        } catch (error) {
          console.error('Firebase initialization failed:', error);
          setFirebaseConnected(false);
        }
      }
    };

    initFirebase();

    // Request permission first
    if ('geolocation' in navigator) {
      navigator.permissions.query({ name: 'geolocation' }).then((result) => {
        if (result.state === 'granted') {
          startTracking();
        } else if (result.state === 'prompt') {
          // Will be prompted when we call getCurrentPosition
          startTracking();
        } else {
          setLocationError('Location permission denied');
        }
      });
    } else {
      setLocationError('Geolocation is not supported');
    }

    return () => {
      setIsTracking(false);
    };
  }, [isActive, isConnected, highFrequency]);

  const startTracking = () => {
    if (!navigator.geolocation) return;

    setIsTracking(true);
    setLocationError(null);

    // Get initial position
    getCurrentLocation();

    // Set up continuous tracking with dynamic interval
    const actualUpdateInterval = getUpdateInterval();
    console.log(`[LocationTracker] Setting up GPS tracking with ${actualUpdateInterval/1000}s interval (high frequency: ${highFrequency})`);
    
    const intervalId = setInterval(() => {
      if (isActive && isConnected) {
        getCurrentLocation();
      }
    }, actualUpdateInterval);

    return () => clearInterval(intervalId);
  };

  const getCurrentLocation = () => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const location: Location = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: Date.now()
        };

        // Validate location accuracy - reject very low-accuracy positions
        if (location.accuracy > 500000) { // Very lenient for testing (500km)
          console.warn(`[LocationTracker] Extremely low accuracy GPS reading (${location.accuracy}m) - likely IP geolocation. Requesting better GPS fix...`);
          setLocationError(`Very low accuracy location (${Math.round(location.accuracy)}m) - waiting for better GPS signal...`);
          return;
        }
        
        // Accept even IP-based location for testing
        console.warn(`[LocationTracker] Using location with ${Math.round(location.accuracy)}m accuracy for testing`);

        setCurrentLocation(location);
        setLocationError(null);

        // Send location update to Firebase (primary) and WebSocket (fallback)
        const locationUpdate = {
          latitude: location.latitude,
          longitude: location.longitude,
          accuracy: location.accuracy,
          speed: position.coords.speed || 0,
          bearing: position.coords.heading || 0,
          timestamp: new Date().toISOString()
        };

        console.log(`[LocationTracker] Sending high-accuracy location update:`, {
          latitude: location.latitude,
          longitude: location.longitude,
          accuracy: `${Math.round(location.accuracy)}m`,
          source: location.accuracy <= 20 ? 'GPS' : location.accuracy <= 100 ? 'Network-assisted GPS' : 'Network/IP',
          firebase: firebaseConnected,
          websocket: isConnected
        });

        // Try Firebase first
        if (firebaseConnected) {
          firebaseService.updateLocation(locationUpdate);
        }

        // Also send via WebSocket as backup
        if (isConnected) {
          updateLocation(locationUpdate);
        }

        if (!firebaseConnected && !isConnected) {
          console.warn('[LocationTracker] Neither Firebase nor WebSocket connected - location not sent');
        }

      },
      (error) => {
        let errorMessage = 'Unknown location error';
        
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = 'Location permission denied';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = 'Location unavailable';
            break;
          case error.TIMEOUT:
            errorMessage = 'Location request timed out';
            break;
        }

        setLocationError(errorMessage);
        console.error('Location error:', errorMessage);
      },
      {
        enableHighAccuracy: true,
        timeout: 30000, // Increased timeout for GPS
        maximumAge: 0 // Force fresh GPS reading, don't use cached data
      }
    );
  };

  const formatLocation = (location: Location) => {
    return `${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)}`;
  };

  const getAccuracyStatus = (accuracy: number) => {
    if (accuracy <= 10) return { text: 'Excellent', color: 'text-green-600' };
    if (accuracy <= 50) return { text: 'Good', color: 'text-yellow-600' };
    return { text: 'Fair', color: 'text-red-600' };
  };

  if (!isActive) return null;

  return (
    <div className="bg-white p-4 rounded-lg shadow-sm border">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          <MapPinIcon className="h-5 w-5 text-primary-600" />
          <span className="font-medium text-gray-900">Location Tracking</span>
        </div>
        
        <div className={`flex items-center space-x-1 ${isTracking && (firebaseConnected || isConnected) ? 'text-green-600' : 'text-gray-400'}`}>
          {isTracking && (firebaseConnected || isConnected) ? (
            <SignalIcon className="h-4 w-4" />
          ) : (
            <SignalSlashIcon className="h-4 w-4" />
          )}
          <span className="text-sm font-medium">
            {isTracking && (firebaseConnected || isConnected) ? 'Active' : 'Inactive'}
          </span>
          {firebaseConnected && (
            <span className="text-xs text-green-500 font-medium">FB</span>
          )}
        </div>
      </div>

      {locationError && (
        <div className="mb-3 p-2 bg-red-50 border border-red-200 rounded text-sm">
          <span className="text-red-800"><i className="fi fi-rr-triangle-warning"></i> {locationError}</span>
        </div>
      )}

      {currentLocation && (
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">Coordinates:</span>
            <span className="font-mono text-gray-900">
              {formatLocation(currentLocation)}
            </span>
          </div>
          
          <div className="flex justify-between">
            <span className="text-gray-600">Accuracy:</span>
            <span className={`font-medium ${getAccuracyStatus(currentLocation.accuracy).color}`}>
              {getAccuracyStatus(currentLocation.accuracy).text} ({Math.round(currentLocation.accuracy)}m)
            </span>
          </div>
          
          <div className="flex justify-between">
            <span className="text-gray-600">Last Update:</span>
            <span className="text-gray-900">
              {new Date(currentLocation.timestamp).toLocaleTimeString()}
            </span>
          </div>
        </div>
      )}

      {!firebaseConnected && !isConnected && (
        <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded text-sm">
          <span className="text-red-800">
            <i className="fi fi-rr-triangle-warning"></i> Not connected to Firebase or WebSocket. Location updates are disabled.
          </span>
        </div>
      )}

      {!firebaseConnected && isConnected && (
        <div className="mt-3 p-2 bg-yellow-50 border border-yellow-200 rounded text-sm">
          <span className="text-yellow-800">
            <i className="fi fi-rr-triangle-warning"></i> Using WebSocket fallback. Firebase connection failed.
          </span>
        </div>
      )}
    </div>
  );
};

export default LocationTracker;