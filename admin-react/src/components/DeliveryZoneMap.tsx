/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable no-undef */
import React, { useCallback, useRef } from 'react';
import { GoogleMap, LoadScript, Circle, Marker, DrawingManager } from '@react-google-maps/api';
import { DeliveryPrice } from '../types';

const libraries: ("drawing" | "geometry" | "places")[] = ["drawing", "geometry", "places"];

const mapContainerStyle = {
  width: '100%',
  height: '500px'
};

const defaultCenter = {
  lat: 9.0765, // Nigeria center
  lng: 7.3986
};

const defaultOptions = {
  disableDefaultUI: false,
  zoomControl: true,
  streetViewControl: false,
  mapTypeControl: true,
  fullscreenControl: true,
};

// using `any` here because the drawing overlay types can be strict; cast when passed into component
const drawingManagerOptions: any = {
  drawingControl: true,
  drawingControlOptions: {
    position: 3, // google.maps.ControlPosition.TOP_CENTER
    drawingModes: [
      'circle',
    ],
  },
  circleOptions: {
    fillColor: '#FF6B35',
    fillOpacity: 0.2,
    strokeWeight: 2,
    strokeColor: '#FF6B35',
    clickable: false,
    editable: true,
    zIndex: 1,
  },
};

interface DeliveryZoneMapProps {
  zones: DeliveryPrice[];
  onZoneCreate?: (zone: { center: { lat: number; lng: number }; radius: number; address: string }) => void;
  onZoneUpdate?: (zoneId: string, updates: { center?: { lat: number; lng: number }; radius?: number }) => void;
  selectedZone?: DeliveryPrice | null;
  editable?: boolean;
}

// access process.env safely via direct checks where needed

const DeliveryZoneMap: React.FC<DeliveryZoneMapProps> = ({
  zones,
  onZoneCreate,
  selectedZone,
  editable = true
}) => {
  // we don't keep the native google objects in state here; use ref for geocoder
  const geocoder = useRef<any>(null);

  const onLoad = useCallback(() => {
    // initialize the geocoder once the google maps library is available
    const g = (window as any).google;
    geocoder.current = g ? new g.maps.Geocoder() : null;
  }, []);

  const onUnmount = useCallback(() => {
    geocoder.current = null;
  }, []);

  // no-op: we don't need to keep a drawingManager instance at the moment
  const onDrawingManagerLoad = useCallback(() => {
    // placeholder
  }, []);

  const onCircleComplete = useCallback((circle: any) => {
    if (!onZoneCreate || !geocoder.current) return;

    const center = circle.getCenter();
    const radius = circle.getRadius();

    if (center) {
      const lat = center.lat();
      const lng = center.lng();

      // Reverse geocode to get address
      geocoder.current.geocode({ location: { lat, lng } }, (results: any, status: any) => {
        if (status === 'OK' && results?.[0]) {
          const address = results[0].formatted_address;
          onZoneCreate({ center: { lat, lng }, radius: Math.round(radius), address });
        } else {
          onZoneCreate({ center: { lat, lng }, radius: Math.round(radius), address: `Zone at ${lat.toFixed(6)}, ${lng.toFixed(6)}` });
        }
      });
    }

    // Remove the drawn circle after capturing data
    circle.setMap(null);
  }, [onZoneCreate]);

  const getZoneColor = (zone: DeliveryPrice) => {
    if (zone._id === selectedZone?._id) {
      return '#4F46E5'; // Indigo for selected
    }
    if (zone.isDefault) {
      return '#EF4444'; // Red for default
    }
    return '#FF6B35'; // Orange for regular
  };

  const getZoneOpacity = (zone: DeliveryPrice) => {
    if (zone._id === selectedZone?._id) {
      return 0.3;
    }
    if (zone.isDefault) {
      return 0.1;
    }
    return 0.2;
  };

  if (!process.env.REACT_APP_GOOGLE_MAPS_API_KEY) {
    return (
      <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-8 text-center">
        <p className="text-gray-600 dark:text-gray-400">
          Google Maps API key not configured. Please add REACT_APP_GOOGLE_MAPS_API_KEY to your environment variables.
        </p>
      </div>
    );
  }

  return (
    <LoadScript
      googleMapsApiKey={process.env.REACT_APP_GOOGLE_MAPS_API_KEY}
      libraries={libraries}
      loadingElement={
        <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600 mx-auto"></div>
          <p className="text-gray-600 dark:text-gray-400 mt-2">Loading map...</p>
        </div>
      }
    >
      <div className="relative">
        <GoogleMap
          mapContainerStyle={mapContainerStyle}
          center={defaultCenter}
          zoom={6}
          onLoad={onLoad}
          onUnmount={onUnmount}
          options={defaultOptions}
        >
          {/* Drawing Manager for creating new zones */}
          {editable && (
            <DrawingManager
              onLoad={onDrawingManagerLoad}
              onCircleComplete={onCircleComplete}
              options={drawingManagerOptions}
            />
          )}

          {/* Render existing delivery zones */}
          {zones.map((zone) => {
            if (!zone.latitude || !zone.longitude) return null;

            return (
              <React.Fragment key={zone._id}>
                {/* Zone circle */}
                <Circle
                  center={{
                    lat: zone.latitude,
                    lng: zone.longitude
                  }}
                  radius={zone.radius ? zone.radius * 1000 : 5000} // Convert km to meters
                  options={{
                    fillColor: getZoneColor(zone),
                    fillOpacity: getZoneOpacity(zone),
                    strokeColor: getZoneColor(zone),
                    strokeOpacity: 0.8,
                    strokeWeight: zone._id === selectedZone?._id ? 3 : 2,
                    clickable: true,
                  }}
                  onClick={() => {
                    // You can add click handler here if needed
                  }}
                />

                {/* Zone center marker */}
                <Marker
                  position={{
                    lat: zone.latitude,
                    lng: zone.longitude
                  }}
                  title={`${zone.locationName} - ₦${zone.price}`}
                  icon={{
                    url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <circle cx="12" cy="12" r="8" fill="${getZoneColor(zone)}" stroke="white" stroke-width="2"/>
                        <text x="12" y="16" text-anchor="middle" fill="white" font-size="12" font-weight="bold">₦</text>
                      </svg>
                    `)}`,
                    // keep icon URL only; size/anchor will be handled by the maps library
                  }}
                />
              </React.Fragment>
            );
          })}
        </GoogleMap>

        {/* Legend */}
        <div className="absolute top-4 right-4 bg-white dark:bg-gray-800 p-4 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
          <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Zone Types</h4>
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-orange-500 opacity-60"></div>
              <span className="text-gray-700 dark:text-gray-300">Regular Zones</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-red-500 opacity-40"></div>
              <span className="text-gray-700 dark:text-gray-300">Default Zones</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-indigo-500 opacity-60"></div>
              <span className="text-gray-700 dark:text-gray-300">Selected Zone</span>
            </div>
          </div>
          {editable && (
            <div className="mt-4 pt-2 border-t border-gray-200 dark:border-gray-600">
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Use the circle tool to create new delivery zones
              </p>
            </div>
          )}
        </div>
      </div>
    </LoadScript>
  );
};

export default DeliveryZoneMap;