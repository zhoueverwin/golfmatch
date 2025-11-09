# Supabase Apple Configuration - Quick Reference

**Updated for current Supabase UI** (as of November 2025)

---

## Configuration Fields

### 1. Enable Sign in with Apple
**Toggle**: Turn it **ON** (blue)

---

### 2. Client IDs
**What to enter**: Comma-separated list of Apple identifiers

```
com.zhoueverwin.golfmatchapp,com.zhoueverwin.golfmatchapp.signin
```

**Explanation**:
- First ID: `com.zhoueverwin.golfmatchapp` = iOS Bundle ID
- Second ID: `com.zhoueverwin.golfmatchapp.signin` = Service ID for Android/Web

**Format**: Must be comma-separated, no spaces

---

### 3. Secret Key (for OAuth)
**What to enter**: Contents of your .p8 key file

**How to get it**:
1. Download .p8 file from Apple Developer Console (when creating Sign in with Apple Key)
2. Open the file in a text editor (TextEdit, Notepad, VS Code)
3. Copy **everything** including these lines:
   ```
   -----BEGIN PRIVATE KEY-----
   [long string of characters]
   -----END PRIVATE KEY-----
   ```
4. Paste into the Secret Key field in Supabase

**Example structure**:
```
-----BEGIN PRIVATE KEY-----
MIGTAgEAMBMGByqGSM49AgEGCCqGSM49AwEHBHkwdwIBAQQgXOWwXy2KZ+kk8LAa
tVqKhFGTRRBLG35vJ3FXGJt9cQOgCgYIKoZIzj0DAQehRANCAARAelPi6PqwNpzO
8vH73GZ8FJ7KpKakHOTrLRqRbcMXK3SsdWRk3lKqo=
-----END PRIVATE KEY-----
```

**⚠️ Important**: 
- Include the BEGIN and END lines
- Don't add any extra spaces or line breaks
- Copy the entire file content

---

### 4. Allow users without an email
**Toggle**: Leave it **OFF** (recommended)

Only turn ON if you want to allow users who hide their email to still authenticate.

---

### 5. Callback URL (for OAuth)
**Display only**: `https://rriwpoqhbgvprbhomckk.supabase.co/auth/v1/callback`

**Action required**: 
1. Click **Copy** button
2. Go to Apple Developer Console
3. Add this URL to your Service ID's Return URLs

---

## Step-by-Step Checklist

- [ ] **Step 1**: Toggle "Enable Sign in with Apple" to ON
- [ ] **Step 2**: In "Client IDs", paste: `com.zhoueverwin.golfmatchapp,com.zhoueverwin.golfmatchapp.signin`
- [ ] **Step 3**: Open your .p8 file and copy its entire contents
- [ ] **Step 4**: Paste .p8 contents into "Secret Key (for OAuth)" field
- [ ] **Step 5**: Leave "Allow users without an email" OFF
- [ ] **Step 6**: Click "Copy" next to Callback URL
- [ ] **Step 7**: Go to Apple Developer Console → Service ID → Configure
- [ ] **Step 8**: Add the callback URL to Return URLs in Apple Developer Console
- [ ] **Step 9**: Save in Apple Developer Console
- [ ] **Step 10**: Click "Save" in Supabase

---

## Common Mistakes to Avoid

❌ **Wrong**: Adding spaces in Client IDs
```
com.zhoueverwin.golfmatchapp, com.zhoueverwin.golfmatchapp.signin
```

✅ **Correct**: No spaces
```
com.zhoueverwin.golfmatchapp,com.zhoueverwin.golfmatchapp.signin
```

---

❌ **Wrong**: Only pasting part of the .p8 file
```
MIGTAgEAMBMGByqGSM49AgEGCCqGSM49AwEHBHkwdw...
```

✅ **Correct**: Include BEGIN and END lines
```
-----BEGIN PRIVATE KEY-----
MIGTAgEAMBMGByqGSM49AgEGCCqGSM49AwEHBHkwdw...
-----END PRIVATE KEY-----
```

---

❌ **Wrong**: Callback URL has typo or missing in Apple Console
```
https://rriwpoqhbgvprbhomckk.supabase.co/auth/callback
```

✅ **Correct**: Exact match
```
https://rriwpoqhbgvprbhomckk.supabase.co/auth/v1/callback
```

---

## Testing

After saving:

### iOS Test
```bash
eas build --profile development --platform ios
```
- Install on physical iPhone (iOS 13+)
- Tap "Sign in with Apple"
- Native iOS sheet should appear
- Authenticate
- Check Supabase Dashboard for new user

### Android Test
```bash
eas build --profile development --platform android
```
- Install on Android device
- Tap "Sign in with Apple"
- Browser should open
- Authenticate
- App should receive session
- Check Supabase Dashboard for new user

---

## Troubleshooting

### "Invalid client" error
- Check Client IDs are exactly: `com.zhoueverwin.golfmatchapp,com.zhoueverwin.golfmatchapp.signin`
- No extra spaces
- Both IDs exist in Apple Developer Console

### "Invalid key" or "Authentication failed"
- Re-copy the .p8 file contents
- Ensure you copied the entire file
- Check for corrupted line breaks
- Try copying from a plain text editor (not Word or rich text)

### "Redirect URI mismatch"
- Copy the Callback URL from Supabase exactly
- Add it to Apple Developer Console Service ID
- Save in Apple Developer Console
- Wait a few minutes for changes to propagate

---

## Quick Summary

**What you need from Apple Developer Console**:
1. iOS Bundle ID: `com.zhoueverwin.golfmatchapp`
2. Service ID: `com.zhoueverwin.golfmatchapp.signin`
3. .p8 Key file (downloaded when creating Sign in with Apple Key)

**What you enter in Supabase**:
1. Toggle: Enable Sign in with Apple = ON
2. Client IDs = `com.zhoueverwin.golfmatchapp,com.zhoueverwin.golfmatchapp.signin`
3. Secret Key = Contents of .p8 file (with BEGIN/END lines)

**What you do in Apple Console with Supabase URL**:
1. Copy Callback URL from Supabase
2. Add to Service ID → Return URLs in Apple Developer Console
3. Save

**Then**: Click Save in Supabase and test!

---

## Need More Help?

See the full detailed guides:
- `APPLE_SIGNIN_SETUP.md` - Apple Developer Console setup
- `SUPABASE_APPLE_CONFIG.md` - Complete Supabase configuration
- `APPLE_SIGNIN_IMPLEMENTATION_SUMMARY.md` - Full implementation details

