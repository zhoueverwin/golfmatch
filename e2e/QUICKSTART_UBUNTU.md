# Ubuntu Android Testing - Quick Start

## ✅ You CAN Test on Ubuntu!

On Ubuntu, you can test Android apps. Here's the fastest way to get started:

## Quick Setup (Choose One)

### Option A: Physical Android Device (Easiest)

1. **Connect your Android phone via USB**
2. **Enable USB Debugging** on phone (Settings → Developer Options)
3. **Verify connection**:
   ```bash
   # Install adb if needed
   sudo apt install android-tools-adb
   
   # Check device
   adb devices
   ```

4. **Build and run**:
   ```bash
   cd golfmatch-app
   npx expo run:android --device
   npm run test:e2e:device  # Uses physical device
   ```

### Option B: Android Emulator

1. **Install Android Studio**:
   ```bash
   sudo snap install android-studio --classic
   ```

2. **Set up environment** (add to `~/.bashrc`):
   ```bash
   export ANDROID_HOME=$HOME/Android/Sdk
   export PATH=$PATH:$ANDROID_HOME/emulator
   export PATH=$PATH:$ANDROID_HOME/platform-tools
   ```

3. **Create emulator** (in Android Studio: Tools → Device Manager)

4. **Start emulator**:
   ```bash
   emulator -avd YOUR_AVD_NAME &
   ```

5. **Build and test**:
   ```bash
   npx expo run:android
   npm run test:e2e:android
   ```

## Check Your Setup

Run this to see what's available:

```bash
cd golfmatch-app
bash e2e/check-android-setup.sh
```

## What Works on Ubuntu

✅ Android emulator testing  
✅ Physical Android device testing  
✅ All E2E tests we created  
❌ iOS simulator (requires macOS)  

## Manual Testing Alternative

If you don't want to set up Detox right now, you can manually test:

```bash
npm start
# Scan QR code with Expo Go app on Android
# Manually go through signup → verification → check redirect
```

The tests are ready - you just need Android SDK/device setup!

