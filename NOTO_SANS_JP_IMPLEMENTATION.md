# Noto Sans JP Font Implementation Guide

## Overview
All text in the app now uses **Noto Sans Japanese (Noto Sans JP)** font for proper Japanese character rendering. This ensures beautiful, consistent typography across the entire app for the Japanese market.

## Installation Complete ✅

The following packages have been installed:
- `@expo-google-fonts/noto-sans-jp` - Noto Sans JP font family
- `expo-font` - Font loading utilities
- `expo-splash-screen` - Splash screen management

## Font Weights Available

- **Regular (400)**: `NotoSansJP_400Regular`
- **Medium (500)**: `NotoSansJP_500Medium`
- **SemiBold (600)**: `NotoSansJP_600SemiBold`
- **Bold (700)**: `NotoSansJP_700Bold`

## How to Use

### Method 1: Using Typography Helper (Recommended)

In your `StyleSheet.create()`, add `fontFamily` using the helper:

```typescript
import { Typography } from '../constants/typography';

const styles = StyleSheet.create({
  title: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.bold,
    fontFamily: Typography.getFontFamily(Typography.fontWeight.bold),
    color: Colors.text.primary,
  },
  body: {
    fontSize: Typography.fontSize.base,
    fontFamily: Typography.fontFamily.regular, // or use getFontFamily('400')
    color: Colors.text.secondary,
  },
});
```

### Method 2: Using Custom Text Component

Import and use the custom Text component (automatically applies font):

```typescript
import { Text } from '../components/Text';

// Regular text
<Text>通常のテキスト</Text>

// Bold text
<Text fontWeight="bold">太字のテキスト</Text>

// Semi-bold text
<Text fontWeight="semibold">セミボールドのテキスト</Text>

// Medium text
<Text fontWeight="medium">ミディアムのテキスト</Text>
```

### Method 3: Direct Font Family Reference

Use the font family constants directly:

```typescript
import { Typography } from '../constants/typography';

const styles = StyleSheet.create({
  myText: {
    fontSize: 16,
    fontFamily: Typography.fontFamily.regular,
  },
  myBoldText: {
    fontSize: 18,
    fontFamily: Typography.fontFamily.bold,
  },
});
```

## Migration Guide

### Step 1: Update StyleSheet Definitions

Find all `StyleSheet.create()` calls and add `fontFamily`:

**Before:**
```typescript
const styles = StyleSheet.create({
  title: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.bold,
  },
});
```

**After:**
```typescript
const styles = StyleSheet.create({
  title: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.bold,
    fontFamily: Typography.getFontFamily(Typography.fontWeight.bold),
  },
});
```

### Step 2: Update Dynamic Styles

For dynamic styles created inline or in functions:

**Before:**
```typescript
const textStyle: TextStyle = {
  fontSize: Typography.fontSize.base,
  fontWeight: Typography.fontWeight.semibold,
};
```

**After:**
```typescript
const textStyle: TextStyle = {
  fontSize: Typography.fontSize.base,
  fontWeight: Typography.fontWeight.semibold,
  fontFamily: Typography.getFontFamily(Typography.fontWeight.semibold),
};
```

### Step 3: Replace Text Components (Optional)

If you want to use the custom Text component wrapper:

**Before:**
```typescript
import { Text } from 'react-native';

<Text style={styles.title}>タイトル</Text>
```

**After:**
```typescript
import { Text } from '../components/Text';

<Text style={styles.title} fontWeight="bold">タイトル</Text>
```

## Font Weight Mapping

| Font Weight | Typography Constant | Font Family |
|------------|-------------------|-------------|
| normal (400) | `Typography.fontWeight.normal` | `NotoSansJP_400Regular` |
| medium (500) | `Typography.fontWeight.medium` | `NotoSansJP_500Medium` |
| semibold (600) | `Typography.fontWeight.semibold` | `NotoSansJP_600SemiBold` |
| bold (700) | `Typography.fontWeight.bold` | `NotoSansJP_700Bold` |

## Examples

