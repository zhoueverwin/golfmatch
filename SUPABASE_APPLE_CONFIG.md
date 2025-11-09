# Supabase Apple Authentication Configuration

This guide provides step-by-step instructions for configuring Apple Sign In with Supabase for the GolfMatch app.

## Prerequisites

Before configuring Supabase, ensure you have completed:
- ✅ Apple Developer Console setup (see `APPLE_SIGNIN_SETUP.md`)
- ✅ Service ID created (for Android/Web)
- ✅ Sign in with Apple Key (.p8 file) downloaded
- ✅ Team ID and Key ID noted

---

## Step 1: Access Supabase Dashboard

1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Sign in to your account
3. Select your **golfmatch** project
4. Navigate to **Authentication** in the left sidebar
5. Click on **Providers**

---

## Step 2: Enable Apple Provider

1. Scroll down to find **Apple** in the list of providers
2. Click on **Apple** to expand the configuration panel
3. Toggle **Enable Sign in with Apple** to **ON** (turn it blue)

---

## Step 3: Configure Client IDs

In the **Client IDs** field, enter a comma-separated list of your Apple identifiers:

### For Both iOS and Android

Enter both your iOS Bundle ID and Android Service ID, separated by a comma:

```
com.zhoueverwin.golfmatchapp,com.zhoueverwin.golfmatchapp.signin
```

**Breakdown:**
- `com.zhoueverwin.golfmatchapp` - iOS Bundle ID (for native authentication)
- `com.zhoueverwin.golfmatchapp.signin` - Service ID (for Android/Web OAuth)

**Note:** If you only want to support iOS initially, you can just enter the Bundle ID:
```
com.zhoueverwin.golfmatchapp
```

---

## Step 4: Generate and Enter Secret Key

The **Secret Key (for OAuth)** is required for web-based authentication (Android).

### Option 1: Generate Secret Using Apple's Method

Apple Sign In uses JWT (JSON Web Token) for authentication. You need to generate a secret from your .p8 key file:

**Using a JWT Generator Tool:**

1. Go to a JWT generator (like jwt.io or use a Node.js script)
2. Use the following to create the secret:
   - **Algorithm**: ES256
   - **Header**:
     ```json
     {
       "alg": "ES256",
       "kid": "YOUR_KEY_ID"
     }
     ```
   - **Payload**:
     ```json
     {
       "iss": "YOUR_TEAM_ID",
       "iat": CURRENT_TIMESTAMP,
       "exp": EXPIRY_TIMESTAMP,
       "aud": "https://appleid.apple.com",
       "sub": "com.zhoueverwin.golfmatchapp.signin"
     }
     ```
   - **Private Key**: Your .p8 file content

### Option 2: Use the .p8 File Directly (Simpler)

Some versions of Supabase accept the .p8 file content directly. Try this first:

1. Open your `.p8` file in a text editor
2. Copy the **entire contents**, including:
   ```
   -----BEGIN PRIVATE KEY-----
   MIGTAgEAMBMGByqGSM49AgEGCCqGSM49AwEHBHkwdwIBAQQg...
   [your actual key content here]
   ...vK3SsdWRk3lKqo=
   -----END PRIVATE KEY-----
   ```
3. Paste it into the **Secret Key (for OAuth)** field

### Option 3: Use Supabase CLI or API

If the above options don't work, you may need to configure via Supabase CLI:

```bash
# Install Supabase CLI if not already installed
npm install -g supabase

# Configure Apple provider
supabase secrets set APPLE_SECRET_KEY="$(cat /path/to/your/AuthKey.p8)"
```

