# Native Google Sign-In Setup Guide

## ✅ What's Been Implemented

Native Google Sign-In has been successfully integrated using `@react-native-google-signin/google-signin`. The implementation includes:

- ✅ Native Google Sign-In (no browser required)
- ✅ Silent sign-in (auto login for returning users)
- ✅ Google account linking
- ✅ Proper sign-out handling
- ✅ Comprehensive error handling with Japanese error messages

## 🔧 Configuration Required

### 1. Google Web Client ID

The implementation currently uses a placeholder web client ID. You need to add the correct one from your Google Cloud Console.

**Location:** `src/services/authService.ts` line 64

**Current value:**
```typescript
webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || "986630263277-ju2hs3vkjkkgp5kp6aed2sjdmb4cnl9q.apps.googleusercontent.com"
```

**To get your Web Client ID:**

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project
3. Navigate to **APIs & Services** → **Credentials**
4. Find the OAuth 2.0 Client ID of type **Web application**
5. Copy the Client ID

**Add to your environment:**

```bash
# Add to your .env file (for local development)
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=YOUR_WEB_CLIENT_ID_HERE

# For EAS builds, add as a secret:
eas secret:create --scope project --name EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID --value "YOUR_WEB_CLIENT_ID_HERE"
```

### 2. iOS Configuration

**Already configured:** ✅
- iOS Client ID: `986630263277-4n44sucemnougkvqotdksvbjcis3vivt.apps.googleusercontent.com`
- URL Scheme configured in `app.config.js`

**What you may need to do:**

If you haven't already, create a `GoogleService-Info.plist` file:

1. Download from Firebase Console (if using Firebase)
2. Place in `ios/golfmatch/` directory
3. Add to Xcode project

### 3. Android Configuration

For Android, you need to ensure your SHA-1 certificate fingerprint is registered in Google Cloud Console.

**Get your SHA-1:**

```bash
# For debug build
cd android
./gradlew signingReport

# Look for SHA1 under "Variant: debug"
```

**Add to Google Cloud Console:**

1. Go to **APIs & Services** → **Credentials**
2. Select your Android OAuth Client ID (or create one if it doesn't exist)
3. Add your SHA-1 fingerprint
4. Add your package name: `com.zhoueverwin.golfmatchapp`

## 📱 How It Works

### Sign In Flow

1. User taps Google Sign-In button
2. Native Google account picker appears (no browser!)
3. User selects their Google account
4. Google returns an ID token
5. ID token is sent to Supabase for authentication
6. User is signed in

### Silent Sign-In

The app can automatically sign users in if they previously signed in with Google:

```typescript
// This happens automatically in the background
const result = await authService.signInWithGoogleSilently();
```

### Sign Out

When users sign out, both Supabase and Google Sign-In sessions are cleared:

```typescript
await authService.signOut();
// Clears both Supabase session and Google Sign-In cache
```

## 🧪 Testing

### Test Native Sign-In

1. Run the app on a physical device or emulator
2. Tap the Google Sign-In button
3. You should see the native Google account picker (not a browser)
4. Select an account
5. You should be signed in

### Test Silent Sign-In

1. Sign in with Google
2. Close the app completely
3. Reopen the app
4. You should be automatically signed in (after a brief loading)

### Test Sign-Out

1. Sign in with Google
2. Sign out
3. Try to sign in again
4. You should see the account picker again

## 🐛 Troubleshooting

### Error: "DEVELOPER_ERROR" on Android

**Cause:** SHA-1 certificate fingerprint not registered in Google Cloud Console

**Solution:**
1. Get your SHA-1 using `./gradlew signingReport`
2. Add it to Google Cloud Console

### Error: "No ID token received"

**Cause:** Web Client ID not configured correctly

**Solution:**
1. Verify the Web Client ID in Google Cloud Console
2. Make sure it matches the one in `authService.ts`
3. Ensure it's the **Web application** type, not iOS or Android

### iOS: "The operation couldn't be completed"

**Cause:** URL scheme not properly configured

**Solution:**
1. Check `app.config.js` - URL scheme should be present
2. Rebuild the iOS app: `npx expo run:ios`
3. Clean build folder: `cd ios && rm -rf build && cd ..`

### Android: "Google Play Services not available"

**Cause:** Play Services not installed or outdated (only on emulator)

**Solution:**
1. Use a device with Google Play Services
2. Or use an emulator with Google Play Store installed
3. Update Google Play Services on the device

## 🔄 Migration from Browser-Based OAuth

The old browser-based OAuth implementation has been completely replaced with native sign-in. No migration needed for existing users - they'll just see the new native flow on their next sign-in.

## 📊 Benefits of Native Sign-In

✅ **Better UX:** Native account picker instead of browser redirect
✅ **Faster:** Silent sign-in for returning users
✅ **More reliable:** No redirect URL issues
✅ **Better security:** Uses native Google Sign-In SDK
✅ **Offline tokens:** Can request refresh tokens for offline access

## 📝 API Changes

### New Methods Available

```typescript
// Silent sign-in (auto login)
signInWithGoogleSilently(): Promise<OTPVerificationResult>

// Check if user previously signed in
GoogleSignin.hasPreviousSignIn(): boolean

// Get current Google user
GoogleSignin.getCurrentUser(): User | null
```

### Error Codes

The implementation handles these specific error codes:

- `SIGN_IN_CANCELLED` - User cancelled the flow
- `IN_PROGRESS` - Sign-in already in progress
- `PLAY_SERVICES_NOT_AVAILABLE` - Google Play Services unavailable (Android only)

## 🔐 Security Notes

1. **Web Client ID** is used to verify tokens with Supabase
2. **ID tokens** are short-lived and secure
3. **Offline access** allows getting refresh tokens
4. **Native SDK** provides better security than browser-based OAuth

## 📚 References

- [React Native Google Sign-In Documentation](https://react-native-google-signin.github.io/docs/original)
- [Google Cloud Console](https://console.cloud.google.com/)
- [Supabase Auth Documentation](https://supabase.com/docs/guides/auth)

