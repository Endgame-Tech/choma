# DM Sans Font Weight Global Fix

## Problem

Bold text was using system fonts instead of DM Sans because `fontWeight: 'bold'` without `fontFamily` falls back to system fonts.

## Solution

Created a global fix that automatically maps font weights to DM Sans font families.

## Usage

### 1. Replace StyleSheet.create with createStylesWithDMSans

**Before:**

```javascript
import { StyleSheet } from "react-native";

const styles = createStylesWithDMSans({
  boldText: {
    fontSize: 16,
    fontWeight: "bold", // Uses system bold font ❌
    color: "#000",
  },
});
```

**After:**

```javascript
import { createStylesWithDMSans } from "../utils/fontUtils";

const styles = createStylesWithDMSans({
  boldText: {
    fontSize: 16,
    fontWeight: "bold", // Automatically mapped to DMSans-Bold ✅
    color: "#000",
  },
});
```

### 2. Font Weight Mapping

The system automatically maps:

| fontWeight            | DM Sans Font Family |
| --------------------- | ------------------- |
| `100` or `'thin'`     | `DMSans-Thin`       |
| `200`                 | `DMSans-ExtraLight` |
| `300` or `'light'`    | `DMSans-Light`      |
| `400` or `'normal'`   | `DMSans-Regular`    |
| `500` or `'medium'`   | `DMSans-Medium`     |
| `600` or `'semibold'` | `DMSans-SemiBold`   |
| `700` or `'bold'`     | `DMSans-Bold`       |
| `800`                 | `DMSans-ExtraBold`  |
| `900` or `'black'`    | `DMSans-Black`      |

### 3. Migration Steps

1. **Import the function:**

   ```javascript
   import { createStylesWithDMSans } from "../utils/fontUtils";
   ```

2. **Replace StyleSheet.create:**

   ```javascript
   // Old
   const styles =createStylesWithDMSans({ ... });

   // New
   const styles = createStylesWithDMSans({ ... });
   ```

3. **Keep your existing fontWeight values** - they'll be automatically mapped!

### 4. Examples

```javascript
// All these will now use DM Sans fonts
const styles = createStylesWithDMSans({
  heading: {
    fontSize: 24,
    fontWeight: "bold", // → DMSans-Bold
  },
  subheading: {
    fontSize: 18,
    fontWeight: "600", // → DMSans-SemiBold
  },
  price: {
    fontSize: 20,
    fontWeight: 700, // → DMSans-Bold
  },
  body: {
    fontSize: 14,
    // No fontWeight = DMSans-Regular
  },
});
```

### 5. Advanced Usage

```javascript
import { mapFontWeight, transformStyleWithDMSans } from "../utils/fontUtils";

// Get specific DM Sans font
const boldFont = mapFontWeight("bold"); // "DMSans-Bold"

// Transform individual style object
const style = transformStyleWithDMSans({
  fontSize: 16,
  fontWeight: "600",
}); // { fontSize: 16, fontFamily: "DMSans-SemiBold" }
```

## Benefits

✅ **Automatic:** No need to manually specify font families
✅ **Consistent:** All bold text uses DM Sans Bold
✅ **Backward Compatible:** Existing code works without changes
✅ **Type Safe:** Handles both string and numeric font weights
✅ **Smart:** Preserves existing fontFamily if specified

## Testing

Use the demo component to test font weight mapping:

```javascript
import FontWeightDemo from "../components/demo/FontWeightDemo";
```

The demo shows all font weights rendered with proper DM Sans families.
