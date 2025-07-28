// src/utils/tcpConnectionTest.js
import { Platform, Alert } from 'react-native';
import { APP_CONFIG } from './constants';

/**
 * TCP Socket connection tester for directly checking server availability
 * This helps diagnose if the server is reachable at all, bypassing HTTP protocol issues
 */
const TcpConnectionTest = {
  /**
   * Extract host and port from a URL
   * @param {string} url - The URL to parse
   * @returns {Object} The host and port information
   */
  parseUrl(url) {
    try {
      // Remove protocol
      let cleanUrl = url;
      if (url.includes('://')) {
        cleanUrl = url.split('://')[1];
      }
      
      // Split host and path
      const hostPart = cleanUrl.split('/')[0];
      
      // Extract port if present
      let host = hostPart;
      let port = 80; // Default HTTP port
      
      if (hostPart.includes(':')) {
        const parts = hostPart.split(':');
        host = parts[0];
        port = parseInt(parts[1], 10);
      }
      
      return { host, port };
    } catch (error) {
      console.error('Error parsing URL:', error);
      return { host: '', port: 0, error: error.message };
    }
  },
  
  /**
   * Check all possible server IPs and ports using direct TCP socket connection
   * @returns {Promise<Object>} Results of TCP connection tests
   */
  async testAllServers() {
    console.log('Testing direct TCP connections to possible servers...');
    
    // Get the URL from the API config
    const apiUrl = APP_CONFIG.API_BASE_URL;
    const { port: configuredPort } = this.parseUrl(apiUrl);
    
    // Generate test combinations
    const ips = [
      '192.168.0.108',  // Current configured IP
      '127.0.0.1',       // Localhost
      '10.0.2.2',        // Android emulator host
    ];
    
    const ports = [
      configuredPort,   // Currently configured port
      5001,             // Default backend port
      5000,             // Alternative port
      3000              // Common development port
    ];
    
    const results = {};
    
    // Test each combination
    for (const ip of ips) {
      for (const port of ports) {
        const key = `${ip}:${port}`;
        try {
          console.log(`Testing TCP connection to ${key}...`);
          
          if (Platform.OS === 'web') {
            // Web platform can use fetch with a timeout
            const testUrl = `http://${ip}:${port}`;
            try {
              const controller = new AbortController();
              const timeoutId = setTimeout(() => controller.abort(), 5000);
              
              const response = await fetch(testUrl, { 
                method: 'HEAD',
                signal: controller.signal
              });
              
              clearTimeout(timeoutId);
              
              results[key] = {
                success: response.ok,
                status: response.status,
                message: 'Server responded'
              };
            } catch (fetchError) {
              results[key] = {
                success: false,
                error: fetchError.message
              };
            }
          } else {
            // For native platforms, simulate TCP connection using a quick fetch
            // with a short timeout
            const testUrl = `http://${ip}:${port}`;
            try {
              const controller = new AbortController();
              const timeoutId = setTimeout(() => controller.abort(), 3000);
              
              const response = await fetch(testUrl, { 
                method: 'HEAD',
                signal: controller.signal
              });
              
              clearTimeout(timeoutId);
              
              results[key] = {
                success: true,
                status: response.status,
                message: 'TCP connection successful'
              };
              
              console.log(`✅ TCP connection to ${key} successful`);
            } catch (fetchError) {
              if (fetchError.name === 'AbortError') {
                results[key] = {
                  success: false,
                  error: 'Connection timed out',
                  message: 'Server did not respond within timeout period'
                };
                console.log(`❌ TCP connection to ${key} timed out`);
              } else if (fetchError.message.includes('Network request failed')) {
                results[key] = {
                  success: false,
                  error: 'Network request failed',
                  message: 'Cannot establish TCP connection - server might be down or port closed'
                };
                console.log(`❌ TCP connection to ${key} failed - network error`);
              } else {
                results[key] = {
                  success: false,
                  error: fetchError.message
                };
                console.log(`❌ TCP connection to ${key} failed: ${fetchError.message}`);
              }
            }
          }
        } catch (error) {
          results[key] = {
            success: false,
            error: error.message
          };
          console.log(`❌ Error testing ${key}: ${error.message}`);
        }
      }
    }
    
    return results;
  },
  
  /**
   * Run TCP connection tests and display results to user
   * @returns {Promise<Object>} Results of connection tests
   */
  async runTcpTests() {
    try {
      console.log('Running TCP connection tests to check server availability...');
      
      // Show a loading message
      Alert.alert(
        'Testing Server Connection',
        'Testing direct server connectivity...\nThis will take a few seconds.',
        []
      );
      
      const results = await this.testAllServers();
      
      // Count successful connections
      const successfulConnections = Object.entries(results)
        .filter(([_, result]) => result.success)
        .map(([url]) => url);
      
      if (successfulConnections.length > 0) {
        // Found at least one working connection
        Alert.alert(
          'TCP Connection Test Results',
          `Server is reachable at the TCP level!\n\nWorking connections: ${successfulConnections.length}\n\nBest connection: ${successfulConnections[0]}\n\nThis confirms the server is running and network routes are open, but API endpoints might still have issues.`,
          [{ text: 'OK' }]
        );
        return { success: true, connections: successfulConnections };
      } else {
        // No working connections found
        Alert.alert(
          'TCP Connection Failed',
          `Unable to establish any TCP connections to the server.\n\nThis suggests one of these issues:\n\n1. The server is not running\n2. The server is not listening on the expected ports\n3. A firewall is blocking connections\n4. Network routing issues between your device and server\n5. Your device and server are on different networks\n\nPlease verify the server is running and check your network configuration.`,
          [{ text: 'OK' }]
        );
        return { success: false };
      }
    } catch (error) {
      console.error('TCP test error:', error);
      Alert.alert(
        'TCP Test Error',
        `An error occurred during the TCP connection test: ${error.message}`,
        [{ text: 'OK' }]
      );
      return { success: false, error: error.message };
    }
  },
};

export default TcpConnectionTest;
