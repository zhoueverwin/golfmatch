# E2E Testing Setup Guide

## Overview
This guide explains how to run E2E tests for the new user signup flow with EditProfile redirect feature.

## Prerequisites

1. **Detox Installed**: ✅ Already installed
2. **Expo Dev Client**: Required for Detox with Expo apps
3. **iOS Simulator or Android Emulator**: Must be running before tests

## Test File
- **Location**: `e2e/newUserSignupFlow.e2e.test.ts`
- **Tests**: New user signup → email verification → automatic redirect to EditProfile

## Setup Steps

### For iOS (Mac only):

1. **Build the app for testing**:
```bash
cd golfmatch-app
npm run build:e2e:ios
```

2. **Run the tests**:
```bash
npm run test:e2e:ios
```

### For Android:

1. **Start an Android emulator**:
```bash
# Start emulator (adjust name as needed)
emulator -avd Pixel_5_API_30
```

2. **Build the app for testing**:
```bash
cd golfmatch-app
npm run build:e2e:android
```

3. **Run the tests**:
```bash
npm run test:e2e:android
```

## Important Notes

### Expo + Detox Requirements

Since this is an Expo app, Detox requires:
1. **Custom Dev Client Build**: You must build a custom dev client (not Expo Go)
   ```bash
   # For iOS
   npx expo run:ios --device
   
   # For Android  
   npx expo run:android --device
   ```

2. **Update Detox Config**: The `.detoxrc.js` file needs to point to your built app binary paths.

3. **Test OTP**: The tests use a hardcoded OTP (`123456`). In production, you'll need to:
   - Use a test email service
   - Or mock Supabase responses
   - Or configure Supabase to use a predictable OTP for test accounts

## Current Test Coverage

✅ **Implemented Tests**:
- New user signup → verification → redirect to EditProfile
- Verification screen display
- OTP input validation (6 digits)
- Resend OTP functionality
- Back navigation
- Invalid OTP handling

⏳ **Tests Requiring Setup**:
- Existing user login (no redirect)
- Full EditProfile screen interaction
- Complete integration flow

## Troubleshooting

### Error: "Detox worker instance has not been installed"
- Make sure you're running tests via `detox test` command, not regular `jest`
- Check that `e2e/setup.ts` exists and is properly configured

### Error: "Cannot find app binary"
- Build the app first using `npm run build:e2e:ios` or `npm run build:e2e:android`
- Update `.detoxrc.js` with correct binary paths

### Error: "Simulator/Emulator not found"
- Start simulator/emulator before running tests
- Check device names in `.detoxrc.js` match your setup

## Next Steps

1. ✅ Test file created with proper structure
2. ✅ TestIDs added to all screens
3. ⏳ Build Expo dev client for testing
4. ⏳ Configure Detox with correct binary paths
5. ⏳ Set up test OTP service/mocking
6. ⏳ Run tests and fix any issues

## Running Tests Right Now

Since Detox requires a built app, you can:

1. **Validate test syntax** (already done):
```bash
npm run test -- --testPathPattern=e2e
```

2. **Build and run** (after setting up dev client):
```bash
# iOS
npm run build:e2e:ios && npm run test:e2e:ios

# Android
npm run build:e2e:android && npm run test:e2e:android
```

## Test IDs Reference

All testIDs follow the pattern: `SCREEN.ELEMENT`

- `AUTH.LOGIN_SCREEN.*` - Login screen elements
- `AUTH.SIGNUP_SCREEN.*` - Signup screen elements  
- `AUTH.VERIFY_EMAIL_SCREEN.*` - Email verification screen
- `EDIT_PROFILE_SCREEN.*` - Profile editing screen

