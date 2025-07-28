// src/utils/networkDiagnostics.js
import { Platform } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { APP_CONFIG } from './constants';
import devConfig from './devConfig';

/**
 * Network diagnostics utility to help troubleshoot API connection issues
 */
class NetworkDiagnostics {  /**
   * Tests connection to the backend API
   * @returns {Promise<Object>} - Connection test results
   */  static async testApiConnection() {
    try {
      console.log('Testing API connection to:', APP_CONFIG.API_BASE_URL);
      
      // Simple health check endpoint test with improved timeout handling
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        console.log('Connection timeout reached, aborting request');
        controller.abort();
      }, 20000); // 20 second timeout
      
      try {
        // First try the health endpoint
        const healthUrl = `${APP_CONFIG.API_BASE_URL.replace('/api', '')}/health`;
        console.log('Testing health endpoint:', healthUrl);
        
        const response = await fetch(healthUrl, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        // If we got a response but it's not OK
        if (!response.ok) {
          console.log(`Server responded with status ${response.status}: ${response.statusText}`);
          return {
            success: false,
            status: response.status,
            error: `Server responded with ${response.status}: ${response.statusText}`,
            responseType: 'error_status'
          };
        }
        
        const data = await response.json();
        console.log('Successfully connected to server:', data);
        
        return {
          success: true,
          status: response.status,
          data,
          testedUrl: healthUrl
        };
      } catch (fetchError) {
        clearTimeout(timeoutId);
        console.error('Fetch error details:', fetchError.name, fetchError.message);
        
        // Differentiate between timeout, network errors and other issues
        if (fetchError.name === 'AbortError') {
          console.log('Connection timed out after 20 seconds');
          return {
            success: false,
            error: 'Connection timed out after 20 seconds',
            errorType: 'timeout',
            details: 'The server took too long to respond. This might indicate network congestion or that the server is overloaded.'
          };
        } else if (fetchError.message.includes('Network request failed')) {
          console.log('Network request failed, checking alternative endpoints');
          // Try root endpoint as fallback
          try {
            console.log('Health endpoint failed, trying root endpoint...');
            const rootUrl = APP_CONFIG.API_BASE_URL.split('/api')[0];
            console.log('Testing root endpoint:', rootUrl);
            
            const rootController = new AbortController();
            const rootTimeoutId = setTimeout(() => {
              console.log('Root endpoint connection timeout reached, aborting request');
              rootController.abort();
            }, 10000);
            
            const rootResponse = await fetch(rootUrl, {
              method: 'GET',
              signal: rootController.signal
            });
            
            clearTimeout(rootTimeoutId);
            
            if (rootResponse.ok) {
              console.log('Root endpoint is reachable');
              return {
                success: true,
                status: rootResponse.status,
                data: { status: 'OK', message: 'Root endpoint reachable but health endpoint failed' },
                testedUrl: rootUrl,
                warning: 'Health endpoint not available, but server root is reachable'
              };
            } else {
              console.log(`Root endpoint responded with status ${rootResponse.status}`);
              throw new Error(`Root endpoint responded with ${rootResponse.status}`);
            }
          } catch (rootError) {
            // Both health and root endpoints failed
            return {
              success: false,
              error: 'Network request failed - server might be down or inaccessible',
              errorType: 'network',
              details: 'Your device cannot reach the server. This could be due to incorrect IP address, server not running, or network restrictions.'
            };
          }
        } else {
          throw fetchError; // Re-throw for the outer catch
        }
      }
    } catch (error) {
      console.error('API connection test failed:', error);
      
      return {
        success: false,
        error: error.message,
        errorType: 'general',
        details: 'An unexpected error occurred while testing the connection.'
      };
    }
  }

  /**
   * Tests all possible development API connections
   * @returns {Promise<Object>} - All connection test results
   */
  static async testAllConnections() {
    return devConfig.testAllPossibleConnections();
  }

  /**
   * Gets device network information
   * @returns {Promise<Object>} - Network information
   */
  static async getNetworkInfo() {
    try {
      const networkState = await NetInfo.fetch();
      
      return {
        connected: networkState.isConnected,
        connectionType: networkState.type,
        details: Platform.select({
          ios: {
            cellular: networkState.details?.cellular,
            wifi: networkState.details?.wifi,
          },
          android: {
            cellular: networkState.details?.cellularGeneration,
            strength: networkState.details?.strength,
          },
          default: networkState.details,
        }),
      };
    } catch (error) {
      console.error('Failed to get network info:', error);
      
      return {
        error: error.message,
      };
    }
  }

  /**
   * Logs complete network diagnostics information
   */  static async logDiagnostics() {
    console.log('-------------------------------------');
    console.log('📡 NETWORK DIAGNOSTICS');
    console.log('-------------------------------------');
    console.log('Platform:', Platform.OS);
    console.log('API URL:', APP_CONFIG.API_BASE_URL);
    console.log('Device:', Platform.OS === 'android' ? 'Android' : Platform.OS === 'ios' ? 'iOS' : 'Unknown');
    console.log('Debug Mode:', __DEV__ ? 'Yes' : 'No');
    
    try {
      const networkInfo = await this.getNetworkInfo();
      console.log('Network Info:', networkInfo);
      
      const apiTest = await this.testApiConnection();
      console.log('API Connection Test:', apiTest);
      
      // If the main API connection test fails, test all possible connections
      if (!apiTest.success) {
        console.log('Testing all possible connections...');
        const allTests = await this.testAllConnections();
        
        // Find successful connections
        const successfulConnections = Object.entries(allTests)
          .filter(([_, result]) => result.success)
          .map(([url]) => url);
        
        if (successfulConnections.length > 0) {
          console.log('✅ Working connections found:', successfulConnections);
          console.log('👉 Suggestion: Update API_BASE_URL in constants.js to one of these URLs');
          
          // Log IP addresses that are working
          const workingIPs = successfulConnections.map(url => {
            const match = url.match(/http:\/\/([^:]+):/);
            return match ? match[1] : null;
          }).filter(Boolean);
          
          const uniqueIPs = [...new Set(workingIPs)];
          console.log('🌐 Working IP addresses:', uniqueIPs);
          
          // Log if the API is accessible via IP but not localhost
          if (uniqueIPs.some(ip => !['localhost', '127.0.0.1'].includes(ip))) {
            console.log('ℹ️ The API is accessible via IP address but might not be reachable via localhost');
          }
        } else {
          console.log('❌ No working connections found. Is the backend server running?');
          console.log('🔍 Troubleshooting tips:');
          console.log('  1. Verify the backend server is running (check terminal)');
          console.log('  2. Ensure the server is bound to 0.0.0.0 and not just 127.0.0.1');
          console.log('  3. Check for firewall rules blocking connections');
          console.log('  4. Verify both devices are on the same network');
          console.log('  5. Try restarting the backend server');
        }
      }
    } catch (error) {
      console.error('Diagnostics error:', error);
    }
    
    console.log('-------------------------------------');
    return true;
  }
}

export default NetworkDiagnostics;
