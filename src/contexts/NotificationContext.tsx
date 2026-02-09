import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
  useRef,
  useCallback,
} from 'react';
import { AppState, AppStateStatus, Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { supabase } from '../services/supabase';
import { notificationService } from '../services/notificationService';
import { CacheService } from '../services/cacheService';
import {
  NotificationData,
  NotificationPreferences,
  NotificationType,
  MessageNotificationPayload,
  LikeNotificationPayload,
  MatchNotificationPayload,
  PostReactionNotificationPayload,
} from '../types/notifications';
import { RootStackParamList } from '../types';
import { useAuth } from './AuthContext';
import ToastNotification from '../components/ToastNotification';
import { UserActivityService } from '../services/userActivityService';
import { messagesService } from '../services/supabase/messages.service';
import { useNetworkStatus } from '../hooks/useNetworkStatus';

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

interface NotificationContextType {
  unreadCount: number;
  preferences: NotificationPreferences | null;
  updatePreferences: (prefs: Partial<NotificationPreferences>) => Promise<void>;
  refreshNotifications: () => Promise<void>;
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  hasNewConnections: boolean;
  clearConnectionNotification: () => Promise<void>;
  // MyPage badge is derived from hasNewNotifications OR hasNewFootprints
  hasNewMyPageNotification: boolean;
  // Separate tracking for お知らせ and 足あと sections
  hasNewNotifications: boolean;
  hasNewFootprints: boolean;
  clearNotificationsSection: () => Promise<void>;
  clearFootprintsSection: () => Promise<void>;
  hasNewMessages: boolean;
  clearMessagesNotification: () => Promise<void>;
  // Recruitment notifications
  hasNewRecruitmentNotifications: boolean;
  clearRecruitmentNotification: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(
  undefined
);

interface NotificationProviderProps {
  children: ReactNode;
}

export const NotificationProvider: React.FC<NotificationProviderProps> = ({
  children,
}) => {
  const { user, profileId } = useAuth();
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const [unreadCount, setUnreadCount] = useState(0);
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);
  const [currentToast, setCurrentToast] = useState<NotificationData | null>(null);
  const [toastVisible, setToastVisible] = useState(false);
  const [hasNewConnections, setHasNewConnections] = useState(false);
  // Separate tracking for お知らせ and 足あと sections
  const [hasNewNotifications, setHasNewNotifications] = useState(false);
  const [hasNewFootprints, setHasNewFootprints] = useState(false);
  // Derived state: MyPage badge shows if either section has new items
  const hasNewMyPageNotification = hasNewNotifications || hasNewFootprints;
  const [hasNewMessages, setHasNewMessages] = useState(false);
  // Recruitment notifications (for applications on user's recruitments)
  const [hasNewRecruitmentNotifications, setHasNewRecruitmentNotifications] = useState(false);

  const appState = useRef(AppState.currentState);
  const subscriptionsRef = useRef<any[]>([]);
  const notificationListener = useRef<any>(null);
  const responseListener = useRef<any>(null);
  // Track if initialization has completed to prevent cache from overwriting synced state
  const hasInitializedRef = useRef(false);

  // Network status for reconnection sync
  const { isOffline } = useNetworkStatus();
  const wasOfflineRef = useRef(false);

  // Load persisted notification states on mount (only if not yet initialized)
  // This provides fast UI feedback while waiting for database sync
  useEffect(() => {
    const loadNotificationStates = async () => {
      // Skip cache loading if initialization has already synced with database
      if (hasInitializedRef.current) {
        return;
      }
      
      const cachedConnection = await CacheService.get<boolean>('connection_notification');
      // Double-check initialization hasn't happened while we were loading cache
      if (cachedConnection && !hasInitializedRef.current) {
        setHasNewConnections(true);
      }
      // Load separate MyPage section states
      const cachedNotifications = await CacheService.get<boolean>('notifications_section_notification');
      if (cachedNotifications && !hasInitializedRef.current) {
        setHasNewNotifications(true);
      }
      const cachedFootprints = await CacheService.get<boolean>('footprints_section_notification');
      if (cachedFootprints && !hasInitializedRef.current) {
        setHasNewFootprints(true);
      }
      const cachedMessages = await CacheService.get<boolean>('messages_notification');
      if (cachedMessages && !hasInitializedRef.current) {
        setHasNewMessages(true);
      }
      // Load recruitment notifications
      const cachedRecruitment = await CacheService.get<boolean>('recruitment_notification');
      if (cachedRecruitment && !hasInitializedRef.current) {
        setHasNewRecruitmentNotifications(true);
      }
    };
    loadNotificationStates();
  }, []);

  // Initialize notifications when user logs in
  useEffect(() => {
    if (user && profileId) {
      initializeNotifications();
    } else {
      cleanupNotifications();
    }

    return () => {
      cleanupNotifications();
    };
  }, [user, profileId]);

  // Listen to app state changes
  useEffect(() => {
    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => {
      subscription.remove();
    };
  }, [handleAppStateChange]);

  // Monitor network status for reconnection sync
  useEffect(() => {
    if (wasOfflineRef.current && !isOffline && profileId) {
      console.log('[NotifRT] 🌐 Network reconnected, syncing all notifications...');
      checkForNewLikes();
      checkForNewFootprints();
      checkForNewNotifications();
    }
    wasOfflineRef.current = isOffline;
  }, [isOffline, profileId, checkForNewLikes, checkForNewFootprints, checkForNewNotifications]);

  // Set up notification tap handlers
  useEffect(() => {
    // Handle notification received while app is in foreground
    notificationListener.current = Notifications.addNotificationReceivedListener(
      (notification) => {
        console.log('Notification received:', notification);
      }
    );

    // Handle notification tap
    responseListener.current = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        handleNotificationTap(response.notification.request.content.data);
      }
    );

    return () => {
      if (notificationListener.current) {
        notificationListener.current.remove();
      }
      if (responseListener.current) {
        responseListener.current.remove();
      }
    };
  }, []);

  const initializeNotifications = async () => {
    if (!profileId) return;

    try {
      // Mark as initialized FIRST to prevent cache loading from overwriting state
      hasInitializedRef.current = true;
      
      // Register push token
      await notificationService.registerPushToken(profileId);

      // Load preferences
      const prefsResult = await notificationService.getPreferences(profileId);
      if (prefsResult.success && prefsResult.data) {
        setPreferences(prefsResult.data);
      }

      // Load unread notifications count and sync badge state
      const unreadResult = await notificationService.getUnreadCount(profileId);
      if (unreadResult.success && unreadResult.data !== undefined) {
        setUnreadCount(unreadResult.data);
        // Sync hasNewNotifications badge with actual unread count
        if (unreadResult.data > 0) {
          console.log('[NotifRT] 📊 Init: Setting hasNewNotifications = true (unread count:', unreadResult.data, ')');
          setHasNewNotifications(true);
          await CacheService.set('notifications_section_notification', true, 7 * 24 * 60 * 60 * 1000);
        } else {
          // Clear the badge if there are no unread notifications (cache was stale)
          console.log('[NotifRT] 📊 Init: Clearing hasNewNotifications (no unread notifications)');
          setHasNewNotifications(false);
          await CacheService.remove('notifications_section_notification');
        }
      }

      // Check for existing unread likes (for green dot on Connections tab)
      const newLikesCount = await UserActivityService.getNewLikesCount(profileId);
      if (newLikesCount > 0) {
        setHasNewConnections(true);
        await CacheService.set('connection_notification', true, 7 * 24 * 60 * 60 * 1000);
      } else {
        // Clear if no new likes (cache was stale)
        setHasNewConnections(false);
        await CacheService.remove('connection_notification');
      }

      // Check for existing unread messages (for green dot on Messages tab)
      const unreadMessagesResult = await messagesService.getTotalUnreadCount(profileId);
      if (unreadMessagesResult.success && unreadMessagesResult.data && unreadMessagesResult.data > 0) {
        setHasNewMessages(true);
        await CacheService.set('messages_notification', true, 7 * 24 * 60 * 60 * 1000);
      } else {
        // Clear if no unread messages (cache was stale)
        setHasNewMessages(false);
        await CacheService.remove('messages_notification');
      }

      // Check for existing unviewed footprints (for green dot on MyPage tab)
      const footprints = await UserActivityService.getFootprints(profileId);
      const hasUnviewedFootprints = footprints.some(f => f.isNew);
      if (hasUnviewedFootprints) {
        console.log('[NotifRT] 📊 Init: Setting hasNewFootprints = true (has unviewed footprints)');
        setHasNewFootprints(true);
        await CacheService.set('footprints_section_notification', true, 7 * 24 * 60 * 60 * 1000);
      } else {
        // Clear if no unviewed footprints (cache was stale)
        console.log('[NotifRT] 📊 Init: Clearing hasNewFootprints (no unviewed footprints)');
        setHasNewFootprints(false);
        await CacheService.remove('footprints_section_notification');
      }

      // Set up real-time subscriptions
      setupRealtimeSubscriptions();
    } catch (error) {
      console.error('Error initializing notifications:', error);
    }
  };

  const cleanupNotifications = () => {
    // Unsubscribe from all real-time channels
    subscriptionsRef.current.forEach((subscription) => {
      subscription.unsubscribe();
    });
    subscriptionsRef.current = [];
    setPreferences(null);
    setUnreadCount(0);
    // Reset initialization flag so next login will properly sync
    hasInitializedRef.current = false;
  };

  // Check for new likes (used for foreground/reconnection polling)
  const checkForNewLikes = useCallback(async () => {
    if (!profileId) return;
    try {
      const newLikesCount = await UserActivityService.getNewLikesCount(profileId);
      console.log('[NotifRT] 🔍 Polling check - new likes count:', newLikesCount);
      if (newLikesCount > 0) {
        setHasNewConnections(true);
        await CacheService.set('connection_notification', true, 7 * 24 * 60 * 60 * 1000);
        console.log('[NotifRT] 💾 Badge enabled via polling');
      }
    } catch (error) {
      console.error('[NotifRT] Error checking for new likes:', error);
    }
  }, [profileId]);

  // Check for new footprints (used for reconnection sync)
  const checkForNewFootprints = useCallback(async () => {
    if (!profileId) return;
    try {
      const footprints = await UserActivityService.getFootprints(profileId);
      const hasNew = footprints.some(f => f.isNew);
      console.log('[NotifRT] 🔍 Polling check - has new footprints:', hasNew);
      if (hasNew) {
        setHasNewFootprints(true);
        await CacheService.set('footprints_section_notification', true, 7 * 24 * 60 * 60 * 1000);
        console.log('[NotifRT] 💾 Footprints badge enabled via polling');
      }
    } catch (error) {
      console.error('[NotifRT] Error checking for new footprints:', error);
    }
  }, [profileId]);

  // Check for new notifications (used for reconnection sync)
  const checkForNewNotifications = useCallback(async () => {
    if (!profileId) return;
    try {
      const result = await notificationService.getUnreadCount(profileId);
      console.log('[NotifRT] 🔍 Polling check - unread notifications count:', result.data);
      if (result.success && result.data && result.data > 0) {
        setHasNewNotifications(true);
        await CacheService.set('notifications_section_notification', true, 7 * 24 * 60 * 60 * 1000);
        console.log('[NotifRT] 💾 Notifications badge enabled via polling');
      }
    } catch (error) {
      console.error('[NotifRT] Error checking for new notifications:', error);
    }
  }, [profileId]);

  const handleAppStateChange = useCallback((nextAppState: AppStateStatus) => {
    // App came to foreground - check for missed notifications
    if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
      console.log('[NotifRT] 📱 App foregrounded, checking for missed notifications...');
      checkForNewLikes();
      checkForNewFootprints();
      checkForNewNotifications();
    }
    appState.current = nextAppState;
  }, [checkForNewLikes, checkForNewFootprints, checkForNewNotifications]);

  const setupRealtimeSubscriptions = () => {
    if (!profileId) {
      console.log('[NotifRT] ⚠️ No profileId, skipping subscription setup');
      return;
    }
    console.log('[NotifRT] 🔧 Setting up subscriptions for profileId:', profileId);

    // Subscribe to new messages
    const messagesChannel = supabase
      .channel('user-messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `receiver_id=eq.${profileId}`,
        },
        (payload) => {
          console.log('[NotifRT] 💬 Message event received!', payload);
          handleMessageNotification(payload.new as MessageNotificationPayload);
        }
      )
      .subscribe((status) => {
        console.log('[NotifRT] 📡 Messages subscription status:', status);
      });

    // Subscribe to new likes
    const likesChannel = supabase
      .channel('user-likes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'user_likes',
          filter: `liked_user_id=eq.${profileId}`,
        },
        (payload) => {
          console.log('[NotifRT] 💚 Like event received!', payload);
          handleLikeNotification(payload.new as LikeNotificationPayload);
        }
      )
      .subscribe((status) => {
        console.log('[NotifRT] 📡 Likes subscription status:', status);
        if (status === 'SUBSCRIBED') {
          console.log('[NotifRT] ✅ Successfully subscribed to likes channel');
        } else if (status === 'CHANNEL_ERROR') {
          console.error('[NotifRT] ❌ Likes channel error - check publication settings');
        }
      });

    // Subscribe to new matches where user is user1
    const matchesChannel1 = supabase
      .channel('user-matches-1')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'matches',
          filter: `user1_id=eq.${profileId}`,
        },
        (payload) => {
          console.log('[NotifRT] 🎉 Match event received (as user1)!', payload);
          handleMatchNotification(payload.new as MatchNotificationPayload);
        }
      )
      .subscribe((status) => {
        console.log('[NotifRT] 📡 Matches (user1) subscription status:', status);
        if (status === 'SUBSCRIBED') {
          console.log('[NotifRT] ✅ Successfully subscribed to matches channel (user1)');
        } else if (status === 'CHANNEL_ERROR') {
          console.error('[NotifRT] ❌ Matches channel error (user1) - check publication settings');
        }
      });

    // Subscribe to new matches where user is user2
    const matchesChannel2 = supabase
      .channel('user-matches-2')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'matches',
          filter: `user2_id=eq.${profileId}`,
        },
        (payload) => {
          console.log('[NotifRT] 🎉 Match event received (as user2)!', payload);
          handleMatchNotification(payload.new as MatchNotificationPayload);
        }
      )
      .subscribe((status) => {
        console.log('[NotifRT] 📡 Matches (user2) subscription status:', status);
        if (status === 'SUBSCRIBED') {
          console.log('[NotifRT] ✅ Successfully subscribed to matches channel (user2)');
        } else if (status === 'CHANNEL_ERROR') {
          console.error('[NotifRT] ❌ Matches channel error (user2) - check publication settings');
        }
      });

    // Subscribe to post reactions
    const reactionsChannel = supabase
      .channel('post-reactions')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'post_reactions',
        },
        async (payload) => {
          console.log('[NotifRT] 👍 Reaction event received!', payload);
          const reaction = payload.new as PostReactionNotificationPayload;
          // Check if this reaction is on current user's post
          const { data: post } = await supabase
            .from('posts')
            .select('user_id')
            .eq('id', reaction.post_id)
            .single();

          if (post && post.user_id === profileId && reaction.user_id !== profileId) {
            handlePostReactionNotification(reaction);
          }
        }
      )
      .subscribe((status) => {
        console.log('[NotifRT] 📡 Reactions subscription status:', status);
      });

    // Subscribe to new footprints (profile views)
    const footprintsChannel = supabase
      .channel('user-footprints')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'profile_views',
          filter: `viewed_profile_id=eq.${profileId}`,
        },
        (payload) => {
          console.log('[NotifRT] 👣 Footprint event received!', payload);
          handleFootprintNotification(payload.new);
        }
      )
      .subscribe((status) => {
        console.log('[NotifRT] 📡 Footprints subscription status:', status);
      });

    // Subscribe to recruitment notifications (applications on user's recruitments)
    const recruitmentNotificationsChannel = supabase
      .channel('user-recruitment-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${profileId}`,
        },
        (payload) => {
          const notificationType = payload.new?.type;
          // Check if this is a recruitment-related notification
          if (notificationType === 'recruitment_application' ||
              notificationType === 'recruitment_approved' ||
              notificationType === 'recruitment_rejected') {
            console.log('[NotifRT] 🏌️ Recruitment notification received!', payload);
            handleRecruitmentNotification(payload.new);
          }
        }
      )
      .subscribe((status) => {
        console.log('[NotifRT] 📡 Recruitment notifications subscription status:', status);
      });

    subscriptionsRef.current = [
      messagesChannel,
      likesChannel,
      matchesChannel1,
      matchesChannel2,
      reactionsChannel,
      footprintsChannel,
      recruitmentNotificationsChannel,
    ];
  };

  const handleMessageNotification = async (message: MessageNotificationPayload) => {
    console.log('[NotifRT] 🔔 Processing message notification:', {
      from: message.sender_id,
      to: message.receiver_id,
      chatId: message.chat_id,
      currentProfileId: profileId,
    });

    if (!profileId || message.sender_id === profileId) {
      console.log('[NotifRT] ⏭️ Skipping message notification (self-message)');
      return;
    }

    const enabled = await notificationService.isNotificationEnabled(profileId, 'message');
    if (!enabled) {
      console.log('[NotifRT] ⏭️ Message notifications disabled by user preference');
      // Still set the badges even if notifications are disabled
      console.log('[NotifRT] ✅ Setting hasNewMessages = true');
      setHasNewMessages(true);
      await CacheService.set('messages_notification', true, 7 * 24 * 60 * 60 * 1000);
      console.log('[NotifRT] ✅ Setting hasNewNotifications = true (for お知らせ section)');
      setHasNewNotifications(true);
      await CacheService.set('notifications_section_notification', true, 7 * 24 * 60 * 60 * 1000);
      console.log('[NotifRT] 💾 Badges saved to cache');
      return;
    }

    // Get sender info
    const { data: sender } = await supabase
      .from('profiles')
      .select('name, profile_pictures')
      .eq('id', message.sender_id)
      .single();

    const title = sender?.name || 'メッセージ';
    const body = `${sender?.name || 'Someone'}からメッセージが届きました`;

    // Save notification to database
    await notificationService.createNotification(
      profileId,
      'message',
      title,
      body,
      message.sender_id,
      { chatId: message.chat_id }
    );

    // Show toast or push notification
    const notification: NotificationData = {
      id: message.id,
      user_id: profileId,
      type: 'message',
      title,
      body,
      from_user_id: message.sender_id,
      from_user_name: sender?.name,
      from_user_image: sender?.profile_pictures?.[0],
      data: { chatId: message.chat_id, fromUserId: message.sender_id },
      is_read: false,
      created_at: message.created_at,
    };

    // Set Messages notification indicator
    console.log('[NotifRT] ✅ Setting hasNewMessages = true');
    setHasNewMessages(true);
    await CacheService.set('messages_notification', true, 7 * 24 * 60 * 60 * 1000); // 7 days TTL
    console.log('[NotifRT] 💾 Messages badge saved to cache');

    showNotification(notification);
  };

  const handleLikeNotification = async (like: LikeNotificationPayload) => {
    console.log('[NotifRT] 🔔 Processing like notification:', {
      from: like.liker_user_id,
      to: like.liked_user_id,
      type: like.type,
      currentProfileId: profileId,
    });

    if (!profileId || like.liker_user_id === profileId || like.type === 'pass') {
      console.log('[NotifRT] ⏭️ Skipping like notification (self-like or pass)');
      return;
    }

    const enabled = await notificationService.isNotificationEnabled(profileId, 'like');
    if (!enabled) {
      console.log('[NotifRT] ⏭️ Like notifications disabled by user preference');
      // Still set the badges even if notifications are disabled
      console.log('[NotifRT] ✅ Setting hasNewConnections = true');
      setHasNewConnections(true);
      await CacheService.set('connection_notification', true, 7 * 24 * 60 * 60 * 1000);
      console.log('[NotifRT] ✅ Setting hasNewNotifications = true (for お知らせ section)');
      setHasNewNotifications(true);
      await CacheService.set('notifications_section_notification', true, 7 * 24 * 60 * 60 * 1000);
      console.log('[NotifRT] 💾 Badges saved to cache');
      return;
    }

    // Get liker info for toast notification display
    const { data: liker } = await supabase
      .from('profiles')
      .select('name, profile_pictures')
      .eq('id', like.liker_user_id)
      .single();

    const likeType = like.type === 'super_like' ? 'スーパーいいね' : 'いいね';
    const title = liker?.name || likeType;
    const body = `${liker?.name || 'Someone'}があなたに${likeType}しました`;

    // NOTE: Do NOT create notification here - the database trigger `create_like_notification`
    // already creates the notification row when a like is inserted.
    // This handler only updates UI badges and shows toast notification.

    const notification: NotificationData = {
      id: like.id,
      user_id: profileId,
      type: 'like',
      title,
      body,
      from_user_id: like.liker_user_id,
      from_user_name: liker?.name,
      from_user_image: liker?.profile_pictures?.[0],
      data: { fromUserId: like.liker_user_id },
      is_read: false,
      created_at: like.created_at,
    };

    // Set connection notification indicator
    console.log('[NotifRT] ✅ Setting hasNewConnections = true');
    setHasNewConnections(true);
    await CacheService.set('connection_notification', true, 7 * 24 * 60 * 60 * 1000); // 7 days TTL
    // Also set the MyPage notification badge since like notifications appear in お知らせ
    console.log('[NotifRT] ✅ Setting hasNewNotifications = true (for お知らせ section)');
    setHasNewNotifications(true);
    await CacheService.set('notifications_section_notification', true, 7 * 24 * 60 * 60 * 1000);
    console.log('[NotifRT] 💾 Badges saved to cache');

    showNotification(notification);
  };

  const handleMatchNotification = async (match: MatchNotificationPayload) => {
    console.log('[NotifRT] 🔔 Processing match notification:', {
      user1: match.user1_id,
      user2: match.user2_id,
      matchId: match.id,
      currentProfileId: profileId,
    });

    if (!profileId) {
      console.log('[NotifRT] ⏭️ Skipping match notification (no profileId)');
      return;
    }

    const enabled = await notificationService.isNotificationEnabled(profileId, 'match');
    if (!enabled) {
      console.log('[NotifRT] ⏭️ Match notifications disabled by user preference');
      // Still set the badges even if notifications are disabled
      console.log('[NotifRT] ✅ Setting hasNewConnections = true (match)');
      setHasNewConnections(true);
      await CacheService.set('connection_notification', true, 7 * 24 * 60 * 60 * 1000);
      console.log('[NotifRT] ✅ Setting hasNewNotifications = true (for お知らせ section)');
      setHasNewNotifications(true);
      await CacheService.set('notifications_section_notification', true, 7 * 24 * 60 * 60 * 1000);
      console.log('[NotifRT] 💾 Badges saved to cache');
      return;
    }

    // Get the other user's info for toast notification display
    const otherUserId = match.user1_id === profileId ? match.user2_id : match.user1_id;
    const { data: otherUser } = await supabase
      .from('profiles')
      .select('name, profile_pictures')
      .eq('id', otherUserId)
      .single();

    const title = 'マッチしました！';
    const body = `${otherUser?.name || 'Someone'}とマッチしました！`;

    // NOTE: Do NOT create notification here - the database trigger `create_match_notification`
    // already creates the notification row when a match is inserted.
    // This handler only updates UI badges and shows toast notification.

    const notification: NotificationData = {
      id: match.id,
      user_id: profileId,
      type: 'match',
      title,
      body,
      from_user_id: otherUserId,
      from_user_name: otherUser?.name,
      from_user_image: otherUser?.profile_pictures?.[0],
      data: { matchId: match.id, fromUserId: otherUserId },
      is_read: false,
      created_at: match.matched_at,
    };

    // Set connection notification indicator
    console.log('[NotifRT] ✅ Setting hasNewConnections = true (match)');
    setHasNewConnections(true);
    await CacheService.set('connection_notification', true, 7 * 24 * 60 * 60 * 1000); // 7 days TTL
    // Also set the MyPage notification badge since match notifications appear in お知らせ
    console.log('[NotifRT] ✅ Setting hasNewNotifications = true (for お知らせ section)');
    setHasNewNotifications(true);
    await CacheService.set('notifications_section_notification', true, 7 * 24 * 60 * 60 * 1000);
    console.log('[NotifRT] 💾 Badges saved to cache');

    showNotification(notification);
  };

  const handlePostReactionNotification = async (reaction: PostReactionNotificationPayload) => {
    if (!profileId || reaction.user_id === profileId) return;

    const enabled = await notificationService.isNotificationEnabled(profileId, 'post_reaction');
    if (!enabled) return;

    // Get reactor info for toast display
    const { data: reactor } = await supabase
      .from('profiles')
      .select('name, profile_pictures')
      .eq('id', reaction.user_id)
      .single();

    const title = reactor?.name || 'リアクション';
    const body = `${reactor?.name || 'Someone'}があなたの投稿にリアクションしました`;

    // NOTE: Do NOT create notification here - the database trigger `create_post_reaction_notification`
    // already creates the notification row when a reaction is inserted.
    // This handler only updates UI badges and shows toast notification.

    const notification: NotificationData = {
      id: reaction.id,
      user_id: profileId,
      type: 'post_reaction',
      title,
      body,
      from_user_id: reaction.user_id,
      from_user_name: reactor?.name,
      from_user_image: reactor?.profile_pictures?.[0],
      data: { postId: reaction.post_id, fromUserId: reaction.user_id },
      is_read: false,
      created_at: reaction.created_at,
    };

    showNotification(notification);
  };

  const handleFootprintNotification = async (view: any) => {
    console.log('[NotifRT] 🔔 Processing footprint notification:', {
      viewerId: view.viewer_id,
      viewedProfileId: view.viewed_profile_id,
      currentProfileId: profileId,
    });

    if (!profileId || view.viewer_id === profileId) {
      console.log('[NotifRT] ⏭️ Skipping footprint notification (self-view or no profileId)');
      return;
    }

    // Set footprints section notification indicator
    console.log('[NotifRT] ✅ Setting hasNewFootprints = true (for 足あと section)');
    setHasNewFootprints(true);
    await CacheService.set('footprints_section_notification', true, 7 * 24 * 60 * 60 * 1000); // 7 days TTL
    console.log('[NotifRT] 💾 Footprints badge saved to cache');
  };

  const handleRecruitmentNotification = async (notification: any) => {
    console.log('[NotifRT] 🔔 Processing recruitment notification:', {
      type: notification.type,
      userId: notification.user_id,
      currentProfileId: profileId,
    });

    if (!profileId) {
      console.log('[NotifRT] ⏭️ Skipping recruitment notification (no profileId)');
      return;
    }

    // Set recruitment notification indicator
    console.log('[NotifRT] ✅ Setting hasNewRecruitmentNotifications = true');
    setHasNewRecruitmentNotifications(true);
    await CacheService.set('recruitment_notification', true, 7 * 24 * 60 * 60 * 1000); // 7 days TTL
    console.log('[NotifRT] 💾 Recruitment badge saved to cache');

    // Also set the general notifications badge
    setHasNewNotifications(true);
    await CacheService.set('notifications_section_notification', true, 7 * 24 * 60 * 60 * 1000);
  };

  const showNotification = async (notification: NotificationData) => {
    const isAppInForeground = appState.current === 'active';

    if (isAppInForeground) {
      // Show toast notification
      setCurrentToast(notification);
      setToastVisible(true);
    }
    // Push notifications are handled server-side by the send-push-notification Edge Function.
    // No client-side push sending needed.

    // Set notifications section indicator for all notification types (お知らせ)
    setHasNewNotifications(true);
    await CacheService.set('notifications_section_notification', true, 7 * 24 * 60 * 60 * 1000); // 7 days TTL

    // Update unread count
    await refreshUnreadCount();
  };

  const handleNotificationTap = (data: any, notification?: NotificationData) => {
    // For messages, go to the chat
    if (data.chatId) {
      const userName = notification?.from_user_name || 'User';
      const userImage = notification?.from_user_image || '';
      navigation.navigate('Chat', { 
        chatId: data.chatId, 
        userId: data.fromUserId,
        userName,
        userImage
      });
    }
    // For all other notifications (likes, matches, post reactions), go to the user's profile
    else if (data.fromUserId) {
      navigation.navigate('Profile', { userId: data.fromUserId });
    }
  };

  const handleToastPress = () => {
    if (currentToast) {
      handleNotificationTap(currentToast.data, currentToast);
      setToastVisible(false);
    }
  };

  const handleToastDismiss = () => {
    setToastVisible(false);
    setCurrentToast(null);
  };

  const refreshUnreadCount = async () => {
    if (!profileId) return;
    const result = await notificationService.getUnreadCount(profileId);
    if (result.success && result.data !== undefined) {
      setUnreadCount(result.data);
    }
  };

  const refreshNotifications = async () => {
    await refreshUnreadCount();
  };

  const updatePreferences = async (prefs: Partial<NotificationPreferences>) => {
    if (!profileId) return;

    const result = await notificationService.updatePreferences(profileId, prefs);
    if (result.success && result.data) {
      setPreferences(result.data);
    }
  };

  const markAsRead = async (notificationId: string) => {
    await notificationService.markAsRead(notificationId);
    await refreshUnreadCount();
  };

  const markAllAsRead = async () => {
    if (!profileId) return;
    await notificationService.markAllAsRead(profileId);
    await refreshUnreadCount();
  };

  const clearConnectionNotification = async () => {
    setHasNewConnections(false);
    await CacheService.remove('connection_notification');
  };

  // Clear お知らせ section only (called when viewing/clearing NotificationHistoryScreen)
  const clearNotificationsSection = async () => {
    console.log('[NotifRT] 🧹 Clearing notifications section badge');
    setHasNewNotifications(false);
    await CacheService.remove('notifications_section_notification');
  };

  // Clear 足あと section only (called when viewing/clearing FootprintsScreen)
  const clearFootprintsSection = async () => {
    console.log('[NotifRT] 🧹 Clearing footprints section badge');
    setHasNewFootprints(false);
    await CacheService.remove('footprints_section_notification');
  };

  const clearMessagesNotification = async () => {
    setHasNewMessages(false);
    await CacheService.remove('messages_notification');
  };

  const clearRecruitmentNotification = async () => {
    console.log('[NotifRT] 🧹 Clearing recruitment notification badge');
    setHasNewRecruitmentNotifications(false);
    await CacheService.remove('recruitment_notification');
  };

  const contextValue: NotificationContextType = {
    unreadCount,
    preferences,
    updatePreferences,
    refreshNotifications,
    markAsRead,
    markAllAsRead,
    hasNewConnections,
    clearConnectionNotification,
    hasNewMyPageNotification,
    hasNewNotifications,
    hasNewFootprints,
    clearNotificationsSection,
    clearFootprintsSection,
    hasNewMessages,
    clearMessagesNotification,
    hasNewRecruitmentNotifications,
    clearRecruitmentNotification,
  };

  return (
    <NotificationContext.Provider value={contextValue}>
      {children}
      {currentToast && (
        <ToastNotification
          notification={currentToast}
          onPress={handleToastPress}
          onDismiss={handleToastDismiss}
          visible={toastVisible}
        />
      )}
    </NotificationContext.Provider>
  );
};

export const useNotifications = (): NotificationContextType => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within NotificationProvider');
  }
  return context;
};