**Important Note**: The secret key configuration may vary. If you encounter issues, refer to [Supabase Apple Auth Documentation](https://supabase.com/docs/guides/auth/social-login/auth-apple) for the latest method.

---

## Step 5: Configure Additional Options (Optional)

### Allow users without an email

Toggle this **ON** if you want to allow users who don't provide an email to authenticate.

**Recommendation**: Leave this **OFF** for better user data collection.

---

## Step 6: Note the Callback URL

Supabase displays your **Callback URL (for OAuth)** at the bottom:

```
https://rriwpoqhbgvprbhomckk.supabase.co/auth/v1/callback
```

**Important**: Copy this URL - you'll need it for Apple Developer Console configuration.

### Configure in Apple Developer Console

Make sure this exact callback URL is added to your Service ID:

1. Go to Apple Developer Console
2. Navigate to your Service ID: `com.zhoueverwin.golfmatchapp.signin`
3. Click **Configure** next to Sign in with Apple
4. Add this URL to **Return URLs**:
   ```
   https://rriwpoqhbgvprbhomckk.supabase.co/auth/v1/callback
   ```
5. Save changes

---

## Step 7: Save Configuration

1. Review all the settings carefully
2. Click **Save** at the bottom of the Apple provider configuration panel
3. Wait for the success confirmation message

---

## Step 7: Test the Configuration

### Test iOS (Native)

1. Build your app for iOS development:

   **Option 1: Local Build (Recommended)**:
   ```bash
   npx expo run:ios --device
   ```
   - Requires Xcode and physical device connected via USB
   - Faster for development

   **Option 2: EAS Build**:
   ```bash
   eas build --profile development --platform ios
   ```
   - Install .ipa file after build completes

2. Install on a **physical iOS device** (iOS 13+)

3. Tap "Sign in with Apple" button

4. You should see the native Apple Sign In sheet

5. Authenticate with your Apple ID

6. Check Supabase Dashboard → Authentication → Users
   - New user should appear with provider: `apple`

### Test Android (Web OAuth)

1. Build your app for Android development:
   ```bash
   eas build --profile development --platform android
   ```

2. Install on Android device or emulator

3. Tap "Sign in with Apple" button

4. Browser should open with Apple login page

5. Authenticate with your Apple ID

6. Browser should redirect back to app

7. Check Supabase Dashboard → Authentication → Users
   - New user should appear with provider: `apple`

---

## Troubleshooting

### Error: "Invalid client"

**Cause**: Client IDs don't match or are incorrectly formatted

**Solution**: 
- Verify the Client IDs in Supabase are comma-separated
- Should be: `com.zhoueverwin.golfmatchapp,com.zhoueverwin.golfmatchapp.signin`
- Check for typos or extra spaces
- Ensure both IDs exist in Apple Developer Console

### Error: "Invalid redirect URI"

**Cause**: Redirect URL mismatch

**Solution**:
- Verify the callback URL in Apple Developer Console:
  ```
  https://rriwpoqhbgvprbhomckk.supabase.co/auth/v1/callback
  ```
- Must match exactly, including `https://` and no trailing slash

### Error: "Invalid token" or "Invalid key"

**Cause**: Secret Key is incorrect or improperly formatted

**Solution**:
- Re-open the `.p8` file in a text editor
- Copy the **entire** content including:
  ```
  -----BEGIN PRIVATE KEY-----
  [content]
  -----END PRIVATE KEY-----
  ```
- Ensure no line breaks are corrupted
- Paste again into the Secret Key field
- If still failing, you may need to generate a proper JWT secret
- Check Supabase logs for specific error messages

### iOS Authentication Not Working

**Cause**: Testing on simulator or iOS version < 13

**Solution**:
- Use a **physical iOS device** with iOS 13 or later
- Simulators have limited Apple Sign In functionality
- Ensure device is signed into iCloud

### Android Authentication Shows "Access Denied"

**Cause**: Service ID not properly configured in Supabase

**Solution**:
- Ensure you completed Step 4 (Full Android/Web Setup)
- Verify all fields are filled correctly
- Save the configuration and wait a few minutes for changes to propagate

---

## Verification Checklist

After configuration, verify:

- [ ] Apple provider is enabled in Supabase Dashboard (toggle is ON/blue)
- [ ] Client IDs field contains: `com.zhoueverwin.golfmatchapp,com.zhoueverwin.golfmatchapp.signin`
- [ ] Secret Key (for OAuth) is filled with your .p8 file content or generated JWT
- [ ] Callback URL is copied: `https://rriwpoqhbgvprbhomckk.supabase.co/auth/v1/callback`
- [ ] Callback URL is added to Apple Developer Console Service ID Return URLs
- [ ] Configuration is saved successfully
- [ ] Test authentication works on iOS device
- [ ] Test authentication works on Android device

---

## Additional Notes

### How It Works

**iOS (Native)**:
1. User taps "Sign in with Apple"
2. Native iOS authentication sheet appears
3. User authenticates with Face ID/Touch ID/Password
4. iOS returns an identity token (JWT)
5. App sends token to Supabase
6. Supabase verifies token with Apple
7. Supabase creates session

**Android (Web OAuth)**:
1. User taps "Sign in with Apple"
2. Browser opens with Apple login page
3. User enters Apple ID credentials
4. Apple redirects to Supabase callback URL
5. Supabase creates session and redirects to app
6. App receives and sets session tokens

### Security Considerations

- The .p8 key is your **private key** - keep it secure
- Never commit the .p8 file or its contents to version control
- Rotate keys periodically for enhanced security
- Monitor authentication logs in Supabase Dashboard

### User Information

**First Sign In**:
- Full name (if user approves)
- Email (real or private relay)
- Apple User ID

**Subsequent Sign Ins**:
- Only Apple User ID is returned
- Email can be extracted from the JWT identity token

---

## Support Resources

- [Supabase Apple Auth Documentation](https://supabase.com/docs/guides/auth/social-login/auth-apple)
- [Apple Sign In Documentation](https://developer.apple.com/sign-in-with-apple/)
- [expo-apple-authentication](https://docs.expo.dev/versions/latest/sdk/apple-authentication/)

---

## Summary

You've successfully configured Apple Sign In with Supabase! 

**Next Steps**:
1. Test authentication on both iOS and Android devices
2. Verify new users appear in Supabase Dashboard
3. Test the user experience and error handling
4. Monitor authentication logs for any issues

If you encounter any problems, refer to the Troubleshooting section or check the Supabase Dashboard logs.

