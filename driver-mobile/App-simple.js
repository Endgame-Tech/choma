// App-simple.js - Simple test version for driver app
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView } from 'react-native';
import { StatusBar } from 'expo-status-bar';

export default function App() {
  const [driverStatus, setDriverStatus] = useState('offline');
  const [earnings, setEarnings] = useState(0);

  const toggleStatus = () => {
    if (driverStatus === 'offline') {
      setDriverStatus('online');
      setEarnings(15000);
    } else {
      setDriverStatus('offline');
      setEarnings(0);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="auto" />
      
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>🚚 Choma Driver</Text>
        <Text style={styles.version}>v1.0.0</Text>
      </View>

      {/* Status Card */}
      <View style={styles.statusCard}>
        <Text style={styles.greeting}>Good morning, Driver!</Text>
        <View style={[
          styles.statusBadge, 
          { backgroundColor: driverStatus === 'online' ? '#00b894' : '#e17055' }
        ]}>
          <Text style={styles.statusText}>
            {driverStatus === 'online' ? '🟢 Online' : '🔴 Offline'}
          </Text>
        </View>
      </View>

      {/* Earnings Card */}
      <View style={styles.earningsCard}>
        <Text style={styles.earningsLabel}>Today's Earnings</Text>
        <Text style={styles.earningsAmount}>₦{earnings.toLocaleString()}</Text>
        <Text style={styles.earningsSubtext}>
          {driverStatus === 'online' ? '3 deliveries completed' : 'Go online to start earning'}
        </Text>
      </View>

      {/* Action Button */}
      <TouchableOpacity
        style={[
          styles.actionButton,
          { backgroundColor: driverStatus === 'online' ? '#e17055' : '#00b894' }
        ]}
        onPress={toggleStatus}
      >
        <Text style={styles.actionButtonText}>
          {driverStatus === 'online' ? 'Go Offline' : 'Go Online'}
        </Text>
      </TouchableOpacity>

      {/* Features List */}
      <View style={styles.featuresList}>
        <Text style={styles.featuresTitle}>🚀 Driver App Features:</Text>
        <Text style={styles.feature}>✅ Real-time location tracking</Text>
        <Text style={styles.feature}>✅ Push notifications for deliveries</Text>
        <Text style={styles.feature}>✅ Driver registration with vehicle info</Text>
        <Text style={styles.feature}>✅ Document upload for verification</Text>
        <Text style={styles.feature}>✅ Earnings tracking</Text>
        <Text style={styles.feature}>✅ Performance metrics</Text>
        <Text style={styles.feature}>✅ Delivery management</Text>
      </View>

      <Text style={styles.footer}>
        Built with React Native + Expo {'\n'}
        Same styling as Choma customer app
      </Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 30,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333333',
  },
  version: {
    fontSize: 12,
    color: '#666666',
  },
  statusCard: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  greeting: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333333',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 12,
  },
  earningsCard: {
    backgroundColor: '#4ECDC4',
    borderRadius: 16,
    padding: 24,
    marginBottom: 30,
    alignItems: 'center',
  },
  earningsLabel: {
    color: '#FFFFFF',
    fontSize: 14,
    marginBottom: 8,
  },
  earningsAmount: {
    color: '#FFFFFF',
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  earningsSubtext: {
    color: '#FFFFFF',
    fontSize: 12,
    opacity: 0.8,
  },
  actionButton: {
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 30,
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  featuresList: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  featuresTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 12,
  },
  feature: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 4,
    paddingLeft: 8,
  },
  footer: {
    textAlign: 'center',
    fontSize: 12,
    color: '#999999',
    lineHeight: 18,
  },
});