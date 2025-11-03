#!/bin/bash
# Script to find and fix expo-video iOS native code issues
# Run this on your Mac after installing dependencies

set -e

EXPO_VIDEO_DIR="node_modules/expo-video/ios"
PATCHES_DIR="patches"

echo "🔍 Searching for expo-video iOS native files..."

if [ ! -d "$EXPO_VIDEO_DIR" ]; then
    echo "❌ Error: expo-video iOS directory not found at $EXPO_VIDEO_DIR"
    echo "   Make sure you've run 'npm install' first"
    exit 1
fi

echo "✅ Found expo-video iOS directory"

# Find files with deprecated API
echo ""
echo "📋 Searching for deprecated AVAudioTimePitchAlgorithmLowQualityZeroLatency..."
grep -r "AVAudioTimePitchAlgorithmLowQualityZeroLatency" "$EXPO_VIDEO_DIR" || echo "   (Not found - may already be fixed)"

# Find files with enum comparison issues
echo ""
echo "📋 Searching for AVPlayerStatus/AVPlayerItemStatus comparison issues..."
grep -r "player\.status == AVPlayerItemStatus" "$EXPO_VIDEO_DIR" || echo "   (Not found - may already be fixed)"

# Find Objective-C files
echo ""
echo "📋 Found Objective-C files in expo-video iOS:"
find "$EXPO_VIDEO_DIR" -name "*.m" -o -name "*.mm" | head -10

echo ""
echo "📝 Next steps:"
echo "   1. Open each file found above in Xcode or a text editor"
echo "   2. Search and replace:"
echo "      - AVAudioTimePitchAlgorithmLowQualityZeroLatency → AVAudioTimePitchAlgorithmTimeDomain"
echo "      - player.status == AVPlayerItemStatusReadyToPlay → player.currentItem.status == AVPlayerItemStatusReadyToPlay"
echo "   3. Add nullability specifiers to block pointers"
echo "   4. Run: npx patch-package expo-video"
echo ""
echo "📚 See XCODE_BUILD_FIXES.md for detailed instructions"


