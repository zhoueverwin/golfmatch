import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { supabase } from './supabase';
import {
  NotificationPreferences,
  PushNotificationData,
  UnreadCounts,
  NotificationType,
} from '../types/notifications';

export class NotificationService {
  private pushToken: string | null = null;
  private notificationListener: Notifications.Subscription | null = null;
  private responseListener: Notifications.Subscription | null = null;
  private handlerConfigured: boolean = false;
  private isAvailable: boolean = true;

  constructor() {
    // Check if notifications are available (not in Expo Go)
    this.checkAvailability();
  }

  private checkAvailability() {
    try {
      // Try to access the notifications module
      if (!Notifications || !Notifications.setNotificationHandler) {
        console.warn('Expo Notifications not available (possibly running in Expo Go)');
        this.isAvailable = false;
        return;
      }
      this.configureNotificationHandler();
    } catch (error) {
      console.warn('Notifications not available:', error);
      this.isAvailable = false;
    }
  }

  private configureNotificationHandler() {
    if (this.handlerConfigured) return;
    
    try {
      // Configure how notifications are handled when app is in foreground
      Notifications.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowAlert: true,
          shouldPlaySound: true,
          shouldSetBadge: true,
          shouldShowBanner: true,
          shouldShowList: true,
        }),
      });
      this.handlerConfigured = true;
    } catch (error) {
      console.warn('Could not configure notification handler:', error);
      this.isAvailable = false;
    }
  }

  /**
   * Request notification permissions and register push token
   */
  async registerForPushNotifications(userId: string): Promise<string | null> {
    if (!this.isAvailable) {
      console.log('Notifications not available - skipping registration');
      return null;
    }

    // Check if running on physical device (not simulator/emulator)
    if (Platform.OS === 'web') {
      console.log('Push notifications are not supported on web');
      return null;
    }

    try {
      // Check existing permissions
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      // Request permissions if not granted
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.log('Failed to get push notification permissions');
        return null;
      }

      // Get Expo push token
      const tokenData = await Notifications.getExpoPushTokenAsync({
        projectId: '3449867b-e6b3-45f2-8569-47389c202518', // From app.json
      });
      const token = tokenData.data;

      // Save token to database
      await this.savePushToken(userId, token);
      
      this.pushToken = token;

      // Configure Android notification channel
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'Default',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#FF231F7C',
        });
      }

      return token;
    } catch (error) {
      console.error('Error registering for push notifications:', error);
      return null;
    }
  }

  /**
   * Save push token to user profile
   */
  async savePushToken(userId: string, token: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ push_token: token })
        .eq('id', userId);

      if (error) throw error;
    } catch (error) {
      console.error('Error saving push token:', error);
      throw error;
    }
  }

  /**
   * Remove push token from user profile (on logout)
   */
  async removePushToken(userId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ push_token: null })
        .eq('id', userId);

      if (error) throw error;
      
      this.pushToken = null;
    } catch (error) {
      console.error('Error removing push token:', error);
    }
  }

  /**
   * Get user's notification preferences
   */
  async getNotificationPreferences(userId: string): Promise<NotificationPreferences> {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('notification_preferences')
        .eq('id', userId)
        .single();

      if (error) throw error;

      return data?.notification_preferences || {
        messages: true,
        likes: true,
        post_reactions: true,
        matches: true,
      };
    } catch (error) {
      console.error('Error getting notification preferences:', error);
      return {
        messages: true,
        likes: true,
        post_reactions: true,
        matches: true,
      };
    }
  }

  /**
   * Update user's notification preferences
   */
  async updateNotificationPreferences(
    userId: string,
    preferences: NotificationPreferences
  ): Promise<void> {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ notification_preferences: preferences })
        .eq('id', userId);

      if (error) throw error;
    } catch (error) {
      console.error('Error updating notification preferences:', error);
      throw error;
    }
  }

  /**
   * Send a push notification to a user
   */
  async sendPushNotification(
    recipientId: string,
    notification: Omit<PushNotificationData, 'to'>
  ): Promise<boolean> {
    try {
      // Get recipient's push token
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('push_token, notification_preferences')
        .eq('id', recipientId)
        .single();

      if (error || !profile?.push_token) {
        console.log('Recipient has no push token');
        return false;
      }

      // Check if user has this notification type enabled
      const prefs = profile.notification_preferences as NotificationPreferences;
      const notificationType = notification.data.type;
      
      const typeMap: Record<NotificationType, keyof NotificationPreferences> = {
        message: 'messages',
        like: 'likes',
        post_reaction: 'post_reactions',
        match: 'matches',
      };

      if (prefs && !prefs[typeMap[notificationType]]) {
        console.log(`User has disabled ${notificationType} notifications`);
        return false;
      }

      // Send push notification via Expo
      const message: PushNotificationData = {
        to: profile.push_token,
        ...notification,
      };

      const response = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(message),
      });

      const result = await response.json();
      
      if (result.data?.[0]?.status === 'error') {
        console.error('Push notification error:', result.data[0].message);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error sending push notification:', error);
      return false;
    }
  }

  /**
   * Mark a notification as read
   */
  async markNotificationRead(
    userId: string,
    notificationType: NotificationType,
    referenceId: string
  ): Promise<void> {
    try {
      const { error } = await supabase.rpc('mark_notification_read', {
        p_user_id: userId,
        p_notification_type: notificationType,
        p_reference_id: referenceId,
      });

      if (error) throw error;
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  }

  /**
   * Get unread notification counts
   */
  async getUnreadCounts(userId: string): Promise<UnreadCounts> {
    try {
      const { data, error } = await supabase.rpc('get_unread_notification_counts', {
        p_user_id: userId,
      });

      if (error) throw error;

      return data?.[0] || {
        unread_messages: 0,
        unread_likes: 0,
        unread_reactions: 0,
        unread_matches: 0,
        total_unread: 0,
      };
    } catch (error) {
      console.error('Error getting unread counts:', error);
      return {
        unread_messages: 0,
        unread_likes: 0,
        unread_reactions: 0,
        unread_matches: 0,
        total_unread: 0,
      };
    }
  }

  /**
   * Update app badge count
   */
  async updateBadgeCount(count: number): Promise<void> {
    if (!this.isAvailable) return;
    
    try {
      await Notifications.setBadgeCountAsync(count);
    } catch (error) {
      console.error('Error updating badge count:', error);
    }
  }

  /**
   * Set up notification listeners
   */
  setupNotificationListeners(
    onNotificationReceived: (notification: Notifications.Notification) => void,
    onNotificationResponse: (response: Notifications.NotificationResponse) => void
  ): void {
    if (!this.isAvailable) return;
    
    try {
      // Listener for notifications received while app is foregrounded
      this.notificationListener = Notifications.addNotificationReceivedListener(
        onNotificationReceived
      );

      // Listener for user tapping on notification
      this.responseListener = Notifications.addNotificationResponseReceivedListener(
        onNotificationResponse
      );
    } catch (error) {
      console.warn('Could not set up notification listeners:', error);
    }
  }

  /**
   * Clean up notification listeners
   */
  removeNotificationListeners(): void {
    if (!this.isAvailable) return;
    
    try {
      if (this.notificationListener) {
        this.notificationListener.remove();
        this.notificationListener = null;
      }

      if (this.responseListener) {
        this.responseListener.remove();
        this.responseListener = null;
      }
    } catch (error) {
      console.warn('Error removing notification listeners:', error);
    }
  }

  /**
   * Get the current push token
   */
  getPushToken(): string | null {
    return this.pushToken;
  }

  /**
   * Check if notifications are available
   */
  isNotificationsAvailable(): boolean {
    return this.isAvailable;
  }
}

