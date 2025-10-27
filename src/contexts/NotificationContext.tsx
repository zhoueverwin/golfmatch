import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  ReactNode,
} from 'react';
import { AppState, AppStateStatus } from 'react-native';
import * as Notifications from 'expo-notifications';
import { useAuth } from './AuthContext';
import { notificationService } from '../services/notificationService';
import { realtimeNotificationService } from '../services/realtimeNotificationService';
import {
  NotificationPreferences,
  UnreadCounts,
  ToastNotification,
} from '../types/notifications';
import NotificationToast from '../components/NotificationToast';

interface NotificationContextType {
  preferences: NotificationPreferences;
  unreadCounts: UnreadCounts;
  updatePreferences: (preferences: NotificationPreferences) => Promise<void>;
  refreshUnreadCounts: () => Promise<void>;
  showToast: (notification: ToastNotification) => void;
  markNotificationRead: (
    type: 'message' | 'like' | 'post_reaction' | 'match',
    referenceId: string
  ) => Promise<void>;
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

  const [preferences, setPreferences] = useState<NotificationPreferences>({
    messages: true,
    likes: true,
    post_reactions: true,
    matches: true,
  });

  const [unreadCounts, setUnreadCounts] = useState<UnreadCounts>({
    unread_messages: 0,
    unread_likes: 0,
    unread_reactions: 0,
    unread_matches: 0,
    total_unread: 0,
  });

  const [toastNotification, setToastNotification] = useState<ToastNotification | null>(
    null
  );

  // Load preferences when user logs in
  useEffect(() => {
    if (profileId) {
      loadPreferences();
      refreshUnreadCounts();
      setupNotifications();
    } else {
      // Clean up when user logs out
      cleanupNotifications();
    }
  }, [profileId]);

  // Handle app state changes
  useEffect(() => {
    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => {
      subscription.remove();
    };
  }, [profileId]);

  const handleAppStateChange = (nextAppState: AppStateStatus) => {
    if (nextAppState === 'active' && profileId) {
      // Refresh counts when app comes to foreground
      refreshUnreadCounts();
    }
  };

  const setupNotifications = async () => {
    if (!profileId) return;

    try {
      // Register for push notifications
      await notificationService.registerForPushNotifications(profileId);

      // Set up notification listeners
      notificationService.setupNotificationListeners(
        handleNotificationReceived,
        handleNotificationResponse
      );

      // Subscribe to real-time database changes
      await realtimeNotificationService.subscribe(profileId, {
        showToast,
        updateBadge: refreshUnreadCounts,
      });
    } catch (error) {
      console.error('Error setting up notifications:', error);
    }
  };

  const cleanupNotifications = async () => {
    // Unsubscribe from real-time
    realtimeNotificationService.unsubscribe();

    // Remove notification listeners
    notificationService.removeNotificationListeners();

    // Remove push token
    if (profileId) {
      await notificationService.removePushToken(profileId);
    }

    // Reset state
    setPreferences({
      messages: true,
      likes: true,
      post_reactions: true,
      matches: true,
    });
    setUnreadCounts({
      unread_messages: 0,
      unread_likes: 0,
      unread_reactions: 0,
      unread_matches: 0,
      total_unread: 0,
    });
  };

  const loadPreferences = async () => {
    if (!profileId) return;

    try {
      const prefs = await notificationService.getNotificationPreferences(profileId);
      setPreferences(prefs);
    } catch (error) {
      console.error('Error loading notification preferences:', error);
    }
  };

  const updatePreferences = async (
    newPreferences: NotificationPreferences
  ): Promise<void> => {
    if (!profileId) return;

    try {
      await notificationService.updateNotificationPreferences(
        profileId,
        newPreferences
      );
      setPreferences(newPreferences);
    } catch (error) {
      console.error('Error updating notification preferences:', error);
      throw error;
    }
  };

  const refreshUnreadCounts = async (): Promise<void> => {
    if (!profileId) return;

    try {
      const counts = await notificationService.getUnreadCounts(profileId);
      setUnreadCounts(counts);

      // Update app badge
      await notificationService.updateBadgeCount(counts.total_unread);
    } catch (error) {
      console.error('Error refreshing unread counts:', error);
    }
  };

  const showToast = useCallback((notification: ToastNotification) => {
    // Set the toast notification
    setToastNotification(notification);
  }, []);

  const handleNotificationReceived = (
    notification: Notifications.Notification
  ) => {
    // Notification received while app is in foreground
    console.log('Notification received:', notification);
    refreshUnreadCounts();
  };

  const handleNotificationResponse = (
    response: Notifications.NotificationResponse
  ) => {
    // User tapped on notification
    const data = response.notification.request.content.data;
    
    if (data && typeof data === 'object' && 'type' in data) {
      // Mark notification as read when user taps it
      if (profileId && data.referenceId) {
        markNotificationRead(data.type as any, String(data.referenceId));
      }
      
      // Note: Navigation will be handled by the app when it opens
      // The notification data is preserved and can be accessed by screens
      console.log('Notification tapped:', data);
    }
  };

  const markNotificationRead = async (
    type: 'message' | 'like' | 'post_reaction' | 'match',
    referenceId: string
  ): Promise<void> => {
    if (!profileId) return;

    try {
      await notificationService.markNotificationRead(profileId, type, referenceId);
      await refreshUnreadCounts();
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const contextValue: NotificationContextType = {
    preferences,
    unreadCounts,
    updatePreferences,
    refreshUnreadCounts,
    showToast,
    markNotificationRead,
  };

  return (
    <NotificationContext.Provider value={contextValue}>
      {children}
      {toastNotification && (
        <NotificationToast
          notification={toastNotification}
          onDismiss={() => setToastNotification(null)}
        />
      )}
    </NotificationContext.Provider>
  );
};

export const useNotifications = (): NotificationContextType => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};

