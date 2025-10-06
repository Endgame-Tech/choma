# Fix Missing Images Issue

Your local images aren't loading because of a Metro bundler cache issue. Follow these steps:

## Solution 1: Clear Metro Bundler Cache

```bash
# Stop the current dev server (Ctrl+C), then run:

# For Expo
npx expo start -c

# OR if using React Native CLI
npx react-native start --reset-cache

# Then rebuild the app
```

## Solution 2: Clear All Caches (if Solution 1 doesn't work)

```bash
# Stop the dev server first (Ctrl+C)

# Clear watchman cache
watchman watch-del-all

# Clear Metro cache
npx react-native start --reset-cache

# Clear node modules and reinstall
rm -rf node_modules
npm install

# For Android
cd android
./gradlew clean
cd ..

# Restart with cache clear
npx expo start -c
```

## Solution 3: Check Asset Configuration

Make sure your `metro.config.js` includes image extensions:

```javascript
module.exports = {
  resolver: {
    assetExts: ['png', 'jpg', 'jpeg', 'svg', 'gif', 'webp'],
  },
};
```

## Quick Fix Commands (Windows):

```bash
# Stop server (Ctrl+C), then:
cd C:\dev\choma\user-mobile
npx expo start -c --clear
```

## Why This Happens:

Metro bundler caches asset imports. When assets are moved/renamed or when code changes significantly (like our infinite scroll implementation), the cache can become stale and fail to load images properly.

The `-c` or `--clear` flag forces Metro to rebuild its cache from scratch.