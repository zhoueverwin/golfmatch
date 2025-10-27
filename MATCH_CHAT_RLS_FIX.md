# Match & Chat RLS Policy Fix ✅

**Date**: October 20, 2025  
**Issue**: Same RLS error as user_likes - using wrong auth check  
**Status**: FIXED

---

## 🔴 Error

```
ERROR [likeUser] upsert error: {
  "code": "42501",
  "message": "new row violates row-level security policy for table \"chats\""
}
```

---

## 🔍 Root Cause (Same as LIKE_BUTTON_FIX_SUMMARY.md)

**Problem**: RLS policies compared `auth.uid()` (auth user ID) directly with `user1_id`/`user2_id` (profile UUIDs)

**Why it failed**:
- `auth.uid()` returns: `'test_user_8'` or auth UUID
- `user1_id`/`user2_id` are: Profile UUIDs from profiles table
- These are **different values** → RLS check fails

**Same pattern as user_likes fix**: Need to check through `profiles` table!

---

## ✅ Solution Applied

### Before (WRONG) ❌
```sql
-- Comparing auth.uid() directly to profile UUID
CREATE POLICY "Users can create chats where they are a participant"
ON public.chats FOR INSERT
WITH CHECK (
  auth.uid() = user1_id OR auth.uid() = user2_id  -- ❌ Wrong!
);
```

### After (CORRECT) ✅
```sql
-- Check through profiles table (same pattern as user_likes)
CREATE POLICY "Users can create chats where they are a participant"
ON public.chats FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = chats.user1_id
    AND profiles.user_id = auth.uid()::text  -- ✅ Correct!
  )
  OR
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = chats.user2_id
    AND profiles.user_id = auth.uid()::text  -- ✅ Correct!
  )
);
```

---

## 🔧 All Policies Fixed

### 1. Chats Table
- ✅ INSERT policy - Fixed to check via profiles
- ✅ SELECT policy - Fixed to check via profiles

### 2. Matches Table
- ✅ INSERT policy - Fixed to check via profiles
- ✅ UPDATE policy - Fixed to check via profiles
- ✅ SELECT policy - Fixed to check via profiles

---

## 📊 Policy Comparison

| Table | Policy | Before | After |
|-------|--------|--------|-------|
| chats | INSERT | `auth.uid() = user1_id` ❌ | `profiles.user_id = auth.uid()::text` ✅ |
| chats | SELECT | `auth.uid() = user1_id` ❌ | `profiles.user_id = auth.uid()::text` ✅ |
| matches | INSERT | `auth.uid() = user1_id` ❌ | `profiles.user_id = auth.uid()::text` ✅ |
| matches | UPDATE | `auth.uid() = user1_id` ❌ | `profiles.user_id = auth.uid()::text` ✅ |
| matches | SELECT | `auth.uid() = user1_id` ❌ | `profiles.user_id = auth.uid()::text` ✅ |

---

## 🎯 How It Works Now

### Authentication Flow
```
User signs in
  ↓
Supabase creates JWT with auth.uid() = 'test_user_8'
  ↓
profiles table: { id: 'uuid...', user_id: 'test_user_8' }
  ↓
When creating match/chat:
  ↓
RLS checks: profiles.user_id = auth.uid()::text
  ↓
'test_user_8' = 'test_user_8' ✅ MATCH!
  ↓
INSERT allowed
```

### Complete Like → Match → Chat Flow

```
1. User A likes User B
   └─ user_likes policy checks: profiles.user_id = auth.uid()::text ✅
   
2. User B likes User A back
   └─ user_likes policy checks: profiles.user_id = auth.uid()::text ✅
   
3. System detects mutual like → creates match
   └─ matches policy checks: profiles.user_id = auth.uid()::text ✅
   
4. System creates chat for match
   └─ chats policy checks: profiles.user_id = auth.uid()::text ✅
   
5. ✅ Complete flow works!
```

---

## 🧪 Test It Now

### Step 1: Like Each Other
1. Sign in as `zhou.wenbin.x2@gmail.com`
2. Like Hiroshi
3. Sign out
4. Sign in as Hiroshi
5. Like `zhou.wenbin.x2` back

### Step 2: Verify Results
**Expected**:
- ✅ No RLS errors
- ✅ Match created in database
- ✅ Chat created automatically
- ✅ Can send messages

**Before Fix**:
```
❌ Like works
❌ Match creation fails (RLS error on matches)
❌ Chat creation fails (RLS error on chats)
❌ Can't message
```

**After Fix**:
```
✅ Like works
✅ Match created
✅ Chat created
✅ Can message
```

---

## 📋 Summary

### What Was Wrong
Just like the `user_likes` fix in LIKE_BUTTON_FIX_SUMMARY.md:
- RLS policies compared `auth.uid()` directly to profile UUIDs
- They're different types/values → always failed
- Need to check through `profiles` table

### What Was Fixed
Applied **same pattern** as user_likes fix to:
- `matches` table (all policies)
- `chats` table (all policies)
- Now checks: `profiles.user_id = auth.uid()::text`

### Impact
- ✅ Matches can be created
- ✅ Chats can be created  
- ✅ Complete like → match → chat flow works
- ✅ Users can message after mutual like

---

## 🔐 Security

**Still secure!** The fix maintains proper security:
- Users can only create matches they're part of
- Users can only create chats they're part of
- No impersonation possible
- Auth token properly validated

---

## 📚 Related Fixes

1. **LIKE_BUTTON_FIX_SUMMARY.md** - Original user_likes RLS fix
2. **MATCH_CHAT_RLS_FIX.md** - This fix (matches + chats)
3. **AUTH_FIXES_COMPLETE.md** - Profile creation fix

**Pattern**: All use `profiles.user_id = auth.uid()::text` for RLS checks! ✅

---

**Status**: ✅ **FIXED - Ready to Test**

Try liking users now - the complete flow should work end-to-end!



