# 🔥 Firebase Push Notifications Setup Guide

## 🚨 Current Issue
```
WARN Failed to get push token: Default FirebaseApp is not initialized in this process com.anonymous.choma
```

## 📱 Step-by-Step Firebase Setup

### 1. Create Firebase Project
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Create a project"
3. Name: `choma-app` (or your preferred name)
4. Enable Google Analytics (optional)

### 2. Add Android App
1. Click "Add app" → Android
2. **Package name**: `com.choma.app` (must match app.json)
3. **App nickname**: `Choma Android`
4. Download `google-services.json`
5. Place file in: `/android/app/google-services.json`

### 3. Add iOS App  
1. Click "Add app" → iOS
2. **Bundle ID**: `com.choma.app` (must match app.json)
3. **App nickname**: `Choma iOS`
4. Download `GoogleService-Info.plist`
5. Place file in: `/ios/GoogleService-Info.plist`

### 4. Update app.json
Add Firebase configuration to your app.json:

\`\`\`json
{
  "expo": {
    "name": "Choma",
    "plugins": [
      [
        "expo-notifications",
        {
          "icon": "./assets/notification-icon.png",
          "color": "#ffffff"
        }
      ],
      "@react-native-firebase/app",
      "@react-native-firebase/messaging"
    ],
    "android": {
      "googleServicesFile": "./google-services.json"
    },
    "ios": {
      "googleServicesFile": "./GoogleService-Info.plist"
    }
  }
}
\`\`\`

### 5. Install Required Packages
\`\`\`bash
# Install Firebase packages
npm install @react-native-firebase/app @react-native-firebase/messaging

# For Expo managed workflow
expo install expo-notifications expo-device expo-constants
\`\`\`

## 🔧 Quick Fix for Development

Since you're in development mode, you can temporarily disable Firebase notifications:

### Update App.js
\`\`\`javascript
const registerForPushNotifications = async () => {
  try {
    // Skip push notifications in development to avoid Firebase errors
    if (__DEV__) {
      console.log('Skipping push notifications in development mode');
      return;
    }
    
    // Your existing push notification code...
  } catch (error) {
    console.log('Push notifications not available:', error.message);
  }
};
\`\`\`

## 🚀 Production Setup

### 1. Firebase Cloud Messaging (FCM) Setup
1. In Firebase Console → Project Settings
2. Cloud Messaging tab
3. Generate new private key for service account
4. Download the JSON file
5. Upload to your backend server

### 2. APNs Setup (iOS)
1. Apple Developer Account → Certificates
2. Create APNs certificate
3. Upload to Firebase Console
4. Configure in your backend

### 3. Backend Integration
Update your backend to use Firebase Admin SDK:

\`\`\`javascript
// backend/services/pushNotificationService.js
const admin = require('firebase-admin');

// Initialize Firebase Admin
const serviceAccount = require('./path-to-service-account.json');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

// Send notification
const sendPushNotification = async (token, title, body, data) => {
  const message = {
    notification: { title, body },
    data,
    token
  };
  
  try {
    const response = await admin.messaging().send(message);
    console.log('Successfully sent message:', response);
  } catch (error) {
    console.log('Error sending message:', error);
  }
};
\`\`\`

## ⚡ Immediate Development Fix

For now, to stop the Firebase error, update your App.js: