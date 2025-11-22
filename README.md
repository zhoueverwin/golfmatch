# Development Guide

## Running the Development Server

### Start Expo Development Server

Due to macOS permission restrictions on system temp directories, we need to use a custom temp directory when running Expo commands.

```bash
cd /Users/miho/golfmatch
export TMPDIR="$HOME/.metro-tmp"
npx expo start --clear
```

Or in one line:

```bash
cd /Users/miho/golfmatch && export TMPDIR="$HOME/.metro-tmp" && npx expo start --clear
```

### Run on iOS Device

To run the app on a physical iOS device:

```bash
cd /Users/miho/golfmatch
export TMPDIR="$HOME/.metro-tmp"
npx expo run:ios --device
```

Or in one line:

```bash
cd /Users/miho/golfmatch && export TMPDIR="$HOME/.metro-tmp" && npx expo run:ios --device
```

### Run on iOS Simulator

```bash
cd /Users/miho/golfmatch && export TMPDIR="$HOME/.metro-tmp" && npx expo run:ios
```

## Permission Issues

### Why do we need custom TMPDIR?

After macOS reboots or system updates, the system's temporary directory (`/var/folders/`) may have restricted permissions due to System Integrity Protection (SIP). This causes `EACCES: permission denied` errors when Metro bundler and Expo CLI try to write cache files.

### Solution

The `metro.config.js` file has been configured to automatically set `TMPDIR` to `~/.metro-tmp` for Metro bundler. However, when running Expo CLI commands directly (like `expo run:ios`), you need to manually set the environment variable before running the command.

### Creating the temp directory

The temp directory is automatically created, but if you need to create it manually:

```bash
mkdir -p ~/.metro-tmp
```

## Git Workflow

### Check Status

```bash
git status
```

### Stage Changes

```bash
git add <file>
```

Or stage all changes:

```bash
git add .
```

### Commit Changes

```bash
git commit -m "Your commit message"
```

### View Recent Commits

```bash
git log --oneline -n 5
```

## Common Issues

### Metro Cache Errors

If you see cache-related errors, clear the cache:

```bash
export TMPDIR="$HOME/.metro-tmp" && npx expo start --clear
```

### CocoaPods Issues

If you encounter CocoaPods errors:

```bash
cd ios
pod install
cd ..
```

### Node Modules Issues

If you have dependency issues, try reinstalling:

```bash
rm -rf node_modules
npm install
```

## Environment Variables

The project uses environment variables stored in `.env` file:

- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`

These are automatically loaded when running Expo commands.

## Testing on Expo Go

1. Install Expo Go app on your iOS/Android device
2. Run `export TMPDIR="$HOME/.metro-tmp" && npx expo start`
3. Scan the QR code with your device camera (iOS) or Expo Go app (Android)

## Building for Production

### iOS Build

```bash
export TMPDIR="$HOME/.metro-tmp"
eas build --platform ios
```

### Android Build

```bash
export TMPDIR="$HOME/.metro-tmp"
eas build --platform android
```

## Useful Commands

### Kill Expo Process

If Expo is stuck or you need to restart:

```bash
pkill -f "expo start"
```

### Check Running Processes

```bash
ps aux | grep expo
```

### Clear All Caches

```bash
rm -rf ~/.metro-tmp
rm -rf ~/.metro-cache
export TMPDIR="$HOME/.metro-tmp" && npx expo start --clear
```

