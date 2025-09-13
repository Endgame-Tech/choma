import React, { useEffect, useState } from 'react';
import { useWebSocket } from '../hooks/useWebSocket';
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
}

const LocationTracker: React.FC<LocationTrackerProps> = ({ 
  isActive = true, 
  updateInterval = 60000 // 60 seconds (1 minute)
}) => {
  const { isConnected, updateLocation } = useWebSocket();
  const [currentLocation, setCurrentLocation] = useState<Location | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [isTracking, setIsTracking] = useState(false);

  useEffect(() => {
    if (!isActive || !isConnected) {
      setIsTracking(false);
      return;
    }

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
  }, [isActive, isConnected, updateInterval]);

  const startTracking = () => {
    if (!navigator.geolocation) return;

    setIsTracking(true);
    setLocationError(null);

    // Get initial position
    getCurrentLocation();

    // Set up continuous tracking
    const intervalId = setInterval(() => {
      if (isActive && isConnected) {
        getCurrentLocation();
      }
    }, updateInterval);

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

        setCurrentLocation(location);
        setLocationError(null);

        // Send location update to server via WebSocket
        if (isConnected) {
          console.log('[Location] Sending location update:', {
            latitude: location.latitude,
            longitude: location.longitude,
            accuracy: location.accuracy
          });
          updateLocation({
            latitude: location.latitude,
            longitude: location.longitude,
            accuracy: location.accuracy,
            speed: position.coords.speed,
            bearing: position.coords.heading
          });
        } else {
          console.warn('[Location] WebSocket not connected - location not sent');
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
        timeout: 15000,
        maximumAge: 60000 // 1 minute
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
        
        <div className={`flex items-center space-x-1 ${isTracking && isConnected ? 'text-green-600' : 'text-gray-400'}`}>
          {isTracking && isConnected ? (
            <SignalIcon className="h-4 w-4" />
          ) : (
            <SignalSlashIcon className="h-4 w-4" />
          )}
          <span className="text-sm font-medium">
            {isTracking && isConnected ? 'Active' : 'Inactive'}
          </span>
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

      {!isConnected && (
        <div className="mt-3 p-2 bg-yellow-50 border border-yellow-200 rounded text-sm">
          <span className="text-yellow-800">
            <i className="fi fi-rr-triangle-warning"></i> Not connected to server. Location updates will resume when connection is restored.
          </span>
        </div>
      )}
    </div>
  );
};

export default LocationTracker;