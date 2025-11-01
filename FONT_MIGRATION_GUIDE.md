# Noto Sans JP Font Migration - Complete Guide

## ✅ Files Already Updated

1. ✅ `src/constants/typography.ts` - Font constants and helper functions
2. ✅ `src/components/Button.tsx` - Button text styles
3. ✅ `src/components/ErrorBoundary.tsx` - Error message styles
4. ✅ `src/components/Text.tsx` - Custom Text component wrapper
5. ✅ `src/screens/HomeScreen.tsx` - Home screen text styles
6. ✅ `src/screens/AuthScreen.tsx` - Auth screen text styles
7. ✅ `App.tsx` - Font loading configuration

## 📋 Remaining Files to Update

### Screens (~20 files)
- `src/screens/ChatScreen.tsx`
- `src/screens/UserProfileScreen.tsx`
- `src/screens/MessagesScreen.tsx`
- `src/screens/SearchScreen.tsx`
- `src/screens/EditProfileScreen.tsx`
- `src/screens/MyPageScreen.tsx`
- `src/screens/ConnectionsScreen.tsx`
- `src/screens/SettingsScreen.tsx`
- `src/screens/NotificationSettingsScreen.tsx`
- `src/screens/NotificationHistoryScreen.tsx`
- `src/screens/CalendarEditScreen.tsx`
- `src/screens/FootprintsScreen.tsx`
- `src/screens/PastLikesScreen.tsx`
- `src/screens/LikesScreen.tsx`
- `src/screens/UserPostsScreen.tsx`
- `src/screens/MatchingScreen.tsx`
- `src/screens/TestAccountSetupScreen.tsx`
- `src/screens/LinkAccountScreen.tsx`
- `src/screens/VerifyEmailScreen.tsx`
- `src/screens/ContactReplyScreen.tsx`
- `src/screens/ProfileScreen.tsx`

### Components (~25 files)
- `src/components/ProfileCard.tsx`
- `src/components/AuthInput.tsx`
- `src/components/MatchCelebrationModal.tsx`
- `src/components/StandardHeader.tsx`
- `src/components/ToastNotification.tsx`
- `src/components/ScoreSelector.tsx`
- `src/components/FilterModal.tsx`
- `src/components/LastLoginSelector.tsx`
- `src/components/PrefectureSelector.tsx`
- `src/components/SkillLevelSelector.tsx`
- `src/components/AgeDecadeSelector.tsx`
- `src/components/FullscreenVideoPlayer.tsx`
- `src/components/VideoPlayer.tsx`
- `src/components/GolfCalendar.tsx`
- `src/components/PostCreationModal.tsx`
- `src/components/UserListModal.tsx`
- `src/components/Toast.tsx`
- `src/components/PhoneInput.tsx`
- `src/components/OfflineIndicator.tsx`
- `src/components/Loading.tsx`
- `src/components/ImageCarousel.tsx`
- `src/components/FullscreenImageViewer.tsx`
- `src/components/EmptyState.tsx`
- `src/components/Card.tsx`

## 🔧 Migration Pattern

### Step 1: Import Typography (if not already imported)

```typescript
import { Typography } from '../constants/typography';
```

### Step 2: Add fontFamily to text styles

For each style that has `fontSize` or `fontWeight`, add `fontFamily`:

**Pattern 1: Using Typography.fontWeight constants**
```typescript
// Before
headerTitle: {
  fontSize: Typography.fontSize.lg,
  fontWeight: Typography.fontWeight.bold,
  color: Colors.text.primary,
},

// After
headerTitle: {
  fontSize: Typography.fontSize.lg,
  fontWeight: Typography.fontWeight.bold,
  fontFamily: Typography.getFontFamily(Typography.fontWeight.bold),
  color: Colors.text.primary,
},
```

**Pattern 2: Using string fontWeight values**
```typescript
// Before
tabText: {
  fontSize: 16,
  fontWeight: "500",
  color: Colors.gray[600],
},

// After
tabText: {
  fontSize: 16,
  fontWeight: "500",
  fontFamily: Typography.getFontFamily("500"),
  color: Colors.gray[600],
},
```

**Pattern 3: Only fontSize (no fontWeight)**
```typescript
// Before
bodyText: {
  fontSize: Typography.fontSize.base,
  color: Colors.text.secondary,
},

// After
bodyText: {
  fontSize: Typography.fontSize.base,
  fontFamily: Typography.fontFamily.regular,
  color: Colors.text.secondary,
},
```

### Step 3: Font Weight Mapping

