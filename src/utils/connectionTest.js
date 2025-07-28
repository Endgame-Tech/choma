// src/utils/connectionTest.js
import { Alert, Platform, Linking } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { APP_CONFIG } from './constants';
import NetworkDiagnostics from './networkDiagnostics';
import TcpConnectionTest from './tcpConnectionTest';

/**
 * Simple utility to test backend connection and troubleshoot issues
 */
const ConnectionTest = {
  /**
   * Test and display connection status
   * @returns {Promise<boolean>} True if connection successful, false otherwise
   */
  async testAndDisplayStatus() {
    try {
      console.log('Testing connection to backend server...');
      console.log('Current API URL:', APP_CONFIG.API_BASE_URL);
      
      // Check network connectivity first
      const networkInfo = await NetInfo.fetch();
      if (!networkInfo.isConnected) {
        Alert.alert(
          'No Network Connection',
          'Your device is not connected to the internet. Please check your Wi-Fi or mobile data connection.',
          [{ text: 'OK' }]
        );
        return false;
      }
      
      // Run diagnostics
      const result = await NetworkDiagnostics.testApiConnection();
      
      if (result.success) {
        Alert.alert(
          'Connection Successful!',
          `Successfully connected to: ${result.testedUrl || APP_CONFIG.API_BASE_URL}\n\nServer Status: ${result.data.status}\nUptime: ${result.data.uptime ? `${result.data.uptime.toFixed(2)} seconds` : 'N/A'}`,
          [{ text: 'OK' }]
        );
        return true;
      } else {
        // Connection failed, run a more comprehensive test
        console.log('Connection failed, testing alternative connections...');
        const allTests = await NetworkDiagnostics.testAllConnections();
        
        // Find successful connections
        const successfulConnections = Object.entries(allTests)
          .filter(([_, result]) => result.success)
          .map(([url]) => url);
          
        if (successfulConnections.length > 0) {
          const betterUrl = this.findBestUrl(successfulConnections);
          
          // Format the message based on platform and findings
          const message = Platform.select({
            ios: `Failed to connect to: ${APP_CONFIG.API_BASE_URL}\n\nWorking alternative found: ${betterUrl}\n\nYou should update your API_BASE_URL in constants.js to this URL.`,
            android: `Failed to connect to: ${APP_CONFIG.API_BASE_URL}\n\nWorking alternative found: ${betterUrl}\n\nYour current API URL is not working on your physical device. Update the API_BASE_URL in constants.js to match your computer's actual IP address.`
          });
          
          Alert.alert(
            'Connection Failed - Alternative Found',
            message,
            [
              { text: 'Cancel', style: 'cancel' },
              { 
                text: 'Auto-Fix Connection', 
                onPress: () => this.attemptAutoFix() 
              }
            ]
          );
        } else {
          const troubleshootingSteps = Platform.select({
            ios: '1. Make sure your backend server is running\n2. Check if both devices are on the same network\n3. Try using localhost or 127.0.0.1 for iOS simulator\n4. Check firewall or network restrictions',
            android: '1. Make sure your backend server is running\n2. Check that your computer\'s firewall allows connections\n3. Use your computer\'s actual IP address (not localhost/10.0.2.2)\n4. Make sure your backend is listening on 0.0.0.0 not just 127.0.0.1\n5. Verify your device and computer are on the same WiFi network'
          });
          
          Alert.alert(
            'Connection Failed',
            `Failed to connect to the backend server.\n\nError: ${result.error}\n\nDetails: ${result.details || ''}\n\nTroubleshooting steps:\n${troubleshootingSteps}`,
            [{ text: 'OK' }]
          );
        }
        return false;
      }
    } catch (error) {
      console.error('Connection test error:', error);
      Alert.alert(
        'Connection Test Error',
        `An error occurred while testing the connection: ${error.message}`,
        [{ text: 'OK' }]      );
      return false;
    }
  },
  
  /**
   * Find the best URL from a list of working URLs
   * @param {Array<string>} urls List of working URLs
   * @returns {string} The best URL for the current platform
   */
  findBestUrl(urls) {
    if (urls.length === 0) return null;
    
    // For Android physical devices, prioritize IP addresses over localhost/10.0.2.2
    if (Platform.OS === 'android') {
      // Filter out localhost and 10.0.2.2 (Android emulator)
      const realIpUrls = urls.filter(url => 
        !url.includes('localhost') && !url.includes('127.0.0.1') && !url.includes('10.0.2.2')
      );
      
      if (realIpUrls.length > 0) {
        return realIpUrls[0]; // Return the first real IP URL
      }
    }
    
    // For iOS simulator, prioritize localhost
    if (Platform.OS === 'ios' && !__DEV__) {
      const localhostUrls = urls.filter(url => 
        url.includes('localhost') || url.includes('127.0.0.1')
      );
      
      if (localhostUrls.length > 0) {
        return localhostUrls[0];
      }
    }
    
    // Default to the first working URL
    return urls[0];
  },
  
  /**
   * Test connection and suggest the best API URL for the current environment
   * @returns {Promise<{success: boolean, bestUrl: string|null}>} Connection test results
   */
  async getBestApiUrl() {
    try {
      console.log('Finding best API URL for current environment...');
      
      // Test current API connection first
      const currentUrlTest = await NetworkDiagnostics.testApiConnection();
      
      if (currentUrlTest.success) {
        // Current URL works, no need to change
        console.log('Current API URL is working correctly:', APP_CONFIG.API_BASE_URL);
        return { success: true, bestUrl: APP_CONFIG.API_BASE_URL };
      }
      
      // Current URL doesn't work, test alternatives
      console.log('Current API URL is not working, testing alternatives...');
      const allTests = await NetworkDiagnostics.testAllConnections();
      
      // Find successful connections
      const successfulUrls = Object.entries(allTests)
        .filter(([_, result]) => result.success)
        .map(([url]) => url);
        
      if (successfulUrls.length > 0) {
        // Find the best URL for the current platform
        const bestUrl = this.findBestUrl(successfulUrls);
        console.log('Found best API URL:', bestUrl);
        return { success: true, bestUrl };
      }
      
      // No working URLs found
      console.log('No working API URLs found');
      return { success: false, bestUrl: null };
    } catch (error) {
      console.error('Error finding best API URL:', error);      return { success: false, bestUrl: null, error: error.message };
    }
  },
  
  /**
   * Attempt to auto-fix connection issues by finding the best working URL
   * and alerting the user with information
   * @returns {Promise<boolean>} True if fixed, false otherwise
   */
  async attemptAutoFix() {
    try {
      const result = await this.getBestApiUrl();
      
      if (result.success && result.bestUrl) {
        if (result.bestUrl === APP_CONFIG.API_BASE_URL) {
          // Current URL is already working
          Alert.alert(
            'Connection OK',
            'Your connection to the backend is working correctly.',
            [{ text: 'OK' }]
          );
          return true;
        } else {
          // Found a better URL
          const platformSpecificMessage = Platform.OS === 'android' 
            ? 'For Android physical devices, you should use your computer\'s actual IP address instead of localhost or 10.0.2.2.'
            : 'For iOS simulators, localhost or 127.0.0.1 is recommended.';
          
          Alert.alert(
            'Connection Issue Detected',
            `Your current API URL (${APP_CONFIG.API_BASE_URL}) is not working.\n\nA working alternative has been found: ${result.bestUrl}\n\n${platformSpecificMessage}\n\nYou should update your API_BASE_URL in constants.js to this URL.`,
            [{ text: 'OK' }]
          );
          return true;
        }
      } else {
        // No working URLs found
        const backendTips = Platform.OS === 'android'
          ? '1. Make sure the backend server is running\n2. Check that your server is listening on 0.0.0.0 (not just 127.0.0.1)\n3. Verify your device and computer are on the same WiFi network\n4. Check if your firewall is blocking connections\n5. Try restarting your backend server'
          : '1. Make sure the backend server is running\n2. Check your network connection\n3. Verify the server port is correct\n4. Try restarting your backend server';
        
        Alert.alert(
          'Connection Issues',
          `Unable to find a working connection to the backend server.\n\nTroubleshooting tips:\n${backendTips}`,
          [{ text: 'OK' }]
        );
        return false;
      }
    } catch (error) {
      console.error('Auto-fix error:', error);
      Alert.alert(
        'Connection Fix Error',
        `An error occurred while trying to fix the connection: ${error.message}`,
        [{ text: 'OK' }]
      );
      return false;
    }
  },
  
  /**
   * Perform a deep connection test, including TCP level connectivity
   * This is a more thorough test that checks basic connectivity first,
   * then TCP connectivity, and finally API endpoints
   * @returns {Promise<boolean>} True if any connection succeeded
   */
  async performDeepConnectionTest() {
    try {
      console.log('Performing deep connection test...');
      
      // Check network connectivity first
      const networkInfo = await NetInfo.fetch();
      if (!networkInfo.isConnected) {
        Alert.alert(
          'No Network Connection',
          'Your device is not connected to the internet. Please check your Wi-Fi or mobile data connection.',
          [{ text: 'OK' }]
        );
        return false;
      }
      
      // Start with the regular API test
      const apiResult = await NetworkDiagnostics.testApiConnection();
      
      if (apiResult.success) {
        // API is fully working
        Alert.alert(
          'Connection Successful!',
          `Successfully connected to: ${apiResult.testedUrl || APP_CONFIG.API_BASE_URL}\n\nServer Status: ${apiResult.data.status}\n\nAll systems working correctly.`,
          [{ text: 'OK' }]
        );
        return true;
      }
      
      // API test failed, try TCP test
      console.log('API test failed, checking TCP connectivity...');
      const tcpResults = await TcpConnectionTest.testAllServers();
      
      // Check if any TCP connection succeeded
      const successfulTcpConnections = Object.entries(tcpResults)
        .filter(([_, result]) => result.success)
        .map(([url]) => url);
      
      if (successfulTcpConnections.length > 0) {
        // TCP connection works but API doesn't - likely an API endpoint issue
        const bestTcpConnection = successfulTcpConnections[0];
        const shouldFixApiUrl = await new Promise(resolve => {
          Alert.alert(
            'Partial Connection Issue',
            `TCP connection successful to: ${bestTcpConnection}\n\nHowever, the API endpoints are not responding correctly. This suggests the server is running but the API might have issues.\n\nDo you want to check if the API base URL needs to be updated?`,
            [
              { text: 'No', style: 'cancel', onPress: () => resolve(false) },
              { text: 'Yes', onPress: () => resolve(true) }
            ]
          );
        });
        
        if (shouldFixApiUrl) {
          return this.attemptAutoFix();
        }
        
        return false;
      }      
      // Neither API nor TCP connections work
      const showTroubleshooting = await new Promise(resolve => {
        Alert.alert(
          'Connection Failed',
          `Unable to connect to the server at any level.\n\nThis suggests one of these issues:\n\n1. The server is not running\n2. The server is on a different network\n3. A firewall is blocking the connection\n4. The IP address is incorrect\n\nWould you like to see troubleshooting steps?`,
          [
            { text: 'No', style: 'cancel', onPress: () => resolve(false) },
            { text: 'Yes', onPress: () => resolve(true) }
          ]
        );
      });
      
      if (showTroubleshooting) {
        this.showTroubleshootingSteps();
      }
      
      return false;
    } catch (error) {
      console.error('Deep connection test error:', error);
      Alert.alert(
        'Connection Test Error',
        `An error occurred during the connection test: ${error.message}`,
        [{ text: 'OK' }]
      );
      return false;
    }
  },
  
  /**
   * Show detailed troubleshooting steps
   */
  showTroubleshootingSteps() {
    Alert.alert(
      'Troubleshooting Steps',
      `1. Verify Server is Running:
- Check if the backend server process is running
- Look for any error messages in the server console
- Try restarting the server

2. Network Configuration:
- Ensure your device and server are on the same WiFi network
- Check if the server is configured to listen on 0.0.0.0 (all interfaces)
- Verify the correct IP address is being used (${APP_CONFIG.API_BASE_URL})

3. Firewall Issues:
- Check if a firewall is blocking the connection
- Temporarily disable firewall to test

4. Port Availability:
- Make sure the port is not being used by another application
- Try a different port if needed

5. Device Settings:
- Toggle airplane mode off and on
- Restart your device
- Clear app cache`,
      [{ text: 'OK' }]
    );
  },
};

export default ConnectionTest;
