# 🚀 Choma Mobile App - Production Build Guide

## ✅ Pre-build Checklist

### 1. Code Cleanup Completed
- [x] **Development files removed** - Network diagnostics, dev config, etc.
- [x] **Console statements cleaned** - Production-ready logging
- [x] **Duplicate files removed** - DashboardScreen copy, duplicate assets
- [x] **Commented code cleaned** - TODO/FIXME comments removed

### 2. Environment Configuration
- [ ] **Production Environment** - Configure `.env.production`
- [ ] **API Endpoints** - Update to production URLs
- [ ] **Paystack Keys** - Switch to LIVE keys (**CRITICAL**)
- [ ] **Analytics Setup** - Configure tracking services
- [ ] **Error Monitoring** - Setup Sentry or similar

### 3. App Store Preparation
- [ ] **App Icons** - All required sizes (1024x1024, etc.)
- [ ] **Splash Screens** - All device sizes
- [ ] **Screenshots** - App Store/Play Store screenshots
- [ ] **App Description** - Store listing content
- [ ] **Privacy Policy** - Required for app stores
- [ ] **Terms of Service** - Legal requirements

### 4. Certificates & Signing
- [ ] **iOS Certificates** - Apple Developer Program
- [ ] **Android Keystore** - Signed release build
- [ ] **Push Notifications** - APNs/FCM certificates

## 🔧 Environment Setup

### Step 1: Configure Production Environment
```bash
# Copy the template
cp .env.production.template .env.production

# Edit with your production values
nano .env.production
```

**Critical Variables to Update:**
```bash
API_BASE_URL=https://your-production-api.com
PAYSTACK_PUBLIC_KEY=pk_live_YOUR_LIVE_KEY  # ⚠️ MUST be LIVE key
PAYSTACK_SECRET_KEY=sk_live_YOUR_LIVE_KEY  # ⚠️ MUST be LIVE key
```

### Step 2: Update Constants File
Edit `src/utils/constants.js`:
```javascript
export const APP_CONFIG = {
  API_BASE_URL: 'https://your-production-api.com',
  PAYSTACK_PUBLIC_KEY: 'pk_live_your_live_key',
  ENVIRONMENT: 'production'
};
```

## 📱 Build Commands

### EAS Build (Recommended)

#### Initial Setup
```bash
# Install EAS CLI
npm install -g eas-cli

# Login to Expo
eas login

# Initialize EAS configuration
eas build:configure
```

#### Android Production Build
```bash
# Build AAB (App Bundle) for Play Store
eas build --platform android --profile production

# Build APK for testing
eas build --platform android --profile preview
```

#### iOS Production Build
```bash
# Build for App Store
eas build --platform ios --profile production

# Build for TestFlight
eas build --platform ios --profile preview
```

#### Build Both Platforms
```bash
eas build --platform all --profile production
```

### Legacy Expo Build (If needed)
```bash
# Android
expo build:android --type app-bundle

# iOS
expo build:ios --type archive
```

## 🏪 App Store Submission

### Google Play Store

1. **Prepare Release**
   ```bash
   # Build signed AAB
   eas build --platform android --profile production
   ```