### Button Component
```typescript
const getTextStyle = (): TextStyle => {
  return {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
    fontFamily: Typography.getFontFamily(Typography.fontWeight.semibold),
    color: Colors.white,
  };
};
```

### Screen Title
```typescript
const styles = StyleSheet.create({
  screenTitle: {
    fontSize: Typography.fontSize['2xl'],
    fontWeight: Typography.fontWeight.bold,
    fontFamily: Typography.getFontFamily(Typography.fontWeight.bold),
    color: Colors.text.primary,
  },
});
```

### Body Text
```typescript
const styles = StyleSheet.create({
  bodyText: {
    fontSize: Typography.fontSize.base,
    fontFamily: Typography.fontFamily.regular,
    color: Colors.text.secondary,
    lineHeight: Typography.lineHeight.normal * Typography.fontSize.base,
  },
});
```

## Files Already Updated

✅ `App.tsx` - Font loading configured
✅ `src/constants/typography.ts` - Font family constants added
✅ `src/components/Button.tsx` - Button text uses Noto Sans JP
✅ `src/components/ErrorBoundary.tsx` - Error messages use Noto Sans JP
✅ `src/components/Text.tsx` - Custom Text component created

## Remaining Work

You'll need to update StyleSheet definitions in these files (and others):
- `src/screens/*.tsx` - All screen components
- `src/components/*.tsx` - All other components

### Quick Search Pattern

To find files that need updating, search for:
```bash
grep -r "fontWeight:" src/ --include="*.tsx" --include="*.ts"
```

Then add `fontFamily` after each `fontWeight` property.

## Testing

After updating components:

1. **Clear cache and rebuild:**
   ```bash
   npm start -- --clear
   ```

2. **Test on device/simulator:**
   - Verify all Japanese text renders correctly
   - Check font weights display properly
   - Ensure no font fallbacks occur

3. **Check console:**
   - No font loading errors
   - Fonts load before app renders

## Troubleshooting

### Fonts not loading?
- Check that `App.tsx` properly loads fonts
- Verify fonts are loaded before rendering content
- Check console for font loading errors

### Font not applying?
- Make sure `fontFamily` is set in StyleSheet
- Verify font name matches exactly (case-sensitive)
- Check that fonts were loaded successfully

### TypeScript errors?
- Ensure `Typography` is imported correctly
- Check that `getFontFamily` is called with correct weight

## Notes

- **Monospace fonts**: Keep `fontFamily: "monospace"` for code/technical text (like error details)
- **Icons**: Font changes don't affect icons (Ionicons, etc.)
- **Performance**: Fonts are loaded once at app startup, minimal performance impact
- **Fallback**: If fonts fail to load, React Native will use system default fonts

## Complete Implementation Checklist

- [x] Install font packages
- [x] Configure font loading in App.tsx
- [x] Add font constants to Typography
- [x] Create helper function `getFontFamily()`
- [x] Update Button component
- [x] Update ErrorBoundary component
- [x] Create custom Text component
- [x] Update HomeScreen
- [x] Update AuthScreen
- [ ] Update ChatScreen
- [ ] Update UserProfileScreen
- [ ] Update MessagesScreen
- [ ] Update SearchScreen
- [ ] Update all other screen components
- [ ] Update all other components
- [ ] Test on iOS device
- [ ] Test on Android device
- [ ] Verify all Japanese text renders correctly

## 📋 Migration Progress

See `FONT_MIGRATION_GUIDE.md` for detailed migration instructions and progress tracking.

**Updated Files (7/75):**
- ✅ Core setup files
- ✅ 2 screens (HomeScreen, AuthScreen)
- ⏳ ~68 files remaining

**Quick Start:**
1. Import Typography: `import { Typography } from '../constants/typography';`
2. Add fontFamily to text styles: `fontFamily: Typography.getFontFamily(fontWeight)`
3. See `FONT_MIGRATION_GUIDE.md` for detailed patterns and examples

## Support

For questions or issues:
1. Check the Typography constants file
2. Review the custom Text component
3. See examples in Button.tsx and ErrorBoundary.tsx

