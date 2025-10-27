import { supabase } from '../supabase';
import { ServiceResponse } from '../../types/dataModels';

export interface Notification {
  id: string;
  sender_id: string | null;
  sender_name: string | null;
  sender_image: string | null;
  notification_type: 'message' | 'like' | 'super_like' | 'post_reaction' | 'match';
  reference_id: string;
  title: string;
  body: string;
  data: Record<string, any>;
  is_read: boolean;
  created_at: string;
  read_at: string | null;
}

export class NotificationsService {
  /**
   * Get user's notifications with pagination
   */
  async getUserNotifications(
    userId: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<ServiceResponse<Notification[]>> {
    try {
      const { data, error } = await supabase.rpc('get_user_notifications', {
        p_user_id: userId,
        p_limit: limit,
        p_offset: offset,
      });

      if (error) throw error;

      return {
        success: true,
        data: (data as Notification[]) || [],
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to load notifications',
        data: [],
      };
    }
  }

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId: string): Promise<ServiceResponse<void>> {
    try {
      const { error } = await supabase.rpc('mark_notification_as_read', {
        p_notification_id: notificationId,
      });

      if (error) throw error;

      return {
        success: true,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to mark notification as read',
      };
    }
  }

  /**
   * Mark all notifications as read
   */
  async markAllAsRead(userId: string): Promise<ServiceResponse<void>> {
    try {
      const { error } = await supabase.rpc('mark_all_notifications_read', {
        p_user_id: userId,
      });

      if (error) throw error;

      return {
        success: true,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to mark all notifications as read',
      };
    }
  }

  /**
   * Get unread notification count
   */
  async getUnreadCount(userId: string): Promise<ServiceResponse<number>> {
    try {
      const { data, error } = await supabase.rpc('get_unread_notifications_count', {
        p_user_id: userId,
      });

      if (error) throw error;

      return {
        success: true,
        data: data || 0,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to get unread count',
        data: 0,
      };
    }
  }

  /**
   * Subscribe to new notifications for a user
   */
  subscribeToNotifications(userId: string, callback: (notification: Notification) => void) {
    const subscription = supabase
      .channel(`notifications:${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `recipient_id=eq.${userId}`,
        },
        async (payload) => {
          // Fetch full notification with sender info
          const { data } = await supabase.rpc('get_user_notifications', {
            p_user_id: userId,
            p_limit: 1,
            p_offset: 0,
          });

          if (data && data.length > 0) {
            callback(data[0] as Notification);
          }
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }
}

export const notificationsService = new NotificationsService();

