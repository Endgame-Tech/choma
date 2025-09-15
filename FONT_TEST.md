# DM Sans Font Test Instructions

## Quick Test Code
Add this to any screen component you can navigate to (like HomeScreen):

```javascript
import { areFontsLoaded } from '../utils/fontLoader';
import { DMSansFonts } from '../constants/fonts';

// Add this button to your render method:
<TouchableOpacity
  onPress={() => {
    const status = areFontsLoaded() ? 'Loaded ✅' : 'Not Loaded ❌';
    Alert.alert('Font Status', `DM Sans fonts are: ${status}`);
  }}
  style={{ padding: 15, backgroundColor: '#007AFF', margin: 10 }}
>
  <Text style={{ 
    fontFamily: DMSansFonts.semiBold, 
    color: '#fff', 
    textAlign: 'center' 
  }}>
    Test DM Sans Fonts
  </Text>
</TouchableOpacity>
```

## What Should Happen:
1. **App Loading**: You should see "Loading fonts..." message
2. **Font Test**: The test button text should appear in DM Sans SemiBold
3. **Alert**: Clicking button should show "Loaded ✅"

## Troubleshooting:
- If fonts show "Not Loaded", check console for error messages
- If app crashes, check that all font files exist in `/assets/fonts/`
- If button text looks like system font, fonts aren't loading properly

## Navigation to Demo:
To access the full demo screen, add this to your navigation:
```javascript
import DmSansDemoHomeScreen from '../screens/test/DmSansDemoHomeScreen';

// Add to your stack navigator:
<Stack.Screen name="FontDemo" component={DmSansDemoHomeScreen} />
```

Then navigate with:
```javascript
navigation.navigate('FontDemo');
```