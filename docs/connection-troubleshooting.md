# choma App Connection Troubleshooting Guide

## Overview

This guide will help you troubleshoot and resolve connection issues between the choma mobile app and the backend server. These issues typically manifest as "Network request failed" errors when trying to log in or register.

## Quick Fixes

If you're experiencing connection issues, try these quick fixes:

1. **Check Connection**: Use the "Check Connection" button on the login screen to run diagnostics.
2. **Auto-Fix**: When a connection error occurs, tap "Auto-Fix" to attempt an automatic resolution.
3. **Run TCP Test**: This checks if the server is reachable at the network level.
4. **Run Diagnostics**: Provides a comprehensive analysis of connection issues.

## Common Issues & Solutions

### 1. "Network request failed" Error

**Possible causes:**

- Backend server is not running
- Server and device are on different networks
- Incorrect IP address configuration
- Firewall blocking connections
- Server listening on the wrong interface

**Solutions:**

- Verify the backend server is running
- Check that both devices are on the same WiFi network
- Use the "Auto-Fix" option to detect the correct IP address
- Ensure the server is listening on all interfaces (0.0.0.0)

### 2. API Connection Works But Login Fails

If you can connect to the server but authentication fails:

- Check your login credentials
- Verify the backend authentication service is running
- Look for any error messages in the server logs

### 3. Device-Specific Issues

#### Android Physical Devices

- **Problem**: By default, Android physical devices cannot connect to localhost
- **Solution**: Update the API URL in `constants.js` to use your computer's actual IP address (e.g., `http://192.168.0.108:5001/api`)

#### iOS Simulator

- **Problem**: iOS simulator needs to use localhost
- **Solution**: Use `http://localhost:5001/api` or `http://127.0.0.1:5001/api`

#### iOS Physical Devices

- **Problem**: Similar to Android, cannot connect to localhost
- **Solution**: Use your computer's actual IP address

## Advanced Troubleshooting

### Checking Server Configuration

1. Verify the server is listening on all interfaces (`0.0.0.0`) and not just localhost:

```javascript
// In backend/index.js
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});
```

1. Check the server logs for any error messages:

```bash
cd backend
npm start
```

### Testing Network Connectivity

1. **TCP Connection Test**: This checks if your device can reach the server at the TCP level, bypassing HTTP protocol issues.

2. **API Endpoint Test**: Tests if the server is responding to API requests.

3. **Comprehensive Diagnostics**: Runs a series of tests to identify the specific issue.

### Determining Your IP Address

To find your computer's IP address:

**Windows:**

1. Open Command Prompt
2. Type `ipconfig` and press Enter
3. Look for "IPv4 Address" under your active network adapter

**Mac:**

1. Open System Preferences
2. Go to Network
3. Select your active connection
4. Your IP address will be displayed

**Linux:**

1. Open Terminal
2. Type `ip addr` or `ifconfig` and press Enter
3. Look for "inet" followed by your IP address

## Developer Tools

The app includes several developer tools for diagnosing connection issues:

- `NetworkDiagnostics`: Basic diagnostic tools
- `ConnectionTest`: Tests and fixes API connections
- `TcpConnectionTest`: Low-level TCP connectivity testing
- `NetworkFix`: Comprehensive diagnosis and fixing tool

## Contact Support

If you continue to experience issues after trying these solutions, please contact our support team at [support@choma.com](mailto:support@choma.com) or open an issue on our GitHub repository.
