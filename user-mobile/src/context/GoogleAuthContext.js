import React, { createContext, useContext, useState, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { firebaseAuth } from '../../firebase.config';
import AsyncStorage from '@react-native-async-storage/async-storage';

const GoogleAuthContext = createContext({});

export const useGoogleAuthContext = () => {
  const context = useContext(GoogleAuthContext);
  if (!context) {
    throw new Error('useGoogleAuthContext must be used within a GoogleAuthProvider');
  }
  return context;
};

export const GoogleAuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(firebaseAuth, async (user) => {
      if (user) {
        // User is signed in
        const userDetails = {
          uid: user.uid,
          displayName: user.displayName,
          email: user.email,
          photoURL: user.photoURL,
          accessToken: user.accessToken,
        };

        setUser(userDetails);

        // Store token
        await AsyncStorage.setItem('userToken', user.accessToken || 'google_signed_in');
        console.log('✅ User signed in:', userDetails.displayName);
      } else {
        // User is signed out
        setUser(null);
        await AsyncStorage.removeItem('userToken');
        console.log('🚪 User signed out');
      }

      if (initializing) setInitializing(false);
      setLoading(false);
    });

    // Cleanup subscription on unmount
    return unsubscribe;
  }, [initializing]);

  const value = {
    user,
    loading,
    initializing,
    isSignedIn: !!user,
  };

  return (
    <GoogleAuthContext.Provider value={value}>
      {children}
    </GoogleAuthContext.Provider>
  );
};