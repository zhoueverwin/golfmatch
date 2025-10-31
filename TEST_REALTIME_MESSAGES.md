# Real-Time Message Testing Guide

## What Was Fixed

### 1. **Database Configuration (CRITICAL)**
   - **Problem**: The `messages` table was NOT in the `supabase_realtime` publication
   - **Fix**: Enabled realtime replication with: `ALTER PUBLICATION supabase_realtime ADD TABLE messages;`
   - **Impact**: Without this, Supabase's real-time server never broadcasts INSERT events for messages

### 2. **Subscription Status Handling**
   - Added subscription status callback to track connection states
   - Added error handling with fallback to payload data
   - Added detailed console logging for debugging

### 3. **Message Deduplication**
   - Changed from sender-based filtering to ID-based duplicate detection
   - Ensures all incoming messages are processed (from both users)
   - Prevents duplicates when messages arrive via multiple paths

### 4. **useFocusEffect Conflict**
   - Disabled automatic message reload on screen focus
   - Prevents race conditions between `loadMessages()` and real-time updates
   - Initial load still happens on mount via `useEffect`

## Testing Steps

### Prerequisites
- Two devices or emulators (Device A and Device B)
- Two test accounts (User A and User B)
- Existing match/chat between the users

### Test 1: Basic Real-Time Delivery
1. **Device A**: Log in as User A, open chat with User B
2. **Device B**: Log in as User B, open chat with User A
3. **Device A**: Send message "Test 1"
4. **Expected Result**: Message appears instantly on Device B without refresh
5. **Device B**: Send message "Test 2"
6. **Expected Result**: Message appears instantly on Device A without refresh

### Test 2: Rapid Message Exchange
1. Both devices in same chat
2. **Device A**: Send 5 messages rapidly
3. **Expected Result**: All 5 messages appear on Device B in correct order
4. **Device B**: Send 5 messages rapidly  
5. **Expected Result**: All 5 messages appear on Device A in correct order
6. **Verify**: No duplicates, no missing messages

### Test 3: Background/Foreground
1. **Device A**: In chat with Device B
2. **Device B**: Send message "Background test"
3. **Device A**: Put app in background
4. **Device B**: Send message "Foreground test"
5. **Device A**: Bring app to foreground
6. **Expected Result**: Both messages visible on Device A

### Test 4: Network Interruption
1. Both devices in chat
2. **Device A**: Turn off WiFi/Data
3. **Device B**: Send 3 messages
4. **Device A**: Turn on WiFi/Data
5. **Expected Result**: Messages appear after reconnection

### Test 5: Image/Video Messages
1. **Device A**: Send image message
2. **Expected Result**: Image appears instantly on Device B
3. **Device B**: Send video message
4. **Expected Result**: Video appears instantly on Device A

## Debugging Console Logs

Watch for these log messages:

### Successful Subscription
```
[MessagesService] Successfully subscribed to chat:<chatId>
[ChatScreen] Setting up real-time subscription for chat:<chatId>
```

### Receiving Messages
```
[ChatScreen] Received real-time message: {
  id: "...",
  sender_id: "...",
  currentUserId: "...",
  isFromOtherUser: true/false
}
```

### Duplicate Detection (Should NOT see this often)
```
[ChatScreen] Message <id> already exists, skipping
```

### Error Indicators
```
[MessagesService] Channel error for chat:<chatId>
[MessagesService] Subscription timeout for chat:<chatId>
[MessagesService] Error fetching message: ...
```

## Common Issues and Solutions

### Issue 1: "No real-time updates"
- **Check**: Is realtime enabled? Run: `SELECT * FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'messages';`
- **Solution**: If empty, run: `ALTER PUBLICATION supabase_realtime ADD TABLE messages;`

### Issue 2: "Messages appear only after refresh"
- **Check**: Console for "Successfully subscribed" message
- **Solution**: Verify Supabase URL and anon key in `.env`

### Issue 3: "Duplicate messages"
- **Check**: Console for "already exists" messages
- **Solution**: Should be working with ID-based deduplication

### Issue 4: "Subscription timeout"
- **Check**: Network connection and Supabase status
- **Solution**: Check firewall/proxy settings, try different network

### Issue 5: "Channel error"
- **Check**: RLS policies on messages table
- **Solution**: Verify user has SELECT permission via RLS policies

## Monitoring Real-Time Status

### Check Supabase Dashboard
1. Go to Database → Replication
2. Verify `supabase_realtime` publication includes `messages` table
3. Check "Realtime" tab for active connections

### Check Network Tab (React Native Debugger)
1. Look for WebSocket connections to Supabase
2. Should see `wss://` connection
3. Watch for ping/pong messages

### Check Supabase Logs
```bash
# In golfmatchcode directory
supabase logs realtime
```

## Performance Metrics

- **Message Delivery Time**: < 500ms
- **Duplicate Rate**: 0%
- **Missing Messages**: 0%
- **Auto-scroll**: Smooth, no jumps
- **Memory Usage**: Stable, no leaks

## Rollback Instructions

If issues persist, revert changes:

```typescript
// In messages.service.ts - use simple subscription
subscribeToChat(chatId: string, callback: (message: Message) => void) {
  const subscription = supabase
    .channel(`chat:${chatId}`)
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'messages',
      filter: `chat_id=eq.${chatId}`,
    }, async (payload) => {
      const { data } = await supabase
        .from('messages')
        .select('*, sender:profiles!messages_sender_id_fkey(*), receiver:profiles!messages_receiver_id_fkey(*)')
        .eq('id', payload.new.id)
        .single();
      if (data) callback(data as Message);
    })
    .subscribe();
  return () => subscription.unsubscribe();
}
```

## Next Steps

1. Test thoroughly with real users
2. Monitor Supabase logs for errors
3. Consider adding retry logic for failed subscriptions
4. Add connection status indicator in UI
5. Implement typing indicators (future enhancement)

