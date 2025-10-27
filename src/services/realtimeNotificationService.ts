import { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from './supabase';
import { notificationService } from './notificationService';
import { AppState } from 'react-native';
import {
  NotificationType,
  NotificationData,
  ToastNotification,
} from '../types/notifications';

interface NotificationCallback {
  showToast: (notification: ToastNotification) => void;
  updateBadge: () => void;
}

export class RealtimeNotificationService {
  private channels: RealtimeChannel[] = [];
  private userId: string | null = null;
  private callback: NotificationCallback | null = null;

  /**
   * Subscribe to all notification channels for a user
   */
  async subscribe(userId: string, callback: NotificationCallback): Promise<void> {
    this.userId = userId;
    this.callback = callback;

    // Clean up any existing subscriptions
    this.unsubscribe();

    // Subscribe to each notification type
    await Promise.all([
      this.subscribeToMessages(userId),
      this.subscribeToLikes(userId),
      this.subscribeToPostReactions(userId),
      this.subscribeToMatches(userId),
    ]);

    console.log('Real-time notification subscriptions active');
  }

  /**
   * Subscribe to new messages
   */
  private async subscribeToMessages(userId: string): Promise<void> {
    const channel = supabase
      .channel(`messages:${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `receiver_id=eq.${userId}`,
        },
        async (payload) => {
          const message = payload.new as any;

          // Fetch sender info
          const { data: sender } = await supabase
            .from('profiles')
            .select('name, profile_pictures')
            .eq('id', message.sender_id)
            .single();

          if (!sender) return;

          const notificationData: NotificationData = {
            type: 'message',
            referenceId: message.id,
            senderId: message.sender_id,
            senderName: sender.name,
            senderImage: sender.profile_pictures?.[0],
            chatId: message.chat_id,
          };

          await this.handleNotification(
            'message',
            `${sender.name}さんからメッセージ`,
            message.text || '画像を送信しました',
            notificationData,
            sender.profile_pictures?.[0]
          );
        }
      )
      .subscribe();

    this.channels.push(channel);
  }

  /**
   * Subscribe to new likes on user profile
   */
  private async subscribeToLikes(userId: string): Promise<void> {
    const channel = supabase
      .channel(`likes:${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'user_likes',
          filter: `liked_user_id=eq.${userId}`,
        },
        async (payload) => {
          const like = payload.new as any;

          // Only notify for likes and super likes, not passes
          if (like.type === 'pass') return;

          // Fetch liker info
          const { data: liker } = await supabase
            .from('profiles')
            .select('name, profile_pictures')
            .eq('id', like.liker_user_id)
            .single();

          if (!liker) return;

          const notificationData: NotificationData = {
            type: 'like',
            referenceId: like.id,
            senderId: like.liker_user_id,
            senderName: liker.name,
            senderImage: liker.profile_pictures?.[0],
          };

          const message =
            like.type === 'super_like'
              ? 'あなたをスーパーいいねしました'
              : 'あなたをいいねしました';

          await this.handleNotification(
            'like',
            `${liker.name}さん`,
            message,
            notificationData,
            liker.profile_pictures?.[0]
          );
        }
      )
      .subscribe();

    this.channels.push(channel);
  }

  /**
   * Subscribe to new reactions on user's posts
   */
  private async subscribeToPostReactions(userId: string): Promise<void> {
    // First, get user's post IDs
    const { data: posts } = await supabase
      .from('posts')
      .select('id')
      .eq('user_id', userId);

    if (!posts || posts.length === 0) return;

    const postIds = posts.map((p) => p.id);

    const channel = supabase
      .channel(`post_reactions:${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'post_reactions',
        },
        async (payload) => {
          const reaction = payload.new as any;

          // Only notify if it's on user's post and not their own reaction
          if (!postIds.includes(reaction.post_id) || reaction.user_id === userId) {
            return;
          }

          // Fetch reactor info
          const { data: reactor } = await supabase
            .from('profiles')
            .select('name, profile_pictures')
            .eq('id', reaction.user_id)
            .single();

          if (!reactor) return;

          const notificationData: NotificationData = {
            type: 'post_reaction',
            referenceId: reaction.id,
            senderId: reaction.user_id,
            senderName: reactor.name,
            senderImage: reactor.profile_pictures?.[0],
            postId: reaction.post_id,
          };

          await this.handleNotification(
            'post_reaction',
            `${reactor.name}さん`,
            'あなたの投稿にリアクションしました',
            notificationData,
            reactor.profile_pictures?.[0]
          );
        }
      )
      .subscribe();

    this.channels.push(channel);
  }

  /**
   * Subscribe to new matches
   */
  private async subscribeToMatches(userId: string): Promise<void> {
    const channel = supabase
      .channel(`matches:${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'matches',
        },
        async (payload) => {
          const match = payload.new as any;

          // Check if this match involves the current user
          if (match.user1_id !== userId && match.user2_id !== userId) {
            return;
          }

          // Get the other user's ID
          const otherUserId = match.user1_id === userId ? match.user2_id : match.user1_id;

          // Fetch other user info
          const { data: otherUser } = await supabase
            .from('profiles')
            .select('name, profile_pictures')
            .eq('id', otherUserId)
            .single();

          if (!otherUser) return;

          const notificationData: NotificationData = {
            type: 'match',
            referenceId: match.id,
            senderId: otherUserId,
            senderName: otherUser.name,
            senderImage: otherUser.profile_pictures?.[0],
            matchId: match.id,
          };

          await this.handleNotification(
            'match',
            `マッチしました！`,
            `${otherUser.name}さんとマッチしました`,
            notificationData,
            otherUser.profile_pictures?.[0]
          );
        }
      )
      .subscribe();

    this.channels.push(channel);
  }

  /**
   * Handle a notification event
   */
  private async handleNotification(
    type: NotificationType,
    title: string,
    message: string,
    data: NotificationData,
    avatarUrl?: string
  ): Promise<void> {
    if (!this.callback || !this.userId) return;

    // Check if app is in foreground
    const isAppActive = AppState.currentState === 'active';

    if (isAppActive) {
      // Show in-app toast notification
      const toast: ToastNotification = {
        id: data.referenceId,
        type,
        title,
        message,
        avatarUrl,
      };

      this.callback.showToast(toast);
    } else {
      // Send push notification if app is backgrounded
      await notificationService.sendPushNotification(this.userId, {
        sound: 'default',
        title,
        body: message,
        data,
        priority: 'high',
        channelId: 'default',
      });
    }

    // Update badge count
    this.callback.updateBadge();
  }

  /**
   * Unsubscribe from all channels
   */
  unsubscribe(): void {
    this.channels.forEach((channel) => {
      supabase.removeChannel(channel);
    });
    this.channels = [];
    this.userId = null;
    this.callback = null;
    console.log('Real-time notification subscriptions closed');
  }

  /**
   * Refresh post reactions subscription (call when user creates new posts)
   */
  async refreshPostReactionsSubscription(): Promise<void> {
    if (!this.userId || !this.callback) return;

    // Remove old post reactions channel
    const postReactionsChannel = this.channels.find((ch) =>
      ch.topic.startsWith('post_reactions:')
    );
    if (postReactionsChannel) {
      supabase.removeChannel(postReactionsChannel);
      this.channels = this.channels.filter((ch) => ch !== postReactionsChannel);
    }

    // Re-subscribe with updated post IDs
    await this.subscribeToPostReactions(this.userId);
  }
}

export const realtimeNotificationService = new RealtimeNotificationService();

