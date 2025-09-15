import { initializeApp } from 'firebase/app';
import { getDatabase, ref, set, serverTimestamp } from 'firebase/database';

const firebaseConfig = {
  apiKey: "AIzaSyAXF-2ARo5xywX_g6x0gKiA7VOAMjCBHxM",
  authDomain: "getchoma-bca76.firebaseapp.com",
  databaseURL: "https://getchoma-bca76-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "getchoma-bca76",
  storageBucket: "getchoma-bca76.firebasestorage.app",
  messagingSenderId: "947042824831",
  appId: "1:947042824831:web:27a4e37a1d7800ebcd054a",
  measurementId: "G-MVSPB2WXNG"
};

class DriverFirebaseService {
  private app: any = null;
  private database: any = null;
  private isInitialized = false;
  private driverId: string | null = null;

  constructor() {
    // Don't initialize Firebase in constructor - wait for explicit initialization
  }

  async initialize(driverId: string) {
    try {
      console.log('🔥 Initializing Firebase for driver:', driverId);
      
      // Initialize Firebase App
      this.app = initializeApp(firebaseConfig);
      
      // Try to get Realtime Database
      this.database = getDatabase(this.app);
      
      // Test connection by trying to get a reference
      const testRef = ref(this.database, '.info/connected');
      
      this.driverId = driverId;
      this.isInitialized = true;
      console.log('✅ Firebase initialized successfully for driver:', driverId);
      return true;
    } catch (error) {
      console.error('❌ Firebase initialization failed:', error);
      console.error('Make sure Realtime Database is enabled in Firebase Console');
      this.isInitialized = false;
      return false;
    }
  }

  async updateLocation(locationData: {
    latitude: number;
    longitude: number;
    accuracy: number;
    speed: number;
    bearing: number;
    timestamp: string;
  }) {
    if (!this.isInitialized || !this.driverId || !this.database) {
      console.warn('⚠️ Firebase not available - skipping location update');
      return false;
    }

    try {
      const locationRef = ref(this.database, `drivers/${this.driverId}/location`);
      await set(locationRef, {
        ...locationData,
        timestamp: serverTimestamp(),
        lastUpdated: new Date().toISOString()
      });

      console.log(`📍 Firebase: Updated location for driver ${this.driverId}`);
      return true;
    } catch (error) {
      console.error('❌ Firebase: Failed to update location:', error);
      console.error('Error details:', error);
      return false;
    }
  }

  async updateStatus(status: 'online' | 'offline' | 'busy') {
    if (!this.isInitialized || !this.driverId) return false;

    try {
      const statusRef = ref(this.database, `drivers/${this.driverId}/status`);
      await set(statusRef, {
        status,
        lastUpdate: serverTimestamp(),
        timestamp: new Date().toISOString()
      });

      console.log(`📊 Firebase: Updated driver ${this.driverId} status to ${status}`);
      return true;
    } catch (error) {
      console.error('❌ Firebase: Failed to update status:', error);
      return false;
    }
  }

  async updateAssignmentStatus(assignmentId: string, status: string) {
    if (!this.isInitialized || !this.driverId) return false;

    try {
      const assignmentRef = ref(this.database, `assignments/${assignmentId}`);
      await set(assignmentRef, {
        status,
        driverId: this.driverId,
        lastUpdate: serverTimestamp(),
        timestamp: new Date().toISOString()
      });

      console.log(`📊 Firebase: Updated assignment ${assignmentId} status to ${status}`);
      return true;
    } catch (error) {
      console.error('❌ Firebase: Failed to update assignment status:', error);
      return false;
    }
  }
}

export default new DriverFirebaseService();