// src/utils/devConfig.js
/**
 * Development configuration for troubleshooting connection issues
 * 
 * This file provides alternative connection options for development environments.
 * It's used to help resolve connectivity issues between the device and the backend API.
 */

// Various IP addresses to try for Android development
export const ANDROID_DEV_IPS = [
  '192.168.0.108',   // Current local network IP (your actual computer's IP on your network)
  '10.0.2.2',        // Android emulator default for reaching host's localhost
  '127.0.0.1',       // Local loopback
  'localhost',       // Local hostname
];

// Various IP addresses to try for iOS development
export const IOS_DEV_IPS = [
  'localhost',       // iOS simulator default for reaching host's localhost
  '127.0.0.1',       // Local loopback
  '192.168.0.108',   // Current local network IP
];

// Development ports to try
export const DEV_PORTS = [
  '5001',            // Current port
  '5000',            // Alternative port
  '3000',            // Common Node.js port
];

/**
 * Generate all possible API base URLs for development
 * @returns {Array<string>} Array of possible API base URLs
 */
export const getAllPossibleDevUrls = () => {
  const urls = [];
  
  // Add Android URLs
  ANDROID_DEV_IPS.forEach(ip => {
    DEV_PORTS.forEach(port => {
      urls.push(`http://${ip}:${port}/api`);
    });
  });
  
  // Add iOS URLs
  IOS_DEV_IPS.forEach(ip => {
    DEV_PORTS.forEach(port => {
      urls.push(`http://${ip}:${port}/api`);
    });
  });
  
  return urls;
};

/**
 * Tests connectivity to all possible development URLs
 * @returns {Promise<Object>} Result of connectivity tests
 */
export const testAllPossibleConnections = async () => {
  const urls = getAllPossibleDevUrls();
  const results = {};
  
  // Create a promise for each URL test with a timeout
  const testPromises = urls.map(async (url) => {
    try {
      const healthUrl = `${url.replace('/api', '')}/health`;
      console.log(`Testing connection to: ${healthUrl}`);
      
      // Set up AbortController for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
      
      try {
        const response = await fetch(healthUrl, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (response.ok) {
          const data = await response.json();
          results[url] = {
            success: true,
            status: response.status,
            data,
          };
          console.log(`✅ Connection successful to: ${url}`);
        } else {
          results[url] = {
            success: false,
            status: response.status,
            error: response.statusText,
          };
          console.log(`❌ Connection failed to: ${url} - ${response.status} ${response.statusText}`);
        }
      } catch (fetchError) {
        clearTimeout(timeoutId);
        
        // Also try the root endpoint as a fallback
        try {
          if (fetchError.message.includes('Network request failed')) {
            const rootUrl = url.split('/api')[0];
            console.log(`Testing root endpoint: ${rootUrl}`);
            
            const rootController = new AbortController();
            const rootTimeoutId = setTimeout(() => rootController.abort(), 5000);
            
            const rootResponse = await fetch(rootUrl, {
              method: 'GET',
              signal: rootController.signal
            });
            
            clearTimeout(rootTimeoutId);
            
            if (rootResponse.ok) {
              results[url] = {
                success: true,
                status: rootResponse.status,
                warning: "Root endpoint accessible but health endpoint failed",
              };
              console.log(`⚠️ Root endpoint accessible but health endpoint failed: ${url}`);
              return;
            }
          }
        } catch (rootError) {
          // Ignore root endpoint errors
        }
        
        results[url] = {
          success: false,
          error: fetchError.name === 'AbortError' ? 'Connection timed out' : fetchError.message,
        };
        console.log(`❌ Connection error to: ${url} - ${fetchError.message}`);
      }
    } catch (error) {
      results[url] = {
        success: false,
        error: error.message,
      };
      console.log(`❌ Connection error to: ${url} - ${error.message}`);
    }
  });
  
  // Wait for all tests to complete
  await Promise.all(testPromises);
  
  return results;
};

export default {
  ANDROID_DEV_IPS,
  IOS_DEV_IPS,
  DEV_PORTS,
  getAllPossibleDevUrls,
  testAllPossibleConnections,
};
