# E2E Testing on Ubuntu - Android Setup Guide

## ✅ You CAN Test on Ubuntu!

While iOS testing requires macOS, **Android testing works perfectly on Ubuntu**. Here's how to set it up:

## Option 1: Android Emulator (Recommended for E2E Tests)

### Step 1: Install Android Studio & SDK

```bash
# Install Android Studio
sudo snap install android-studio --classic

# OR download from: https://developer.android.com/studio

# Set up environment variables (add to ~/.bashrc or ~/.zshrc)
export ANDROID_HOME=$HOME/Android/Sdk
export PATH=$PATH:$ANDROID_HOME/emulator
export PATH=$PATH:$ANDROID_HOME/platform-tools
export PATH=$PATH:$ANDROID_HOME/tools
export PATH=$PATH:$ANDROID_HOME/tools/bin

# Reload shell
source ~/.bashrc  # or source ~/.zshrc
```

### Step 2: Create Android Virtual Device (AVD)

```bash
# Open Android Studio
# Go to: Tools → Device Manager → Create Device
# OR use command line:

# List available system images
sdkmanager --list | grep system-images

# Install a system image (example)
sdkmanager "system-images;android-30;google_apis;x86_64"

# Create AVD
avdmanager create avd -n Pixel_5_API_30 -k "system-images;android-30;google_apis;x86_64"
```

### Step 3: Start Emulator

```bash
# Start emulator
emulator -avd Pixel_5_API_30 &

# Verify it's running
adb devices
```

### Step 4: Build Expo Dev Client for Android

```bash
cd golfmatch-app

# Build Android app (requires Android SDK)
npx expo run:android
```

### Step 5: Update Detox Config

Update `.detoxrc.js` with your AVD name if different:

```javascript
emulator: {
  type: 'android.emulator',
  device: {
    avdName: 'Pixel_5_API_30'  // Change to your AVD name
  }
}
```

### Step 6: Run E2E Tests

```bash
# Build for Detox
npm run build:e2e:android

# Run tests
npm run test:e2e:android
```

## Option 2: Physical Android Device (Easier Setup)

### Step 1: Enable Developer Options

1. Go to Settings → About Phone
2. Tap "Build Number" 7 times
3. Go back → Developer Options → Enable USB Debugging

### Step 2: Connect Device

```bash
# Connect phone via USB
# Verify connection
adb devices

# You should see your device listed
```

### Step 3: Update Detox Config for Physical Device

Create a new configuration in `.detoxrc.js`:

```javascript
devices: {
  // ... existing configs ...
  physicalDevice: {
    type: 'android.attached',
    device: {
      adbName: '.*'  // Matches any connected device
    }
  }
},
configurations: {
  // ... existing configs ...
  'android.attached.debug': {
    device: 'physicalDevice',
    app: 'android.debug'
  }
}
```

### Step 4: Build and Run

```bash
# Build app
npx expo run:android --device

# Build for Detox
npm run build:e2e:android

# Run tests (using physical device config)
detox test --configuration android.attached.debug
```

## Option 3: Manual Testing with Expo Go (Quick Verification)

For quick manual testing without setting up Detox:

```bash
# Start Expo
npm start

# Scan QR code with Expo Go app on Android device
# Manually test the signup flow
```

## Quick Setup Script

I'll create a setup script to help you get started:

```bash
# Check if Android SDK is installed
if ! command -v adb &> /dev/null; then
    echo "❌ Android SDK not found"
    echo "📥 Install Android Studio: https://developer.android.com/studio"
    echo "   Or: sudo snap install android-studio --classic"
    exit 1
fi

echo "✅ Android SDK found!"

# Check if emulator is available
if ! command -v emulator &> /dev/null; then
    echo "⚠️  Emulator not in PATH"
    echo "   Add to ~/.bashrc:"
    echo "   export PATH=\$PATH:\$ANDROID_HOME/emulator"
fi

# List available devices
echo "📱 Available devices:"
adb devices

# List available AVDs
echo "🖥️  Available AVDs:"
emulator -list-avds
```

## Troubleshooting

### "adb: command not found"
- Install Android SDK Platform Tools
- Add to PATH: `export PATH=$PATH:$ANDROID_HOME/platform-tools`

### "emulator: command not found"
- Install Android SDK Emulator
- Add to PATH: `export PATH=$PATH:$ANDROID_HOME/emulator`

### "No devices found"
- Check USB debugging is enabled
- Try: `adb kill-server && adb start-server`
- Verify: `adb devices`

### "Build failed"
- Make sure you've run `npx expo run:android` at least once
- Check `android/app/build/outputs/apk/debug/` exists

## Alternative: Use EAS Build (Cloud Build)

If local setup is difficult, use Expo's cloud build:

```bash
# Install EAS CLI
npm install -g eas-cli

# Login
eas login

# Build for Android
eas build --profile development --platform android

# Download APK and install on device/emulator
```

## Current Status

✅ **Test file ready** - All tests written and validated  
✅ **Detox configured** - Android configuration ready  
⏳ **Needs setup** - Android SDK/Emulator or physical device  

## Next Steps

1. **Install Android SDK** (if not already installed)
2. **Set up emulator OR connect physical device**
3. **Build Expo app**: `npx expo run:android`
4. **Update Detox config** with correct paths
5. **Run tests**: `npm run test:e2e:android`

The tests are ready - you just need Android SDK/emulator setup!


