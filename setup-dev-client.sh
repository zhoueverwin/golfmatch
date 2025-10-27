#!/bin/bash

# GolfMatch App - Development Client Setup Script
# This script sets up expo-dev-client for full push notification support

set -e  # Exit on error

echo "============================================"
echo "GolfMatch App - Dev Client Setup"
echo "============================================"
echo ""
echo "This will set up expo-dev-client so you can test"
echo "push notifications (Expo Go doesn't support them)."
echo ""

# Navigate to app directory
cd "$(dirname "$0")/golfmatch-app"

echo "📦 Step 1: Installing expo-dev-client..."
npx expo install expo-dev-client

echo ""
echo "✅ Dev client package installed!"
echo ""
echo "============================================"
echo "Choose your platform:"
echo "============================================"
echo ""
echo "1. Android (recommended if you have Android device)"
echo "2. iOS (requires Mac with Xcode)"
echo "3. EAS Build (cloud build - works on any OS)"
echo "4. Skip build (I'll build manually)"
echo ""
read -p "Enter choice (1-4): " choice

case $choice in
  1)
    echo ""
    echo "📱 Building for Android..."
    echo ""
    echo "Make sure your Android device is:"
    echo "  1. Connected via USB"
    echo "  2. USB Debugging is enabled"
    echo "  3. Computer is authorized on device"
    echo ""
    read -p "Ready? Press Enter to continue..."
    npx expo run:android --device
    ;;
  2)
    echo ""
    echo "📱 Building for iOS..."
    echo ""
    echo "Make sure you have:"
    echo "  1. Xcode installed"
    echo "  2. iPhone connected"
    echo "  3. Developer account configured"
    echo ""
    read -p "Ready? Press Enter to continue..."
    npx expo run:ios --device
    ;;
  3)
    echo ""
    echo "☁️  Setting up EAS Build..."
    echo ""
    echo "First, install EAS CLI globally:"
    echo "  npm install -g eas-cli"
    echo ""
    echo "Then run:"
    echo "  eas login"
    echo "  eas build:configure"
    echo "  eas build --profile development --platform android"
    echo ""
    echo "Visit the docs: https://docs.expo.dev/build/setup/"
    ;;
  4)
    echo ""
    echo "⏭️  Skipping build..."
    echo ""
    echo "To build manually, run one of:"
    echo "  npx expo run:android --device"
    echo "  npx expo run:ios --device"
    echo "  eas build --profile development --platform [android|ios]"
    ;;
  *)
    echo "Invalid choice. Exiting."
    exit 1
    ;;
esac

echo ""
echo "============================================"
echo "✅ Setup Complete!"
echo "============================================"
echo ""
echo "🎉 Your notification system is ready!"
echo ""
echo "📋 What's included:"
echo "  ✅ Push notifications (foreground & background)"
echo "  ✅ In-app toast notifications"
echo "  ✅ Notification history screen"
echo "  ✅ Notification settings"
echo "  ✅ Badge counts"
echo "  ✅ Real-time updates"
echo ""
echo "🚀 Next steps:"
echo ""
echo "1. For daily development, just run:"
echo "   npx expo start --dev-client"
echo ""
echo "2. Open your CUSTOM APP (not Expo Go!) on your device"
echo ""
echo "3. Test notifications:"
echo "   - Login as User A"
echo "   - Have User B send a like/message"
echo "   - User A receives notification!"
echo ""
echo "📚 Full guide: NOTIFICATION_DEV_CLIENT_SETUP.md"
echo ""
echo "Happy coding! 🎉"

