# Email Verification Issue - Diagnosis & Fix

## 🔍 Problem
Emails are not being sent during signup verification step. This was working before.

## ✅ What I Verified

### 1. Code Analysis
- ✅ `signUpWithEmail()` correctly calls `supabase.auth.signUp()`
- ✅ Handles email confirmation flow correctly
- ✅ Shows verification screen when email confirmation is required

### 2. Database Check
- ✅ Recent users show `confirmation_sent_at` timestamps (emails were sent before)
- ✅ Most recent: Oct 31, 02:08:56 - confirmation sent successfully

### 3. Auth Logs
- ✅ `/signup` endpoint returns 200 (success)
- ✅ `/resend` endpoint returns 200 (success)
- ⚠️ But no email sending events visible in logs

## 🎯 Root Cause
The issue is likely in **Supabase Dashboard Settings**, not in the code.

## 🔧 Fix Steps

### Step 1: Check Email Confirmations Setting
1. Go to: https://supabase.com/dashboard/project/rriwpoqhbgvprbhomckk/auth/providers
2. Click on **"Email"** tab
3. Verify **"Enable email confirmations"** is **ON** ✅
4. If OFF, toggle it ON and save

### Step 2: Check SMTP Configuration
1. Go to: https://supabase.com/dashboard/project/rriwpoqhbgvprbhomckk/settings/auth
2. Scroll to **"SMTP Settings"**
3. Verify SMTP is configured:
   - If using Supabase built-in mailer: Should show "Built-in Mailer" (60 emails/hour limit)
   - If using custom SMTP: Verify credentials are correct

### Step 3: Check Email Template
1. Go to: https://supabase.com/dashboard/project/rriwpoqhbgvprbhomckk/auth/templates
2. Click **"Confirm signup"** template
3. Verify it includes: `{{ .Token }}` (the OTP code)
4. Template should look like:
   ```html
   <h2>Confirm your signup</h2>
   <p>Enter this code in the app:</p>
   <p><strong>{{ .Token }}</strong></p>
   ```

### Step 4: Check Rate Limits
1. Built-in mailer has **60 emails/hour limit**
2. If exceeded, emails won't send until limit resets
3. Check: https://supabase.com/dashboard/project/rriwpoqhbgvprbhomckk/logs/edge-logs
   - Look for email sending errors

### Step 5: Test with New Email
Try signing up with a **completely new email** (not used before):
- This ensures it's not an "existing user" issue
- If new email works, the issue might be with existing user handling

## 🐛 Possible Issues

### Issue 1: Email Confirmations Disabled
**Symptom**: Users can sign in immediately without verification
**Fix**: Enable "Confirm email" in Auth → Providers → Email

### Issue 2: SMTP Not Configured
**Symptom**: No emails sent, no errors in logs
**Fix**: Configure SMTP or use built-in mailer

### Issue 3: Rate Limit Exceeded
**Symptom**: Emails worked before, stopped working after many signups
**Fix**: Wait for rate limit reset, or configure custom SMTP

### Issue 4: Email Template Missing Token
**Symptom**: Emails sent but no OTP code in email
**Fix**: Add `{{ .Token }}` to email template

### Issue 5: Existing User Signup
**Symptom**: Trying to signup with existing email, no email sent
**Fix**: This is expected behavior - existing users won't get new confirmation emails

## ✅ Quick Test
1. Sign up with a **new email address** (never used before)
2. Check if verification screen appears
3. Check email inbox (and spam folder)
4. If email arrives → Issue is resolved ✅
5. If email doesn't arrive → Check Supabase settings above

## 📝 Code Fix (If Needed)
If Supabase settings are correct but emails still don't send, we can add explicit options:
```typescript
const { data, error } = await supabase.auth.signUp({
  email,
  password,
  options: {
    emailRedirectTo: 'golfmatch://auth/callback', // Optional
    data: {
      name: email.split('@')[0],
    }
  }
});
```

But this shouldn't be necessary if settings are correct.
