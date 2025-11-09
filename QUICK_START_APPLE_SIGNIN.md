# Quick Start: Apple Sign In

**⏱️ Setup Time: ~45 minutes**

## Step-by-Step Setup

### 1️⃣ Apple Developer Console (30 min)

Open `APPLE_SIGNIN_SETUP.md` and complete:

- [ ] Enable Sign in with Apple for App ID: `com.zhoueverwin.golfmatchapp`
- [ ] Create Service ID: `com.zhoueverwin.golfmatchapp.signin`
- [ ] Configure Return URL: `https://rriwpoqhbgvprbhomckk.supabase.co/auth/v1/callback`
- [ ] Generate Sign in with Apple Key (download .p8 file)
- [ ] Note your Team ID and Key ID

### 2️⃣ Supabase Configuration (10 min)

Open `SUPABASE_APPLE_CONFIG.md` and complete:

- [ ] Go to Supabase Dashboard → Authentication → Providers → Apple
- [ ] Toggle "Enable Sign in with Apple" to ON
- [ ] Client IDs: Enter `com.zhoueverwin.golfmatchapp,com.zhoueverwin.golfmatchapp.signin`
- [ ] Secret Key: Paste your .p8 file content (entire file including BEGIN/END lines)
- [ ] Copy the Callback URL shown
- [ ] Add Callback URL to Apple Developer Console Service ID
- [ ] Click Save

### 3️⃣ Build & Test (30 min)

**iOS (Physical Device Required)**:

**Option 1: Local Build (Faster, Recommended)**:
```bash
npx expo run:ios --device
```
- Requires Xcode installed
- Device must be connected via USB
- Builds and runs directly on device

**Option 2: EAS Build**:
```bash
eas build --profile development --platform ios
```
- Use if you don't have Xcode
- Install .ipa file after build completes

**Android**:
```bash
npx expo run:android
# OR
eas build --profile development --platform android
```

### 4️⃣ Test Authentication

- [ ] Install app on device
- [ ] Tap "Sign in with Apple" button
- [ ] Complete authentication
- [ ] Verify user appears in Supabase Dashboard

---

## ✅ Implementation Complete

The code is ready! You just need to:
1. Complete Apple Developer setup
2. Configure Supabase
3. Build and test

---

## 📚 Full Documentation

- **`APPLE_SIGNIN_SETUP.md`** - Apple Developer Console detailed guide
- **`SUPABASE_APPLE_CONFIG.md`** - Supabase configuration detailed guide  
- **`APPLE_SIGNIN_IMPLEMENTATION_SUMMARY.md`** - Complete implementation overview

---

## 🆘 Need Help?

See the Troubleshooting sections in:
- `APPLE_SIGNIN_SETUP.md` (Part 4)
- `SUPABASE_APPLE_CONFIG.md` (Troubleshooting section)