2. **Upload to Play Console**
   - Go to [Google Play Console](https://play.google.com/console)
   - Create new app or select existing
   - Upload the AAB file
   - Fill in store listing details

3. **Store Listing Requirements**
   - App icon (512x512)
   - Feature graphic (1024x500)
   - Screenshots (phone, tablet, TV)
   - Short description (80 chars)
   - Full description (4000 chars)
   - Privacy policy URL

### Apple App Store

1. **Prepare Release**
   ```bash
   # Build for App Store
   eas build --platform ios --profile production
   ```

2. **Upload via App Store Connect**
   - Use Transporter app or Xcode
   - Or use EAS Submit: `eas submit --platform ios`

3. **Store Listing Requirements**
   - App icon (1024x1024)
   - Screenshots for all device sizes
   - App description
   - Keywords
   - Privacy policy URL

## 🔒 Security Checklist

### Production Security
- [ ] **API Keys** - All keys are production/live versions
- [ ] **HTTPS** - All API endpoints use HTTPS
- [ ] **Data Encryption** - Sensitive data encrypted
- [ ] **Authentication** - JWT tokens properly secured
- [ ] **Code Obfuscation** - Consider using ProGuard (Android)

### Privacy Compliance
- [ ] **Data Collection Disclosure** - What data you collect
- [ ] **Third-party Services** - Disclose Paystack, analytics, etc.
- [ ] **User Consent** - GDPR/CCPA compliance if applicable
- [ ] **Data Retention** - Clear policies

## ⚡ Performance Optimization

### Bundle Size Optimization
```bash
# Analyze bundle size
npx react-native-bundle-visualizer

# Clean unused dependencies
npm prune --production
```

### Image Optimization
- Use WebP format where possible
- Compress images (TinyPNG, ImageOptim)
- Use appropriate image sizes for different densities

### Code Optimization
- [x] **Console logs removed** - All development logging cleaned
- [x] **Dead code eliminated** - Unused imports/functions removed
- [ ] **Lazy loading** - Implement for large components
- [ ] **Code splitting** - Split large bundles

## 📊 Monitoring & Analytics

### Error Tracking
```bash
# Install Sentry (optional)
npm install @sentry/react-native

# Configure in App.js
import * as Sentry from '@sentry/react-native';

Sentry.init({
  dsn: 'YOUR_SENTRY_DSN',
});
```

### Analytics
- Configure Firebase Analytics or similar
- Track key user actions
- Monitor app performance
- Set up crash reporting

## 🧪 Testing Strategy

### Pre-Release Testing
1. **Unit Tests** - `npm test`
2. **Integration Tests** - API functionality
3. **E2E Tests** - Critical user flows
4. **Device Testing** - Multiple devices/OS versions
5. **Performance Testing** - Memory usage, startup time
6. **Payment Testing** - Test Paystack integration thoroughly

### Beta Testing
- **TestFlight (iOS)** - Apple's beta testing platform
- **Google Play Console (Android)** - Internal testing track
- **Expo Updates** - For quick fixes post-release

## 🚀 Deployment Checklist

### Final Pre-Deployment
- [ ] **All tests passing**
- [ ] **Production environment tested**
- [ ] **Payment flows verified with live keys**
- [ ] **Push notifications working**
- [ ] **Offline functionality tested**
- [ ] **App store assets uploaded**
- [ ] **Privacy policy updated**
- [ ] **Terms of service updated**

### Post-Deployment
- [ ] **Monitor crash reports**
- [ ] **Check payment transactions**
- [ ] **Monitor API performance**
- [ ] **Review user feedback**
- [ ] **Analytics setup verified**

## 📞 Support & Maintenance

### Production Support
- Monitor error logs
- Track payment success rates
- Monitor API response times
- User feedback analysis

### Update Strategy
- Use Expo Updates for minor fixes
- Plan major updates through app stores
- Maintain backward compatibility

## 🆘 Troubleshooting

### Common Build Issues
```bash
# Clear cache and reinstall
expo install --fix
rm -rf node_modules package-lock.json
npm install

# Clear Metro cache
npx react-native start --reset-cache
```

### App Store Rejection Issues
- Review App Store Guidelines
- Common issues: privacy policy, in-app purchases, content
- Test thoroughly before submission

---

## 📋 Quick Commands Reference

```bash
# Production build (both platforms)
eas build --platform all --profile production

# Submit to stores
eas submit --platform ios
eas submit --platform android

# Emergency update
eas update --branch production

# Monitor builds
eas build:list

# View logs
eas build:view [build-id]
```

---

**🔥 IMPORTANT REMINDERS:**
1. **NEVER** use test Paystack keys in production
2. **ALWAYS** test payment flows with live keys before release
3. **VERIFY** all API endpoints point to production servers
4. **TEST** the app thoroughly on real devices
5. **BACKUP** your keystore and certificates securely