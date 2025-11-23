# Bug Fix: Profile Screen Crash

## Issue
App crashed when clicking on user profiles with error:
```
TypeError: Cannot read property 'name' of undefined
```

## Root Cause Analysis

### Problem 1: Missing User Data in Posts
The `renderPost` function was trying to access `item.user.name` without checking if `item.user` exists. When React Query fetches posts, there might be edge cases where:
- Post data is incomplete
- User data hasn't been populated yet
- Data is in an inconsistent state during loading

### Problem 2: Undefined Variable Reference
The variable `hasMorePosts` was referenced but no longer defined after migrating to React Query. It should have been replaced with `hasNextPage` from the `useUserPosts` hook.

## Fixes Applied

### Fix 1: Added Safety Check in renderPost
**File**: `src/screens/UserProfileScreen.tsx`

**Before**:
```typescript
const renderPost = ({ item }: { item: Post }) => {
  const isExpanded = expandedPosts[item.id] || false;
  // ... directly accessing item.user.name
  return (
    <Text>{item.user.name}</Text>  // ❌ Crashes if item.user is undefined
  );
};
```

**After**:
```typescript
const renderPost = ({ item }: { item: Post }) => {
  // Safety check: Ensure post has user data
  if (!item || !item.user) {
    console.warn('[UserProfileScreen] Post missing user data:', item?.id);
    return null;  // ✅ Gracefully handle missing data
  }

  const isExpanded = expandedPosts[item.id] || false;
  // ... rest of the code
  return (
    <Text>{item.user.name}</Text>  // ✅ Safe to access now
  );
};
```

### Fix 2: Replaced hasMorePosts with hasNextPage
**File**: `src/screens/UserProfileScreen.tsx`

**Before**:
```typescript
{hasMorePosts && (  // ❌ Variable not defined
  <TouchableOpacity>
    <Text>すべての投稿を見る</Text>
  </TouchableOpacity>
)}
```

**After**:
```typescript
{hasNextPage && (  // ✅ Using React Query's hasNextPage
  <TouchableOpacity>
    <Text>すべての投稿を見る</Text>
  </TouchableOpacity>
)}
```

## Testing Recommendations

### Test Case 1: View User Profile
```
1. Navigate to home feed
2. Click on any user's profile picture
3. Verify profile loads without crashing
4. Check that posts display correctly
```

### Test Case 2: View Own Profile
```
1. Navigate to "My Page"
2. Verify profile loads
3. Check that own posts display
```

### Test Case 3: Profile with No Posts
```
1. View a profile with no posts
2. Verify no crash occurs
3. Check empty state displays correctly
```

### Test Case 4: Profile with Incomplete Data
```
1. View profiles with various data states
2. Verify graceful handling of missing data
3. Check console for warning messages
```

## Prevention Measures

### 1. Always Check Data Existence
```typescript
// ❌ Bad
const name = user.profile.name;

// ✅ Good
const name = user?.profile?.name || 'Unknown';
```

### 2. Add Safety Checks in Render Functions
```typescript
const renderItem = ({ item }) => {
  if (!item) return null;  // Early return
  // ... rest of render logic
};
```

### 3. Use TypeScript Strict Mode
Ensure `strictNullChecks` is enabled in `tsconfig.json`:
```json
{
  "compilerOptions": {
    "strictNullChecks": true
  }
}
```

### 4. Handle Loading States
```typescript
if (isLoading) return <Loading />;
if (!data) return <EmptyState />;
return <Content data={data} />;
```

## Related Files Modified
- `src/screens/UserProfileScreen.tsx` - Added safety checks and fixed variable reference

## Impact
- ✅ No more crashes when viewing profiles
- ✅ Graceful handling of incomplete data
- ✅ Better error logging for debugging
- ✅ Improved user experience

## Notes
- The warning log helps identify data inconsistencies during development
- In production, users won't see errors - just missing posts
- Consider adding Sentry/error tracking to catch these issues in production

