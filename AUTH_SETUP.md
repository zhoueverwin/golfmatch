# GolfMatch Authentication System Setup Guide

This guide will help you set up the comprehensive authentication system for your GolfMatch dating app using Supabase Auth.

## Overview

The authentication system includes:
- **Phone number OTP authentication** (mandatory sign-up method)
- **Email/password authentication** (alternative method)
- **Google OAuth** (third-party login)
- **Apple OAuth** (third-party login)
- **Identity linking** (users can link multiple auth methods)
- **Secure session management** with automatic token refresh

## Prerequisites

1. A Supabase project
2. Google Cloud Console project (for Google OAuth)
3. Apple Developer account (for Apple OAuth)
4. SMS provider (Twilio recommended for phone OTP)

## 1. Supabase Project Setup

### 1.1 Create Supabase Project
1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Create a new project
3. Note down your Project URL and API keys

### 1.2 Configure Authentication Providers

#### Phone Authentication
1. Go to **Authentication > Settings** in your Supabase dashboard
2. Enable **Phone** provider
3. Configure SMS settings:
   - **SMS Provider**: Choose your provider (Twilio recommended)
   - **Twilio Account SID**: Your Twilio Account SID
   - **Twilio Auth Token**: Your Twilio Auth Token
   - **Twilio Phone Number**: Your Twilio phone number

#### Email Authentication
1. In **Authentication > Settings**
2. Enable **Email** provider
3. Configure email templates if needed

#### Google OAuth
1. In **Authentication > Settings**
2. Enable **Google** provider
3. Add your Google OAuth credentials:
   - **Client ID**: From Google Cloud Console
   - **Client Secret**: From Google Cloud Console

#### Apple OAuth
1. In **Authentication > Settings**
2. Enable **Apple** provider
3. Add your Apple OAuth credentials:
   - **Client ID**: Your Apple Service ID
   - **Client Secret**: Your Apple Client Secret

### 1.3 Configure Redirect URLs
Add these redirect URLs in **Authentication > URL Configuration**:
- `golfmatch://auth/callback` (for mobile app)
- `https://your-domain.com/auth/callback` (for web, if applicable)

## 2. Google Cloud Console Setup

### 2.1 Create OAuth 2.0 Credentials
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable **Google+ API** and **Google Sign-In API**
4. Go to **Credentials > Create Credentials > OAuth 2.0 Client ID**
5. Create credentials for:
   - **Web application** (for Supabase)
   - **iOS** (for mobile app)
   - **Android** (for mobile app)

### 2.2 Configure OAuth Consent Screen
1. Go to **OAuth consent screen**
2. Configure your app information
3. Add test users if in development mode

## 3. Apple Developer Setup