// Lazy initialization to avoid errors at module load time
let notificationServiceInstance: NotificationService | null = null;

export const notificationService = {
  getInstance(): NotificationService {
    if (!notificationServiceInstance) {
      notificationServiceInstance = new NotificationService();
    }
    return notificationServiceInstance;
  },
  
  // Proxy all methods
  async registerForPushNotifications(userId: string) {
    return this.getInstance().registerForPushNotifications(userId);
  },
  async savePushToken(userId: string, token: string) {
    return this.getInstance().savePushToken(userId, token);
  },
  async removePushToken(userId: string) {
    return this.getInstance().removePushToken(userId);
  },
  async getNotificationPreferences(userId: string) {
    return this.getInstance().getNotificationPreferences(userId);
  },
  async updateNotificationPreferences(userId: string, preferences: NotificationPreferences) {
    return this.getInstance().updateNotificationPreferences(userId, preferences);
  },
  async sendPushNotification(recipientId: string, notification: Omit<PushNotificationData, 'to'>) {
    return this.getInstance().sendPushNotification(recipientId, notification);
  },
  async markNotificationRead(userId: string, notificationType: NotificationType, referenceId: string) {
    return this.getInstance().markNotificationRead(userId, notificationType, referenceId);
  },
  async getUnreadCounts(userId: string) {
    return this.getInstance().getUnreadCounts(userId);
  },
  async updateBadgeCount(count: number) {
    return this.getInstance().updateBadgeCount(count);
  },
  setupNotificationListeners(
    onNotificationReceived: (notification: Notifications.Notification) => void,
    onNotificationResponse: (response: Notifications.NotificationResponse) => void
  ) {
    return this.getInstance().setupNotificationListeners(onNotificationReceived, onNotificationResponse);
  },
  removeNotificationListeners() {
    return this.getInstance().removeNotificationListeners();
  },
  getPushToken() {
    return this.getInstance().getPushToken();
  },
  isNotificationsAvailable() {
    return notificationServiceInstance?.isNotificationsAvailable() ?? false;
  },
};

