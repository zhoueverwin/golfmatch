# Apple Sign In Setup Guide

This guide walks you through setting up Apple Sign In for the GolfMatch app on both iOS and Android platforms.

## Overview

- **iOS**: Uses native Apple Sign In via `expo-apple-authentication`
- **Android**: Uses web-based Apple Sign In via OAuth flow
- **Backend**: Supabase handles authentication

## Prerequisites

- Apple Developer Account (paid membership required)
- Access to Apple Developer Console
- Access to Supabase Dashboard

---

## Part 1: Apple Developer Console Setup

### Step 1: Enable Sign in with Apple for Your App ID

1. Go to [Apple Developer Console](https://developer.apple.com/account)
2. Navigate to **Certificates, Identifiers & Profiles**
3. Click **Identifiers** in the sidebar
4. Find and select your App ID: `com.zhoueverwin.golfmatchapp`
5. Scroll down to **Capabilities** section
6. Check the box for **Sign In with Apple**
7. Click **Save** at the top right

### Step 2: Create a Service ID (Required for Android/Web)

1. In Apple Developer Console, go to **Certificates, Identifiers & Profiles**
2. Click **Identifiers** in the sidebar
3. Click the **+** button to create a new identifier
4. Select **Services IDs** and click **Continue**
5. Fill in the details:
   - **Description**: GolfMatch Apple Sign In Service
   - **Identifier**: `com.zhoueverwin.golfmatchapp.signin` (must be unique)
6. Click **Continue**, then **Register**

### Step 3: Configure the Service ID

1. Select the Service ID you just created
2. Check the box for **Sign In with Apple**
3. Click **Configure** next to Sign In with Apple
4. In the configuration dialog:
   - **Primary App ID**: Select `com.zhoueverwin.golfmatchapp`
   - **Domains and Subdomains**: Add your Supabase domain
     ```
     rriwpoqhbgvprbhomckk.supabase.co
     ```
   - **Return URLs**: Add your Supabase callback URL
     ```
     https://rriwpoqhbgvprbhomckk.supabase.co/auth/v1/callback
     ```
5. Click **Save**, then **Continue**, then **Save** again

### Step 4: Create Sign in with Apple Key (Required for Android/Web)

1. In Apple Developer Console, go to **Certificates, Identifiers & Profiles**
2. Click **Keys** in the sidebar
3. Click the **+** button to create a new key
4. Fill in the details:
   - **Key Name**: GolfMatch Apple Sign In Key
   - Check the box for **Sign In with Apple**
5. Click **Configure** next to Sign In with Apple
6. Select your Primary App ID: `com.zhoueverwin.golfmatchapp`
7. Click **Save**, then **Continue**
8. Click **Register**
9. **IMPORTANT**: Download the `.p8` key file immediately (you can only download it once)
   - Save it securely - you'll need it to generate the JWT secret for Supabase
   - Example filename: `AuthKey_49KB6PUFUW.p8` (the Key ID is in the filename)
10. Note down the **Key ID** displayed on the page (e.g., `49KB6PUFUW`)
    - The Key ID is also in the .p8 filename: `AuthKey_[KEY_ID].p8`

### Step 5: Get Your Team ID

1. In Apple Developer Console, click your name in the top right
2. Note down your **Team ID** (e.g., `5V7H8A99J4`)
3. You'll find it in the membership details section

### Step 6: Generate JWT Secret Key for Supabase

After you have your .p8 file, Team ID, Key ID, and Service ID, generate the JWT:

1. **Using the provided script** (recommended):
   ```bash
   cd /Users/miho/golfmatch
   node generate-apple-secret.js
   ```
   - The script is already configured with your values
   - It will output the JWT token to copy

2. **Manual generation**:
   - Use a JWT generator (like jwt.io)
   - Algorithm: ES256
   - Header: `{"alg":"ES256","kid":"YOUR_KEY_ID"}`
   - Payload: `{"iss":"YOUR_TEAM_ID","iat":TIMESTAMP,"exp":EXPIRY,"aud":"https://appleid.apple.com","sub":"com.zhoueverwin.golfmatchapp.signin"}`
   - Sign with your .p8 private key

3. **Copy the JWT** - you'll paste it into Supabase in the next section

---

## Part 2: Supabase Configuration

### Step 1: Enable Apple Provider

1. Go to your [Supabase Dashboard](https://app.supabase.com)
2. Select your project: `golfmatch`
3. Navigate to **Authentication** → **Providers**
4. Find **Apple** in the list and click to expand it

### Step 2: Configure iOS Native (Minimal Setup)

For iOS native implementation using `signInWithIdToken()`:

1. **Enable Apple Provider**: Toggle to **Enabled**
2. **iOS Bundle ID**: Enter `com.zhoueverwin.golfmatchapp`
3. That's it for iOS! No need for Service ID or Key for native implementation

### Step 3: Configure Android/Web (Full Setup)

For Android/Web support, you need to generate a JWT secret key from your .p8 file:

1. **Client IDs**: Enter both your Bundle ID and Service ID, comma-separated:
   ```
   com.zhoueverwin.golfmatchapp,com.zhoueverwin.golfmatchapp.signin
   ```

2. **Generate JWT Secret Key**:
   - Use the script provided: `generate-apple-secret.js`
   - Or use a JWT generator with your .p8 file
   - The JWT must be signed with ES256 algorithm
   - Required fields: Team ID, Service ID, Key ID

3. **Secret Key (for OAuth)**: Paste the generated JWT token (not the .p8 file contents)

4. **Important**: The JWT expires in 6 months - you'll need to regenerate it

See `SUPABASE_APPLE_CONFIG.md` for detailed Supabase configuration steps.

---

## Part 3: App Configuration

### iOS Configuration

The iOS app is already configured with the necessary entitlements:

**File**: `ios/golfmatch/golfmatch.entitlements`
```xml
<key>com.apple.developer.applesignin</key>
<array>
  <string>Default</string>
</array>
```

### Android Configuration

Android uses web-based OAuth flow, which requires:

1. **Internet Permission**: Already added in `AndroidManifest.xml`
2. **Deep Link Handling**: Already configured with `golfmatch://` scheme
3. **Service ID**: Will be added to environment variables

### Environment Variables

Add to your `.env` file:

```env
# Apple Sign In (for Android/Web)
EXPO_PUBLIC_APPLE_SERVICE_ID=com.zhoueverwin.golfmatchapp.signin
```

This will also be added to `eas.json` for builds.

---

## Part 4: Testing

### iOS Testing

**Important**: Apple Sign In on iOS requires a physical device with iOS 13+ for testing. The simulator has limited functionality.

**Option 1: Local Development Build (Recommended for Testing)**
```bash
npx expo run:ios --device
```
- Faster for development and testing
- Requires Xcode installed
- Requires physical iOS device connected via USB
- Builds and runs directly on your device

**Option 2: EAS Development Build**
```bash
eas build --profile development --platform ios
```
- Use if you don't have Xcode or prefer cloud builds
- Install the .ipa file on your device after build completes

**Testing Steps:**
1. Connect your iPhone/iPad via USB
2. Trust the computer on your device if prompted
3. Run the build command above
4. Tap the "Sign in with Apple" button in the app
5. Authenticate with your Apple ID
6. Choose to share or hide your email
7. App should receive authentication token and create session

### Android Testing

Android uses web-based authentication flow:

1. Build the app for development:
   ```bash
   eas build --profile development --platform android
   ```
2. Install on your Android device or emulator
3. Tap the "Sign in with Apple" button
4. Browser opens with Apple login page
5. Authenticate with your Apple ID
6. Browser redirects back to app with tokens
7. App should create session

### Common Issues

1. **"Invalid client"**: Check that your Service ID matches exactly in Supabase
2. **"Redirect URI mismatch"**: Verify the callback URL in Apple Developer Console
3. **"Invalid token"**: Ensure your Team ID and Key ID are correct in Supabase
4. **iOS simulator not working**: Use a physical device for iOS testing
5. **User info is null**: Apple only returns user info on first sign-in. Email can be extracted from JWT token.

---

## Part 5: User Information Handling

### First Sign In

On the first sign in, Apple returns:
- Identity Token (JWT)
- User ID
- Full Name (if user approves)
- Email (if user approves or real email if not hidden)

### Subsequent Sign Ins

On subsequent sign ins, Apple returns:
- Identity Token (JWT) - contains email
- User ID
- **NO** full name or email fields

### Extracting Email from JWT

The identity token is a JWT that contains the email. You can decode it to get the email on subsequent sign ins:

```typescript
import { jwtDecode } from 'jwt-decode';

const decodedToken = jwtDecode(identityToken);
const email = decodedToken.email;
```

---

## Summary Checklist

- [ ] App ID has Sign in with Apple capability enabled
- [ ] Service ID created and configured with callback URL
- [ ] Sign in with Apple Key created and `.p8` file downloaded
- [ ] Team ID and Key ID noted
- [ ] Supabase Apple provider enabled
- [ ] iOS Bundle ID added to Supabase
- [ ] JWT secret key generated and added to Supabase (for Android/Web)
- [ ] Client IDs configured in Supabase: `com.zhoueverwin.golfmatchapp,com.zhoueverwin.golfmatchapp.signin`
- [ ] Environment variable `EXPO_PUBLIC_APPLE_SERVICE_ID` added
- [ ] iOS app built and tested on physical device
- [ ] Android app tested with web flow

---

## Additional Resources

- [Apple Sign In Documentation](https://developer.apple.com/sign-in-with-apple/)
- [expo-apple-authentication](https://docs.expo.dev/versions/latest/sdk/apple-authentication/)
- [Supabase Apple Auth Guide](https://supabase.com/docs/guides/auth/social-login/auth-apple)
- [Human Interface Guidelines for Sign in with Apple](https://developer.apple.com/design/human-interface-guidelines/sign-in-with-apple)

---

## Support

If you encounter issues, check:
1. Apple Developer Console configuration
2. Supabase Dashboard logs (Authentication → Logs)
3. App console logs for error messages
4. Ensure all IDs and keys match exactly

