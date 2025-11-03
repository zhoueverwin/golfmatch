#!/bin/bash

# Environment Variables Setup Script
# This script helps you configure your environment variables for both local development and EAS builds

set -e

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo ""
echo "=========================================="
echo "🔧 GolfMatch Environment Setup"
echo "=========================================="
echo ""

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo -e "${RED}❌ Error: package.json not found${NC}"
    echo "Please run this script from the golfmatch-app directory"
    exit 1
fi

# Step 1: Get Supabase credentials
echo -e "${BLUE}Step 1: Get Your Supabase Credentials${NC}"
echo "----------------------------------------"
echo ""
echo "1. Go to: https://app.supabase.com/"
echo "2. Select your GolfMatch project"
echo "3. Click on 'Settings' (gear icon on the left)"
echo "4. Go to 'API' section"
echo "5. You'll see:"
echo "   - Project URL"
echo "   - Project API keys → anon/public"
echo ""
echo -e "${YELLOW}Press Enter when you have your credentials ready...${NC}"
read -r

# Step 2: Create local .env file
echo ""
echo -e "${BLUE}Step 2: Create Local .env File${NC}"
echo "----------------------------------------"
echo ""

if [ -f ".env" ]; then
    echo -e "${YELLOW}⚠️  .env file already exists${NC}"
    echo "Current contents:"
    cat .env
    echo ""
    echo "Do you want to overwrite it? (y/n)"
    read -r overwrite
    if [ "$overwrite" != "y" ]; then
        echo "Skipping local .env creation"
    else
        rm .env
    fi
fi

if [ ! -f ".env" ]; then
    echo "Enter your Supabase URL (e.g., https://xxxxx.supabase.co):"
    read -r SUPABASE_URL
    
    echo "Enter your Supabase Anon Key:"
    read -r SUPABASE_ANON_KEY
    
    cat > .env << EOF
# GolfMatch Environment Variables
# Generated on $(date)

EXPO_PUBLIC_SUPABASE_URL=$SUPABASE_URL
EXPO_PUBLIC_SUPABASE_ANON_KEY=$SUPABASE_ANON_KEY
EOF
    
    echo -e "${GREEN}✅ .env file created successfully!${NC}"
    echo ""
fi

# Step 3: Set up EAS secrets
echo ""
echo -e "${BLUE}Step 3: Set Up EAS Build Secrets${NC}"
echo "----------------------------------------"
echo ""
echo "For your app to work on TestFlight, we need to set these"
echo "variables in EAS (Expo Application Services)."
echo ""

# Check if EAS CLI is installed
if ! command -v eas &> /dev/null; then
    echo -e "${RED}❌ EAS CLI not found${NC}"
    echo ""
    echo "Installing EAS CLI..."
    npm install -g eas-cli
    echo ""
fi

# Check if logged in
if ! eas whoami &> /dev/null; then
    echo -e "${YELLOW}⚠️  Not logged in to EAS${NC}"
    echo ""
    echo "Please log in to EAS:"
    eas login
    echo ""
fi

# Get credentials from .env if it exists
if [ -f ".env" ]; then
    SUPABASE_URL=$(grep EXPO_PUBLIC_SUPABASE_URL .env | cut -d '=' -f2)
    SUPABASE_ANON_KEY=$(grep EXPO_PUBLIC_SUPABASE_ANON_KEY .env | cut -d '=' -f2)
fi

echo "Current EAS secrets:"
eas secret:list 2>/dev/null | grep -E "Name|EXPO_PUBLIC_SUPABASE" || echo "(none set)"
echo ""

echo "Do you want to set/update EAS secrets now? (y/n)"
read -r set_secrets

if [ "$set_secrets" = "y" ]; then
    echo ""
    
    # Check if secrets already exist
    if eas secret:list 2>/dev/null | grep -q "EXPO_PUBLIC_SUPABASE_URL"; then
        echo "EXPO_PUBLIC_SUPABASE_URL already exists. Deleting..."
        eas secret:delete --name EXPO_PUBLIC_SUPABASE_URL
    fi
    
    if eas secret:list 2>/dev/null | grep -q "EXPO_PUBLIC_SUPABASE_ANON_KEY"; then
        echo "EXPO_PUBLIC_SUPABASE_ANON_KEY already exists. Deleting..."
        eas secret:delete --name EXPO_PUBLIC_SUPABASE_ANON_KEY
    fi
    
    echo ""
    echo "Creating EAS secrets..."
    
    if [ -z "$SUPABASE_URL" ] || [ -z "$SUPABASE_ANON_KEY" ]; then
        echo "Enter your Supabase URL:"
        read -r SUPABASE_URL
        echo "Enter your Supabase Anon Key:"
        read -r SUPABASE_ANON_KEY
    fi
    
    eas secret:create --scope project --name EXPO_PUBLIC_SUPABASE_URL --value "$SUPABASE_URL" --force
    eas secret:create --scope project --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value "$SUPABASE_ANON_KEY" --force
    
    echo ""
    echo -e "${GREEN}✅ EAS secrets set successfully!${NC}"
    echo ""
    echo "Verifying..."
    eas secret:list | grep -E "Name|EXPO_PUBLIC_SUPABASE"
fi

# Step 4: Summary
echo ""
echo "=========================================="
echo "✅ Setup Complete!"
echo "=========================================="
echo ""
echo -e "${GREEN}Your environment is now configured!${NC}"
echo ""
echo "📋 What was set up:"
if [ -f ".env" ]; then
    echo "  ✅ Local .env file (for Expo Go development)"
fi
if [ "$set_secrets" = "y" ]; then
    echo "  ✅ EAS secrets (for TestFlight builds)"
fi
echo ""
echo "🚀 Next Steps:"
echo ""
echo "1. Test locally:"
echo "   ${BLUE}npm start${NC}"
echo ""
echo "2. Build for TestFlight:"
echo "   ${BLUE}eas build --platform ios --profile production${NC}"
echo ""
echo "3. Run diagnostic:"
echo "   ${BLUE}./debug-testflight-crash.sh${NC}"
echo ""
echo "=========================================="
echo ""

