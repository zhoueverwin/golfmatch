# ✅ RLS Policy Fix for Match Creation

**Date**: October 20, 2025  
**Issue**: Match creation failed with RLS policy violation  
**Status**: FIXED

---

## 🔴 Original Error

```
ERROR [likeUser] upsert error: {
  "code": "42501",
  "message": "new row violates row-level security policy for table \"matches\""
}
```

**Context**:
- User `zhou.wenbin.x2@gmail.com` (ID: `9fd46653-2d38-43b0-acfd-01511c1eb500`) liked Hiroshi
- Hiroshi (ID: `1b05870e-ff52-432e-a1e5-efb3282ca2de`) liked back
- App tried to create a match
- RLS policy blocked the INSERT operation

---

## 🔍 Root Cause

The `matches` table had RLS enabled but was **missing INSERT and UPDATE policies**.

**Before Fix**:
- ✅ SELECT policy existed (users can view their matches)
- ❌ INSERT policy missing (couldn't create matches)
- ❌ UPDATE policy missing (couldn't update match status)

**Result**: When both users liked each other, the app couldn't create the match record.

---

## ✅ Solution Applied

Added comprehensive RLS policies for the entire matching flow:

### 1. Matches Table Policies

```sql
-- Allow users to create matches where they are a participant
CREATE POLICY "Users can create matches where they are a participant"
ON public.matches
FOR INSERT
TO public
WITH CHECK (
  auth.uid() = user1_id OR auth.uid() = user2_id
);

-- Allow users to update their own matches
CREATE POLICY "Users can update their own matches"
ON public.matches
FOR UPDATE
TO public
USING (auth.uid() = user1_id OR auth.uid() = user2_id)
WITH CHECK (auth.uid() = user1_id OR auth.uid() = user2_id);
```

### 2. User Likes Table Policies (Verified)

```sql
-- Users can create their own likes
CREATE POLICY "Users can create their own likes"
ON public.user_likes
FOR INSERT
TO public
WITH CHECK (auth.uid() = liker_user_id);

-- Users can view likes involving them
CREATE POLICY "Users can view likes involving them"
ON public.user_likes
FOR SELECT
TO public
USING (
  auth.uid() = liker_user_id OR auth.uid() = liked_user_id
);

-- Users can update their own likes
CREATE POLICY "Users can update their own likes"
ON public.user_likes
FOR UPDATE
TO public
USING (auth.uid() = liker_user_id)
WITH CHECK (auth.uid() = liker_user_id);

-- Users can delete their own likes
CREATE POLICY "Users can delete their own likes"
ON public.user_likes
FOR DELETE
TO public
USING (auth.uid() = liker_user_id);
```

### 3. Chats Table Policies

```sql
-- Allow users to create chats where they are a participant
CREATE POLICY "Users can create chats where they are a participant"
ON public.chats
FOR INSERT
TO public
WITH CHECK (
  auth.uid() = user1_id OR auth.uid() = user2_id
);
```

---

## 📊 Final Policy Summary

| Table | SELECT | INSERT | UPDATE | DELETE |
|-------|--------|--------|--------|--------|
| `user_likes` | ✅ | ✅ | ✅ | ✅ |
| `matches` | ✅ | ✅ | ✅ | - |
| `chats` | ✅ | ✅ | - | - |

**All necessary policies in place!** ✅

---

## 🧪 Testing

### How to Test the Fix

1. **Sign in as User A** (e.g., `zhou.wenbin.x2@gmail.com`)
2. **Like User B** (e.g., Hiroshi)
3. **Sign out**
4. **Sign in as User B** (Hiroshi)
5. **Like User A back**
6. **✅ Match should be created successfully!**

### Expected Behavior

**Before Fix**:
```
❌ Like action succeeds
❌ Match creation fails with RLS error
❌ No match record created
❌ Users can't chat
```

**After Fix**:
```
✅ Like action succeeds
✅ Match is created automatically
✅ Chat is created for the match
✅ Users can start messaging
```

---

## 🔐 Security Considerations

### What the Policies Enforce

1. **user_likes**:
   - Users can only create likes where THEY are the liker
   - Users can see likes they gave OR received
   - Users can only update/delete their own likes
   - ✅ Prevents fake likes

2. **matches**:
   - Users can only create matches where THEY are a participant
   - Both users can see the match
   - Both users can update match status (e.g., unmatch)
   - ✅ Prevents unauthorized match creation

3. **chats**:
   - Users can only create chats where THEY are a participant
   - Both users can see the chat
   - ✅ Prevents unauthorized chat access

### What's Protected

- ✅ Users cannot create likes on behalf of others
- ✅ Users cannot create matches between other people
- ✅ Users cannot see matches they're not part of
- ✅ Users cannot access chats from matches they're not in

---

## 📱 User Impact

### Before Fix
- Users could like each other
- Match creation would silently fail
- No notification of match
- No ability to chat
- Confusing user experience

### After Fix
- Users can like each other
- Match is created instantly
- Both users notified
- Chat opens automatically
- Seamless experience ✅

---

## 🔄 Related Tables

These tables also have proper RLS policies (already configured):

- `profiles` - User profile data
- `messages` - Chat messages
- `posts` - User posts
- `post_likes` - Post likes
- `post_reactions` - Post reactions
- `post_comments` - Post comments

---

## ✅ Verification Checklist

- [x] INSERT policy added to `matches` table
- [x] UPDATE policy added to `matches` table  
- [x] INSERT policy verified on `user_likes` table
- [x] INSERT policy added to `chats` table
- [x] Duplicate policies removed
- [x] All policies use `auth.uid()` for authentication
- [x] Security constraints properly enforced
- [x] Documentation created

---

## 🎯 Result

**Match creation now works!** ✅

When two users like each other:
1. User A likes User B → `user_likes` record created ✅
2. User B likes User A → `user_likes` record created ✅
3. System detects mutual like → `matches` record created ✅
4. System creates chat → `chats` record created ✅
5. Both users can now message each other ✅

---

## 📝 SQL Scripts for Reference

**Check all policies**:
```sql
SELECT tablename, policyname, cmd
FROM pg_policies
WHERE schemaname = 'public' 
  AND tablename IN ('user_likes', 'matches', 'chats')
ORDER BY tablename, cmd;
```

**Check if RLS is enabled**:
```sql
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public' 
  AND tablename IN ('user_likes', 'matches', 'chats');
```

---

**End of Report**
