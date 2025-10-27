/**
 * Notification system type definitions
 */

export type NotificationType = 'message' | 'like' | 'post_reaction' | 'match';

export interface NotificationPreferences {
  messages: boolean;
  likes: boolean;
  post_reactions: boolean;
  matches: boolean;
}

export interface NotificationPayload {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  data: NotificationData;
  timestamp: string;
}

export interface NotificationData {
  type: NotificationType;
  referenceId: string;
  senderId?: string;
  senderName?: string;
  senderImage?: string;
  chatId?: string;
  postId?: string;
  matchId?: string;
}

export interface PushNotificationData {
  to: string; // Expo push token
  sound: 'default';
  title: string;
  body: string;
  data: NotificationData;
  badge?: number;
  priority: 'default' | 'normal' | 'high';
  channelId?: string;
}

export interface NotificationRead {
  id: string;
  user_id: string;
  notification_type: NotificationType;
  reference_id: string;
  read_at: string;
  created_at: string;
}

export interface UnreadCounts {
  unread_messages: number;
  unread_likes: number;
  unread_reactions: number;
  unread_matches: number;
  total_unread: number;
}

export interface ToastNotification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  avatarUrl?: string;
  onPress?: () => void;
  duration?: number; // milliseconds, default 4000
}

