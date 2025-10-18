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

  async getMessagePreviews(
    userId: string,
  ): Promise<ServiceResponse<MessagePreview[]>> {
    try {
      const { data: chats, error: chatsError } = await supabase
        .from("chats")
        .select(
          `
          id,
          match_id,
          participants,
          updated_at,
          match:matches!chats_match_id_fkey(
            user1:profiles!matches_user1_id_fkey(*),
            user2:profiles!matches_user2_id_fkey(*)
          )
        `,
        )
        .contains("participants", [userId])
        .order("updated_at", { ascending: false });

      if (chatsError) throw chatsError;

      const previews: MessagePreview[] = await Promise.all(
        (chats || []).map(async (chat) => {
          const { data: lastMessage } = await supabase
            .from("messages")
            .select("*")
            .eq("chat_id", chat.id)
            .order("created_at", { ascending: false })
            .limit(1)
            .single();

          const { count: unreadCount } = await supabase
            .from("messages")
            .select("id", { count: "exact", head: true })
            .eq("chat_id", chat.id)
            .eq("receiver_id", userId)
            .eq("is_read", false);

          const match = chat.match as any;
          const otherUser =
            match.user1.id === userId ? match.user2 : match.user1;

          return {
            id: chat.id,
            userId: otherUser.id,
            name: otherUser.name,
            profileImage: otherUser.profile_pictures?.[0] || "",
            lastMessage: lastMessage?.text || "",
            timestamp: (lastMessage?.created_at || chat.updated_at) as string,
            isUnread: (unreadCount || 0) > 0,
            unreadCount: unreadCount || 0,
          } as MessagePreview;
        }),
      );

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

  subscribeToChat(chatId: string, callback: (message: Message) => void) {
    const subscription = supabase
      .channel(`chat:${chatId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `chat_id=eq.${chatId}`,
        },
        async (payload) => {
          const { data } = await supabase
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

          if (data) {
            callback(data as Message);
          }
        },
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }
}

export const messagesService = new MessagesService();
