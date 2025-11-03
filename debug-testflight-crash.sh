#!/bin/bash

# TestFlight Crash Debug Script
# This script helps diagnose common TestFlight crash issues

echo "=================================="
echo "🔍 TestFlight Crash Diagnostic"
echo "=================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo -e "${RED}❌ Error: package.json not found${NC}"
    echo "Please run this script from the golfmatch-app directory"
    exit 1
fi

echo "📦 Project: $(grep -m1 '"name"' package.json | cut -d'"' -f4)"
echo ""

# Step 1: Check EAS CLI
echo "1️⃣  Checking EAS CLI..."
if command -v eas &> /dev/null; then
    EAS_VERSION=$(eas --version)
    echo -e "${GREEN}✅ EAS CLI installed: $EAS_VERSION${NC}"
else
    echo -e "${RED}❌ EAS CLI not installed${NC}"
    echo "   Install with: npm install -g eas-cli"
    exit 1
fi
echo ""

# Step 2: Check EAS Login
echo "2️⃣  Checking EAS authentication..."
if eas whoami &> /dev/null; then
    EAS_USER=$(eas whoami 2>/dev/null)
    echo -e "${GREEN}✅ Logged in as: $EAS_USER${NC}"
else
    echo -e "${RED}❌ Not logged in to EAS${NC}"
    echo "   Login with: eas login"
    exit 1
fi
echo ""

# Step 3: Check Environment Variables in EAS
echo "3️⃣  Checking EAS environment variables..."
echo ""
echo "Secrets configured in EAS:"
eas secret:list 2>/dev/null | grep -E "EXPO_PUBLIC_SUPABASE" || echo -e "${YELLOW}⚠️  No Supabase secrets found${NC}"
echo ""

# Check specifically for required secrets
MISSING_SECRETS=0
if ! eas secret:list 2>/dev/null | grep -q "EXPO_PUBLIC_SUPABASE_URL"; then
    echo -e "${RED}❌ Missing: EXPO_PUBLIC_SUPABASE_URL${NC}"
    MISSING_SECRETS=1
else
    echo -e "${GREEN}✅ EXPO_PUBLIC_SUPABASE_URL is set${NC}"
fi

if ! eas secret:list 2>/dev/null | grep -q "EXPO_PUBLIC_SUPABASE_ANON_KEY"; then
    echo -e "${RED}❌ Missing: EXPO_PUBLIC_SUPABASE_ANON_KEY${NC}"
    MISSING_SECRETS=1
else
    echo -e "${GREEN}✅ EXPO_PUBLIC_SUPABASE_ANON_KEY is set${NC}"
fi
echo ""

if [ $MISSING_SECRETS -eq 1 ]; then
    echo -e "${YELLOW}⚠️  CRITICAL: Missing environment variables!${NC}"
    echo ""
    echo "This is likely the cause of your TestFlight crash."
    echo ""
    echo "To fix, run these commands:"
    echo -e "${YELLOW}eas secret:create --scope project --name EXPO_PUBLIC_SUPABASE_URL --value \"YOUR_URL\"${NC}"
    echo -e "${YELLOW}eas secret:create --scope project --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value \"YOUR_KEY\"${NC}"
    echo ""
fi

# Step 4: Check local .env file
echo "4️⃣  Checking local .env file..."
if [ -f ".env" ]; then
    echo -e "${GREEN}✅ .env file exists${NC}"
    if grep -q "EXPO_PUBLIC_SUPABASE_URL" .env && grep -q "EXPO_PUBLIC_SUPABASE_ANON_KEY" .env; then
        echo -e "${GREEN}✅ Supabase variables found in .env${NC}"
    else
        echo -e "${YELLOW}⚠️  Supabase variables not found in .env${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  No .env file found (not critical for EAS builds)${NC}"
fi
echo ""

