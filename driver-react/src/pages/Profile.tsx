import React, { useState } from 'react';
import { Driver } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { useWebSocket } from '../hooks/useWebSocket';
import {
  UserIcon,
  TruckIcon,
  PhoneIcon,
  EnvelopeIcon,
  IdentificationIcon,
  MapPinIcon,
  StarIcon,
  ClockIcon,
  CurrencyDollarIcon,
  PencilIcon,
  CheckIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';

const Profile: React.FC = () => {
  const { driver, updateDriver } = useAuth();
  const { isConnected } = useWebSocket();

  const [isEditing, setIsEditing] = useState(false);
  type EditForm = { phone: string; vehicleInfo: Driver['vehicleInfo'] };
  const [editForm, setEditForm] = useState<EditForm>({
    phone: driver?.phone || '',
    vehicleInfo: {
      type: (driver?.vehicleInfo?.type as Driver['vehicleInfo']['type']) || 'motorcycle',
      plateNumber: driver?.vehicleInfo?.plateNumber || '',
      model: driver?.vehicleInfo?.model || '',
      capacity: driver?.vehicleInfo?.capacity || 0
    }
  });
  const [saving, setSaving] = useState(false);
  const handleEditToggle = () => {
    if (isEditing) {
      // Reset form if canceling
      setEditForm({
        phone: driver?.phone || '',
        vehicleInfo: {
          type: (driver?.vehicleInfo?.type as Driver['vehicleInfo']['type']) || 'motorcycle',
          plateNumber: driver?.vehicleInfo?.plateNumber || '',
          model: driver?.vehicleInfo?.model || '',
          capacity: driver?.vehicleInfo?.capacity || 0
        }
      });
    }
    setIsEditing(!isEditing);
  };
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;

    if (name.startsWith('vehicle.')) {
      const vehicleField = name.replace('vehicle.', '');
      setEditForm(prev => ({
        ...prev,
        vehicleInfo: {
          ...prev.vehicleInfo,
          [vehicleField]: vehicleField === 'capacity' ? Number(value) : value
        }
      }));
    } else {
      setEditForm(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const handleSave = async () => {
    if (!driver) return;

    setSaving(true);
    try {
      const result = await updateDriver({
        phone: editForm.phone,
        vehicleInfo: editForm.vehicleInfo
      });

      if (result.success) {
        setIsEditing(false);
      } else {
        alert(result.message || 'Failed to update profile');
      }
    } catch (error: any) {
      alert(error.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-NG', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'suspended':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getOnlineStatusColor = (status: string) => {
    switch (status) {
      case 'online':
        return 'text-green-600';
      case 'busy':
        return 'text-yellow-600';
      case 'offline':
        return 'text-gray-600';
      default:
        return 'text-gray-600';
    }
  };

  const vehicleTypes = [
    { value: 'motorcycle', label: 'Motorcycle' },
    { value: 'bicycle', label: 'Bicycle' },
    { value: 'car', label: 'Car' },
    { value: 'van', label: 'Van' }
  ];

  if (!driver) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg text-gray-600">Loading profile...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Driver Profile</h1>

        <div className="flex items-center space-x-3">
          {/* Connection Status */}
          <div className={`flex items-center space-x-1 px-2 py-1 rounded text-sm ${isConnected ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
            }`}>
            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
            <span>{isConnected ? 'Connected' : 'Offline'}</span>
          </div>

          {/* Edit Button */}
          {isEditing ? (
            <div className="flex space-x-2">
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center space-x-1 px-3 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                <CheckIcon className="h-4 w-4" />
                <span>{saving ? 'Saving...' : 'Save'}</span>
              </button>
              <button
                onClick={handleEditToggle}
                disabled={saving}
                className="flex items-center space-x-1 px-3 py-2 bg-gray-600 text-white text-sm rounded-lg hover:bg-gray-700"
              >
                <XMarkIcon className="h-4 w-4" />
                <span>Cancel</span>
              </button>
            </div>
          ) : (
            <button
              onClick={handleEditToggle}
              className="flex items-center space-x-1 px-3 py-2 bg-primary-600 text-white text-sm rounded-lg hover:bg-primary-700"
            >
              <PencilIcon className="h-4 w-4" />
              <span>Edit Profile</span>
            </button>
          )}
        </div>
      </div>

      {/* Profile Card */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center space-x-6 mb-6">
          <div className="w-20 h-20 bg-primary-100 rounded-full flex items-center justify-center">
            <UserIcon className="h-12 w-12 text-primary-600" />
          </div>

          <div className="flex-1">
            <h2 className="text-2xl font-bold text-gray-900">{driver.fullName}</h2>
            <p className="text-gray-600 mb-2">Driver ID: {driver.driverId}</p>

            <div className="flex items-center space-x-4">
              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(driver.accountStatus)}`}>
                {driver.accountStatus?.charAt(0).toUpperCase() + driver.accountStatus?.slice(1)}
              </span>

              <div className={`flex items-center space-x-1 ${getOnlineStatusColor(driver.status)}`}>
                <div className={`w-2 h-2 rounded-full ${driver.status === 'online' ? 'bg-green-500' :
                  driver.status === 'on_delivery' ? 'bg-yellow-500' :
                    'bg-gray-500'
                  }`}></div>
                <span className="text-sm font-medium">
                  {driver.status?.charAt(0).toUpperCase() + driver.status?.slice(1)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Profile Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Contact Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">Contact Information</h3>

            <div className="flex items-center space-x-3">
              <EnvelopeIcon className="h-5 w-5 text-gray-400" />
              <div>
                <p className="text-sm font-medium text-gray-700">Email</p>
                <p className="text-sm text-gray-600">{driver.email}</p>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <PhoneIcon className="h-5 w-5 text-gray-400" />
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-700">Phone</p>
                {isEditing ? (
                  <input
                    type="tel"
                    name="phone"
                    value={editForm.phone}
                    onChange={handleInputChange}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                  />
                ) : (
                  <p className="text-sm text-gray-600">{driver.phone}</p>
                )}
              </div>
            </div>
          </div>

          {/* Vehicle Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">Vehicle Information</h3>

            <div className="flex items-center space-x-3">
              <TruckIcon className="h-5 w-5 text-gray-400" />
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-700">Vehicle Type</p>
                {isEditing ? (
                  <select
                    name="vehicle.type"
                    value={editForm.vehicleInfo.type}
                    onChange={handleInputChange}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                  >
                    {vehicleTypes.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                ) : (
                  <p className="text-sm text-gray-600 capitalize">{driver.vehicleInfo?.type}</p>
                )}
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <IdentificationIcon className="h-5 w-5 text-gray-400" />
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-700">Plate Number</p>
                {isEditing ? (
                  <input
                    type="text"
                    name="vehicle.plateNumber"
                    value={editForm.vehicleInfo.plateNumber}
                    onChange={handleInputChange}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                  />
                ) : (
                  <p className="text-sm text-gray-600">{driver.vehicleInfo?.plateNumber}</p>
                )}
              </div>
            </div>

            {(driver.vehicleInfo?.model || isEditing) && (
              <div className="flex items-center space-x-3">
                <TruckIcon className="h-5 w-5 text-gray-400" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-700">Vehicle Model</p>
                  {isEditing ? (
                    <input
                      type="text"
                      name="vehicle.model"
                      value={editForm.vehicleInfo.model}
                      onChange={handleInputChange}
                      placeholder="e.g., Honda CB 150"
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                    />
                  ) : (
                    <p className="text-sm text-gray-600">{driver.vehicleInfo?.model || 'Not specified'}</p>
                  )}
                </div>
              </div>
            )}

            <div className="flex items-center space-x-3">
              <TruckIcon className="h-5 w-5 text-gray-400" />
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-700">Vehicle Capacity</p>
                {isEditing ? (
                  <input
                    type="number"
                    name="vehicle.capacity"
                    value={editForm.vehicleInfo.capacity}
                    onChange={handleInputChange}
                    min={0}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                  />
                ) : (
                  <p className="text-sm text-gray-600">{driver.vehicleInfo?.capacity}</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Additional Information */}
        <div className="mt-6 pt-6 border-t border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-3">License Information</h3>
              <div className="flex items-center space-x-3">
                <IdentificationIcon className="h-5 w-5 text-gray-400" />
                <div>
                  <p className="text-sm font-medium text-gray-700">License Number</p>
                  <p className="text-sm text-gray-600">{driver.licenseNumber}</p>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-3">Account Details</h3>
              <div className="space-y-2">
                <div className="flex items-center space-x-3">
                  <ClockIcon className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-sm font-medium text-gray-700">Joined</p>
                    <p className="text-sm text-gray-600">{formatDate(driver.joinDate)}</p>
                  </div>
                </div>

                {driver.lastActiveAt && (
                  <div className="flex items-center space-x-3">
                    <ClockIcon className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="text-sm font-medium text-gray-700">Last Active</p>
                      <p className="text-sm text-gray-600">{formatDate(driver.lastActiveAt)}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Performance Stats */}
      {driver.deliveryStats && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Performance Statistics</h3>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <TruckIcon className="h-8 w-8 text-primary-600 mx-auto mb-2" />
              <p className="text-2xl font-bold text-gray-900">
                {driver.deliveryStats.totalDeliveries}
              </p>
              <p className="text-sm text-gray-600">Total Deliveries</p>
            </div>

            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <CheckIcon className="h-8 w-8 text-green-600 mx-auto mb-2" />
              <p className="text-2xl font-bold text-gray-900">
                {driver.deliveryStats.completedDeliveries}
              </p>
              <p className="text-sm text-gray-600">Completed</p>
            </div>

            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <CurrencyDollarIcon className="h-8 w-8 text-green-600 mx-auto mb-2" />
              <p className="text-2xl font-bold text-gray-900">
                ₦{driver.earnings.totalEarnings?.toLocaleString() || 0}
              </p>
              <p className="text-sm text-gray-600">Total Earnings</p>
            </div>

            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <StarIcon className="h-8 w-8 text-yellow-600 mx-auto mb-2" />
              <p className="text-2xl font-bold text-gray-900">
                {(driver.rating?.average)?.toFixed(1) || 'N/A'}
              </p>
              <p className="text-sm text-gray-600">Average Rating</p>
            </div>
          </div>
        </div>
      )}

      {/* Current Location */}
      {driver.currentLocation && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Current Location</h3>

          <div className="flex items-center space-x-3">
            <MapPinIcon className="h-5 w-5 text-gray-400" />
            <div>
              <p className="text-sm font-medium text-gray-700">Coordinates</p>
              <p className="text-sm text-gray-600 font-mono">
                {driver.currentLocation.coordinates && driver.currentLocation.coordinates.length >= 2
                  ? `${driver.currentLocation.coordinates[1].toFixed(6)}, ${driver.currentLocation.coordinates[0].toFixed(6)}`
                  : 'Location not available'
                }
              </p>
              {driver.currentLocation.lastUpdated && (
                <p className="text-xs text-gray-500">
                  Updated: {new Date(driver.currentLocation.lastUpdated).toLocaleString()}
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Profile;