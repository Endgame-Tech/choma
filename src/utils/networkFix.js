// src/utils/networkFix.js
import { Platform, Alert } from 'react-native';
import { APP_CONFIG } from './constants';
import NetworkDiagnostics from './networkDiagnostics';
import TcpConnectionTest from './tcpConnectionTest';

/**
 * Network Fix Utility - Helper for diagnosing and fixing network issues
 */
const NetworkFix = {
  /**
   * Run a series of tests to diagnose the exact nature of network issues
   * @returns {Promise<Object>} Diagnosis results
   */
  async runDiagnosticSeries() {
    try {
      console.log('Running comprehensive network diagnostics...');
      
      // Check API connection
      const apiTest = await NetworkDiagnostics.testApiConnection();
      
      // If API works, no need for further tests
      if (apiTest.success) {
        return {
          success: true,
          apiConnection: true,
          message: 'API connection is working correctly'
        };
      }
      
      // API connection failed, check TCP connectivity
      console.log('API connection failed, checking direct TCP connectivity...');
      const tcpResults = await TcpConnectionTest.testAllServers();
      
      // Check if any TCP connection succeeded
      const successfulTcpConnections = Object.entries(tcpResults)
        .filter(([_, result]) => result.success)
        .map(([url]) => url);
      
      if (successfulTcpConnections.length > 0) {
        // TCP connection works but API doesn't
        return {
          success: false,
          apiConnection: false,
          tcpConnection: true,
          successfulTcpUrls: successfulTcpConnections,
          diagnosis: 'Server is reachable at TCP level but API endpoints are not responding',
          solution: 'The server is running but API endpoints might be misconfigured or throwing errors'
        };
      }
      
      // Neither API nor TCP works, check if on same network
      const networkInfo = await NetworkDiagnostics.getNetworkInfo();
      
      // Final diagnosis
      return {
        success: false,
        apiConnection: false,
        tcpConnection: false,
        networkConnected: networkInfo.connected,
        networkType: networkInfo.connectionType,
        diagnosis: 'Cannot connect to server at any level',
        solution: 'Verify server is running, check IP address, and ensure both devices are on same network'
      };
    } catch (error) {
      console.error('Diagnostic series error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  },
  
  /**
   * Display comprehensive network diagnostic information to the user
   */
  async showComprehensiveDiagnostics() {
    try {
      Alert.alert(
        'Running Diagnostics',
        'Running comprehensive network diagnostics...\nThis will take a few moments.',
        []
      );
      
      const diagnosis = await this.runDiagnosticSeries();
      
      if (diagnosis.success) {
        Alert.alert(
          'Diagnostics Complete',
          'All systems are functioning correctly! You have a working connection to the API.',
          [{ text: 'Great!' }]
        );
        return;
      }
      
      // Show different messages based on diagnosis
      if (diagnosis.tcpConnection) {
        // TCP works but API doesn't
        Alert.alert(
          'Partial Connection Issue',
          `Diagnosis: ${diagnosis.diagnosis}\n\nThe server is reachable at the TCP level, but the API endpoints are not responding correctly.\n\nPossible reasons:\n1. Server is running but has API errors\n2. API routes are misconfigured\n3. Server is starting up or in maintenance mode\n\nRecommendation: Check the server logs for errors and ensure the API is configured correctly.`,
          [{ text: 'OK' }]
        );
      } else {
        // Complete connection failure
        const platformSpecific = Platform.OS === 'android'
          ? 'On Android physical devices, you need to use your computer\'s actual IP address (not localhost or 10.0.2.2).'
          : 'On iOS simulator, make sure you\'re using localhost or 127.0.0.1.';
        
        Alert.alert(
          'Connection Failure',
          `Diagnosis: ${diagnosis.diagnosis}\n\nNetwork Status: ${diagnosis.networkConnected ? 'Connected' : 'Disconnected'}\nNetwork Type: ${diagnosis.networkType}\n\nRecommendations:\n1. Verify the server is running\n2. Check that the correct IP address is being used\n3. Ensure both devices are on the same WiFi network\n4. Verify the server is listening on 0.0.0.0 (all interfaces)\n5. Check for firewall restrictions\n\n${platformSpecific}`,
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('Show diagnostics error:', error);
      Alert.alert(
        'Diagnostics Error',
        `An error occurred while running diagnostics: ${error.message}`,
        [{ text: 'OK' }]
      );
    }
  },
  
  /**
   * Attempt to fix network issues automatically
   * @returns {Promise<boolean>} True if fix was successful
   */
  async attemptAutomaticFix() {
    try {
      console.log('Attempting to automatically fix network issues...');
      
      // Run diagnostics first
      const diagnosis = await this.runDiagnosticSeries();
      
      if (diagnosis.success) {
        Alert.alert(
          'No Fix Needed',
          'Your connection is already working correctly!',
          [{ text: 'OK' }]
        );
        return true;
      }
      
      // If TCP connection works but API doesn't, suggest endpoint changes
      if (diagnosis.tcpConnection && diagnosis.successfulTcpUrls?.length > 0) {
        const bestTcpUrl = diagnosis.successfulTcpUrls[0];
        const [ip, port] = bestTcpUrl.split(':');
        
        const suggestedApiUrl = `http://${ip}:${port}/api`;
        
        if (suggestedApiUrl === APP_CONFIG.API_BASE_URL) {
          // URL is correct but API still not working
          Alert.alert(
            'API Configuration Issue',
            `Your API URL (${APP_CONFIG.API_BASE_URL}) appears to be correct, but the API endpoints aren't responding.\n\nThis suggests an issue with the server itself rather than connectivity.\n\nCheck the server logs for API errors or restart the server.`,
            [{ text: 'OK' }]
          );
          return false;
        }
        
        // Suggest a URL change
        const shouldUpdateUrl = await new Promise(resolve => {
          Alert.alert(
            'Connection Fix Available',
            `Current URL: ${APP_CONFIG.API_BASE_URL}\nSuggested URL: ${suggestedApiUrl}\n\nWould you like to update to the suggested URL?\n\nNote: This would require updating the API_BASE_URL in src/utils/constants.js.`,
            [
              { text: 'No', style: 'cancel', onPress: () => resolve(false) },
              { text: 'Yes', onPress: () => resolve(true) }
            ]
          );
        });
        
        if (shouldUpdateUrl) {
          Alert.alert(
            'Manual Update Required',
            `Please update the API_BASE_URL in src/utils/constants.js to:\n\n${suggestedApiUrl}\n\nThis change needs to be made in your development environment.`,
            [{ text: 'OK' }]
          );
        }
        
        return shouldUpdateUrl;
      }
      
      // If nothing works, provide comprehensive troubleshooting
      const shouldShowTroubleshooting = await new Promise(resolve => {
        Alert.alert(
          'No Automatic Fix Available',
          'Unable to automatically fix the connection issue.\n\nWould you like to see detailed troubleshooting steps?',
          [
            { text: 'No', style: 'cancel', onPress: () => resolve(false) },
            { text: 'Yes', onPress: () => resolve(true) }
          ]
        );
      });
      
      if (shouldShowTroubleshooting) {
        this.showDetailedTroubleshooting();
      }
      
      return false;
    } catch (error) {
      console.error('Auto fix error:', error);
      Alert.alert(
        'Fix Error',
        `An error occurred while trying to fix the connection: ${error.message}`,
        [{ text: 'OK' }]
      );
      return false;
    }
  },
  
  /**
   * Show detailed troubleshooting steps
   */
  showDetailedTroubleshooting() {
    const platformSpecific = Platform.OS === 'android'
      ? '- For Android physical devices, update API_BASE_URL in constants.js to your computer\'s actual IP address (e.g., http://192.168.0.108:5001/api)\n- If using an emulator, try using 10.0.2.2 instead of localhost'
      : '- For iOS simulator, make sure you\'re using localhost or 127.0.0.1\n- For iOS physical devices, use your computer\'s actual IP address';
    
    Alert.alert(
      'Detailed Troubleshooting',
      `Server Checks:
- Verify the backend server is running (check terminal)
- Ensure the server is bound to 0.0.0.0 and not just 127.0.0.1
- Check server logs for any errors or warnings
- Try restarting the server

Network Checks:
- Ensure your device and computer are on the same WiFi network
- Check if your WiFi has client isolation enabled (prevents device-to-device communication)
- Try connecting to a different WiFi network
- Temporarily disable any VPNs

Device Checks:
- Toggle airplane mode off and on
- Restart your device
- Clear app cache or reinstall the app

Code Configuration:
${platformSpecific}

Advanced Checks:
- Check if firewall is blocking connections
- Try a different port if the current one is blocked
- Check if the server is overloaded or has crashed`,
      [{ text: 'OK' }]
    );
  }
};

export default NetworkFix;
