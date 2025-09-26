// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { initializeAuth, getReactNativePersistence } from "firebase/auth";
import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';

const firebaseConfig = {
  apiKey: "AIzaSyAXF-2ARo5xywX_g6x0gKiA7VOAMjCBHxM",
  authDomain: "getchoma-bca76.firebaseapp.com",
  databaseURL: "https://getchoma-bca76-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "getchoma-bca76",
  storageBucket: "getchoma-bca76.firebasestorage.app",
  messagingSenderId: "947042824831",
  appId: "1:947042824831:web:33908d021726899ccd054a",
  measurementId: "G-C50CCMDVLY"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

// Initialize Auth with AsyncStorage persistence
export const firebaseAuth = initializeAuth(app, {
  persistence: getReactNativePersistence(ReactNativeAsyncStorage)
});