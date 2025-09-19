import React, { createContext, useContext, useEffect, useState } from 'react';
import NetInfo from '@react-native-community/netinfo';
import AsyncStorage from '@react-native-async-storage/async-storage';

const OfflineContext = createContext();

export const useOffline = () => {
  const context = useContext(OfflineContext);
  if (!context) {
    throw new Error('useOffline must be used within an OfflineProvider');
  }
  return context;
};

export const OfflineProvider = ({ children }) => {
  const [isConnected, setIsConnected] = useState(true);
  const [isOffline, setIsOffline] = useState(false);
  const [connectionType, setConnectionType] = useState('unknown');
  const [queuedRequests, setQueuedRequests] = useState([]);
  const [syncInProgress, setSyncInProgress] = useState(false);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      setIsConnected(state.isConnected);
      setIsOffline(!state.isConnected);
      setConnectionType(state.type);
      
      if (state.isConnected && queuedRequests.length > 0) {
        processQueuedRequests();
      }
    });

    return unsubscribe;
  }, [queuedRequests]);

  const processQueuedRequests = async () => {
    if (syncInProgress) return;
    
    setSyncInProgress(true);
    console.log(`Processing ${queuedRequests.length} queued requests...`);
    
    const remainingRequests = [];
    
    for (const request of queuedRequests) {
      try {
        await request.execute();
        console.log('Successfully processed queued request:', request.id);
      } catch (error) {
        console.error('Failed to process queued request:', request.id, error);
        remainingRequests.push(request);
      }
    }
    
    setQueuedRequests(remainingRequests);
    setSyncInProgress(false);
  };

  const queueRequest = (request) => {
    const queuedRequest = {
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
      ...request,
    };
    
    setQueuedRequests(prev => [...prev, queuedRequest]);
    console.log('Request queued for offline processing:', queuedRequest.id);
  };

  const cacheData = async (key, data, ttl = 3600000) => {
    try {
      const cacheItem = {
        data,
        timestamp: Date.now(),
        ttl,
      };
      await AsyncStorage.setItem(`cache_${key}`, JSON.stringify(cacheItem));
    } catch (error) {
      console.error('Error caching data:', error);
    }
  };

  const getCachedData = async (key) => {
    try {
      const cachedItem = await AsyncStorage.getItem(`cache_${key}`);
      if (!cachedItem) return null;
      
      const { data, timestamp, ttl } = JSON.parse(cachedItem);
      const now = Date.now();
      
      if (now - timestamp > ttl) {
        await AsyncStorage.removeItem(`cache_${key}`);
        return null;
      }
      
      return data;
    } catch (error) {
      console.error('Error getting cached data:', error);
      return null;
    }
  };

  const clearCache = async (key) => {
    try {
      if (key) {
        await AsyncStorage.removeItem(`cache_${key}`);
      } else {
        const keys = await AsyncStorage.getAllKeys();
        const cacheKeys = keys.filter(k => k.startsWith('cache_'));
        await AsyncStorage.multiRemove(cacheKeys);
      }
    } catch (error) {
      console.error('Error clearing cache:', error);
    }
  };

  const getCacheInfo = async () => {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter(k => k.startsWith('cache_'));
      
      const cacheInfo = {
        totalItems: cacheKeys.length,
        items: [],
      };
      
      for (const key of cacheKeys) {
        const cachedItem = await AsyncStorage.getItem(key);
        if (cachedItem) {
          const { timestamp, ttl } = JSON.parse(cachedItem);
          const age = Date.now() - timestamp;
          const remaining = ttl - age;
          
          cacheInfo.items.push({
            key: key.replace('cache_', ''),
            age,
            remaining,
            expired: remaining <= 0,
          });
        }
      }
      
      return cacheInfo;
    } catch (error) {
      console.error('Error getting cache info:', error);
      return { totalItems: 0, items: [] };
    }
  };

  const value = {
    isConnected,
    isOffline,
    connectionType,
    queuedRequests,
    syncInProgress,
    queueRequest,
    cacheData,
    getCachedData,
    clearCache,
    getCacheInfo,
  };

  return (
    <OfflineContext.Provider value={value}>
      {children}
    </OfflineContext.Provider>
  );
};