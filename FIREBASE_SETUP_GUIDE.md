# Firebase Push Notifications Setup Guide

Your choma app now has complete Firebase FCM (Firebase Cloud Messaging) integration for production push notifications! Here's what's been implemented and what you need to do to complete the setup.

## 🎉 What's Already Implemented

### ✅ Frontend (React Native)

- **Firebase Service** (`src/services/firebaseService.js`) - Complete Firebase messaging wrapper
- **Notification Context** - Enhanced with Firebase FCM support and Expo fallback
- **App Configuration** (`app.json`) - Firebase plugins configured for both Android & iOS
- **Hybrid Token System** - Automatically uses Firebase for production, Expo for development

### ✅ Backend (Node.js)

- **Firebase Admin SDK** - Installed and configured
- **Push Notification Service** - Enhanced to support both FCM and Expo tokens
- **Dual Token Support** - Backend automatically detects token type and uses appropriate service

## 🔧 What You Need to Complete

### 1. Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Create a project" or "Add project"
3. Name your project (e.g., "choma-app")
4. Enable Google Analytics (optional)
5. Complete project creation

### 2. Enable Cloud Messaging

1. In your Firebase project, go to **Project Settings** (gear icon)
2. Click on the **Cloud Messaging** tab
3. Note your **Server Key** and **Sender ID** (you'll need these)

### 3. Add Android App

1. Click **Add app** → **Android**
2. Use your Android package name (from `app.json` → `expo.android.package`)
3. Download `google-services.json`
4. **Replace** the placeholder file: `android/app/google-services.json`

### 4. Add iOS App

1. Click **Add app** → **iOS**
2. Use your iOS bundle identifier (from `app.json` → `expo.ios.bundleIdentifier`)
3. Download `GoogleService-Info.plist`
4. **Replace** the placeholder file: `ios/GoogleService-Info.plist`

### 5. Create Service Account Key

1. Go to **Project Settings** → **Service Accounts**
2. Click **Generate new private key**
3. Download the JSON file
4. **Replace** the placeholder file: `backend/config/firebase-service-account.json`

### 6. Update Environment Variables

Add to your backend `.env` file:

```env
# Firebase Configuration
FIREBASE_PROJECT_ID=your-firebase-project-id
FIREBASE_PRIVATE_KEY_ID=your-private-key-id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR_PRIVATE_KEY\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com
```

## 🚀 How It Works

### Development Mode

- Uses **Expo Push Notifications** for easy testing
- No Firebase setup required for development
- Works seamlessly in Expo Go app

### Production Mode

- Automatically detects Firebase availability
- Uses **Firebase FCM** for production-grade notifications
- Falls back to Expo if Firebase not configured
- Better delivery rates and reliability

### Backend Intelligence

```javascript
// Backend automatically detects token type
await pushNotificationService.sendPushNotification({
  to: userToken,
  title: "Order Confirmed!",
  body: "Your meal is being prepared.",
  tokenType: "fcm", // or "expo"
});
```

### Frontend Auto-Detection

```javascript
// Frontend tries Firebase first, falls back to Expo
try {
  // Try Firebase FCM (production)
  pushToken = await firebaseService.initializeFirebase();
  await registerPushToken(pushToken, "fcm");
} catch (error) {
  // Fallback to Expo (development)
  pushToken = await Notifications.getExpoPushTokenAsync();
  await registerPushToken(pushToken, "expo");
}
```

## 🧪 Testing

### Test Firebase Integration

1. Complete Firebase setup above
2. Build your app (`expo build` or `eas build`)
3. Install on real device
4. Test notifications work properly

### Test Expo Fallback

1. Run in Expo Go app (development)
2. Firebase won't be available
3. Should automatically use Expo notifications
4. Verify both systems work independently

## 📱 Build Configuration

Your `app.json` is already configured with:

```json
{
  "expo": {
    "plugins": [
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
```

## 🔒 Security Notes

- **Never commit** real Firebase config files to version control
- Add to `.gitignore`:

  ```ins
  google-services.json
  GoogleService-Info.plist
  firebase-service-account.json

  ```ins
- Use environment variables for sensitive Firebase config in production

## 🆘 Troubleshooting

### Firebase Not Working?

- Check console logs for Firebase initialization errors
- Verify config files are in correct locations
- Ensure Firebase project has Cloud Messaging enabled

### Expo Fallback Not Working?

- Check Expo push notification permissions
- Verify EXPO_ACCESS_TOKEN in backend environment
- Test in Expo Go app first

### Backend Errors?

- Check Firebase service account permissions
- Verify firebase-admin package is installed
- Ensure config file structure matches expected format

## ✅ Next Steps

1. **Replace placeholder config files** with real Firebase credentials
2. **Test on physical device** with production build
3. **Set up notification channels** for different message types
4. **Monitor delivery rates** in Firebase Console
5. **Set up A/B testing** for notification content (optional)

Your app now has enterprise-grade push notification infrastructure that will scale with your business! 🚀
