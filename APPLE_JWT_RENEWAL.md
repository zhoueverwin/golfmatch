# Apple Sign In JWT Renewal Guide

## Overview

The Apple Client Secret JWT used in Supabase expires after **180 days (6 months)**. You must regenerate and update it before expiration, otherwise users will not be able to sign in with Apple on Android/Web.

## When to Renew

- **Expiration**: 180 days from when the JWT was generated
- **Recommended**: Renew 1-2 weeks before expiration
- **Check expiration date**: The script shows the expiration date when you generate the JWT

## How to Renew the JWT

### Step 1: Locate Your .p8 Key File

Your `.p8` key file should be saved securely. It's typically named:
```
AuthKey_[KEY_ID].p8
```

Example: `AuthKey_49KB6PUFUW.p8`

**Important**: You can only download this file once from Apple Developer Console. If you lost it, you'll need to create a new key.

### Step 2: Update the Script Configuration

1. Open `generate-apple-secret.js`
2. Verify these values are correct:
   ```javascript
   const TEAM_ID = '5V7H8A99J4';  // Your Team ID
   const CLIENT_ID = 'com.zhoueverwin.golfmatchapp.signin';  // Your Service ID
   const KEY_ID = '49KB6PUFUW';  // Your Key ID (from .p8 filename)
   const KEY_FILE_PATH = '/Users/miho/Downloads/AuthKey_49KB6PUFUW.p8';  // Path to your .p8 file
   ```
3. Update `KEY_FILE_PATH` if your .p8 file is in a different location

### Step 3: Generate New JWT

Run the script:
```bash
cd /Users/miho/golfmatch
node generate-apple-secret.js
```

The script will:
- Generate a new JWT with a fresh 180-day expiration
- Display the JWT token
- Show the expiration date
- Save it to `apple-client-secret.txt` (in .gitignore)

### Step 4: Update Supabase

1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Navigate to **Authentication** → **Providers** → **Apple**
3. Copy the new JWT from the script output
4. Paste it into the **Secret Key (for OAuth)** field
5. Click **Save**

### Step 5: Test

1. Test Apple Sign In on Android device or web
2. Verify authentication works correctly
3. Check Supabase logs if there are any issues

## Setting Up Reminders

### Option 1: Calendar Reminder

Set a calendar reminder for **5 months** after generating the JWT:
- JWT generated: November 9, 2025
- Set reminder for: April 9, 2026 (renew 1 month before expiration)
- JWT expires: May 8, 2026

### Option 2: GitHub Issue

Create a GitHub issue with a reminder:
1. Go to your repository
2. Create an issue titled: "Renew Apple Sign In JWT - [Expiration Date]"
3. Set a label: `maintenance` or `security`
4. Add a due date reminder

### Option 3: Automated Monitoring (Advanced)

You could create a monitoring script that checks the JWT expiration, but for now, manual renewal is recommended.

## What Happens If You Forget?

If the JWT expires:
- ❌ **Android users** will not be able to sign in with Apple
- ❌ **Web users** will not be able to sign in with Apple
- ✅ **iOS users** will still work (uses native authentication, doesn't need JWT)

**Solution**: Generate a new JWT and update Supabase immediately.

## Troubleshooting

### "Invalid token" error in Supabase

- **Cause**: JWT has expired
- **Solution**: Generate a new JWT and update Supabase

### "Invalid key" error

- **Cause**: .p8 file is corrupted or wrong file
- **Solution**: Re-download from Apple Developer Console (if possible) or create a new key

### Can't find .p8 file

- **Cause**: File was deleted or moved
- **Solution**: 
  1. Check Downloads folder
  2. Check if you have a backup
  3. If lost, create a new Sign in with Apple Key in Apple Developer Console
  4. Update KEY_ID in the script to match the new key

## Security Best Practices

1. **Never commit**:
   - `.p8` key files
   - Generated JWT tokens
   - `apple-client-secret.txt`

2. **Keep secure**:
   - Store .p8 file in a secure location (password manager, encrypted drive)
   - Don't share the JWT publicly
   - Rotate keys periodically (every 1-2 years)

3. **Document**:
   - Keep track of when JWT was generated
   - Note the expiration date
   - Set reminders for renewal

## Quick Reference

**Current Configuration**:
- Team ID: `5V7H8A99J4`
- Service ID: `com.zhoueverwin.golfmatchapp.signin`
- Key ID: `49KB6PUFUW`
- .p8 File: `AuthKey_49KB6PUFUW.p8`

**Renewal Command**:
```bash
node generate-apple-secret.js
```

**Next Renewal Date**: Check the expiration date shown when you generate the JWT (typically 180 days from generation date).

---

## Summary

1. **Every 180 days**: Run `node generate-apple-secret.js`
2. **Copy the JWT**: From script output
3. **Update Supabase**: Paste into Secret Key field
4. **Test**: Verify authentication works
5. **Set reminder**: For next renewal (5 months from now)

That's it! The process takes about 5 minutes every 6 months.

