import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
  useRef,
} from 'react';
import { AppState, AppStateStatus, Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { supabase } from '../services/supabase';
import { notificationService } from '../services/notificationService';
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

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

interface NotificationContextType {
  unreadCount: number;
  preferences: NotificationPreferences | null;
  updatePreferences: (prefs: Partial<NotificationPreferences>) => Promise<void>;
  refreshNotifications: () => Promise<void>;
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
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
  
  const appState = useRef(AppState.currentState);
  const subscriptionsRef = useRef<any[]>([]);
  const notificationListener = useRef<any>();
  const responseListener = useRef<any>();

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
  }, []);

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
      // Register push token
      await notificationService.registerPushToken(profileId);

      // Load preferences
      const prefsResult = await notificationService.getPreferences(profileId);
      if (prefsResult.success && prefsResult.data) {
        setPreferences(prefsResult.data);
      }

      // Load unread count
      await refreshUnreadCount();

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
  };

  const handleAppStateChange = (nextAppState: AppStateStatus) => {
    appState.current = nextAppState;
  };

  const setupRealtimeSubscriptions = () => {
    if (!profileId) return;

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
        (payload) => handleMessageNotification(payload.new as MessageNotificationPayload)
      )
      .subscribe();

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
        (payload) => handleLikeNotification(payload.new as LikeNotificationPayload)
      )
      .subscribe();

    // Subscribe to new matches
    const matchesChannel = supabase
      .channel('user-matches')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'matches',
        },
        (payload) => {
          const match = payload.new as MatchNotificationPayload;
          if (match.user1_id === profileId || match.user2_id === profileId) {
            handleMatchNotification(match);
          }
        }
      )
      .subscribe();

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
      .subscribe();

    subscriptionsRef.current = [
      messagesChannel,
      likesChannel,
      matchesChannel,
      reactionsChannel,
    ];
  };

  const handleMessageNotification = async (message: MessageNotificationPayload) => {
    if (!profileId || message.sender_id === profileId) return;

    const enabled = await notificationService.isNotificationEnabled(profileId, 'message');
    if (!enabled) return;

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

    showNotification(notification);
  };

  const handleLikeNotification = async (like: LikeNotificationPayload) => {
    if (!profileId || like.liker_user_id === profileId || like.type === 'pass') return;

    const enabled = await notificationService.isNotificationEnabled(profileId, 'like');
    if (!enabled) return;

    // Get liker info
    const { data: liker } = await supabase
      .from('profiles')
      .select('name, profile_pictures')
      .eq('id', like.liker_user_id)
      .single();

    const likeType = like.type === 'super_like' ? 'スーパーいいね' : 'いいね';
    const title = liker?.name || likeType;
    const body = `${liker?.name || 'Someone'}があなたに${likeType}しました`;

    // Save notification to database
    await notificationService.createNotification(
      profileId,
      'like',
      title,
      body,
      like.liker_user_id,
      { fromUserId: like.liker_user_id }
    );

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

    showNotification(notification);
  };

  const handleMatchNotification = async (match: MatchNotificationPayload) => {
    if (!profileId) return;

    const enabled = await notificationService.isNotificationEnabled(profileId, 'match');
    if (!enabled) return;

    // Get the other user's info
    const otherUserId = match.user1_id === profileId ? match.user2_id : match.user1_id;
    const { data: otherUser } = await supabase
      .from('profiles')
      .select('name, profile_pictures')
      .eq('id', otherUserId)
      .single();

    const title = 'マッチしました！';
    const body = `${otherUser?.name || 'Someone'}とマッチしました！`;

    // Save notification to database
    await notificationService.createNotification(
      profileId,
      'match',
      title,
      body,
      otherUserId,
      { matchId: match.id, fromUserId: otherUserId }
    );

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

    showNotification(notification);
  };

  const handlePostReactionNotification = async (reaction: PostReactionNotificationPayload) => {
    if (!profileId || reaction.user_id === profileId) return;

    const enabled = await notificationService.isNotificationEnabled(profileId, 'post_reaction');
    if (!enabled) return;

    // Get reactor info
    const { data: reactor } = await supabase
      .from('profiles')
      .select('name, profile_pictures')
      .eq('id', reaction.user_id)
      .single();

    const title = reactor?.name || 'リアクション';
    const body = `${reactor?.name || 'Someone'}があなたの投稿にリアクションしました`;

    // Save notification to database
    await notificationService.createNotification(
      profileId,
      'post_reaction',
      title,
      body,
      reaction.user_id,
      { postId: reaction.post_id, fromUserId: reaction.user_id }
    );

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

  const showNotification = async (notification: NotificationData) => {
    const isAppInForeground = appState.current === 'active';

    if (isAppInForeground) {
      // Show toast notification
      setCurrentToast(notification);
      setToastVisible(true);
    } else {
      // Send push notification
      if (preferences?.push_enabled && profileId) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('push_token')
          .eq('id', profileId)
          .single();

        if (profile?.push_token) {
          await notificationService.sendPushNotification(
            profile.push_token,
            notification.title,
            notification.body,
            notification.data
          );
        }
      }
    }

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

  const contextValue: NotificationContextType = {
    unreadCount,
    preferences,
    updatePreferences,
    refreshNotifications,
    markAsRead,
    markAllAsRead,
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
