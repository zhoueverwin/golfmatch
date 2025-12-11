import { supabase } from "../supabase";
import {
  Message,
  MessagePreview,
  ServiceResponse,
} from "../../types/dataModels";

export interface ChatPreview {
  chat_id: string;
  other_user_id: string;
  other_user_name: string;
  other_user_image: string;
  last_message: string | null;
  last_message_type: string | null;
  last_message_at: string | null;
  unread_count: number;
  is_online: boolean;
}

export interface UnmessagedMatch {
  match_id: string;
  other_user_id: string;
  other_user_name: string;
  other_user_age: number;
  other_user_prefecture: string;
  other_user_location: string | null;
  other_user_image: string;
}

export class MessagesService {
  /**
   * Get user's chats with last message preview (uses optimized SQL function)
   */
  async getUserChats(userId: string): Promise<ServiceResponse<ChatPreview[]>> {
    try {
      const { data, error } = await supabase
        .rpc('get_user_chats', { p_user_id: userId });

      if (error) throw error;

      return {
        success: true,
        data: (data as ChatPreview[]) || [],
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to load chats',
        data: [],
      };
    }
  }

  async getChatMessages(chatId: string): Promise<ServiceResponse<Message[]>> {
    try {
      const { data, error } = await supabase
        .from("messages")
        .select(
          `
          *,
          sender:profiles!messages_sender_id_fkey(*),
          receiver:profiles!messages_receiver_id_fkey(*)
        `,
        )
        .eq("chat_id", chatId)
        .order("created_at", { ascending: true });

      if (error) throw error;

      return {
        success: true,
        data: data as Message[],
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || "Failed to fetch messages",
        data: [],
      };
    }
  }

  async sendMessage(
    chatId: string,
    senderId: string,
    receiverId: string,
    text: string,
    type: "text" | "image" | "emoji" | "video" = "text",
    imageUri?: string,
  ): Promise<ServiceResponse<Message>> {
    try {
      const { data, error } = await supabase
        .from("messages")
        .insert({
          chat_id: chatId,
          sender_id: senderId,
          receiver_id: receiverId,
          text,
          type,
          image_uri: imageUri,
          is_read: false,
        })
        .select(
          `
          *,
          sender:profiles!messages_sender_id_fkey(*),
          receiver:profiles!messages_receiver_id_fkey(*)
        `,
        )
        .single();

      if (error) throw error;

      return {
        success: true,
        data: data as Message,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || "Failed to send message",
      };
    }
  }

  async markAsRead(messageId: string): Promise<ServiceResponse<void>> {
    try {
      const { error } = await supabase
        .from("messages")
        .update({ is_read: true })
        .eq("id", messageId);

      if (error) throw error;

      return {
        success: true,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || "Failed to mark message as read",
      };
    }
  }

  /**
   * Get message previews using optimized SQL function (replaces N+1 query)
   * Single query instead of 2N queries
   */
  async getMessagePreviews(
    userId: string,
  ): Promise<ServiceResponse<MessagePreview[]>> {
    try {
      const { data, error } = await supabase
        .rpc('get_message_previews', { p_user_id: userId });

      if (error) throw error;

      const previews: MessagePreview[] = (data || []).map((row: any) => ({
        id: row.chat_id,
        userId: row.other_user_id,
        name: row.other_user_name || '',
        profileImage: row.other_user_image || '',
        lastMessage: row.last_message || '',
        timestamp: row.last_message_at || '',
        isUnread: (row.unread_count || 0) > 0,
        unreadCount: row.unread_count || 0,
      }));

      return {
        success: true,
        data: previews,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || "Failed to fetch message previews",
        data: [],
      };
    }
  }

  async getOrCreateChat(
    matchId: string,
    participants: string[],
  ): Promise<ServiceResponse<string>> {
    try {
      const { data: existingChat } = await supabase
        .from("chats")
        .select("id")
        .eq("match_id", matchId)
        .single();

      if (existingChat) {
        return {
          success: true,
          data: existingChat.id,
        };
      }

      const { data: newChat, error } = await supabase
        .from("chats")
        .insert({
          match_id: matchId,
          participants,
        })
        .select("id")
        .single();

      if (error) throw error;

      return {
        success: true,
        data: newChat.id,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || "Failed to get or create chat",
      };
    }
  }