### 3.1 Create App ID
1. Go to [Apple Developer Portal](https://developer.apple.com/)
2. Create a new App ID with **Sign In with Apple** capability
3. Note down your **Bundle ID**

### 3.2 Create Service ID
1. Create a new **Services ID**
2. Enable **Sign In with Apple**
3. Configure domains and redirect URLs
4. Note down your **Service ID**

### 3.3 Create Key
1. Create a new **Key** with **Sign In with Apple** capability
2. Download the key file (.p8)
3. Note down your **Key ID** and **Team ID**

## 4. Environment Configuration

### 4.1 Create Environment File
Create a `.env` file in your project root:

```bash
# Supabase Configuration
EXPO_PUBLIC_SUPABASE_URL=your_supabase_project_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# Google OAuth Configuration
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=your_google_web_client_id
EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=your_google_ios_client_id
EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID=your_google_android_client_id

# Apple OAuth Configuration
EXPO_PUBLIC_APPLE_SERVICE_ID=your_apple_service_id

# SMS Configuration (Optional - if using custom SMS provider)
EXPO_PUBLIC_SMS_PROVIDER_API_KEY=your_sms_provider_api_key
EXPO_PUBLIC_SMS_PROVIDER_SERVICE_ID=your_sms_provider_service_id
```

### 4.2 Update Supabase Client
The Supabase client is already configured in `src/services/supabase.ts` to use environment variables.

## 5. App Configuration

### 5.1 Update app.json
Add URL scheme to your `app.json`:

```json
{
  "expo": {
    "scheme": "golfmatch",
    "name": "GolfMatch",
    "slug": "golfmatch-app"
  }
}
```

### 5.2 iOS Configuration
For iOS, you may need to configure URL schemes in your `ios/` directory.

### 5.3 Android Configuration
For Android, configure the URL scheme in your `android/app/src/main/AndroidManifest.xml`.

## 6. Testing the Authentication System

### 6.1 Phone Authentication
1. Enter a valid phone number (with country code)
2. Check your SMS for the OTP
3. Enter the 6-digit code to verify

### 6.2 Email Authentication
1. Enter email and password
2. For sign-up, check email for verification link
3. For sign-in, use existing credentials

### 6.3 OAuth Authentication
1. Tap Google/Apple sign-in button
2. Complete OAuth flow in browser
3. Return to app after successful authentication

### 6.4 Identity Linking
1. Sign in with one method (e.g., phone)
2. Go to Settings > Account Linking
3. Add additional authentication methods

## 7. Security Considerations

### 7.1 Rate Limiting
- Supabase provides built-in rate limiting for OTP requests
- Configure additional rate limiting in your SMS provider

### 7.2 OTP Expiration
- Default OTP expiration is 60 seconds
- Configure in Supabase dashboard if needed

### 7.3 Session Management
- Sessions are automatically refreshed
- Tokens are securely stored in AsyncStorage
- Sessions persist across app restarts

## 8. Troubleshooting

### Common Issues

#### OTP Not Received
- Check phone number format (include country code)
- Verify SMS provider configuration
- Check rate limiting settings

#### OAuth Redirect Issues
- Verify redirect URLs in provider settings
- Check URL scheme configuration
- Ensure proper app bundle ID

#### Session Not Persisting
- Check AsyncStorage permissions
- Verify Supabase client configuration
- Check for app state management issues

### Debug Mode
Enable debug logging by setting:
```javascript
// In your Supabase client configuration
const supabase = createClient(url, key, {
  auth: {
    debug: true, // Enable debug logging
  }
});
```

## 9. Production Deployment

### 9.1 Environment Variables
- Use secure environment variable management
- Never commit `.env` files to version control
- Use different credentials for production

### 9.2 App Store Configuration
- Configure proper URL schemes for production
- Update OAuth redirect URLs for production domains
- Test all authentication flows before release

### 9.3 Monitoring
- Set up error tracking for authentication failures
- Monitor OTP delivery rates
- Track user authentication patterns

## 10. API Reference

### AuthService Methods

```typescript
// Phone authentication
await authService.sendOTP(phoneNumber);
await authService.verifyOTP(phoneNumber, token);

// Email authentication
await authService.signUpWithEmail(email, password);
await authService.signInWithEmail(email, password);

// OAuth authentication
await authService.signInWithGoogle();
await authService.signInWithApple();

// Identity linking
await authService.linkEmail(email, password);
await authService.linkPhone(phoneNumber);
await authService.linkGoogle();
await authService.linkApple();

// Session management
await authService.signOut();
const user = authService.getCurrentUser();
const session = authService.getCurrentSession();
```

### AuthContext Hook

```typescript
const {
  user,
  session,
  loading,
  signInWithPhone,
  verifyOTP,
  signInWithEmail,
  signUpWithEmail,
  signInWithGoogle,
  signInWithApple,
  linkEmail,
  linkPhone,
  linkGoogle,
  linkApple,
  signOut,
  getUserIdentities
} = useAuth();
```

## Support

For issues or questions:
1. Check the [Supabase Auth Documentation](https://supabase.com/docs/guides/auth)
2. Review the [Expo AuthSession Documentation](https://docs.expo.dev/versions/latest/sdk/auth-session/)
3. Check the implementation in `src/services/authService.ts`

---

**Note**: This authentication system is production-ready and follows security best practices. Make sure to test thoroughly in a development environment before deploying to production.