| fontWeight Value | Use This Font Family |
|-----------------|---------------------|
| `"400"` or `Typography.fontWeight.normal` | `Typography.fontFamily.regular` |
| `"500"` or `Typography.fontWeight.medium` | `Typography.fontFamily.medium` |
| `"600"` or `Typography.fontWeight.semibold` | `Typography.fontFamily.semibold` |
| `"700"` or `Typography.fontWeight.bold` | `Typography.fontFamily.bold` |

**Or use the helper function:**
- `Typography.getFontFamily("400")` → `NotoSansJP_400Regular`
- `Typography.getFontFamily(Typography.fontWeight.bold)` → `NotoSansJP_700Bold`

## 📝 Quick Reference

### Common Patterns

**Bold Title:**
```typescript
title: {
  fontSize: Typography.fontSize.lg,
  fontWeight: Typography.fontWeight.bold,
  fontFamily: Typography.getFontFamily(Typography.fontWeight.bold),
  color: Colors.text.primary,
},
```

**Regular Body Text:**
```typescript
body: {
  fontSize: Typography.fontSize.base,
  fontFamily: Typography.fontFamily.regular,
  color: Colors.text.secondary,
},
```

**Semi-bold Label:**
```typescript
label: {
  fontSize: Typography.fontSize.base,
  fontWeight: Typography.fontWeight.semibold,
  fontFamily: Typography.getFontFamily(Typography.fontWeight.semibold),
  color: Colors.text.primary,
},
```

**Small Text:**
```typescript
smallText: {
  fontSize: Typography.fontSize.sm,
  fontFamily: Typography.fontFamily.regular,
  color: Colors.text.secondary,
},
```

## 🔍 Finding Files That Need Updates

Use this grep command to find styles with fontSize but no fontFamily:

```bash
cd golfmatch-app
grep -r "fontSize:" src/ --include="*.tsx" | grep -v "fontFamily:"
```

Or find files with fontWeight but no fontFamily:

```bash
grep -r "fontWeight:" src/ --include="*.tsx" | grep -v "fontFamily:"
```

## ✅ Checklist for Each File

- [ ] Import Typography if not already imported
- [ ] Find all styles with `fontSize` or `fontWeight`
- [ ] Add `fontFamily` to each text style
- [ ] Use `Typography.getFontFamily(fontWeight)` for styles with fontWeight
- [ ] Use `Typography.fontFamily.regular` for styles with only fontSize
- [ ] Check for linter errors
- [ ] Test the screen/component visually

## 🚀 Automated Migration Script

A helper script is available at `scripts/check-fonts.js` to identify files that need updates.

## ⚠️ Important Notes

1. **Don't add fontFamily to non-text styles** (e.g., container, button, etc.)
2. **Keep monospace fonts** for code/technical text (like error details)
3. **Icons don't need fonts** - Ionicons and other icon libraries are unaffected
4. **Test each screen** after updating to ensure fonts render correctly

## 🎯 Priority Order

1. **High Priority** (Most visible screens):
   - ChatScreen
   - UserProfileScreen
   - MessagesScreen
   - SearchScreen
   - MyPageScreen

2. **Medium Priority**:
   - EditProfileScreen
   - SettingsScreen
   - ConnectionsScreen
   - Other screens

3. **Low Priority**:
   - Components (can be updated incrementally)
   - Less frequently used screens

## 📊 Progress Tracking

- ✅ Core setup (Typography, App.tsx, Button, ErrorBoundary)
- ✅ 2 screens updated (HomeScreen, AuthScreen)
- ⏳ ~20 screens remaining
- ⏳ ~25 components remaining

## 🔗 Related Files

- `NOTO_SANS_JP_IMPLEMENTATION.md` - Full implementation guide
- `src/constants/typography.ts` - Font constants
- `src/components/Text.tsx` - Custom Text component

## 💡 Tips

1. **Use Find & Replace** in your editor:
   - Find: `fontWeight: Typography.fontWeight.bold,`
   - Replace: `fontWeight: Typography.fontWeight.bold,\n    fontFamily: Typography.getFontFamily(Typography.fontWeight.bold),`

2. **Batch update pattern**:
   - Update all `fontWeight: "600"` → add `fontFamily: Typography.getFontFamily("600")`
   - Update all `fontWeight: "700"` → add `fontFamily: Typography.getFontFamily("700")`
   - Update all `fontWeight: Typography.fontWeight.*` → add corresponding fontFamily

3. **Verify after each file**:
   - Run linter
   - Check TypeScript compilation
   - Visual test if possible