  /**
   * Get or create chat between two users (uses SQL function with duplicate prevention)
   */
  async getOrCreateChatBetweenUsers(
    user1Id: string,
    user2Id: string,
    matchId?: string
  ): Promise<ServiceResponse<string>> {
    try {
      const { data, error } = await supabase
        .rpc('get_or_create_chat', {
          p_user1_id: user1Id,
          p_user2_id: user2Id,
          p_match_id: matchId || null
        });

      if (error) throw error;

      return {
        success: true,
        data: data as string, // chat_id
      };
    } catch (error: any) {
      console.error('Failed to get/create chat:', error);
      return {
        success: false,
        error: error.message || 'Failed to create chat',
      };
    }
  }

  /**
   * Get matches where no messages have been exchanged yet
   * Uses optimized SQL function instead of loading all messages
   * Single query instead of multiple queries
   */
  async getUnmessagedMatches(userId: string): Promise<ServiceResponse<UnmessagedMatch[]>> {
    try {
      const { data, error } = await supabase
        .rpc('get_unmessaged_matches', { p_user_id: userId });

      if (error) throw error;

      const unmessagedMatches: UnmessagedMatch[] = (data || []).map((row: any) => ({
        match_id: row.match_id,
        other_user_id: row.other_user_id,
        other_user_name: row.other_user_name || "",
        other_user_age: row.other_user_age || 0,
        other_user_prefecture: row.other_user_prefecture || "",
        other_user_location: row.other_user_location || null,
        other_user_image: row.other_user_image || "",
      }));

      return {
        success: true,
        data: unmessagedMatches,
      };
    } catch (error: any) {
      console.error("Failed to get unmessaged matches:", error);
      return {
        success: false,
        error: error.message || "Failed to fetch unmessaged matches",
        data: [],
      };
    }
  }

  /**
   * Get total unread messages count for a user across all chats
   */
  async getTotalUnreadCount(userId: string): Promise<ServiceResponse<number>> {
    try {
      const { data, error } = await supabase
        .rpc('get_user_chats', { p_user_id: userId });

      if (error) throw error;

      // Sum up unread_count from all chats
      const totalUnread = (data as ChatPreview[] || []).reduce(
        (sum, chat) => sum + (chat.unread_count || 0),
        0
      );

      return {
        success: true,
        data: totalUnread,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to get unread count',
        data: 0,
      };
    }
  }

  subscribeToChat(chatId: string, callback: (message: Message) => void) {
    const channel = supabase
      .channel(`chat:${chatId}`, {
        config: {
          broadcast: { self: false },
          presence: { key: chatId },
        },
      })
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `chat_id=eq.${chatId}`,
        },
        async (payload) => {
          try {
            // Fetch the full message with relations
            const { data, error } = await supabase
              .from("messages")
              .select(
                `
                *,
                sender:profiles!messages_sender_id_fkey(*),
                receiver:profiles!messages_receiver_id_fkey(*)
              `,
              )
              .eq("id", payload.new.id)
              .single();

            if (error) {
              console.error("[MessagesService] Error fetching message:", error);
              // Fallback: use payload data if fetch fails
              callback(payload.new as Message);
              return;
            }

            if (data) {
              callback(data as Message);
            }
          } catch (error) {
            console.error("[MessagesService] Error in subscription callback:", error);
            // Fallback: use payload data
            callback(payload.new as Message);
          }
        },
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          console.log(`[MessagesService] Successfully subscribed to chat:${chatId}`);
        } else if (status === "CHANNEL_ERROR") {
          console.error(`[MessagesService] Channel error for chat:${chatId}`);
        } else if (status === "TIMED_OUT") {
          console.error(`[MessagesService] Subscription timeout for chat:${chatId}`);
        } else if (status === "CLOSED") {
          console.log(`[MessagesService] Channel closed for chat:${chatId}`);
        }
      });

    return () => {
      console.log(`[MessagesService] Unsubscribing from chat:${chatId}`);
      channel.unsubscribe();
    };
  }
}

export const messagesService = new MessagesService();
