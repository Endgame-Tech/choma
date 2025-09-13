import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../utils/colors';

const DriverInfoCard = ({ 
  driver, 
  colors, 
  onCall, 
  onMessage, 
  onToggle, 
  isExpanded 
}) => {
  if (!driver) return null;

  const getRating = () => {
    return driver.rating ? Number(driver.rating).toFixed(1) : '4.8';
  };

  const getVehicleInfo = () => {
    if (driver.vehicle) {
      return `${driver.vehicle.make} ${driver.vehicle.model} • ${driver.vehicle.plateNumber}`;
    }
    return 'Vehicle info not available';
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.cardBackground }]}>
      {/* Toggle Handle */}
      <TouchableOpacity style={styles.toggleHandle} onPress={onToggle}>
        <View style={[styles.handle, { backgroundColor: colors.border }]} />
      </TouchableOpacity>

      {/* Driver Info */}
      <View style={styles.content}>
        <View style={styles.driverSection}>
          <Image
            source={{
              uri: driver.profilePicture || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(driver.name)
            }}
            style={styles.driverImage}
            defaultSource={require('../../assets/images/avatar.jpg')}
          />
          
          <View style={styles.driverDetails}>
            <Text style={[styles.driverName, { color: colors.text }]}>
              {driver.name}
            </Text>
            <View style={styles.ratingContainer}>
              <Ionicons name="star" size={14} color="#FFD700" />
              <Text style={[styles.rating, { color: colors.textSecondary }]}>
                {getRating()} • {driver.completedTrips || '127'} trips
              </Text>
            </View>
            <Text style={[styles.vehicleInfo, { color: colors.textSecondary }]}>
              {getVehicleInfo()}
            </Text>
          </View>

          <View style={styles.statusContainer}>
            <View style={[styles.statusDot, { backgroundColor: '#4CAF50' }]} />
            <Text style={[styles.statusText, { color: colors.textSecondary }]}>
              On the way
            </Text>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: colors.primary }]}
            onPress={onCall}
          >
            <Ionicons name="call" size={20} color="#FFFFFF" />
            <Text style={styles.actionButtonText}>Call</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: colors.inputBackground, borderWidth: 1, borderColor: colors.border }]}
            onPress={onMessage}
          >
            <Ionicons name="chatbubble-outline" size={20} color={colors.text} />
            <Text style={[styles.actionButtonText, { color: colors.text }]}>Message</Text>
          </TouchableOpacity>
        </View>

        {/* Expanded Content */}
        {isExpanded && (
          <View style={styles.expandedContent}>
            <View style={[styles.separator, { backgroundColor: colors.border }]} />
            
            <View style={styles.extraInfo}>
              <View style={styles.infoRow}>
                <Ionicons name="shield-checkmark" size={16} color={COLORS.primary} />
                <Text style={[styles.infoText, { color: colors.textSecondary }]}>
                  Verified driver with background check
                </Text>
              </View>
              
              <View style={styles.infoRow}>
                <Ionicons name="car-sport" size={16} color={COLORS.primary} />
                <Text style={[styles.infoText, { color: colors.textSecondary }]}>
                  {driver.vehicle?.color || 'Blue'} {driver.vehicle?.make || 'Toyota'} {driver.vehicle?.model || 'Corolla'}
                </Text>
              </View>

              <View style={styles.infoRow}>
                <Ionicons name="time" size={16} color={COLORS.primary} />
                <Text style={[styles.infoText, { color: colors.textSecondary }]}>
                  Driving for {driver.experienceYears || '3'} years
                </Text>
              </View>
            </View>
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
  },
  toggleHandle: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  driverSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  driverImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: 16,
  },
  driverDetails: {
    flex: 1,
  },
  driverName: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  rating: {
    fontSize: 14,
    marginLeft: 4,
  },
  vehicleInfo: {
    fontSize: 12,
    fontWeight: '500',
  },
  statusContainer: {
    alignItems: 'center',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginBottom: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 25,
    gap: 8,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  expandedContent: {
    marginTop: 16,
  },
  separator: {
    height: 1,
    marginBottom: 16,
  },
  extraInfo: {
    gap: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  infoText: {
    fontSize: 14,
    flex: 1,
  },
});

export default DriverInfoCard;