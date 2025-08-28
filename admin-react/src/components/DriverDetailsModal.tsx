import React from 'react';
import { Driver } from '../types/drivers';
import {
  UserIcon,
  PhoneIcon,
  TruckIcon,
  MapPinIcon
} from '@heroicons/react/24/outline';

interface DriverDetailsModalProps {
  driver: Driver;
  onClose: () => void;
  onStatusUpdate: (driver: Driver, newStatus: string) => void;
  onDelete: (driverId: string) => void;
  updating: string | null;
}

const DriverDetailsModal: React.FC<DriverDetailsModalProps> = ({ driver, onClose, onStatusUpdate, onDelete, updating }) => {
  // Defensive display values to avoid runtime errors when fields are missing
  const vehicleType = driver?.vehicleInfo?.type || 'Unknown vehicle';
  const plateNumber = driver?.vehicleInfo?.plateNumber || 'N/A';
  const coords = driver?.currentLocation?.coordinates;
  const lat = typeof coords?.[1] === 'number' ? coords[1].toFixed(4) : null;
  const lon = typeof coords?.[0] === 'number' ? coords[0].toFixed(4) : null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-neutral-800 rounded-lg p-6 max-w-md w-full">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
          Manage Driver: {driver.fullName}
        </h3>

        <div className="space-y-4 mb-6">
          <div className="flex items-center space-x-3">
            <UserIcon className="h-5 w-5 text-gray-400" />
            <span className="text-sm">{driver.email}</span>
          </div>
          <div className="flex items-center space-x-3">
            <PhoneIcon className="h-5 w-5 text-gray-400" />
            <span className="text-sm">{driver.phone}</span>
          </div>
          <div className="flex items-center space-x-3">
            <TruckIcon className="h-5 w-5 text-gray-400" />
            <span className="text-sm">{vehicleType} - {plateNumber}</span>
          </div>
          {lat !== null && lon !== null ? (
            <div className="flex items-center space-x-3">
              <MapPinIcon className="h-5 w-5 text-gray-400" />
              <span className="text-sm">{lat}, {lon}</span>
            </div>
          ) : null}
        </div>

        <div className="flex flex-wrap gap-2">
          {driver.accountStatus === 'pending' && (
            <>
              <button
                onClick={() => onStatusUpdate(driver, 'approved')}
                disabled={updating === driver._id}
                className="flex-1 px-4 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                {updating === driver._id ? 'Updating...' : 'Approve'}
              </button>
              <button
                onClick={() => onStatusUpdate(driver, 'rejected')}
                disabled={updating === driver._id}
                className="flex-1 px-4 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                {updating === driver._id ? 'Updating...' : 'Reject'}
              </button>
            </>
          )}

          {driver.accountStatus === 'approved' && (
            <>
              <button
                onClick={() => onStatusUpdate(driver, 'suspended')}
                disabled={updating === driver._id}
                className="flex-1 px-4 py-2 bg-yellow-600 text-white text-sm rounded-lg hover:bg-yellow-700 disabled:opacity-50"
              >
                {updating === driver._id ? 'Updating...' : 'Suspend'}
              </button>
              <button
                onClick={() => onDelete(driver._id)}
                disabled={updating === driver._id}
                className="flex-1 px-4 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                {updating === driver._id ? 'Deleting...' : 'Delete'}
              </button>
            </>
          )}

          {driver.accountStatus === 'suspended' && (
            <>
              <button
                onClick={() => onStatusUpdate(driver, 'approved')}
                disabled={updating === driver._id}
                className="flex-1 px-4 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                {updating === driver._id ? 'Updating...' : 'Reactivate'}
              </button>
              <button
                onClick={() => onDelete(driver._id)}
                disabled={updating === driver._id}
                className="flex-1 px-4 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                {updating === driver._id ? 'Deleting...' : 'Delete'}
              </button>
            </>
          )}

          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 text-sm rounded-lg hover:bg-gray-400"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default DriverDetailsModal;