# Step 5: Check app.config.js
echo "5️⃣  Checking app configuration..."
if [ -f "app.config.js" ]; then
    echo -e "${GREEN}✅ app.config.js exists (good for dynamic config)${NC}"
    if grep -q "EXPO_PUBLIC_SUPABASE" app.config.js; then
        echo -e "${GREEN}✅ Supabase config found in app.config.js${NC}"
    fi
elif [ -f "app.json" ]; then
    echo -e "${YELLOW}⚠️  Using static app.json (consider migrating to app.config.js)${NC}"
fi
echo ""

# Step 6: Check recent builds
echo "6️⃣  Checking recent EAS builds..."
echo ""
echo "Recent iOS builds:"
eas build:list --platform ios --limit 3 2>/dev/null | grep -E "(FINISHED|IN_PROGRESS|IN_QUEUE|NEW)" || echo "No builds found"
echo ""

# Step 7: Check Expo configuration
echo "7️⃣  Checking Expo project configuration..."
if [ -f "app.json" ] || [ -f "app.config.js" ]; then
    echo -e "${GREEN}✅ App configuration found${NC}"
    if grep -q "expo-constants" package.json; then
        echo -e "${GREEN}✅ expo-constants installed (needed for env vars)${NC}"
    else
        echo -e "${YELLOW}⚠️  expo-constants not found in package.json${NC}"
        echo "   Install with: npx expo install expo-constants"
    fi
else
    echo -e "${RED}❌ No app configuration found${NC}"
fi
echo ""

# Summary
echo "=================================="
echo "📊 Summary"
echo "=================================="
echo ""

if [ $MISSING_SECRETS -eq 1 ]; then
    echo -e "${RED}🚨 CRITICAL ISSUES FOUND${NC}"
    echo ""
    echo "Your app is likely crashing because environment variables are not set in EAS."
    echo ""
    echo "📋 Action Items:"
    echo "1. Set your Supabase credentials in EAS:"
    echo "   ${YELLOW}eas secret:create --scope project --name EXPO_PUBLIC_SUPABASE_URL --value \"YOUR_URL\"${NC}"
    echo "   ${YELLOW}eas secret:create --scope project --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value \"YOUR_KEY\"${NC}"
    echo ""
    echo "2. Rebuild your app:"
    echo "   ${YELLOW}eas build --platform ios --profile production --clear-cache${NC}"
    echo ""
    echo "3. While waiting, get crash logs from TestFlight:"
    echo "   - Connect iPhone to Mac"
    echo "   - Open Xcode > Window > Devices and Simulators"
    echo "   - Select your device > View Device Logs"
    echo "   - Find 'golfmatch' crash logs"
    echo ""
else
    echo -e "${GREEN}✅ Configuration looks good!${NC}"
    echo ""
    echo "If your app is still crashing, you need to get the crash logs:"
    echo ""
    echo "📱 Get Crash Logs:"
    echo "Method 1 (Recommended):"
    echo "  1. Connect iPhone to Mac via USB"
    echo "  2. Open Xcode"
    echo "  3. Go to: Window > Devices and Simulators"
    echo "  4. Select your iPhone"
    echo "  5. Click 'View Device Logs'"
    echo "  6. Find crash log for 'golfmatch'"
    echo ""
    echo "Method 2 (App Store Connect):"
    echo "  1. Go to https://appstoreconnect.apple.com"
    echo "  2. Navigate to: My Apps > GolfMatch > TestFlight > Crashes"
    echo "  3. Download the crash report"
    echo ""
    echo "Method 3 (On iPhone):"
    echo "  1. Settings > Privacy & Security > Analytics & Improvements"
    echo "  2. Tap 'Analytics Data'"
    echo "  3. Find 'golfmatch' entries"
    echo "  4. Share to yourself"
    echo ""
fi

echo ""
echo "📚 Full debugging guide:"
echo "   cat ../TESTFLIGHT_CRASH_DEBUG_GUIDE.md"
echo ""
echo "=================================="

