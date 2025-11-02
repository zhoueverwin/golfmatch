# Xcode 15.x Build Error Fixes

## Errors to Fix

1. **React Native Header Error**: `Umbrella header for module 'React' does not include header 'AppleEventBeat.h'`
2. **Deprecated API Warnings**: `AVAudioTimePitchAlgorithmLowQualityZeroLatency` deprecated in iOS 15.0
3. **Type Comparison Error**: Comparison of `AVPlayerStatus` and `AVPlayerItemStatus` enums
4. **Nullability Specifier**: Missing nullability type specifiers in block pointers

## Solution Steps

### Step 1: Clean Build Environment (Already Done)

The following cleanup has been completed:
- ✅ Removed `ios/Pods` directory
- ✅ Removed `ios/Podfile.lock`
- ✅ Removed `ios/build` directory

### Step 2: Reinstall CocoaPods Dependencies (Run on Mac)

On your MacBook, run these commands in Terminal:

```bash
cd /path/to/golfmatchcode/golfmatch-app

# First, install npm dependencies (includes patch-package)
npm install

# Navigate to iOS directory
cd ios

# Update CocoaPods repo
pod repo update

# Install pods
pod install

# Return to project root
cd ..
```

✅ **Already completed**: iOS build cache has been cleaned (`ios/Pods` and `ios/Podfile.lock` removed).

### Step 3: Clean Xcode Build

1. Open Xcode
2. Select **Product** → **Clean Build Folder** (Shift + Cmd + K)
3. Close Xcode

### Step 4: Fix expo-video Native Code Issues

The `expo-video` library (v3.0.12) has deprecated API usage in its native iOS code. You need to patch these files:

#### 4.1 Install dependencies (includes patch-package)

```bash
cd /path/to/golfmatchcode/golfmatch-app
npm install
```

✅ **Already configured**: `patch-package` and `postinstall-postinstall` have been added to `package.json`, and the `postinstall` script is set up.

#### 4.2 Find files that need patching

Run the helper script to locate problematic code:

```bash
./scripts/find-expo-video-issues.sh
```

This will show you which files contain the deprecated APIs.

#### 4.3 Locate and patch expo-video files

The native iOS files are typically in:
```
node_modules/expo-video/ios/
```

You need to find and fix these specific issues:

**File 1: Find file using `AVAudioTimePitchAlgorithmLowQualityZeroLatency`**

Search for:
```objective-c
AVAudioTimePitchAlgorithmLowQualityZeroLatency
```

Replace with:
```objective-c
AVAudioTimePitchAlgorithmTimeDomain
```

**File 2: Find file comparing AVPlayerStatus with AVPlayerItemStatus**

Search for code like:
```objective-c
if (player.status == AVPlayerItemStatusReadyToPlay)
```

This should be checking `player.currentItem.status` instead:
```objective-c
if (player.currentItem.status == AVPlayerItemStatusReadyToPlay)
```

**File 3: Add nullability specifiers**

Find block declarations without nullability and add `_Nonnull`:
```objective-c
// Before
void (^completionHandler)(NSError *error);

// After
void (^completionHandler)(NSError * _Nullable error);
```

#### 4.4 Create patch file

After making the changes:
```bash
npx patch-package expo-video
```

This creates a patch file in `patches/expo-video+3.0.12.patch` that will automatically apply your fixes.

### Step 5: Fix React Native Header Issue

If the React header issue persists after pod install:

1. Open Xcode project
2. Select your project in the navigator
3. Select the **golfmatchapp** target
4. Go to **Build Settings**
5. Search for **Header Search Paths**
6. Add these paths (if not present):
   - `$(SRCROOT)/../node_modules/react-native/React` (recursive)
   - `$(SRCROOT)/../node_modules/react-native/ReactCommon` (recursive)
   - `$(SRCROOT)/../node_modules/react-native/ReactCommon/react/renderer` (recursive)

### Step 6: Build Settings Adjustments

1. In Xcode Build Settings, search for **Other C++ Flags**
2. Add: `-Wno-deprecated-declarations` to suppress deprecation warnings (if needed)

### Step 7: Verify Build

1. Open Xcode workspace: `ios/golfmatchapp.xcworkspace`
2. Select your target device/simulator
3. Build (Cmd + B)
4. Verify no blocking errors remain

## Alternative: Update expo-video

If a newer version of expo-video fixes these issues:

```bash
npm install expo-video@latest
cd ios
pod install
```

Check Expo documentation for the latest version compatible with SDK 54.

## Troubleshooting

### If React header errors persist:

1. Check React Native version compatibility
2. Verify `node_modules/react-native` exists and is properly installed
3. Try deleting `node_modules` and reinstalling:
   ```bash
   rm -rf node_modules
   npm install
   cd ios
   pod install
   ```

### If expo-video patches don't apply:

1. Ensure patch-package is installed
2. Check that `patches/expo-video+3.0.12.patch` exists
3. Reapply patches: `npx patch-package`

## Expected Outcome

After completing these steps:
- ✅ No blocking build errors
- ✅ App builds successfully in Xcode
- ✅ Deprecation warnings resolved (or suppressed)
- ✅ All type errors fixed

## Notes

- The React header issue is typically resolved by reinstalling pods
- The expo-video issues require patching the native code
- These patches will be automatically applied on `npm install` if patch-package is configured correctly

